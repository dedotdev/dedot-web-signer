import { KeyringPair } from '@polkadot/keyring/types';
import { Keyring as InnerKeyring } from '@polkadot/ui-keyring/Keyring';
import { validateMnemonic } from '@polkadot/util-crypto/mnemonic/bip39';
import {
  assert,
  assertFalse,
  DedotSignerError,
  ErrorCode,
  isDedotError,
  StandardDedotSignerError,
  sha256AsHex,
} from '@dedot/signer-utils';
import CryptoJS from 'crypto-js';
import { AccountBackup, AccountInfo, WalletBackup, WalletBackup$Json, WalletQrBackup } from './types';

export const ENCRYPTED_MNEMONIC = 'ENCRYPTED_MNEMONIC';
export const ORIGINAL_HASH = 'ORIGINAL_HASH';
export const ACCOUNTS_INDEX = 'ACCOUNTS_INDEX';
export const DEFAULT_KEY_TYPE = 'sr25519';

const DERIVATION_PATH_PREFIX = '//';

/**
 * @name Keyring
 * @description Keyring management for user accounts
 *
 * Dedot Signer is a hierarchical deterministic (HD) wallet following the idea of BIP-32,
 * which only requires users to back up only one seed phrase upon setting up the wallet.
 *
 * New accounts will be created by deriving from a mnemonic and an accountsIndex number
 * as the derivation path (//{index}), index number will be started from 0
 * and increased one by one as new accounts are created.
 *
 * The first account will be created without derivation path,
 * this is to be compatible with the Polkadot{.js} wallet.
 */
export default class Keyring {
  #keyring!: InnerKeyring;
  #mnemonic: string | null;

  constructor() {
    this.#mnemonic = null;

    this.reload();
  }

  /**
   * Reload accounts from storage
   */
  reload() {
    try {
      this.#keyring = new InnerKeyring();
      this.#keyring.loadAll({});
    } catch (e: any) {
      if (e.message === 'Unable to initialise options more than once') {
        // TODO Better handle this issue, ignore this for now
        return;
      }

      throw e;
    }
  }

  /**
   * Initialize the keyring with a mnemonic and wallet password
   * Private keys & mnemonic will be encrypted using wallet password
   *
   * @param mnemonic
   * @param password
   */
  async initialize(mnemonic: string, password: string) {
    const encryptedSeed = CryptoJS.AES.encrypt(mnemonic, password).toString();
    localStorage.setItem(ENCRYPTED_MNEMONIC, encryptedSeed);
    this.#generateOriginalHash(mnemonic);
  }

  /**
   * Check if the keyring is initialized
   */
  async initialized(): Promise<boolean> {
    return !!this.#getEncryptedMnemonic();
  }

  async ensureWalletInitialized() {
    if (!(await this.initialized())) {
      throw new DedotSignerError(ErrorCode.KeyringNotInitialized);
    }
  }

  /**
   * Check if the keyring is locked or not
   */
  locked() {
    return !this.#mnemonic;
  }

  /**
   * Lock the keyring
   */
  lock() {
    this.#mnemonic = null;
  }

  /**
   * Reset the keyring, clear all persistent data, remove all user accounts
   */
  async reset() {
    localStorage.removeItem(ENCRYPTED_MNEMONIC);
    localStorage.removeItem(ORIGINAL_HASH);
    localStorage.removeItem(ACCOUNTS_INDEX);

    const accounts = await this.getAccounts();
    // TODO improve this process to clear all at once!
    accounts.forEach((account) => {
      this.#keyring.forgetAccount(account.address);
    });
  }

  /**
   * Unlock the keyring with wallet password
   *
   * @param password
   */
  async unlock(password: string): Promise<void> {
    await this.ensureWalletInitialized();

    if (!this.locked()) {
      return;
    }

    this.#mnemonic = await this.#decryptMnemonic(password);
  }

  async #decryptMnemonic(password: string): Promise<string> {
    await this.ensureWalletInitialized();

    try {
      const decrypted = CryptoJS.AES.decrypt(this.#getEncryptedMnemonic()!, password);
      const raw = decrypted.toString(CryptoJS.enc.Utf8);
      assert(raw);

      return raw;
    } catch (e: any) {
      throw new DedotSignerError(ErrorCode.PasswordIncorrect);
    }
  }

  /**
   * Decrypt & return the mnemonic with wallet password
   *
   * @param password
   */
  async getRawMnemonic(password: string): Promise<string> {
    return await this.#decryptMnemonic(password);
  }

  /**
   * Verify if wallet password is correct
   * @param password
   */
  async verifyPassword(password: string) {
    await this.#decryptMnemonic(password);
  }

  #getOriginalHash(): string | null {
    return localStorage.getItem(ORIGINAL_HASH);
  }

  #ensureOriginalHash(): string {
    const originalHash = this.#getOriginalHash();

    assert(originalHash, ErrorCode.OriginalHashNotFound);

    return originalHash!;
  }

  #generateOriginalHash(rawMnemonic: string): string {
    const originalHash = sha256AsHex(rawMnemonic);
    localStorage.setItem(ORIGINAL_HASH, originalHash);

    return originalHash;
  }

  /**
   * Check the make sure originalHash presence,
   * if not generate a new one with wallet password
   *
   * @param password
   */
  async ensureOriginalHashPresence(password: string) {
    if (!this.#getOriginalHash()) {
      const rawMnemonic = await this.getRawMnemonic(password);
      this.#generateOriginalHash(rawMnemonic);
    }
  }

  #getEncryptedMnemonic(): string | null {
    return localStorage.getItem(ENCRYPTED_MNEMONIC);
  }

  /**
   * Get current accounts index
   */
  getAccountsIndex(): number {
    return parseInt(localStorage.getItem(ACCOUNTS_INDEX)!) || 0;
  }

  #increaseAccountsIndex(): number {
    const next = this.getAccountsIndex() + 1;
    localStorage.setItem(ACCOUNTS_INDEX, next.toString());
    return next;
  }

  #nextAccountPath(): string {
    const currentIndex = this.getAccountsIndex();
    if (currentIndex === 0) {
      return '';
    }

    return `//${currentIndex - 1}`;
  }

  /**
   * Get list of accounts in keyring
   */
  async getAccounts(): Promise<AccountInfo[]> {
    return Object.values(this.accountsStore.subject.getValue())
      .map(({ json: { address, meta }, type }) => ({
        address,
        ...meta,
        type,
      }))
      .sort((a, b) => (a.whenCreated || 0) - (b.whenCreated || 0));
  }

  /**
   * Create new account
   *
   * @param name
   * @param password
   * @param path
   */
  async createNewAccount(name: string, password: string, path?: string): Promise<AccountInfo> {
    if (password) {
      await this.unlock(password);
    } else {
      throw new DedotSignerError(ErrorCode.PasswordRequired);
    }

    if (!name) {
      throw new DedotSignerError(ErrorCode.AccountNameRequired);
    }

    if (await this.existsName(name)) {
      throw new DedotSignerError(ErrorCode.AccountNameUsed);
    }

    let derivationPath = path ?? this.#nextAccountPath();
    if (!!derivationPath && !derivationPath.startsWith(DERIVATION_PATH_PREFIX)) {
      derivationPath = DERIVATION_PATH_PREFIX + derivationPath;
    }

    const nextPath = `${this.#mnemonic}${derivationPath}`;
    const keypair = this.#keyring.createFromUri(nextPath, { name, derivationPath }, DEFAULT_KEY_TYPE);

    this.#keyring.saveAccount(keypair, password);

    const shouldIncreaseIndex = typeof path !== 'string';
    if (shouldIncreaseIndex) {
      this.#increaseAccountsIndex();
    }

    this.lock();

    return this.getAccount(keypair.address);
  }

  get accountsStore() {
    return this.#keyring.accounts;
  }

  /**
   * Get signing pair for a specific address
   *
   * @param address
   */
  getSigningPair(address: string): KeyringPair {
    try {
      return this.#keyring.getPair(address);
    } catch (e: any) {
      throw new DedotSignerError(ErrorCode.KeypairNotFound);
    }
  }

  /**
   * Change wallet password
   *
   * @param currentPassword
   * @param newPassword
   */
  async changePassword(currentPassword: string, newPassword: string) {
    const rawMnemonic = await this.getRawMnemonic(currentPassword);

    // initialize wallet with new password
    await this.initialize(rawMnemonic, newPassword);

    const accounts = await this.getAccounts();

    accounts.forEach(({ address }) => {
      const account = this.getSigningPair(address);
      account.decodePkcs8(currentPassword);
      this.#keyring.saveAccount(account, newPassword);
      account.lock();
    });
  }

  /**
   * Remove an account
   *
   * @param address
   */
  async removeAccount(address: string) {
    await this.#keyring.forgetAccount(address);
  }

  /**
   * Rename an account
   *
   * @param address
   * @param newName
   */
  async renameAccount(address: string, newName: string) {
    if (await this.existsName(newName)) {
      throw new DedotSignerError(ErrorCode.AccountNameUsed);
    }

    const account = await this.getSigningPair(address);
    this.#keyring.saveAccountMeta(account, { ...account.meta, name: newName });
  }

  async #getAccount(predicate: (one: AccountInfo) => boolean): Promise<AccountInfo> {
    const accounts = await this.getAccounts();
    const targetAccount = accounts.find(predicate);

    if (!targetAccount) {
      throw new DedotSignerError(ErrorCode.AccountNotFound);
    }

    return targetAccount;
  }

  /**
   * Get an account
   *
   * @param address
   */
  async getAccount(address: string) {
    try {
      const pair = this.getSigningPair(address);

      return this.#getAccount((one) => one.address === pair.address);
    } catch (e: any) {
      if (isDedotError(e)) {
        throw new DedotSignerError(ErrorCode.AccountNotFound);
      }

      throw e;
    }
  }

  async existsAccount(address: string) {
    try {
      return !!(await this.getAccount(address));
    } catch (e: any) {
      if (isDedotError(e) && e.code === ErrorCode.AccountNotFound) {
        return false;
      }

      throw e;
    }
  }

  /**
   * Get an account by name
   *
   * @param name
   */
  async getAccountByName(name: string) {
    return this.#getAccount((one) => one.name === name);
  }

  /**
   * Check if an account is existed by name
   *
   * @param name
   */
  async existsName(name: string): Promise<boolean> {
    try {
      return !!(await this.getAccountByName(name));
    } catch (e: any) {
      if (isDedotError(e) && e.code === ErrorCode.AccountNotFound) {
        return false;
      }

      throw e;
    }
  }

  /**
   * Export an account
   *
   * @param address
   * @param password
   */
  async exportAccount(address: string, password: string): Promise<AccountBackup> {
    await this.verifyPassword(password);

    const account = this.getSigningPair(address);
    const accountBackup = this.#keyring.backupAccount(account, password);

    if (accountBackup.meta.isExternal) {
      delete accountBackup.meta.isExternal;
      return accountBackup;
    }

    const originalHash = this.#ensureOriginalHash();
    Object.assign(accountBackup.meta, { originalHash });

    return accountBackup;
  }

  /**
   * Check if an account is external by verify original hash
   *
   * @param accountOriginalHash
   */
  isExternalAccount(accountOriginalHash: string | undefined) {
    return accountOriginalHash !== this.#ensureOriginalHash();
  }

  /**
   * Import an account from a backup and a password for that backup
   *
   * @param backup
   * @param backupPassword
   * @param walletPassword
   */
  async importAccount(backup: AccountBackup, backupPassword: string, walletPassword: string) {
    const { address, meta } = backup;

    if (await this.existsAccount(address)) {
      throw new DedotSignerError(ErrorCode.AccountExisted);
    }

    if (!meta.name) {
      throw new DedotSignerError(ErrorCode.AccountNameRequired);
    } else if (await this.existsName(meta.name as string)) {
      throw new DedotSignerError(ErrorCode.AccountNameUsed);
    }

    if (this.isExternalAccount(meta.originalHash as string)) {
      meta.isExternal = true;
    } else {
      // No need to keep it because when exporting internal account
      // `originalHash` will be automatically generated from mnemonic
      delete meta.originalHash;
    }

    meta.whenCreated = Date.now();

    const pair = await this.verifyAccountBackupPassword(backup, backupPassword);

    this.#keyring.saveAccount(pair, walletPassword);

    return await this.getAccount(address);
  }

  /**
   * Export wallet with all created accounts & other information (accounts index, encrypted mnemonic)
   *
   * @param password
   */
  async exportWallet(password: string): Promise<WalletBackup> {
    await this.verifyPassword(password);

    const addresses = (await this.getAccounts()).map((one) => one.address);
    const accountsBackup = await this.#keyring.backupAccounts(addresses, password);

    const walletBackup: WalletBackup = {
      ...accountsBackup,
      accountsIndex: this.getAccountsIndex(),
      encryptedMnemonic: this.#getEncryptedMnemonic()!,
    };

    return walletBackup;
  }

  async #restoreWalletInfo(backup: WalletBackup$Json, password: string) {
    assertFalse(await this.initialized(), 'Wallet is already initialized');

    const { encryptedMnemonic, accountsIndex = 0 } = backup;

    localStorage.setItem(ACCOUNTS_INDEX, accountsIndex.toString());
    localStorage.setItem(ENCRYPTED_MNEMONIC, encryptedMnemonic);

    const rawMnemonic = await this.#decryptMnemonic(password);
    if (!validateMnemonic(rawMnemonic)) {
      throw new DedotSignerError(ErrorCode.InvalidMnemonic);
    }

    this.#generateOriginalHash(rawMnemonic);
  }

  /**
   * Import a Qr backup & initializing keyring
   *
   * @param backup
   * @param password
   */
  async importQrBackup(backup: WalletQrBackup, password: string) {
    assertFalse(await this.initialized(), 'Wallet is already initialized');

    try {
      await this.#restoreWalletInfo(backup, password);

      if (backup.accounts && backup.accounts.length) {
        for (let account of backup.accounts) {
          const [path, name] = account;
          await this.createNewAccount(name, password, path);
        }
      } else if (!backup.accountsIndex) {
        // If backup has no accounts and accountsIndex is not defined
        await this.createNewAccount('My first account', password);
      }
    } catch (e: any) {
      await this.reset();

      if (e instanceof StandardDedotSignerError) {
        throw e;
      } else {
        throw new StandardDedotSignerError(e.message);
      }
    }
  }

  async importBackup(backup: WalletBackup, password: string) {
    assertFalse(await this.initialized(), 'Wallet is already initialized');

    try {
      await this.#restoreWalletInfo(backup, password);

      if (backup.accounts && backup.accounts.length) {
        this.#keyring.restoreAccounts(backup, password);
      } else if (!backup.accountsIndex) {
        // If backup has no accounts and accountsIndex is not defined
        await this.createNewAccount('My first account', password);
      }
    } catch (e: any) {
      await this.reset();

      if (e instanceof StandardDedotSignerError) {
        throw e;
      } else {
        throw new StandardDedotSignerError(e.message);
      }
    }
  }

  async verifyAccountBackupPassword(backup: AccountBackup, password: string): Promise<KeyringPair> {
    // Create pair from backup and run decodePkcs8 with password to check whether the password is correct
    const pair = this.#keyring.createFromJson(backup);

    try {
      pair.decodePkcs8(password);

      return pair;
    } catch (e: any) {
      if (e.message === 'Unable to decode using the supplied passphrase') {
        throw new DedotSignerError(ErrorCode.PasswordIncorrect);
      }

      throw e;
    }
  }
}

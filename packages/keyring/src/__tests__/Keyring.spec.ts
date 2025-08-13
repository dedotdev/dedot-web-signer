import { Keyring as InnerKeyring } from '@polkadot/ui-keyring/Keyring';
import { encodeAddress } from '@polkadot/util-crypto';
import { generateMnemonic } from '@polkadot/util-crypto/mnemonic/bip39';
import Keyring, { ACCOUNTS_INDEX, ENCRYPTED_MNEMONIC, ORIGINAL_HASH } from '@dedot/signer-keyring/Keyring';
import { AccountBackup, AccountInfo, WalletBackup, WalletQrBackup } from '@dedot/signer-keyring/types';
import { DedotSignerError, ErrorCode, StandardDedotSignerError, sha256AsHex } from '@dedot/signer-utils';
import CryptoJS from 'crypto-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let keyring: Keyring;

beforeEach(async () => {
  if (keyring) {
    // TODO better clearing cache data in modules
    await keyring.reset();

    // @ts-ignore
    keyring = undefined;
  }

  localStorage.clear();
});

const PASSWORD = 'supersecretpassword';
const MNEMONIC = generateMnemonic(12);

const initializeNewKeyring = async () => {
  keyring = new Keyring();
  await keyring.initialize(MNEMONIC, PASSWORD);

  return keyring;
};

describe('initialization', () => {
  it('should store mnemonic phrase to localstorage', async () => {
    await initializeNewKeyring();

    expect(localStorage.getItem(ENCRYPTED_MNEMONIC)).toBeDefined();
  });

  describe('initialized', () => {
    it('should return false before initialization', async () => {
      const keyring = new Keyring();

      expect(await keyring.initialized()).toEqual(false);
    });

    it('should return true after initialization', async () => {
      await initializeNewKeyring();

      expect(await keyring.initialized()).toEqual(true);
    });
  });
});

describe('lock/unlock', () => {
  beforeEach(async () => {
    await initializeNewKeyring();
  });

  it('should lock the keyring after initialization', async () => {
    expect(keyring.locked()).toEqual(true);
  });

  it('should unlock the keyring', async () => {
    await keyring.unlock(PASSWORD);

    expect(keyring.locked()).toEqual(false);
  });
});

describe('getAccountsIndex', () => {
  it('should start with 0', async () => {
    await initializeNewKeyring();
    expect(keyring.getAccountsIndex()).toEqual(0);
  });

  it('should increase one by one after new account created', async () => {
    await initializeNewKeyring();

    await keyring.createNewAccount('Account 01', PASSWORD);
    expect(keyring.getAccountsIndex()).toEqual(1);

    await keyring.createNewAccount('Account 02', PASSWORD);
    expect(keyring.getAccountsIndex()).toEqual(2);
  });
});

describe('verifyPassword', () => {
  it('should throw out error if wallet is not initialized', async () => {
    const keyring = new Keyring();

    await expect(keyring.verifyPassword(PASSWORD)).rejects.toThrowError(
      new DedotSignerError(ErrorCode.KeyringNotInitialized),
    );
  });

  it('should throw out error if password is not correct', async () => {
    await initializeNewKeyring();

    await expect(keyring.verifyPassword('incorrect')).rejects.toThrowError(
      new DedotSignerError(ErrorCode.PasswordIncorrect),
    );
  });

  it('should not throw out anything if password is correct', async () => {
    await initializeNewKeyring();

    await expect(keyring.verifyPassword(PASSWORD)).resolves.toBeUndefined();
  });
});

// get accounts
describe('getAccounts', () => {
  it('should return empty array', async () => {
    const keyring = new Keyring();
    await expect(keyring.getAccounts()).resolves.toEqual([]);
  });

  it('should return accounts', async () => {
    await initializeNewKeyring();
    await keyring.createNewAccount('Account 01', PASSWORD);
    await keyring.createNewAccount('Account 02', PASSWORD);

    const accounts = await keyring.getAccounts();
    expect(accounts.length).toEqual(2);
    expect(accounts[0].name).toEqual('Account 01');
    expect(accounts[1].name).toEqual('Account 02');
  });
});

describe('createNewAccount', () => {
  describe('wallet initialized', () => {
    beforeEach(async () => {
      await initializeNewKeyring();
    });

    it('should required account name to create new account', async () => {
      await expect(keyring.createNewAccount('', PASSWORD)).rejects.toThrowError(
        new DedotSignerError(ErrorCode.AccountNameRequired),
      );
    });

    it('should required password to create new account', async () => {
      await expect(keyring.createNewAccount('Account name', '')).rejects.toThrowError(
        new DedotSignerError(ErrorCode.PasswordRequired),
      );
    });

    it('should throw out error if password is incorrect', async () => {
      await expect(keyring.createNewAccount('Account name', 'incorrect')).rejects.toThrowError(
        new DedotSignerError(ErrorCode.PasswordIncorrect),
      );
    });

    it('should throw out error if name is already used', async () => {
      await keyring.createNewAccount('Account 01', PASSWORD);

      await expect(keyring.createNewAccount('Account 01', PASSWORD)).rejects.toThrowError(
        new DedotSignerError(ErrorCode.AccountNameUsed),
      );
    });

    it('should have no derivation path for first account', async () => {
      const account = await keyring.createNewAccount('Account 01', PASSWORD);
      expect(account.derivationPath).toEqual('');
    });

    it('should save derivation path', async () => {
      await keyring.createNewAccount('Account 01', PASSWORD);
      const account02 = await keyring.createNewAccount('Account 02', PASSWORD);
      const account03 = await keyring.createNewAccount('Account 03', PASSWORD);
      expect(account02.derivationPath).toEqual('//0');
      expect(account03.derivationPath).toEqual('//1');
    });

    it('should lock the keyring after creation', async () => {
      await keyring.createNewAccount('Account 01', PASSWORD);
      expect(keyring.locked()).toEqual(true);
    });

    it('should increase accounts index after creation', async () => {
      const oldIndex = keyring.getAccountsIndex();
      await keyring.createNewAccount('Account 01', PASSWORD);
      expect(keyring.getAccountsIndex()).toEqual(oldIndex + 1);
    });

    it('should not increase accounts index when using custom derivation path', async () => {
      const oldIndex = keyring.getAccountsIndex();
      await keyring.createNewAccount('Account 01', PASSWORD, '//custom-path');
      expect(keyring.getAccountsIndex()).toEqual(oldIndex);
    });
  });

  describe('wallet uninitialized', () => {
    it('should throw out error', async () => {
      const keyring = new Keyring();
      await expect(keyring.createNewAccount('Account name', PASSWORD)).rejects.toThrowError(
        new DedotSignerError(ErrorCode.KeyringNotInitialized),
      );
    });
  });
});

describe('getAccount', () => {
  let account: AccountInfo;
  beforeEach(async () => {
    await initializeNewKeyring();
    account = await keyring.createNewAccount('Account 01', PASSWORD);
  });

  it('should throw out error if account not found', async () => {
    await expect(keyring.getAccount('0xNotExistedAddress')).rejects.toThrowError(
      new DedotSignerError(ErrorCode.AccountNotFound),
    );
  });

  it('should return account using generic address', async () => {
    await expect(keyring.getAccount(account.address)).resolves.toEqual(account);
  });

  it('should return account using different network address', async () => {
    const polkadotAddress = encodeAddress(account.address, 0);
    await expect(keyring.getAccount(polkadotAddress)).resolves.toEqual(account);

    const kusamaAddress = encodeAddress(account.address, 2);
    await expect(keyring.getAccount(kusamaAddress)).resolves.toEqual(account);
  });
});

describe('getAccountByName', () => {
  let account: AccountInfo;
  beforeEach(async () => {
    await initializeNewKeyring();
    account = await keyring.createNewAccount('Account 01', PASSWORD);
  });

  it('should throw out error if account not found', async () => {
    await expect(keyring.getAccountByName('NotExistedName')).rejects.toThrowError(
      new DedotSignerError(ErrorCode.AccountNotFound),
    );
  });

  it('should return account for existed name', async () => {
    await expect(keyring.getAccountByName('Account 01')).resolves.toEqual(account);
  });
});

describe('getSigningPair', () => {
  let account: AccountInfo;
  beforeEach(async () => {
    await initializeNewKeyring();
    account = await keyring.createNewAccount('Account 01', PASSWORD);
  });

  it('should throw out error if keypair not found', () => {
    expect(() => keyring.getSigningPair('0xNotExistedAddress')).toThrowError(
      new DedotSignerError(ErrorCode.KeypairNotFound),
    );
  });

  it('should return keypair for existed address', () => {
    const pair = keyring.getSigningPair(account.address);
    expect(pair).toHaveProperty('address', account.address);
    expect(pair).toHaveProperty('sign');
    expect(pair).toHaveProperty('type');
  });
});

describe('existsName', () => {
  beforeEach(async () => {
    await initializeNewKeyring();
    await keyring.createNewAccount('Account 01', PASSWORD);
  });

  it('should return true if account exists', async () => {
    await expect(keyring.existsName('NotExistedName')).resolves.toEqual(false);
  });

  it('should return false if account not exists', async () => {
    await expect(keyring.existsName('Account 01')).resolves.toEqual(true);
  });
});

describe('reset', () => {
  it('should clear all keyring data after resetting', async () => {
    await initializeNewKeyring();

    await keyring.createNewAccount('Account 01', PASSWORD);
    await keyring.createNewAccount('Account 02', PASSWORD);
    await keyring.reset();

    expect(localStorage.getItem(ENCRYPTED_MNEMONIC)).toBeNull();
    expect(localStorage.getItem(ACCOUNTS_INDEX)).toBeNull();
    expect(Object.keys(localStorage).filter((key) => key.startsWith('account:0x')).length).toEqual(0);
  });
});

describe('changePassword', () => {
  const NEW_PASSWORD = 'valid-password';

  it('should throw out error if wallet is not initialized', async () => {
    const keyring = new Keyring();

    await expect(keyring.changePassword(PASSWORD, NEW_PASSWORD)).rejects.toThrowError(
      new DedotSignerError(ErrorCode.KeyringNotInitialized),
    );
  });

  it('should throw out error if currentPassword is not correct', async () => {
    const keyring = await initializeNewKeyring();

    await expect(keyring.changePassword('incorrect-password', NEW_PASSWORD)).rejects.toThrowError(
      new DedotSignerError(ErrorCode.PasswordIncorrect),
    );
  });

  it('should initialize the rawMnemonic with new password', async () => {
    const keyring = await initializeNewKeyring();

    const initializeSpy = vi.spyOn(Keyring.prototype, 'initialize');

    await keyring.changePassword(PASSWORD, NEW_PASSWORD);

    expect(initializeSpy).toHaveBeenCalledWith(MNEMONIC, NEW_PASSWORD);
  });

  it('should call `saveAccount` if currentPassword and newPassword is valid', async () => {
    const keyring = await initializeNewKeyring();

    await keyring.createNewAccount('account 0', PASSWORD);
    await keyring.createNewAccount('account 1', PASSWORD);

    const saveAccountSpy = vi.spyOn(InnerKeyring.prototype, 'saveAccount');
    await keyring.changePassword(PASSWORD, NEW_PASSWORD);

    expect(saveAccountSpy).toHaveBeenCalledTimes(2);
  });

  it('could use new password to unlock accounts after change password', async () => {
    const keyring = await initializeNewKeyring();

    await keyring.createNewAccount('test-account', PASSWORD);
    await keyring.changePassword(PASSWORD, NEW_PASSWORD);

    const testAccount = await keyring.getAccountByName('test-account');
    const testPair = await keyring.getSigningPair(testAccount.address);

    await expect(keyring.unlock(NEW_PASSWORD)).resolves;
    expect(testPair.unlock(NEW_PASSWORD)).toBeUndefined();
  });
});

describe('removeAccount', () => {
  it('should run forgetAccount function', async () => {
    const keyring = await initializeNewKeyring();

    await keyring.createNewAccount('test-account', PASSWORD);

    const forgetAccountSpy = vi.spyOn(InnerKeyring.prototype, 'forgetAccount');

    const testAccount = await keyring.getAccountByName('test-account');
    await keyring.removeAccount(testAccount.address);

    expect(forgetAccountSpy).toBeCalled();
  });

  it('cannot found the account after removing', async () => {
    const keyring = await initializeNewKeyring();

    await keyring.createNewAccount('test-account', PASSWORD);

    const testAccount = await keyring.getAccountByName('test-account');
    await keyring.removeAccount(testAccount.address);

    await expect(keyring.getAccountByName('test-account')).rejects.toThrowError(
      new DedotSignerError(ErrorCode.AccountNotFound),
    );
  });
});

describe('renameAccount', () => {
  let address: string, keyring: Keyring;
  beforeEach(async () => {
    keyring = await initializeNewKeyring();
    address = (await keyring.createNewAccount('test-account', PASSWORD)).address;
  });

  it('should throw an error when the name already exists', async () => {
    await expect(keyring.renameAccount(address, 'test-account')).rejects.toThrowError(
      new DedotSignerError(ErrorCode.AccountNameUsed),
    );
  });

  it('should run saveAccountMeta function', async () => {
    const renameAccountSpy = vi.spyOn(Keyring.prototype, 'renameAccount');

    await keyring.renameAccount(address, 'valid-name');
    expect(renameAccountSpy).toBeCalled();
  });

  it('should able to find the account after renaming it', async () => {
    await keyring.renameAccount(address, 'valid-name');

    await expect(keyring.getAccountByName('valid-name')).resolves;
    await expect(keyring.getAccountByName('test-account')).rejects.toThrowError(
      new DedotSignerError(ErrorCode.AccountNotFound),
    );
  });
});

describe('exportWallet', () => {
  beforeEach(async () => {
    await initializeNewKeyring();
  });

  it('should verify password', async () => {
    const mockedVerifyPassword = vi.spyOn(Keyring.prototype, 'verifyPassword');
    await keyring.exportWallet(PASSWORD);

    expect(mockedVerifyPassword).toHaveBeenCalledWith(PASSWORD);
  });

  it('should return a wallet backup', async () => {
    await keyring.createNewAccount('Account 01', PASSWORD);
    await keyring.createNewAccount('Account 02', PASSWORD);

    const backup = await keyring.exportWallet(PASSWORD);

    expect(backup.accounts).toHaveLength(2);
    expect(backup.accountsIndex).toEqual(2);
    expect(backup.encryptedMnemonic).toBeTypeOf('string');
  });
});

describe('importQrBackup', () => {
  let qrBackup: WalletQrBackup;
  beforeEach(() => {
    qrBackup = {
      encryptedMnemonic: CryptoJS.AES.encrypt(MNEMONIC, PASSWORD).toString(),
      accountsIndex: 3,
      accounts: [
        ['', 'Account 01'],
        ['//0', 'Account 02'],
        ['//1', 'Account 03'],
      ],
    };
  });

  it('should throw error if wallet is already initialized', async () => {
    const keyring = await initializeNewKeyring();

    await expect(keyring.importQrBackup(qrBackup, PASSWORD)).rejects.toThrowError(
      new StandardDedotSignerError('Wallet is already initialized'),
    );
  });

  describe('wallet is not initialized', () => {
    beforeEach(() => {
      keyring = new Keyring();
    });

    it('should create a default `My first account` if both accountIndexs and accounts field not defined', async () => {
      qrBackup.accounts = [];
      qrBackup.accountsIndex = 0;

      await keyring.importQrBackup(qrBackup, PASSWORD);

      const accounts = await keyring.getAccounts();

      expect(accounts.length).toEqual(1);
      expect(accounts[0].name).toEqual('My first account');
    });

    it('should check mnemonic validity', async () => {
      qrBackup.encryptedMnemonic = CryptoJS.AES.encrypt('a random invalid seed phrase', PASSWORD).toString();

      await expect(keyring.importQrBackup(qrBackup, PASSWORD)).rejects.toThrowError(
        new DedotSignerError(ErrorCode.InvalidMnemonic),
      );
    });

    it('should store accounts index & encrypted mnemonic into localstorage', async () => {
      await keyring.importQrBackup(qrBackup, PASSWORD);

      expect(localStorage.getItem(ACCOUNTS_INDEX)).toEqual(qrBackup.accountsIndex.toString());
      expect(localStorage.getItem(ENCRYPTED_MNEMONIC)).toEqual(qrBackup.encryptedMnemonic);
    });

    it('should import accounts from the backup', async () => {
      await keyring.importQrBackup(qrBackup, PASSWORD);

      const accounts = await keyring.getAccounts();
      expect(accounts.length).toEqual(3);
      expect(accounts.map((one) => [one.derivationPath, one.name])).toEqual(qrBackup.accounts);
    });

    it('should call #reset if there is an error', async () => {
      const resetFn = vi.spyOn(keyring, 'reset');
      vi.spyOn(keyring, 'createNewAccount').mockRejectedValue(new Error('Random error'));

      await expect(keyring.importQrBackup(qrBackup, PASSWORD)).rejects.toThrowError();
      expect(resetFn).toHaveBeenCalled();
    });
  });
});

describe('exportAccount', () => {
  let keyring: Keyring, testAccount: AccountInfo;
  beforeEach(async () => {
    keyring = await initializeNewKeyring();
    testAccount = await keyring.createNewAccount('test-account', PASSWORD);
  });

  it('should verify password', async () => {
    const verifyingPasswordSpy = vi.spyOn(Keyring.prototype, 'verifyPassword');
    await keyring.exportAccount(testAccount.address, PASSWORD);

    expect(verifyingPasswordSpy).toBeCalled();
  });

  it('should return an account backup', async () => {
    const accountBackup = await keyring.exportAccount(testAccount.address, PASSWORD);

    expect(accountBackup.address).toBeTypeOf('string');
    expect(accountBackup.encoded).toBeTypeOf('string');
    expect(accountBackup.encoding).toBeTypeOf('object');
    expect(accountBackup.meta).toHaveProperty('originalHash');
    expect(accountBackup.meta).toHaveProperty('name');
  });
});

describe('ensureOriginalHashPresence', () => {
  it('should generate originalHash if not found one', async () => {
    const keyring = await initializeNewKeyring();
    const originalHash = localStorage.getItem(ORIGINAL_HASH);
    localStorage.removeItem(ORIGINAL_HASH);

    await keyring.ensureOriginalHashPresence(PASSWORD);
    expect(localStorage.getItem(ORIGINAL_HASH)).toEqual(originalHash);
  });
});

describe('importAccount', () => {
  const BACKUP_PASSWORD = 'backup-password';
  let keyring: Keyring, backup: AccountBackup, address: string;
  beforeEach(async () => {
    keyring = await initializeNewKeyring();

    const account = await keyring.createNewAccount('test-account', PASSWORD);
    address = account.address;

    await keyring.changePassword(PASSWORD, BACKUP_PASSWORD);
    backup = await keyring.exportAccount(address, BACKUP_PASSWORD);
    await keyring.removeAccount(address);
  });
  it('should throw error if account exists', async () => {
    await keyring.importAccount(backup, BACKUP_PASSWORD, PASSWORD);

    await expect(keyring.importAccount(backup, BACKUP_PASSWORD, PASSWORD)).rejects.toThrowError(
      new DedotSignerError(ErrorCode.AccountExisted),
    );
  });

  it('should throw error if account name exists', async () => {
    await keyring.createNewAccount('test-account', BACKUP_PASSWORD);

    await expect(keyring.importAccount(backup, BACKUP_PASSWORD, PASSWORD)).rejects.toThrowError(
      new DedotSignerError(ErrorCode.AccountNameUsed),
    );
  });

  it('should throw error if account name not found', async () => {
    await expect(
      keyring.importAccount({ ...backup, meta: { ...backup.meta, name: '' } }, BACKUP_PASSWORD, PASSWORD),
    ).rejects.toThrowError(new DedotSignerError(ErrorCode.AccountNameRequired));
  });

  it('should found account after restoring account', async () => {
    await keyring.importAccount(backup, BACKUP_PASSWORD, PASSWORD);

    expect(await keyring.existsAccount(address)).toEqual(true);
  });

  it('should throw error if password incorrect', async () => {
    await expect(keyring.importAccount(backup, 'incorrect-password', PASSWORD)).rejects.toThrowError(
      new DedotSignerError(ErrorCode.PasswordIncorrect),
    );
  });

  it('could unlock imported account with wallet password', async () => {
    await keyring.importAccount(backup, BACKUP_PASSWORD, PASSWORD);

    const importedAccount = await keyring.getSigningPair(address);

    expect(await importedAccount.unlock(PASSWORD)).toBeUndefined();
  });
});

describe('verifyAccountBackupPassword', () => {
  it('should throw error if password is incorrect', async () => {
    const keyring = await initializeNewKeyring();
    const { address } = await keyring.createNewAccount('test-account', PASSWORD);
    const backup = await keyring.exportAccount(address, PASSWORD);

    await expect(keyring.verifyAccountBackupPassword(backup, 'incorrect-password')).rejects.toThrowError(
      new DedotSignerError(ErrorCode.PasswordIncorrect),
    );
  });
});

describe('importBackup', () => {
  let backup: WalletBackup;
  beforeEach(async () => {
    keyring = await initializeNewKeyring();
    await keyring.createNewAccount('test-account', PASSWORD);

    backup = await keyring.exportWallet(PASSWORD);

    await keyring.reset();
  });

  it('should throw error if wallet is already initialized', async () => {
    keyring = await initializeNewKeyring();

    await expect(keyring.importBackup(backup, PASSWORD)).rejects.toThrowError(
      new StandardDedotSignerError('Wallet is already initialized'),
    );
  });

  describe('wallet is not initialized', () => {
    beforeEach(() => {
      keyring = new Keyring();
    });

    it('should create a default `My first account` if both accountIndexs and accounts field not defined', async () => {
      backup.accounts = [];
      backup.accountsIndex = 0;

      await keyring.importBackup(backup, PASSWORD);

      const accounts = await keyring.getAccounts();

      expect(accounts.length).toEqual(1);
      expect(accounts[0].name).toEqual('My first account');
    });

    it('should store accountIndex & encryptedMnemonic into localStorage and generate originalHash', async () => {
      await keyring.importBackup(backup, PASSWORD);

      expect(localStorage.getItem(ENCRYPTED_MNEMONIC)).toEqual(backup.encryptedMnemonic);
      expect(localStorage.getItem(ACCOUNTS_INDEX)).toEqual(backup.accountsIndex.toString());

      const originalHash = sha256AsHex(await keyring.getRawMnemonic(PASSWORD));
      expect(localStorage.getItem(ORIGINAL_HASH)).toEqual(originalHash);
    });

    it('should check mnemonic validity', async () => {
      backup.encryptedMnemonic = CryptoJS.AES.encrypt('a random invalid seed phrase', PASSWORD).toString();

      await expect(keyring.importBackup(backup, PASSWORD)).rejects.toThrowError(
        new DedotSignerError(ErrorCode.InvalidMnemonic),
      );
    });

    it('should throw error if password incorrect', async () => {
      await expect(keyring.importBackup(backup, 'wrong-password')).rejects.toThrowError(
        new DedotSignerError(ErrorCode.PasswordIncorrect),
      );
    });

    it('should import accounts from backup', async () => {
      await keyring.importBackup(backup, PASSWORD);

      const accounts = await keyring.getAccounts();
      expect(accounts.length).toEqual(1);
      expect(accounts[0].name).toEqual('test-account');
    });

    it('should call reset if this is an error', async () => {
      const resetFnSpy = vi.spyOn(Keyring.prototype, 'reset');

      await expect(keyring.importBackup(backup, 'wrong-password')).rejects.toThrowError();
      expect(resetFnSpy).toBeCalled();
    });
  });
});

import { InjectedAccount } from '@polkadot/extension-inject/types';
import { TypeRegistry } from '@polkadot/types';
import { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import { u8aToHex, u8aWrapBytes } from '@polkadot/util';
import { encodeAddress } from '@polkadot/util-crypto';
import { KeypairType } from '@polkadot/util-crypto/types';
import Keyring from '@dedot/signer-keyring';
import { assert, StandardDedotSignerError, trimOffUrlProtocol } from '@dedot/signer-utils';
import { BehaviorSubject } from 'rxjs';
import { defaultNetwork } from '../networks';
import {
  AccessStatus,
  RequestAppRequestAccess,
  RequestName,
  WalletRequestMessage,
  WalletRequestWithResolver,
  WalletResponse,
} from '../types';

export type AppId = string;
export interface AppInfo {
  id: string;
  name: string;
  url: string;
  authorizedAccounts: string[];
  createdAt: number;
  updatedAt?: number;
}
export type AuthorizedApps = Record<AppId, AppInfo>;

export const AUTHORIZED_ACCOUNTS_KEY = 'AUTHORIZED_ACCOUNTS';
export const URL_PROTOCOLS = ['http://', 'https://'];

type NullableRequestWithResolver = WalletRequestWithResolver | null;

export function canDerive(type?: KeypairType): boolean {
  return !!type && ['ed25519', 'sr25519', 'ecdsa', 'ethereum'].includes(type);
}

/**
 * @name WalletState
 * @description Internal state of the wallet which abstracts away
 * logic to interact with wallet via messages
 */
export default class WalletState {
  readonly #keyring: Keyring;
  #authorizedAppsSubject: BehaviorSubject<AuthorizedApps> = new BehaviorSubject<AuthorizedApps>({});
  #requestMessageSubject: BehaviorSubject<NullableRequestWithResolver> =
    new BehaviorSubject<NullableRequestWithResolver>(null);

  constructor(keyring: Keyring) {
    this.#keyring = keyring;

    this.#loadAuthorizedAccounts();

    window.addEventListener('storage', (event) => {
      if (event.key === AUTHORIZED_ACCOUNTS_KEY) {
        this.#loadAuthorizedAccounts();
      }
    });

    this.#authorizedAppsSubject.subscribe(() => {
      this.#saveAuthorizedApps();
    });
  }

  #loadAuthorizedAccounts() {
    const authorizedAccountsString = localStorage.getItem(AUTHORIZED_ACCOUNTS_KEY) || '{}';
    const authorizedApps = JSON.parse(authorizedAccountsString) as AuthorizedApps;
    this.#authorizedAppsSubject.next(authorizedApps);
  }

  #saveAuthorizedApps() {
    localStorage.setItem(AUTHORIZED_ACCOUNTS_KEY, JSON.stringify(this.authorizedApps));
  }

  /**
   * Get all authorized apps
   */
  get authorizedApps() {
    return this.#authorizedAppsSubject.value;
  }

  get authorizedAppsSubject() {
    return this.#authorizedAppsSubject;
  }

  /**
   * Get all authorized apps as an array sorted oldest first
   */
  getAuthorizedApps() {
    return Object.values(this.authorizedApps).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }

  getAuthorizedAppsToAccount(address: string) {
    return this.getAuthorizedApps().filter((one) => one.authorizedAccounts.includes(this.toGenericAddress(address)));
  }

  /**
   * Remove all authorized apps
   */
  removeAllAuthorizedApps() {
    this.#authorizedAppsSubject.next({});
  }

  /**
   * Update an authorized app info
   *
   * @param appInfo
   */
  saveAuthorizedApp(appInfo: AppInfo) {
    const { id } = appInfo;
    if (!id) {
      return;
    }

    assert(this.authorizedApps[id], 'App not found');

    this.authorizedApps[id] = appInfo;
    this.#authorizedAppsSubject.next(this.authorizedApps);
  }

  /**
   * Remove an authorized app
   *
   * @param id
   */
  removeAuthorizedApp(id: AppId) {
    delete this.authorizedApps[id];
    this.#authorizedAppsSubject.next(this.authorizedApps);
  }

  /**
   * Convert an address to substrate generic address (prefix: 42)
   *
   * @param address
   */
  toGenericAddress(address: string) {
    return encodeAddress(address, defaultNetwork.prefix);
  }

  /**
   * Remove app access to an account
   *
   * @param id
   * @param address
   */
  removeAppAccessToAccount(id: AppId, address: string) {
    const appInfo = this.getAuthorizedApp(id);

    const substrateAddress = this.toGenericAddress(address);
    if (!appInfo.authorizedAccounts.includes(substrateAddress)) {
      return;
    }

    const newAuthorizedAccounts = appInfo.authorizedAccounts.filter((one) => one !== substrateAddress);
    this.authorizedApps[id] = {
      ...appInfo,
      authorizedAccounts: newAuthorizedAccounts,
    };

    this.#authorizedAppsSubject.next(this.authorizedApps);
  }

  /**
   * Remove all apps access to an account
   *
   * @param address
   */
  removeAllAccessToAccount(address: string) {
    const substrateAddress = this.toGenericAddress(address);

    for (const appInfo of Object.values(this.authorizedApps)) {
      if (!appInfo.authorizedAccounts.includes(substrateAddress)) {
        continue;
      }

      const newAuthorizedAccounts = appInfo.authorizedAccounts.filter((one) => one !== substrateAddress);
      this.authorizedApps[appInfo.id] = {
        ...appInfo,
        authorizedAccounts: newAuthorizedAccounts,
      };
    }

    this.#authorizedAppsSubject.next(this.authorizedApps);
  }

  /**
   * Get all injected accounts from keyring
   *
   * @param anyType
   */
  async getInjectedAccounts(anyType = false): Promise<InjectedAccount[]> {
    const accounts = await this.#keyring.getAccounts();
    return accounts
      .filter(({ type }) => (anyType ? true : canDerive(type)))
      .map(({ address, genesisHash, name, type }) => ({ address, genesisHash, name, type }));
  }

  /**
   * Get only authorized injected accounts for an app
   *
   * @param appUrl
   */
  async getAuthorizedInjectedAccounts(appUrl: string): Promise<InjectedAccount[]> {
    const { authorizedAccounts: authorizedAddresses } = this.getAuthorizedApp(appUrl);
    const accounts = await this.getInjectedAccounts();

    return accounts.filter((account) => authorizedAddresses.includes(account.address));
  }

  /**
   * Extract app id from an url
   *
   * @param url
   */
  extractAppId(url: string) {
    assert(url && URL_PROTOCOLS.some((protocol) => url.startsWith(protocol)), `Invalid url: ${url}`);

    return trimOffUrlProtocol(url);
  }

  /**
   * Get app information by an url
   *
   * @throws {DedotError} if the app information is not found / has not been authorized yet
   * @param url
   */
  getAuthorizedApp(url: string): AppInfo {
    const appInfo = this.authorizedApps[url] || this.authorizedApps[this.extractAppId(url)];

    assert(appInfo, `The app at ${url} has not been authorized yet!`);

    return appInfo;
  }

  /**
   * Make sure an app (url) is authorized
   *
   * @param url
   */
  ensureAppAuthorized(url: string): boolean {
    const app = this.getAuthorizedApp(url);

    assert(app.authorizedAccounts.length > 0, `The app at ${url} has not been authorized to access any accounts!`);

    return true;
  }

  /**
   * Make sure an account is authorized for an app
   *
   * @param url
   * @param accountAddress
   */
  ensureAccountAuthorized(url: string, accountAddress: string): void {
    const app = this.getAuthorizedApp(url);
    const substrateAddress = encodeAddress(accountAddress, defaultNetwork.prefix);

    // TODO improve message clarity here
    assert(
      app.authorizedAccounts.includes(substrateAddress),
      `The app at ${url} is not authorized to access account with address ${accountAddress}!`,
    );
  }

  /**
   * Get current request message sending from an app
   *
   * @param requestName
   */
  getCurrentRequestMessage = (requestName?: RequestName) => {
    const currentRequestMessage = this.#requestMessageSubject.value;
    if (!currentRequestMessage) {
      throw new StandardDedotSignerError('No request message available');
    }

    if (requestName && currentRequestMessage?.request.name !== requestName) {
      throw new StandardDedotSignerError('Invalid request name');
    }

    return currentRequestMessage;
  };

  async approveRequestAccess(authorizedAccounts: string[]) {
    const { origin: url, request, resolve } = this.getCurrentRequestMessage('tab/requestAccess');

    const requestBody = request.body as RequestAppRequestAccess;

    const appId = this.extractAppId(url);
    const authorizedApps = this.authorizedApps;

    assert(authorizedAccounts && authorizedAccounts.length, 'Please choose at least one account to connect');

    authorizedApps[appId] = {
      id: appId,
      name: requestBody.appName,
      url,
      authorizedAccounts,
      createdAt: Date.now(),
    };

    this.#authorizedAppsSubject.next(authorizedApps);

    resolve({
      result: AccessStatus.APPROVED,
      authorizedAccounts: await this.getAuthorizedInjectedAccounts(url),
    });
  }

  rejectRequestAccess = () => {
    const { reject } = this.getCurrentRequestMessage('tab/requestAccess');
    reject(new StandardDedotSignerError(AccessStatus.DENIED));
  };

  async approveUpdateAccess(authorizedAccounts: string[]) {
    const { origin: url, resolve } = this.getCurrentRequestMessage('tab/updateAccess');

    const appInfo = this.getAuthorizedApp(url);

    assert(authorizedAccounts && authorizedAccounts.length, 'Please choose at least one account to connect');

    const appId = this.extractAppId(url);
    this.authorizedApps[appId] = {
      ...appInfo,
      authorizedAccounts,
      updatedAt: Date.now(),
    };

    this.#authorizedAppsSubject.next(this.authorizedApps);

    resolve({
      result: AccessStatus.APPROVED,
      authorizedAccounts: await this.getAuthorizedInjectedAccounts(url),
    });
  }

  rejectUpdateAccess = () => {
    const { reject } = this.getCurrentRequestMessage('tab/updateAccess');
    reject(new StandardDedotSignerError(AccessStatus.DENIED));
  };

  async approveSignExtrinsic(password: string) {
    await this.#keyring.verifyPassword(password);

    const currentMessage = this.getCurrentRequestMessage('tab/signExtrinsic');

    const { id, request, resolve, origin: fromUrl } = currentMessage;
    const payloadJSON = request.body as SignerPayloadJSON;

    this.ensureAccountAuthorized(fromUrl, payloadJSON.address);

    const pair = this.#keyring.getSigningPair(payloadJSON.address);
    pair.unlock(password);

    const registry = new TypeRegistry();
    registry.setSignedExtensions(payloadJSON.signedExtensions);

    // https://github.com/polkadot-js/extension/blob/master/packages/extension-base/src/background/RequestExtrinsicSign.ts#L18-L22
    const payload = registry.createType('ExtrinsicPayload', payloadJSON, { version: payloadJSON.version });
    const result = payload.sign(pair);

    resolve({
      id,
      ...result,
    });
  }

  cancelSignExtrinsic() {
    const currentMessage = this.getCurrentRequestMessage('tab/signExtrinsic');
    currentMessage.reject(new StandardDedotSignerError('Cancelled'));
  }

  async signRawMessage(password: string) {
    await this.#keyring.verifyPassword(password);

    const currentMessage = this.getCurrentRequestMessage('tab/signRaw');

    const { id, request, resolve, origin: fromUrl } = currentMessage;
    const payloadJSON = request.body as SignerPayloadRaw;

    this.ensureAccountAuthorized(fromUrl, payloadJSON.address);

    const pair = this.#keyring.getSigningPair(payloadJSON.address);
    pair.unlock(password);

    // https://github.com/polkadot-js/extension/blob/master/packages/extension-base/src/background/RequestBytesSign.ts#L20-L27
    const signature = u8aToHex(pair.sign(u8aWrapBytes(payloadJSON.data)));

    resolve({
      id,
      signature,
    });
  }

  cancelSignRawMessage() {
    const currentMessage = this.getCurrentRequestMessage('tab/signRaw');
    currentMessage.reject(new StandardDedotSignerError('Cancelled'));
  }

  /**
   * Add new request message to be handling
   *
   * @param message
   */
  async newRequestMessage<TRequestName extends RequestName>(
    message: WalletRequestMessage<TRequestName>,
  ): Promise<WalletResponse<TRequestName>> {
    return new Promise<WalletResponse<TRequestName>>((resolve, reject) => {
      this.#requestMessageSubject.next({
        ...message,
        reject,
        resolve,
      });
    });
  }

  /**
   * Subscribe to new request message change
   *
   * @param onNewRequest
   */
  subscribeToNewRequestMessage = (onNewRequest: (request: WalletRequestWithResolver) => void): (() => void) => {
    const subscription = this.#requestMessageSubject.subscribe((nextRequest) => {
      nextRequest && onNewRequest(nextRequest);
    });

    return subscription.unsubscribe.bind(subscription);
  };

  /**
   * Clear all persistent state & reset values
   */
  reset() {
    localStorage.removeItem(AUTHORIZED_ACCOUNTS_KEY);
    this.reloadState();
  }

  reloadState() {
    this.#loadAuthorizedAccounts();
    this.keyring.reload();
  }

  get keyring() {
    return this.#keyring;
  }
}

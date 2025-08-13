import { injectExtension } from '@polkadot/extension-inject';
import { isWalletResponse, newMessageId, newWalletRequest } from '@dedot/signer-base';
import {
  MessageId,
  MessageType,
  RequestName,
  WalletInfo,
  WalletRequest,
  WalletRequestMessage,
  WalletResponse,
  WalletResponseMessage,
} from '@dedot/signer-base/types';
import { assert, assertFalse, DedotSignerError, ErrorCode, trimTrailingSlash } from '@dedot/signer-utils';
import { ConnectedAccounts } from './ConnectedAccounts';
import SubstrateInjected from './injection/Injected';
import { DedotSignerSdkOptions, Handlers, InjectedWindow, UpdatableInjected } from './types';
import TabInstance from './wallet/TabInstance';

const DEFAULT_WALLET_URL = 'https://signer.dedot.dev';

/**
 * @name DedotSignerSdk
 * @description A helper to initialize/inject Dedot Signer API
 * and interact with wallet instances
 *
 * ## Initialize & interact with Dedot Signer
 *
 * ```typescript
 * import { DedotSignerSdk } from '@dedot/signer-sdk';
 *
 * const initializeDedotSigner = async () => {
 *   // Inject Dedot Signer API
 *   const sdk = new DedotSignerSdk()
 *   await sdk.initialize();
 *
 *   // We can now interact with the wallet using the similar Polkadot{.js} extension API
 *   const injected = await window['injectedWeb3']['dedot-signer'].enable('Awesome Dapp');
 *   const approvedAccounts = await injected.accounts.get();
 *
 *   return { sdk, injected, approvedAccounts }
 * }
 *
 * await initializeDedotSigner();
 * ```
 */
export class DedotSignerSdk {
  #walletUrl: string;
  #initialized: boolean;
  #handlers: Handlers;
  #walletInfo?: WalletInfo;
  #connectedAccounts?: ConnectedAccounts;
  #walletInstancesQueue: Window[];

  constructor(options?: DedotSignerSdkOptions) {
    this.#initialized = false;
    this.#handlers = {};

    // TODO validate url format
    const walletUrl = options?.walletUrl || DEFAULT_WALLET_URL;
    this.#walletUrl = trimTrailingSlash(walletUrl);
    this.#walletInstancesQueue = [];
  }

  /**
   * Initialize & inject wallet API
   */
  async initialize() {
    assert(typeof window !== 'undefined', 'Dedot Signer SDK only works in browser environment!');
    assertFalse(this.#initialized, 'Dedot Signer SDK is already initialized!');

    await this.#loadWalletInfo();

    this.#subscribeWalletMessage();

    this.#injectWalletAPI();

    this.#connectedAccounts = new ConnectedAccounts(this);

    this.#initialized = true;

    console.log('Dedot Signer SDK initialized!');
  }

  /**
   * Destroy Dedot Signer initialization
   */
  destroy() {
    if (!this.#initialized) {
      return;
    }

    this.#unsubscribeWalletMessage();

    const injectedWindow = window as Window & InjectedWindow;
    if (injectedWindow.injectedWeb3 && this.#walletInfo?.name) {
      delete injectedWindow.injectedWeb3[this.#walletInfo?.name];
    }

    this.#initialized = false;
  }

  /**
   * Open a new wallet window/popup
   *
   * @param path
   */
  async openWalletWindow(path = ''): Promise<Window> {
    return new TabInstance(this.#walletUrl).openWalletWindow(path);
  }

  async #sendMessageToTabInstance(message: WalletRequestMessage) {
    this.ensureSdkInitialized();

    const params = new URLSearchParams({ message: JSON.stringify(message) });

    await this.openWalletWindow(`/request?${params.toString()}`);
  }

  #getAvailableWalletInstance() {
    return this.#walletInstancesQueue.shift();
  }

  /**
   * Launch a new wallet instance and push it in a queue
   * to use later for sending messages to wallet via **sendMessageToWallet**
   *
   * @param path
   */
  async launchNewWalletInstance(path = ''): Promise<Window> {
    const instance = await this.openWalletWindow(path);
    this.#walletInstancesQueue.push(instance);

    return instance;
  }

  /**
   * Launch a new waiting wallet instance that's ready to send messages to
   */
  async newWaitingWalletInstance(): Promise<Window> {
    return this.launchNewWalletInstance('/request');
  }

  /**
   * Send a message to wallet instance based on the request name
   * to an available wallet instance in queue or launch a new wallet instance
   * if the queue is empty
   *
   * @param message
   */
  async #sendMessageToWallet(message: WalletRequestMessage) {
    const { type, request } = message;
    assert(type === MessageType.REQUEST && request, 'Invalid message format');

    const { name } = request;

    const availableInstance = this.#getAvailableWalletInstance();

    if (availableInstance) {
      availableInstance.postMessage(message, this.walletUrl);
    } else if (name.startsWith('tab/')) {
      await this.#sendMessageToTabInstance(message);
    } else {
      throw new DedotSignerError(ErrorCode.InvalidMessageFormat);
    }
  }

  /**
   * Making sure the wallet has been initialized, else an error will be thrown out
   */
  ensureSdkInitialized() {
    assert(this.#initialized, 'Dedot Signer SDK has not been initialized!');
  }

  #walletMessageHandler(event: MessageEvent<WalletResponseMessage>) {
    const { origin, data } = event;
    if (origin !== this.walletUrl) {
      return;
    }

    if (!isWalletResponse(data)) {
      return;
    }

    const { id, error, response } = data;

    const handler = this.#handlers[id];

    if (!handler) {
      console.error('Unknown response ', data);
      return;
    }

    const { resolve, reject } = handler;

    delete this.#handlers[id];

    if (error) {
      reject(new Error(error));
    } else {
      resolve(response);
    }
  }

  async #loadWalletInfo() {
    const response = await fetch(`${this.walletUrl}/wallet-info.json`);
    this.#walletInfo = await response.json();

    assert(this.#walletInfo?.name, 'Wallet information is missing');
    assert(this.#walletInfo?.version, 'Wallet information is missing');
  }

  #subscribeWalletMessage() {
    window.addEventListener('message', this.#walletMessageHandler.bind(this));
  }

  #unsubscribeWalletMessage() {
    window.removeEventListener('message', this.#walletMessageHandler.bind(this));

    Object.keys(this.#handlers).forEach((key) => {
      delete this.#handlers[key as MessageId];
    });
  }

  /**
   * Send a request message to wallet and handle response from wallet.
   *
   * @param request
   */
  sendMessage<TRequestName extends RequestName>(
    request: WalletRequest<TRequestName>,
  ): Promise<WalletResponse<TRequestName>> {
    return new Promise<WalletResponse<TRequestName>>((resolve, reject) => {
      this.ensureSdkInitialized();

      const id = newMessageId();
      this.#handlers[id] = {
        resolve,
        reject,
      };

      const messageBody = newWalletRequest(request, id);

      this.#sendMessageToWallet(messageBody).catch((error) => {
        console.error(error);
        delete this.#handlers[id];

        reject();
      });
    });
  }

  /**
   * Check if the SDK is initialized
   */
  get initialized() {
    return this.#initialized;
  }

  /**
   * Check if the SDK is initialized with a specific wallet url
   * @param walletUrl
   */
  isInitializedWithUrl(walletUrl: string) {
    return this.initialized && walletUrl === this.walletUrl;
  }

  /**
   * Get wallet url
   */
  get walletUrl() {
    return this.#walletUrl;
  }

  /**
   * Get wallet info
   */
  get walletInfo() {
    return this.#walletInfo;
  }

  /**
   * Get connected accounts wrapper
   */
  get connectedAccounts(): ConnectedAccounts {
    this.ensureSdkInitialized();

    return this.#connectedAccounts!;
  }

  async enable(appName: string): Promise<UpdatableInjected> {
    if (!this.connectedAccounts.connected) {
      const { authorizedAccounts } = await this.sendMessage({ name: 'tab/requestAccess', body: { appName } });

      assert(authorizedAccounts.length > 0, 'No authorized accounts found!');

      this.connectedAccounts.save(authorizedAccounts);
    }

    return new SubstrateInjected(this);
  }

  #injectWalletAPI() {
    const { name, version } = this.#walletInfo!;

    const enable = this.enable.bind(this);

    injectExtension(enable, {
      name,
      version,
    });

    const injectedWindow = window as Window & InjectedWindow;
    if (injectedWindow.injectedWeb3 && injectedWindow.injectedWeb3[name]) {
      injectedWindow.injectedWeb3[name].disable = () => {
        this.connectedAccounts.clear();
      };
    }
  }
}

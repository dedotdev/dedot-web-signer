import { InjectedAccount } from '@polkadot/extension-inject/types';
import { assert, trimOffUrlProtocol } from '@dedot/signer-utils';
import { BehaviorSubject, Subscription } from 'rxjs';
import { DedotSignerSdk } from './DedotSignerSdk';

const CONNECTED_ACCOUNTS_KEY = 'CONNECTED_ACCOUNTS';

/**
 * @name ConnectedAccounts
 * @description Store & manage authorized/connected accounts from wallet for dapps
 */
export class ConnectedAccounts {
  #sdk: DedotSignerSdk;
  #accounts: BehaviorSubject<InjectedAccount[]>;

  constructor(sdk: DedotSignerSdk) {
    assert(sdk, 'DedotSignerSdk is required');
    this.#sdk = sdk;

    this.#accounts = new BehaviorSubject<InjectedAccount[]>(this.#loadFromStorage());

    // save to storage on accounts change
    this.#accounts.subscribe((authorizedAccounts) => {
      const key = this.storageKey;
      if (!localStorage.getItem(key) && authorizedAccounts.length === 0) {
        return;
      }

      localStorage.setItem(key, JSON.stringify(authorizedAccounts));
    });
  }

  /**
   * Get the list of connected accounts
   */
  get value(): InjectedAccount[] {
    return this.#accounts.value;
  }

  /**
   * Get the list of connected accounts and throw out error if no accounts are connected
   */
  get ensureValue(): InjectedAccount[] {
    this.ensureConnected();

    return this.value;
  }

  /**
   * Check if there are any accounts connected
   */
  get connected(): boolean {
    return this.value.length > 0;
  }

  /**
   * Check if there are any accounts connected, throw out error if no accounts are connected
   */
  ensureConnected(): boolean {
    assert(this.connected, 'No authorized accounts found!');

    return true;
  }

  /**
   * Save connected accounts into localStorage
   *
   * @param accounts
   */
  save(accounts: InjectedAccount[]) {
    this.#accounts.next(accounts);
  }

  /**
   * Clear connected accounts
   */
  clear() {
    this.#accounts.next([]);
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Trigger the callback function whenever connected accounts change
   *
   * @param cb
   */
  onChange(cb: (accounts: InjectedAccount[]) => void): Subscription {
    return this.#accounts.subscribe(cb);
  }

  get storageKey() {
    const walletId = this.#sdk.walletInfo?.name;
    const walletUrl = trimOffUrlProtocol(this.#sdk.walletUrl);

    return `${walletId}:${walletUrl}:${CONNECTED_ACCOUNTS_KEY}`;
  }

  #loadFromStorage() {
    const raw = localStorage.getItem(this.storageKey) as string;
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as InjectedAccount[];
    } catch (e: any) {
      return [];
    }
  }
}

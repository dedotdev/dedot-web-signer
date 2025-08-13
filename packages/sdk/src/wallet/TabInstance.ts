import { compareWalletInfo } from '@dedot/signer-base';
import { WalletSignal, WalletSignalMessage } from '@dedot/signer-base/types';
import { StandardDedotSignerError } from '@dedot/signer-utils';
import WalletInstance from './WalletInstance';

const POPUP_WINDOW_FEATURES = `resizable=no,status=no,location=no,toolbar=no,menubar=no,width=620,height=700,left=150,top=150`;

/**
 * @name TabInstance
 * @description Represent a tab instance of the wallet loaded inside a browser tab or popup,
 * we can interact with the instance after calling `openWalletWindow` via the `walletWindow` object
 */
export default class TabInstance extends WalletInstance {
  /**
   * Open a new wallet window to a specific path
   *
   * @param path
   */
  async openWalletWindow(path = ''): Promise<Window> {
    this.registerEvent();

    const tabWalletWindow = window.open(`${this.walletUrl}${path}`, '_blank', POPUP_WINDOW_FEATURES);

    if (!tabWalletWindow) {
      throw new StandardDedotSignerError('Error open wallet tab');
    }

    await this.waitUntilWalletReady();

    this.walletWindow = tabWalletWindow;

    return tabWalletWindow;
  }

  protected onSignal({ signal, walletInfo }: WalletSignalMessage) {
    if (signal === WalletSignal.WALLET_TAB_INITIALIZED) {
      this.ready = true;
      this.walletInfo = walletInfo;
    } else if (signal === WalletSignal.WALLET_TAB_UNLOADED && compareWalletInfo(this.walletInfo, walletInfo)) {
      this.ready = false;
    }
  }
}

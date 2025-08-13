import { createContext, FC, useContext, useMemo } from 'react';
import { isMessageId, TabHandler, WalletState } from '@dedot/signer-base';
import { RequestName, WalletRequestMessage, WalletResponse } from '@dedot/signer-base/types';
import Keyring from '@dedot/signer-keyring';
import { DedotSignerError, ErrorCode } from '@dedot/signer-utils';
import { Props } from 'types';

export interface HandleWalletRequest {
  <TRequestName extends RequestName>(message: WalletRequestMessage<TRequestName>): Promise<
    WalletResponse<TRequestName>
  >;
}

interface WalletStateContextProps {
  keyring: Keyring;
  walletState: WalletState;
  handleWalletRequest: HandleWalletRequest;
}

export const WalletStateContext = createContext<WalletStateContextProps>({} as WalletStateContextProps);

export const useWalletState = () => useContext(WalletStateContext);

interface WalletStateProviderProps extends Props {
  initialKeyring?: Keyring;
  initialWalletState?: WalletState;
}

export const WalletStateProvider: FC<WalletStateProviderProps> = ({ children, initialKeyring, initialWalletState }) => {
  const keyring = useMemo(() => initialKeyring || new Keyring(), [initialKeyring]);
  const walletState = useMemo(() => initialWalletState || new WalletState(keyring), [initialWalletState, keyring]);

  async function handleWalletRequest<TRequestName extends RequestName>(
    message: WalletRequestMessage<TRequestName>,
  ): Promise<WalletResponse<TRequestName>> {
    const {
      id,
      request: { name },
    } = message;

    if (isMessageId(id) && name.startsWith('tab/')) {
      return new TabHandler(walletState).handle(message);
    }

    throw new DedotSignerError(ErrorCode.UnknownRequest);
  }

  return (
    <WalletStateContext.Provider value={{ keyring, walletState, handleWalletRequest }}>
      {children}
    </WalletStateContext.Provider>
  );
};

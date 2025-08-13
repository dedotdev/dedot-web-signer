import { useState } from 'react';
import { useBoolean, useEffectOnce } from 'react-use';
import { WalletRequestWithResolver } from '@dedot/signer-base/types';
import { useWalletState } from 'providers/WalletStateProvider';

export default function useCurrentRequestMessage(): [boolean, WalletRequestWithResolver | undefined] {
  const { walletState } = useWalletState();
  const [ready, toggleReady] = useBoolean(false);
  const [currentMessage, setCurrentMessage] = useState<WalletRequestWithResolver>();

  useEffectOnce(() => {
    const unsub = walletState.subscribeToNewRequestMessage((message) => {
      setCurrentMessage(message);
      toggleReady(true);
    });

    return () => unsub();
  });

  return [ready, currentMessage];
}

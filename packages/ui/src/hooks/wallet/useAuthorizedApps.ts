import { useState } from 'react';
import { useEffectOnce } from 'react-use';
import { AppInfo } from '@dedot/signer-base/requests/WalletState';
import { useWalletState } from 'providers/WalletStateProvider';

export default function useAuthorizedApps() {
  const { walletState } = useWalletState();
  const [authorizedApps, setAuthorizedApps] = useState<AppInfo[]>([]);

  useEffectOnce(() => {
    const subscription = walletState.authorizedAppsSubject.subscribe(() => {
      setAuthorizedApps(walletState.getAuthorizedApps());
    });

    return () => subscription.unsubscribe();
  });

  return authorizedApps;
}

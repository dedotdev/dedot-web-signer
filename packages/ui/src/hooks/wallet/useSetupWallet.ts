import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useToggle } from 'react-use';
import { StandardDedotSignerError } from '@dedot/signer-utils';
import { useWalletSetup } from 'providers/WalletSetupProvider';
import { useWalletState } from 'providers/WalletStateProvider';
import { appActions } from 'redux/slices/app';

interface SetupWalletOptions {
  secretPhrase?: string;
  password?: string;
}

export default function useSetupWallet({ secretPhrase, password }: SetupWalletOptions) {
  const { t } = useTranslation();
  const { keyring } = useWalletState();
  const dispatch = useDispatch();
  const [loading, setLoading] = useToggle(false);
  const { onWalletSetup } = useWalletSetup();

  const setup = () => {
    if (!secretPhrase || !password) {
      throw new StandardDedotSignerError('Secret recovery phrase or password are missing');
    }

    setLoading(true);

    setTimeout(async () => {
      await keyring.initialize(secretPhrase!, password);
      await keyring.createNewAccount(t<string>('My first account'), password);

      dispatch(appActions.seedReady());
      dispatch(appActions.unlock());

      onWalletSetup();
    }, 500); // intentionally!
  };

  return {
    setup,
    loading,
  };
}

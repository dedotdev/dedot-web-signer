import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { WalletBackup } from '@dedot/signer-keyring/types';
import TransferWalletBackup from 'components/pages/SetupWallet/RestoreWallet/TransferWalletBackup';
import JsonFileReader from 'components/shared/import/JsonFileReader';
import { useWalletState } from 'providers/WalletStateProvider';
import { setupWalletActions } from 'redux/slices/setup-wallet';
import { WalletBackupSchema } from 'validations/WalletBackup';

export default function ImportJsonFile(): JSX.Element {
  const { t } = useTranslation();
  const [backup, setBackup] = useState<WalletBackup>();
  const dispatch = useDispatch();
  const { keyring } = useWalletState();

  const importBackup = async (password: string) => {
    if (!backup) return;
    await keyring.importBackup(backup, password);
  };

  const onReadFileComplete = async (data: string) => {
    try {
      const parsedBackup = JSON.parse(data) as WalletBackup;
      await WalletBackupSchema.validate(parsedBackup);

      setBackup(parsedBackup);
    } catch (e: any) {
      toast.dismiss();
      toast.error(t<string>('Unknown/Invalid {{object}}', { object: t<string>('JSON File') }));
    }
  };

  const goBack = () => {
    dispatch(setupWalletActions.clearRestoreWalletMethod());
  };

  const resetBackup = () => {
    setBackup(undefined);
  };

  return backup ? (
    <TransferWalletBackup importBackup={importBackup} resetBackup={resetBackup} />
  ) : (
    <JsonFileReader onResult={onReadFileComplete} goBack={goBack} showTitle />
  );
}

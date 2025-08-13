import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { AccountBackup } from '@dedot/signer-keyring/types';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Dialog, DialogContent, Tab } from '@mui/material';
import DialogTitle from 'components/shared/DialogTitle';
import JsonFile from 'components/shared/export/JsonFile';
import QrCode from 'components/shared/export/QrCode';
import VerifyingPasswordForm from 'components/shared/forms/VerifyingPasswordForm';
import useDialog from 'hooks/useDialog';
import useRegisterEvent from 'hooks/useRegisterEvent';
import { useWalletState } from 'providers/WalletStateProvider';
import { AccountInfoExt, TransferableObject } from 'types';
import { EventName } from 'utils/eventemitter';

enum ExportAccountMethod {
  QRCode = 'QR Code',
  JSON = 'JSON',
}

export default function ExportAccountDialog(): JSX.Element {
  const { t } = useTranslation();
  const { keyring } = useWalletState();
  const { open, doOpen, doClose } = useDialog();
  const [account, setAccount] = useState<AccountInfoExt>();
  const [backup, setBackup] = useState<AccountBackup>();
  const [method, setMethod] = useState<ExportAccountMethod>(ExportAccountMethod.QRCode);

  const onOpen = (account: AccountInfoExt) => {
    setAccount(account);
    doOpen();
  };

  useRegisterEvent(EventName.OpenExportAccountDialog, onOpen);

  const switchMethod = (_: any, method: ExportAccountMethod) => {
    setMethod(method);
  };

  const onClose = () => {
    doClose(() => {
      setAccount(undefined);
      setBackup(undefined);
      setMethod(ExportAccountMethod.QRCode);
    });
  };

  const onPasswordVerified = async (password: string) => {
    try {
      const backup = await keyring.exportAccount(account!.address, password);
      setBackup(backup);
    } catch (e: any) {
      toast.error(t<string>(e.message));
    }
  };

  if (!account) return <></>;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle onClose={onClose}>{`${t<string>('Export account')}: ${account.name ?? ''}`}</DialogTitle>
      <DialogContent>
        {backup ? (
          <TabContext value={method}>
            <TabList onChange={switchMethod} variant='fullWidth'>
              <Tab label={t<string>(ExportAccountMethod.QRCode)} value={ExportAccountMethod.QRCode} />
              <Tab label={t<string>(ExportAccountMethod.JSON)} value={ExportAccountMethod.JSON} />
            </TabList>
            <TabPanel value={ExportAccountMethod.QRCode} className='p-0'>
              <QrCode value={backup} object={TransferableObject.Account} />
            </TabPanel>
            <TabPanel value={ExportAccountMethod.JSON} className='p-0'>
              <JsonFile value={backup} object={TransferableObject.Account} />
            </TabPanel>
          </TabContext>
        ) : (
          <VerifyingPasswordForm onPasswordVerified={onPasswordVerified} onBack={onClose} backButtonLabel='Cancel' />
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { u8aToString } from '@polkadot/util';
import { base64Decode, isBase64 } from '@polkadot/util-crypto';
import { AccountBackup } from '@dedot/signer-keyring/types';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Dialog, DialogContent, Tab } from '@mui/material';
import DialogTitle from 'components/shared/DialogTitle';
import JsonFileReader from 'components/shared/import/JsonFileReader';
import QrCodeReader from 'components/shared/import/QrCodeReader';
import TransferAccountBackup from 'components/shared/menu/ImportAccountDialog/TransferAccountBackup';
import useDialog from 'hooks/useDialog';
import useRegisterEvent from 'hooks/useRegisterEvent';
import { TransferableObject } from 'types';
import { EventName } from 'utils/eventemitter';
import { AccountBackupSchema } from 'validations/AccountBackup';

enum ImportAccountMethod {
  QRCode = 'QR Code',
  JSON = 'JSON File',
}

export default function ImportAccountDialog(): JSX.Element {
  const { open, doOpen, doClose } = useDialog();
  const { t } = useTranslation();
  const [backup, setBackup] = useState<AccountBackup>();
  const [method, setMethod] = useState<ImportAccountMethod>(ImportAccountMethod.QRCode);

  useRegisterEvent(EventName.OpenImportAccountDialog, doOpen);

  const onClose = () => {
    doClose(() => {
      setBackup(undefined);
      setMethod(ImportAccountMethod.QRCode);
    });
  };

  const resetBackup = () => {
    setBackup(undefined);
  };

  const switchMethod = (_: any, method: ImportAccountMethod) => {
    setMethod(method);
  };

  const onReadBackupCompleted = async (data: string) => {
    try {
      const decoded = isBase64(data) ? u8aToString(base64Decode(data)) : data;
      const parsedBackup = JSON.parse(decoded) as AccountBackup;
      await AccountBackupSchema.validate(parsedBackup);

      setBackup(parsedBackup);
    } catch (e: any) {
      toast.dismiss();
      toast.error(t<string>(`Unknown/Invalid {{object}}`, { object: method }));
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose}>
        <DialogTitle onClose={onClose}>{t<string>('Import Account')}</DialogTitle>
        <DialogContent>
          {backup ? (
            <TransferAccountBackup backup={backup} resetBackup={resetBackup} onClose={onClose} />
          ) : (
            <TabContext value={method}>
              <TabList onChange={switchMethod} variant='fullWidth'>
                <Tab label={t<string>(ImportAccountMethod.QRCode)} value={ImportAccountMethod.QRCode} />
                <Tab label={t<string>(ImportAccountMethod.JSON)} value={ImportAccountMethod.JSON} />
              </TabList>
              <TabPanel value={ImportAccountMethod.QRCode} className='p-0 max-w-[450px] mx-auto'>
                <QrCodeReader onResult={onReadBackupCompleted} object={TransferableObject.Account} />
              </TabPanel>
              <TabPanel value={ImportAccountMethod.JSON} className='p-0'>
                <JsonFileReader onResult={onReadBackupCompleted} />
              </TabPanel>
            </TabContext>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

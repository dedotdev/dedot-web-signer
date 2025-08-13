import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { CompactAccountInfo, DerivationPath, WalletBackup, WalletQrBackup } from '@dedot/signer-keyring/types';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Dialog, DialogContent, DialogContentText, Tab } from '@mui/material';
import DialogTitle from 'components/shared/DialogTitle';
import JsonFile from 'components/shared/export/JsonFile';
import QrCode from 'components/shared/export/QrCode';
import VerifyingPasswordForm from 'components/shared/forms/VerifyingPasswordForm';
import useDialog from 'hooks/useDialog';
import useRegisterEvent from 'hooks/useRegisterEvent';
import { useWalletState } from 'providers/WalletStateProvider';
import { TransferableObject } from 'types';
import { EventName } from 'utils/eventemitter';

enum ExportWalletMethod {
  QRCode = 'QR Code',
  JSON = 'JSON',
}

const toWalletQrBackup = (backup: WalletBackup): WalletQrBackup => {
  const { accounts, accountsIndex, encryptedMnemonic } = backup;

  return {
    accountsIndex,
    encryptedMnemonic,
    accounts: accounts
      // Due to the limited capacity of QR Code content,
      // for now, we don't support exporting external accounts
      .filter(({ meta }) => !meta.isExternal as boolean)
      .map(({ meta }) => [meta.derivationPath as DerivationPath, meta.name!] as CompactAccountInfo),
  };
};

export default function ExportWalletDialog(): JSX.Element {
  const { t } = useTranslation();
  const { open, doOpen, doClose } = useDialog();
  const { keyring } = useWalletState();
  const [backup, setBackup] = useState<WalletBackup>();
  const [method, setMethod] = useState<ExportWalletMethod>(ExportWalletMethod.QRCode);

  const switchMethod = (_: any, method: ExportWalletMethod) => {
    setMethod(method);
  };

  const onPasswordVerified = async (password: string) => {
    try {
      const backup = await keyring.exportWallet(password);
      setBackup(backup);
    } catch (e: any) {
      toast.error(t<string>(e.message));
    }
  };

  useRegisterEvent(EventName.OpenExportWalletDialog, doOpen);

  const onClose = () => {
    doClose(() => {
      setBackup(undefined);
      setMethod(ExportWalletMethod.QRCode);
    });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle onClose={onClose}>{t<string>('Export Wallet')}</DialogTitle>
      <DialogContent>
        {backup ? (
          <TabContext value={method}>
            <TabList onChange={switchMethod} variant='fullWidth'>
              <Tab label={t<string>(ExportWalletMethod.QRCode)} value={ExportWalletMethod.QRCode} />
              <Tab label={t<string>(ExportWalletMethod.JSON)} value={ExportWalletMethod.JSON} />
            </TabList>
            <TabPanel value={ExportWalletMethod.QRCode} className='p-0'>
              <QrCode value={toWalletQrBackup(backup)} object={TransferableObject.Wallet} />
            </TabPanel>
            <TabPanel value={ExportWalletMethod.JSON} className='p-0'>
              <JsonFile value={backup} object={TransferableObject.Wallet} />
            </TabPanel>
          </TabContext>
        ) : (
          <>
            <DialogContentText className='mb-2'>
              {t<string>('Transfer your wallet to a different device via QR code or JSON file.')}
            </DialogContentText>
            <VerifyingPasswordForm onBack={onClose} onPasswordVerified={onPasswordVerified} backButtonLabel='Cancel' />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

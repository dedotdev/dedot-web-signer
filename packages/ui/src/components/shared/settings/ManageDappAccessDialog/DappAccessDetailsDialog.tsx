import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppInfo } from '@dedot/signer-base/requests/WalletState';
import { Button, Dialog, DialogContent } from '@mui/material';
import AccountsSelection from 'components/pages/Request/RequestAccess/AccountsSelection';
import DialogTitle from 'components/shared/DialogTitle';
import RemoveDappAccessButton from 'components/shared/settings/ManageDappAccessDialog/RemoveDappAccessButton';
import useDialog from 'hooks/useDialog';
import useRegisterEvent from 'hooks/useRegisterEvent';
import { useWalletState } from 'providers/WalletStateProvider';
import { RootState } from 'redux/store';
import { EventName } from 'utils/eventemitter';

export default function DappAccessDetailsDialog() {
  const { t } = useTranslation();
  const { selectedAccounts } = useSelector((state: RootState) => state.accounts);
  const { walletState } = useWalletState();
  const { open, doOpen, doClose } = useDialog();
  const [appInfo, setAppInfo] = useState<AppInfo>();

  const onClose = () => doClose(() => setAppInfo(undefined));

  const onOpen = (item: AppInfo) => {
    setAppInfo(item);
    doOpen();
  };

  useRegisterEvent(EventName.OpenDappAccessDetailsDialog, onOpen);

  useEffect(() => {
    if (!appInfo || !open) {
      return;
    }

    walletState.saveAuthorizedApp(appInfo);
  }, [appInfo]);

  useEffect(() => {
    if (!appInfo) {
      return;
    }

    const authorizedAccounts = selectedAccounts.map((one) => one.address);

    setAppInfo((prevAppInfo) => ({ ...prevAppInfo, authorizedAccounts } as AppInfo));
  }, [selectedAccounts]);

  if (!appInfo) {
    return <></>;
  }

  const { id, name, url } = appInfo;
  const appId = id || walletState.extractAppId(url);

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle onClose={onClose}>
        <div className='flex gap-4 items-center'>
          <img src={`https://icon.horse/icon/${appId}`} alt={`${name} icon`} height='24' />
          <div className='flex flex-col'>
            <span>{name}</span>
            <span className='text-sm text-gray-500 dark:text-gray-300'>{url}</span>
          </div>
        </div>
      </DialogTitle>
      <DialogContent>
        <p className='mb-2'>{t<string>('Select accounts to connect to this dapp')}</p>
        <AccountsSelection showBothSelectionButtons />
        <div className='mt-4 flex gap-4 justify-between'>
          <Button size='small' variant='text' onClick={onClose}>
            {t<string>('Close')}
          </Button>
          <RemoveDappAccessButton appInfo={appInfo} onRemoved={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

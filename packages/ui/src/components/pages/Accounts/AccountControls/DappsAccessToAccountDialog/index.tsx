import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppInfo } from '@dedot/signer-base/requests/WalletState';
import { Button, Dialog, DialogContent } from '@mui/material';
import DappAccessToAccountItem from 'components/pages/Accounts/AccountControls/DappsAccessToAccountDialog/DappAccessToAccountItem';
import RemoveAllDappsAccessToAccountButton from 'components/pages/Accounts/AccountControls/DappsAccessToAccountDialog/RemoveAllDappsAccessToAccountButton';
import DialogTitle from 'components/shared/DialogTitle';
import useDialog from 'hooks/useDialog';
import useRegisterEvent from 'hooks/useRegisterEvent';
import { useWalletState } from 'providers/WalletStateProvider';
import { AccountInfoExt } from 'types';
import { EventName } from 'utils/eventemitter';

export default function DappsAccessToAccountDialog() {
  const { t } = useTranslation();
  const { walletState } = useWalletState();
  const { open, doOpen, doClose } = useDialog();
  const [account, setAccount] = useState<AccountInfoExt>();
  const [authorizedApps, setAuthorizedApps] = useState<AppInfo[]>([]);

  const onClose = () => {
    doClose();
  };

  useEffect(() => {
    if (!account) {
      return;
    }

    const subscription = walletState.authorizedAppsSubject.subscribe(() => {
      setAuthorizedApps(walletState.getAuthorizedAppsToAccount(account.address));
    });

    return () => subscription.unsubscribe();
  }, [account]);

  const onOpen = (account: AccountInfoExt) => {
    setAccount(account);
    doOpen();
  };

  useRegisterEvent(EventName.OpenDappsAccessToAccountDialog, onOpen);

  if (!account) {
    return <></>;
  }

  const { name } = account;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle onClose={onClose}>{`${t<string>('Dapps Access To')}: ${name}`}</DialogTitle>
      <DialogContent>
        <div className='flex-col flex gap-2 max-h-[350px] overflow-y-auto'>
          {authorizedApps.length === 0 && (
            <div className='text-center my-4 text-gray-500 dark:text-gray-300'>
              {t<string>('No dapps have access to this account')}
            </div>
          )}

          {authorizedApps.map((one) => (
            <DappAccessToAccountItem key={one.id} appInfo={one} account={account} />
          ))}
        </div>

        <div className='mt-2 flex justify-between w-full'>
          <Button size='small' variant='text' onClick={onClose}>
            {t<string>('Close')}
          </Button>
          <RemoveAllDappsAccessToAccountButton account={account} disabled={authorizedApps.length === 0} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

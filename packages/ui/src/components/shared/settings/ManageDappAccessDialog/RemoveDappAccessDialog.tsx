import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useEffectOnce } from 'react-use';
import { AppInfo } from '@dedot/signer-base/requests/WalletState';
import { Button, Dialog, DialogContent, DialogContentText } from '@mui/material';
import DialogTitle from 'components/shared/DialogTitle';
import useDialog from 'hooks/useDialog';
import { useWalletState } from 'providers/WalletStateProvider';
import { EventName, EventRegistry } from 'utils/eventemitter';

interface DappAccessRemovalOptions {
  appInfo: AppInfo;
  onRemoved?: () => void;
}

export default function RemoveDappAccessDialog() {
  const { t } = useTranslation();
  const { walletState } = useWalletState();
  const { open, doClose, doOpen } = useDialog();
  const [options, setOptions] = useState<DappAccessRemovalOptions>();

  const onOpen = (options: DappAccessRemovalOptions) => {
    setOptions(options);
    doOpen();
  };

  useEffectOnce(() => {
    EventRegistry.on(EventName.OpenRemoveDappAccessDialog, onOpen);

    return () => {
      EventRegistry.off(EventName.OpenRemoveDappAccessDialog, onOpen);
    };
  });

  if (!options) {
    return <></>;
  }

  const { appInfo, onRemoved } = options;
  const { id, name, url } = appInfo;

  const removeAccess = () => {
    if (!appInfo) {
      return;
    }

    walletState.removeAuthorizedApp(id);
    toast.dismiss();
    toast.success(
      t<string>('Dapp access from {{name}} ({{url}}) removed', { name, url, interpolation: { escapeValue: false } }),
    );

    onClose();

    onRemoved && onRemoved();
  };

  const onClose = () => {
    doClose(() => {
      setOptions(undefined);
    });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle onClose={onClose}>
        {t<string>('Remove Dapp Access')}: {name}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          <Trans values={{ dappName: name, dappURL: url }} shouldUnescape>
            {'Are you sure to remove access from {{dappName}} at {{dappURL}}?'}
          </Trans>
        </DialogContentText>
        <div className='flex gap-4 mt-8'>
          <Button onClick={onClose} variant='text'>
            {t<string>('Cancel')}
          </Button>
          <Button onClick={removeAccess} color='error' fullWidth>
            {t<string>('Remove Access')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

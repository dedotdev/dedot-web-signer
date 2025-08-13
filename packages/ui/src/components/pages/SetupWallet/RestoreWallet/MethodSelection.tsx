import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { QrCode } from '@mui/icons-material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import KeyIcon from '@mui/icons-material/Key';
import { Button, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { useWalletSetup } from 'providers/WalletSetupProvider';
import { setupWalletActions } from 'redux/slices/setup-wallet';
import { RestoreWalletMethod } from 'types';

const MethodInfo = [
  {
    method: RestoreWalletMethod.SecretRecoveryPhrase,
    icon: <KeyIcon />,
    primary: 'Secret Recovery Phrase',
    secondary: 'Enter your existing secret recovery phrase',
  },
  {
    method: RestoreWalletMethod.QrCode,
    icon: <QrCode />,
    primary: 'QR Code',
    secondary: 'Scan QR Code from Dedot Signer on a different device',
  },
  {
    method: RestoreWalletMethod.JsonFile,
    icon: <InsertDriveFileIcon />,
    primary: 'JSON File',
    secondary: 'Import JSON backup file exported from Dedot Signer',
  },
];

export default function MethodSelection(): JSX.Element {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { onCancelSetup } = useWalletSetup();

  const doSelectMethod = (method: RestoreWalletMethod) => {
    return () => dispatch(setupWalletActions.setRestoreWalletMethod(method));
  };

  return (
    <>
      <h3>Choose a method to restore your wallet</h3>
      <List className='mt-2'>
        {MethodInfo.map(({ method, icon, primary, secondary }) => (
          <ListItemButton key={method} onClick={doSelectMethod(method)}>
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={t<string>(primary)} secondary={t<string>(secondary)} />
          </ListItemButton>
        ))}
      </List>
      <div className='mt-4'>
        <Button onClick={onCancelSetup} color='gray' variant='text'>
          {t<string>('Back')}
        </Button>
      </div>
    </>
  );
}

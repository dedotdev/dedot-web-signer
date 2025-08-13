import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useToggle } from 'react-use';
import { AccountBackup } from '@dedot/signer-keyring/types';
import { Alert, Button, DialogContentText, TextField } from '@mui/material';
import AccountCard from 'components/pages/Accounts/AccountCard';
import VerifyingPasswordForm from 'components/shared/forms/VerifyingPasswordForm';
import useAccountBackupValidation from 'components/shared/menu/ImportAccountDialog/useAccountBackupValidation';
import EmptySpace from 'components/shared/misc/EmptySpace';
import useHighlightNewAccount from 'hooks/accounts/useHighlightNewAccount';
import useAccountNameValidation from 'hooks/useAccountNameValidation';
import { useWalletState } from 'providers/WalletStateProvider';
import { AccountInfoExt, Props } from 'types';

interface TransferAccountBackupProps extends Props {
  backup: AccountBackup;
  onClose: () => void;
  resetBackup: () => void;
}

function TransferAccountBackup({ backup, resetBackup, onClose }: TransferAccountBackupProps): JSX.Element {
  const { keyring } = useWalletState();
  const { t } = useTranslation();
  const [newName, setNewName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [accountBackupPasswordVerified, setAccountBackupPasswordVerified] = useToggle(false);
  const { validation } = useAccountNameValidation(newName);
  const { setNewAccount } = useHighlightNewAccount();
  const { validation: backupValidation, resolvable } = useAccountBackupValidation(backup);

  const originalAccountBackupName = backup.meta.name as string;
  const accountInfo = useMemo(
    (): AccountInfoExt => ({
      name: newName || originalAccountBackupName,
      address: backup.address,
      networkAddress: backup.address,
      isExternal: keyring.isExternalAccount(backup.meta.originalHash as string),
    }),
    [backup, newName],
  );

  if (backupValidation && !resolvable)
    return (
      <div>
        <AccountCard account={accountInfo} />
        <Alert severity='error' className='mt-4'>
          {backupValidation}
        </Alert>
        <Button onClick={resetBackup} className='mt-4' fullWidth variant='outlined'>
          {t<string>('Back')}
        </Button>
      </div>
    );

  const doVerifyAccountBackupPassword = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await keyring.verifyAccountBackupPassword(backup, password);
      setAccountBackupPasswordVerified(true);
    } catch (e: any) {
      toast.error(t<string>(e.message));
    }
  };

  const doImportAccount = async (walletPassword: string) => {
    try {
      // To avoid changing the content of original backup
      const cloneBackup: AccountBackup = { ...backup, meta: { ...backup.meta } };
      cloneBackup.meta.name = newName || originalAccountBackupName;

      const account = await keyring.importAccount(cloneBackup, password, walletPassword);
      onClose();
      setNewAccount(account);
      toast.success(t<string>('Account imported successfully'));
    } catch (e: any) {
      toast.error(t<string>(e.message));
    }
  };

  return accountBackupPasswordVerified ? (
    <>
      <AccountCard account={accountInfo} className='mb-4' />
      <VerifyingPasswordForm
        onPasswordVerified={doImportAccount}
        onBack={() => setAccountBackupPasswordVerified(false)}
        continueButtonLabel='Import Account'
        passwordLabel='Finally, enter your wallet password to complete importing the account'
      />
    </>
  ) : (
    <div>
      <AccountCard account={accountInfo} />
      {backupValidation && (
        <Alert severity='warning' className='mt-4'>
          {backupValidation}
        </Alert>
      )}

      <form onSubmit={doVerifyAccountBackupPassword} className='mt-4'>
        {resolvable && (
          <>
            <DialogContentText className='mb-2'>{t<string>('Pick a new account name')}</DialogContentText>
            <TextField
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
              fullWidth
              label={t<string>('New account name')}
              autoFocus
              error={!!validation}
              helperText={validation || <EmptySpace />}
            />
          </>
        )}

        <DialogContentText className='mb-2'>
          {t<string>('Enter wallet password of this backup to continue')}
        </DialogContentText>
        <TextField
          type='password'
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          fullWidth
          label={t<string>('Backup wallet password')}
          autoFocus
        />
        <div className='mt-6 flex gap-2'>
          <Button onClick={resetBackup} variant='text'>
            {t<string>('Back')}
          </Button>
          <Button type='submit' disabled={!password || !!validation || (!!backupValidation && !newName)} fullWidth>
            {t<string>('Continue')}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default TransferAccountBackup;

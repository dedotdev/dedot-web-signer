import { FC, FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useUpdateEffect } from 'react-use';
import { AccountInfo } from '@dedot/signer-keyring/types';
import { Add } from '@mui/icons-material';
import { Box, Button, Dialog, DialogContent, DialogContentText, IconButton, TextField } from '@mui/material';
import DialogTitle from 'components/shared/DialogTitle';
import EmptySpace from 'components/shared/misc/EmptySpace';
import useAccountNameValidation from 'hooks/useAccountNameValidation';
import useDialog from 'hooks/useDialog';
import { useWalletState } from 'providers/WalletStateProvider';
import { Props } from 'types';

interface NewAccountButtonProps extends Props {
  onCreated?: (account: AccountInfo) => void;
}

const NewAccountButton: FC<NewAccountButtonProps> = ({ onCreated }) => {
  const { keyring } = useWalletState();
  const { open, doOpen, doClose } = useDialog();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const { t } = useTranslation();
  const { validation } = useAccountNameValidation(name);

  useUpdateEffect(() => {
    if (open) {
      const accountsIndex = keyring.getAccountsIndex();
      setName(`Account ${(accountsIndex + 1).toString().padStart(2, '0')}`);
    }
  }, [open]);

  const handleClose = () => {
    resetForm();
    doClose();
  };

  const doCreateNewAccount = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const newAccount = await keyring.createNewAccount(name, password);
      resetForm();

      onCreated && onCreated(newAccount);
      doClose();
    } catch (e: any) {
      toast.error(t<string>(e.message));
    }
  };

  const resetForm = () => {
    setName('');
    setPassword('');
  };

  return (
    <>
      <Button
        className='max-xs:hidden new-account-btn'
        size='small'
        variant='outlined'
        startIcon={<Add />}
        onClick={doOpen}>
        {t<string>('New Account')}
      </Button>
      <IconButton color='primary' className='xs:hidden' onClick={doOpen}>
        <Add />
      </IconButton>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle onClose={handleClose}>{t<string>('Create new account')}</DialogTitle>
        <DialogContent>
          <DialogContentText className='mb-4'>
            {t<string>('Choose a name and enter your password to create a new account')}
          </DialogContentText>
          <Box className='flex flex-col gap-2' component='form' autoComplete='off' onSubmit={doCreateNewAccount}>
            <TextField
              label={t<string>('New account name')}
              type='text'
              required
              fullWidth
              onChange={(e) => setName(e.target.value)}
              value={name}
              error={!!validation}
              helperText={validation || <EmptySpace />}
            />
            <TextField
              autoFocus
              label={t<string>('Wallet password')}
              type='password'
              fullWidth
              required
              onChange={(e) => setPassword(e.target.value)}
              value={password}
            />
            <div className='flex gap-4 mt-4'>
              <Button variant='text' onClick={handleClose}>
                {t<string>('Cancel')}
              </Button>
              <Button type='submit' fullWidth disabled={!name || !password || !!validation}>
                {t<string>('Create')}
              </Button>
            </div>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewAccountButton;

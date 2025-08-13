import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { useBoolean } from 'react-use';
import { Box, Button, Dialog, DialogContent, DialogContentText, TextField } from '@mui/material';
import DialogTitle from 'components/shared/DialogTitle';
import useDialog from 'hooks/useDialog';
import { useWalletState } from 'providers/WalletStateProvider';
import { appActions } from 'redux/slices/app';

const CONFIRMATION_WORDS = 'Reset wallet';

export default function ForgotPasswordButton() {
  const { t } = useTranslation();
  const { open, doOpen, doClose } = useDialog();
  const [confirmation, setConfirmation] = useState<string>('');
  const [loading, setLoading] = useBoolean(false);
  const { keyring, walletState } = useWalletState();
  const dispatch = useDispatch();

  const handleClose = () => doClose();

  const doResetWallet = async () => {
    if (confirmation !== CONFIRMATION_WORDS) {
      return;
    }

    try {
      setLoading(true);
      setTimeout(async () => {
        await keyring.reset();
        walletState.reset();
        dispatch(appActions.seedReady(false));
      }, 200);
    } catch (e: any) {
      setLoading(false);
      toast.error(t<string>(e.message));
    }
  };

  return (
    <>
      <Button variant='text' color='gray' onClick={doOpen}>
        {t<string>('Forgot your password?')}
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle onClose={handleClose} disabled={loading}>
          {t<string>('Forgot your password?')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText className='mb-4'>
            {t<string>(
              'Dedot Signer cannot recover wallet password for you. If you have trouble unlocking your wallet, you will need to reset the wallet. Make sure you have your secret recovery phrase before proceed further.',
            )}
          </DialogContentText>
          <DialogContentText className='mb-4'>
            {t<string>(`Type "{{confirmationWords}}" to continue`, { confirmationWords: CONFIRMATION_WORDS })}
          </DialogContentText>
          <Box className='flex flex-col gap-2' component='form' autoComplete='off' onSubmit={doResetWallet}>
            <TextField
              label={CONFIRMATION_WORDS}
              type='text'
              fullWidth
              onChange={(e) => setConfirmation(e.target.value)}
              value={confirmation}
            />
            <div className='flex gap-4 mt-4'>
              <Button variant='text' onClick={handleClose} disabled={loading}>
                {t<string>('Cancel')}
              </Button>
              <Button type='submit' fullWidth disabled={confirmation !== CONFIRMATION_WORDS || loading}>
                {t<string>('Reset Wallet')}
              </Button>
            </div>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}

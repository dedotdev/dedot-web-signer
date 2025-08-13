import React, { FC } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { RequestAppRequestAccess } from '@dedot/signer-base/types';
import { Button } from '@mui/material';
import AccountsSelection from 'components/pages/Request/RequestAccess/AccountsSelection';
import SetupWalletButton from 'components/pages/Request/RequestAccess/SetupWalletButton';
import useSetSelectedAccounts from 'components/pages/Request/RequestAccess/useSetSelectedAccounts';
import { RequestProps } from 'components/pages/Request/types';
import { useWalletState } from 'providers/WalletStateProvider';
import { RootState } from 'redux/store';

const RequestAccess: FC<RequestProps> = ({ className = '', message }) => {
  const { walletState } = useWalletState();
  const { t } = useTranslation();
  const {
    app: { seedReady },
    accounts: { selectedAccounts },
  } = useSelector((state: RootState) => state);

  const { origin, request } = message;

  useSetSelectedAccounts(origin);

  const acceptAccess = async () => {
    try {
      await walletState.approveRequestAccess(selectedAccounts.map((one) => one.address));
    } catch (e: any) {
      toast.error(t<string>(e.message));
    }
  };

  const rejectAccess = () => {
    walletState.rejectRequestAccess();
  };

  const requestBody = request.body as RequestAppRequestAccess;

  return (
    <div className={className}>
      <h2 className='text-center'>{t<string>('Wallet Access Request')}</h2>
      <p className='text-center'>
        <Trans values={{ appName: requestBody.appName, origin: origin }} shouldUnescape>
          An application, self-identifying as request app name is requesting access your wallet from origin.
        </Trans>
      </p>

      {seedReady ? (
        <div>
          <h6>{t<string>("Select the accounts you'd like to connect")}</h6>
          <AccountsSelection showNewAccountButton />

          <div>
            <p className='font-semibold mb-2'>{t<string>('Only connect if you trust the application')}</p>
            <div className='flex gap-4'>
              <Button size='large' variant='text' className='xs:w-2/5' color='warning' onClick={rejectAccess}>
                {t<string>('Cancel')}
              </Button>
              <Button size='large' className='w-full xs:w-3/5' onClick={acceptAccess}>
                {t<string>('Connect')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h6 className='text-center mb-4'>{t('Set up your Dedot Signer now to connect')}</h6>
          <div className='flex gap-4'>
            <Button size='large' variant='text' className='xs:w-2/5' color='warning' onClick={rejectAccess}>
              {t<string>('Cancel')}
            </Button>
            <SetupWalletButton className='w-full xs:w-3/5' />
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestAccess;

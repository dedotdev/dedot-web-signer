import React, { FC } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { assert } from '@dedot/signer-utils';
import { Button } from '@mui/material';
import AccountsSelection from 'components/pages/Request/RequestAccess/AccountsSelection';
import useSetSelectedAccounts from 'components/pages/Request/RequestAccess/useSetSelectedAccounts';
import { RequestProps } from 'components/pages/Request/types';
import { useWalletState } from 'providers/WalletStateProvider';
import { RootState } from 'redux/store';

const UpdateAccess: FC<RequestProps> = ({ className = '', message }) => {
  const { walletState } = useWalletState();
  const { t } = useTranslation();
  const {
    app: { seedReady },
    accounts: { selectedAccounts },
  } = useSelector((state: RootState) => state);

  assert(seedReady, 'Wallet has not been initialized!');

  const { origin } = message;

  const appInfo = walletState.getAuthorizedApp(origin);

  useSetSelectedAccounts(origin);

  const doUpdateAccess = async () => {
    try {
      const authorizedAccounts = selectedAccounts.map((one) => one.address);
      await walletState.approveUpdateAccess(authorizedAccounts);
    } catch (e: any) {
      toast.error(t<string>(e.message));
    }
  };

  const rejectAccess = () => {
    walletState.rejectUpdateAccess();
  };

  return (
    <div className={className}>
      <h2 className='text-center'>{t<string>('Wallet Access Update')}</h2>
      <p className='text-center'>
        <Trans values={{ appName: appInfo.name, origin: origin }} shouldUnescape>
          {`An application, self-identifying as request {{appName}} is requesting update access to your wallet from {{origin}}.`}
        </Trans>
      </p>

      <div>
        <h6>{t<string>("Select the accounts you'd like to connect")}</h6>
        <AccountsSelection showNewAccountButton />

        <div>
          <p className='font-semibold mb-2'>{t<string>('Only connect if you trust the application')}</p>
          <div className='flex gap-4'>
            <Button size='large' variant='text' className='xs:w-2/5' color='warning' onClick={rejectAccess}>
              {t<string>('Cancel')}
            </Button>
            <Button size='large' className='w-full xs:w-3/5' onClick={doUpdateAccess}>
              {t<string>('Update Access')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateAccess;

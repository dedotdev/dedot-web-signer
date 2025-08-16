import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import { Props } from 'types';

interface WelcomeProps extends Props {
  onCreateNewWallet?: () => void;
  onRestoreExistingWallet?: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ className = '', onCreateNewWallet, onRestoreExistingWallet }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const doCreateNewWallet = () => {
    onCreateNewWallet ? onCreateNewWallet() : navigate('/new-wallet');
  };

  const doRestoreWallet = () => {
    onRestoreExistingWallet ? onRestoreExistingWallet() : navigate('/restore-wallet');
  };

  return (
    <div className={`${className} mt-8 mb-16 mx-auto text-center`}>
      <div className='welcome'>
        <h1>{t<string>('Welcome to Dedot Signer')}</h1>
        <p className='text-2xl'>
          <Trans>A multi-chain crypto wallet & signer for Polkadot</Trans>
        </p>
      </div>
      <div className='mt-8'>
        <h4 className='mb-4'>{t<string>('Set up your wallet now')}</h4>

        <div className='flex flex-col gap-4 items-center'>
          <Button size='large' className='min-w-[270px]' onClick={doCreateNewWallet}>
            {t<string>('Create New Wallet')}
          </Button>
          <Button size='large' className='min-w-[270px]' variant='outlined' onClick={doRestoreWallet}>
            {t<string>('Restore Existing Wallet')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;

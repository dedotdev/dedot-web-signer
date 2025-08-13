import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppInfo } from '@dedot/signer-base/requests/WalletState';
import { Delete } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import clsx from 'clsx';
import { useWalletState } from 'providers/WalletStateProvider';
import { AccountInfoExt } from 'types';
import { appFaviconUrl } from 'utils/misc';

interface DappAccessToAccountItemProps {
  appInfo: AppInfo;
  account: AccountInfoExt;
}

export default function DappAccessToAccountItem({ appInfo, account }: DappAccessToAccountItemProps) {
  const { t } = useTranslation();
  const { walletState } = useWalletState();
  const { id, url, name } = appInfo;

  const appId = id || walletState.extractAppId(url);

  const removeDappAccess = () => {
    walletState.removeAppAccessToAccount(id, account.address);
  };

  return (
    <div
      className={clsx([
        'border border-black/10 dark:border-white/15 p-2 pl-4 rounded flex items-center gap-2 sm:gap-4',
        'bg-zinc-50 dark:bg-black/15',
      ])}
      data-testid='DappAccessItem'>
      <div className='flex-grow'>
        <div className='flex items-center gap-2 sm:gap-4'>
          <img src={appFaviconUrl(appId)} alt={`${name} icon`} width='18' />
          <div className='flex flex-col'>
            <div className='font-semibold'>{name}</div>
            <div className='text-gray-500 dark:text-gray-300 text-sm'>{appId}</div>
          </div>
        </div>
      </div>
      <div className='flex items-center gap-2 xs:gap-4'>
        <IconButton size='small' onClick={removeDappAccess} title={t<string>('Remove Access')}>
          <Delete fontSize='small' />
        </IconButton>
      </div>
    </div>
  );
}

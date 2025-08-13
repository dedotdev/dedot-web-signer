import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { AppInfo } from '@dedot/signer-base/requests/WalletState';
import clsx from 'clsx';
import RemoveDappAccessButton from 'components/shared/settings/ManageDappAccessDialog/RemoveDappAccessButton';
import useAccounts from 'hooks/accounts/useAccounts';
import { useWalletState } from 'providers/WalletStateProvider';
import { accountsActions } from 'redux/slices/accounts';
import { EventName, triggerEvent } from 'utils/eventemitter';
import { appFaviconUrl } from 'utils/misc';

interface DappAccessItemProps {
  appInfo: AppInfo;
}

export default function DappAccessItem({ appInfo }: DappAccessItemProps): JSX.Element {
  const { t } = useTranslation();
  const accounts = useAccounts();
  const dispatch = useDispatch();
  const { walletState } = useWalletState();
  const { id, name, url, authorizedAccounts } = appInfo;
  const appId = id || walletState.extractAppId(url);

  const onClick = () => {
    const connectedAccounts = accounts.filter((one) => appInfo.authorizedAccounts.includes(one.address));
    dispatch(accountsActions.setSelectedAccounts(connectedAccounts));

    triggerEvent(EventName.OpenDappAccessDetailsDialog, appInfo);
  };

  return (
    <div
      className={clsx([
        'border border-black/10 dark:border-white/15 p-2 pl-4 rounded flex items-center gap-2 sm:gap-4',
        'bg-zinc-50 dark:bg-black/15 cursor-pointer hover:bg-primary/10 dark:hover:bg-white/10',
      ])}
      onClick={onClick}
      role='button'
      title='View Dapp Details'
      aria-label={t<string>('View Dapp Details')}>
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
        <div className='text-primary font-semibold text-2xl'>{authorizedAccounts.length}</div>
        <RemoveDappAccessButton appInfo={appInfo} buttonIconStyle />
      </div>
    </div>
  );
}

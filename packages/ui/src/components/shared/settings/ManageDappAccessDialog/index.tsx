import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { AppInfo } from '@dedot/signer-base/requests/WalletState';
import { Breadcrumbs, Button, DialogContent, Link, Typography } from '@mui/material';
import DialogTitle from 'components/shared/DialogTitle';
import SearchBox from 'components/shared/accounts/SearchBox';
import DappAccessItem from 'components/shared/settings/ManageDappAccessDialog/DappAccessItem';
import RemoveAllAccessButton from 'components/shared/settings/ManageDappAccessDialog/RemoveAllAccessButton';
import useAuthorizedApps from 'hooks/wallet/useAuthorizedApps';
import { settingsDialogActions } from 'redux/slices/settings-dialog';

interface ManageDappAccessProps {
  onClose: () => void;
}

const filterAppInfo = (appInfo: AppInfo, query: string): boolean => {
  const { name, url } = appInfo;

  const matchName = !!name && name.toLowerCase().includes(query.toLowerCase());
  const matchUrl = !!url && url.toLowerCase().includes(query.toLowerCase());

  return matchName || matchUrl;
};

export default function ManageDappAccessDialog({ onClose }: ManageDappAccessProps): JSX.Element {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const authorizedApps = useAuthorizedApps();
  const [displayApps, setDisplayApps] = useState<AppInfo[]>([]);
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    if (query) {
      setDisplayApps(authorizedApps.filter((one) => filterAppInfo(one, query)));
    } else {
      setDisplayApps(authorizedApps);
    }
  }, [query, authorizedApps]);

  const goBack = () => {
    dispatch(settingsDialogActions.resetState());
  };

  return (
    <>
      <DialogTitle onClose={onClose}>
        <Breadcrumbs>
          <Link
            className='cursor-pointer'
            underline='hover'
            color='inherit'
            variant='h6'
            onClick={() => dispatch(settingsDialogActions.resetState())}>
            {t<string>('Settings')}
          </Link>
          <Typography color='text.primary' variant='h6'>
            {t<string>('Manage Dapps Access')}
          </Typography>
        </Breadcrumbs>
      </DialogTitle>
      <DialogContent>
        {authorizedApps.length > 0 && (
          <div className='mb-2'>
            <SearchBox className='w-full sm:w-auto' label='Search by name or URL' onChange={setQuery} size='xxs' />
          </div>
        )}
        <div className='flex-col flex gap-2 max-h-[350px] overflow-y-auto'>
          {authorizedApps.length === 0 && (
            <div className='text-center my-4 text-gray-500 dark:text-gray-300'>
              {t<string>('You have not authorized any dapp/website')}
            </div>
          )}
          {!!query && displayApps.length === 0 && authorizedApps.length > 0 && (
            <div className='text-center my-4 text-gray-500 dark:text-gray-300'>
              {t<string>('No dapps meet search query:')} <strong>{query}</strong>
            </div>
          )}
          {displayApps.map((appInfo) => (
            <DappAccessItem key={appInfo.id} appInfo={appInfo} />
          ))}
        </div>

        <div className='mt-2 flex justify-between'>
          <Button size='small' variant='text' onClick={goBack}>
            {t<string>('Back')}
          </Button>
          <RemoveAllAccessButton />
        </div>
      </DialogContent>
    </>
  );
}

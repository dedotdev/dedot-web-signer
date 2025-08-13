import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { networks } from '@dedot/signer-base';
import { NetworkInfo } from '@dedot/signer-base/types';
import { Autocomplete, TextField } from '@mui/material';
import { appActions } from 'redux/slices/app';
import { RootState } from 'redux/store';
import { Props } from 'types';

interface NetworksSelectionProps extends Props {
  onNetworkChange?: (addressPrefix: number) => void;
}

const NetworksSelection: FC<NetworksSelectionProps> = ({ className, onNetworkChange }) => {
  const dispatch = useDispatch();
  const { addressPrefix } = useSelector((state: RootState) => state.app);
  const [network, setNetwork] = useState<NetworkInfo>(networks.find((one) => one.prefix === addressPrefix)!);
  const { t } = useTranslation();

  useEffect(() => {
    if (onNetworkChange) {
      onNetworkChange(network.prefix);
    } else {
      dispatch(appActions.updateAddressPrefix(network.prefix));
    }
  }, [network]);

  return (
    <Autocomplete
      className={className}
      disableClearable
      value={network}
      onChange={(event, newNetwork) => {
        newNetwork && setNetwork(newNetwork);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          size='small'
          label={t<string>('Address format')}
          inputProps={{
            ...params.inputProps,
            autoComplete: 'off',
            className: `${params.inputProps.className} w-full sm:w-[180px]`,
          }}
        />
      )}
      getOptionLabel={(option) => option.displayName}
      options={networks}
      blurOnSelect
    />
  );
};

export default NetworksSelection;

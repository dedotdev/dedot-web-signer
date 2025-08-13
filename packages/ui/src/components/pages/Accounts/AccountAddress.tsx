import { FC, useState } from 'react';
import { useUpdateEffect } from 'react-use';
import { shortenAddress } from '@dedot/signer-utils';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { styled, Theme, useMediaQuery } from '@mui/material';
import CopyAddressTooltip from 'components/shared/CopyAddressTooltip';
import { Props } from 'types';

interface AccountAddressProps extends Props {
  address: string;
  name?: string;
}

const AccountAddress: FC<AccountAddressProps> = ({ className, address, name }) => {
  const showShortAddress = useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'));
  const getDisplayAddress = () => {
    return showShortAddress ? shortenAddress(address) : address;
  };

  const [displayAddress, setDisplayAddress] = useState(getDisplayAddress());

  useUpdateEffect(() => {
    setDisplayAddress(getDisplayAddress());
  }, [showShortAddress, address]);

  return (
    <CopyAddressTooltip className='flex gap-1 items-center' address={address} name={name}>
      <div className={`${className} font-mono`}>{displayAddress || <span>&nbsp;</span>}</div>
      <ContentCopyIcon className='text-sm' />
    </CopyAddressTooltip>
  );
};

export default styled(AccountAddress)`
  font-size: 0.8rem;
  cursor: copy;
`;

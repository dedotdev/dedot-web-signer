import { Identicon } from '@polkadot/react-identicon';
import { FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { shortenAddress } from '@dedot/signer-utils';
import { Check } from '@mui/icons-material';
import { alpha, styled } from '@mui/material';
import CopyAddressTooltip from 'components/shared/CopyAddressTooltip';
import { accountsActions } from 'redux/slices/accounts';
import { RootState } from 'redux/store';
import { AccountInfoExt, Props } from 'types';

interface SelectableAccountCardProps extends Props {
  account: AccountInfoExt;
}

const SelectableAccountCard: FC<SelectableAccountCardProps> = ({ className = '', account }) => {
  const { selectedAccounts } = useSelector((state: RootState) => state.accounts);
  const dispatch = useDispatch();

  const { networkAddress, name } = account;

  const selected = selectedAccounts.map((one) => one.address).includes(account.address);
  const doSelect = () => {
    if (selected) {
      dispatch(accountsActions.removeSelectedAccounts([account]));
    } else {
      dispatch(accountsActions.addSelectedAccounts([account]));
    }
  };

  return (
    <div
      id={networkAddress}
      className={`${className} selectable-account-card ${selected ? 'selected' : ''} dark:border-white/15`}
      onClick={doSelect}
      role='button'>
      <div className='selectable-account-card__left'>
        <div className='selectable-account-card__icon'>
          <CopyAddressTooltip address={networkAddress} name={name}>
            <Identicon value={networkAddress} size={24} theme='polkadot' />
          </CopyAddressTooltip>
        </div>
        <div className='selectable-account-card__info'>
          <div className='selectable-account-card__name'>{name}</div>
          <div className='selectable-account-card__address'>({shortenAddress(networkAddress)})</div>
        </div>
      </div>
      <div className='selectable-account-card__right'>{selected && <Check />}</div>
    </div>
  );
};

export default styled(SelectableAccountCard)(
  ({ theme }) => `
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  cursor: pointer;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    background-color: ${alpha(theme.palette.success.light, 0.2)};
  }

  &.selected {
    background-color: ${alpha(theme.palette.success.light, 0.6)};
  }

  .selectable-account-card {
    &__left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    &__icon,
    &__right {
      font-size: 0;
    }

    &__info {
      display: flex;
      align-items: center;
      font-size: 1rem !important;
      gap: 0.2rem;
    }

    &__name {
      font-weight: 600;
    }

    &__address {
      font-size: 0.8rem;
    }
  }
`,
);

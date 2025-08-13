import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { encodeAddress } from '@polkadot/util-crypto';
import { AccountInfo } from '@dedot/signer-keyring/types';
import { RootState } from 'redux/store';

export default function useHighlightNewAccount() {
  const { addressPrefix } = useSelector((state: RootState) => state.app);
  const [newAccount, setNewAccount] = useState<AccountInfo>();

  useEffect(() => {
    if (!newAccount) {
      return;
    }

    const displayAddress = encodeAddress(newAccount.address, addressPrefix);
    const accountCard = document.getElementById(displayAddress);
    if (!accountCard) {
      return;
    }

    accountCard.scrollIntoView(true);

    setTimeout(() => {
      accountCard.classList.add('bg-primary/20');
    }, 100);

    setTimeout(() => {
      accountCard.classList.remove('bg-primary/20');
    }, 3000);

    setNewAccount(undefined);
  }, [newAccount]);

  return { setNewAccount };
}

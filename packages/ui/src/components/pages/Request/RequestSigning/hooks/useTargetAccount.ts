import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useAsync } from 'react-use';
import { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import { encodeAddress } from '@polkadot/util-crypto';
import { WalletRequestWithResolver } from '@dedot/signer-base/types';
import useThrowError from 'hooks/useThrowError';
import { useWalletState } from 'providers/WalletStateProvider';
import { RootState } from 'redux/store';
import { AccountInfoExt } from 'types';

export default function useTargetAccount(message: WalletRequestWithResolver) {
  const { keyring } = useWalletState();
  const { addressPrefix } = useSelector((state: RootState) => state.app);
  const [targetAccount, setTargetAccount] = useState<AccountInfoExt>();
  const throwError = useThrowError();
  const { request } = message;

  useAsync(async () => {
    try {
      const payloadJSON = request.body as SignerPayloadJSON | SignerPayloadRaw;
      const account = await keyring.getAccount(payloadJSON.address);
      const networkAddress = encodeAddress(account.address, addressPrefix);

      setTargetAccount({
        ...account,
        networkAddress,
      });
    } catch (e: any) {
      throwError(e);
    }
  }, [message]);

  return targetAccount;
}

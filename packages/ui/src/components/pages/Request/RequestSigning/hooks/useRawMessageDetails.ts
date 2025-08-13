import { useMemo } from 'react';
import { SignerPayloadRaw } from '@polkadot/types/types';
import { isAscii, u8aToString, u8aUnwrapBytes } from '@polkadot/util';
import { WalletRequestWithResolver } from '@dedot/signer-base/types';
import { DetailRowProps, ValueStyle } from 'components/pages/Request/RequestSigning/DetailRow';

export function useRawMessageDetails(message: WalletRequestWithResolver): DetailRowProps[] {
  const { origin, request } = message;
  const payloadJSON = request.body as SignerPayloadRaw;
  const { data } = payloadJSON;

  return useMemo<DetailRowProps[]>(
    () => [
      {
        name: 'from',
        value: origin,
        breakWord: true,
      },
      {
        name: 'bytes',
        value: isAscii(data) ? u8aToString(u8aUnwrapBytes(data)) : data,
        breakWord: true,
        style: ValueStyle.BOX,
      },
    ],
    [message],
  );
}

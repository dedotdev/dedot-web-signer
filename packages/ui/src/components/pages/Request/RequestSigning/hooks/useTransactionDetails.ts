import { useMemo } from 'react';
import { TypeRegistry } from '@polkadot/types';
import { ExtrinsicEra } from '@polkadot/types/interfaces';
import { SignerPayloadJSON } from '@polkadot/types/types';
import { bnToBn, formatNumber, hexToNumber } from '@polkadot/util';
import { WalletRequestWithResolver } from '@dedot/signer-base/types';
import { DetailRowProps } from 'components/pages/Request/RequestSigning/DetailRow';

function mortalityAsString(era: ExtrinsicEra, hexBlockNumber: string): string {
  if (era.isImmortalEra) {
    return 'Immortal';
  }

  const blockNumber = bnToBn(hexBlockNumber);
  const mortal = era.asMortalEra;
  const birth = formatNumber(mortal.birth(blockNumber));
  const death = formatNumber(mortal.death(blockNumber));

  return `Mortal, valid from ${birth} to ${death}`;
}

const registry = new TypeRegistry();

export default function useTransactionDetails(message: WalletRequestWithResolver): DetailRowProps[] {
  const { origin, request } = message;

  const payloadJSON = request.body as SignerPayloadJSON;

  const { genesisHash, specVersion, nonce, method, blockNumber } = payloadJSON;

  registry.setSignedExtensions(payloadJSON.signedExtensions);
  const { era } = registry.createType('ExtrinsicPayload', payloadJSON, { version: payloadJSON.version });

  return useMemo<DetailRowProps[]>(
    () => [
      {
        name: 'from',
        value: origin,
        breakWord: true,
      },
      {
        name: 'genesis',
        value: genesisHash,
        breakWord: true,
      },
      {
        name: 'version',
        value: bnToBn(specVersion).toNumber(),
      },
      {
        name: 'nonce',
        value: hexToNumber(nonce),
      },
      {
        name: 'method data',
        value: method,
        breakWord: true,
      },
      {
        name: 'life time',
        value: mortalityAsString(era, blockNumber),
      },
    ],
    [message],
  );
}

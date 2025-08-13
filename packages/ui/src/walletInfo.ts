import { WalletInfo } from '@dedot/signer-base/types';
import { packageInfo } from 'packageInfo';

const randomWalletInstanceId = (): string => {
  return `dedot/instance-${Math.floor(Math.random() * 1_0000_000)}`;
};

export const walletInfo: WalletInfo = {
  name: 'dedot-signer',
  version: packageInfo.version,
  instanceId: randomWalletInstanceId(),
};

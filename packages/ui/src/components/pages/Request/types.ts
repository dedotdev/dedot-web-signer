import { WalletRequestWithResolver } from '@dedot/signer-base/types';
import { Props } from 'types';

export interface RequestProps extends Props {
  message: WalletRequestWithResolver;
}

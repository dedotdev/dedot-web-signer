import { DedotSignerSdk } from '../DedotSignerSdk';
import { UpdatableInjected } from '../types';
import { Accounts } from './Accounts';
import { DedotSigner } from './DedotSigner';

export default class SubstrateInjected implements UpdatableInjected {
  public readonly accounts: Accounts;
  public readonly signer: DedotSigner;

  constructor(sdk: DedotSignerSdk) {
    sdk.ensureSdkInitialized();

    this.accounts = new Accounts(sdk);
    this.signer = new DedotSigner(sdk);
  }
}

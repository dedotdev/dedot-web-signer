import { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import { DedotSignerError, ErrorCode } from '@dedot/signer-utils';
import { RequestName, WalletRequestMessage, WalletResponse } from '../types';
import Handler from './Handler';

/**
 * @name TabHandler
 * @description Handler for wallet requests from a tab wallet instance
 */
export default class TabHandler extends Handler {
  async handle<TRequestName extends RequestName>(
    message: WalletRequestMessage<TRequestName>,
  ): Promise<WalletResponse<TRequestName>> {
    const { request, origin: fromUrl } = message;
    const { name } = request;

    if (name !== 'tab/requestAccess') {
      this.state.ensureAppAuthorized(fromUrl);
    }

    switch (name) {
      case 'tab/signRaw':
      case 'tab/signExtrinsic': {
        const { address } = request.body as SignerPayloadJSON | SignerPayloadRaw;
        this.state.ensureAccountAuthorized(fromUrl, address);
        // TODO if account is not authorized,
        //      add a view for request access to that particular account
        break;
      }
      case 'tab/requestAccess':
      case 'tab/updateAccess':
        break;
      default:
        throw new DedotSignerError(ErrorCode.UnknownRequest);
    }

    return this.state.newRequestMessage(message);
  }
}

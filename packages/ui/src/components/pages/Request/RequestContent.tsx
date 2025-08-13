import React, { FC } from 'react';
import { DedotSignerError, ErrorCode } from '@dedot/signer-utils';
import { CircularProgress } from '@mui/material';
import RequestAccess from 'components/pages/Request/RequestAccess';
import RequestSignRawMessage from 'components/pages/Request/RequestSigning/RequestSignRawMessage';
import RequestTransactionApproval from 'components/pages/Request/RequestSigning/RequestTransactionApproval';
import UpdateAccess from 'components/pages/Request/UpdateAccess';
import useCurrentRequestMessage from 'hooks/messages/useCurrentRequestMessage';
import { Props } from 'types';

const RequestContent: FC<Props> = () => {
  const [ready, message] = useCurrentRequestMessage();

  if (!ready) {
    return (
      <div className='flex justify-center my-8'>
        <CircularProgress />
      </div>
    );
  }

  const requestName = message?.request?.name;

  if (requestName === 'tab/requestAccess') {
    return <RequestAccess message={message!} />;
  } else if (requestName === 'tab/updateAccess') {
    return <UpdateAccess message={message!} />;
  } else if (requestName === 'tab/signExtrinsic') {
    return <RequestTransactionApproval message={message!} />;
  } else if (requestName === 'tab/signRaw') {
    return <RequestSignRawMessage message={message!} />;
  }

  throw new DedotSignerError(ErrorCode.UnknownRequest);
};

export default RequestContent;

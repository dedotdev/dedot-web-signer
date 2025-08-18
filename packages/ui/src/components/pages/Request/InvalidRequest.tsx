import React, { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@mui/material';
import { isMobileDevice } from '@dedot/signer-utils';
import { Props } from 'types';

const InvalidRequest: FC<Props> = ({ className = '', reason }) => {
  const { t } = useTranslation();
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  useEffect(() => {
    setShowMobileWarning(isMobileDevice());
  }, []);

  return (
    <div className={`${className} text-center`}>
      <h2>{t<string>('Invalid request')}</h2>
      {reason && <p>Reason: {t<string>(reason)}</p>}
      <p>{t<string>("If you open this page by accident, it's safe to close it now.")}</p>
      {showMobileWarning && (
        <Alert severity="info" className="mt-10 text-left max-w-md mx-auto">
          {t<string>('Tips: Dedot Signer might not work correctly in In-App Browsers (e.g: inside Facebook, X, ...) on mobile phone. Please open Dedot Signer or dApps using native browsers (Safari, Chrome, ...) for the best experience.')}
        </Alert>
      )}
    </div>
  );
};

export default InvalidRequest;

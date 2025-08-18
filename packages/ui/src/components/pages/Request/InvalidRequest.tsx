import React, { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button } from '@mui/material';
import { isMobileDevice, getOpenInBrowserUrl } from '@dedot/signer-utils';
import { Props } from 'types';

const InvalidRequest: FC<Props> = ({ className = '', reason }) => {
  const { t } = useTranslation();
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  useEffect(() => {
    setShowMobileWarning(isMobileDevice());
  }, []);

  const handleOpenInBrowser = () => {
    const url = getOpenInBrowserUrl();
    if (url) {
      window.location.href = url;
    }
  };

  return (
    <div className={`${className} text-center`}>
      <h2>{t<string>('Invalid request')}</h2>
      {reason && <p>Reason: {t<string>(reason)}</p>}
      <p>{t<string>("If you open this page by accident, it's safe to close it now.")}</p>
      {showMobileWarning && (
        <Alert 
          severity="info" 
          className="mt-4 text-left max-w-md mx-auto"
        >
          {t<string>('Dedot Signer might not work correctly in In-App Browsers (e.g: inside Facebook, X, ...). Please open Dedot Signer and dApps using native browsers for the best experience.')}

          <Button
            className='mt-4'
            size="small"
            onClick={handleOpenInBrowser}
          >
            {t<string>('Open in Native Browser')}
          </Button>
        </Alert>
      )}
    </div>
  );
};

export default InvalidRequest;

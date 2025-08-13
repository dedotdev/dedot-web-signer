import { useTranslation } from 'react-i18next';
import QrReader from 'react-qr-reader';
import { usePermission } from 'react-use';
import { Alert, AlertTitle, Button } from '@mui/material';
import { Props, TransferableObject } from 'types';
import QrCodeUploadButton from './QrCodeUploadButton';

interface QrCodeReaderProps extends Props {
  onResult: (data: string) => void;
  object: TransferableObject;
  showTitle?: boolean;
  goBack?: () => void;
}

function QrCodeReader({ onResult, object, showTitle, goBack }: QrCodeReaderProps) {
  const { t } = useTranslation();
  const cameraPermission = usePermission({ name: 'camera' });

  return (
    <>
      {showTitle && <h3>{t<string>('Scan QR Code')}</h3>}
      <p className='mt-4'>
        {t<string>(
          'Export your {{object}} on a different device and scan the QR code on the screen to transfer your {{object}}.',
          { object: t<string>(object.toLowerCase()) },
        )}
      </p>
      {cameraPermission === 'denied' ? (
        <Alert className='mt-4' severity='error'>
          <AlertTitle>{t<string>('Camera Permission Denied')}</AlertTitle>
          {t<string>(
            'Dedot Signer needs your permission to access the device camera to scan QR code. Please update the browser settings to allow camera access.',
          )}
        </Alert>
      ) : (
        <QrReader
          showViewFinder
          onScan={(data) => {
            data && onResult(data);
          }}
          onError={() => {}}
          facingMode='environment'
          className='w-full'
        />
      )}
      <div className={`mt-4 flex ${goBack ? 'justify-between' : 'justify-end'}`}>
        {goBack && (
          <Button onClick={goBack} color='gray' variant='text'>
            {t<string>('Back')}
          </Button>
        )}
        <QrCodeUploadButton onResult={onResult} />
      </div>
    </>
  );
}

export default QrCodeReader;

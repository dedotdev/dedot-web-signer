import { QRCodeCanvas } from 'qrcode.react';
import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { base64Encode } from '@polkadot/util-crypto';
import { AccountBackup, QrBackup } from '@dedot/signer-keyring/types';
import { Download } from '@mui/icons-material';
import { Button } from '@mui/material';
import DedotSignerLogo from 'assets/images/dedot-logo.png';
import FileSaver from 'file-saver';
import useQrCodeSize from 'hooks/useQrCodeSize';
import { Props, TransferableObject } from 'types';

interface QrCodeProps extends Props {
  value: QrBackup;
  object: TransferableObject;
}

const DEFAULT_SIZE = 500;

export default function QrCode({ value, object }: QrCodeProps) {
  const { t } = useTranslation();
  const { containerRef, size } = useQrCodeSize();
  const qrCodeWrapperRef = useRef<HTMLDivElement>(null);

  const rawQrValue = useMemo(() => base64Encode(JSON.stringify(value)), [value]);

  const getFileName = () => {
    if (object === TransferableObject.Wallet) {
      return `dedot_signer_wallet_backup_qrcode_${Date.now()}`;
    } else if (object === TransferableObject.Account) {
      const accountName = (((value as AccountBackup)?.meta?.name as string) || '').toLowerCase().replace(/\s/g, '_');
      return `dedot_signer_account_backup_qrcode_${accountName}_${Date.now()}`;
    }
  };

  const generateInfoQRCodeCanvas = (qrCodeCanvas: HTMLCanvasElement) => {
    const canvas = document.createElement('canvas');

    const isAccountTransfer = object === TransferableObject.Account;

    const spaceForInformationToFillIn = isAccountTransfer ? 140 : 80;
    const startOfQrCodeImage = isAccountTransfer ? 100 : 40;

    canvas.width = DEFAULT_SIZE;
    canvas.height = DEFAULT_SIZE + spaceForInformationToFillIn;

    const canvasContext = canvas.getContext('2d')!;

    // Fill background color to white
    canvasContext.fillStyle = 'white';
    canvasContext.fillRect(0, 0, DEFAULT_SIZE, DEFAULT_SIZE + spaceForInformationToFillIn);

    // Draw QR Code on the canvas
    canvasContext.drawImage(qrCodeCanvas, 0, startOfQrCodeImage, DEFAULT_SIZE, DEFAULT_SIZE);

    // Fill in information
    canvasContext.fillStyle = 'black';
    canvasContext.font = '20px monospace';
    canvasContext.textAlign = 'center';

    canvasContext.fillText(t<string>('Scan To Import {{object}}', { object: t<string>(object) }), DEFAULT_SIZE / 2, 40);

    canvasContext.fillText(
      'Dedot Signer - https://signer.dedot.dev',
      DEFAULT_SIZE / 2,
      DEFAULT_SIZE + startOfQrCodeImage + (isAccountTransfer ? 17 : 13),
      DEFAULT_SIZE - 80,
    );

    if (isAccountTransfer) {
      const accountName = ((value as AccountBackup)?.meta?.name as string) || '';

      canvasContext.font = 'bold 32px monospace';
      canvasContext.fillText(accountName, DEFAULT_SIZE / 2, spaceForInformationToFillIn - 50);
    }

    return canvas;
  };

  const downloadQrCode = () => {
    const qrCodeCanvas = qrCodeWrapperRef.current?.querySelector<HTMLCanvasElement>('canvas')!;

    const canvas = generateInfoQRCodeCanvas(qrCodeCanvas);

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error(t<string>('Cannot export QR code image'));
        return;
      }

      FileSaver.saveAs(blob, getFileName());
    }, 'image/png');
  };

  return (
    <div ref={containerRef} className='text-center'>
      <p className='my-4 sm:px-20'>
        {t<string>('Open Dedot Signer on another device and scan this QR Code to transfer your {{object}}', {
          object: t<string>(object.toLowerCase()),
        })}
      </p>
      <div ref={qrCodeWrapperRef}>
        <QRCodeCanvas
          size={DEFAULT_SIZE} // DEFAULT_SIZE for better quality when export to download
          value={rawQrValue}
          includeMargin
          title={t<string>('{{object}} Export QR Code', { object: t<string>(object) })}
          imageSettings={{
            src: DedotSignerLogo,
            height: 64,
            width: 64,
            excavate: true,
          }}
          style={{
            width: size,
            height: size,
          }}
        />
      </div>
      <div className='mt-4'>
        <Button variant='outlined' startIcon={<Download />} onClick={downloadQrCode} size='small'>
          {t<string>('Download QR Code Image')}
        </Button>
      </div>
      <p className='my-4 italic sm:px-20 text-sm'>
        {t<string>(
          'You will be prompted to enter your wallet password to complete the transfer process on the other device.',
        )}
      </p>
    </div>
  );
}

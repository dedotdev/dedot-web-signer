import React from 'react';
import { useTranslation } from 'react-i18next';
import { AccountBackup, JsonBackup } from '@dedot/signer-keyring/types';
import { Download } from '@mui/icons-material';
import { Button } from '@mui/material';
import FileSaver from 'file-saver';
import { TransferableObject, Props } from 'types';

interface JsonFileProps extends Props {
  value: JsonBackup;
  object: TransferableObject;
}

export default function JsonFile({ value, object }: JsonFileProps): JSX.Element {
  const { t } = useTranslation();

  const getFileName = () => {
    if (object === TransferableObject.Wallet) {
      return `dedot_signer_wallet_backup_${Date.now()}.json`;
    } else if (object === TransferableObject.Account) {
      const accountName = (((value as AccountBackup)?.meta?.name as string) || '').toLowerCase().replace(/\s/g, '_');
      return `dedot_signer_account_backup_${accountName}_${Date.now()}.json`;
    }
  };

  const downloadJsonFile = () => {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' });
    FileSaver.saveAs(blob, getFileName());
  };

  return (
    <div className='text-center'>
      <p className='mt-4 sm:px-20'>
        {t<string>(
          `Export this {{object}} to a JSON file and import it back to Dedot Signer on this or other devices later`,
          { object: t<string>(object.toLowerCase()) },
        )}
      </p>
      <Button onClick={downloadJsonFile} startIcon={<Download />}>
        {t<string>('Download JSON File')}
      </Button>
      <p className='mt-4 italic sm:px-20 text-sm'>
        {t<string>(`You will be prompted to enter your wallet password to complete importing the {{object}}`, {
          object: t<string>(object.toLowerCase()),
        })}
      </p>
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from 'react-use';
import { AccountBackup } from '@dedot/signer-keyring/types';
import { useWalletState } from 'providers/WalletStateProvider';

interface Conflict {
  validation: string;
  resolvable?: boolean;
}

export default function useAccountBackupValidation(backup: AccountBackup) {
  const { t } = useTranslation();
  const { keyring } = useWalletState();
  const [conflict, setConflict] = useState<Conflict>();

  useAsync(async () => {
    const { address, meta } = backup;
    const name = (meta?.name ?? '') as string;

    if (await keyring.existsAccount(address)) {
      setConflict({
        validation: t<string>('Account has already existed.'),
        resolvable: false,
      });

      return;
    }

    if (!name) {
      setConflict({
        validation: t<string>('Account name is required. Please choose a name to continue.'),
        resolvable: true,
      });

      return;
    }

    if (name.length > 16) {
      setConflict({
        validation: t<string>(
          'Account name ({{name}}) is too long. Please choose another name to continue (max 16 characters).',
          { name },
        ),
        resolvable: true,
      });

      return;
    }

    if (await keyring.existsName(name)) {
      setConflict({
        validation: t<string>(
          'Account name ({{name}}) has already been taken. Please choose another name to continue.',
          { name },
        ),
        resolvable: true,
      });

      return;
    }

    setConflict(undefined);
  }, [backup]);

  const { validation = '', resolvable = false } = conflict || {};

  return { validation, resolvable };
}

import { ReactNode } from 'react';
import { AccountInfo } from '@dedot/signer-keyring/types';

export interface Props {
  className?: string;
  children?: ReactNode;

  [prop: string]: any;
}

export interface AccountInfoExt extends AccountInfo {
  networkAddress: string; // Network address changing following the `addressPrefix`
}

export enum TransferableObject {
  Wallet = 'Wallet',
  Account = 'Account',
}

export enum ThemeMode {
  Dark = 'dark',
  Light = 'light',
  System = 'system',
}

export enum Language {
  English = 'en',
}

export enum AutoLockInterval {
  FiveMinutes = 5 * 60e3,
  FifteenMinutes = 15 * 60e3,
  ThirtyMinutes = 30 * 60e3,
}

export enum SettingsDialogScreen {
  SettingsWallet,
  BackupSecretPhrase,
  ChangeWalletPassword,
  ManageDappAccess,
}

export enum NewWalletScreenStep {
  ChooseWalletPassword,
  ConfirmWalletPassword,
  BackupSecretRecoveryPhrase,
}

export enum RestoreWalletMethod {
  SecretRecoveryPhrase,
  QrCode,
  JsonFile,
}

export enum RestoreWalletScreenStep {
  EnterSecretRecoveryPhrase,
  ChooseWalletPassword,
  ConfirmWalletPassword,
}

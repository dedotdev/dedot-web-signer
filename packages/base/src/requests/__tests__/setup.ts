import { generateMnemonic } from '@polkadot/util-crypto/mnemonic/bip39';
import Keyring from '@dedot/signer-keyring';
import WalletState, { AUTHORIZED_ACCOUNTS_KEY, AuthorizedApps } from '../WalletState';

export const PASSWORD = 'supersecretpassword';
export const MNEMONIC = generateMnemonic(12);

export const newKeyring = async () => {
  const keyring = new Keyring();
  await keyring.initialize(MNEMONIC, PASSWORD);

  return keyring;
};
export const newWalletState = async () => {
  const keyring = await newKeyring();
  return new WalletState(keyring);
};

export const RANDOM_APP_URL = 'https://random-app.com';

export const setupAuthorizedApps = (state: WalletState, authorizedAccounts: string[] = [], appUrl?: string) => {
  const randomAppUrl = appUrl || RANDOM_APP_URL;
  const randomAppId = randomAppUrl.split('//')[1];

  const randomAppInfo = {
    id: randomAppId,
    name: 'Random App',
    url: randomAppUrl,
    authorizedAccounts: authorizedAccounts,
    createdAt: Date.now(),
  };

  const authorizedApps: AuthorizedApps = {
    [randomAppId]: randomAppInfo,
  };

  localStorage.setItem(AUTHORIZED_ACCOUNTS_KEY, JSON.stringify(authorizedApps));

  if (state) {
    state.reloadState();
  }

  return { randomAppUrl, randomAppInfo, authorizedApps };
};

export const pick = (obj: any, props: string[] = []) => {
  if (!obj) {
    return {};
  }

  return props.reduce((o, prop) => {
    if (obj.hasOwnProperty(prop)) {
      o[prop] = obj[prop];
    }

    return o;
  }, {} as any);
};

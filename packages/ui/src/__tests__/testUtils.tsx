import { render, RenderOptions } from '@testing-library/react';
import React, { FC } from 'react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { generateMnemonic } from '@polkadot/util-crypto/mnemonic/bip39';
import WalletState, { AUTHORIZED_ACCOUNTS_KEY, AuthorizedApps } from '@dedot/signer-base/requests/WalletState';
import Keyring from '@dedot/signer-keyring';
import { PreloadedState } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';
import { Options } from '@testing-library/user-event/options';
import i18next from 'i18next';
import Backend from 'i18next-http-backend';
import LanguageProvider from 'providers/LanguageProvider';
import ThemeProvider from 'providers/ThemeProvider';
import { WalletStateProvider } from 'providers/WalletStateProvider';
import { newStore } from 'redux/store';
import { Props } from 'types';
import { ALERT_TIMEOUT } from 'utils/constants';

interface WrapperProps extends Props {
  preloadedState?: PreloadedState<any>;
  keyring?: Keyring;
  walletState?: WalletState;
}

const i18nInstance = i18next.createInstance();
i18nInstance.use(Backend).init({
  fallbackLng: 'en',
  returnEmptyString: false,
  react: {
    useSuspense: false,
  },
  backend: {
    request: function (
      options: any,
      url: string,
      payload: any,
      callback: (err: null, res: { status: any; data: string }) => {},
    ) {
      import(`../../public/${url}`).then(({ default: resources }) => {
        return callback(null, {
          status: 200,
          data: JSON.stringify(resources),
        });
      });
    },
  },
});

const Wrapper: FC<WrapperProps> = ({ children, preloadedState, keyring, walletState }) => {
  const store = newStore(preloadedState);

  return (
    <Provider store={store}>
      <LanguageProvider i18nInstance={i18nInstance}>
        <ThemeProvider>
          <WalletStateProvider initialKeyring={keyring} initialWalletState={walletState}>
            {children}
            <ToastContainer
              position='top-center'
              closeOnClick
              pauseOnHover
              theme='colored'
              autoClose={ALERT_TIMEOUT}
              hideProgressBar
              limit={2}
            />
          </WalletStateProvider>
        </ThemeProvider>
      </LanguageProvider>
    </Provider>
  );
};

interface CustomRenderOptions extends RenderOptions {
  preloadedState?: PreloadedState<any>;
  keyring?: Keyring;
  walletState?: WalletState;
}

const customRender = (ui: React.ReactElement, options?: CustomRenderOptions) => {
  const { preloadedState, keyring, walletState } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <Wrapper preloadedState={preloadedState} keyring={keyring} walletState={walletState}>
        {children}
      </Wrapper>
    ),
    ...options,
  });
};

export * from '@testing-library/react';
export { customRender as render };

export const PASSWORD = 'supersecretpassword';
export const MNEMONIC = generateMnemonic(12);

export const initializeKeyring = async () => {
  const keyring = new Keyring();
  while (await keyring.initialized()) {
    await keyring.reset();
    localStorage.clear();
  }
  await keyring.initialize(MNEMONIC, PASSWORD);

  return keyring;
};

export type { UserEvent } from '@testing-library/user-event/setup/setup';
export const newUser = (options?: Options) => {
  return userEvent.setup(options);
};

interface RouterWrapperProps extends Props {
  path: string;
  currentUrl?: string;
}

export const RouterWrapper: FC<RouterWrapperProps> = ({ children, path, currentUrl }: Props) => {
  const router = createMemoryRouter(
    [
      {
        element: children,
        index: true,
        path,
      },
    ],
    { initialEntries: [currentUrl || path] },
  );

  return <RouterProvider router={router} />;
};

export const RANDOM_APP_URL = 'https://random-app.com';

export const setupAuthorizedApps = (authorizedAccounts: string[] = [], appUrl?: string) => {
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

  return { randomAppUrl, randomAppInfo, authorizedApps };
};

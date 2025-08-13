import { defaultNetwork, newWalletErrorResponse, newWalletRequest, newWalletResponse } from '@dedot/signer-base';
import { AccessStatus, WalletRequestMessage } from '@dedot/signer-base/types';
import Keyring from '@dedot/signer-keyring';
import { AccountInfo } from '@dedot/signer-keyring/types';
import { PreloadedState } from '@reduxjs/toolkit';
import { SpyInstance } from '@vitest/spy';
import { UserEvent, initializeKeyring, newUser, PASSWORD, render, RouterWrapper, screen } from '__tests__/testUtils';
import { Mock, vi } from 'vitest';
import Request from '../../index';

const addressPrefix = defaultNetwork.prefix;

describe('RequestAccess', () => {
  let windowClose: SpyInstance,
    postMessage: Mock,
    requestUrl: string,
    user: UserEvent,
    requestAccessMessage: WalletRequestMessage;

  beforeEach(async () => {
    windowClose = vi.spyOn(window, 'close').mockImplementation(() => vi.fn());

    postMessage = vi.fn();
    window.opener = { postMessage };

    requestAccessMessage = newWalletRequest({ name: 'tab/requestAccess', body: { appName: 'Random app' } });
    const queryParam = new URLSearchParams({
      message: JSON.stringify(requestAccessMessage),
    }).toString();
    requestUrl = `/request?${queryParam}`;

    user = newUser();
  });

  describe('keyring is initialized', () => {
    const preloadedState: PreloadedState<any> = { app: { seedReady: true, addressPrefix } };
    let keyring: Keyring;

    beforeEach(async () => {
      keyring = await initializeKeyring();
    });

    describe('with no accounts', () => {
      it('should show a no accounts found message', async () => {
        render(
          <RouterWrapper path='/request' currentUrl={requestUrl}>
            <Request />
          </RouterWrapper>,
          { preloadedState },
        );

        expect(await screen.findByText(/Random app/)).toBeInTheDocument();
        expect(await screen.findByText(/Wallet Access Request/)).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: /Connect/ })).toBeEnabled();
        expect(await screen.findByRole('button', { name: /Cancel/ })).toBeEnabled();

        expect(await screen.findByText(/No accounts found in wallet/)).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: /Create your first account now/ })).toBeInTheDocument();
      });
    });

    describe('with accounts', () => {
      let account01: AccountInfo;
      beforeEach(async () => {
        account01 = await keyring.createNewAccount('Account 01', PASSWORD);
      });

      it('should render the page correctly', async () => {
        render(
          <RouterWrapper path='/request' currentUrl={requestUrl}>
            <Request />
          </RouterWrapper>,
          { preloadedState },
        );

        expect(await screen.findByText(/Random app/)).toBeInTheDocument();
        expect(await screen.findByText(/Wallet Access Request/)).toBeInTheDocument();
        expect(await screen.findByText(/Account 01/)).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: /Connect/ })).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: /Cancel/ })).toBeInTheDocument();
      });

      it('should show error if connect with no selected accounts', async () => {
        render(
          <RouterWrapper path='/request' currentUrl={requestUrl}>
            <Request />
          </RouterWrapper>,
          { preloadedState },
        );

        const connectButton = await screen.findByRole('button', { name: /Connect/ });
        expect(connectButton).toBeEnabled();
        await user.click(connectButton);

        expect(await screen.findByText('Please choose at least one account to connect')).toBeInTheDocument();
      });

      it('should connect the app and close the window', async () => {
        render(
          <RouterWrapper path='/request' currentUrl={requestUrl}>
            <Request />
          </RouterWrapper>,
          { preloadedState },
        );

        const account01Button = await screen.findByRole('button', { name: /Account 01/ });
        expect(account01Button).toBeEnabled();
        await user.click(account01Button);

        expect(await screen.findByTestId('number-of-selected-accounts')).toHaveTextContent('1 account(s) selected');

        const connectButton = await screen.findByRole('button', { name: /Connect/ });
        expect(connectButton).toBeEnabled();
        await user.click(connectButton);

        const expectedResponse = newWalletResponse(
          {
            result: AccessStatus.APPROVED,
            authorizedAccounts: [
              {
                address: account01.address,
                name: account01.name,
                type: account01.type,
              },
            ],
          },
          requestAccessMessage.id,
        );

        expect(postMessage).toHaveBeenNthCalledWith(2, expectedResponse, requestAccessMessage.origin);
        expect(windowClose).toBeCalled();
      });

      it('should cancel the request and close the window', async () => {
        render(
          <RouterWrapper path='/request' currentUrl={requestUrl}>
            <Request />
          </RouterWrapper>,
          { preloadedState },
        );

        const cancelButton = await screen.findByRole('button', { name: /Cancel/ });
        expect(cancelButton).toBeEnabled();
        await user.click(cancelButton);

        const expectedResponse = newWalletErrorResponse(AccessStatus.DENIED, requestAccessMessage.id);

        expect(postMessage).toHaveBeenNthCalledWith(2, expectedResponse, requestAccessMessage.origin);
        expect(windowClose).toBeCalled();
      });

      it('should allow creating new account to connect', async () => {
        render(
          <RouterWrapper path='/request' currentUrl={requestUrl}>
            <Request />
          </RouterWrapper>,
          { preloadedState },
        );

        const newAccountButton = await screen.findByRole('button', { name: /New Account/ });
        await user.click(newAccountButton);

        expect(await screen.findByRole('dialog', { name: /Create new account/ })).toBeVisible();
        const passwordField = await screen.findByLabelText(/Wallet password/);
        await user.type(passwordField, PASSWORD);

        const createButton = await screen.findByRole('button', { name: /Create/ });
        await user.click(createButton);

        const createdAccountButton = await screen.findByRole('button', { name: /Account 02/ });
        expect(createdAccountButton).toBeEnabled();
        expect(createdAccountButton).toBeVisible();
      });
    });
  });

  describe('keyring is not initialized', () => {
    const preloadedState: PreloadedState<any> = { app: { seedReady: false } };

    it('should show instructions to set up wallet', async () => {
      render(
        <RouterWrapper path='/request' currentUrl={requestUrl}>
          <Request />
        </RouterWrapper>,
        { preloadedState },
      );

      expect(await screen.findByText(/Random app/)).toBeInTheDocument();
      expect(await screen.findByText(/Wallet Access Request/)).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /Set up wallet/ })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /Cancel/ })).toBeInTheDocument();
    });

    it('should show set up wallet dialog', async () => {
      render(
        <RouterWrapper path='/request' currentUrl={requestUrl}>
          <Request />
        </RouterWrapper>,
        { preloadedState },
      );

      const setupWalletButton = await screen.findByRole('button', { name: /Set up wallet/ });
      expect(setupWalletButton).toBeEnabled();
      await user.click(setupWalletButton);

      expect(await screen.findByRole('dialog')).toBeVisible();
      expect(await screen.findByText(/Set up new wallet/)).toBeVisible();
      expect(await screen.findByRole('button', { name: /Create New Wallet/ })).toBeEnabled();
      expect(await screen.findByRole('button', { name: /Restore Existing Wallet/ })).toBeEnabled();
    });
  });
});

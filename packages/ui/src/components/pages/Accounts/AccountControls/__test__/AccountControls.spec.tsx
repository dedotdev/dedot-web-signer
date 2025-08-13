import { encodeAddress } from '@polkadot/util-crypto';
import { defaultNetwork, networks, WalletState } from '@dedot/signer-base';
import Keyring from '@dedot/signer-keyring';
import { AccountInfo } from '@dedot/signer-keyring/types';
import { trimOffUrlProtocol } from '@dedot/signer-utils';
import {
  UserEvent,
  initializeKeyring,
  newUser,
  PASSWORD,
  RANDOM_APP_URL,
  render,
  screen,
  setupAuthorizedApps,
  waitFor,
} from '__tests__/testUtils';
import { beforeEach } from 'vitest';
import Accounts from '../../index';

const preloadedState = { app: { addressPrefix: defaultNetwork.prefix } };

describe('AccountControls', () => {
  let user: UserEvent, testAccount: AccountInfo, keyring: Keyring, walletState: WalletState;
  beforeEach(async () => {
    user = newUser();

    keyring = await initializeKeyring();
    testAccount = await keyring.createNewAccount('test-account', PASSWORD);

    setupAuthorizedApps([testAccount.address]);
    walletState = new WalletState(keyring);

    render(<Accounts />, { preloadedState, keyring, walletState });

    await user.click(await screen.findByTitle(/Open account controls/));
  });
  describe('RemoveAccountDialog', () => {
    beforeEach(async () => {
      await user.click(await screen.findByRole('menuitem', { name: /Remove/ }));
    });

    it('should show content of `RemoveAccountDialog` correctly', async () => {
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(await screen.findByText(`Remove account: ${testAccount.name}`)).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /Cancel/ })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /Remove this account/ })).toBeInTheDocument();
    });

    it('should close the `RemoveAccountDialog` when clicking on `Cancel` button', async () => {
      const cancelButton = await screen.findByRole('button', { name: /Cancel/ });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByText(`Remove account: ${testAccount.name}`)).not.toBeInTheDocument();
      });
    });
  });
  describe('RenameAccountDialog', () => {
    beforeEach(async () => {
      await user.click(await screen.findByRole('menuitem', { name: /Rename/ }));
    });

    it('should show content of `RenameAccountDialog` correctly', async () => {
      expect(await screen.findByRole('dialog', { name: /Rename account/ })).toBeInTheDocument();
      expect(await screen.findByLabelText(/Account name/)).toBeInTheDocument();
      expect(await screen.findByText(/test-account/)).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /Rename/ })).toBeDisabled();
    });

    it('should close `RenameAccountDialog` when clicking on `Cancel` button', async () => {
      const cancelButton = await screen.findByRole('button', { name: /Cancel/ });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByText(/Rename account/)).not.toBeInTheDocument();
      });
    });

    it('should show error if account name invalid', async () => {
      const accountNameField = await screen.findByLabelText(/Account name/);

      await user.clear(accountNameField);
      expect(await screen.findByRole('button', { name: /Rename/ })).toBeDisabled();

      await user.type(accountNameField, 'Account-name-more-than-16-chars');
      expect(await screen.findByText(/Account name should not exceed 16 characters/)).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /Rename/ })).toBeDisabled();

      await keyring.createNewAccount('test-account-2', PASSWORD);
      await user.clear(accountNameField);
      await user.type(accountNameField, 'test-account-2');

      expect(await screen.findByText(/Account name is already picked/)).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /Rename/ })).toBeDisabled();
    });
  });
  describe('ShowAddressQrCodeDialog', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    beforeEach(async () => {
      await user.click(await screen.findByRole('menuitem', { name: /Show Address QR Code/ }));
    });

    it('should show content of `ShowAddressQrCodeDialog` correctly', async () => {
      expect(await screen.findByRole('dialog', { name: /Account address/ })).toBeInTheDocument();
      expect(await screen.findByTitle(/Account Address QR Code/)).toBeInTheDocument();
    });

    it('should change address format', async () => {
      const searchField = await screen.findAllByLabelText(/Address format/);
      await user.click(searchField[1]);

      const acalaOption = await screen.findByText(/Acala/);
      await user.click(acalaOption);

      expect(searchField[1]).toHaveDisplayValue(/Acala/);
      const { prefix } = networks.find((one) => one.displayName === 'Acala')!;
      expect(await screen.findByText(encodeAddress(testAccount.address, prefix))).toBeInTheDocument();
    });

    it('should hide the dialog', async () => {
      const closeButton = await screen.findByRole('button', { name: /Close/ });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /Account address/ })).not.toBeInTheDocument();
      });
    });
  });
  describe('ExportAccountDialog', () => {
    beforeEach(async () => {
      await user.click(await screen.findByRole('menuitem', { name: /Export/ }));
    });

    it('should ask for password', async () => {
      expect(await screen.findByRole('dialog', { name: /Export account/ }));
      expect(await screen.findByLabelText(/Wallet password/));
      expect(await screen.findByRole('button', { name: /Continue/ }));
      expect(await screen.findByRole('button', { name: /Cancel/ }));
    });

    describe('password incorrect', () => {
      it('should show error when password incorrect', async () => {
        const passwordField = await screen.findByLabelText(/Wallet password/);
        await user.type(passwordField, 'incorrect-password');
        await user.click(await screen.findByRole('button', { name: /Continue/ }));

        expect(await screen.findByText(/Password incorrect/)).toBeInTheDocument();
      });
    });

    describe('password correct', () => {
      beforeEach(async () => {
        const passwordField = await screen.findByLabelText(/Wallet password/);
        await user.type(passwordField, PASSWORD);
        await user.click(await screen.findByRole('button', { name: /Continue/ }));
      });

      it('should export account when password correct', async () => {
        expect(
          await screen.findByText(/Open Dedot Signer on another device and scan this QR Code to transfer your account/),
        ).toBeInTheDocument();
        expect(await screen.findByTitle(/Account Export QR Code/)).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: /Download QR Code Image/ })).toBeInTheDocument();
      });

      it('should show export account to json tab content', async () => {
        await user.click(await screen.findByRole('tab', { name: /JSON/ }));

        expect(
          await screen.findByText(
            /Export this account to a JSON file and import it back to Dedot Signer on this or other devices later/,
          ),
        ).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: /Download JSON File/ })).toBeInTheDocument();
      });
    });
  });
  describe('DappsAccessToAccountDialog', () => {
    beforeEach(async () => {
      await user.click(await screen.findByRole('menuitem', { name: /View Dapps Access/ }));
    });

    it('should show no dapps access massage', async () => {
      walletState.reset();
      walletState.reloadState();

      expect(await screen.getByRole('dialog', { name: /Dapps Access To/ })).toBeInTheDocument();
      expect(await screen.getByText('No dapps have access to this account')).toBeInTheDocument();
    });

    it('should show dapp access list', async () => {
      expect(await screen.getByRole('dialog', { name: /Dapps Access To/ })).toBeInTheDocument();
      expect(await screen.findByText(/Random App/)).toBeInTheDocument();
      expect(await screen.findByText(trimOffUrlProtocol(RANDOM_APP_URL))).toBeInTheDocument();
    });

    it('should remove one access', async () => {
      expect(await screen.getByRole('dialog', { name: /Dapps Access To/ })).toBeInTheDocument();
      const removeAccessBtn = await screen.findByRole('button', { name: /Remove Access/ });
      expect(removeAccessBtn).toBeEnabled();
      await user.click(removeAccessBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Random App/)).not.toBeInTheDocument();
      });

      expect(await screen.getByText('No dapps have access to this account')).toBeInTheDocument();
    });

    it('should remove all access', async () => {
      expect(await screen.getByRole('dialog', { name: /Dapps Access To/ })).toBeInTheDocument();
      const removeAllAccessBtn = await screen.findByRole('button', { name: /Remove All/ });
      await user.click(removeAllAccessBtn);

      expect(
        await screen.findByRole('dialog', { name: `Remove All Dapps Access To: ${testAccount.name}` }),
      ).toBeInTheDocument();
      expect(await screen.findByText(`Are you sure to remove all dapps access to account: ${testAccount.name}?`));
      expect(await screen.findByRole('button', { name: /Cancel/ })).toBeEnabled();
      const confirmBtn = await screen.findByRole('button', { name: /Remove All Access/ });
      expect(confirmBtn).toBeEnabled();

      await user.click(confirmBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Random App/)).not.toBeInTheDocument();
      });

      expect(await screen.getByText('No dapps have access to this account')).toBeInTheDocument();
    });
  });
});

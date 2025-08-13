import { waitFor } from '@testing-library/react';
import { WalletState } from '@dedot/signer-base';
import {
  UserEvent,
  initializeKeyring,
  newUser,
  PASSWORD,
  render,
  screen,
  setupAuthorizedApps,
} from '__tests__/testUtils';
import RemoveDappAccessDialog from '../RemoveDappAccessDialog';
import ManageDappAccessDialog from '../index';

describe('ManageDappAccessDialog', () => {
  describe('No authorized dapps', () => {
    beforeEach(() => {
      render(<ManageDappAccessDialog onClose={() => {}} />);
    });

    it('should render empty screen', async () => {
      expect(await screen.findByText(/You have not authorized any dapp\/website/)).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /Remove All/ })).toBeDisabled();
      expect(await screen.findByRole('button', { name: /Back/ })).toBeInTheDocument();
    });
  });

  describe('Has authorized dapps', () => {
    let state: WalletState, user: UserEvent;
    beforeEach(async () => {
      const keyring = await initializeKeyring();
      const account01 = await keyring.createNewAccount('Account 01', PASSWORD);
      const account02 = await keyring.createNewAccount('Account 02', PASSWORD);
      state = new WalletState(keyring);
      user = newUser();

      setupAuthorizedApps([account01.address, account02.address], window.location.origin);

      render(
        <>
          <ManageDappAccessDialog onClose={() => {}} />
          <RemoveDappAccessDialog />
        </>,
      );
    });

    it('should render list of authorized dapps', async () => {
      expect(await screen.findByText(/Random App/)).toBeInTheDocument();
      expect(await screen.findByText(/2/)).toBeVisible();
      expect(await screen.findByTestId(/DeleteIcon/)).toBeEnabled();
      expect(await screen.findByRole('button', { name: /Remove All/ })).toBeEnabled();
      expect(await screen.findByRole('button', { name: /Back/ })).toBeInTheDocument();
    });

    it('should remove all authorized dapps', async () => {
      await user.click(await screen.findByRole('button', { name: /Remove All/ }));

      expect(await screen.findByRole('dialog', { name: /Remove All Dapps Access/ })).toBeInTheDocument();
      expect(await screen.findByText(/Are you sure to remove all dapps access to your wallet?/)).toBeInTheDocument();
      const confirmButton = await screen.findByRole('button', { name: /Remove All/ });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText(/You have not authorized any dapp\/website/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Remove All/ })).toBeDisabled();
      });
    });

    it('should show dapp access removal confirmation dialog', async () => {
      await user.click(await screen.findByTestId(/DeleteIcon/));

      expect(await screen.findByRole('dialog', { name: /Remove Dapp Access: Random App/ })).toBeInTheDocument();
    });
  });
});

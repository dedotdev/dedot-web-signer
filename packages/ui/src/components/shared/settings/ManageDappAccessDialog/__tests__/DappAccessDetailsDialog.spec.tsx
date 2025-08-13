import { screen, waitFor } from '@testing-library/react';
import { WalletState } from '@dedot/signer-base';
import { initializeKeyring, newUser, PASSWORD, render, setupAuthorizedApps, UserEvent } from '__tests__/testUtils';
import DappAccessDetailsDialog from '../DappAccessDetailsDialog';
import RemoveDappAccessDialog from '../RemoveDappAccessDialog';
import ManageDappAccessDialog from '../index';

describe('DappAccessDetailsDialog', () => {
  let state: WalletState, user: UserEvent;
  const checkMarkIconSelector = `[data-testid='CheckIcon']`;
  beforeEach(async () => {
    const keyring = await initializeKeyring();
    const account01 = await keyring.createNewAccount('Account 01', PASSWORD);
    const account02 = await keyring.createNewAccount('Account 02', PASSWORD);
    setupAuthorizedApps([account01.address], window.location.origin);

    state = new WalletState(keyring);
    user = newUser();

    render(
      <>
        <ManageDappAccessDialog onClose={() => {}} />
        <DappAccessDetailsDialog />
        <RemoveDappAccessDialog />
      </>,
    );

    await user.click(await screen.findByRole('button', { name: /View Dapp Details/ }));
  });

  it('should render the dialog', async () => {
    const dialog = await screen.findByRole('dialog', { name: /Random App/ });
    expect(dialog).toBeInTheDocument();

    expect(await screen.findByText(/Select accounts to connect to this dapp/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Account 01/ })).toBeEnabled();
    expect(await screen.findByRole('button', { name: /Account 01/ })).toContainElement(
      await screen.findByTestId('CheckIcon'),
    );
    expect(await screen.findByRole('button', { name: /Account 02/ })).toBeEnabled();
    expect(await screen.findByRole('button', { name: /Account 02/ })).not.toContainElement(
      await screen.findByTestId('CheckIcon'),
    );
    expect(dialog).toHaveTextContent('1 account(s) selected');

    expect((await screen.findAllByRole('button', { name: 'Close' }))[1]).toBeInTheDocument(); // the first button is the button with X icon on the dialog title
    expect(await screen.findByRole('button', { name: 'Remove Access' })).toBeInTheDocument();
  });

  it('should toggle on account access', async () => {
    const account01Btn = await screen.findByRole('button', { name: /Account 01/ });
    expect(account01Btn).toBeEnabled();
    expect(account01Btn).toHaveClass('selected');
    expect(account01Btn.querySelector(checkMarkIconSelector)).toBeTruthy();
    await user.click(account01Btn);
    await waitFor(() => {
      expect(account01Btn).not.toHaveClass('selected');
      expect(account01Btn.querySelector(checkMarkIconSelector)).toBeFalsy();
    });
  });

  it('should toggle off account access', async () => {
    const account02Btn = await screen.findByRole('button', { name: /Account 02/ });
    expect(account02Btn).toBeEnabled();
    expect(account02Btn).not.toHaveClass('selected');
    expect(account02Btn.querySelector(checkMarkIconSelector)).toBeFalsy();
    await user.click(account02Btn);
    expect(account02Btn).toHaveClass('selected');
    expect(account02Btn.querySelector(checkMarkIconSelector)).toBeTruthy();
  });

  it('should select all accounts', async () => {
    await user.click(await screen.findByRole('button', { name: /Select all/ }));
    const account01Btn = await screen.findByRole('button', { name: /Account 01/ });
    expect(account01Btn).toHaveClass('selected');
    expect(account01Btn.querySelector(checkMarkIconSelector)).toBeTruthy();

    const account02Btn = await screen.findByRole('button', { name: /Account 02/ });
    expect(account02Btn).toHaveClass('selected');
    expect(account02Btn.querySelector(checkMarkIconSelector)).toBeTruthy();
  });

  it('should deselect all accounts', async () => {
    await user.click(await screen.findByRole('button', { name: /Deselect all/ }));

    const account01Btn = await screen.findByRole('button', { name: /Account 01/ });
    expect(account01Btn).not.toHaveClass('selected');
    expect(account01Btn.querySelector(checkMarkIconSelector)).toBeFalsy();

    const account02Btn = await screen.findByRole('button', { name: /Account 02/ });
    expect(account02Btn).not.toHaveClass('selected');
    expect(account02Btn.querySelector(checkMarkIconSelector)).toBeFalsy();
  });

  describe('Remove Dapp Access', () => {
    it('should show removal confirmation', async () => {
      await user.click(await screen.findByRole('button', { name: /Remove Access/ }));

      const dialog = await screen.findByRole('dialog', { name: /Remove Dapp Access: Random App/ });
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveTextContent('Are you sure to remove access from Random App at http://localhost:3000');

      expect(await screen.findByRole('button', { name: /Cancel/ })).toBeEnabled();
      expect(await screen.findByRole('button', { name: /Remove Access/ })).toBeEnabled();
    });

    it('should close confirmation dialog on canceling', async () => {
      await user.click(await screen.findByRole('button', { name: /Remove Access/ }));
      await user.click(await screen.findByRole('button', { name: /Cancel/ }));
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /Remove Dapp Access: Random App/ })).not.toBeInTheDocument();
      });
    });

    it('should remove dapp access', async () => {
      await user.click(await screen.findByRole('button', { name: /Remove Access/ }));
      await user.click(await screen.findByRole('button', { name: /Remove Access/ }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /Remove Dapp Access: Random App/ })).not.toBeInTheDocument();
      });

      expect(
        await screen.findByText(/Dapp access from Random App \(http:\/\/localhost:3000\) removed/),
      ).toBeInTheDocument();

      expect(await screen.findByText(/You have not authorized any dapp\/website/)).toBeInTheDocument();
    });
  });
});

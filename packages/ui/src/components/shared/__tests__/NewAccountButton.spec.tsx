import Keyring from '@dedot/signer-keyring';
import { AccountInfo } from '@dedot/signer-keyring/types';
import { initializeKeyring, newUser, PASSWORD, render, screen, UserEvent, waitFor } from '__tests__/testUtils';
import { beforeEach, vi } from 'vitest';
import NewAccountButton from '../NewAccountButton';

describe('NewAccountButton', () => {
  it('should show button with text', () => {
    render(<NewAccountButton />);
    const button = screen.queryByText('New Account');
    expect(button).toBeInTheDocument();
    expect(button).toBeVisible();
  });

  it('should hide the dialog by default', () => {
    render(<NewAccountButton />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('when the dialog is open', () => {
    let container: HTMLElement, user: UserEvent, keyring: Keyring, onCreated: (newAccount: AccountInfo) => void;
    beforeEach(async () => {
      keyring = await initializeKeyring();
      user = newUser();
      onCreated = vi.fn();

      const result = render(<NewAccountButton onCreated={onCreated} />);
      container = result.container;
      const button = screen.getByText('New Account');
      user.click(button);
    });

    it('should show the dialog when clicking the new account button', async () => {
      expect(await screen.findByText('Create new account')).toBeInTheDocument();
      expect(await screen.findByLabelText(/New account name/)).toBeInTheDocument();
      expect(await screen.findByLabelText(/Wallet password/)).toBeInTheDocument();
    });

    it('should suggest a name for new account', async () => {
      expect(await screen.findByLabelText(/New account name/)).toHaveDisplayValue(/Account/);
    });

    it('should disable the Create button by default', async () => {
      expect(await screen.findByRole('button', { name: /Create/ })).toBeDisabled();
    });

    it('should enable the Create button after enter both fields', async () => {
      const passwordField = await screen.findByLabelText(/Wallet password/);
      await user.type(passwordField, 'random password');

      const nameField = await screen.findByLabelText(/New account name/);
      await user.clear(nameField);
      await user.type(nameField, 'Valid-name');

      expect(await screen.findByRole('button', { name: /Create/ })).toBeEnabled();
    });

    it('should show validation error if password is not correct', async () => {
      const passwordField = await screen.findByLabelText(/Wallet password/);
      await user.type(passwordField, 'incorrect-password');

      await user.click(await screen.findByRole('button', { name: /Create/ }));

      expect(await screen.findByText('Password incorrect')).toBeInTheDocument();
    });

    it('should show validation error when account name invalid', async () => {
      const nameField = await screen.findByLabelText(/New account name/);

      const passwordField = await screen.findByLabelText(/Wallet password/);
      await user.clear(passwordField);
      await user.type(passwordField, PASSWORD);

      await user.clear(nameField);
      expect(await screen.findByRole('button', { name: /Create/ })).toBeDisabled();

      await user.type(nameField, 'Account-name-more-than-16-chars');
      expect(await screen.findByRole('button', { name: /Create/ })).toBeDisabled();

      await keyring.createNewAccount('Account 01', PASSWORD);
      await user.clear(nameField);
      await user.type(nameField, 'Account 01');

      expect(await screen.findByText('Account name is already picked')).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /Create/ })).toBeDisabled();
    });

    it('should hide the dialog & call onCreated after creation', async () => {
      const passwordField = await screen.findByLabelText(/Wallet password/);
      await user.clear(passwordField);
      await user.type(passwordField, PASSWORD);

      const createButton = await screen.findByRole('button', { name: /Create/ });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(onCreated).toHaveBeenCalledTimes(1);
      });
    });
  });
});

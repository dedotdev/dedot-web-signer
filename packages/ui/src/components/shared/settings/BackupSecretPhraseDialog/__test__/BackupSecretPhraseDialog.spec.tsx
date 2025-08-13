import Keyring from '@dedot/signer-keyring';
import { initializeKeyring, newUser, render, screen, UserEvent, waitFor } from '__tests__/testUtils';
import SettingsWalletButton from '../../SettingsWalletButton';
import { expectSettingsWalletDialog } from '../../__test__/SettingsWalletButton.spec';

describe('BackupSecretPhraseDialog', () => {
  let user: UserEvent;
  vi.spyOn(window, 'prompt').mockImplementation(() => '');
  beforeEach(async () => {
    user = newUser();

    render(<SettingsWalletButton />, {
      preloadedState: {
        app: { seedReady: true, ready: true, locked: false },
      },
    });

    const settingsButton = screen.getByTitle('Open settings');
    await user.click(settingsButton);

    const BackupSecretPhraseButton = await screen.findByRole('button', { name: /Backup Secret Recovery Phrase/ });
    await user.click(BackupSecretPhraseButton);
  });

  describe('VerifyingPassword', () => {
    it('should show the content of BackupSecretPhraseDialog', async () => {
      await waitFor(() => {
        expect(screen.getByText(/Backup Secret Recovery Phrase/)).toBeInTheDocument();
        expect(screen.getByText(/reveal the secret recovery phrase/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /View Secret Recovery Phrase/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument();
      });
    });

    it('should enable `View Secret Recovery Phrase` button when typing password', async () => {
      const passwordField = await screen.findByLabelText(/Wallet password/);
      await user.type(passwordField, 'password');

      expect(await screen.findByRole('button', { name: /View Secret Recovery Phrase/ })).toBeEnabled();
    });

    it('should show error message on submitting incorrect password', async () => {
      await initializeKeyring();

      const passwordField = await screen.findByLabelText(/Wallet password/);
      await user.type(passwordField, 'incorrect-password');

      const viewSecretPhraseButton = await screen.findByRole('button', { name: /View Secret Recovery Phrase/ });
      await user.click(viewSecretPhraseButton);

      expect(await screen.findByText(/Password incorrect/)).toBeInTheDocument();
    });

    it('should switch to `SettingsWalletDialog` content when clicking on `Back` button', async () => {
      const backButton = await screen.findByRole('button', { name: /Back/ });
      await user.click(backButton);

      await expectSettingsWalletDialog(screen);
    });
  });

  describe('ShowingSecretPhrase', () => {
    let keyring: Keyring;
    beforeEach(async () => {
      keyring = await initializeKeyring();

      const passwordField = await screen.findByLabelText(/Wallet password/);
      await user.type(passwordField, 'supersecretpassword');

      const viewSecretPhraseButton = await screen.findByRole('button', { name: /View Secret Recovery Phrase/ });
      await user.click(viewSecretPhraseButton);
    });

    it('should show `ShowingSecretPhrase` when submitting correct password', async () => {
      const rawMnemonic = await keyring.getRawMnemonic('supersecretpassword');

      expect(await screen.findByText(rawMnemonic)).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /Copy to Clipboard/ })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /Back/ })).toBeInTheDocument();
    });

    it('should show change button label to `Copied!` when clicking on `Copy to Clipboard` button', async () => {
      const copyToClipboardButton = await screen.findByRole('button', { name: /Copy to Clipboard/ });
      await user.click(copyToClipboardButton);

      expect(await screen.findByRole('button', { name: /Copied!/ })).toBeInTheDocument();
    });

    it('should switch to `SettingsWalletDialog` content when clicking on `Back` button', async () => {
      const backButton = await screen.findByRole('button', { name: /Back/ });
      await user.click(backButton);

      await expectSettingsWalletDialog(screen);
    });

    it('should close settings dialog when clicking on `Done` button', async () => {
      const doneButton = await screen.findByRole('button', { name: /Done/ });
      await user.click(doneButton);

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });
});

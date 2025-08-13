import { defaultNetwork } from '@dedot/signer-base';
import { PreloadedState } from '@reduxjs/toolkit';
import { initializeKeyring, newUser, PASSWORD, render, RouterWrapper, screen } from '__tests__/testUtils';
import { AutoLockTimerOptions } from 'components/shared/settings/SettingsWalletDialog/AutoLockSelection';
import GuardScreen from '../GuardScreen';

vi.mock('react-router-dom', async () => {
  const reactRouter: any = await vi.importActual('react-router-dom');

  return { ...reactRouter, useNavigate: () => vi.fn(), Outlet: () => <div>Outlet Render</div> };
});

vi.mock('react-use', async () => {
  const reactUse: any = await vi.importActual('react-use');

  return { ...reactUse, useIdle: () => true };
});

describe('GuardScreen', () => {
  describe('keying is not initialized', () => {
    it('should render Welcome page by default', () => {
      render(
        <RouterWrapper path='/'>
          <GuardScreen />
        </RouterWrapper>,
      );
      expect(screen.queryByText('Welcome to Dedot Signer')).toBeInTheDocument();
    });
  });

  describe('keyring is initialized', () => {
    const renderView = (preloadedState: PreloadedState<any>) => {
      render(
        <RouterWrapper path='/'>
          <GuardScreen />
        </RouterWrapper>,
        { preloadedState },
      );
    };

    it('should render UnlockWallet page if wallet is locked', async () => {
      renderView({ app: { seedReady: true, locked: true } });
      expect(await screen.findByText('Unlock your wallet')).toBeInTheDocument();
    });

    it('should render Welcome page after reset wallet', async () => {
      renderView({ app: { seedReady: true, locked: true } });

      const user = newUser();
      await user.click(await screen.findByRole('button', { name: /Forgot your password/ }));
      expect(await screen.findByRole('dialog', { name: /Forgot your password/ })).toBeInTheDocument();
      await user.type(await screen.findByLabelText(/Reset wallet/), 'Reset wallet');
      const resetWalletButton = await screen.findByRole('button', { name: /Reset Wallet/ });
      expect(resetWalletButton).toBeEnabled();
      await user.click(resetWalletButton);

      expect(await screen.findByText(/Welcome to Dedot Signer/)).toBeInTheDocument();
      expect(await screen.findByText(/Set up your Dedot Signer now/)).toBeInTheDocument();
    });

    it('should go to Outlet content after unlocking the wallet', async () => {
      await initializeKeyring();

      renderView({ app: { seedReady: true, locked: true, addressPrefix: defaultNetwork.prefix } });

      expect(await screen.findByText('Unlock your wallet')).toBeInTheDocument();
      const passwordField = await screen.findByLabelText('Wallet password');
      const unlockButton = await screen.findByRole('button', { name: /Unlock/ });

      const user = newUser();
      await user.type(passwordField, PASSWORD);
      await user.click(unlockButton);

      expect(await screen.findByText(/Outlet Render/)).toBeInTheDocument();
    });

    it('should render Outlet content if wallet is unlocked', async () => {
      renderView({ app: { seedReady: true, locked: false, addressPrefix: defaultNetwork.prefix } });

      expect(await screen.findByText(/Outlet Render/)).toBeInTheDocument();
    });

    it.each(AutoLockTimerOptions)(
      'should auto-lock the Wallet after passing the `autoLockInterval`: $label',
      async ({ interval }) => {
        vi.useFakeTimers();

        renderView({
          app: { seedReady: true, locked: false, addressPrefix: defaultNetwork.prefix },
          settings: { autoLockInterval: interval },
        });

        vi.advanceTimersByTime(interval + 1e3);
        vi.useRealTimers();

        expect(await screen.findByText('Welcome back')).toBeInTheDocument();
        expect(await screen.findByText('Unlock your wallet')).toBeInTheDocument();
      },
    );
  });
});

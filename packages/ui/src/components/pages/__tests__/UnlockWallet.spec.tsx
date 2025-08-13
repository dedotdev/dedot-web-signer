import { initializeKeyring, newUser, render, screen, UserEvent } from '__tests__/testUtils';
import UnlockWallet from '../UnlockWallet';

describe('UnlockWallet', () => {
  let user: UserEvent;
  beforeEach(() => {
    user = newUser();
  });

  it('should render the view', async () => {
    render(<UnlockWallet />);
    expect(await screen.findByText('Unlock your wallet')).toBeInTheDocument();
    expect(await screen.findByLabelText('Wallet password')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Unlock/ })).toBeDisabled();
  });

  it('should enable Unlock button when typing password', async () => {
    render(<UnlockWallet />);
    await user.type(await screen.findByLabelText('Wallet password'), 'password');
    expect(await screen.findByRole('button', { name: /Unlock/ })).toBeEnabled();
  });

  it('should show error message on submitting incorrect password', async () => {
    const keyring = await initializeKeyring();

    render(<UnlockWallet />, { keyring });
    const passwordField = await screen.findByLabelText('Wallet password');
    await user.type(passwordField, 'incorrect-password');

    const unlockButton = await screen.findByRole('button', { name: /Unlock/ });
    await user.click(unlockButton);

    expect(await screen.findByText('Password incorrect')).toBeInTheDocument();
  });
});

import { base64Encode } from '@polkadot/util-crypto';
import { WalletQrBackup } from '@dedot/signer-keyring/types';
import { UserEvent, MNEMONIC, newUser, PASSWORD, render, screen, initializeKeyring } from '__tests__/testUtils';
import CryptoJS from 'crypto-js';
import { vi } from 'vitest';
import ImportJsonFile from '../ImportJsonFile';
import ScanQrCode from '../ScanQrCode';

const onWalletSetup = vi.fn(),
  onCancelSetup = vi.fn();

vi.mock('providers/WalletSetupProvider', async () => {
  const provider: any = await vi.importActual('providers/WalletSetupProvider');

  return {
    ...provider,
    useWalletSetup: () => ({
      onWalletSetup,
      onCancelSetup,
    }),
  };
});

let onScanResult: (data: string) => void;

vi.mock('react-qr-reader', async () => {
  const qrReader: any = await vi.importActual('react-qr-reader');
  return {
    ...qrReader,
    default: ({ onScan }: any) => {
      onScanResult = onScan;
      return <div>Mocked QR Scanner</div>;
    },
  };
});

let cameraPermission: PermissionState = 'granted';

vi.mock('react-use', async () => {
  const reactUse: any = await vi.importActual('react-use');

  return { ...reactUse, usePermission: () => cameraPermission };
});

vi.mock('react-router-dom', async () => {
  const reactRouter: any = await vi.importActual('react-router-dom');

  return { ...reactRouter, useNavigate: () => vi.fn() };
});

let onReadResult: (acceptedFiles: File[]) => void;
vi.mock('react-dropzone', async () => {
  const reactDropzone: any = await vi.importActual('react-dropzone');
  return {
    ...reactDropzone,
    useDropzone: ({ onDrop }: any) => {
      onReadResult = onDrop;
      return {
        getRootProps: vi.fn(),
        getInputProps: vi.fn(),
        isDragActive: false,
      };
    },
  };
});

const expectTransferWalletBackup = async (screen: any) => {
  expect(await screen.findByText(/Import wallet/)).toBeInTheDocument();
  expect(await screen.findByText(/Enter wallet password of the backup to import your wallet/)).toBeInTheDocument();
  expect(await screen.findByLabelText(/Wallet password/)).toBeEnabled();
  expect(await screen.findByRole('button', { name: /Continue/ })).toBeDisabled();
  expect(await screen.findByRole('button', { name: /Back/ })).toBeEnabled();
};

describe('RestoreWallet', () => {
  describe('ScanQrCode', () => {
    const validQrBackup: WalletQrBackup = {
      encryptedMnemonic: CryptoJS.AES.encrypt(MNEMONIC, PASSWORD).toString(),
      accountsIndex: 3,
      accounts: [
        ['', 'Account 01'],
        ['//0', 'Account 02'],
        ['//1', 'Account 03'],
      ],
    };

    const rawQrBackup = base64Encode(JSON.stringify(validQrBackup));

    beforeEach(() => {
      cameraPermission = 'granted';
    });

    describe('QrCodeReader', () => {
      // it('should render the Qr Code reader properly', async () => {
      //   render(<ScanQrCode />);
      //
      //   expect(await screen.findByText(/Scan QR Code/)).toBeInTheDocument();
      //   expect(await screen.findByText(/Mocked QR Scanner/)).toBeInTheDocument();
      //   expect(await screen.findByRole('button', { name: /Back/ })).toBeEnabled();
      // });

      it('should show an alert if camera is denied', async () => {
        cameraPermission = 'denied';

        render(<ScanQrCode />);

        expect(await screen.findByRole('alert')).toHaveTextContent(/Camera Permission Denied/);
      });

      it('should show error if Qr code is invalid', async () => {
        render(<ScanQrCode />);
        onScanResult('random data');

        expect(await screen.findByText(/Unknown\/Invalid QR Code/)).toBeInTheDocument();
      });

      it('should show TransferWalletBackup screen if the Qr code is valid', async () => {
        render(<ScanQrCode />);
        onScanResult(rawQrBackup);

        await expectTransferWalletBackup(screen);
      });
    });

    describe('TransferWalletBackup', () => {
      let user: UserEvent;
      beforeEach(() => {
        render(<ScanQrCode />);
        onScanResult(rawQrBackup);
        user = newUser();
      });

      it('should show error if password is incorrect', async () => {
        const passwordField = await screen.findByLabelText(/Wallet password/);
        await user.type(passwordField, 'incorrect-password');
        await user.click(await screen.findByRole('button', { name: /Continue/ }));

        expect(await screen.findByText(/Password incorrect/)).toBeInTheDocument();
      });

      it('should call onWalletSetup after import completed', async () => {
        const passwordField = await screen.findByLabelText(/Wallet password/);
        await user.type(passwordField, PASSWORD);
        await user.click(await screen.findByRole('button', { name: /Continue/ }));

        expect(await screen.findByText(/Wallet imported/)).toBeInTheDocument();
        expect(onWalletSetup).toBeCalled();
      });

      it('should show ScanQrCode screen on go back', async () => {
        expect(await screen.findByText(/Import wallet/)).toBeInTheDocument();
        await user.click(await screen.findByRole('button', { name: /Back/ }));
        expect(await screen.findByText(/Scan QR Code/)).toBeInTheDocument();
      });
    });
  });

  describe('ImportJsonFile', () => {
    beforeEach(() => {
      render(<ImportJsonFile />);
    });
    describe('JsonFileReader', () => {
      it('should render JsonFileReader correctly', async () => {
        expect(await screen.findByText(/Import JSON File/)).toBeInTheDocument();
        expect(await screen.findByText(/Click to select or drag and drop the file here/)).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: /Back/ })).toBeInTheDocument();
      });

      it('should throw error if JSON file is invalid', async () => {
        const invalidFile = new File(['invalid'], 'invalid.json');
        const inputFile = new Array(invalidFile);
        onReadResult(inputFile);

        expect(await screen.findByText(/Unknown\/Invalid JSON File/)).toBeInTheDocument();
      });

      it('should show TransferWalletBackup if JSON file is valid', async () => {
        const keyring = await initializeKeyring();
        const backup = await keyring.exportWallet(PASSWORD);

        const validFile = new File([JSON.stringify(backup)], 'valid.json');
        const inputFile = new Array(validFile);
        onReadResult(inputFile);

        await expectTransferWalletBackup(screen);
      });
    });
  });
});

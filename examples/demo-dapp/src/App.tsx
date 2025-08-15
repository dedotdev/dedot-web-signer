import { useState } from 'react';
import { useAsync } from 'react-use';
import { DedotClient, WsProvider } from 'dedot';
import { DedotSignerSdk } from '@dedot/signer-sdk';
import './App.css';

// Utility function to truncate long addresses for mobile display
const truncateAddress = (address: string, startChars = 6, endChars = 4): string => {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

// Copy to clipboard function
const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

const useApi = (): [boolean, DedotClient | undefined] => {
  const [ready, setReady] = useState<boolean>(false);
  const [client, setClient] = useState<DedotClient>();

  useAsync(async () => {
    setClient(await DedotClient.new(new WsProvider('wss://rpc.polkadot.io')));
    setReady(true);
  }, []);

  return [ready, client];
};

const sdk = new DedotSignerSdk({ walletUrl: 'http://localhost:3030'});
await sdk.initialize();

export default function App() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [injector, setInjector] = useState<any>();
  const [apiReady, client] = useApi();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const enable = async () => {
    // @ts-ignore
    const dedotSigner = window['injectedWeb3']['dedot-signer'];
    const response = await dedotSigner.enable('Sample Dapp');
    const approvedAccounts = await response.accounts.get();
    console.log(dedotSigner);
    console.log(response);
    console.log(approvedAccounts);
    setInjector(response);
    setAccounts(approvedAccounts);
  };

  const disconnect = async () => {
    // @ts-ignore
    const dedotSigner = window['injectedWeb3']['dedot-signer'];
    console.log(dedotSigner);
    dedotSigner.disable();
    setInjector(undefined);
    setAccounts([]);
  }

  const handleCopyAddress = async (address: string) => {
    await copyToClipboard(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000); // Clear after 2 seconds
  };

  const transferToken = async (from: string) => {
    if (!client) {
      return;
    }

    await sdk.newWaitingWalletInstance();

    client.tx.balances
      .transferKeepAlive('5C5555yEXUcmEJ5kkcCMvdZjUo7NGJiQJMS7vZXEeoMhj3VQ', 123_456n)
      .signAndSend(from, { signer: injector.signer }, (status) => {
        console.log(status);
      });
  };

  return (
    <div className='App'>
      <h1>Sample Dapp</h1>
      <div className='card'>
        {accounts.length === 0 ? (
          <button className='connect-btn' onClick={() => enable()}>
            Connect Wallet
          </button>
        ) : (
          <div className='connected-section'>
            <p className='account-count'>{accounts.length} account{accounts.length > 1 ? 's' : ''} connected</p>
            <div className='accounts-list'>
              {accounts.map((one) => (
                <div key={one.address} className='account-item'>
                  <div className='account-info'>
                    <div className='account-name'>{one.name}</div>
                    <div className='address-container'>
                      <span className='address-full'>{one.address}</span>
                      <span className='address-mobile'>{truncateAddress(one.address)}</span>
                      <button 
                        className='copy-btn'
                        onClick={() => handleCopyAddress(one.address)}
                        title='Copy address'
                      >
                        {copiedAddress === one.address ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>
                  <button 
                    className='transfer-btn' 
                    disabled={!apiReady} 
                    onClick={() => transferToken(one.address)}
                  >
                    Transfer
                  </button>
                </div>
              ))}
            </div>

            <button className='disconnect-btn' onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

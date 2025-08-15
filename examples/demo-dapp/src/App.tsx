import { useState } from 'react';
import { useAsync } from 'react-use';
import { DedotClient, WsProvider } from 'dedot';
import { DedotSignerSdk } from '@dedot/signer-sdk';
import './App.css';

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
          <button onClick={() => enable()}>
            Connect Wallet
          </button>
        ) : (
          <div>
            <p>{accounts.length} accounts connected</p>
            <ul>
              {accounts.map((one) => (
                <li key={one.address}>
                  <span>
                    {one.name} - {one.address}
                  </span>
                  <button disabled={!apiReady} onClick={() => transferToken(one.address)}>
                    Transfer
                  </button>
                </li>
              ))}
            </ul>

            <button onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

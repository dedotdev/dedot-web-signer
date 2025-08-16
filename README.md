> [!NOTE]
> We're in the process of rebranding Coong Wallet to Dedot Signer, information in this repo might be conflicted or confusing.

<br/>
<p align="center">
  <img height="100" alt="dedot-logo-dark" src="https://github.com/user-attachments/assets/61d34e96-80b6-455c-8cc9-365e397e89bb" />
</p>

<h1 align="center">
Dedot Signer
</h1>

<p align="center">
A website-based multi-chain crypto wallet & signer for <a href="https://polkadot.network/">Polkadot</a>
<p>

<p align="center">
<a href="https://signer.dedot.dev">Signer App</a>
|
<a href="https://try.dedot.dev">Example Dapp</a>
<p>

<p align="center">
  <img src="https://img.shields.io/github/license/dedotdev/dedot-web-signer?style=flat-square"/>
  <img src="https://img.shields.io/github/actions/workflow/status/dedotdev/dedot-web-signer/run-tests.yml?style=flat-square"/>
  <img src="https://img.shields.io/github/package-json/v/dedotdev/dedot-web-signer?filename=packages%2Fui%2Fpackage.json&style=flat-square"/>
</p>

<p align="center">
  <img width="479" src="https://user-images.githubusercontent.com/6867026/227230786-0796214a-3e3f-42af-94e9-d4122c730b62.png">
</p>

## What to expect from Dedot Signer (formerly Coong Wallet)?
- No need for extra steps to install browser extensions or mobile apps, Dedot Signer is just a website running on your browser
- Works on both desktop and mobile devices
- Compatible with [Polkadot.js extension](https://github.com/polkadot-js/extension) API, [integrate Dedot Signer](#integrate-dedot-signer-into-your-dapps) into your dapp within just a few steps
- One seed phrase to recover all created accounts (excluding imported accounts/private keys)
- Private keys and seed phrase are encrypted with a user chosen wallet password

## Demo videos on Wallet x Dapp interactions
- Desktop: https://youtu.be/9fIcAlpx_UI
- Mobile: https://youtu.be/F8S2fmQFRWQ

## Set up development environment
1. Install NodeJS
2. Install dependencies: `yarn install`
3. Start the development server: `yarn start`
4. We can now access the local application at: `http://localhost:3030`
  
## Run it on Docker
1. Make sure you have [Docker](https://docs.docker.com/get-docker/) installed
2. Build an image of the wallet: `docker build -t dedot-signer .`
3. Run it: `docker run -dp 3030:3030 dedot-signer`
  
## Integrate Dedot Signer into your dapps
1. Install `@dedot/signer-sdk` to your dapp:
```bash
# via yarn
yarn add @dedot/signer-sdk
  
# via npm
npm install --save @dedot/signer-sdk
```  
2. Inject API & interact with Dedot Signer using the [Polakdot{.js} extension API](https://github.com/polkadot-js/extension#injection-information)
```typescript
import DedotSignerSdk from '@dedot/signer-sdk';

// Inject Dedot Signer API
const initializeDedotSigner = async () => {  
  const sdk = new DedotSignerSdk()
  await sdk.initialize();
  
  return sdk;
}
  
await initializeDedotSigner();

// We can now interact with the wallet using the similar Polkadot{.js} extension API
const connectDedotSigner = async () => {
  const injected = await window['injectedWeb3']['dedot-signer'].enable('Awesome Dapp');
  const connectedAccounts = await injected.accounts.get();
  
  return { injected, connectedAccounts }
} 

await connectDedotSigner();
```

3. Add/remove connected accounts
```ts
// Initilize wallet
const { injected } = await connectDedotSigner();

// This will open a Dedot Signer window allowing users
// to add/remove accounts connecting to dapp
const updatedAccounts = await injected.accounts.update();
```

4. Sign out & clear up connected accounts
```ts
const signOut = () => {
  window['injectedWeb3']['dedot-signer'].disable();
}

signOut();
```

Notes:
- By default, the SDK will connect to Dedot Signer at the offical URL `https://signer.dedot.dev`.
- You can also connect to a different URL of the wallet by customizing SDK options:
```typescript
  const sdk = new DedotSignerSdk({ walletUrl: 'https://signer.example.dev' });
  await sdk.initialize();  
```

## Injection Information
After running initialization (via `initialize()`), the SDK will inject `injectedWeb3` into the `window` global object exposing the following:

```ts
// Reference: https://github.com/polkadot-js/extension#injection-information

window.injectedWeb3 = {
  // this is the name of this wallet, there could be multiples injected,
  // each with their own keys, here `dedotsigner` is for this wallet
  'dedot-signer': {
    // semver of the wallet
    version: '0.1.0',

    // call this to enable the injection, and returns an injected
    // object containing the accounts, signer (or it will reject if not authorized)
    enable (originName: string): Promise<Injected>,
    
    // call this to sign out and clear up all connected accounts
    disable (): void
  }
}
```

## Injected API
The `Injected` API, as returned after calling `enable(originName)`, contains the following information:

```ts
// Reference: https://github.com/polkadot-js/extension#api-interface

interface Injected {
  // the interface for Accounts, as detailed below
  readonly accounts: Accounts;
  // the standard Signer interface for the API, as detailed below
  readonly signer: DedotSigner;
}

// exposes accounts
interface Accounts {
  // retrieves the list of connected accounts
  get: () => Promise<InjectedAccount[]>;
  // subscribe to all accounts, updating as they change
  subscribe: (cb: (accounts: Account[]) => any) => () => void
  // [NEW] asking for updating connected accounts
  update: () => Promise<InjectedAccount[]>
}

// a signer that communicates with the extension via sendMessage
interface DedotSigner extends SignerInterface {
  // signs an extrinsic payload from a serialized form
  signPayload?: (payload: SignerPayloadJSON) => Promise<SignerResult>;
  // signs a raw payload, only the bytes data as supplied
  signRaw?: (raw: SignerPayloadRaw) => Promise<SignerResult>;
}

interface InjectedAccount {
  // ss-58 encoded address
  readonly address: string;
  // the genesisHash for this account (empty if applicable to all)
  readonly genesisHash?: string;
  // (optional) name for display
  readonly name?: string;
  // Keypair type: 'ed25519' | 'sr25519' | 'ecdsa' | 'ethereum'
  readonly type?: string;
};
```

## Prevent Blocking Popups Issue

Dedot Signer SDK uses `window.open` to fire up Dedot Signer windows/popups allowing users to interact with the wallet (e.g: Request to access wallet accounts, request to sign a transaction...), browsers might block this open popup API depending on various reasons. Below is a few practices to help prevent this blocking popups issue from happening.

1. Call APIs that opens a wallet popup from a user interaction (clicks/touches)
```ts
// initialize Dedot Signer API
const sdk = new DedotSignerSdk()
await sdk.initialize();

// Trigger connect to Dedot Signer when users hit the connect button
const onClickConnectWallet = async () => {
  await window['injectedWeb3']['dedot-signer'].enable('Awesome Dapp');
}
```
2. For actions that might take time (asynchronously) to complete (transfer balance ...), launch a waiting wallet instance (`DedotSignerSdk.newWaitingWalletInstance()`) first thing on user interaction.  
```ts
// Connect to Polkadot Network
const client = await DedotClient.new(new WsProvider('wss://rpc.polkadot.io'));

// initialize Dedot Signer API
const sdk = new DedotSignerSdk()
await sdk.initialize();

// connect to Dedot Signer
const injected = await window['injectedWeb3']['dedot-signer'].enable('Awesome Dapp');

const onClickTransferBalance = async () => {
  // Launch a waiting wallet instance first thing when user clicking the Transfer button
  // The signer will then later a send message to this wallet instance to asking for signing transaction
  await sdk.newWaitingWalletInstance();
  
  const fromAddress = 0x000...;
  const destinationAddress = 0x000...;
  
  const hash = await client.tx.balances
    .transferKeepAlive(destinationAddress, 1_000_000_000_000n)
    .signAndSend(fromAddress, { signer: injected.signer });
}

await onClickTransferBalance();
```

Integration example can be found in the playground dapp source code in [this repository](https://github.com/dedotdev/trydedot).

## How to run tests
1. [Set up the development environment](#set-up-development-environment).
2. Simply run `yarn test` to trigger testing for all packages
   
## License

[Apache 2.0](https://github.com/dedotdev/dedot-web-signer/blob/main/LICENSE)
  
  
  

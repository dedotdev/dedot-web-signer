import type { InjectedAccount } from '@polkadot/extension-inject/types';
import type { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import type { HexString } from '@polkadot/util/types';

export type MessageId = `dedot-signer/${string}`;

export interface RequestAppRequestAccess {
  appName: string;
}

export enum AccessStatus {
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
}

export interface ResponseSigning {
  id: string;
  signature: HexString;
}

export interface ResponseAppRequestAccess {
  result: AccessStatus;
  authorizedAccounts: InjectedAccount[];
}

// RequestName: [RequestBody, ResponseBody]
export interface RequestSignatures {
  'tab/requestAccess': [RequestAppRequestAccess, ResponseAppRequestAccess];
  'tab/updateAccess': [undefined, ResponseAppRequestAccess];
  'tab/signRaw': [SignerPayloadRaw, ResponseSigning];
  'tab/signExtrinsic': [SignerPayloadJSON, ResponseSigning];
}

export type RequestName = keyof RequestSignatures;

export interface WalletRequest<TRequestName extends RequestName = RequestName> {
  name: TRequestName;
  body?: RequestSignatures[TRequestName][0];
}

export type WalletResponse<TRequestName extends RequestName = RequestName> = RequestSignatures[TRequestName][1];

export enum MessageType {
  SIGNAL = 'SIGNAL',
  REQUEST = 'REQUEST',
  RESPONSE = 'RESPONSE',
}

export enum WalletSignal {
  WALLET_TAB_INITIALIZED = 'WALLET_TAB_INITIALIZED',
  WALLET_TAB_UNLOADED = 'WALLET_TAB_UNLOADED',
}

export const WalletSignals = Object.values(WalletSignal) as string[];

export interface WalletMessage {
  id: MessageId;
  type: MessageType;
  origin: string; // where the message was sending from
}

export interface WalletRequestMessage<TRequestName extends RequestName = RequestName> extends WalletMessage {
  request: WalletRequest<TRequestName>;
}

export interface WalletResponseMessage<TRequestName extends RequestName = RequestName> extends WalletMessage {
  response?: WalletResponse<TRequestName>;
  error?: string;
}

export interface WalletSignalMessage extends WalletMessage {
  signal: WalletSignal;
  walletInfo: WalletInfo;
}

interface Resolver<T> {
  reject: (error: Error) => void;
  resolve: (result: T) => void;
}

export interface WalletRequestWithResolver<TRequestName extends RequestName = RequestName>
  extends Resolver<WalletResponse<TRequestName>>,
    WalletRequestMessage<TRequestName> {}

export interface NetworkInfo {
  networkId: string;
  displayName: string;
  prefix: number;
}

export interface WalletInfo {
  name: string;
  version: string;
  instanceId: string;
}

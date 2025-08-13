import { newWalletRequest } from '@dedot/signer-base';
import { RequestName } from '@dedot/signer-base/types';
import { AccountInfo } from '@dedot/signer-keyring/types';
import { DedotSignerError, ErrorCode, StandardDedotSignerError } from '@dedot/signer-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import TabHandler from '../TabHandler';
import { newWalletState, PASSWORD, setupAuthorizedApps } from './setup';

let tabHandler: TabHandler, currentWindowOrigin: string, account01: AccountInfo;

const initTabHandler = async () => {
  const state = await newWalletState();
  tabHandler = new TabHandler(state);
};

beforeEach(async () => {
  if (tabHandler) {
    await tabHandler.state.keyring.reset();
  }

  localStorage.clear();

  await initTabHandler();
  account01 = await tabHandler.state.keyring.createNewAccount('Account 01', PASSWORD);
  currentWindowOrigin = window.location.origin;
});

describe('handle', () => {
  it('should throw error if request is not supported', async () => {
    setupAuthorizedApps(tabHandler.state, [account01.address], currentWindowOrigin);

    await expect(
      tabHandler.handle(
        newWalletRequest({
          // @ts-ignore
          name: 'tab/unsupportedRequest',
        }),
      ),
    ).rejects.toThrowError(new DedotSignerError(ErrorCode.UnknownRequest));
  });

  it.each(['tab/signRaw', 'tab/signExtrinsic', 'tab/updateAccess'])(
    'should check for app authorization if request is `%s`',
    async (requestName) => {
      await expect(
        tabHandler.handle({
          ...newWalletRequest({
            name: requestName as RequestName,
            // @ts-ignore
            body: {},
          }),
          origin: currentWindowOrigin,
        }),
      ).rejects.toThrowError(
        new StandardDedotSignerError(`The app at ${currentWindowOrigin} has not been authorized yet!`),
      );
    },
  );

  it.each([
    {
      requestName: 'tab/signRaw',
      body: (account: AccountInfo) => ({
        address: account.address,
      }),
    },
    {
      requestName: 'tab/signExtrinsic',
      body: (account: AccountInfo) => ({
        address: account.address,
      }),
    },
    { requestName: 'tab/updateAccess', body: () => undefined },
  ])('should throw error if the app is not authorized to access any accounts', async ({ requestName, body }) => {
    setupAuthorizedApps(tabHandler.state, [], currentWindowOrigin);

    await expect(
      tabHandler.handle({
        ...newWalletRequest({
          name: requestName as RequestName,
          // @ts-ignore
          body: body(account01),
        }),
        origin: currentWindowOrigin,
      }),
    ).rejects.toThrowError(
      new StandardDedotSignerError(`The app at ${currentWindowOrigin} has not been authorized to access any accounts!`),
    );
  });

  it('should not check for app authorization if request is tab/requestAccess', async () => {
    await expect(
      Promise.all([
        tabHandler.handle({
          ...newWalletRequest({
            name: 'tab/requestAccess',
            body: {
              appName: 'Random name',
            },
          }),
          origin: currentWindowOrigin,
        }),
        new Promise<void>((resolve) => {
          tabHandler.state.approveRequestAccess([account01.address]);
          resolve();
        }),
      ]),
    ).resolves.toBeDefined();
  });

  it.each(['tab/signRaw', 'tab/signExtrinsic'])(
    'should throw error if the target address is not authorized to access by the app when perform signing',
    async (requestName) => {
      const account02 = await tabHandler.state.keyring.createNewAccount('Account 02', PASSWORD);

      setupAuthorizedApps(tabHandler.state, [account01.address], currentWindowOrigin);

      await expect(
        tabHandler.handle({
          ...newWalletRequest({
            name: requestName as RequestName,
            // @ts-ignore
            body: {
              address: account02.address,
            },
          }),
          origin: currentWindowOrigin,
        }),
      ).rejects.toThrowError(
        new StandardDedotSignerError(
          `The app at ${currentWindowOrigin} is not authorized to access account with address ${account02.address}!`,
        ),
      );
    },
  );

  it.each([
    {
      name: 'tab/requestAccess',
      body: () => ({
        appName: 'Random name',
      }),
    },
    {
      name: 'tab/signRaw',
      body: (account: AccountInfo) => ({
        address: account.address,
      }),
    },
    {
      name: 'tab/signExtrinsic',
      body: (account: AccountInfo) => ({
        address: account.address,
      }),
    },
    {
      name: 'tab/updateAccess',
      body: () => undefined,
    },
  ])('should register the message to wallet state for request $name', ({ name, body }) => {
    if (name !== 'tab/requestAccess') {
      setupAuthorizedApps(tabHandler.state, [account01.address], currentWindowOrigin);
    }

    tabHandler.handle({
      ...newWalletRequest({
        name: name as RequestName,
        body: body(account01) as any,
      }),
      origin: currentWindowOrigin,
    });

    expect(tabHandler.state.getCurrentRequestMessage(name as RequestName)).toBeTruthy();
  });
});

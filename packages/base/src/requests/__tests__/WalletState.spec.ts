import { newWalletRequest } from '@dedot/signer-base';
import { AccessStatus, WalletRequestMessage, WalletResponse } from '@dedot/signer-base/types';
import { AccountInfo } from '@dedot/signer-keyring/types';
import { DedotSignerError, ErrorCode, StandardDedotSignerError, trimOffUrlProtocol } from '@dedot/signer-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WalletState, { AppInfo, AUTHORIZED_ACCOUNTS_KEY, AuthorizedApps } from '../WalletState';
import { newWalletState, PASSWORD, pick, RANDOM_APP_URL, setupAuthorizedApps } from './setup';

const INJECTED_ACCOUNT_PROPS = ['address', 'genesisHash', 'name', 'type'];
let state: WalletState, account01: AccountInfo;

beforeEach(async () => {
  if (state) {
    if (state.keyring) {
      await state.keyring.reset();
    }

    // @ts-ignore
    state = undefined;
  }

  localStorage.clear();

  await initWalletState();

  account01 = await state.keyring.createNewAccount('Account 01', PASSWORD);
});

const initWalletState = async () => {
  state = await newWalletState();
};

describe('extractAppId', () => {
  it('should raise error if url protocol is not supported', async () => {
    expect(() => state.extractAppId('ftp://example.com')).toThrowError(/Invalid url/);
  });

  it.each([
    { url: 'https://example.com/path', expected: 'example.com/path' },
    { url: 'http://example.com/path', expected: 'example.com/path' },
  ])('should return app id without url protocol ($url -> $expected)', async ({ url, expected }) => {
    expect(state.extractAppId(url)).toEqual(expected);
  });
});

describe('getAuthorizedApp', () => {
  it('should throw error if app has not been authorized', async () => {
    expect(() => state.getAuthorizedApp(RANDOM_APP_URL)).toThrowError(
      new StandardDedotSignerError(`The app at ${RANDOM_APP_URL} has not been authorized yet!`),
    );
  });

  describe('when the app is authorized', () => {
    it('should return app info if input is app url', async () => {
      const { randomAppInfo } = setupAuthorizedApps(state, [account01.address]);

      expect(state.getAuthorizedApp(RANDOM_APP_URL)).toEqual(randomAppInfo);
    });

    it('should return app info if input is app id', async () => {
      const { randomAppInfo } = setupAuthorizedApps(state, [account01.address]);

      expect(state.getAuthorizedApp(trimOffUrlProtocol(RANDOM_APP_URL))).toEqual(randomAppInfo);
    });
  });
});

describe('getAuthorizedApps', () => {
  it('should return empty list', () => {
    expect(state.getAuthorizedApps()).toEqual([]);
  });

  describe('having authorized dapps', () => {
    let expectedApp: Partial<AppInfo>;
    beforeEach(() => {
      setupAuthorizedApps(state, [account01.address]);
      expectedApp = {
        name: 'Random App',
        authorizedAccounts: [account01.address],
        url: RANDOM_APP_URL,
      };
    });

    it('should return list of authorized dapps', () => {
      expect(state.getAuthorizedApps()).toMatchObject([expectedApp]);
    });

    it('should return list of authorized dapps to ', () => {
      expect(state.getAuthorizedAppsToAccount(account01.address)).toMatchObject([expectedApp]);
    });
  });
});

describe('removeAllAuthorizedApps', () => {
  it('should remove all authorized apps', () => {
    setupAuthorizedApps(state);
    state.removeAllAuthorizedApps();
    expect(state.getAuthorizedApps()).toEqual([]);
    expect(localStorage.getItem(AUTHORIZED_ACCOUNTS_KEY)).toEqual('{}');
  });
});

describe('saveAuthorizedApp', () => {
  it('should save app info', () => {
    setupAuthorizedApps(state);

    const appInfo = state.getAuthorizedApp(RANDOM_APP_URL);

    appInfo.authorizedAccounts = [...appInfo.authorizedAccounts, 'Account 02', 'Account 03'];

    state.saveAuthorizedApp(appInfo);

    const newAppInfo = state.getAuthorizedApp(RANDOM_APP_URL);

    expect(newAppInfo.authorizedAccounts).toContain('Account 02');
    expect(newAppInfo.authorizedAccounts).toContain('Account 03');

    expect(localStorage.getItem(AUTHORIZED_ACCOUNTS_KEY)).toMatch(/"authorizedAccounts":\["Account 02","Account 03"\]/);
  });
});

describe('removeAuthorizedApp', () => {
  it('should remove an app', () => {
    setupAuthorizedApps(state);

    expect(state.getAuthorizedApp(RANDOM_APP_URL)).toBeTruthy();

    state.removeAuthorizedApp(state.extractAppId(RANDOM_APP_URL));

    expect(() => state.getAuthorizedApp(RANDOM_APP_URL)).toThrowError(
      new StandardDedotSignerError(`The app at ${RANDOM_APP_URL} has not been authorized yet!`),
    );
    expect(localStorage.getItem(AUTHORIZED_ACCOUNTS_KEY)).toEqual('{}');
  });
});

describe('remove access to account', () => {
  let app1Id: string, app2Id: string;
  beforeEach(async () => {
    const account02 = await state.keyring.createNewAccount('Account 02', PASSWORD);

    const app1Url = 'https://app1.com';
    const app2Url = 'https://app2.com';
    app1Id = trimOffUrlProtocol(app1Url);
    app2Id = trimOffUrlProtocol(app2Url);

    const authorizedApps: AuthorizedApps = {
      [app1Id]: {
        id: app1Id,
        url: app1Url,
        authorizedAccounts: [account01.address, account02.address],
        name: 'App 1',
        createdAt: Date.now(),
      },
      [app2Id]: {
        id: app2Id,
        url: app2Url,
        authorizedAccounts: [account01.address, account02.address],
        name: 'App 2',
        createdAt: Date.now(),
      },
    };

    localStorage.setItem(AUTHORIZED_ACCOUNTS_KEY, JSON.stringify(authorizedApps));
    state.reloadState();
  });

  it('removeAllAccessToAccount', async () => {
    state.removeAllAccessToAccount(account01.address);

    expect(state.getAuthorizedApp(app1Id).authorizedAccounts).not.toContain(account01.address);
    expect(state.getAuthorizedApp(app1Id).authorizedAccounts).not.toContain(account01.address);
  });

  it('removeAppAccessToAccount', () => {
    state.removeAppAccessToAccount(app1Id, account01.address);

    expect(state.getAuthorizedApp(app1Id).authorizedAccounts).not.toContain(account01.address);
  });
});

describe('injectedAccounts', () => {
  let account02: AccountInfo;
  beforeEach(async () => {
    account02 = await state.keyring.createNewAccount('Account 02', PASSWORD);
  });

  describe('getInjectedAccounts', () => {
    it('should return all injected accounts', async () => {
      const accounts = await state.getInjectedAccounts();
      expect(accounts.length).toEqual(2);
      expect(accounts).toEqual([pick(account01, INJECTED_ACCOUNT_PROPS), pick(account02, INJECTED_ACCOUNT_PROPS)]);
    });
  });

  describe('getAuthorizedInjectedAccounts', () => {
    it('should return authorized accounts', async () => {
      setupAuthorizedApps(state, [account01.address]);

      const accounts = await state.getAuthorizedInjectedAccounts(RANDOM_APP_URL);

      expect(accounts.length).toEqual(1);
      expect(accounts).toEqual([pick(account01, INJECTED_ACCOUNT_PROPS)]);
    });
  });
});

describe('ensureAccountAuthorized', () => {
  it('should throw error if application is not authorized', async () => {
    expect(() => state.ensureAccountAuthorized(RANDOM_APP_URL, account01.address)).toThrowError(
      new StandardDedotSignerError(`The app at ${RANDOM_APP_URL} has not been authorized yet!`),
    );
  });

  it('should throw error if address is not authorized for the app', async () => {
    const { randomAppUrl } = setupAuthorizedApps(state);

    expect(() => state.ensureAccountAuthorized(randomAppUrl, account01.address)).toThrowError(
      new StandardDedotSignerError(
        `The app at ${randomAppUrl} is not authorized to access account with address ${account01.address}!`,
      ),
    );
  });

  it('should not throw anything if address is authorized for the app', async () => {
    const { randomAppUrl } = setupAuthorizedApps(state, [account01.address]);

    expect(state.ensureAccountAuthorized(randomAppUrl, account01.address)).toBeUndefined();
  });
});

describe('getCurrentRequestMessage', () => {
  it("should throw error if there's no current message", async () => {
    expect(() => state.getCurrentRequestMessage()).toThrowError(
      new StandardDedotSignerError('No request message available'),
    );
  });

  describe('with current message', () => {
    let currentMessage: WalletRequestMessage;
    beforeEach(() => {
      currentMessage = newWalletRequest({
        name: 'tab/requestAccess',
        body: {
          appName: 'Random App',
        },
      });
      state.newRequestMessage(currentMessage);
    });

    it('should throw error if request name does not match current message', async () => {
      expect(() => state.getCurrentRequestMessage('tab/signExtrinsic')).toThrowError(
        new StandardDedotSignerError('Invalid request name'),
      );
    });

    it('should return current message', async () => {
      expect(state.getCurrentRequestMessage('tab/requestAccess')).toMatchObject(currentMessage);
    });
  });
});

describe('approveRequestAccess', () => {
  it('should throw error if no accounts are authorized', () => {
    const currentMessage = newWalletRequest({
      name: 'tab/requestAccess',
      body: {
        appName: 'Random App',
      },
    });
    state.newRequestMessage(currentMessage);
    expect(state.approveRequestAccess([])).rejects.toThrowError('Please choose at least one account to connect');
  });

  describe('with current message', () => {
    let currentWindowUrl: string, currentMessage: WalletRequestMessage;
    beforeEach(async () => {
      currentWindowUrl = window.location.origin;

      currentMessage = newWalletRequest({
        name: 'tab/requestAccess',
        body: {
          appName: 'Random App',
        },
      });
    });

    const handleRequestAccessApproval = async (authorizedAccounts: string[] = []) => {
      const [response, _] = await Promise.all([
        state.newRequestMessage(currentMessage),
        new Promise<void>((resolve) => {
          state.approveRequestAccess(authorizedAccounts);
          resolve();
        }),
      ]);

      return response as WalletResponse<'tab/requestAccess'>;
    };

    it('should persist new authorized app to storage', async () => {
      await handleRequestAccessApproval([account01.address]);

      const authorizedApps = JSON.parse(localStorage.getItem(AUTHORIZED_ACCOUNTS_KEY) || '{}');
      const appInfo = authorizedApps[currentWindowUrl.split('//')[1]] as AppInfo;
      expect(state.getAuthorizedApp(currentWindowUrl)).toEqual(appInfo);
      expect(appInfo.url).toEqual(currentWindowUrl);
    });

    it('should resolve current request message', async () => {
      const response = await handleRequestAccessApproval([account01.address]);

      expect(response.result).toEqual(AccessStatus.APPROVED);
      expect(response.authorizedAccounts.sort()).toEqual([pick(account01, INJECTED_ACCOUNT_PROPS)].sort());
    });

    it('should override existing authorized accounts', async () => {
      setupAuthorizedApps(state, [account01.address], currentWindowUrl);

      const account02 = await state.keyring.createNewAccount('Account 02', PASSWORD);
      const response = await handleRequestAccessApproval([account02.address]);

      expect(response.result).toEqual(AccessStatus.APPROVED);
      expect(response.authorizedAccounts.sort()).toEqual([pick(account02, INJECTED_ACCOUNT_PROPS)].sort());
    });
  });
});

describe('rejectRequestAccess', () => {
  it('should reject current request message', async () => {
    const currentMessage = newWalletRequest({
      name: 'tab/requestAccess',
      body: {
        appName: 'Random App',
      },
    });

    await expect(
      Promise.all([
        state.newRequestMessage(currentMessage),
        new Promise<void>((resolve) => {
          state.rejectRequestAccess();
          resolve();
        }),
      ]),
    ).rejects.toThrowError(new StandardDedotSignerError(AccessStatus.DENIED));
  });
});

describe('approveUpdateAccess', () => {
  let currentWindowUrl: string, currentMessage: WalletRequestMessage, account02: AccountInfo;
  beforeEach(async () => {
    currentWindowUrl = window.location.origin;

    currentMessage = newWalletRequest({
      name: 'tab/updateAccess',
    });

    account02 = await state.keyring.createNewAccount('Account 02', PASSWORD);
  });

  describe('app is not authorized', () => {
    it('should throw error', () => {
      state.newRequestMessage(currentMessage);
      expect(state.approveUpdateAccess([])).rejects.toThrowError(
        `The app at ${currentWindowUrl} has not been authorized yet!`,
      );
    });
  });

  describe('app is authorized', () => {
    beforeEach(() => {
      setupAuthorizedApps(state, [account01.address], currentWindowUrl);
    });

    it('should throw error if no accounts are authorized', () => {
      state.newRequestMessage(currentMessage);
      expect(state.approveUpdateAccess([])).rejects.toThrowError('Please choose at least one account to connect');
    });

    describe('with current message', () => {
      const handleUpdateAccessApproval = async (authorizedAccounts: string[] = []) => {
        const [response, _] = await Promise.all([
          state.newRequestMessage(currentMessage),
          new Promise<void>((resolve) => {
            state.approveUpdateAccess(authorizedAccounts);
            resolve();
          }),
        ]);

        return response as WalletResponse<'tab/updateAccess'>;
      };

      it('should persist new authorized app to storage', async () => {
        await handleUpdateAccessApproval([account02.address]);

        const authorizedApps = JSON.parse(localStorage.getItem(AUTHORIZED_ACCOUNTS_KEY) || '{}');
        const appInfo = authorizedApps[currentWindowUrl.split('//')[1]] as AppInfo;
        expect(state.getAuthorizedApp(currentWindowUrl)).toEqual(appInfo);
        expect(appInfo.url).toEqual(currentWindowUrl);
      });

      it('should resolve current request message', async () => {
        const response = await handleUpdateAccessApproval([account01.address]);

        expect(response.result).toEqual(AccessStatus.APPROVED);
        expect(response.authorizedAccounts.sort()).toEqual([pick(account01, INJECTED_ACCOUNT_PROPS)].sort());
      });

      it('should override existing authorized accounts', async () => {
        const response = await handleUpdateAccessApproval([account02.address]);

        expect(response.result).toEqual(AccessStatus.APPROVED);
        expect(response.authorizedAccounts.sort()).toEqual([pick(account02, INJECTED_ACCOUNT_PROPS)].sort());
      });
    });
  });
});

describe('rejectUpdateAccess', () => {
  it('should reject current request message', async () => {
    const currentMessage = newWalletRequest({
      name: 'tab/updateAccess',
    });

    await expect(
      Promise.all([
        state.newRequestMessage(currentMessage),
        new Promise<void>((resolve) => {
          state.rejectUpdateAccess();
          resolve();
        }),
      ]),
    ).rejects.toThrowError(new StandardDedotSignerError(AccessStatus.DENIED));
  });
});

describe('sign extrinsic', () => {
  beforeEach(async () => {
    setupAuthorizedApps(state, [account01.address], window.location.origin);
  });

  const newSignExtrinsicRequest = (address: string) => {
    return newWalletRequest({
      name: 'tab/signExtrinsic',
      // @ts-ignore
      body: newPayload(address),
    });
  };

  const newPayload = (address: string) => {
    return {
      specVersion: '0x00002490',
      transactionVersion: '0x00000013',
      address,
      blockHash: '0x740c0ff582a5f5ed089a83afe396be64db42486397ee23611811e123a70bd63f',
      blockNumber: '0x00dd836d',
      era: '0xd502',
      genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      method: '0x050000004769bbe59968882c1597ec1151621f0193547285125f1c1337371c013ff61f02890700',
      nonce: '0x00000000',
      signedExtensions: [
        'CheckNonZeroSender',
        'CheckSpecVersion',
        'CheckTxVersion',
        'CheckGenesis',
        'CheckMortality',
        'CheckNonce',
        'CheckWeight',
        'ChargeTransactionPayment',
        'PrevalidateAttests',
      ],
      tip: '0x00000000000000000000000000000000',
      version: 4,
    };
  };

  describe('approveSignExtrinsic', () => {
    const handleSignExtrinsicApproval = async (address: string, password: string) => {
      const message = newSignExtrinsicRequest(address);
      let [response, _] = await Promise.all([
        state.newRequestMessage(message),
        new Promise<void>(async (resolve, reject) => {
          try {
            await state.approveSignExtrinsic(password);
            resolve();
          } catch (e) {
            reject(e);
          }
        }),
      ]);

      response = response as WalletResponse<'tab/signExtrinsic'>;

      return {
        response,
        message,
      };
    };

    it('should throw error if password is not correct', async () => {
      await expect(handleSignExtrinsicApproval(account01.address, 'incorrect-password')).rejects.toThrowError(
        new DedotSignerError(ErrorCode.PasswordIncorrect),
      );
    });

    it('should throw error is keypair is not existed', async () => {
      vi.spyOn(state, 'ensureAccountAuthorized').mockImplementation(() => true);

      await expect(handleSignExtrinsicApproval('0xNotExistedAddress', PASSWORD)).rejects.toThrowError(
        new DedotSignerError(ErrorCode.KeypairNotFound),
      );
    });

    it('should resolve current request message with the signature', async () => {
      const { response, message } = await handleSignExtrinsicApproval(account01.address, PASSWORD);
      expect(response.id).toEqual(message.id);
      expect(response.signature).toBeTypeOf('string');
    });
  });

  describe('cancelSignExtrinsic', () => {
    it('should reject current request message', async () => {
      const message = newSignExtrinsicRequest(account01.address);
      await expect(
        Promise.all([
          state.newRequestMessage(message),
          new Promise<void>((resolve) => {
            state.cancelSignExtrinsic();
            resolve();
          }),
        ]),
      ).rejects.toThrowError(new StandardDedotSignerError('Cancelled'));
    });
  });
});

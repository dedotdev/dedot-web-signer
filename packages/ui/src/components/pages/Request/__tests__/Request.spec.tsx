import React from 'react';
import { AccountInfo } from '@dedot/signer-keyring/types';
import { initializeKeyring, PASSWORD, render, RouterWrapper, screen } from '__tests__/testUtils';
import { expect, Mock, vi } from 'vitest';
import Request from '../index';

beforeEach(() => {
  vi.spyOn(window, 'close').mockImplementation(() => vi.fn());
  vi.spyOn(console, 'error').mockImplementation(() => vi.fn());
});

describe('Request', () => {
  describe('open directly / not via window.open', () => {
    beforeEach(() => {
      window.opener = null;
    });

    it('should show error', async () => {
      render(
        <RouterWrapper path='/request' currentUrl='/request?message={}'>
          <Request />
        </RouterWrapper>,
      );
      expect(await screen.findByText(/Invalid request/)).toBeInTheDocument();
      expect(await screen.findByText(/Unknown request origin/)).toBeInTheDocument();
    });
  });

  describe('open via window.open', () => {
    let postMessage: Mock, account01: AccountInfo;
    beforeEach(async () => {
      const keyring = await initializeKeyring();
      account01 = await keyring.createNewAccount('Account 01', PASSWORD);
      postMessage = vi.fn();
      window.opener = { postMessage };
    });

    it('should show error if the message has invalid format', async () => {
      render(
        <RouterWrapper path='/request' currentUrl='/request?message={}'>
          <Request />
        </RouterWrapper>,
      );
      expect(await screen.findByText(/Invalid request/)).toBeInTheDocument();
      expect(await screen.findByText(/Invalid message format/)).toBeInTheDocument();
    });
  });
});

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import { configure } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

configure({
  asyncUtilTimeout: 5_000,
});

beforeAll(() => {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });

  // Mock scrollIntoView for JSDOM
  Element.prototype.scrollIntoView = vi.fn();
});

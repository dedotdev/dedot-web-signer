import { trimOffUrlProtocol } from '@dedot/signer-utils';

// Ref: https://gist.github.com/alirezas/c4f9f43e9fe1abba9a4824dd6fc60a55
export function fadeOut(el: HTMLElement | null) {
  if (!el) {
    return;
  }

  // @ts-ignore
  el.style.opacity = 1;

  (function fade() {
    // @ts-ignore
    if ((el.style.opacity -= 0.03) < 0) {
      el.style.display = 'none';
    } else {
      requestAnimationFrame(fade);
    }
  })();
}

export function appFaviconUrl(appUrl: string): string {
  return `https://icon.horse/icon/${trimOffUrlProtocol(appUrl)}`;
}

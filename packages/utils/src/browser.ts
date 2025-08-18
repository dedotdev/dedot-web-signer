export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || !window.navigator) {
    return false;
  }

  const userAgent = window.navigator.userAgent || '';
  
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Mobile/i
  ];

  return mobilePatterns.some(pattern => pattern.test(userAgent));
}

export function getOpenInBrowserUrl(): string {
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  if (!currentUrl) {
    return '';
  }

  const isIOS = /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
  const isAndroid = /Android/i.test(window.navigator.userAgent);

  if (isIOS) {
    const safariUrl = currentUrl.replace(/^https?:\/\//, '');
    return `x-safari-https://${safariUrl}`;
  } else if (isAndroid) {
    return `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
  }

  return currentUrl;
}
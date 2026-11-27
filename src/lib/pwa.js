export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  const media = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iosStandalone = window.navigator.standalone === true
  return Boolean(media || iosStandalone)
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isSafariBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|chrome|chromium|android/i.test(ua)
  return isSafari || (isIosDevice() && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua))
}

export function canUseWebShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

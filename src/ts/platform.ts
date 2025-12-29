import { Capacitor } from "@capacitor/core";

export const isTauri: boolean = !!(window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
export const isNodeServer: boolean = !!(globalThis as typeof globalThis & { __NODE__?: boolean }).__NODE__
export const isCapacitor: boolean = Capacitor.isNativePlatform(); // android & ios
export const isWeb: boolean = !isTauri && !isNodeServer && location.hostname === 'risuai.xyz' && !isCapacitor;
export const isMobile: boolean = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);

export const isFirefox: boolean = navigator.userAgent.includes("Firefox")

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua);

  // iPadOS 13+
  const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return isAppleMobile || isIpadOS;
}

export const isInStandaloneMode =
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(navigator as any).standalone ||
    document.referrer.includes("android-app://");

export const googleBuild = false;
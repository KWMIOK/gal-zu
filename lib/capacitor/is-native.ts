import { Capacitor } from "@capacitor/core";

/**
 * True only when running inside the compiled Android/iOS shell (Capacitor
 * WebView), false for regular web browsers — including the desktop/mobile
 * browser used during normal `next dev` / hosted web usage.
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getNativePlatform(): "ios" | "android" | "web" {
  return Capacitor.getPlatform() as "ios" | "android" | "web";
}

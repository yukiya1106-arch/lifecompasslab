/**
 * テーマカラー関連ユーティリティ
 */

import { appConfig } from '../config/appConfig';

/**
 * アプリのテーマカラー(CSS変数)をdocumentElementに適用する関数
 */
export function applyAppTheme(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--app-primary', appConfig.primaryColor);
  document.documentElement.style.setProperty('--app-accent', appConfig.accentColor);
}

/**
 * CSS変数値を取得するヘルパー関数
 * @param varName CSS変数名 (例: '--app-primary', '--app-accent')
 * @param fallback デフォルトフォールバック色
 */
export function getThemeColor(varName: string, fallback?: string): string {
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const computed = window.getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (computed) {
      return computed;
    }
  }
  if (fallback) return fallback;
  if (varName === '--app-primary') return appConfig.primaryColor || '#1e3a8a';
  if (varName === '--app-accent') return appConfig.accentColor || '#2563eb';
  return '#2563eb';
}

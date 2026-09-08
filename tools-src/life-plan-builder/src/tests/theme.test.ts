import { describe, it, expect, vi } from 'vitest';
import { appConfig } from '../config/appConfig';
import { getThemeColor, applyAppTheme } from '../utils/theme';

describe('テーマカラー連携テスト', () => {
  it('1. appConfig の primaryColor と accentColor が定義されていること', () => {
    expect(appConfig.primaryColor).toBeDefined();
    expect(appConfig.accentColor).toBeDefined();
    expect(appConfig.primaryColor.startsWith('#')).toBe(true);
    expect(appConfig.accentColor.startsWith('#')).toBe(true);
  });

  it('2. getThemeColor がフォールバックおよび appConfig の値を正しく取得すること', () => {
    const primary = getThemeColor('--app-primary', '#123456');
    expect(primary).toBe('#123456');

    const primaryNoFallback = getThemeColor('--app-primary');
    expect(primaryNoFallback).toBe(appConfig.primaryColor);

    const accentNoFallback = getThemeColor('--app-accent');
    expect(accentNoFallback).toBe(appConfig.accentColor);
  });

  it('3. DOMが存在する場合にCSS変数からテーマ値を取得すること', () => {
    const mockStyles: Record<string, string> = {
      '--app-primary': '#ff0000',
      '--app-accent': '#8800ff',
    };

    vi.stubGlobal('window', {
      getComputedStyle: () =>
        ({
          getPropertyValue: (prop: string) => mockStyles[prop] || '',
        }) as unknown as CSSStyleDeclaration,
    } as unknown as Window & typeof globalThis);

    vi.stubGlobal('document', {
      documentElement: {} as HTMLElement,
    } as unknown as Document);

    try {
      expect(getThemeColor('--app-primary')).toBe('#ff0000');
      expect(getThemeColor('--app-accent')).toBe('#8800ff');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('4. applyAppTheme() が primaryColor と accentColor を documentElement へ設定すること', () => {
    const setPropertyMock = vi.fn();

    vi.stubGlobal('document', {
      documentElement: {
        style: {
          setProperty: setPropertyMock,
        },
      } as unknown as HTMLElement,
    } as unknown as Document);

    try {
      applyAppTheme();
      expect(setPropertyMock).toHaveBeenCalledWith('--app-primary', appConfig.primaryColor);
      expect(setPropertyMock).toHaveBeenCalledWith('--app-accent', appConfig.accentColor);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('5. DOMがない場合(documentがundefined)でも applyAppTheme() が例外にならないこと', () => {
    vi.stubGlobal('document', undefined);

    try {
      expect(() => applyAppTheme()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

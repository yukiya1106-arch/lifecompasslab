/**
 * アプリケーション設定ファイル
 * 
 * アプリ名、サブタイトル、テーマカラー、フッターテキスト等を1箇所で変更できます。
 * 他の利用者がコピー/リミックスして自分用にカスタマイズする際の中心となるファイルです。
 */

export interface AppConfig {
  appName: string;
  appNameAccent: string;
  tagline: string;
  description: string;
  primaryColor: string; // メインカラー（濃紺など）
  accentColor: string;  // アクセントカラー（明るいブルーなど）
  footerText: string;
  currencyUnit: string; // 金額単位（「万円」など）
  startYear: number;    // シミュレーション開始年（自動取得のデフォルト年）
  
  // 各入力ステップの有効/無効フラグ
  visibleSteps: {
    basic: boolean;
    income: boolean;
    living: boolean;
    education: boolean;
    currentHousing: boolean;
    futureHousing: boolean;
    assets: boolean;
    investment: boolean;
    dc: boolean;
    oneOff: boolean;
  };
}

export const appConfig: AppConfig = {
  appName: "LIFE PLAN BUILDER",
  appNameAccent: "自分でつくる、ライフプランシミュレーター",
  tagline: "将来のお金の流れを、ひとつずつ整理する。",
  description: "家族構成や収入、住まい、教育費、資産運用、保険などを入力し、将来の収入・支出と資産残高をブラウザ内で可視化します。",
  primaryColor: "#1e3a8a", // 濃紺 (Tailwind: blue-900 / slate-900 相当)
  accentColor: "#2563eb",  // 明るいブルー (Tailwind: blue-600 相当)
  footerText: "© 2026 LIFE PLAN BUILDER. LIFE COMPASS LAB.",
  currencyUnit: "万円",
  startYear: new Date().getFullYear(),
  
  visibleSteps: {
    basic: true,
    income: true,
    living: true,
    education: true,
    currentHousing: true,
    futureHousing: true,
    assets: true,
    investment: true,
    dc: true,
    oneOff: true,
  },
};

/**
 * ヘッダーナビゲーション コンポーネント
 */

import React from 'react';
import { appConfig } from '../../config/appConfig';
import { Download, Upload, RotateCcw, FileText, BarChart3 } from 'lucide-react';

interface NavbarProps {
  currentTab: 'input' | 'result';
  onTabChange: (tab: 'input' | 'result') => void;
  onReset: () => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onReset,
  onExportJson,
  onImportJson,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <header className="bg-white border-b border-gray-200 text-[#1E293B] sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* ロゴ & アプリ名 */}
        <div className="flex items-center space-x-3.5 cursor-pointer" onClick={() => onTabChange('input')}>
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl shadow-xs text-white shrink-0 bg-[var(--app-primary,#1e3a8a)]"
          >
            {appConfig.appName.charAt(0) || 'M'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-[#1E293B]">{appConfig.appName}</span>
              {appConfig.appNameAccent && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-[var(--app-primary,#1e3a8a)] border border-slate-200">
                  {appConfig.appNameAccent}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium hidden sm:block">{appConfig.tagline}</p>
          </div>
        </div>

        {/* タブ切り替え & アクションボタン */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          
          {/* メイン画面切替 (入力 <-> 診断結果) */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => onTabChange('input')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                currentTab === 'input'
                  ? 'bg-[var(--app-primary,#1e3a8a)] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>入力シート</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('result')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                currentTab === 'result'
                  ? 'bg-[var(--app-accent,#2563eb)] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>シミュレーション結果</span>
            </button>
          </nav>

          {/* ファイル入出力 & リセット */}
          <div className="hidden md:flex items-center space-x-2 border-l border-gray-200 pl-3">
            <button
              type="button"
              onClick={onExportJson}
              title="データをJSON形式で保存"
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON保存</span>
            </button>

            <label
              title="JSONファイルを読み込み"
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>読込</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImportJson}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={onReset}
              title="初期設定値に戻す"
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>初期化</span>
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};

/**
 * アプリケーション ルート (App.tsx)
 * 
 * - localStorage 自動同期
 * - JSONファイルの書き出し (Export) と読み込み (Import)
 * - タブ切り替え (条件入力 / 診断結果)
 */

import React from 'react';
import { LifePlanInput } from './types/lifeplan';
import { defaultLifePlanInput } from './data/defaultValues';
import { normalizeLifePlanInput } from './engine/normalization';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { InputPage } from './pages/InputPage';
import { ResultPage } from './pages/ResultPage';

const LOCAL_STORAGE_KEY = 'lifeplan_simulator_input_v1';

export function App() {
  const [currentTab, setCurrentTab] = React.useState<'input' | 'result'>('input');
  
  // 入力データの初期化 (localStorage からの復元、無効時はデフォルトデータ)
  const [input, setInput] = React.useState<LifePlanInput>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return normalizeLifePlanInput(parsed);
      }
    } catch (e) {
      console.warn('Failed to load lifeplan state from localStorage:', e);
    }
    return normalizeLifePlanInput(defaultLifePlanInput);
  });

  // localStorage へデータ変更時に自動保存
  React.useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(input));
    } catch (e) {
      console.warn('Failed to save lifeplan state to localStorage:', e);
    }
  }, [input]);

  // リセット
  const handleReset = () => {
    if (window.confirm('入力内容を初期設定値に戻しますか？')) {
      setInput(defaultLifePlanInput);
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {
        // ignore
      }
    }
  };

  // JSON形式でダウンロード保存
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(input, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `lifeplan_input_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // JSONファイルをアップロードして読み込み
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && typeof json === 'object') {
          const normalized = normalizeLifePlanInput(json);
          setInput(normalized);
          alert('設定データを正常に読み込みました。');
        } else {
          alert('読み込んだJSONデータのフォーマットが不適切です。');
        }
      } catch (err) {
        alert('JSONファイルの解析に失敗しました。');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#1E293B] font-sans antialiased selection:bg-blue-500 selection:text-white">
      
      {/* ナビゲーションバー */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onReset={handleReset}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
      />

      {/* メインビュー */}
      <main className="flex-1">
        {currentTab === 'input' ? (
          <InputPage
            input={input}
            onChange={setInput}
            onNavigateToResult={() => setCurrentTab('result')}
            onResetToDefault={handleReset}
          />
        ) : (
          <ResultPage
            input={input}
            onUpdateInput={setInput}
            onNavigateToInput={() => setCurrentTab('input')}
            onExportJson={handleExportJson}
          />
        )}
      </main>

      {/* フッター */}
      <Footer />

    </div>
  );
}

export default App;

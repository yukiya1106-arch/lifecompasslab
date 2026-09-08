/**
 * 診断結果ページ (ResultPage)
 */

import React from 'react';
import { LifePlanInput, SimulationResult } from '../types/lifeplan';
import { runCashflowSimulation } from '../engine/cashflow';
import { generateCashflowCsv } from '../engine/csvExport';
import { appConfig } from '../config/appConfig';
import { SummaryCards } from '../components/results/SummaryCards';
import { WarningsPanel } from '../components/results/WarningsPanel';
import { ProtectionNeedsPanel } from '../components/results/ProtectionNeedsPanel';
import { AssetTrendChart } from '../components/charts/AssetTrendChart';
import { IncomeExpenseTrendChart } from '../components/charts/IncomeExpenseTrendChart';
import { CashflowSurplusChart } from '../components/charts/CashflowSurplusChart';
import { AssetTransactionsChart } from '../components/charts/AssetTransactionsChart';
import { CashflowTable } from '../components/results/CashflowTable';
import { AssumptionsModal } from '../components/results/AssumptionsModal';
import {
  BarChart3,
  TrendingUp,
  ArrowRightLeft,
  BookOpen,
  Edit3,
  FileSpreadsheet,
  Wallet,
} from 'lucide-react';

interface ResultPageProps {
  input: LifePlanInput;
  onNavigateToInput: () => void;
  onExportJson: () => void;
  onUpdateInput?: (newInput: LifePlanInput) => void;
}

export function getSimulationPeriodLabel(result: SimulationResult, input: LifePlanInput): string {
  const firstRow = result.rows[0];
  const lastRow = result.rows[result.rows.length - 1];

  if (!firstRow || !lastRow) {
    return `${input.personAge}歳〜${input.calculationEndAge}歳`;
  }

  const startStr = `${firstRow.year}年(${firstRow.personAge}歳${input.hasSpouse ? `/配偶者${firstRow.spouseAge}歳` : ''})`;
  const endStr = `${lastRow.year}年(${lastRow.personAge}歳${input.hasSpouse ? `/配偶者${lastRow.spouseAge}歳` : ''})`;

  return `${startStr} 〜 ${endStr}`;
}

export const ResultPage: React.FC<ResultPageProps> = ({
  input,
  onNavigateToInput,
  onUpdateInput,
}) => {
  const [isAssumptionsOpen, setIsAssumptionsOpen] = React.useState(false);
  const [activeChartTab, setActiveChartTab] = React.useState<'assets' | 'income_expense' | 'cashflow' | 'transactions'>('assets');

  // 計算エンジン実行
  const result = React.useMemo(() => {
    return runCashflowSimulation(input);
  }, [input]);

  const periodLabel = React.useMemo(() => {
    return getSimulationPeriodLabel(result, input);
  }, [result, input]);

  // CSVダウンロード
  const handleExportCsv = () => {
    const csvString = generateCashflowCsv(result, { currencyUnit: appConfig.currencyUnit });
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lifeplan_simulation_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* ページヘッダー */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-[#1E293B]">シミュレーション診断結果</h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-[var(--app-primary,#1e3a8a)] border border-slate-200">
              FP計算モジュール適用
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            計算対象期間: <span className="font-bold text-gray-800">{periodLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onNavigateToInput}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-gray-600" />
            <span>条件を修正する</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV出力</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAssumptionsOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold bg-slate-100 text-[var(--app-accent,#2563eb)] hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--app-accent,#2563eb)]" />
            <span>計算式前提</span>
          </button>
        </div>
      </div>

      {/* サマリーカード */}
      <SummaryCards result={result} calculationEndAge={input.calculationEndAge} />

      {/* 警告・アドバイスパネル */}
      <WarningsPanel warnings={result.warnings} />

      {/* グラフセクション */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-[#1E293B]">グラフィック推移グラフ</h3>
            <p className="text-xs text-gray-500 mt-0.5">資産残高・収支推移・資産内部取引の可視化</p>
          </div>

          <div className="flex items-center p-1 bg-gray-100/80 rounded-2xl text-xs font-bold flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveChartTab('assets')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl transition-all ${
                activeChartTab === 'assets'
                  ? 'bg-[var(--app-primary,#1e3a8a)] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>金融資産残高推移</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('income_expense')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl transition-all ${
                activeChartTab === 'income_expense'
                  ? 'bg-[var(--app-primary,#1e3a8a)] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>将来の収入と支出</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('cashflow')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl transition-all ${
                activeChartTab === 'cashflow'
                  ? 'bg-[var(--app-primary,#1e3a8a)] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>年間収支推移</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('transactions')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl transition-all ${
                activeChartTab === 'transactions'
                  ? 'bg-[var(--app-primary,#1e3a8a)] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>資産内部取引・取崩</span>
            </button>
          </div>
        </div>

        <div className="min-h-[400px]">
          {activeChartTab === 'assets' && <AssetTrendChart rows={result.rows} />}
          {activeChartTab === 'income_expense' && <IncomeExpenseTrendChart rows={result.rows} />}
          {activeChartTab === 'cashflow' && <CashflowSurplusChart rows={result.rows} />}
          {activeChartTab === 'transactions' && <AssetTransactionsChart rows={result.rows} />}
        </div>
      </div>

      {/* 必要保障額＆死亡保障比較パネル */}
      <ProtectionNeedsPanel input={input} rows={result.rows} onUpdateInput={onUpdateInput} />

      {/* 詳細データテーブル */}
      <CashflowTable rows={result.rows} />

      {/* 計算前提モーダル */}
      <AssumptionsModal
        isOpen={isAssumptionsOpen}
        onClose={() => setIsAssumptionsOpen(false)}
      />

    </div>
  );
};

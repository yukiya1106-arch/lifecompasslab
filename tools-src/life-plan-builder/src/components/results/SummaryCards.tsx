/**
 * 診断結果：サマリーKPIカード
 */

import React from 'react';
import { SimulationResult } from '../../types/lifeplan';
import { appConfig } from '../../config/appConfig';
import { TrendingUp, ShieldAlert, Wallet, GraduationCap } from 'lucide-react';

interface SummaryCardsProps {
  result: SimulationResult;
  calculationEndAge: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ result, calculationEndAge }) => {
  const { summary, rows } = result;
  const unit = appConfig.currencyUnit || '万円';
  const shortfallAge = summary.liquidAssetShortfallAge;

  const lastRow = rows && rows.length > 0 ? rows[rows.length - 1] : undefined;
  const finalAgeLabel = lastRow
    ? `本人${lastRow.personAge}歳${lastRow.spouseAge ? `/配偶者${lastRow.spouseAge}歳` : ''} (${lastRow.year}年)`
    : `${calculationEndAge} 歳`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 最高資産額 */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>資産ピーク時</span>
          <TrendingUp className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <span className="text-2xl font-extrabold text-[#1E293B]">{summary.peakAssets.amount.toLocaleString()}</span>
          <span className="text-xs font-bold text-gray-500 ml-1">{unit}</span>
        </div>
        <div className="text-xs text-gray-500">
          ピーク年齢： <strong className="text-slate-800">{summary.peakAssets.age} 歳</strong> 時
        </div>
      </div>

      {/* 生活資金の持続性 (P0-3 要件通りに統一) */}
      <div className={`p-5 rounded-2xl border shadow-xs space-y-2 ${
        shortfallAge ? 'bg-red-50/80 border-red-200' : 'bg-emerald-50/80 border-emerald-200'
      }`}>
        <div className="flex items-center justify-between text-xs font-medium">
          <span className={shortfallAge ? 'text-red-800' : 'text-emerald-800'}>生活資金の持続性</span>
          <ShieldAlert className={`w-4 h-4 ${shortfallAge ? 'text-red-600' : 'text-emerald-600'}`} />
        </div>
        <div>
          {shortfallAge ? (
            <div>
              <span className="text-2xl font-extrabold text-red-700">{shortfallAge}</span>
              <span className="text-xs font-bold text-red-700 ml-1">歳で生活資金不足</span>
            </div>
          ) : (
            <span className="text-base font-extrabold text-emerald-800">計算期間内の生活資金不足なし</span>
          )}
        </div>
        <p className={`text-[10px] leading-tight font-medium ${shortfallAge ? 'text-red-600' : 'text-emerald-700'}`}>
          {shortfallAge
            ? 'DC・iDeCo等の受取制限資産は残っている可能性があります'
            : '計算対象期間を通じて生活資金（現預金・可換資産）を維持'}
        </p>
      </div>

      {/* 最終残高 (計算終了時) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>シミュレーション最終残高</span>
          <Wallet className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
        </div>
        <div>
          <span className={`text-2xl font-extrabold ${summary.finalAssets >= 0 ? 'text-[#1E293B]' : 'text-red-600'}`}>
            {summary.finalAssets.toLocaleString()}
          </span>
          <span className="text-xs font-bold text-gray-500 ml-1">{unit}</span>
        </div>
        <div className="text-xs text-gray-500">
          計算終了時： <strong className="text-slate-800">{finalAgeLabel}</strong>
        </div>
      </div>

      {/* 教育費＆住宅ローン支払総額 */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>累計支出サマリー</span>
          <GraduationCap className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">教育費総額:</span>
            <span className="font-bold text-[#1E293B]">{summary.totalEducationExpenses.toLocaleString()} {unit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">住宅ローン総支払:</span>
            <span className="font-bold text-[#1E293B]">{summary.totalMortgagePayments.toLocaleString()} {unit}</span>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 font-medium">主要ライフイベント累計額</p>
      </div>

    </div>
  );
};

/**
 * 診断結果：年次キャッシュフロー＆資産残高推移表 コンポーネント (CashflowTable.tsx)
 * 
 * 簡易表示 / 詳細表示 の切替機能
 * 各行クリックによる展開機能（当年の全計算式の分解内訳・4区分カード・恒等式数式を表示）
 */

import React from 'react';
import { AnnualCashflowRow } from '../../types/lifeplan';
import { appConfig } from '../../config/appConfig';
import { ChevronDown, ChevronRight, Table as TableIcon, HelpCircle, CheckCircle } from 'lucide-react';

interface CashflowTableProps {
  rows: AnnualCashflowRow[];
}

export const CashflowTable: React.FC<CashflowTableProps> = ({ rows }) => {
  const [viewMode, setViewMode] = React.useState<'summary' | 'detailed'>('summary');
  const [expandedRowAge, setExpandedRowAge] = React.useState<number | null>(null);

  const unit = appConfig.currencyUnit || '万円';

  const toggleRow = (age: number) => {
    setExpandedRowAge(expandedRowAge === age ? null : age);
  };

  return (
    <div className="space-y-4">
      
      {/* テーブル制御バー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center space-x-2">
          <TableIcon className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
          <span className="font-bold text-[#1E293B] text-sm">年次キャッシュフロー＆資産残高推移表</span>
          <span className="text-xs text-gray-400 font-medium">({rows.length}年間)</span>
        </div>

        <div className="flex items-center space-x-1.5 bg-gray-100 p-1 rounded-full self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('summary')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              viewMode === 'summary' ? 'bg-[var(--app-primary,#1e3a8a)] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            簡易表示 (主要項目)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('detailed')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              viewMode === 'detailed' ? 'bg-[var(--app-primary,#1e3a8a)] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            詳細表示 (全会計項目)
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 italic font-medium px-1">
        ※各行をクリックすると、年次収支4区分カード、全分解内訳、および恒等式検証を展開表示します。
      </p>

      {/* テーブル表示部 */}
      <div className="overflow-x-auto border border-gray-200/90 rounded-2xl shadow-xs bg-white">
        <table className="w-full text-left border-collapse text-xs">
          
          {/* ヘッダー */}
          <thead className="bg-[var(--app-primary,#1e3a8a)] text-white font-bold sticky top-0 z-10">
            <tr>
              <th className="p-3 w-8"></th>
              <th className="p-3 whitespace-nowrap">年齢 (年)</th>
              <th className="p-3 text-right whitespace-nowrap">通常収入({unit})</th>
              <th className="p-3 text-right whitespace-nowrap">通常支出({unit})</th>
              <th className="p-3 text-right whitespace-nowrap">通常家計収支({unit})</th>
              <th className="p-3 text-right whitespace-nowrap">外部純収支({unit})</th>
              
              {viewMode === 'detailed' && (
                <>
                  <th className="p-3 text-right whitespace-nowrap">生活費({unit})</th>
                  <th className="p-3 text-right whitespace-nowrap">教育費({unit})</th>
                  <th className="p-3 text-right whitespace-nowrap">住居費({unit})</th>
                  <th className="p-3 text-right whitespace-nowrap">非住宅一時収支({unit})</th>
                  <th className="p-3 text-right whitespace-nowrap">住宅資産取引({unit})</th>
                  <th className="p-3 text-right whitespace-nowrap">積立・一括投資({unit})</th>
                  <th className="p-3 text-right whitespace-nowrap">NISA計画受取({unit})</th>
                  <th className="p-3 text-right whitespace-nowrap">資金補填取崩({unit})</th>
                  <th className="p-3 text-right whitespace-nowrap">DC受取({unit})</th>
                </>
              )}

              <th className="p-3 text-right whitespace-nowrap">現預金残高({unit})</th>
              <th className="p-3 text-right whitespace-nowrap">NISA等残高({unit})</th>
              <th className="p-3 text-right whitespace-nowrap">DC残高({unit})</th>
              <th className="p-3 text-right whitespace-nowrap bg-slate-900 text-amber-300">金融資産合計({unit})</th>
              <th className="p-3 text-right whitespace-nowrap">生活資金不足({unit})</th>
            </tr>
          </thead>

          {/* ボディ */}
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const isExpanded = expandedRowAge === r.personAge;
              const hasShortfall = r.unbackedShortfall > 0;
              const isSurplus = r.netOrdinaryCashflow >= 0;
              const extNet = r.totalExternalNetCashflow ?? r.externalNetCashflow;

              return (
                <React.Fragment key={r.personAge}>
                  
                  {/* 主要データ行 */}
                  <tr
                    onClick={() => toggleRow(r.personAge)}
                    className={`cursor-pointer transition hover:bg-slate-100/60 ${
                      hasShortfall ? 'bg-red-50/70 font-semibold' : r.personAge % 5 === 0 ? 'bg-gray-50/80' : 'bg-white'
                    }`}
                  >
                    <td className="p-3 text-gray-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--app-accent,#2563eb)]" /> : <ChevronRight className="w-4 h-4" />}
                    </td>
                    <td className="p-3 font-bold whitespace-nowrap text-[#1E293B]">
                      {r.personAge}歳 <span className="text-gray-400 font-normal">({r.year}年)</span>
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-800">{Math.round(r.totalOrdinaryIncome).toLocaleString()}</td>
                    <td className="p-3 text-right font-semibold text-slate-800">{Math.round(r.totalOrdinaryExpenses).toLocaleString()}</td>
                    <td className={`p-3 text-right font-bold ${isSurplus ? 'text-emerald-700' : 'text-red-600'}`}>
                      {isSurplus ? `+${Math.round(r.netOrdinaryCashflow).toLocaleString()}` : Math.round(r.netOrdinaryCashflow).toLocaleString()}
                    </td>
                    <td className={`p-3 text-right font-bold ${extNet >= 0 ? 'text-[var(--app-accent,#2563eb)]' : 'text-red-600'}`}>
                      {extNet >= 0 ? `+${Math.round(extNet).toLocaleString()}` : Math.round(extNet).toLocaleString()}
                    </td>

                    {viewMode === 'detailed' && (
                      <>
                        <td className="p-3 text-right text-gray-600">{Math.round(r.livingExpenses).toLocaleString()}</td>
                        <td className="p-3 text-right text-gray-600">{Math.round(r.educationExpenses).toLocaleString()}</td>
                        <td className="p-3 text-right text-gray-600">{Math.round(r.housingExpenses).toLocaleString()}</td>
                        <td className="p-3 text-right font-semibold text-indigo-700">{r.nonHousingOneOffTransactions !== 0 ? Math.round(r.nonHousingOneOffTransactions).toLocaleString() : '-'}</td>
                        <td className="p-3 text-right font-semibold text-amber-700">{r.housingAssetTransactions !== 0 ? Math.round(r.housingAssetTransactions).toLocaleString() : '-'}</td>
                        <td className="p-3 text-right text-[var(--app-primary,#1e3a8a)]">{r.investmentContributionTransfer > 0 ? `-${Math.round(r.investmentContributionTransfer).toLocaleString()}` : '-'}</td>
                        <td className="p-3 text-right text-[var(--app-accent,#2563eb)]">{r.plannedTaxableWithdrawal > 0 ? `+${Math.round(r.plannedTaxableWithdrawal).toLocaleString()}` : '-'}</td>
                        <td className="p-3 text-right text-amber-600">{r.emergencyTaxableWithdrawal > 0 ? `+${Math.round(r.emergencyTaxableWithdrawal).toLocaleString()}` : '-'}</td>
                        <td className="p-3 text-right text-indigo-700">{r.dcWithdrawal > 0 ? `+${Math.round(r.dcWithdrawal).toLocaleString()}` : '-'}</td>
                      </>
                    )}

                    <td className="p-3 text-right font-semibold text-sky-800">{Math.round(r.endCash).toLocaleString()}</td>
                    <td className="p-3 text-right font-semibold text-[var(--app-accent,#2563eb)]">{Math.round(r.endTaxableAssets).toLocaleString()}</td>
                    <td className="p-3 text-right font-semibold text-indigo-800">{Math.round(r.endRestrictedAssets).toLocaleString()}</td>
                    <td className="p-3 text-right font-extrabold text-[#1E293B] bg-slate-50">{Math.round(r.endTotalAssets).toLocaleString()}</td>
                    <td className={`p-3 text-right font-bold ${hasShortfall ? 'text-red-600' : 'text-gray-300'}`}>
                      {hasShortfall ? Math.round(r.unbackedShortfall).toLocaleString() : '-'}
                    </td>
                  </tr>

                  {/* 展開詳細パネル (年次収支4区分カード＆全式分解) */}
                  {isExpanded && (
                    <tr className="bg-[#1E293B] text-slate-100 text-xs">
                      <td colSpan={viewMode === 'detailed' ? 20 : 11} className="p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                          <div className="flex items-center space-x-2 font-bold text-amber-300">
                            <HelpCircle className="w-4 h-4" />
                            <span>{r.personAge}歳 ({r.year}年) 年次収支4区分＆内訳計算プロセス</span>
                          </div>
                          <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>恒等式検証済 ({Math.abs(r.calculationCheckDifference) < 0.001 ? '差額なし OK' : `検算差額 ${r.calculationCheckDifference.toFixed(4)}${unit}`})</span>
                          </div>
                        </div>

                        {/* P0-2 要件: 年次収支4区分カード */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
                          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-1">
                            <p className="text-gray-400 font-bold">1. 通常家計収支</p>
                            <p className="text-lg font-extrabold text-emerald-400">
                              {r.netOrdinaryCashflow >= 0 ? `+${r.netOrdinaryCashflow.toFixed(1)}` : r.netOrdinaryCashflow.toFixed(1)} <span className="text-xs text-gray-400">{unit}</span>
                            </p>
                            <p className="text-[10px] text-gray-400">通常収入({r.totalOrdinaryIncome.toFixed(1)}) - 通常支出({r.totalOrdinaryExpenses.toFixed(1)})</p>
                          </div>

                          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-1">
                            <p className="text-gray-400 font-bold">2. 非住宅一時収支</p>
                            <p className="text-lg font-extrabold text-indigo-300">
                              {r.nonHousingOneOffTransactions >= 0 ? `+${r.nonHousingOneOffTransactions.toFixed(1)}` : r.nonHousingOneOffTransactions.toFixed(1)} <span className="text-xs text-gray-400">{unit}</span>
                            </p>
                            <p className="text-[10px] text-gray-400">退職金 + その他一時収入 - その他一時支出</p>
                          </div>

                          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-1">
                            <p className="text-gray-400 font-bold">3. 住宅資産取引</p>
                            <p className="text-lg font-extrabold text-amber-300">
                              {r.housingAssetTransactions >= 0 ? `+${r.housingAssetTransactions.toFixed(1)}` : r.housingAssetTransactions.toFixed(1)} <span className="text-xs text-gray-400">{unit}</span>
                            </p>
                            <p className="text-[10px] text-gray-400">住宅売却手取り - 住宅購入初期費用</p>
                          </div>

                          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-1">
                            <p className="text-gray-400 font-bold">4. 外部純収支 (合計)</p>
                            <p className="text-lg font-extrabold text-sky-300">
                              {extNet >= 0 ? `+${extNet.toFixed(1)}` : extNet.toFixed(1)} <span className="text-xs text-gray-400">{unit}</span>
                            </p>
                            <p className="text-[10px] text-gray-400">1 + 2 + 3 (総収入 - 総支出)</p>
                          </div>
                        </div>

                        {/* 詳細内訳分解 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
                          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-1">
                            <p className="font-bold text-sky-300 border-b border-slate-700/80 pb-1">① 収入詳細内訳 (合計: {r.totalIncome.toFixed(1)}{unit})</p>
                            <p>・本人手取り給与: {r.personNetSalary.toFixed(1)}{unit}</p>
                            <p>・配偶者手取り給与: {r.spouseNetSalary.toFixed(1)}{unit}</p>
                            <p>・公的年金 (本人+配偶者): {r.pensionIncome.toFixed(1)}{unit}</p>
                            <p>・退職金 (本人+配偶者): {r.retirementAllowance.toFixed(1)}{unit}</p>
                            <p>・住宅売却手取り: {r.housingSaleProceeds.toFixed(1)}{unit}</p>
                            <p>・その他一時収入: {r.otherOneOffIncome.toFixed(1)}{unit}</p>
                          </div>

                          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-1">
                            <p className="font-bold text-red-300 border-b border-slate-700/80 pb-1">② 支出詳細内訳 (合計: {r.totalExpenses.toFixed(1)}{unit})</p>
                            <p>・基本生活費: {r.livingExpenses.toFixed(1)}{unit}</p>
                            <p>・教育費: {r.educationExpenses.toFixed(1)}{unit}</p>
                            <p>・住居費 (ローン/家賃/管理費): {r.housingExpenses.toFixed(1)}{unit}</p>
                            <p>・保険料: {r.insuranceExpenses.toFixed(1)}{unit}</p>
                            <p>・住宅購入初期費用: {r.housingPurchaseInitialExpenses.toFixed(1)}{unit}</p>
                            <p>・その他一時支出: {r.otherOneOffExpenses.toFixed(1)}{unit}</p>
                          </div>

                          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-1">
                            <p className="font-bold text-emerald-300 border-b border-slate-700/80 pb-1">③ 資産移転・運用益・取り崩し</p>
                            <p>・NISA運用益: +{r.taxableInvestmentGain.toFixed(1)}{unit}</p>
                            <p>・DC運用益: +{r.restrictedInvestmentGain.toFixed(1)}{unit}</p>
                            <p>・積立・一括投資額: -{r.investmentContributionTransfer.toFixed(1)}{unit}</p>
                            <p>・NISA計画受取: +{r.plannedTaxableWithdrawal.toFixed(1)}{unit}</p>
                            <p>・生活資金補填取崩: +{r.emergencyTaxableWithdrawal.toFixed(1)}{unit}</p>
                            <p>・DC受取額: +{r.dcWithdrawal.toFixed(1)}{unit}</p>
                          </div>
                        </div>

                        {/* 期末資産決定の基本恒等式 */}
                        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-700/80 text-[11px] font-mono text-slate-300 leading-relaxed">
                          <p className="font-bold text-amber-200 font-sans mb-1">【期末資産恒等式検証】</p>
                          <p>
                            期末資産({r.endTotalAssets.toFixed(1)}) ＝ 期首資産({r.startTotalAssets.toFixed(1)}) ＋ 外部純収支({extNet.toFixed(1)}) ＋ 運用益({r.totalInvestmentGain.toFixed(1)}) ＋ 生活資金不足補正({r.unbackedShortfall.toFixed(1)})
                          </p>
                        </div>

                      </td>
                    </tr>
                  )}

                </React.Fragment>
              );
            })}
          </tbody>

        </table>
      </div>

    </div>
  );
};

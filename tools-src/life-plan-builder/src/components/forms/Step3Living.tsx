/**
 * STEP 3: 生活費・物価・保険 フォーム
 */

import React from 'react';
import { LifePlanInput, LivingExpensesInput } from '../../types/lifeplan';
import { ShoppingBag, TrendingUp, Info } from 'lucide-react';
import { InsuranceSection } from './InsuranceSection';

interface Step3LivingProps {
  input: LifePlanInput;
  onChange: (updated: LifePlanInput) => void;
}

export const Step3Living: React.FC<Step3LivingProps> = ({ input, onChange }) => {
  const updateLiving = (fields: Partial<LivingExpensesInput>) => {
    onChange({
      ...input,
      livingExpenses: { ...input.livingExpenses, ...fields },
    });
  };

  const living = input.livingExpenses;
  const annualLiving = living.monthlyExpense * 12;
  const totalAnnualCurrent = annualLiving + living.annualOneOffExpense;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg border-b pb-2 border-slate-200">
        <ShoppingBag className="w-5 h-5 text-[var(--app-accent,#2563eb)]" />
        <span>STEP 3：生活費・物価・保険設定</span>
      </div>

      {/* 注意喚起情報 */}
      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-800 flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-[var(--app-accent,#2563eb)] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[var(--app-primary,#1e3a8a)]">【生活費と子どもの日常費について】</p>
          <p className="leading-relaxed">
            入力する「毎月の基本生活費」には、現在いるお子様の食費・衣料費・お小遣い等の日常生活費が含まれているものとして扱います。(二重計上を防ぐため、教育費ステップでは学費・学校生活費のみを入力します)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 基本生活費 */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <h4 className="font-semibold text-slate-700 text-sm">基本生活費</h4>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">現在の毎月生活費 (家賃・ローン除く)</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={0}
                step={1}
                value={living.monthlyExpense}
                onChange={(e) => updateLiving({ monthlyExpense: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none font-semibold"
              />
              <span className="text-sm font-bold text-slate-700 shrink-0">万円/月</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              年間換算： <strong className="text-[var(--app-primary,#1e3a8a)]">{annualLiving} 万円/年</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">年間の臨時・季節生活費 (旅行、家電、イベント等)</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={0}
                step={5}
                value={living.annualOneOffExpense}
                onChange={(e) => updateLiving({ annualOneOffExpense: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none font-semibold"
              />
              <span className="text-sm font-bold text-slate-700 shrink-0">万円/年</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
            <span className="text-slate-600 font-medium">現在生活費の年間合計額：</span>
            <span className="font-bold text-slate-900 text-sm">{totalAnnualCurrent} 万円/年</span>
          </div>
        </div>

        {/* 想定物価上昇率 (インフレ率) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <h4 className="font-semibold text-slate-700 text-sm">物価上昇率設定</h4>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-[var(--app-accent,#2563eb)]" />
              <span>想定物価上昇率 (インフレ率)</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                step={0.1}
                min={0}
                max={5}
                value={living.inflationRate}
                onChange={(e) => updateLiving({ inflationRate: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none font-semibold"
              />
              <span className="text-sm font-bold text-slate-700 shrink-0">% / 年</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              生活費・教育費・家賃・管理費等に適用されます。(固定住宅ローン返済等には非適用)
            </p>
          </div>
        </div>

      </div>

      {/* 保険設定セクション (世帯保険料・死亡保障・計算前提) */}
      <InsuranceSection input={input} onChange={onChange} />

    </div>
  );
};

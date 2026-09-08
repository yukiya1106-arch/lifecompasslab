/**
 * STEP 8: 資産運用・取り崩し計画 フォーム
 */

import React from 'react';
import { LifePlanInput, InvestmentPlanInput, RecurringInvestmentInput, WithdrawalMethod } from '../../types/lifeplan';
import { calculateEqualSplitAnnualPayout, calculateInvestedSplitAnnualPayout } from '../../engine/investment';
import { TrendingUp, AlertTriangle, ArrowRightLeft, Plus, Trash2 } from 'lucide-react';
import { aggregateRecurringPlan, recurringPlans } from '../../engine/capitalPlans';
import { CapitalPlansSection } from './CapitalPlansSection';
import { runLifePlanSimulation } from '../../engine/cashflow';

interface Step8InvestmentProps {
  input: LifePlanInput;
  onChange: (updated: LifePlanInput) => void;
}

export const Step8Investment: React.FC<Step8InvestmentProps> = ({ input, onChange }) => {
  const updateInvestment = (fields: Partial<InvestmentPlanInput>) => {
    onChange({
      ...input,
      investmentPlan: { ...input.investmentPlan, ...fields },
    });
  };

  const plan = aggregateRecurringPlan(input);
  const plans = recurringPlans(input);
  const updatePlans = (investmentPlans: RecurringInvestmentInput[]) => {
    const updated = { ...input, investmentPlans };
    onChange({ ...updated, investmentPlan: aggregateRecurringPlan(updated) });
  };

  // 積立と取り崩しの重なりチェック
  const overlapWarning = React.useMemo(() => {
    if (plan.contributionStartAge < plan.withdrawalStartAge && plan.contributionEndAge > plan.withdrawalStartAge) {
      return `積立終了年齢(${plan.contributionEndAge}歳)が取り崩し開始年齢(${plan.withdrawalStartAge}歳)より後に設定されています。同期間に積立と取り崩しが重複しています。`;
    }
    return null;
  }, [plan]);

  // 取り崩し受取試算 (目安)
  const estimatedPayout = React.useMemo(() => {
    const estimatedBalanceAtWithdrawal = runLifePlanSimulation({
      ...input, calculationEndAge: Math.max(input.calculationEndAge, plan.withdrawalStartAge),
    }).recurringWithdrawalBalance ?? 0;

    let annual = 0;
    if (plan.withdrawalMethod === 'equal_split') {
      annual = calculateEqualSplitAnnualPayout(estimatedBalanceAtWithdrawal, plan.withdrawalYears);
    } else if (plan.withdrawalMethod === 'invested_split') {
      annual = calculateInvestedSplitAnnualPayout(estimatedBalanceAtWithdrawal, plan.expectedYieldRate, plan.withdrawalYears);
    } else {
      annual = estimatedBalanceAtWithdrawal;
    }

    return {
      balanceAtWithdrawal: Math.round(estimatedBalanceAtWithdrawal),
      annualPayout: Math.round(annual),
      monthlyPayout: (annual / 12).toFixed(1),
      endAge: plan.withdrawalStartAge + plan.withdrawalYears,
    };
  }, [input]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg border-b pb-2 border-slate-200">
        <TrendingUp className="w-5 h-5 text-[var(--app-accent,#2563eb)]" />
        <span>STEP 8：NISA・資産運用＆取り崩し計画</span>
      </div>

      {overlapWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{overlapWarning}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 左側：積立・運用設定 */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <h4 className="font-semibold text-slate-700 text-sm flex items-center space-x-1.5">
            <TrendingUp className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
            <span>積立・運用設定</span>
          </h4>
          <button type="button" onClick={() => updatePlans([...plans, { ...plan, id: crypto.randomUUID(), name: `運用${plans.length + 1}`, monthlyContribution: 0 }])}
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--app-primary,#1e3a8a)] py-2">
            <Plus className="w-4 h-4" />運用を追加
          </button>
          {plans.map((plan, index) => {
            const updateInvestment = (fields: Partial<RecurringInvestmentInput>) => updatePlans(plans.map((p, i) => i === index ? { ...p, ...fields } : p));
            return <div key={plan.id} className="space-y-4 border-t border-slate-200 pt-4">
              <div className="flex items-center gap-2">
                <input aria-label={`運用${index + 1}の名前`} value={plan.name} onChange={e => updateInvestment({ name: e.target.value })}
                  className="min-w-0 w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold" />
                <button type="button" aria-label={`${plan.name}を削除`} title={index === 0 ? '1件目は削除できません' : '運用を削除'} disabled={index === 0}
                  onClick={() => updatePlans(plans.filter((_, i) => i !== index))} className="p-3 text-slate-500 disabled:opacity-30 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">毎月積立額 (NISA・投資信託等)</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={0}
                step={0.5}
                value={plan.monthlyContribution}
                onChange={(e) => updateInvestment({ monthlyContribution: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
              />
              <span className="text-sm font-bold text-slate-700 shrink-0">万円/月</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              年間積立額： <strong className="text-[var(--app-primary,#1e3a8a)]">{plan.monthlyContribution * 12} 万円/年</strong> (現預金から運用資産への移転処理)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">積立開始年齢</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min={input.personAge}
                  max={80}
                  value={plan.contributionStartAge}
                  onChange={(e) => updateInvestment({ contributionStartAge: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                />
                <span className="text-xs text-slate-600 font-medium">歳</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">積立終了年齢</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min={input.personAge}
                  max={90}
                  value={plan.contributionEndAge}
                  onChange={(e) => updateInvestment({ contributionEndAge: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                />
                <span className="text-xs text-slate-600 font-medium">歳</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">想定運用利回り (年率)</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                step={0.1}
                min={0}
                max={15}
                value={plan.expectedYieldRate}
                onChange={(e) => updateInvestment({ expectedYieldRate: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
              />
              <span className="text-sm font-bold text-slate-700 shrink-0">% / 年</span>
            </div>
          </div>
          </div>;
          })}
        </div>

        {/* 右側：取り崩し・受取設定 */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <h4 className="font-semibold text-slate-700 text-sm flex items-center space-x-1.5">
            <ArrowRightLeft className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
            <span>共通の取り崩し設定</span>
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">積立分と、一括プランに割り当てていない運用資産が対象です。</p>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">取り崩し開始年齢 (本人の年齢)</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={input.personAge}
                max={95}
                value={plan.withdrawalStartAge}
                onChange={(e) => updateInvestment({ withdrawalStartAge: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
              />
              <span className="text-sm font-bold text-slate-700 shrink-0">歳から</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">取り崩し方法</label>
            <select
              value={plan.withdrawalMethod}
              onChange={(e) => updateInvestment({ withdrawalMethod: e.target.value as WithdrawalMethod })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
            >
              <option value="invested_split">C. 運用しながら分割取り崩し (残高を運用しながら定額受取)</option>
              <option value="equal_split">B. 均等分割取り崩し (開始時残高を均等分割・非運用)</option>
              <option value="lump_sum">A. 一括取り崩し (開始時に全額現預金へ移動)</option>
            </select>
          </div>

          {plan.withdrawalMethod !== 'lump_sum' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">受取・取り崩し期間 (年数)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={plan.withdrawalYears}
                  onChange={(e) => updateInvestment({ withdrawalYears: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                />
                <span className="text-sm font-bold text-slate-700 shrink-0">年間</span>
              </div>
            </div>
          )}

          {/* 取り崩し目安の即時表示 */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between items-center font-bold text-slate-700">
              <span>取り崩し開始時想定残高：</span>
              <span className="text-[var(--app-primary,#1e3a8a)] font-extrabold text-sm">{estimatedPayout.balanceAtWithdrawal} 万円</span>
            </div>

            {plan.withdrawalMethod !== 'lump_sum' ? (
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-slate-600">想定年間受取額：</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {estimatedPayout.annualPayout} 万円/年 (月額 {estimatedPayout.monthlyPayout} 万円)
                </span>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-100 text-slate-600 text-right">
                {plan.withdrawalStartAge}歳時に全額({estimatedPayout.balanceAtWithdrawal}万円)が現預金へ一括振替されます。
              </div>
            )}
          </div>

        </div>

      </div>

      <CapitalPlansSection input={input} onChange={onChange} />
    </div>
  );
};

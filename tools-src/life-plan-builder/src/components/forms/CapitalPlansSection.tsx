import React from 'react';
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import { CapitalPlanInput, LifePlanInput } from '../../types/lifeplan';
import { calculateInvestedSplitAnnualPayout } from '../../engine/investment';

const fieldClass = 'min-w-0 w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none';
const format = (amount: number) => amount.toLocaleString('ja-JP', { maximumFractionDigits: 1 });

function NumberField({ label, value, unit, min = 0, max, step = 1, onChange }: {
  label: string; value: number; unit: string; min?: number; max?: number; step?: number; onChange: (value: number) => void;
}) {
  return <label className="block min-w-0 text-xs font-medium text-slate-600">
    {label}
    <span className="mt-1 flex items-center gap-2">
      <input className={fieldClass} type="number" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Math.min(max ?? Infinity, Math.max(min, Number(e.target.value) || 0)))} />
      <span className="shrink-0">{unit}</span>
    </span>
  </label>;
}

export function CapitalPlansSection({ input, onChange }: { input: LifePlanInput; onChange: (value: LifePlanInput) => void }) {
  const plans = input.capitalPlans || [];
  const update = (index: number, fields: Partial<CapitalPlanInput>) => onChange({ ...input, capitalPlans: plans.map((p, i) => i === index ? { ...p, ...fields } : p) });
  return <section className="space-y-4 border-t border-slate-200 pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />一括運用・取り崩し</h4>
      <button type="button" className="inline-flex items-center gap-2 py-3 text-sm font-bold text-[var(--app-primary,#1e3a8a)]"
        onClick={() => onChange({ ...input, capitalPlans: [...plans, { id: crypto.randomUUID(), name: `一括運用${plans.length + 1}`, mode: 'compound', source: 'cash', principal: 1000, expectedYieldRate: 4, startAge: input.personAge, years: 10 }] })}>
        <Plus className="w-4 h-4" />一括運用・取り崩しを追加
      </button>
    </div>
    {plans.map((plan, index) => {
      const annual = calculateInvestedSplitAnnualPayout(plan.principal, plan.expectedYieldRate, plan.years);
      const ending = plan.principal * Math.pow(1 + plan.expectedYieldRate / 100, plan.years);
      const knownFunds = plan.source === 'cash' ? input.financialAssets.currentCash : input.financialAssets.currentTaxableAssets + input.financialAssets.otherAssets;
      const allocated = plans.filter(p => p.source === plan.source && p.startAge <= input.personAge).reduce((sum, p) => sum + p.principal, 0);
      return <div key={plan.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <label className="min-w-0 flex-1 text-xs font-medium text-slate-600">プラン名
            <input className={`${fieldClass} mt-1`} value={plan.name} onChange={e => update(index, { name: e.target.value })} />
          </label>
          <button type="button" title="プランを削除" aria-label={`${plan.name}を削除`} className="p-3 text-slate-500 hover:text-red-600"
            onClick={() => onChange({ ...input, capitalPlans: plans.filter((_, i) => i !== index) })}><Trash2 className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block min-w-0 text-xs font-medium text-slate-600">運用方法
            <select className={`${fieldClass} mt-1`} value={plan.mode} onChange={e => update(index, { mode: e.target.value as CapitalPlanInput['mode'] })}>
              <option value="compound">一括運用（複利）</option><option value="withdrawal">運用しながら取り崩し</option>
            </select>
          </label>
          <label className="block min-w-0 text-xs font-medium text-slate-600">元本の出どころ
            <select className={`${fieldClass} mt-1`} value={plan.source} onChange={e => update(index, { source: e.target.value as CapitalPlanInput['source'] })}>
              <option value="cash">現預金から振り替える</option><option value="taxable">登録済みの運用資産から割り当てる</option>
            </select>
          </label>
          <NumberField label={plan.mode === 'compound' ? '運用元本' : '取り崩す元本'} value={plan.principal} unit="万円" onChange={principal => update(index, { principal })} />
          <NumberField label="想定運用利回り（年率）" value={plan.expectedYieldRate} unit="%" max={100} step={0.1} onChange={expectedYieldRate => update(index, { expectedYieldRate })} />
          <NumberField label="開始年齢（本人）" value={plan.startAge} unit="歳" min={input.personAge} max={120} onChange={startAge => update(index, { startAge: Math.floor(startAge) })} />
          <NumberField label={plan.mode === 'compound' ? '運用期間' : '取り崩し期間'} value={plan.years} unit="年間" min={1} max={100} onChange={years => update(index, { years: Math.floor(years) })} />
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">元本はSTEP 7の資産や開始年までの収支から割り当てます。資産総額には加算しません。残高不足の場合は、用意できる金額で計算します。</p>
        {plan.startAge <= input.personAge && allocated > knownFunds && <p className="text-xs text-amber-800 leading-relaxed">同じ資金からの割当合計が現在の残高を超えています。開始年の収支と残高により、実際の運用元本が減る場合があります。</p>}
        <div className="border-t border-slate-200 pt-3 text-sm space-y-2">
          {plan.mode === 'compound' ? <p className="flex flex-wrap justify-between gap-2"><span>{plan.years}年後の想定残高</span><strong className="text-[var(--app-primary,#1e3a8a)]">{format(ending)} 万円</strong></p>
            : <p className="flex flex-wrap justify-between gap-2"><span>想定年間取り崩し額</span><strong className="text-emerald-700">{format(annual)} 万円／年（月換算 {format(annual / 12)} 万円）</strong></p>}
          <p className="text-xs text-slate-500 leading-relaxed">{plan.mode === 'compound' ? `${plan.startAge + plan.years}歳の年初に、運用残高を現預金へ戻します。` : `${plan.startAge}歳から${plan.startAge + plan.years - 1}歳まで、年初に取り崩し、残額を年利で運用します。`} 上記は入力した元本の税金・手数料控除前の目安です。家計の不足による臨時取り崩し等は含みません。</p>
        </div>
      </div>;
    })}
  </section>;
}

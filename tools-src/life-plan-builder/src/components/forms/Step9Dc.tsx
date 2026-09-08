/**
 * STEP 9: DC・iDeCo フォーム
 */

import React from 'react';
import { LifePlanInput, DcPlanInput } from '../../types/lifeplan';
import { Lock, AlertCircle } from 'lucide-react';

interface Step9DcProps {
  input: LifePlanInput;
  onChange: (updated: LifePlanInput) => void;
}

export const Step9Dc: React.FC<Step9DcProps> = ({ input, onChange }) => {
  const updateDc = (fields: Partial<DcPlanInput>) => {
    onChange({
      ...input,
      dcPlan: { ...input.dcPlan, ...fields },
    });
  };

  const dc = input.dcPlan;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg border-b pb-2 border-slate-200">
        <Lock className="w-5 h-5 text-[var(--app-accent,#2563eb)]" />
        <span>STEP 9：確定拠出年金 (DC・iDeCo) 計画</span>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          DC・iDeCoは原則60歳まで受取制限があるため、受取開始年齢以前は途中の生活費赤字補テンには充当されません。
        </span>
      </div>

      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">現在のDC・iDeCo残高</label>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min={0}
                step={10}
                value={dc.currentBalance}
                onChange={(e) => updateDc({ currentBalance: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-sm font-bold"
              />
              <span className="text-xs text-slate-600 font-medium">万円</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">毎月拠出額 (掛金)</label>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min={0}
                step={0.5}
                value={dc.monthlyContribution}
                onChange={(e) => updateDc({ monthlyContribution: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-sm font-bold"
              />
              <span className="text-xs text-slate-600 font-medium">万円/月</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">拠出終了年齢</label>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min={50}
                max={75}
                value={dc.contributionEndAge}
                onChange={(e) => updateDc({ contributionEndAge: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-sm font-bold"
              />
              <span className="text-xs text-slate-600 font-medium">歳</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">想定運用利回り (年率)</label>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                step={0.1}
                min={0}
                max={15}
                value={dc.expectedYieldRate}
                onChange={(e) => updateDc({ expectedYieldRate: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-sm font-bold"
              />
              <span className="text-xs text-slate-600 font-medium">%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">受取開始年齢</label>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min={60}
                max={75}
                value={dc.withdrawalStartAge}
                onChange={(e) => updateDc({ withdrawalStartAge: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-sm font-bold"
              />
              <span className="text-xs text-slate-600 font-medium">歳</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">受取形式</label>
            <select
              value={dc.withdrawalType}
              onChange={(e) => updateDc({ withdrawalType: e.target.value as 'lump_sum' | 'split' })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold"
            >
              <option value="lump_sum">一括受取 (退職一時金扱い)</option>
              <option value="split">分割受取 (年金形式)</option>
            </select>
          </div>
        </div>

        {dc.withdrawalType === 'split' && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">分割受取年数</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={5}
                max={30}
                value={dc.withdrawalYears}
                onChange={(e) => updateDc({ withdrawalYears: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold"
              />
              <span className="text-sm font-bold text-slate-700 shrink-0">年間</span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

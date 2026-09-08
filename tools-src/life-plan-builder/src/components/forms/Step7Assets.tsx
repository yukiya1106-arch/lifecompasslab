/**
 * STEP 7: 金融資産 フォーム
 */

import React from 'react';
import { LifePlanInput, FinancialAssetsInput } from '../../types/lifeplan';
import { Wallet, PieChart } from 'lucide-react';

interface Step7AssetsProps {
  input: LifePlanInput;
  onChange: (updated: LifePlanInput) => void;
}

export const Step7Assets: React.FC<Step7AssetsProps> = ({ input, onChange }) => {
  const updateAssets = (fields: Partial<FinancialAssetsInput>) => {
    onChange({
      ...input,
      financialAssets: { ...input.financialAssets, ...fields },
    });
  };

  const assets = input.financialAssets;
  const totalAssets = assets.currentCash + assets.currentTaxableAssets + assets.otherAssets + input.dcPlan.currentBalance;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg border-b pb-2 border-slate-200">
        <Wallet className="w-5 h-5 text-[var(--app-accent,#2563eb)]" />
        <span>STEP 7：現在の金融資産残高</span>
      </div>

      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">現預金 (銀行口座・キャッシュ)</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={0}
                step={10}
                value={assets.currentCash}
                onChange={(e) => updateAssets({ currentCash: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
              />
              <span className="text-sm font-bold text-slate-700 shrink-0">万円</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">NISA・投資信託・株式等 (換金可能)</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={0}
                step={10}
                value={assets.currentTaxableAssets}
                onChange={(e) => updateAssets({ currentTaxableAssets: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
              />
              <span className="text-sm font-bold text-slate-700 shrink-0">万円</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">その他換金可能資産</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={0}
                step={10}
                value={assets.otherAssets}
                onChange={(e) => updateAssets({ otherAssets: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
              />
              <span className="text-sm font-bold text-slate-700 shrink-0">万円</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          ※ DC・iDeCo等の受取制限資産（現在 {input.dcPlan.currentBalance} 万円）は STEP 9 で設定・管理されます。
        </p>

        {/* 金融資産合計カード */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-[var(--app-accent,#2563eb)]" />
            <span className="font-bold text-slate-700 text-sm">現在の金融資産合計：</span>
          </div>
          <span className="text-xl font-extrabold text-[var(--app-primary,#1e3a8a)]">{totalAssets} 万円</span>
        </div>

      </div>

    </div>
  );
};

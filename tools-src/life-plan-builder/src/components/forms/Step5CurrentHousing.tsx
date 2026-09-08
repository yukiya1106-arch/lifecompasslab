/**
 * STEP 5: 現在の住まい フォーム
 */

import React from 'react';
import { LifePlanInput, HousingType, CurrentHousingInput } from '../../types/lifeplan';
import { calculateMonthlyMortgagePayment } from '../../engine/housing';
import { Home, Key, Building2, Plus, Trash2, Calculator } from 'lucide-react';

interface Step5CurrentHousingProps {
  input: LifePlanInput;
  onChange: (updated: LifePlanInput) => void;
}

export const Step5CurrentHousing: React.FC<Step5CurrentHousingProps> = ({ input, onChange }) => {
  const updateCurrentHousing = (fields: Partial<CurrentHousingInput>) => {
    onChange({
      ...input,
      currentHousing: { ...input.currentHousing, ...fields },
    });
  };

  const housing = input.currentHousing;

  // ローン計算試算値
  const loanCalcMonthly = React.useMemo(() => {
    if (housing.type !== 'own_loan') return 0;
    const loan = housing.ownLoan;
    return calculateMonthlyMortgagePayment(loan.loanBalance, loan.interestRate, loan.remainingYears);
  }, [housing]);

  const loanAnnualPayment = loanCalcMonthly * 12;
  const payoffAge = (input.personAge || 30) + (housing.type === 'own_loan' ? housing.ownLoan.remainingYears : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg border-b pb-2 border-slate-200">
        <Home className="w-5 h-5 text-[var(--app-accent,#2563eb)]" />
        <span>STEP 5：現在の住まい</span>
      </div>

      {/* 種別選択 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { type: 'rent' as HousingType, label: '賃貸', icon: Key },
          { type: 'own_loan' as HousingType, label: '持ち家 (ローンあり)', icon: Home },
          { type: 'own_noloan' as HousingType, label: '持ち家 (ローンなし)', icon: Building2 },
          { type: 'family' as HousingType, label: '実家・社宅等', icon: Home },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = housing.type === item.type;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => updateCurrentHousing({ type: item.type })}
              className={`p-3.5 rounded-xl border font-bold text-xs flex flex-col items-center space-y-2 transition ${
                isSelected
                  ? 'border-[var(--app-accent,#2563eb)] bg-slate-100 text-[var(--app-primary,#1e3a8a)] shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isSelected ? 'text-[var(--app-accent,#2563eb)]' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 賃貸の場合 */}
      {housing.type === 'rent' && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <h4 className="font-semibold text-slate-700 text-sm">賃貸住まい条件</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">現在の月額家賃 (共益費込)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={housing.rent.monthlyRent}
                  onChange={(e) =>
                    updateCurrentHousing({
                      rent: { ...housing.rent, monthlyRent: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                />
                <span className="text-sm font-bold text-slate-700 shrink-0">万円/月</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">賃貸の想定退去・住み替え年齢 (本人の年齢)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={18}
                  max={100}
                  value={housing.rent.rentEndAge}
                  onChange={(e) =>
                    updateCurrentHousing({
                      rent: { ...housing.rent, rentEndAge: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                />
                <span className="text-sm font-bold text-slate-700 shrink-0">歳まで</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 持ち家・ローンありの場合 */}
      {housing.type === 'own_loan' && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <h4 className="font-semibold text-slate-700 text-sm">住宅ローン & 維持管理費</h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">現在のローン残高</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={housing.ownLoan.loanBalance}
                  onChange={(e) =>
                    updateCurrentHousing({
                      ownLoan: { ...housing.ownLoan, loanBalance: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                />
                <span className="text-xs text-slate-600 font-medium">万円</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">借入金利 (年率)</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={10}
                  value={housing.ownLoan.interestRate}
                  onChange={(e) =>
                    updateCurrentHousing({
                      ownLoan: { ...housing.ownLoan, interestRate: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                />
                <span className="text-xs text-slate-600 font-medium">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">残り返済期間</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={housing.ownLoan.remainingYears}
                  onChange={(e) =>
                    updateCurrentHousing({
                      ownLoan: { ...housing.ownLoan, remainingYears: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                />
                <span className="text-xs text-slate-600 font-medium">年</span>
              </div>
            </div>
          </div>

          {/* 返済額・完済予定年齢の自動計算表示 */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
              <Calculator className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
              <span>自動計算される返済額・完済予定</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="text-[10px] text-slate-500 block">試算月額返済額</span>
                <span className="font-bold text-[var(--app-primary,#1e3a8a)] text-sm">{loanCalcMonthly.toFixed(1)} 万円</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="text-[10px] text-slate-500 block">試算年間返済額</span>
                <span className="font-bold text-slate-800 text-sm">{loanAnnualPayment.toFixed(1)} 万円</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="text-[10px] text-slate-500 block">完済予定年齢</span>
                <span className="font-bold text-emerald-700 text-sm">{payoffAge} 歳</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">管理費・修繕積立金等</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={housing.ownLoan.managementFeeMonthly}
                  onChange={(e) =>
                    updateCurrentHousing({
                      ownLoan: { ...housing.ownLoan, managementFeeMonthly: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                />
                <span className="text-xs text-slate-600 font-medium">万円/月</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">固定資産税・修繕費等</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={housing.ownLoan.propertyTaxAnnual}
                  onChange={(e) =>
                    updateCurrentHousing({
                      ownLoan: { ...housing.ownLoan, propertyTaxAnnual: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                />
                <span className="text-xs text-slate-600 font-medium">万円/年</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 持ち家・ローンなしの場合 */}
      {housing.type === 'own_noloan' && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <h4 className="font-semibold text-slate-700 text-sm">維持管理費・税金</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">管理費・修繕積立金等</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={housing.ownNoLoan.managementFeeMonthly}
                  onChange={(e) =>
                    updateCurrentHousing({
                      ownNoLoan: { ...housing.ownNoLoan, managementFeeMonthly: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                />
                <span className="text-sm font-bold text-slate-700 shrink-0">万円/月</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">固定資産税・大規模修繕費等</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={housing.ownNoLoan.propertyTaxAnnual}
                  onChange={(e) =>
                    updateCurrentHousing({
                      ownNoLoan: { ...housing.ownNoLoan, propertyTaxAnnual: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                />
                <span className="text-sm font-bold text-slate-700 shrink-0">万円/年</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

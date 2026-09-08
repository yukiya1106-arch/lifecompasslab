/**
 * STEP 6: 将来の住宅購入・住み替え フォーム
 */

import React from 'react';
import { LifePlanInput, FutureHousingInput, FutureHousingPlanType, ExistingHousingSaleChoice } from '../../types/lifeplan';
import { calculatePurchaseMetrics, calculateHousingSaleNetProceeds } from '../../engine/housing';
import { Building, AlertTriangle, CheckCircle, Calculator, RefreshCw } from 'lucide-react';

interface Step6FutureHousingProps {
  input: LifePlanInput;
  onChange: (updated: LifePlanInput) => void;
}

export const Step6FutureHousing: React.FC<Step6FutureHousingProps> = ({ input, onChange }) => {
  const updateFutureHousing = (fields: Partial<FutureHousingInput>) => {
    onChange({
      ...input,
      futureHousing: { ...input.futureHousing, ...fields },
    });
  };

  const future = input.futureHousing;

  // 試算結果
  const metrics = React.useMemo(() => {
    return calculatePurchaseMetrics(future, input.personAge);
  }, [future, input.personAge]);

  // 売却計算 (住み替え時)
  const saleCalc = React.useMemo(() => {
    if (future.planType !== 'relocate' || future.sellCurrentHousing !== 'sell') return null;
    const elapsedYears = Math.max(0, future.purchaseAge - input.personAge);
    return calculateHousingSaleNetProceeds(input.currentHousing, future, elapsedYears);
  }, [input.currentHousing, future, input.personAge]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg border-b pb-2 border-slate-200">
        <Building className="w-5 h-5 text-[var(--app-accent,#2563eb)]" />
        <span>STEP 6：将来の住宅購入・住み替え計画</span>
      </div>

      {/* 計画タイプ選択 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { type: 'none' as FutureHousingPlanType, label: '予定なし' },
          { type: 'purchase' as FutureHousingPlanType, label: '新規購入' },
          { type: 'relocate' as FutureHousingPlanType, label: '住み替え' },
        ].map((item) => {
          const isSelected = future.planType === item.type;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => updateFutureHousing({ planType: item.type })}
              className={`p-3.5 rounded-xl border font-bold text-xs transition ${
                isSelected
                  ? 'border-[var(--app-accent,#2563eb)] bg-slate-100 text-[var(--app-primary,#1e3a8a)] shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {future.planType !== 'none' && (
        <div className="space-y-6">
          
          {/* 住み替えの場合の旧居売却設定 */}
          {future.planType === 'relocate' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-semibold text-slate-700 text-sm flex items-center space-x-1.5">
                <RefreshCw className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
                <span>旧居の扱い・売却計画</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">旧居の処分方法</label>
                  <select
                    value={future.sellCurrentHousing}
                    onChange={(e) => updateFutureHousing({ sellCurrentHousing: e.target.value as ExistingHousingSaleChoice })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <option value="sell">売却する</option>
                    <option value="keep">保有を続ける</option>
                    <option value="undecided">未定</option>
                  </select>
                </div>

                {future.sellCurrentHousing === 'sell' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">想定売却価格</label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          step={50}
                          min={0}
                          value={future.expectedSalePrice}
                          onChange={(e) => updateFutureHousing({ expectedSalePrice: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                        />
                        <span className="text-xs text-slate-600">万円</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">売却費用率</label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={10}
                          value={future.saleExpenseRate}
                          onChange={(e) => updateFutureHousing({ saleExpenseRate: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                        />
                        <span className="text-xs text-slate-600">%</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {saleCalc && (
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>売却価格: {saleCalc.salePrice}万円 － 費用: {saleCalc.saleExpenses.toFixed(1)}万円 － 残債: {saleCalc.loanBalanceAtSale.toFixed(1)}万円</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                    <span>売却後手取り額：</span>
                    <span className={saleCalc.netProceeds >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                      {saleCalc.netProceeds >= 0 ? `+${saleCalc.netProceeds.toFixed(1)} 万円` : `${saleCalc.netProceeds.toFixed(1)} 万円 (追加資金要)`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 購入条件設定 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="font-semibold text-slate-700 text-sm">購入物件・ローン条件</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">購入・住み替え予定年齢 (本人)</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={input.personAge}
                    max={85}
                    value={future.purchaseAge}
                    onChange={(e) => updateFutureHousing({ purchaseAge: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold"
                  />
                  <span className="text-xs text-slate-600 font-medium">歳</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">物件価格</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={future.propertyPrice}
                    onChange={(e) => updateFutureHousing({ propertyPrice: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold"
                  />
                  <span className="text-xs text-slate-600 font-medium">万円</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">購入諸費用 (登記、各種手数料等)</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={future.purchaseExpenses}
                    onChange={(e) => updateFutureHousing({ purchaseExpenses: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold"
                  />
                  <span className="text-xs text-slate-600 font-medium">万円</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">頭金 (自己資金準備)</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={future.downPayment}
                    onChange={(e) => updateFutureHousing({ downPayment: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold"
                  />
                  <span className="text-xs text-slate-600 font-medium">万円</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">借入額</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={future.loanAmount}
                    onChange={(e) => updateFutureHousing({ loanAmount: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold"
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
                    value={future.interestRate}
                    onChange={(e) => updateFutureHousing({ interestRate: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold"
                  />
                  <span className="text-xs text-slate-600 font-medium">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">返済期間</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={future.loanTermYears}
                    onChange={(e) => updateFutureHousing({ loanTermYears: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold"
                  />
                  <span className="text-xs text-slate-600 font-medium">年</span>
                </div>
              </div>
            </div>

            {/* 資金調達の恒等式チェック警告 */}
            {!metrics.isIdentityConsistent && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">【資金調達バランスの不整合】</p>
                  <p>
                    「物件価格({future.propertyPrice}万)」に対し、「頭金({future.downPayment}万)＋借入額({future.loanAmount}万) ＝ {future.downPayment + future.loanAmount}万円」となっています。(差額 {metrics.identityDiff} 万円)
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700">
                    ※購入諸費用({future.purchaseExpenses}万円)は購入時に自己資金(現金)から別途支払われます(初期現金支出: {future.downPayment + future.purchaseExpenses}万円)。諸費用ローンの組み入れは計算対象外です。
                  </p>
                </div>
              </div>
            )}

            {/* 即時計算試算表示 */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                <Calculator className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
                <span>住宅購入・ローン返済 即時試算</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">毎月返済額</span>
                  <span className="font-bold text-[var(--app-primary,#1e3a8a)] text-sm">{metrics.monthlyPayment.toFixed(1)} 万円</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">年間返済額</span>
                  <span className="font-bold text-slate-800 text-sm">{metrics.annualPayment.toFixed(0)} 万円</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">総返済額</span>
                  <span className="font-bold text-slate-800 text-sm">{metrics.totalPayment.toFixed(0)} 万円</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">うち総利息額</span>
                  <span className="font-bold text-amber-700 text-sm">{metrics.totalInterest.toFixed(0)} 万円</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">完済予定年齢</span>
                  <span className="font-bold text-slate-800 text-sm">{metrics.payoffAge} 歳</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">購入時頭金+諸費用</span>
                  <span className="font-bold text-red-600 text-sm">{metrics.initialCashRequired} 万円</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

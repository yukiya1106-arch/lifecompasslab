/**
 * 保険入力セクション (InsuranceSection.tsx)
 * 
 * STEP 3 内で「世帯保険料」「現在の死亡保障（かんたん/詳しく入力）」「必要保障額の計算前提」を設定します。
 */

import React, { useState } from 'react';
import {
  LifePlanInput,
  DeathBenefitInput,
  InsuredPerson,
  DeathBenefitType,
  InsuranceInputMode,
  ProtectionScenarioInput,
} from '../../types/lifeplan';
import { Shield, Plus, Trash2, ChevronDown, ChevronUp, Info, HelpCircle, Sparkles } from 'lucide-react';
import { calculateSurvivorBenefitEstimate, PENSION_REFERENCE_YEAR } from '../../utils/pension';

interface InsuranceSectionProps {
  input: LifePlanInput;
  onChange: (updated: LifePlanInput) => void;
}

export const InsuranceSection: React.FC<InsuranceSectionProps> = ({ input, onChange }) => {
  const [isScenarioOpen, setIsScenarioOpen] = useState(false);

  const insurance = input.insurance;
  const living = input.livingExpenses;

  // 世帯保険料更新
  const updateLivingInsurance = (fields: { insurancePremiumMonthly?: number; insuranceEndAge?: number }) => {
    onChange({
      ...input,
      livingExpenses: {
        ...input.livingExpenses,
        ...fields,
      },
    });
  };

  // 入力モード切替
  const handleModeChange = (mode: InsuranceInputMode) => {
    onChange({
      ...input,
      insurance: {
        ...insurance,
        inputMode: mode,
      },
    });
  };

  // かんたん入力用の値取得 helper
  const getSimpleBenefit = (person: InsuredPerson): DeathBenefitInput => {
    const found = insurance.deathBenefits.find(
      (b) => b.insuredPerson === person && b.benefitType === 'lump_sum'
    );
    if (found) return found;

    return {
      id: `db_${person}_simple`,
      label: `${person === 'person' ? '本人' : '配偶者'}の死亡保障`,
      insuredPerson: person,
      benefitType: 'lump_sum',
      lumpSumAmount: 0,
      monthlyAmount: 0,
      coverageEndAge: 60,
      wholeLife: false,
    };
  };

  // かんたん入力時のデータ更新
  const updateSimpleBenefit = (
    person: InsuredPerson,
    fields: Partial<Pick<DeathBenefitInput, 'lumpSumAmount' | 'coverageEndAge' | 'wholeLife'>>
  ) => {
    const existingIndex = insurance.deathBenefits.findIndex(
      (b) => b.insuredPerson === person && b.benefitType === 'lump_sum'
    );

    let updatedList = [...insurance.deathBenefits];

    if (existingIndex >= 0) {
      updatedList[existingIndex] = {
        ...updatedList[existingIndex]!,
        ...fields,
      };
    } else {
      const newBenefit: DeathBenefitInput = {
        id: `db_${person}_${Date.now()}`,
        label: `${person === 'person' ? '本人' : '配偶者'}の死亡保障`,
        insuredPerson: person,
        benefitType: 'lump_sum',
        lumpSumAmount: fields.lumpSumAmount ?? 0,
        monthlyAmount: 0,
        coverageEndAge: fields.coverageEndAge ?? 60,
        wholeLife: fields.wholeLife ?? false,
      };
      updatedList.push(newBenefit);
    }

    onChange({
      ...input,
      insurance: {
        ...insurance,
        deathBenefits: updatedList,
      },
    });
  };

  // 詳しく入力時のアイテム更新
  const updateBenefitItem = (id: string, fields: Partial<DeathBenefitInput>) => {
    const updatedList = insurance.deathBenefits.map((b) => (b.id === id ? { ...b, ...fields } : b));
    onChange({
      ...input,
      insurance: {
        ...insurance,
        deathBenefits: updatedList,
      },
    });
  };

  // 詳しく入力時のアイテム追加
  const addBenefitItem = (person: InsuredPerson = 'person') => {
    const newItem: DeathBenefitInput = {
      id: `db_det_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: `${person === 'person' ? '本人' : '配偶者'}の生命保険`,
      insuredPerson: person,
      benefitType: 'lump_sum',
      lumpSumAmount: 0,
      monthlyAmount: 0,
      coverageEndAge: 60,
      wholeLife: false,
    };
    onChange({
      ...input,
      insurance: {
        ...insurance,
        deathBenefits: [...insurance.deathBenefits, newItem],
      },
    });
  };

  // 詳しく入力時のアイテム削除
  const removeBenefitItem = (id: string) => {
    const updatedList = insurance.deathBenefits.filter((b) => b.id !== id);
    onChange({
      ...input,
      insurance: {
        ...insurance,
        deathBenefits: updatedList,
      },
    });
  };

  // 前提条件（シナリオ）更新
  const updateScenario = (
    target: 'personDeath' | 'spouseDeath',
    fields: Partial<ProtectionScenarioInput>
  ) => {
    onChange({
      ...input,
      insurance: {
        ...insurance,
        protectionScenarios: {
          ...insurance.protectionScenarios,
          [target]: {
            ...insurance.protectionScenarios[target],
            ...fields,
          },
        },
      },
    });
  };

  const personSimple = getSimpleBenefit('person');
  const spouseSimple = getSimpleBenefit('spouse');

  // 遺族年金目安の自動計算
  const personSurvivorEstimate = calculateSurvivorBenefitEstimate(input, 'person');
  const spouseSurvivorEstimate = calculateSurvivorBenefitEstimate(input, 'spouse');

  // 追加保障の判定（収入保障型、または2件目以降の一時金保障）
  const incomeBenefitsCount = insurance.deathBenefits.filter((b) => b.benefitType === 'income').length;
  const personLumpSumCount = insurance.deathBenefits.filter((b) => b.insuredPerson === 'person' && b.benefitType === 'lump_sum').length;
  const spouseLumpSumCount = insurance.deathBenefits.filter((b) => b.insuredPerson === 'spouse' && b.benefitType === 'lump_sum').length;
  const extraPersonLumpSum = personLumpSumCount > 1 ? personLumpSumCount - 1 : 0;
  const extraSpouseLumpSum = spouseLumpSumCount > 1 ? spouseLumpSumCount - 1 : 0;
  const additionalBenefitsCount = incomeBenefitsCount + extraPersonLumpSum + extraSpouseLumpSum;

  return (
    <div className="space-y-6 pt-4 border-t border-slate-200">
      
      {/* A. 世帯の保険料 */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <h4 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
          <Shield className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
          <span>A．世帯の保険料 (家計支出)</span>
        </h4>
        <p className="text-xs text-slate-500">
          毎月支払っている生命保険・医療保険等の合計金額です。キャッシュフローの生活費・支出計算に使用されます。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">世帯の毎月保険料</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={0}
                step={0.5}
                value={living.insurancePremiumMonthly}
                onChange={(e) => updateLivingInsurance({ insurancePremiumMonthly: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none font-semibold"
              />
              <span className="text-sm font-bold text-slate-700 shrink-0">万円/月</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">保険料の払込終了年齢 (本人の年齢)</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={50}
                max={90}
                value={living.insuranceEndAge}
                onChange={(e) => updateLivingInsurance({ insuranceEndAge: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none font-semibold"
              />
              <span className="text-sm font-bold text-slate-700 shrink-0">歳</span>
            </div>
          </div>
        </div>
      </div>

      {/* B. 現在の死亡保障 */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>B．現在の死亡保障 (保障額比較用)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              万一の際に受け取れる死亡保険金を設定します。必要保障額との比較グラフに使用されます。
            </p>
          </div>

          {/* モード切替タブ */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-lg text-xs font-bold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleModeChange('simple')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                insurance.inputMode === 'simple'
                  ? 'bg-white text-[var(--app-primary,#1e3a8a)] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              かんたん入力
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('detailed')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                insurance.inputMode === 'detailed'
                  ? 'bg-white text-[var(--app-primary,#1e3a8a)] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              詳しく入力
            </button>
          </div>
        </div>

        {/* かんたん入力画面 */}
        {insurance.inputMode === 'simple' && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-900 flex items-start space-x-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                同じ保障終了年齢の死亡保障は合計して入力できます。収入保障や保障終了年齢が複数ある場合は、詳しく入力をご利用ください。
              </span>
            </div>

            {additionalBenefitsCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900 flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  詳しく入力で登録した追加保障{additionalBenefitsCount}件も、現在の保障額計算に含まれています。
                  内容を確認・変更する場合は『詳しく入力』を開いてください。
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 本人の死亡保障 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-800">本人の一時金死亡保障</span>
                  <label className="flex items-center space-x-1 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={personSimple.wholeLife}
                      onChange={(e) => updateSimpleBenefit('person', { wholeLife: e.target.checked })}
                      className="rounded text-[var(--app-accent,#2563eb)] focus:ring-[var(--app-accent,#2563eb)]"
                    />
                    <span>終身保障</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">死亡保障額 (一時金)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={personSimple.lumpSumAmount}
                      onChange={(e) => updateSimpleBenefit('person', { lumpSumAmount: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-700 shrink-0">万円</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">保障終了年齢</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={40}
                      max={90}
                      disabled={personSimple.wholeLife}
                      value={personSimple.wholeLife ? '' : personSimple.coverageEndAge}
                      onChange={(e) => updateSimpleBenefit('person', { coverageEndAge: Number(e.target.value) })}
                      className={`w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none ${
                        personSimple.wholeLife ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-700 shrink-0">歳</span>
                  </div>
                </div>
              </div>

              {/* 配偶者の死亡保障 (配偶者がいる場合のみ) */}
              {input.hasSpouse && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-800">配偶者の一時金死亡保障</span>
                    <label className="flex items-center space-x-1 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={spouseSimple.wholeLife}
                        onChange={(e) => updateSimpleBenefit('spouse', { wholeLife: e.target.checked })}
                        className="rounded text-[var(--app-accent,#2563eb)] focus:ring-[var(--app-accent,#2563eb)]"
                      />
                      <span>終身保障</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">死亡保障額 (一時金)</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={spouseSimple.lumpSumAmount}
                        onChange={(e) => updateSimpleBenefit('spouse', { lumpSumAmount: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                      />
                      <span className="text-xs font-bold text-slate-700 shrink-0">万円</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">保障終了年齢</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={40}
                        max={90}
                        disabled={spouseSimple.wholeLife}
                        value={spouseSimple.wholeLife ? '' : spouseSimple.coverageEndAge}
                        onChange={(e) => updateSimpleBenefit('spouse', { coverageEndAge: Number(e.target.value) })}
                        className={`w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none ${
                          spouseSimple.wholeLife ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-700 shrink-0">歳</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 詳しく入力画面 */}
        {insurance.inputMode === 'detailed' && (
          <div className="space-y-4">
            {insurance.deathBenefits.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                登録されている死亡保障はありません。「保障を追加」ボタンから追加してください。
              </div>
            ) : (
              <div className="space-y-3">
                {insurance.deathBenefits.map((item, idx) => (
                  <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateBenefitItem(item.id, { label: e.target.value })}
                          placeholder="例: 〇〇生命 定期保険"
                          className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 w-full sm:w-48 focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* 誰の保障か */}
                        {input.hasSpouse ? (
                          <select
                            value={item.insuredPerson}
                            onChange={(e) => updateBenefitItem(item.id, { insuredPerson: e.target.value as InsuredPerson })}
                            className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded px-2 py-1"
                          >
                            <option value="person">本人</option>
                            <option value="spouse">配偶者</option>
                          </select>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">本人</span>
                        )}

                        <button
                          type="button"
                          onClick={() => removeBenefitItem(item.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* 受取形態 */}
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">受け取り方</label>
                        <select
                          value={item.benefitType}
                          onChange={(e) => {
                            const newType = e.target.value as DeathBenefitType;
                            updateBenefitItem(item.id, {
                              benefitType: newType,
                              wholeLife: newType === 'income' ? false : item.wholeLife,
                            });
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                        >
                          <option value="lump_sum">一時金 (1回一括受取)</option>
                          <option value="income">毎月受取 (収入保障型)</option>
                        </select>
                      </div>

                      {/* 保障額 */}
                      <div>
                        {item.benefitType === 'lump_sum' ? (
                          <>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-xs text-slate-500">死亡保障額 (一時金)</label>
                              <label className="flex items-center space-x-1 text-[11px] text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.wholeLife}
                                  onChange={(e) => updateBenefitItem(item.id, { wholeLife: e.target.checked })}
                                  className="rounded text-[var(--app-accent,#2563eb)] focus:ring-[var(--app-accent,#2563eb)]"
                                />
                                <span>終身</span>
                              </label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min={0}
                                step={50}
                                value={item.lumpSumAmount}
                                onChange={(e) => updateBenefitItem(item.id, { lumpSumAmount: Number(e.target.value) })}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                              />
                              <span className="text-xs font-bold text-slate-600 shrink-0">万円</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <label className="block text-xs text-slate-500 mb-1">毎月の受取額</label>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={item.monthlyAmount}
                                onChange={(e) => updateBenefitItem(item.id, { monthlyAmount: Number(e.target.value) })}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                              />
                              <span className="text-xs font-bold text-slate-600 shrink-0">万円/月</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* 保障終了年齢 */}
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">保障終了年齢</label>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min={40}
                            max={90}
                            disabled={item.wholeLife}
                            value={item.wholeLife ? '' : item.coverageEndAge}
                            onChange={(e) => updateBenefitItem(item.id, { coverageEndAge: Number(e.target.value) })}
                            className={`w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none ${
                              item.wholeLife ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-600 shrink-0">歳</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => addBenefitItem('person')}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>本人の保障を追加</span>
              </button>

              {input.hasSpouse && (
                <button
                  type="button"
                  onClick={() => addBenefitItem('spouse')}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>配偶者の保障を追加</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* C. 必要保障額の計算前提（任意） */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsScenarioOpen(!isScenarioOpen)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
            <span className="font-semibold text-slate-800 text-sm">必要保障額の計算前提 (任意設定)</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
              遺族年金目安の自動計算対応
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
              {isScenarioOpen ? '開く' : 'クリックして設定'}
            </span>
          </div>
          {isScenarioOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {isScenarioOpen && (
          <div className="p-4 pt-0 space-y-4 border-t border-slate-200/60 mt-2">
            <p className="text-xs text-slate-500 leading-relaxed pt-2">
              万一が発生した後の生活費割合、遺族年金等の加算額、葬儀費用、住宅ローンの団信適用条件を個別に調整できます。
            </p>

            {/* 遺族年金等の参考目安 自動計算バナー */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5">
              <div className="flex items-start space-x-2.5">
                <Sparkles className="w-4 h-4 text-[var(--app-accent,#2563eb)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-800">家族構成・年収から遺族年金等の目安を自動反映</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                    「参考目安を使用（標準）」を選択中であれば、現在の年収・家族構成・年金加入区分に基づいて将来の遺族年金等の目安が毎年度自動的に計算・反映されます。
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 本人に万一があった場合 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                <h5 className="font-bold text-xs text-[var(--app-primary,#1e3a8a)] border-b pb-1.5 border-slate-100">
                  【本人に万一があった場合】
                </h5>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">万一後の基本生活費割合</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={30}
                      max={100}
                      step={5}
                      value={insurance.protectionScenarios.personDeath.survivorLivingExpenseRate}
                      onChange={(e) =>
                        updateScenario('personDeath', { survivorLivingExpenseRate: Number(e.target.value) })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-700 shrink-0">%</span>
                  </div>
                </div>

                {/* 遺族年金等の参考目安 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs text-slate-700 font-bold">遺族年金等の参考目安</label>
                    <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => updateScenario('personDeath', { useEstimatedSurvivorBenefit: true })}
                        className={`px-2 py-0.5 rounded-md transition-colors ${
                          insurance.protectionScenarios.personDeath.useEstimatedSurvivorBenefit !== false
                            ? 'bg-white text-[var(--app-accent,#2563eb)] shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        参考目安を使用
                      </button>
                      <button
                        type="button"
                        onClick={() => updateScenario('personDeath', { useEstimatedSurvivorBenefit: false })}
                        className={`px-2 py-0.5 rounded-md transition-colors ${
                          insurance.protectionScenarios.personDeath.useEstimatedSurvivorBenefit === false
                            ? 'bg-white text-[var(--app-accent,#2563eb)] shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        金額を手入力
                      </button>
                    </div>
                  </div>

                  {insurance.protectionScenarios.personDeath.useEstimatedSurvivorBenefit !== false ? (
                    <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-slate-800 border-b pb-1 border-blue-200/60">
                        <span>合計参考目安</span>
                        <span className="text-sm text-[var(--app-accent,#2563eb)]">
                          約{personSurvivorEstimate.annualAmount}万円/年
                        </span>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-600">
                        <div className="flex justify-between">
                          <span>遺族基礎年金の参考目安</span>
                          <span>約{personSurvivorEstimate.basicPension}万円/年</span>
                        </div>
                        <div className="flex justify-between">
                          <span>遺族厚生年金の参考目安</span>
                          <span>約{personSurvivorEstimate.employeePension}万円/年</span>
                        </div>
                        {personSurvivorEstimate.widowAddition > 0 && (
                          <div className="flex justify-between">
                            <span>中高齢寡婦加算の参考目安</span>
                            <span>約{personSurvivorEstimate.widowAddition}万円/年</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 pt-1 border-t border-blue-100 leading-normal">
                        子どもの人数・年齢をもとにした簡易目安 ({PENSION_REFERENCE_YEAR} / 目安終了: {personSurvivorEstimate.endAge}歳)
                      </p>
                      {personSurvivorEstimate.employeePension > 0 && (
                        <p className="text-[10px] text-slate-500 leading-normal pt-0.5">
                          現在の年収や厚生年金加入をもとにした簡易的な参考目安です。実際の金額は、過去の標準報酬や加入期間等により異なります。
                        </p>
                      )}
                      {personSurvivorEstimate.note && (
                        <p className="text-[10px] text-amber-700 font-semibold leading-normal pt-0.5">
                          ※{personSurvivorEstimate.note}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min={0}
                          step={10}
                          value={insurance.protectionScenarios.personDeath.annualSurvivorBenefit}
                          onChange={(e) =>
                            updateScenario('personDeath', { annualSurvivorBenefit: Number(e.target.value) })
                          }
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                        />
                        <span className="text-xs font-bold text-slate-700 shrink-0">万円/年</span>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">
                          {input.hasSpouse
                            ? '遺族年金等の受取終了年齢（配偶者の年齢）'
                            : '遺族年金等の受取終了時期（本人が何歳になる年まで）'}
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min={50}
                            max={90}
                            value={insurance.protectionScenarios.personDeath.survivorBenefitEndAge}
                            onChange={(e) =>
                              updateScenario('personDeath', { survivorBenefitEndAge: Number(e.target.value) })
                            }
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                          />
                          <span className="text-xs font-bold text-slate-700 shrink-0">歳</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">葬儀・整理資金</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={insurance.protectionScenarios.personDeath.funeralExpense}
                      onChange={(e) =>
                        updateScenario('personDeath', { funeralExpense: Number(e.target.value) })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-700 shrink-0">万円</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">住宅ローンの団信完済</label>
                  <select
                    value={insurance.protectionScenarios.personDeath.mortgageCoveredByDanshin ? 'true' : 'false'}
                    onChange={(e) =>
                      updateScenario('personDeath', { mortgageCoveredByDanshin: e.target.value === 'true' })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                  >
                    <option value="false">適用しない (ローン返済継続)</option>
                    <option value="true">適用する (団信等で完済)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 font-bold mb-1">保障を考える期間</label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={[60, 65, 70, input.calculationEndAge].includes(insurance.protectionScenarios.personDeath.calculationEndAge ?? 65) ? (insurance.protectionScenarios.personDeath.calculationEndAge ?? 65) : input.calculationEndAge}
                      onChange={(e) => {
                        updateScenario('personDeath', { calculationEndAge: Number(e.target.value) });
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                    >
                      <option value={60}>60歳まで</option>
                      <option value={65}>65歳まで (標準)</option>
                      <option value={70}>70歳まで</option>
                      <option value={input.calculationEndAge}>ライフプラン終了まで ({input.calculationEndAge}歳)</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">
                    選択した期間までの生活費・教育費等を対象とした簡易的な必要保障額です。選択期間以降の老後資金等は、この金額に含まれません。
                  </p>
                  {(insurance.protectionScenarios.personDeath.calculationEndAge ?? 65) >= input.calculationEndAge && (
                    <p className="text-[10px] text-amber-700 font-semibold mt-1 leading-normal">
                      ※老後を含む理論上の参考値であり、この全額を生命保険で準備することを推奨するものではありません。
                    </p>
                  )}
                </div>
              </div>

              {/* 配偶者に万一があった場合 (配偶者がいる場合) */}
              {input.hasSpouse && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <h5 className="font-bold text-xs text-[var(--app-primary,#1e3a8a)] border-b pb-1.5 border-slate-100">
                    【配偶者に万一があった場合】
                  </h5>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">万一後の基本生活費割合</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={30}
                        max={100}
                        step={5}
                        value={insurance.protectionScenarios.spouseDeath.survivorLivingExpenseRate}
                        onChange={(e) =>
                          updateScenario('spouseDeath', { survivorLivingExpenseRate: Number(e.target.value) })
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                      />
                      <span className="text-xs font-bold text-slate-700 shrink-0">%</span>
                    </div>
                  </div>

                  {/* 遺族年金等の参考目安 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs text-slate-700 font-bold">遺族年金等の参考目安</label>
                      <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => updateScenario('spouseDeath', { useEstimatedSurvivorBenefit: true })}
                          className={`px-2 py-0.5 rounded-md transition-colors ${
                            insurance.protectionScenarios.spouseDeath.useEstimatedSurvivorBenefit !== false
                              ? 'bg-white text-[var(--app-accent,#2563eb)] shadow-2xs font-bold'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          参考目安を使用
                        </button>
                        <button
                          type="button"
                          onClick={() => updateScenario('spouseDeath', { useEstimatedSurvivorBenefit: false })}
                          className={`px-2 py-0.5 rounded-md transition-colors ${
                            insurance.protectionScenarios.spouseDeath.useEstimatedSurvivorBenefit === false
                              ? 'bg-white text-[var(--app-accent,#2563eb)] shadow-2xs font-bold'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          金額を手入力
                        </button>
                      </div>
                    </div>

                    {insurance.protectionScenarios.spouseDeath.useEstimatedSurvivorBenefit !== false ? (
                      <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-bold text-slate-800 border-b pb-1 border-blue-200/60">
                          <span>合計参考目安</span>
                          <span className="text-sm text-[var(--app-accent,#2563eb)]">
                            約{spouseSurvivorEstimate.annualAmount}万円/年
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] text-slate-600">
                          <div className="flex justify-between">
                            <span>遺族基礎年金の参考目安</span>
                            <span>約{spouseSurvivorEstimate.basicPension}万円/年</span>
                          </div>
                          <div className="flex justify-between">
                            <span>遺族厚生年金の参考目安</span>
                            <span>約{spouseSurvivorEstimate.employeePension}万円/年</span>
                          </div>
                          {spouseSurvivorEstimate.widowAddition > 0 && (
                            <div className="flex justify-between">
                              <span>中高齢寡婦加算の参考目安</span>
                              <span>約{spouseSurvivorEstimate.widowAddition}万円/年</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 pt-1 border-t border-blue-100 leading-normal">
                          子どもの人数・年齢をもとにした簡易目安 ({PENSION_REFERENCE_YEAR} / 目安終了: {spouseSurvivorEstimate.endAge}歳)
                        </p>
                        {spouseSurvivorEstimate.employeePension > 0 && (
                          <p className="text-[10px] text-slate-500 leading-normal pt-0.5">
                            現在の年収や厚生年金加入をもとにした簡易的な参考目安です。実際の金額は、過去の標準報酬や加入期間等により異なります。
                          </p>
                        )}
                        {spouseSurvivorEstimate.note && (
                          <p className="text-[10px] text-amber-700 font-semibold leading-normal pt-0.5">
                            ※{spouseSurvivorEstimate.note}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min={0}
                            step={10}
                            value={insurance.protectionScenarios.spouseDeath.annualSurvivorBenefit}
                            onChange={(e) =>
                              updateScenario('spouseDeath', { annualSurvivorBenefit: Number(e.target.value) })
                            }
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                          />
                          <span className="text-xs font-bold text-slate-700 shrink-0">万円/年</span>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">遺族年金等の受取終了年齢 (本人の年齢)</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min={50}
                              max={90}
                              value={insurance.protectionScenarios.spouseDeath.survivorBenefitEndAge}
                              onChange={(e) =>
                                updateScenario('spouseDeath', { survivorBenefitEndAge: Number(e.target.value) })
                              }
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                            />
                            <span className="text-xs font-bold text-slate-700 shrink-0">歳</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">葬儀・整理資金</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={insurance.protectionScenarios.spouseDeath.funeralExpense}
                        onChange={(e) =>
                          updateScenario('spouseDeath', { funeralExpense: Number(e.target.value) })
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                      />
                      <span className="text-xs font-bold text-slate-700 shrink-0">万円</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">住宅ローンの団信完済</label>
                    <select
                      value={insurance.protectionScenarios.spouseDeath.mortgageCoveredByDanshin ? 'true' : 'false'}
                      onChange={(e) =>
                        updateScenario('spouseDeath', { mortgageCoveredByDanshin: e.target.value === 'true' })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                    >
                      <option value="false">適用しない (ローン返済継続)</option>
                      <option value="true">適用する (団信等で完済)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 font-bold mb-1">保障を考える期間</label>
                    <div className="flex items-center space-x-2">
                      <select
                        value={[60, 65, 70, input.calculationEndAge].includes(insurance.protectionScenarios.spouseDeath.calculationEndAge ?? 65) ? (insurance.protectionScenarios.spouseDeath.calculationEndAge ?? 65) : input.calculationEndAge}
                        onChange={(e) => {
                          updateScenario('spouseDeath', { calculationEndAge: Number(e.target.value) });
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                      >
                        <option value={60}>60歳まで</option>
                        <option value={65}>65歳まで (標準)</option>
                        <option value={70}>70歳まで</option>
                        <option value={input.calculationEndAge}>ライフプラン終了まで ({input.calculationEndAge}歳)</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">
                      選択した期間までの生活費・教育費等を対象とした簡易的な必要保障額です。選択期間以降の老後資金等は、この金額に含まれません。
                    </p>
                    {(insurance.protectionScenarios.spouseDeath.calculationEndAge ?? 65) >= input.calculationEndAge && (
                      <p className="text-[10px] text-amber-700 font-semibold mt-1 leading-normal">
                        ※老後を含む理論上の参考値であり、この全額を生命保険で準備することを推奨するものではありません。
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

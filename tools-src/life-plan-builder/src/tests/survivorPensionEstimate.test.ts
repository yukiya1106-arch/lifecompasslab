import { describe, it, expect } from 'vitest';
import { calculateSurvivorBenefitEstimate, calculateSurvivorBenefitForYear } from '../utils/pension';
import { calculateProtectionNeedsAnalysis } from '../engine/protection';
import { runLifePlanSimulation } from '../engine/cashflow';
import { LifePlanInput } from '../types/lifeplan';
import { defaultLifePlanInput } from '../data/defaultValues';

describe('遺族年金等の参考目安と年金加入区分の連動テスト', () => {
  it('1. 厚生年金加入者には遺族厚生年金の目安が加算される', () => {
    const input: LifePlanInput = {
      ...defaultLifePlanInput,
      personIncome: {
        ...defaultLifePlanInput.personIncome,
        currentGrossIncome: 500,
        pensionType: 'employees_pension',
      },
      hasSpouse: true,
      children: [{ ...defaultLifePlanInput.children[0]!, id: 'test_child_1', name: '第一子', currentAge: 5 }],
    };

    const res = calculateSurvivorBenefitEstimate(input, 'person');
    // 厚生年金目安: 500 * 0.103 = 52万円（四捨五入）
    expect(res.employeePension).toBeGreaterThan(0);
    expect(res.employeePension).toBe(Math.round(500 * 0.103));
    // basicPension (105) + employeePension (52) = 157 => 10万円単位で丸められて 160
    const rawTotal = res.basicPension + res.employeePension + res.widowAddition;
    const expectedAnnual = rawTotal > 0 ? Math.max(10, Math.round(rawTotal / 10) * 10) : 0;
    expect(res.annualAmount).toBe(expectedAnnual);
  });

  it('2. 国民年金のみの場合は遺族厚生年金が0円になる', () => {
    const input: LifePlanInput = {
      ...defaultLifePlanInput,
      personIncome: {
        ...defaultLifePlanInput.personIncome,
        currentGrossIncome: 500,
        pensionType: 'national_pension_only',
      },
      hasSpouse: true,
      children: [{ ...defaultLifePlanInput.children[0]!, id: 'test_child_1', name: '第一子', currentAge: 5 }],
    };

    const res = calculateSurvivorBenefitEstimate(input, 'person');
    expect(res.employeePension).toBe(0);
    const rawTotal = res.basicPension + res.employeePension + res.widowAddition;
    const expectedAnnual = rawTotal > 0 ? Math.max(10, Math.round(rawTotal / 10) * 10) : 0;
    expect(res.annualAmount).toBe(expectedAnnual);
    expect(res.note).toBeUndefined();
  });

  it('3. 年金加入区分が不明でも計算が停止しない', () => {
    const input: LifePlanInput = {
      ...defaultLifePlanInput,
      personIncome: {
        ...defaultLifePlanInput.personIncome,
        currentGrossIncome: 500,
        pensionType: 'unknown',
      },
      hasSpouse: true,
      children: [],
    };

    const res = calculateSurvivorBenefitEstimate(input, 'person');
    expect(res.employeePension).toBe(0);
    expect(res.note).toContain('年金加入区分が不明');
    // 計算が停止せず有効なオブジェクトを返すこと
    expect(res.annualAmount).toBeGreaterThanOrEqual(0);
  });

  it('4. 参考目安と手入力を切り替えられる', () => {
    const baseInput: LifePlanInput = {
      ...defaultLifePlanInput,
      personIncome: {
        ...defaultLifePlanInput.personIncome,
        currentGrossIncome: 600,
        pensionType: 'employees_pension',
      },
      hasSpouse: true,
      children: [{ ...defaultLifePlanInput.children[0]!, id: 'test_child_1', name: '第一子', currentAge: 5 }],
      insurance: {
        ...defaultLifePlanInput.insurance,
        protectionScenarios: {
          ...defaultLifePlanInput.insurance.protectionScenarios,
          personDeath: {
            ...defaultLifePlanInput.insurance.protectionScenarios.personDeath,
            useEstimatedSurvivorBenefit: true,
            annualSurvivorBenefit: 100, // 手入力値 100万円(自動目安より少ない)
            survivorBenefitEndAge: 65,
          },
        },
      },
    };

    // 1) 参考目安を使用(true)の場合
    const simEst = runLifePlanSimulation(baseInput);
    const seriesEst = calculateProtectionNeedsAnalysis(baseInput, simEst.rows, 'person');

    // 2) 手入力へ切り替え(false)の場合
    const manualInput: LifePlanInput = {
      ...baseInput,
      insurance: {
        ...baseInput.insurance,
        protectionScenarios: {
          ...baseInput.insurance.protectionScenarios,
          personDeath: {
            ...baseInput.insurance.protectionScenarios.personDeath,
            useEstimatedSurvivorBenefit: false,
          },
        },
      },
    };
    const simManual = runLifePlanSimulation(manualInput);
    const seriesManual = calculateProtectionNeedsAnalysis(manualInput, simManual.rows, 'person');

    expect(seriesEst.data.length).toBeGreaterThan(0);
    expect(seriesManual.data.length).toBeGreaterThan(0);
  });

  it('5. 手入力値が計算へ反映される', () => {
    const baseInput: LifePlanInput = {
      ...defaultLifePlanInput,
      personIncome: {
        ...defaultLifePlanInput.personIncome,
        currentGrossIncome: 600,
        pensionType: 'employees_pension',
      },
      hasSpouse: true,
      children: [{ ...defaultLifePlanInput.children[0]!, id: 'test_child_1', name: '第一子', currentAge: 5 }],
      insurance: {
        ...defaultLifePlanInput.insurance,
        protectionScenarios: {
          ...defaultLifePlanInput.insurance.protectionScenarios,
          personDeath: {
            ...defaultLifePlanInput.insurance.protectionScenarios.personDeath,
            useEstimatedSurvivorBenefit: true,
            annualSurvivorBenefit: 100, // 手入力値 100万円(自動目安より少ない)
            survivorBenefitEndAge: 65,
          },
        },
      },
    };

    const simEst = runLifePlanSimulation(baseInput);
    const seriesEst = calculateProtectionNeedsAnalysis(baseInput, simEst.rows, 'person');

    const manualInput: LifePlanInput = {
      ...baseInput,
      insurance: {
        ...baseInput.insurance,
        protectionScenarios: {
          ...baseInput.insurance.protectionScenarios,
          personDeath: {
            ...baseInput.insurance.protectionScenarios.personDeath,
            useEstimatedSurvivorBenefit: false,
          },
        },
      },
    };
    const simManual = runLifePlanSimulation(manualInput);
    const seriesManual = calculateProtectionNeedsAnalysis(manualInput, simManual.rows, 'person');

    // 自動計算の遺族年金目安と100万円手入力時で、必要保障額が変わっていること
    expect(seriesEst.data[0]!.protectionNeeds).not.toBe(seriesManual.data[0]!.protectionNeeds);
  });

  it('6. 子どもの年齢に応じて遺族基礎年金の対象人数が減る', () => {
    const currentYear = new Date().getFullYear();
    // 10歳の子ども（現在から9年後に19歳到達し対象外）
    const input: LifePlanInput = {
      ...defaultLifePlanInput,
      personIncome: {
        ...defaultLifePlanInput.personIncome,
        currentGrossIncome: 500,
        pensionType: 'employees_pension',
      },
      hasSpouse: true,
      children: [{
        ...defaultLifePlanInput.children[0]!,
        id: 'test_child_1',
        name: '第一子',
        currentAge: 10,
      }],
    };

    const res0 = calculateSurvivorBenefitForYear(input, 'person', 0);
    const res10 = calculateSurvivorBenefitForYear(input, 'person', 10);

    // 0年後(10歳)は基礎年金あり、10年後(20歳)は18歳年度末超過により基礎年金が0円になる
    expect(res0.basicPension).toBeGreaterThan(0);
    expect(res10.basicPension).toBe(0);
  });

  it('7. 将来の年齢で死亡した場合、現在の子どもの年齢ではなく死亡時点の年齢（経過年数加算後の年齢）で判定される', () => {
    const currentYear = new Date().getFullYear();
    const input: LifePlanInput = {
      ...defaultLifePlanInput,
      personIncome: {
        ...defaultLifePlanInput.personIncome,
        currentGrossIncome: 500,
        pensionType: 'employees_pension',
      },
      hasSpouse: true,
      children: [{
        ...defaultLifePlanInput.children[0]!,
        id: 'test_child_1',
        name: '第一子',
        currentAge: 14, // 現在14歳（18歳年度末まであと4年）
      }],
    };

    // 死亡時点の経過年数が 0年（14歳）、3年（17歳）の時は遺族基礎年金対象、5年（19歳）で対象外
    const resAt0 = calculateSurvivorBenefitForYear(input, 'person', 0);
    const resAt3 = calculateSurvivorBenefitForYear(input, 'person', 3);
    const resAt5 = calculateSurvivorBenefitForYear(input, 'person', 5);

    expect(resAt0.basicPension).toBeGreaterThan(0);
    expect(resAt3.basicPension).toBeGreaterThan(0);
    expect(resAt5.basicPension).toBe(0);
  });

  it('8. 中高齢寡婦加算は本人の性別が male の場合のみ計上され、female または unspecified の場合は 0円になる', () => {
    const maleInput: LifePlanInput = {
      ...defaultLifePlanInput,
      gender: 'male',
      hasSpouse: true,
      spouseAge: 45, // 40歳以上65歳未満
      children: [],  // 18歳以下の子なし
    };

    const resMale = calculateSurvivorBenefitEstimate(maleInput, 'person');
    const resMaleYear = calculateSurvivorBenefitForYear(maleInput, 'person', 0);
    expect(resMale.widowAddition).toBe(60);
    expect(resMaleYear.widowAddition).toBe(60);

    const femaleInput: LifePlanInput = {
      ...maleInput,
      gender: 'female',
    };
    const resFemale = calculateSurvivorBenefitEstimate(femaleInput, 'person');
    const resFemaleYear = calculateSurvivorBenefitForYear(femaleInput, 'person', 0);
    expect(resFemale.widowAddition).toBe(0);
    expect(resFemaleYear.widowAddition).toBe(0);

    const unspecInput: LifePlanInput = {
      ...maleInput,
      gender: 'unspecified',
    };
    const resUnspec = calculateSurvivorBenefitEstimate(unspecInput, 'person');
    const resUnspecYear = calculateSurvivorBenefitForYear(unspecInput, 'person', 0);
    expect(resUnspec.widowAddition).toBe(0);
    expect(resUnspecYear.widowAddition).toBe(0);
  });
});




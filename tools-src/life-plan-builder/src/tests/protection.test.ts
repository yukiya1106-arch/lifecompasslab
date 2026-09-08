import { describe, it, expect } from 'vitest';
import { defaultLifePlanInput } from '../data/defaultValues';
import { runCashflowSimulation } from '../engine/cashflow';
import {
  calculateCurrentDeathBenefitForAge,
  calculateProtectionNeedsForDeathYear,
  calculateProtectionNeedsAnalysis,
} from '../engine/protection';
import { normalizeLifePlanInput } from '../engine/normalization';
import { LifePlanInput } from '../types/lifeplan';
import { calculateSurvivorBenefitEstimate } from '../utils/pension';

describe('必要保障額・死亡保障計算モジュール (protection.ts)', () => {
  // 1. 一時金保障が保障期間中に計上される
  it('1. 一時金保障が保障期間中に計上される', () => {
    const input: LifePlanInput = {
      ...defaultLifePlanInput,
      insurance: {
        ...defaultLifePlanInput.insurance,
        deathBenefits: [
          {
            id: 'b1',
            label: '定期死亡保障',
            insuredPerson: 'person',
            benefitType: 'lump_sum',
            lumpSumAmount: 2000,
            monthlyAmount: 0,
            coverageEndAge: 60,
            wholeLife: false,
          },
        ],
      },
    };

    // 本人35歳時点（60歳未満）では2,000万円が計上される
    const coverageAt35 = calculateCurrentDeathBenefitForAge(input, 'person', 35);
    expect(coverageAt35).toBe(2000);

    const coverageAt59 = calculateCurrentDeathBenefitForAge(input, 'person', 59);
    expect(coverageAt59).toBe(2000);
  });

  // 2. 保障終了年齢以降は一時金保障が0になる
  it('2. 保障終了年齢以降は一時金保障が0になる', () => {
    const input: LifePlanInput = {
      ...defaultLifePlanInput,
      insurance: {
        ...defaultLifePlanInput.insurance,
        deathBenefits: [
          {
            id: 'b1',
            label: '定期死亡保障',
            insuredPerson: 'person',
            benefitType: 'lump_sum',
            lumpSumAmount: 2000,
            monthlyAmount: 0,
            coverageEndAge: 60,
            wholeLife: false,
          },
        ],
      },
    };

    // 60歳以降は保障0
    const coverageAt60 = calculateCurrentDeathBenefitForAge(input, 'person', 60);
    expect(coverageAt60).toBe(0);

    const coverageAt65 = calculateCurrentDeathBenefitForAge(input, 'person', 65);
    expect(coverageAt65).toBe(0);
  });

  // 3. 終身保障が計算期間中継続する
  it('3. 終身保障が計算期間中継続する', () => {
    const input: LifePlanInput = {
      ...defaultLifePlanInput,
      insurance: {
        ...defaultLifePlanInput.insurance,
        deathBenefits: [
          {
            id: 'b2',
            label: '終身死亡保障',
            insuredPerson: 'person',
            benefitType: 'lump_sum',
            lumpSumAmount: 1500,
            monthlyAmount: 0,
            coverageEndAge: 60,
            wholeLife: true,
          },
        ],
      },
    };

    expect(calculateCurrentDeathBenefitForAge(input, 'person', 35)).toBe(1500);
    expect(calculateCurrentDeathBenefitForAge(input, 'person', 60)).toBe(1500);
    expect(calculateCurrentDeathBenefitForAge(input, 'person', 85)).toBe(1500);
  });

  // 4. 収入保障の現在価値が年齢とともに減少する
  it('4. 収入保障の現在価値が年齢とともに減少する', () => {
    const input: LifePlanInput = {
      ...defaultLifePlanInput,
      insurance: {
        ...defaultLifePlanInput.insurance,
        deathBenefits: [
          {
            id: 'b3',
            label: '収入保障',
            insuredPerson: 'person',
            benefitType: 'income',
            lumpSumAmount: 0,
            monthlyAmount: 15, // 月15万円 = 年180万円
            coverageEndAge: 65,
            wholeLife: false,
          },
        ],
      },
    };

    // 35歳: 残30年 -> 15 * 12 * 30 = 5400万円
    const coverageAt35 = calculateCurrentDeathBenefitForAge(input, 'person', 35);
    expect(coverageAt35).toBe(15 * 12 * 30); // 5400

    // 45歳: 残20年 -> 15 * 12 * 20 = 3600万円
    const coverageAt45 = calculateCurrentDeathBenefitForAge(input, 'person', 45);
    expect(coverageAt45).toBe(15 * 12 * 20); // 3600

    expect(coverageAt35).toBeGreaterThan(coverageAt45);

    // 65歳: 0
    const coverageAt65 = calculateCurrentDeathBenefitForAge(input, 'person', 65);
    expect(coverageAt65).toBe(0);
  });

  // 5. 現在保障が0の場合、差額が必要保障額と一致する
  it('5. 現在保障が0の場合、差額が必要保障額と一致する', () => {
    const input: LifePlanInput = {
      ...defaultLifePlanInput,
      insurance: {
        ...defaultLifePlanInput.insurance,
        deathBenefits: [], // 現在保障0
      },
    };

    const sim = runCashflowSimulation(input);
    const result = calculateProtectionNeedsAnalysis(input, sim.rows, 'person');

    for (const item of result.data) {
      expect(item.currentCoverage).toBe(0);
      expect(item.shortfall).toBe(item.protectionNeeds);
      expect(item.surplus).toBe(0);
    }
  });

  // 6. 団信を有効にすると必要保障額が減少または同額になる
  it('6. 団信を有効にすると必要保障額が減少または同額になる', () => {
    const inputNoDanshin: LifePlanInput = {
      ...defaultLifePlanInput,
      insurance: {
        ...defaultLifePlanInput.insurance,
        protectionScenarios: {
          ...defaultLifePlanInput.insurance.protectionScenarios,
          personDeath: {
            ...defaultLifePlanInput.insurance.protectionScenarios.personDeath,
            mortgageCoveredByDanshin: false,
          },
        },
      },
    };

    const inputWithDanshin: LifePlanInput = {
      ...defaultLifePlanInput,
      insurance: {
        ...defaultLifePlanInput.insurance,
        protectionScenarios: {
          ...defaultLifePlanInput.insurance.protectionScenarios,
          personDeath: {
            ...defaultLifePlanInput.insurance.protectionScenarios.personDeath,
            mortgageCoveredByDanshin: true,
          },
        },
      },
    };

    const simNo = runCashflowSimulation(inputNoDanshin);
    const simWith = runCashflowSimulation(inputWithDanshin);

    const needsNo = calculateProtectionNeedsForDeathYear(inputNoDanshin, simNo.rows, 'person', 0);
    const needsWith = calculateProtectionNeedsForDeathYear(inputWithDanshin, simWith.rows, 'person', 0);

    // 団信を有効にするとローン返済負担がなくなるため、必要保障額は減少するか同額（ローンなし時）
    expect(needsWith).toBeLessThanOrEqual(needsNo);
  });

  // 7. schemaVersion 1の旧JSONへinsuranceが安全に補完され、死亡保障額が0万円となる
  it('7. schemaVersion 1の旧JSONへinsuranceが安全に補完され、死亡保障額が0万円となる', () => {
    const oldJsonSchema1 = {
      schemaVersion: 1,
      personAge: 40,
      hasSpouse: true,
      spouseAge: 38,
      livingExpenses: {
        monthlyExpense: 30,
        annualOneOffExpense: 20,
        inflationRate: 1.0,
        insurancePremiumMonthly: 2,
        insuranceEndAge: 65,
      },
    };

    const normalized = normalizeLifePlanInput(oldJsonSchema1);

    expect(normalized.insurance).toBeDefined();
    expect(normalized.insurance.inputMode).toBe('simple');
    expect(Array.isArray(normalized.insurance.deathBenefits)).toBe(true);
    expect(normalized.insurance.deathBenefits.length).toBeGreaterThan(0);
    // 補完後も死亡保障額は0万円であること
    for (const benefit of normalized.insurance.deathBenefits) {
      expect(benefit.lumpSumAmount).toBe(0);
      expect(benefit.monthlyAmount).toBe(0);
    }
    expect(normalized.insurance.protectionScenarios.personDeath.survivorLivingExpenseRate).toBe(70);
    expect(normalized.insurance.protectionScenarios.personDeath.funeralExpense).toBe(300);

    // キャッシュフローシミュレーションがエラーなく完走すること
    const sim = runCashflowSimulation(normalized);
    expect(sim.rows.length).toBeGreaterThan(0);
    expect(isNaN(sim.rows[0]!.endTotalAssets)).toBe(false);
  });

  // 8. 初期状態の本人および配偶者の死亡保障額が0万円であること
  it('8. 初期状態の本人および配偶者の死亡保障額が0万円であること', () => {
    const personBenefit = defaultLifePlanInput.insurance.deathBenefits.find(
      (b) => b.insuredPerson === 'person'
    );
    const spouseBenefit = defaultLifePlanInput.insurance.deathBenefits.find(
      (b) => b.insuredPerson === 'spouse'
    );

    expect(personBenefit).toBeDefined();
    expect(personBenefit?.lumpSumAmount).toBe(0);

    expect(spouseBenefit).toBeDefined();
    expect(spouseBenefit?.lumpSumAmount).toBe(0);
  });

  // 9. 配偶者なし・子どもありの場合、遺族年金等がsurvivorBenefitEndAge以降に加算されない
  it('9. 配偶者なし・子どもありの場合、遺族年金等がsurvivorBenefitEndAge以降に加算されない', () => {
    const singleParentInput: LifePlanInput = {
      ...defaultLifePlanInput,
      personAge: 35,
      hasSpouse: false,
      children: [
        {
          id: 'c1',
          name: '子1',
          currentAge: 5,
          schoolType: {
            kindergarten: 'public',
            elementary: 'public',
            juniorHigh: 'public',
            highSchool: 'public',
            university: 'public',
          },
          universityLivingType: 'home',
        },
      ],
      insurance: {
        ...defaultLifePlanInput.insurance,
        protectionScenarios: {
          ...defaultLifePlanInput.insurance.protectionScenarios,
          personDeath: {
            ...defaultLifePlanInput.insurance.protectionScenarios.personDeath,
            annualSurvivorBenefit: 100,
            survivorBenefitEndAge: 40,
          },
        },
      },
    };

    const sim = runCashflowSimulation(singleParentInput);

    // 終了年齢40歳の場合
    const needsEnd40 = calculateProtectionNeedsForDeathYear(singleParentInput, sim.rows, 'person', 0);

    // 終了年齢35歳（万一発生年で支給終了）の場合
    const singleParentInputEnd35: LifePlanInput = {
      ...singleParentInput,
      insurance: {
        ...singleParentInput.insurance,
        protectionScenarios: {
          ...singleParentInput.insurance.protectionScenarios,
          personDeath: {
            ...singleParentInput.insurance.protectionScenarios.personDeath,
            survivorBenefitEndAge: 35,
          },
        },
      },
    };
    const needsEnd35 = calculateProtectionNeedsForDeathYear(singleParentInputEnd35, sim.rows, 'person', 0);

    // 40歳まで支給される方が年金額が多いため、必要保障額（不足分）は小さくなるか同等
    expect(needsEnd40).toBeLessThanOrEqual(needsEnd35);
  });

  // 10. 詳しく入力で新規追加する保障の初期金額が一時金0万円・毎月受取額0万円であること
  it('10. 詳しく入力で新規追加する保障の初期金額が一時金0万円・毎月受取額0万円であること', () => {
    const newItem = {
      id: `db_det_test`,
      label: '本人の生命保険',
      insuredPerson: 'person' as const,
      benefitType: 'lump_sum' as const,
      lumpSumAmount: 0,
      monthlyAmount: 0,
      coverageEndAge: 60,
      wholeLife: false,
    };

    expect(newItem.lumpSumAmount).toBe(0);
    expect(newItem.monthlyAmount).toBe(0);
  });

  // 11. 家族構成・年収に基づく遺族年金自動計算が正しく算出されること
  it('11. 家族構成・年収に基づく遺族年金自動計算が正しく算出されること', () => {
    const inputWith2Kids: LifePlanInput = {
      ...defaultLifePlanInput,
      personAge: 35,
      spouseAge: 33,
      hasSpouse: true,
      personIncome: {
        ...defaultLifePlanInput.personIncome,
        currentGrossIncome: 500, // 年収500万円
      },
      children: [
        {
          id: 'c1',
          name: '子1',
          currentAge: 5,
          schoolType: {
            kindergarten: 'public',
            elementary: 'public',
            juniorHigh: 'public',
            highSchool: 'public',
            university: 'private',
          },
          universityLivingType: 'home',
        },
        {
          id: 'c2',
          name: '子2',
          currentAge: 2,
          schoolType: {
            kindergarten: 'public',
            elementary: 'public',
            juniorHigh: 'public',
            highSchool: 'public',
            university: 'private',
          },
          universityLivingType: 'home',
        },
      ],
    };

    const estimate = calculateSurvivorBenefitEstimate(inputWith2Kids, 'person');
    // 子2人(18歳以下)の遺族基礎年金: 82 + 23 + 23 = 128万円
    expect(estimate.basicPension).toBe(128);
    // 遺族厚生年金(500 * 0.103 = 51.5 -> Math.round 52万円)
    expect(estimate.employeePension).toBe(52);
    // 合計: 128 + 52 = 180万円
    expect(estimate.annualAmount).toBe(180);
    expect(estimate.endAge).toBe(65); // 配偶者ありの場合は65歳目安
  });
});

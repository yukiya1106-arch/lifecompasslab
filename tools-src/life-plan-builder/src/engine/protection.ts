/**
 * 必要保障額計算エンジン (protection.ts)
 * 
 * 万一（死亡）が発生した場合の遺族世帯のキャッシュフローをシミュレーションし、
 * 各年齢時点における必要保障額、現在の死亡保障額、不足額（または余力）を算定します。
 */

import { LifePlanInput, InsuredPerson, AnnualCashflowRow } from '../types/lifeplan';
import { calculateAnnualPersonIncome } from './income';
import { calculateSurvivorBenefitForYear, calculateSurvivorBenefitEstimate } from '../utils/pension';

export interface ProtectionNeedsAgeData {
  year: number;
  personAge: number;
  spouseAge: number;
  insuredAge: number;       // 被保険者の該当年齢
  protectionNeeds: number;  // 必要保障額 (万円)
  currentCoverage: number;  // 現在の死亡保障額 (万円)
  coveredAmount: number;    // カバー済み額 (万円)
  shortfall: number;        // 計算上の保障不足 (万円)
  surplus: number;          // 計算上の保障余力 (万円)
}

export interface ProtectionNeedsAnalysisResult {
  targetPerson: InsuredPerson;
  data: ProtectionNeedsAgeData[];
}

/**
 * 特定年齢における現在契約中の死亡保障額（合計）を計算
 */
export function calculateCurrentDeathBenefitForAge(
  input: LifePlanInput,
  targetPerson: InsuredPerson,
  targetAge: number
): number {
  const benefits = input.insurance.deathBenefits.filter((b) => b.insuredPerson === targetPerson);
  let total = 0;

  for (const b of benefits) {
    if (b.benefitType === 'lump_sum') {
      if (b.wholeLife || targetAge < b.coverageEndAge) {
        total += b.lumpSumAmount;
      }
    } else if (b.benefitType === 'income') {
      if (targetAge < b.coverageEndAge) {
        const remainingYears = Math.max(0, b.coverageEndAge - targetAge);
        total += b.monthlyAmount * 12 * remainingYears;
      }
    }
  }

  return total;
}

/**
 * 特定の年（deathIndex）に万一が発生したと仮定した場合の必要保障額を逆算
 */
export function calculateProtectionNeedsForDeathYear(
  input: LifePlanInput,
  baseRows: AnnualCashflowRow[],
  targetPerson: InsuredPerson,
  deathIndex: number
): number {
  if (deathIndex < 0 || deathIndex >= baseRows.length) return 0;

  const deathRow = baseRows[deathIndex]!;
  const scenario = targetPerson === 'person'
    ? input.insurance.protectionScenarios.personDeath
    : input.insurance.protectionScenarios.spouseDeath;

  // 死亡時点の期首金融資産から葬儀・整理資金を差し引いた額を利用可能資金とする
  let cumulativeFunds = deathRow.startTotalAssets - scenario.funeralExpense;
  let minCumulativeFunds = cumulativeFunds;

  const isPersonTarget = targetPerson === 'person';
  const calculationEndAge = scenario.calculationEndAge ?? 65;

  for (let i = deathIndex; i < baseRows.length; i++) {
    const row = baseRows[i]!;
    const currentTargetAge = isPersonTarget ? row.personAge : row.spouseAge;

    // ユーザーが指定した計算終了年齢（例: 65歳まで, 子の独立年齢まで）を超えたら試算を終了
    if (currentTargetAge > calculationEndAge) {
      break;
    }

    // 1. 生存者の収入計算
    let survivorNetSalary = 0;
    let survivorPension = 0;
    let survivorRetirement = 0;
    let survivorOtherIncome = 0;

    let survivorAgeAtI = 0;

    if (isPersonTarget) {
      // 本人死亡 -> 配偶者が生存者（配偶者なしの場合は本人年齢を終了判定基準として利用）
      if (input.hasSpouse) {
        survivorAgeAtI = row.spouseAge;
        const inc = calculateAnnualPersonIncome(input.spouseIncome, input.spouseAge, survivorAgeAtI);
        survivorNetSalary = inc.netSalary;
        survivorPension = inc.pension;
        survivorRetirement = inc.retirementAllowance;
        survivorOtherIncome = inc.otherIncome;
      } else {
        survivorAgeAtI = row.personAge;
      }
    } else {
      // 配偶者死亡 -> 本人が生存者
      survivorAgeAtI = row.personAge;
      const inc = calculateAnnualPersonIncome(input.personIncome, input.personAge, survivorAgeAtI);
      survivorNetSalary = inc.netSalary;
      survivorPension = inc.pension;
      survivorRetirement = inc.retirementAllowance;
      survivorOtherIncome = inc.otherIncome;
    }

    // 遺族年金等の受取: 参考目安モード時は年度毎の子ども年齢推移を反映した自動計算、手入力モード時は受給終了年齢まで固定額
    const useEstimated = scenario.useEstimatedSurvivorBenefit !== false;
    const survivorBenefit = useEstimated
      ? calculateSurvivorBenefitForYear(input, targetPerson, row.elapsedYears).annualAmount
      : (survivorAgeAtI <= scenario.survivorBenefitEndAge ? scenario.annualSurvivorBenefit : 0);

    // 非住宅一時収入・住宅売却手取り（既存キャッシュフローを継続）
    const otherOneOffIncome = row.otherOneOffIncome;
    const housingSaleProceeds = row.housingSaleProceeds;

    const totalSurvivorIncome =
      survivorNetSalary +
      survivorPension +
      survivorRetirement +
      survivorOtherIncome +
      survivorBenefit +
      otherOneOffIncome +
      housingSaleProceeds;

    // 2. 遺族世帯の支出計算
    const livingExpenses = row.livingExpenses * (scenario.survivorLivingExpenseRate / 100);
    const educationExpenses = row.educationExpenses;
    const rentExpenses = row.rentExpenses;
    const housingMaintenanceExpenses = row.housingMaintenanceExpenses;
    const housingPurchaseInitialExpenses = row.housingPurchaseInitialExpenses;
    const insuranceExpenses = row.insuranceExpenses;
    const otherOneOffExpenses = row.otherOneOffExpenses;

    // 住宅ローン返済額 (団信適用時は0)
    const mortgagePayments = scenario.mortgageCoveredByDanshin ? 0 : row.mortgagePayments;

    const totalSurvivorExpenses =
      livingExpenses +
      educationExpenses +
      rentExpenses +
      housingMaintenanceExpenses +
      housingPurchaseInitialExpenses +
      insuranceExpenses +
      otherOneOffExpenses +
      mortgagePayments;

    // 年間収支と累積資金
    const annualNetCashflow = totalSurvivorIncome - totalSurvivorExpenses;
    cumulativeFunds += annualNetCashflow;

    if (cumulativeFunds < minCumulativeFunds) {
      minCumulativeFunds = cumulativeFunds;
    }
  }

  return minCumulativeFunds < 0 ? Math.abs(minCumulativeFunds) : 0;
}

/**
 * 対象人物（本人または配偶者）の全シミュレーション期間の必要保障額・現在保障額・差額シリーズを計算
 */
export function calculateProtectionNeedsAnalysis(
  input: LifePlanInput,
  baseRows: AnnualCashflowRow[],
  targetPerson: InsuredPerson
): ProtectionNeedsAnalysisResult {
  const data: ProtectionNeedsAgeData[] = [];

  for (let i = 0; i < baseRows.length; i++) {
    const row = baseRows[i]!;
    const insuredAge = targetPerson === 'person' ? row.personAge : row.spouseAge;

    const needs = calculateProtectionNeedsForDeathYear(input, baseRows, targetPerson, i);
    const coverage = calculateCurrentDeathBenefitForAge(input, targetPerson, insuredAge);

    const coveredAmount = Math.min(needs, coverage);
    const shortfall = Math.max(0, needs - coverage);
    const surplus = Math.max(0, coverage - needs);

    data.push({
      year: row.year,
      personAge: row.personAge,
      spouseAge: row.spouseAge,
      insuredAge,
      protectionNeeds: needs,
      currentCoverage: coverage,
      coveredAmount,
      shortfall,
      surplus,
    });
  }

  return {
    targetPerson,
    data,
  };
}

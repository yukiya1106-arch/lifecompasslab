/**
 * 収入計算エンジン (income.ts)
 * 
 * 本人および配偶者の各年齢における給与手取り収入、年金収入、退職金を計算します。
 */

import { PersonIncomeInput, WorkStyle } from '../types/lifeplan';

export interface CalculatedPersonIncome {
  grossSalary: number;      // 額面年収 (万円)
  netSalary: number;        // 手取り年収 (万円)
  pension: number;          // 年金収入 (万円)
  retirementAllowance: number; // 退職金 (万円)
  otherIncome: number;      // その他継続収入 (万円)
  isRetired: boolean;       // 退職済みか
}

/**
 * 働き方に合わせた手取り概算係数を取得する
 */
export function getEstimatedNetRatio(workStyle?: WorkStyle): number {
  switch (workStyle) {
    case 'part_time':
      return 0.85;
    case 'self_employed':
      return 0.70;
    case 'employee':
    case 'public_servant':
    case 'not_working':
    case 'other':
    default:
      return 0.78;
  }
}

/**
 * 働き方と額面・事業所得に応じた概算手取り額(万円)を計算する
 */
export function getEstimatedNetIncome(grossIncome: number, workStyle?: WorkStyle): number {
  if (!grossIncome || grossIncome <= 0) return 0;
  return Math.round(grossIncome * getEstimatedNetRatio(workStyle));
}

/**
 * 指定年齢における単一人物の収入状況を計算
 */
export function calculateAnnualPersonIncome(
  input: PersonIncomeInput,
  currentAge: number,      // 現在年齢 (STEP 1入力)
  targetAge: number        // 該当年の年齢
): CalculatedPersonIncome {
  if (targetAge < currentAge) {
    return { grossSalary: 0, netSalary: 0, pension: 0, retirementAllowance: 0, otherIncome: 0, isRetired: false };
  }

  // 手取り率 (手取り入力がある場合はそれを使用、なければ働き方に応じた比率で推定)
  const baseGross = input.currentGrossIncome > 0 ? input.currentGrossIncome : 1;
  const hasNetInput = input.currentNetIncome !== undefined;
  const netRatio = hasNetInput && baseGross > 0
    ? input.currentNetIncome! / baseGross
    : getEstimatedNetRatio(input.workStyle);

  // 1. 給与収入 (額面 & 手取り)
  let grossSalary = 0;
  let netSalary = 0;
  const isRetired = targetAge >= input.retirementAge;

  if (!isRetired) {
    // 経過年数に応じた昇給・年収変更の適用
    // 年収変更イベントを年齢順にソート
    const events = [...input.incomeChangeEvents].sort((a, b) => a.age - b.age);

    // 起点となる年齢と額面年収の特定
    let baseEventAge = currentAge;
    let baseEventGross = input.currentGrossIncome;

    for (const ev of events) {
      if (targetAge >= ev.age) {
        baseEventAge = ev.age;
        baseEventGross = ev.grossAmount;
      }
    }

    // 起点年齢からの経過年数昇給率適用
    const yearsFromBase = targetAge - baseEventAge;
    const growthFactor = Math.pow(1 + input.annualGrowthRate / 100, Math.max(0, yearsFromBase));
    
    grossSalary = baseEventGross * growthFactor;

    // 手取り計算: 手取り実入力優先
    if (targetAge === currentAge && input.currentNetIncome !== undefined) {
      netSalary = input.currentNetIncome;
    } else {
      netSalary = grossSalary * netRatio;
    }
  }

  // 2. 年金収入
  let pension = 0;
  if (targetAge >= input.pensionStartAge) {
    pension = input.pensionEstimate;
  }

  // 3. 退職金
  let retirementAllowance = 0;
  const retAge = input.retirementAllowanceAge ?? input.retirementAge ?? 65;
  if (targetAge === retAge) {
    retirementAllowance = input.retirementAllowance || 0;
  }

  // 4. その他継続収入
  let otherIncome = 0;
  const otherStart = input.otherIncomeStartAge ?? currentAge;
  const otherEnd = input.otherIncomeEndAge ?? input.retirementAge;
  if (targetAge >= otherStart && targetAge <= otherEnd) {
    otherIncome = input.otherIncome || 0;
  }

  return {
    grossSalary,
    netSalary,
    pension,
    retirementAllowance,
    otherIncome,
    isRetired,
  };
}

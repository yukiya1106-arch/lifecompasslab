import { LifePlanInput, InsuredPerson } from '../types/lifeplan';

// 年度ごとの制度額を定義 (令和6/7年度基準)
export const PENSION_REFERENCE_YEAR = '令和6/7年度基準';
export const SURVIVOR_BASIC_PENSION_BASE = 82; // 万円
export const SURVIVOR_CHILD_ADDITION_FIRST_SECOND = 23; // 万円
export const SURVIVOR_CHILD_ADDITION_THIRD_PLUS = 8; // 万円

export interface SurvivorBenefitEstimate {
  annualAmount: number;         // 遺族年金見込額 (万円/年、10万円単位)
  endAge: number;               // 受取終了年齢/時期の目安 (歳)
  basicPension: number;         // 遺族基礎年金 (万円/年)
  employeePension: number;      // 遺族厚生年金 (万円/年)
  widowAddition: number;        // 中高齢寡婦加算 (万円/年)
  childCountUnder18: number;    // 18歳以下の子どもの人数
  breakdown: string;            // 内訳説明メッセージ
  note?: string;                // 注意書きメッセージ
}

/**
 * 子どもの年齢に応じた遺族基礎年金を計算
 */
export function calculateSurvivorBasicPension(childCountUnder18: number): number {
  if (childCountUnder18 <= 0) return 0;
  let amount = SURVIVOR_BASIC_PENSION_BASE;
  if (childCountUnder18 >= 1) amount += SURVIVOR_CHILD_ADDITION_FIRST_SECOND;
  if (childCountUnder18 >= 2) amount += SURVIVOR_CHILD_ADDITION_FIRST_SECOND;
  if (childCountUnder18 >= 3) {
    amount += SURVIVOR_CHILD_ADDITION_THIRD_PLUS * (childCountUnder18 - 2);
  }
  return amount;
}

/**
 * 家族構成（配偶者・18歳以下の子の人数）と年収・年金加入区分に基づき、
 * 公的遺族年金（遺族基礎年金＋遺族厚生年金＋中高齢寡婦加算）の見込額と受取終了年齢の目安を算出します。
 */
export function calculateSurvivorBenefitEstimate(
  input: LifePlanInput,
  deceased: InsuredPerson
): SurvivorBenefitEstimate {
  const deceasedIncomeObj = deceased === 'person' ? input.personIncome : input.spouseIncome;
  const pensionType = deceasedIncomeObj.pensionType ?? 'employees_pension';
  const grossIncome = deceased === 'person'
    ? input.personIncome.currentGrossIncome
    : input.hasSpouse
    ? input.spouseIncome.currentGrossIncome
    : 0;

  // 18歳以下（高校卒業年齢以下）の子どもの人数をカウント
  const childCountUnder18 = input.children.filter((c) => c.currentAge <= 18).length;

  // 遺族基礎年金の計算
  const basicPension = calculateSurvivorBasicPension(childCountUnder18);

  // 遺族厚生年金の計算: 厚生年金に加入の場合のみ加算。それ以外(国民年金のみ・分からない)は0円
  const employeePension =
    pensionType === 'employees_pension' && grossIncome > 0
      ? Math.round(grossIncome * 0.103)
      : 0;

  // 中高齢寡婦加算の計算
  let widowAddition = 0;
  if (
    deceased === 'person' &&
    input.hasSpouse &&
    input.gender === 'male' &&
    childCountUnder18 === 0 &&
    input.spouseAge >= 40 &&
    input.spouseAge < 65
  ) {
    widowAddition = 60;
  }

  const rawTotal = basicPension + employeePension + widowAddition;
  const annualAmount = rawTotal > 0 ? Math.max(10, Math.round(rawTotal / 10) * 10) : 0;

  let endAge = 65;
  if (input.hasSpouse) {
    endAge = 65;
  } else if (input.children.length > 0) {
    const youngestChildAge = Math.min(...input.children.map((c) => c.currentAge));
    const yearsTo18 = Math.max(0, 18 - youngestChildAge);
    endAge = Math.max(input.personAge, input.personAge + yearsTo18);
  } else {
    endAge = input.personAge;
  }

  const deceasedLabel = deceased === 'person' ? '本人' : '配偶者';
  const spouseText = input.hasSpouse ? '配偶者あり' : '配偶者なし';
  const childText = childCountUnder18 > 0 ? `18歳以下の子${childCountUnder18}人` : '18歳以下の子なし';
  const incomeText = `年収${grossIncome}万円`;

  const parts: string[] = [];
  if (basicPension > 0) parts.push(`遺族基礎年金 約${basicPension}万円`);
  if (employeePension > 0) parts.push(`遺族厚生年金 約${employeePension}万円`);
  if (widowAddition > 0) parts.push(`中高齢寡婦加算 約${widowAddition}万円`);

  const detailStr = parts.length > 0 ? parts.join(' ＋ ') : '支給対象外（0万円）';
  const breakdown = `※${deceasedLabel}（${incomeText}）・${spouseText}・${childText}で試算：[${detailStr}] ≒ 目安 約${annualAmount}万円/年`;

  let note: string | undefined;
  if (pensionType === 'unknown') {
    note = '年金加入区分が不明のため、遺族厚生年金を含めずに概算しています。';
  }

  return {
    annualAmount,
    endAge,
    basicPension,
    employeePension,
    widowAddition,
    childCountUnder18,
    breakdown,
    note,
  };
}

/**
 * 死亡後の経過年数 (yearsElapsed: 0, 1, 2...) に応じたその年度の遺族年金目安額を計算します。
 * 子どもの年齢推移を考慮して、対象人数の減少とともに遺族基礎年金額が変わります。
 */
export function calculateSurvivorBenefitForYear(
  input: LifePlanInput,
  deceased: InsuredPerson,
  yearsElapsed: number
): { annualAmount: number; basicPension: number; employeePension: number; widowAddition: number } {
  const deceasedIncomeObj = deceased === 'person' ? input.personIncome : input.spouseIncome;
  const pensionType = deceasedIncomeObj.pensionType ?? 'employees_pension';
  const grossIncome = deceased === 'person'
    ? input.personIncome.currentGrossIncome
    : input.hasSpouse
    ? input.spouseIncome.currentGrossIncome
    : 0;

  // 当該年度での18歳以下の子どもの人数
  const childCountUnder18 = input.children.filter((c) => (c.currentAge + yearsElapsed) <= 18).length;

  const basicPension = calculateSurvivorBasicPension(childCountUnder18);

  const employeePension =
    pensionType === 'employees_pension' && grossIncome > 0
      ? Math.round(grossIncome * 0.103)
      : 0;

  // 当該年度における生存配偶者の年齢
  const survivorAge = deceased === 'person'
    ? (input.spouseAge + yearsElapsed)
    : (input.personAge + yearsElapsed);

  let widowAddition = 0;
  if (
    deceased === 'person' &&
    input.hasSpouse &&
    input.gender === 'male' &&
    childCountUnder18 === 0 &&
    survivorAge >= 40 &&
    survivorAge < 65
  ) {
    widowAddition = 60;
  }

  const annualAmount = basicPension + employeePension + widowAddition;

  return {
    annualAmount,
    basicPension,
    employeePension,
    widowAddition,
  };
}


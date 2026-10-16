/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CompassInputs,
  CompassResults,
  DcContributionContinuationImpact,
  DcTimingComparisonResult,
  LumpSumScenarioResult,
  PensionScenarioResult,
  HybridScenarioResult,
  PastLumpSum,
  PastLumpSumAnalysis,
} from '../types';

type CurrentLumpSumKind = 'companyRetirement' | 'dcIdeco' | 'combined';

/**
 * 勤続年数の概算計算（月数切り上げ）
 */
export function calculateServiceYears(joinedYearMonth: string, birthYearMonth: string, retirementAge: number): number {
  if (!joinedYearMonth || !birthYearMonth) return 38; // デフォルト：38年

  try {
    const [birthY, birthM] = birthYearMonth.split('-').map(Number);
    const [joinY, joinM] = joinedYearMonth.split('-').map(Number);
    
    if (isNaN(birthY) || isNaN(birthM) || isNaN(joinY) || isNaN(joinM)) {
      return 38;
    }

    // 退職年月の計算（生年月 + 退職年齢）
    const retireY = birthY + retirementAge;
    const retireM = birthM;

    // 勤続期間の月数
    const diffMonths = (retireY * 12 + retireM) - (joinY * 12 + joinM);
    
    if (diffMonths <= 0) return 1;

    // 月数から年数への換算（1ヶ月でも端数があれば1年に切り上げ）
    const years = Math.ceil(diffMonths / 12);
    return Math.max(1, years);
  } catch (e) {
    return 38;
  }
}

/**
 * 開始年月から終了年月までの加入・勤続年数を月単位で計算する。
 * 受取を待つ期間と、実際に加入していた期間を分けるために使用する。
 */
export function calculateServiceYearsBetween(startYearMonth: string, endYearMonth: string): number {
  const start = getYearMonthValue(startYearMonth);
  const end = getYearMonthValue(endYearMonth);
  if (!start || !end || end <= start) return 1;
  return Math.max(1, Math.ceil((end - start) / 12));
}

/**
 * DC/iDeCoの通算加入終了年月を解決する。
 * 新しい入力がない旧データでは、既存の企業型DC・iDeCo終了年月を補助的に使う。
 */
export function resolveDcJoinEndYearMonth(inputs: CompassInputs): string {
  if (inputs.dcJoinedEndYearMonth) return inputs.dcJoinedEndYearMonth;

  const legacyEnds = [inputs.corporateDcJoinEnd, inputs.idecoJoinEnd]
    .filter(Boolean)
    .sort((a, b) => getYearMonthValue(b) - getYearMonthValue(a));
  if (legacyEnds.length > 0) return legacyEnds[0];

  const [birthY, birthM] = (inputs.birthYearMonth || '1966-01').split('-').map(Number);
  return `${birthY + inputs.companyRetirementAge}-${String(birthM).padStart(2, '0')}`;
}

/**
 * 退職所得控除の計算
 * @param years 勤続年数
 */
export function calculateRetirementDeduction(years: number): number {
  const roundedYears = Math.max(1, Math.ceil(years));
  if (roundedYears <= 20) {
    return 40 * roundedYears; // 40万円 × 勤続年数
  } else {
    return 800 + 70 * (roundedYears - 20); // 800万円 + 70万円 × (勤続年数 - 20年)
  }
}

/**
 * 令和8年分の所得税基礎控除（万円）。
 * 合計所得金額に応じた概算で、非居住者などの個別条件は扱わない。
 */
export function calculateBasicDeduction2026(totalIncomeInManYen: number): number {
  if (totalIncomeInManYen <= 132) return 104;
  if (totalIncomeInManYen <= 336) return 88;
  if (totalIncomeInManYen <= 489) return 68;
  if (totalIncomeInManYen <= 655) return 67;
  if (totalIncomeInManYen <= 2350) return 62;
  if (totalIncomeInManYen <= 2400) return 48;
  if (totalIncomeInManYen <= 2450) return 32;
  if (totalIncomeInManYen <= 2500) return 16;
  return 0;
}

/**
 * 簡易税額計算（所得税＋復興特別所得税＋住民税）
 * 日本の所得税率（令和6年現在）および住民税（一律10%）に基づく簡易モデル
 */
export function calculateTaxModel(taxableIncomeInManYen: number): number {
  if (taxableIncomeInManYen <= 0) return 0;
  
  const incomeYen = taxableIncomeInManYen * 10000;
  let incomeTax = 0;

  // 所得税率（累進課税）
  if (incomeYen <= 1950000) {
    incomeTax = incomeYen * 0.05;
  } else if (incomeYen <= 3300000) {
    incomeTax = incomeYen * 0.10 - 97500;
  } else if (incomeYen <= 6950000) {
    incomeTax = incomeYen * 0.20 - 427500;
  } else if (incomeYen <= 9000000) {
    incomeTax = incomeYen * 0.23 - 636000;
  } else if (incomeYen <= 18000000) {
    incomeTax = incomeYen * 0.33 - 1536000;
  } else if (incomeYen <= 40000000) {
    incomeTax = incomeYen * 0.40 - 2796000;
  } else {
    incomeTax = incomeYen * 0.45 - 4796000;
  }

  // 復興特別所得税（所得税の2.1%）
  const reconstructionTax = incomeTax * 0.021;

  // 住民税（課税所得の10%）
  const residentTax = incomeYen * 0.10;

  const totalTaxYen = incomeTax + reconstructionTax + residentTax;
  return Math.round((totalTaxYen / 10000) * 100) / 100; // 万円単位で小数点第2位まで四捨五入
}

/**
 * 公的年金等控除の計算
 * @param pensionIncome 雑所得の対象となる年金額 (万円)
 * @param age 受取時の年齢
 */
export function calculatePensionDeduction(pensionIncome: number, age: number): number {
  if (pensionIncome <= 0) return 0;
  
  const Y = pensionIncome;
  if (age < 65) {
    if (Y <= 60) return Y;
    if (Y <= 130) return 60;
    if (Y <= 410) return Math.round((Y * 0.25 + 27.5) * 100) / 100;
    if (Y <= 770) return Math.round((Y * 0.15 + 68.5) * 100) / 100;
    if (Y <= 1000) return Math.round((Y * 0.05 + 145.5) * 100) / 100;
    return 195.5;
  } else {
    if (Y <= 110) return Y;
    if (Y <= 330) return 110;
    if (Y <= 410) return Math.round((Y * 0.25 + 27.5) * 100) / 100;
    if (Y <= 770) return Math.round((Y * 0.15 + 68.5) * 100) / 100;
    if (Y <= 1000) return Math.round((Y * 0.05 + 145.5) * 100) / 100;
    return 195.5;
  }
}

/**
 * 会社退職金の控除枠超過・収まり状況を判定
 */
export function calculateCompanyRetirementStatus(
  companyRetirementEstimate: number,
  deductionLimit: number
) {
  const isExcess = companyRetirementEstimate > deductionLimit;
  const excessAmount = isExcess ? companyRetirementEstimate - deductionLimit : 0;
  const withinLimit = isExcess ? deductionLimit : companyRetirementEstimate;
  const remainingLimit = isExcess ? 0 : deductionLimit - companyRetirementEstimate;

  return {
    isCompanyRetirementExcess: isExcess,
    companyRetirementExcessAmount: excessAmount,
    companyRetirementWithinLimit: withinLimit,
    remainingLimit,
  };
}

/**
 * 会社退職金を単体で受け取る場合の退職所得と税額の概算。
 * 一般退職手当等として2分の1課税を適用する。
 */
export function calculateCompanyRetirementTaxSummary(
  companyRetirementEstimate: number,
  deductionLimit: number
) {
  const excessAmount = Math.max(0, companyRetirementEstimate - deductionLimit);
  const taxableRetirementIncome = Math.round(excessAmount * 0.5 * 100) / 100;
  const estimatedTax = calculateTaxModel(taxableRetirementIncome);
  const estimatedNetAmount = Math.max(
    0,
    Math.round((companyRetirementEstimate - estimatedTax) * 100) / 100
  );

  return {
    companyRetirementEstimate,
    deductionLimit,
    excessAmount,
    taxableRetirementIncome,
    estimatedTax,
    estimatedNetAmount,
  };
}

/**
 * DC/iDeCoの受取時残高予想の合計
 */
export function calculateDcIdecoExpectedTotal(corporateDc: number, ideco: number): number {
  return corporateDc + ideco;
}

/**
 * 一時金受取時の控除超過額
 */
export function calculateLumpSumExcess(
  totalLumpSum: number,
  deductionLimit: number
): number {
  return Math.max(0, totalLumpSum - deductionLimit);
}

/**
 * シナリオ1: すべて一時金として受け取る場合
 */
export function calculateLumpSumScenario(
  companyRetirement: number,
  dcIdecoTotal: number,
  deductionLimit: number,
  timing?: {
    sameYearReceipt: boolean;
    companyDeductionLimit: number;
    dcIdecoDeductionLimit: number;
  }
): LumpSumScenarioResult {
  const totalAmount = companyRetirement + dcIdecoTotal;
  const sameYearReceipt = timing?.sameYearReceipt ?? true;
  const companyDeductionLimit = timing?.companyDeductionLimit ?? deductionLimit;
  const dcIdecoDeductionLimit = timing?.dcIdecoDeductionLimit ?? deductionLimit;

  const companyTaxableIncome = sameYearReceipt
    ? 0
    : Math.max(0, Math.round((companyRetirement - companyDeductionLimit) * 0.5 * 100) / 100);
  const dcIdecoTaxableIncome = sameYearReceipt
    ? 0
    : Math.max(0, Math.round((dcIdecoTotal - dcIdecoDeductionLimit) * 0.5 * 100) / 100);
  const excess = sameYearReceipt
    ? calculateLumpSumExcess(totalAmount, deductionLimit)
    : Math.max(0, companyRetirement - companyDeductionLimit) + Math.max(0, dcIdecoTotal - dcIdecoDeductionLimit);

  const taxableIncome = sameYearReceipt
    ? Math.max(0, Math.round(excess * 0.5 * 100) / 100)
    : Math.round((companyTaxableIncome + dcIdecoTaxableIncome) * 100) / 100;
  const estimatedTax = sameYearReceipt
    ? calculateTaxModel(taxableIncome)
    : Math.round((calculateTaxModel(companyTaxableIncome) + calculateTaxModel(dcIdecoTaxableIncome)) * 100) / 100;
  const netAmount = Math.max(0, Math.round((totalAmount - estimatedTax) * 100) / 100);

  let memo = '';
  if (excess === 0) {
    memo = sameYearReceipt
      ? '会社退職金とDC/iDeCo一時金を同じ年に受け取る前提で、合算後の退職所得控除内に収まる試算です。'
      : '会社退職金とDC/iDeCo一時金を別の年に受け取る前提で、それぞれ調整後の退職所得控除内に収まる試算です。';
  } else {
    memo = sameYearReceipt
      ? `同年の一時金合計が退職所得控除を ${excess.toLocaleString()}万円 超えるため、その2分の1を課税退職所得として概算します。`
      : `受取年ごとに計算すると、控除を超える額の合計は ${excess.toLocaleString()}万円です。各受取年の超過額の2分の1を課税退職所得として税額を概算します。`;
  }

  return {
    dcIdecoLumpSum: dcIdecoTotal,
    companyRetirement,
    totalAmount,
    deductionLimit,
    sameYearReceipt,
    companyDeductionLimit,
    dcIdecoDeductionLimit,
    companyTaxableIncome,
    dcIdecoTaxableIncome,
    taxableIncome,
    estimatedTax,
    netAmount,
    memo,
  };
}

export function calculatePensionScenario(
  companyRetirement: number,
  dcIdecoTotal: number,
  deductionLimit: number,
  publicPensionEstimate: number,
  receiptAge: number
): PensionScenarioResult {
  const pensionYears = 10; // 10年分割受取を想定
  const annualPensionAmount = Math.round((dcIdecoTotal / pensionYears) * 100) / 100;
  
  // 公的年金との合算年額
  const combinedAnnualAmount = publicPensionEstimate + annualPensionAmount;

  // 公的年金等控除の計算
  const pensionDeduction = calculatePensionDeduction(combinedAnnualAmount, receiptAge);
  const rawPensionIncome = Math.max(0, combinedAnnualAmount - pensionDeduction);

  // 簡易税額計算用の課税所得（社会保険料を年金収入の10%とする比較用モデル）
  const socialInsuranceDeduction = Math.round((combinedAnnualAmount * 0.10) * 100) / 100;
  const basicDeduction = calculateBasicDeduction2026(rawPensionIncome);
  const taxablePensionIncome = Math.max(0, Math.round((rawPensionIncome - socialInsuranceDeduction - basicDeduction) * 100) / 100);
  
  // 1年分の概算税額
  const estimatedTaxAnnual = calculateTaxModel(taxablePensionIncome);
  
  // 年額手取り額
  const dcShare = annualPensionAmount / Math.max(1, combinedAnnualAmount);
  const allocatedTax = estimatedTaxAnnual * dcShare;
  const allocatedSocialInsurance = socialInsuranceDeduction * dcShare;
  const netAmountAnnual = Math.max(0, Math.round((annualPensionAmount - allocatedTax - allocatedSocialInsurance) * 100) / 100);

  // 10年間分の手取り累計 (DC/iDeCo年金分)
  const totalNetPayout = Math.round((netAmountAnnual * pensionYears) * 100) / 100;

  // 会社退職金部分の税額と手取り
  const companyRetTaxable = Math.max(0, Math.round((Math.max(0, companyRetirement - deductionLimit) * 0.5) * 100) / 100);
  const companyRetirementTax = calculateTaxModel(companyRetTaxable);
  const companyRetirementNet = Math.max(0, Math.round((companyRetirement - companyRetirementTax) * 100) / 100);

  // 会社退職金を含めた10年間の総手取り額
  const cumulativeNetWithCompanyRetirement = Math.round((companyRetirementNet + totalNetPayout) * 100) / 100;

  const memo = `会社退職金は一時金（退職所得）として受け取り、DC/iDeCoは10年間の年金（雑所得）として分割受取する想定です。公的年金と合算されるため、税金や社会保険料が適用される目安が上がります。一時金課税を抑え、毎年の収入として受け取る比較です。`;

  return {
    annualPensionAmount,
    pensionYears,
    combinedAnnualAmount,
    pensionDeduction,
    rawPensionIncome,
    socialInsuranceDeduction,
    basicDeduction,
    taxablePensionIncome,
    estimatedTaxAnnual,
    netAmountAnnual,
    totalNetPayout,
    companyRetirementNet,
    companyRetirementTax,
    cumulativeNetWithCompanyRetirement,
    memo,
  };
}

/**
 * シナリオ3: 同年受取の配分例 (併用する場合)
 * ※ 同年受取の退職所得控除残額に収まる部分だけを一時金で受け取り、超える部分は年金（10年分割想定）
 */
export function calculateHybridScenario(
  companyRetirement: number,
  dcIdecoTotal: number,
  deductionLimit: number,
  publicPensionEstimate: number,
  receiptAge: number,
  timing?: {
    sameYearReceipt: boolean;
    companyDeductionLimit: number;
    dcIdecoDeductionLimit: number;
  }
): HybridScenarioResult {
  let lumpSumAmount = 0;
  let pensionTotal = 0;
  const sameYearReceipt = timing?.sameYearReceipt ?? true;
  const companyDeductionLimit = timing?.companyDeductionLimit ?? deductionLimit;
  const dcIdecoDeductionLimit = timing?.dcIdecoDeductionLimit ?? deductionLimit;

  // 同年受取の配分例の計算ルール
  if (!sameYearReceipt) {
    lumpSumAmount = Math.min(dcIdecoTotal, dcIdecoDeductionLimit);
    pensionTotal = dcIdecoTotal - lumpSumAmount;
  } else if (companyRetirement <= deductionLimit) {
    const remainingLimit = deductionLimit - companyRetirement;
    lumpSumAmount = Math.min(dcIdecoTotal, remainingLimit);
    pensionTotal = dcIdecoTotal - lumpSumAmount;
  } else {
    lumpSumAmount = 0;
    pensionTotal = dcIdecoTotal;
  }

  const lumpSumRatio = dcIdecoTotal > 0 ? Math.round((lumpSumAmount / dcIdecoTotal) * 100) : 0;
  const pensionRatio = dcIdecoTotal > 0 ? Math.round((pensionTotal / dcIdecoTotal) * 100) : 100;

  // 一時金部分 (会社退職金＋DC一時金部分)
  const totalLumpSumAmount = companyRetirement + lumpSumAmount;
  const companyExcess = Math.max(0, companyRetirement - companyDeductionLimit);
  const dcExcess = Math.max(0, lumpSumAmount - dcIdecoDeductionLimit);
  const excessLumpSum = sameYearReceipt
    ? calculateLumpSumExcess(totalLumpSumAmount, deductionLimit)
    : companyExcess + dcExcess;
  const companyTaxable = sameYearReceipt ? 0 : Math.round(companyExcess * 0.5 * 100) / 100;
  const dcTaxable = sameYearReceipt ? 0 : Math.round(dcExcess * 0.5 * 100) / 100;
  const taxableIncome = sameYearReceipt
    ? Math.max(0, Math.round(excessLumpSum * 0.5 * 100) / 100)
    : Math.round((companyTaxable + dcTaxable) * 100) / 100;
  const companyRetirementTax = sameYearReceipt ? 0 : calculateTaxModel(companyTaxable);
  const dcLumpSumTax = sameYearReceipt ? 0 : calculateTaxModel(dcTaxable);
  const estimatedTaxLumpSum = sameYearReceipt
    ? calculateTaxModel(taxableIncome)
    : Math.round((companyRetirementTax + dcLumpSumTax) * 100) / 100;
  const netLumpSumAmount = sameYearReceipt
    ? Math.max(0, Math.round((lumpSumAmount - (estimatedTaxLumpSum * (lumpSumAmount / Math.max(1, totalLumpSumAmount)))) * 100) / 100)
    : Math.max(0, Math.round((lumpSumAmount - dcLumpSumTax) * 100) / 100);

  // 年金部分 (10年分割)
  const annualPensionAmount = Math.round((pensionTotal / 10) * 100) / 100;
  
  const combinedAnnualAmount = publicPensionEstimate + annualPensionAmount;
  const pensionDeduction = calculatePensionDeduction(combinedAnnualAmount, receiptAge);
  const rawPensionIncome = Math.max(0, combinedAnnualAmount - pensionDeduction);
  const socialInsuranceDeduction = Math.round((combinedAnnualAmount * 0.10) * 100) / 100;
  const basicDeduction = calculateBasicDeduction2026(rawPensionIncome);
  const taxablePensionIncome = Math.max(0, Math.round((rawPensionIncome - socialInsuranceDeduction - basicDeduction) * 100) / 100);
  const estimatedTaxPensionAnnual = calculateTaxModel(taxablePensionIncome);
  const pensionShare = annualPensionAmount / Math.max(1, combinedAnnualAmount);
  const allocatedPensionTax = estimatedTaxPensionAnnual * pensionShare;
  const allocatedPensionInsurance = socialInsuranceDeduction * pensionShare;
  const netPensionAmountAnnual = Math.max(0, Math.round((annualPensionAmount - allocatedPensionTax - allocatedPensionInsurance) * 100) / 100);

  // DC/iDeCo部分のみの合計
  const firstYearNetTotal = Math.round((netLumpSumAmount + netPensionAmountAnnual) * 100) / 100;
  const cumulativeNetTotal = Math.round((netLumpSumAmount + (netPensionAmountAnnual * 10)) * 100) / 100;

  // 会社退職金単体での税額と手取り (他のシナリオと比較するための基準)
  const companyRetTaxable = sameYearReceipt
    ? Math.max(0, Math.round((Math.max(0, companyRetirement - deductionLimit) * 0.5) * 100) / 100)
    : companyTaxable;
  const allocatedCompanyTax = sameYearReceipt
    ? estimatedTaxLumpSum * (companyRetirement / Math.max(1, totalLumpSumAmount))
    : companyRetirementTax;
  const companyRetirementNet = Math.max(0, Math.round((companyRetirement - allocatedCompanyTax) * 100) / 100);

  // 会社退職金を含めた全体の手取り額の計算
  const totalNetLumpSumAmount = Math.max(0, Math.round((totalLumpSumAmount - estimatedTaxLumpSum) * 100) / 100);
  const cumulativeNetWithCompanyRetirement = Math.round((totalNetLumpSumAmount + (netPensionAmountAnnual * 10)) * 100) / 100;
  const firstYearNetWithCompanyRetirement = Math.round((totalNetLumpSumAmount + netPensionAmountAnnual) * 100) / 100;

  let memo = '';
  if (!sameYearReceipt) {
    memo = `会社退職金とDC/iDeCo一時金を別の年に受け取る前提で、DC/iDeCoの調整後控除額 ${dcIdecoDeductionLimit.toLocaleString()}万円までを一時金とし、残りを10年年金とする比較例です。`;
  } else if (companyRetirement <= deductionLimit) {
    const remainingLimit = deductionLimit - companyRetirement;
    if (dcIdecoTotal <= remainingLimit) {
      memo = `現在の入力では、DC/iDeCo全額が同年受取の控除残額に収まる見込みです。一時金部分として ${lumpSumAmount.toLocaleString()}万円（100%）を受け取る比較例です。`;
    } else {
      memo = `会社退職金で使い切らなかった退職所得控除の枠（${remainingLimit.toLocaleString()}万円）を一時金部分に使い、枠を超える部分は年金として分けて受け取る比較です。`;
    }
  } else {
    memo = `会社退職金だけで退職所得控除を超えているため、DC/iDeCoは一時金を0円とし、全額を年金部分（100%）として分割受取する想定です。`;
  }

  return {
    lumpSumRatio,
    pensionRatio,
    lumpSumAmount,
    totalLumpSumAmount,
    excessLumpSum,
    taxableIncome,
    estimatedTaxLumpSum,
    netLumpSumAmount,
    annualPensionAmount,
    combinedAnnualAmount,
    pensionDeduction,
    rawPensionIncome,
    socialInsuranceDeduction,
    basicDeduction,
    taxablePensionIncome,
    estimatedTaxPensionAnnual,
    netPensionAmountAnnual,
    firstYearNetTotal,
    cumulativeNetTotal,
    companyRetirementNet,
    companyRetirementTax: allocatedCompanyTax,
    cumulativeNetWithCompanyRetirement,
    firstYearNetWithCompanyRetirement,
    memo,
  };
}

/**
 * シナリオ: 任意プラン (ユーザーが一時金と年金の配分を自由に設定)
 */
export function calculateCustomScenario(
  companyRetirement: number,
  dcIdecoTotal: number,
  deductionLimit: number,
  publicPensionEstimate: number,
  receiptAge: number,
  customLumpSumAmount: number,
  timing?: {
    sameYearReceipt: boolean;
    companyDeductionLimit: number;
    dcIdecoDeductionLimit: number;
  }
): HybridScenarioResult {
  const sanitizedLumpSum = Math.max(0, Math.min(dcIdecoTotal, customLumpSumAmount));
  const pensionTotal = dcIdecoTotal - sanitizedLumpSum;
  const sameYearReceipt = timing?.sameYearReceipt ?? true;
  const companyDeductionLimit = timing?.companyDeductionLimit ?? deductionLimit;
  const dcIdecoDeductionLimit = timing?.dcIdecoDeductionLimit ?? deductionLimit;

  const lumpSumRatio = dcIdecoTotal > 0 ? Math.round((sanitizedLumpSum / dcIdecoTotal) * 100) : 0;
  const pensionRatio = dcIdecoTotal > 0 ? Math.round((pensionTotal / dcIdecoTotal) * 100) : 100;

  // 一時金部分 (会社退職金＋DC一時金部分)
  const totalLumpSumAmount = companyRetirement + sanitizedLumpSum;
  const companyExcess = Math.max(0, companyRetirement - companyDeductionLimit);
  const dcExcess = Math.max(0, sanitizedLumpSum - dcIdecoDeductionLimit);
  const excessLumpSum = sameYearReceipt
    ? calculateLumpSumExcess(totalLumpSumAmount, deductionLimit)
    : companyExcess + dcExcess;
  const companyTaxable = sameYearReceipt ? 0 : Math.round(companyExcess * 0.5 * 100) / 100;
  const dcTaxable = sameYearReceipt ? 0 : Math.round(dcExcess * 0.5 * 100) / 100;
  const taxableIncome = sameYearReceipt
    ? Math.max(0, Math.round(excessLumpSum * 0.5 * 100) / 100)
    : Math.round((companyTaxable + dcTaxable) * 100) / 100;
  const separateCompanyTax = sameYearReceipt ? 0 : calculateTaxModel(companyTaxable);
  const separateDcTax = sameYearReceipt ? 0 : calculateTaxModel(dcTaxable);
  const estimatedTaxLumpSum = sameYearReceipt
    ? calculateTaxModel(taxableIncome)
    : Math.round((separateCompanyTax + separateDcTax) * 100) / 100;
  const netLumpSumAmount = sameYearReceipt
    ? Math.max(0, Math.round((sanitizedLumpSum - (estimatedTaxLumpSum * (sanitizedLumpSum / Math.max(1, totalLumpSumAmount)))) * 100) / 100)
    : Math.max(0, Math.round((sanitizedLumpSum - separateDcTax) * 100) / 100);

  // 年金部分 (10年分割)
  const annualPensionAmount = Math.round((pensionTotal / 10) * 100) / 100;
  
  const combinedAnnualAmount = publicPensionEstimate + annualPensionAmount;
  const pensionDeduction = calculatePensionDeduction(combinedAnnualAmount, receiptAge);
  const rawPensionIncome = Math.max(0, combinedAnnualAmount - pensionDeduction);
  const socialInsuranceDeduction = Math.round((combinedAnnualAmount * 0.10) * 100) / 100;
  const basicDeduction = calculateBasicDeduction2026(rawPensionIncome);
  const taxablePensionIncome = Math.max(0, Math.round((rawPensionIncome - socialInsuranceDeduction - basicDeduction) * 100) / 100);
  const estimatedTaxPensionAnnual = calculateTaxModel(taxablePensionIncome);
  const pensionShare = annualPensionAmount / Math.max(1, combinedAnnualAmount);
  const allocatedPensionTax = estimatedTaxPensionAnnual * pensionShare;
  const allocatedPensionInsurance = socialInsuranceDeduction * pensionShare;
  const netPensionAmountAnnual = Math.max(0, Math.round((annualPensionAmount - allocatedPensionTax - allocatedPensionInsurance) * 100) / 100);

  // DC/iDeCo部分のみの合計
  const firstYearNetTotal = Math.round((netLumpSumAmount + netPensionAmountAnnual) * 100) / 100;
  const cumulativeNetTotal = Math.round((netLumpSumAmount + (netPensionAmountAnnual * 10)) * 100) / 100;

  // 会社退職金単体での税額と手取り
  const companyRetirementTax = sameYearReceipt
    ? estimatedTaxLumpSum * (companyRetirement / Math.max(1, totalLumpSumAmount))
    : separateCompanyTax;
  const companyRetirementNet = Math.max(0, Math.round((companyRetirement - companyRetirementTax) * 100) / 100);

  // 会社退職金を含めた全体の手取り額の計算
  const totalNetLumpSumAmount = Math.max(0, Math.round((totalLumpSumAmount - estimatedTaxLumpSum) * 100) / 100);
  const cumulativeNetWithCompanyRetirement = Math.round((totalNetLumpSumAmount + (netPensionAmountAnnual * 10)) * 100) / 100;
  const firstYearNetWithCompanyRetirement = Math.round((totalNetLumpSumAmount + netPensionAmountAnnual) * 100) / 100;

  const memo = '一時金で確保したい金額を自分で決め、残りを年金として分けて受け取る比較です。生活費や手元資金の必要額に合わせて調整できます。';

  return {
    lumpSumRatio,
    pensionRatio,
    lumpSumAmount: sanitizedLumpSum,
    totalLumpSumAmount,
    excessLumpSum,
    taxableIncome,
    estimatedTaxLumpSum,
    netLumpSumAmount,
    annualPensionAmount,
    combinedAnnualAmount,
    pensionDeduction,
    rawPensionIncome,
    socialInsuranceDeduction,
    basicDeduction,
    taxablePensionIncome,
    estimatedTaxPensionAnnual,
    netPensionAmountAnnual,
    firstYearNetTotal,
    cumulativeNetTotal,
    companyRetirementNet,
    companyRetirementTax,
    cumulativeNetWithCompanyRetirement,
    firstYearNetWithCompanyRetirement,
    memo,
  };
}

/**
 * 整理結果サマリーの作成
 */
export function buildResultSummary(
  inputs: CompassInputs,
  companyRetirementDeduction: number,
  sameYearDeduction: number,
  dcIdecoTotal: number,
  dcIdecoDeduction: number
): { summaryTitle: string; summaryText: string; keyPoints: string[] } {
  const compRet = inputs.companyRetirementEstimate;
  const isExcess = compRet > companyRetirementDeduction;
  const companyDifference = Math.abs(compRet - companyRetirementDeduction);
  const isSameYearReceipt = inputs.companyRetirementAge === inputs.dcIdecoReceiptAge;
  const sameYearRemaining = Math.max(0, sameYearDeduction - compRet);
  const dcAvailableDeduction = isSameYearReceipt ? sameYearRemaining : dcIdecoDeduction;
  const dcExcess = Math.max(0, dcIdecoTotal - dcAvailableDeduction);

  let summaryTitle = '';
  let summaryText = isSameYearReceipt
    ? '会社退職金とDC/iDeCo一時金を同じ年に受け取る前提で、合算控除額と受取方法を比較します。'
    : `会社退職金を${inputs.companyRetirementAge}歳、DC/iDeCoを${inputs.dcIdecoReceiptAge}歳で受け取る前提で、受取年ごとに控除額を確認します。`;
  const keyPoints: string[] = [];

  if (isExcess) {
    summaryTitle = '会社退職金は退職所得控除を超える見込みです';
    keyPoints.push(`会社退職金単体（${compRet.toLocaleString()}万円）が勤続年数からの概算控除額（${companyRetirementDeduction.toLocaleString()}万円）を ${companyDifference.toLocaleString()}万円 超えるため、一時金受取時は一部が課税対象となる目安です。`);
    keyPoints.push(isSameYearReceipt
      ? `同年受取では、会社退職金とDC/iDeCo一時金を合算して課税退職所得を概算します。`
      : `DC/iDeCo一時金は、先に受け取る一時金との期間の重なりを反映した控除額（${dcIdecoDeduction.toLocaleString()}万円）で別に概算します。`);
    keyPoints.push(`退職後も再雇用や就労の予定がある場合は、働き終える年齢（再雇用終了時など）に合わせて受取を始めると、収入の切り替わりを整理しやすくなります。`);
  } else {
    summaryTitle = dcExcess > 0
      ? `会社退職金は控除内ですが、DC/iDeCo一時金は控除額を${dcExcess.toLocaleString()}万円超える目安です`
      : '会社退職金とDC/iDeCo一時金は、それぞれ控除内に収まる目安です';
    keyPoints.push(`会社退職金（${compRet.toLocaleString()}万円）は、会社退職金単体の概算控除額（${companyRetirementDeduction.toLocaleString()}万円）の範囲内に収まる試算です。`);
    keyPoints.push(isSameYearReceipt
      ? `同年受取の合算控除額から会社退職金を差し引いた ${sameYearRemaining.toLocaleString()}万円 が、DC/iDeCo一時金を比較する際の残額目安です。`
      : `DC/iDeCo一時金（${dcIdecoTotal.toLocaleString()}万円）は、受取順序と期間の重なりを反映した控除額（${dcIdecoDeduction.toLocaleString()}万円）で別に概算します。`);
    keyPoints.push(`表示する控除額は別の年へ持ち越す枠ではありません。受取年と過去の一時金履歴ごとに、期間の重なりを確認した結果です。`);
  }

  return {
    summaryTitle,
    summaryText,
    keyPoints: keyPoints.slice(0, 3), // 3つ以内
  };
}

/**
 * DC/iDeCoの受取方法における確認事項を作成
 */
export function buildDcIdecoGuidance(
  inputs: CompassInputs,
  dcIdecoTotal: number,
  companyDeduction: number,
  sameYearDeduction: number,
  dcIdecoDeduction: number
): string[] {
  const compRet = inputs.companyRetirementEstimate;
  const isSameYearReceipt = inputs.companyRetirementAge === inputs.dcIdecoReceiptAge;
  const availableDeduction = isSameYearReceipt
    ? Math.max(0, sameYearDeduction - compRet)
    : dcIdecoDeduction;
  const advice: string[] = [];

  if (dcIdecoTotal === 0) {
    advice.push('現在、DC/iDeCoの残高予想が0万円に設定されています。DCやiDeCoを利用されている場合は、予想残高を入力することでより詳細なシミュレーションが可能です。');
    return advice;
  }

  if (availableDeduction > 0) {
    if (dcIdecoTotal <= availableDeduction) {
      advice.push(isSameYearReceipt
        ? `【同年に一時金で受け取る場合】DC/iDeCoの合計（${dcIdecoTotal.toLocaleString()}万円）は、同年受取の控除残額目安（${availableDeduction.toLocaleString()}万円）に収まる試算です。`
        : `【受取年を分ける場合】DC/iDeCoの合計（${dcIdecoTotal.toLocaleString()}万円）は、受取順序と期間の重なりを反映した控除額（${availableDeduction.toLocaleString()}万円）に収まる試算です。`);
    } else {
      advice.push(`【一時金と年金を分ける場合】DC/iDeCoの合計（${dcIdecoTotal.toLocaleString()}万円）は、今回使える控除額目安（${availableDeduction.toLocaleString()}万円）を上回ります。一時金を ${availableDeduction.toLocaleString()}万円、残る ${Math.round((dcIdecoTotal - availableDeduction) * 100) / 100}万円 を年金とする比較例を確認できます。`);
    }
  } else {
    advice.push(isSameYearReceipt
      ? `【同年受取の確認】会社退職金（${compRet.toLocaleString()}万円）とDC/iDeCo一時金を合算し、同年分の控除額を超える部分の2分の1を課税退職所得として概算します。`
      : `【受取順序の確認】会社退職金の控除額目安は ${companyDeduction.toLocaleString()}万円、DC/iDeCo一時金の調整後控除額は ${dcIdecoDeduction.toLocaleString()}万円 です。会社退職金を先に受ける場合は19年ルール、DC/iDeCo一時金を先に受ける場合は2026年1月1日以後の受取について10年ルールが関係する場合があります。`);
  }

  advice.push(`【年金受取の見方】DC/iDeCoを年金で受け取る場合は、公的年金などと合算して公的年金等控除を計算します。本ツールでは社会保険料を年金収入の10%とする比較用モデルで手取りを概算しています。`);
  advice.push(`【比較の軸】一時金は受取時の税額、年金は受取期間中の税金・社会保険料、併用はその両方を確認します。手取り額だけでなく、必要な時期に確保したい金額も合わせて整理します。`);

  return advice;
}

/**
 * 月数の重なりを計算するためのヘルパー
 */
function getYearMonthValue(ym: string): number {
  if (!ym) return 0;
  const [y, m] = ym.split('-').map(Number);
  if (isNaN(y) || isNaN(m)) return 0;
  return y * 12 + (m - 1);
}

function calculateAgeAtYearMonth(birthYearMonth: string, targetYearMonth: string): number {
  const [birthY, birthM] = birthYearMonth.split('-').map(Number);
  const [targetY, targetM] = targetYearMonth.split('-').map(Number);
  if ([birthY, birthM, targetY, targetM].some(Number.isNaN)) return 60;
  return targetY - birthY - (targetM < birthM ? 1 : 0);
}

/**
 * 過去の一時金受取履歴の分析・勤続期間の重複調整
 */
export function analyzePastLumpSums(
  inputs: CompassInputs,
  originalDeduction: number,
  serviceYears: number,
  targetJoinStart?: string,
  targetReceiptAge?: number,
  currentLumpSumKind: CurrentLumpSumKind = 'companyRetirement',
  additionalPastLumpSums: PastLumpSum[] = [],
  targetServiceEndYearMonth?: string
): PastLumpSumAnalysis {
  const registeredPastLumpSums = inputs.hasPastLumpSum === 'yes' ? (inputs.pastLumpSums || []) : [];
  const matchedPastLumpSums = [...registeredPastLumpSums, ...additionalPastLumpSums];

  const defaultAnalysis: PastLumpSumAnalysis = {
    hasImpact: false,
    overlapYears: 0,
    originalDeduction,
    adjustedDeduction: originalDeduction,
    reductionAmount: 0,
    statusMessage: '過去の一時金受取履歴はありません。通常の退職所得控除額をもとに計算しています。',
    details: [],
  };

  if (inputs.hasPastLumpSum === 'no' && additionalPastLumpSums.length === 0) {
    return defaultAnalysis;
  }

  if (inputs.hasPastLumpSum === 'unknown' && additionalPastLumpSums.length === 0) {
    return {
      ...defaultAnalysis,
      statusMessage: '過去の退職金・企業年金・DC/iDeCo一時金の受取履歴が不明です。退職所得の源泉徴収票や退職金の支給明細を確認すると、より実態に近い試算ができます。過去の一時金受取から今回の受取までの期間や、勤続期間の重複状況によって、退職所得控除額が変わる可能性があります。',
    };
  }

  if (inputs.hasPastLumpSum === 'yes' && matchedPastLumpSums.length === 0) {
    return {
      ...defaultAnalysis,
      statusMessage: '過去の一時金履歴に「ある」が選択されていますが、まだ具体的な履歴が追加されていません。左側の「過去の一時金を追加」フォームに内容を入力し、「+ 一時金を追加」ボタンを押して登録してください。登録された内容をもとに重複期間の有無や退職所得控除の調整を確認します。',
    };
  }

  if (matchedPastLumpSums.length === 0) {
    return defaultAnalysis;
  }

  const joinStart = targetJoinStart || inputs.joinedYearMonth;
  const receiptAge = targetReceiptAge !== undefined ? targetReceiptAge : inputs.companyRetirementAge;

  // 今回の退職年月の算出
  const [birthY, birthM] = (inputs.birthYearMonth || '1966-01').split('-').map(Number);
  const retireY = birthY + receiptAge;
  const retireM = birthM;
  const receiptYearMonth = `${retireY}-${String(retireM).padStart(2, '0')}`;
  const serviceEndYearMonth = targetServiceEndYearMonth || receiptYearMonth;

  const retireVal = getYearMonthValue(serviceEndYearMonth);
  const joinVal = getYearMonthValue(joinStart);
  const targetReceiptYear = retireY;

  const overlapMonthsSet = new Set<number>();
  let hasRuleMatch = false;
  let hasSameYearReceipt = false;

  const details = matchedPastLumpSums.map((item) => {
    const recVal = getYearMonthValue(item.receiveYearMonth);
    const [pastReceiptYear] = (item.receiveYearMonth || '').split('-').map(Number);
    const yearDifference = targetReceiptYear - pastReceiptYear;

    const isPastDc = item.type === 'corporateDc' || item.type === 'ideco';
    const isPastDcPost2026 = isPastDc && pastReceiptYear >= 2026;
    let adjustmentRule: PastLumpSumAnalysis['details'][number]['adjustmentRule'] = 'none';

    if (yearDifference === 0) {
      hasSameYearReceipt = true;
    } else if (yearDifference > 0) {
      if (currentLumpSumKind === 'dcIdeco' || currentLumpSumKind === 'combined') {
        if (yearDifference <= 19) {
          adjustmentRule = 'dc-current-20-year';
        }
      } else if (isPastDcPost2026 && yearDifference <= 9) {
        adjustmentRule = 'dc-first-10-year';
      } else if (yearDifference <= 4) {
        adjustmentRule = 'general-5-year';
      }
    }

    const jsVal = getYearMonthValue(item.joinStart);
    const jeVal = getYearMonthValue(item.joinEnd);
    const pastServiceMonths = Math.max(0, jeVal - jsVal);
    const pastServiceYears = Math.max(1, Math.ceil(pastServiceMonths / 12));
    const pastOriginalDeduction = calculateRetirementDeduction(pastServiceYears);
    const usedAmountBasedPeriod = item.amount >= 0 && item.amount < pastOriginalDeduction;

    let effectivePastYears = pastServiceYears;
    let effectivePastEnd = jeVal;

    if (usedAmountBasedPeriod) {
      effectivePastYears = item.amount <= 800
        ? Math.floor(item.amount / 40)
        : Math.floor((item.amount - 800) / 70 + 20);
      effectivePastEnd = effectivePastYears > 0
        ? Math.min(jeVal, jsVal + effectivePastYears * 12 - 1)
        : jsVal - 1;
    }

    let itemOverlapYears = 0;
    if (adjustmentRule !== 'none' && jsVal && jeVal) {
      hasRuleMatch = true;
      const overlapStart = Math.max(jsVal, joinVal);
      const overlapEnd = Math.min(effectivePastEnd, retireVal - 1);
      const overlapMonths = overlapEnd - overlapStart;

      if (overlapMonths >= 0) {
        for (let m = overlapStart; m <= overlapEnd; m++) {
          overlapMonthsSet.add(m);
        }
        itemOverlapYears = Math.floor((overlapMonths + 1) / 12);
      }
    }

    return {
      id: item.id,
      name: item.name || '過去の一時金',
      overlapYears: itemOverlapYears,
      isWithin19Years: adjustmentRule !== 'none',
      adjustmentRule,
      effectivePastYears,
      usedAmountBasedPeriod,
    };
  });

  const overlapYears = Math.floor(overlapMonthsSet.size / 12);
  const overlapDeduction = overlapYears > 0 ? calculateRetirementDeduction(overlapYears) : 0;
  const adjustedDeduction = Math.max(0, originalDeduction - overlapDeduction);
  const reductionAmount = originalDeduction - adjustedDeduction;

  let statusMessage = '';
  let hasImpact = false;
  const includesCurrentPlanReceipt = matchedPastLumpSums.some((item) => item.id.startsWith('__current-'));

  if (overlapYears > 0) {
    hasImpact = true;
    statusMessage = `${includesCurrentPlanReceipt ? '今回先に受け取る一時金' : '登録した過去の一時金'}と、後に受け取る退職金・DC/iDeCo一時金の対象期間が重なるため、退職所得控除額を ${originalDeduction.toLocaleString()}万円 から ${adjustedDeduction.toLocaleString()}万円 に（${reductionAmount.toLocaleString()}万円 減少）調整して概算しています。`;
  } else {
    if (!hasRuleMatch) {
      statusMessage = '過去の一時金は入力されていますが、受取時期がかなり前であるため、現在の条件では大きな調整は見込んでいません。通常の退職所得控除額をもとに概算しています。';
    } else {
      statusMessage = '入力された過去の一時金と、今回の受取予定との間に大きな勤続期間の重なりは見当たりません。現在の入力内容では、通常の退職所得控除額をもとに概算しています。';
    }
  }

  if (details.some((detail) => detail.usedAmountBasedPeriod && detail.adjustmentRule !== 'none')) {
    statusMessage += ' 先に受け取る一時金額が、その一時金に対応する退職所得控除額を下回る場合は、支給額から求める計算上の期間を使って重複期間を整理しています。控除枠の残額を持ち越す計算ではありません。';
  }

  if (hasSameYearReceipt) {
    statusMessage += ' 同じ年に受け取る一時金は、過去年分の調整とは別に、その年分として合算して確認する必要があります。';
  }

  if (inputs.hasPastLumpSum === 'unknown') {
    statusMessage += ' これとは別に、過去の一時金履歴が不明と入力されているため、支払通知書や源泉徴収票を確認してください。';
  }

  return {
    hasImpact,
    overlapYears,
    originalDeduction,
    adjustedDeduction,
    reductionAmount,
    statusMessage,
    details,
  };
}

/**
 * 総合シミュレーションの実行エントリー
 */
export function runCompassCalculation(inputs: CompassInputs): CompassResults {
  const companyServiceYears = calculateServiceYears(inputs.joinedYearMonth, inputs.birthYearMonth, inputs.companyRetirementAge);
  const companyOriginalDeduction = calculateRetirementDeduction(companyServiceYears);
  const dcJoinStart = inputs.dcJoinedYearMonth || inputs.joinedYearMonth;
  const dcIdecoTotal = calculateDcIdecoExpectedTotal(inputs.corporateDcEstimate, inputs.idecoEstimate);
  const [birthY, birthM] = (inputs.birthYearMonth || '1966-01').split('-').map(Number);
  const receiptMonth = String(birthM).padStart(2, '0');
  const companyReceiptYearMonth = `${birthY + inputs.companyRetirementAge}-${receiptMonth}`;
  const dcReceiptYearMonth = `${birthY + inputs.dcIdecoReceiptAge}-${receiptMonth}`;
  const configuredDcJoinEnd = resolveDcJoinEndYearMonth(inputs);
  const dcJoinEnd = getYearMonthValue(configuredDcJoinEnd) > getYearMonthValue(dcReceiptYearMonth)
    ? dcReceiptYearMonth
    : configuredDcJoinEnd;
  const dcServiceYears = calculateServiceYearsBetween(dcJoinStart, dcJoinEnd);
  const dcIdecoOriginalDeduction = calculateRetirementDeduction(dcServiceYears);
  const isSameYearReceipt = inputs.companyRetirementAge === inputs.dcIdecoReceiptAge;
  const isCompanyFirst = inputs.companyRetirementAge < inputs.dcIdecoReceiptAge;
  const isDcFirst = inputs.dcIdecoReceiptAge < inputs.companyRetirementAge;

  const currentCompanyReceipt: PastLumpSum = {
    id: '__current-company-retirement__',
    name: '今回の会社退職金',
    receiveYearMonth: companyReceiptYearMonth,
    amount: inputs.companyRetirementEstimate,
    joinStart: inputs.joinedYearMonth,
    joinEnd: companyReceiptYearMonth,
    type: 'companyRetirement',
  };
  const currentDcReceipt = (amount: number): PastLumpSum => ({
    id: '__current-dc-ideco__',
    name: '今回のDC/iDeCo一時金',
    receiveYearMonth: dcReceiptYearMonth,
    amount,
    joinStart: dcJoinStart,
    joinEnd: dcJoinEnd,
    type: 'corporateDc',
  });

  const companyExternalPastAnalysis = analyzePastLumpSums(
    inputs,
    companyOriginalDeduction,
    companyServiceYears,
    inputs.joinedYearMonth,
    inputs.companyRetirementAge,
    'companyRetirement'
  );
  const dcExternalPastAnalysis = analyzePastLumpSums(
    inputs,
    dcIdecoOriginalDeduction,
    dcServiceYears,
    dcJoinStart,
    inputs.dcIdecoReceiptAge,
    'dcIdeco',
    [],
    dcJoinEnd
  );

  // 今回の2つの一時金を別年に受け取る場合、先の受取を後の控除調整へ含める。
  const pastLumpSumAnalysis = isDcFirst
    ? analyzePastLumpSums(
        inputs,
        companyOriginalDeduction,
        companyServiceYears,
        inputs.joinedYearMonth,
        inputs.companyRetirementAge,
        'companyRetirement',
        [currentDcReceipt(dcIdecoTotal)]
      )
    : companyExternalPastAnalysis;
  const dcIdecoPastLumpSumAnalysis = isCompanyFirst
    ? analyzePastLumpSums(
        inputs,
        dcIdecoOriginalDeduction,
        dcServiceYears,
        dcJoinStart,
        inputs.dcIdecoReceiptAge,
        'dcIdeco',
        [currentCompanyReceipt],
        dcJoinEnd
      )
    : dcExternalPastAnalysis;

  const companyRetirementDeduction = pastLumpSumAnalysis.adjustedDeduction;
  const companyReductionAmount = pastLumpSumAnalysis.reductionAmount;
  const dcIdecoAdjustedDeduction = dcIdecoPastLumpSumAnalysis.adjustedDeduction;
  const dcIdecoReductionAmount = dcIdecoPastLumpSumAnalysis.reductionAmount;

  // 同年一時金受取（合算）時に適用される「合算控除額」の計算
  // 会社退職金の勤続期間と、DC/iDeCoの加入期間の和集合（重複しない合計期間）の月数に基づく
  const compJoinVal = getYearMonthValue(inputs.joinedYearMonth);
  const compRetireVal = getYearMonthValue(`${birthY + inputs.companyRetirementAge}-${String(birthM).padStart(2, '0')}`);
  const dcJoinVal = getYearMonthValue(dcJoinStart);
  const dcEndVal = getYearMonthValue(dcJoinEnd);

  const combinedMonthsSet = new Set<number>();
  for (let m = compJoinVal; m < compRetireVal; m++) {
    combinedMonthsSet.add(m);
  }
  for (let m = dcJoinVal; m < dcEndVal; m++) {
    combinedMonthsSet.add(m);
  }

  const combinedMonths = combinedMonthsSet.size;
  const combinedYears = Math.max(1, Math.ceil(combinedMonths / 12));
  const combinedOriginalDeduction = calculateRetirementDeduction(combinedYears);
  
  // 合算控除額に対する過去の一時金重複調整
  const combinedJoinStart = compJoinVal < dcJoinVal ? inputs.joinedYearMonth : dcJoinStart;
  const combinedReceiptAge = Math.max(inputs.companyRetirementAge, inputs.dcIdecoReceiptAge);
  const combinedServiceEndYearMonth = compRetireVal >= dcEndVal
    ? companyReceiptYearMonth
    : dcJoinEnd;
  const combinedPastLumpSumAnalysis = analyzePastLumpSums(
    inputs,
    combinedOriginalDeduction,
    combinedYears,
    combinedJoinStart,
    combinedReceiptAge,
    'combined',
    [],
    combinedServiceEndYearMonth
  );
  const combinedAdjustedDeduction = combinedPastLumpSumAnalysis.adjustedDeduction;
  const combinedReductionAmount = combinedPastLumpSumAnalysis.reductionAmount;

  const companyRet = inputs.companyRetirementEstimate;
  const status = calculateCompanyRetirementStatus(companyRet, companyRetirementDeduction);

  const lumpSumScenario = calculateLumpSumScenario(
    companyRet,
    dcIdecoTotal,
    isSameYearReceipt ? combinedAdjustedDeduction : companyRetirementDeduction + dcIdecoAdjustedDeduction,
    {
      sameYearReceipt: isSameYearReceipt,
      companyDeductionLimit: companyRetirementDeduction,
      dcIdecoDeductionLimit: dcIdecoAdjustedDeduction,
    }
  );
  const pensionScenario = calculatePensionScenario(
    companyRet,
    dcIdecoTotal,
    companyExternalPastAnalysis.adjustedDeduction,
    inputs.publicPensionEstimate,
    inputs.dcIdecoReceiptAge
  );

  const provisionalHybridLumpSum = isSameYearReceipt
    ? Math.min(dcIdecoTotal, Math.max(0, combinedAdjustedDeduction - companyRet))
    : Math.min(dcIdecoTotal, dcIdecoAdjustedDeduction);
  const hybridCompanyDeduction = isDcFirst && provisionalHybridLumpSum > 0
    ? analyzePastLumpSums(
        inputs,
        companyOriginalDeduction,
        companyServiceYears,
        inputs.joinedYearMonth,
        inputs.companyRetirementAge,
        'companyRetirement',
        [currentDcReceipt(provisionalHybridLumpSum)]
      ).adjustedDeduction
    : companyExternalPastAnalysis.adjustedDeduction;
  const hybridScenario = calculateHybridScenario(
    companyRet,
    dcIdecoTotal,
    combinedAdjustedDeduction,
    inputs.publicPensionEstimate,
    inputs.dcIdecoReceiptAge,
    {
      sameYearReceipt: isSameYearReceipt,
      companyDeductionLimit: hybridCompanyDeduction,
      dcIdecoDeductionLimit: dcIdecoAdjustedDeduction,
    }
  );

  const { summaryTitle, summaryText, keyPoints } = buildResultSummary(
    inputs,
    companyRetirementDeduction,
    combinedAdjustedDeduction,
    dcIdecoTotal,
    dcIdecoAdjustedDeduction
  );

  // 重複調整により控除が減少している場合、確認項目を挿入
  if (pastLumpSumAnalysis.hasImpact) {
    const source = pastLumpSumAnalysis.details.some((detail) => detail.id.startsWith('__current-'))
      ? '先に受け取る今回のDC/iDeCo一時金'
      : '登録した過去の一時金';
    keyPoints.unshift(`${source}との期間の重なり（${pastLumpSumAnalysis.overlapYears}年）により、会社退職金の退職所得控除額を ${companyOriginalDeduction.toLocaleString()}万円 から ${companyRetirementDeduction.toLocaleString()}万円 に（${companyReductionAmount.toLocaleString()}万円 減少）調整しています。`);
  }
  if (dcIdecoPastLumpSumAnalysis.hasImpact) {
    const source = dcIdecoPastLumpSumAnalysis.details.some((detail) => detail.id.startsWith('__current-'))
      ? '先に受け取る今回の会社退職金'
      : '登録した過去の一時金';
    keyPoints.push(`${source}との期間の重なり（${dcIdecoPastLumpSumAnalysis.overlapYears}年）により、DC/iDeCoの退職所得控除額を ${dcIdecoOriginalDeduction.toLocaleString()}万円 から ${dcIdecoAdjustedDeduction.toLocaleString()}万円 に（${dcIdecoReductionAmount.toLocaleString()}万円 減少）調整しています。`);
  }

  return {
    retirementDeduction: companyRetirementDeduction, // 互換性のための基本値
    companyRetirementDeduction,
    dcIdecoDeduction: dcIdecoAdjustedDeduction, // 調整後のDC控除を返す
    companyOriginalDeduction,
    companyReductionAmount,
    dcIdecoOriginalDeduction,
    dcIdecoAdjustedDeduction,
    dcIdecoReductionAmount,
    combinedOriginalDeduction,
    combinedAdjustedDeduction,
    combinedReductionAmount,
    pastLumpSumAnalysis,
    dcIdecoPastLumpSumAnalysis,
    isCompanyRetirementExcess: status.isCompanyRetirementExcess,
    companyRetirementExcessAmount: status.companyRetirementExcessAmount,
    companyRetirementWithinLimit: status.companyRetirementWithinLimit,
    dcIdecoTotal,
    summaryTitle,
    summaryText,
    keyPoints: keyPoints.slice(0, 3),
    lumpSumScenario,
    pensionScenario,
    hybridScenario,
  };
}

export function calculateCustomCompassScenario(
  inputs: CompassInputs,
  results: CompassResults,
  customLumpSumAmount: number
): HybridScenarioResult {
  const sameYearReceipt = inputs.companyRetirementAge === inputs.dcIdecoReceiptAge;
  let companyDeductionLimit = results.companyRetirementDeduction;

  if (inputs.dcIdecoReceiptAge < inputs.companyRetirementAge && customLumpSumAmount > 0) {
    const [birthY, birthM] = (inputs.birthYearMonth || '1966-01').split('-').map(Number);
    const dcJoinStart = inputs.dcJoinedYearMonth || inputs.joinedYearMonth;
    const dcReceiptYearMonth = `${birthY + inputs.dcIdecoReceiptAge}-${String(birthM).padStart(2, '0')}`;
    const dcJoinEnd = resolveDcJoinEndYearMonth(inputs);
    const currentDcReceipt: PastLumpSum = {
      id: '__custom-dc-ideco__',
      name: '今回のDC/iDeCo一時金',
      receiveYearMonth: dcReceiptYearMonth,
      amount: Math.max(0, Math.min(results.dcIdecoTotal, customLumpSumAmount)),
      joinStart: dcJoinStart,
      joinEnd: dcJoinEnd,
      type: 'corporateDc',
    };
    const companyServiceYears = calculateServiceYears(
      inputs.joinedYearMonth,
      inputs.birthYearMonth,
      inputs.companyRetirementAge
    );
    companyDeductionLimit = analyzePastLumpSums(
      inputs,
      results.companyOriginalDeduction,
      companyServiceYears,
      inputs.joinedYearMonth,
      inputs.companyRetirementAge,
      'companyRetirement',
      [currentDcReceipt]
    ).adjustedDeduction;
  }

  return calculateCustomScenario(
    inputs.companyRetirementEstimate,
    results.dcIdecoTotal,
    results.combinedAdjustedDeduction,
    inputs.publicPensionEstimate,
    inputs.dcIdecoReceiptAge,
    customLumpSumAmount,
    {
      sameYearReceipt,
      companyDeductionLimit,
      dcIdecoDeductionLimit: results.dcIdecoAdjustedDeduction,
    }
  );
}

/**
 * 会社退職金受取後にDC/iDeCoを一時金で受け取る年齢を比較する。
 * 会社退職時点の比較基準残高に、候補年齢までの掛金と運用率を反映する。
 * 各候補では、同じ受取年齢で会社退職時に拠出を終える場合とも比較する。
 */
export function calculateDcTimingComparison(
  inputs: CompassInputs,
  annualReturnRate = 0,
  monthlyContribution = 0,
  comparisonBaseBalance?: number
): DcTimingComparisonResult[] {
  const selectedAge = Math.min(75, Math.max(60, inputs.dcIdecoReceiptAge || 65));
  const firstCandidateAge = Math.min(
    75,
    Math.max(60, inputs.companyRetirementAge)
  );
  const candidateAges = Array.from(new Set([
    firstCandidateAge,
    65,
    70,
    75,
    selectedAge,
  ]))
    .filter((age) => age >= firstCandidateAge && age <= 75)
    .sort((a, b) => a - b);

  const safeRate = Math.max(-99, Math.min(20, annualReturnRate));
  const safeMonthlyContribution = Math.max(0, monthlyContribution);
  const currentDcTotal = calculateDcIdecoExpectedTotal(
    inputs.corporateDcEstimate,
    inputs.idecoEstimate
  );
  const baseDcTotal = Math.max(
    0,
    comparisonBaseBalance === undefined ? currentDcTotal : comparisonBaseBalance
  );
  const corporateShare = currentDcTotal > 0
    ? inputs.corporateDcEstimate / currentDcTotal
    : 1;
  const [birthY, birthM] = (inputs.birthYearMonth || '').split('-').map(Number);
  const dcJoinStart = inputs.dcJoinedYearMonth || inputs.joinedYearMonth;
  const companyRetirementEndYearMonth = `${birthY + inputs.companyRetirementAge}-${String(birthM).padStart(2, '0')}`;
  const retirementEndServiceYears = calculateServiceYearsBetween(
    dcJoinStart,
    companyRetirementEndYearMonth
  );
  const monthlyRate = safeRate === 0
    ? 0
    : Math.pow(1 + safeRate / 100, 1 / 12) - 1;
  const roundMoney = (value: number) => Math.round(value * 100) / 100;

  const buildScenarioAtAge = (
    receiptAge: number,
    continueContributions: boolean
  ): {
    scenarioInputs: CompassInputs;
    contributionEndAge: number;
    additionalContributionYears: number;
    additionalContributions: number;
    projectedTotal: number;
    serviceYears: number;
  } => {
    const contributionEndAge = continueContributions && safeMonthlyContribution > 0
      ? Math.min(receiptAge, 70)
      : inputs.companyRetirementAge;
    const additionalContributionYears = Math.max(
      0,
      contributionEndAge - inputs.companyRetirementAge
    );
    const monthsToReceipt = Math.max(
      0,
      Math.round((receiptAge - inputs.companyRetirementAge) * 12)
    );
    const contributionMonths = Math.max(
      0,
      Math.round(additionalContributionYears * 12)
    );
    let projectedTotal = baseDcTotal;

    for (let month = 0; month < monthsToReceipt; month += 1) {
      projectedTotal *= 1 + monthlyRate;
      if (month < contributionMonths) {
        projectedTotal += safeMonthlyContribution;
      }
    }

    projectedTotal = roundMoney(Math.max(0, projectedTotal));
    const contributionEndYearMonth = `${birthY + contributionEndAge}-${String(birthM).padStart(2, '0')}`;

    return {
      scenarioInputs: {
        ...inputs,
        dcIdecoReceiptAge: receiptAge,
        dcJoinedEndYearMonth: contributionEndYearMonth,
        corporateDcJoinEnd: contributionEndYearMonth,
        corporateDcEstimate: roundMoney(projectedTotal * corporateShare),
        idecoEstimate: roundMoney(projectedTotal * (1 - corporateShare)),
      },
      contributionEndAge,
      additionalContributionYears,
      additionalContributions: roundMoney(safeMonthlyContribution * contributionMonths),
      projectedTotal,
      serviceYears: calculateServiceYearsBetween(dcJoinStart, contributionEndYearMonth),
    };
  };

  return candidateAges.map((receiptAge) => {
    const candidateScenario = buildScenarioAtAge(receiptAge, true);
    const retirementEndScenario = buildScenarioAtAge(receiptAge, false);
    const candidateResult = runCompassCalculation(candidateScenario.scenarioInputs);
    const retirementEndResult = runCompassCalculation(retirementEndScenario.scenarioInputs);
    const yearsAfterCompanyRetirement = Math.max(0, receiptAge - inputs.companyRetirementAge);
    const timingRule: DcTimingComparisonResult['timingRule'] =
      receiptAge === inputs.companyRetirementAge
        ? 'same-year'
        : yearsAfterCompanyRetirement <= 19
          ? 'within-19-years'
          : 'outside-19-years';
    const projectedDcIdecoTotal = candidateResult.dcIdecoTotal;
    const sameYear = candidateResult.lumpSumScenario.sameYearReceipt;
    const applicableDeduction = sameYear
      ? candidateResult.combinedAdjustedDeduction
      : candidateResult.dcIdecoAdjustedDeduction;
    const retirementEndApplicableDeduction = retirementEndResult.lumpSumScenario.sameYearReceipt
      ? retirementEndResult.combinedAdjustedDeduction
      : retirementEndResult.dcIdecoAdjustedDeduction;
    const configuredEndYearMonth = resolveDcJoinEndYearMonth(inputs);
    const candidateEndYearMonth = `${birthY + candidateScenario.contributionEndAge}-${String(birthM).padStart(2, '0')}`;
    const inputTotalMatches = Math.abs(currentDcTotal - projectedDcIdecoTotal) < 0.01;

    return {
      receiptAge,
      yearsAfterCompanyRetirement,
      contributionEndAge: candidateScenario.contributionEndAge,
      additionalContributionYears: candidateScenario.additionalContributionYears,
      additionalContributions: candidateScenario.additionalContributions,
      serviceYears: candidateScenario.serviceYears,
      serviceYearsIncrease: Math.max(
        0,
        candidateScenario.serviceYears - retirementEndServiceYears
      ),
      projectedDcIdecoTotal,
      timingRule,
      timingRuleLabel: timingRule === 'same-year'
        ? '同年分として合算'
        : timingRule === 'within-19-years'
          ? '19年ルールの確認対象'
          : '19年の確認期間外',
      deductionLabel: sameYear ? '同年分の合算控除額' : 'DC一時金の調整後控除額',
      applicableDeduction,
      deductionIncreaseFromRetirementEnd: Math.max(
        0,
        roundMoney(applicableDeduction - retirementEndApplicableDeduction)
      ),
      taxableRetirementIncome: candidateResult.lumpSumScenario.taxableIncome,
      estimatedTax: candidateResult.lumpSumScenario.estimatedTax,
      estimatedTaxWithoutContinuation: retirementEndResult.lumpSumScenario.estimatedTax,
      taxDifferenceFromRetirementEnd: roundMoney(
        candidateResult.lumpSumScenario.estimatedTax
          - retirementEndResult.lumpSumScenario.estimatedTax
      ),
      totalNetAmount: candidateResult.lumpSumScenario.netAmount,
      differenceFromRetirementEnd: roundMoney(
        candidateResult.lumpSumScenario.netAmount
          - retirementEndResult.lumpSumScenario.netAmount
      ),
      isSelected:
        receiptAge === selectedAge
        && configuredEndYearMonth === candidateEndYearMonth
        && inputTotalMatches,
    };
  });
}

/**
 * 会社退職時に掛金拠出を終える場合と、入力した加入終了年月まで続ける場合を比較する。
 * 受取を待って運用だけを続ける期間は、この比較の加入年数へ加えない。
 */
export function calculateDcContributionContinuationImpact(
  inputs: CompassInputs
): DcContributionContinuationImpact {
  const [birthY, birthM] = (inputs.birthYearMonth || '').split('-').map(Number);
  const fallbackYearMonth = resolveDcJoinEndYearMonth(inputs);
  const companyRetirementYearMonth =
    Number.isFinite(birthY) && Number.isFinite(birthM)
      ? `${birthY + inputs.companyRetirementAge}-${String(birthM).padStart(2, '0')}`
      : fallbackYearMonth;
  const contributionEndYearMonth = resolveDcJoinEndYearMonth(inputs);
  const joinStart = inputs.dcJoinedYearMonth || inputs.joinedYearMonth;

  const retirementEndInputs: CompassInputs = {
    ...inputs,
    dcJoinedEndYearMonth: companyRetirementYearMonth,
    corporateDcJoinEnd: companyRetirementYearMonth,
  };
  const retirementEndResult = runCompassCalculation(retirementEndInputs);
  const currentResult = runCompassCalculation(inputs);
  const retirementEndServiceYears = calculateServiceYearsBetween(
    joinStart,
    companyRetirementYearMonth
  );
  const currentServiceYears = calculateServiceYearsBetween(
    joinStart,
    contributionEndYearMonth
  );

  return {
    companyRetirementYearMonth,
    contributionEndYearMonth,
    additionalServiceYears: Math.max(0, currentServiceYears - retirementEndServiceYears),
    retirementEndServiceYears,
    currentServiceYears,
    retirementEndOriginalDeduction: retirementEndResult.dcIdecoOriginalDeduction,
    currentOriginalDeduction: currentResult.dcIdecoOriginalDeduction,
    originalDeductionIncrease: Math.max(
      0,
      currentResult.dcIdecoOriginalDeduction - retirementEndResult.dcIdecoOriginalDeduction
    ),
    retirementEndAdjustedDeduction: retirementEndResult.dcIdecoAdjustedDeduction,
    currentAdjustedDeduction: currentResult.dcIdecoAdjustedDeduction,
    adjustedDeductionIncrease: Math.max(
      0,
      currentResult.dcIdecoAdjustedDeduction - retirementEndResult.dcIdecoAdjustedDeduction
    ),
  };
}

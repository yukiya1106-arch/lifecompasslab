/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PastLumpSum {
  id: string;
  name: string; // 名称 (例：前職退職金、前職企業年金、iDeCo一時金)
  receiveYearMonth: string; // 受取年月 (YYYY-MM)
  amount: number; // 受取額 (万円)
  joinStart: string; // 勤続・加入開始年月 (YYYY-MM)
  joinEnd: string; // 勤続・加入終了年月 (YYYY-MM)
  type: 'companyRetirement' | 'corporatePension' | 'corporateDc' | 'ideco' | 'mutualAid' | 'other'; // 種類
}

export interface PastLumpSumAnalysis {
  hasImpact: boolean; // 調整対象かつ重複ありかどうか
  overlapYears: number; // 重複年数
  originalDeduction: number; // 調整前の退職所得控除額 (万円)
  adjustedDeduction: number; // 調整後の退職所得控除額 (万円)
  reductionAmount: number; // 控除額の減少分 (万円)
  statusMessage: string; // 結果画面に表示するメッセージ
  details: {
    id: string;
    name: string;
    overlapYears: number;
    isWithin19Years: boolean;
    adjustmentRule: 'general-5-year' | 'dc-first-10-year' | 'dc-current-20-year' | 'none';
    effectivePastYears: number;
    usedAmountBasedPeriod: boolean;
  }[];
}

export interface CompassInputs {
  // --- まずはここだけ入力 ---
  birthYearMonth: string; // YYYY-MM
  joinedYearMonth: string; // YYYY-MM
  dcJoinedYearMonth: string; // YYYY-MM (DC/iDeCoの通算加入開始年月)
  dcJoinedEndYearMonth: string; // YYYY-MM (DC/iDeCoの通算加入終了年月)
  companyRetirementAge: number; // 会社を退職・退職金を受け取る年齢 (default: 60)
  companyRetirementEstimate: number; // 会社退職金の見込額 (万円)
  corporateDcEstimate: number; // 企業型DCの受取時残高予想 (万円)
  idecoEstimate: number; // iDeCoの受取時残高予想 (万円)
  dcIdecoReceiptAge: number; // DC/iDeCoの受取希望年齢 (default: 65)
  dcIdecoReceiptMethod: 'lumpSum' | 'pension' | 'hybrid' | 'undecided'; // 受取希望方法
  publicPensionEstimate: number; // 公的年金の年間見込額 (万円)
  publicPensionStartAge: number; // 公的年金の受取開始年齢 (default: 65)

  // --- 必要に応じて詳しく入力 ---
  // A. 退職後の働き方
  workAfterRetirement: boolean;
  workUntilAge: number;
  workAnnualSalary: number; // 万円

  // B. 会社退職・支給月
  companyRetirementMonth: number; // 1-12
  companyRetirementPaymentMonth: number; // 1-12

  // C. DC/iDeCoの加入期間 (退職所得控除の計算用、未入力なら入社年月などから自動推定)
  corporateDcJoinStart: string; // YYYY-MM
  corporateDcJoinEnd: string; // YYYY-MM
  idecoJoinStart: string; // YYYY-MM
  idecoJoinEnd: string; // YYYY-MM

  // D. 過去の一時金
  hasPastLumpSum: 'yes' | 'no' | 'unknown';
  pastLumpSums: PastLumpSum[];
}

export interface DcTimingComparisonResult {
  receiptAge: number;
  yearsAfterCompanyRetirement: number;
  contributionEndAge: number;
  additionalContributionYears: number;
  additionalContributions: number;
  serviceYears: number;
  serviceYearsIncrease: number;
  projectedDcIdecoTotal: number;
  timingRule: 'same-year' | 'within-19-years' | 'outside-19-years';
  timingRuleLabel: string;
  deductionLabel: string;
  applicableDeduction: number;
  deductionIncreaseFromRetirementEnd: number;
  taxableRetirementIncome: number;
  estimatedTax: number;
  estimatedTaxWithoutContinuation: number;
  taxDifferenceFromRetirementEnd: number;
  totalNetAmount: number;
  differenceFromRetirementEnd: number;
  isSelected: boolean;
}

export interface DcContributionContinuationImpact {
  companyRetirementYearMonth: string;
  contributionEndYearMonth: string;
  additionalServiceYears: number;
  retirementEndServiceYears: number;
  currentServiceYears: number;
  retirementEndOriginalDeduction: number;
  currentOriginalDeduction: number;
  originalDeductionIncrease: number;
  retirementEndAdjustedDeduction: number;
  currentAdjustedDeduction: number;
  adjustedDeductionIncrease: number;
}

export interface LumpSumScenarioResult {
  dcIdecoLumpSum: number; // DC/iDeCoの一時金受取額 (万円)
  companyRetirement: number; // 会社退職金 (万円)
  totalAmount: number; // 合算額 (万円)
  deductionLimit: number; // 退職所得控除額 (万円)
  sameYearReceipt: boolean;
  companyDeductionLimit: number;
  dcIdecoDeductionLimit: number;
  companyTaxableIncome: number;
  dcIdecoTaxableIncome: number;
  taxableIncome: number; // 控除後の概算課税所得 (万円)
  estimatedTax: number; // 概算税額 (万円)
  netAmount: number; // 概算手取り (万円)
  memo: string;
}

export interface PensionScenarioResult {
  annualPensionAmount: number; // DC/iDeCoの年間受取額 (万円) (e.g. over 10 years)
  pensionYears: number; // 受取期間 (e.g. 10年)
  combinedAnnualAmount: number; // 公的年金との合算年額 (万円)
  pensionDeduction: number; // 公的年金等控除額 (万円)
  rawPensionIncome: number; // 公的年金等控除後の雑所得 (万円)
  socialInsuranceDeduction: number; // 概算社会保険料控除 (万円)
  basicDeduction: number; // 基礎控除 (万円)
  taxablePensionIncome: number; // 控除後の概算課税所得 (万円)
  estimatedTaxAnnual: number; // 概算税額 (年額) (万円)
  netAmountAnnual: number; // 概算手取り (年額) (万円)
  totalNetPayout: number; // 受取年数分の概算手取り累計 (万円)
  companyRetirementNet: number; // 会社退職金の税引後手取り (万円)
  companyRetirementTax: number; // 会社退職金の税額 (万円)
  cumulativeNetWithCompanyRetirement: number; // 会社退職金を含めた10年間の総手取り額 (万円)
  memo: string;
}

export interface HybridScenarioResult {
  lumpSumRatio: number; // 一時金割合 (e.g. 50%)
  pensionRatio: number; // 年金割合 (e.g. 50%)
  
  // 一時金部分
  lumpSumAmount: number;
  totalLumpSumAmount: number; // 会社退職金＋DC/iDeCo一時金部分 (万円)
  excessLumpSum: number; // 一時金の退職所得控除超過分 (万円)
  taxableIncome: number; // 1/2課税所得 (万円)
  estimatedTaxLumpSum: number;
  netLumpSumAmount: number;
  
  // 年金部分
  annualPensionAmount: number;
  combinedAnnualAmount: number; // 公的年金＋DC/iDeCo年額
  pensionDeduction: number; // 公的年金等控除額
  rawPensionIncome: number; // 控除後の雑所得
  socialInsuranceDeduction: number;
  basicDeduction: number;
  taxablePensionIncome: number;
  estimatedTaxPensionAnnual: number;
  netPensionAmountAnnual: number;
  
  // 合計
  firstYearNetTotal: number; // 初年ベースの概算手取り (万円)
  cumulativeNetTotal: number; // 10年間の累計手取り (万円)
  companyRetirementNet: number; // 会社退職金の税引後手取り (万円)
  companyRetirementTax: number; // 会社退職金の税額 (万円)
  cumulativeNetWithCompanyRetirement: number; // 会社退職金を含めた10年間の総手取り額 (万円)
  firstYearNetWithCompanyRetirement: number; // 会社退職金を含めた初年度の手取り総額 (万円)
  memo: string;
}

export interface CompassResults {
  // 退職所得控除
  retirementDeduction: number; // 万円 (合算・調整後、または共通の控除額)
  companyRetirementDeduction: number; // 万円 (会社退職金用の退職所得控除額)
  dcIdecoDeduction: number; // 万円 (DC/iDeCo用の退職所得控除額)
  companyOriginalDeduction: number; // 万円 (会社退職金の重複前の元の控除額)
  companyReductionAmount: number; // 万円 (会社退職金の重複による差し引き額)
  dcIdecoOriginalDeduction: number; // 万円 (DC/iDeCoの重複前の元の控除額)
  dcIdecoAdjustedDeduction: number; // 万円 (DC/iDeCoの重複調整後の控除額)
  dcIdecoReductionAmount: number; // 万円 (DC/iDeCoの重複による差し引き額)
  combinedOriginalDeduction: number; // 万円 (同年に会社退職金とDC/iDeCo一時金を受ける場合の調整前控除額)
  combinedAdjustedDeduction: number; // 万円 (同年受取の重複調整後控除額)
  combinedReductionAmount: number; // 万円 (同年受取の重複による差し引き額)
  // 過去の一時金による調整状況
  pastLumpSumAnalysis: PastLumpSumAnalysis;
  dcIdecoPastLumpSumAnalysis: PastLumpSumAnalysis;
  // 会社退職金の状態
  isCompanyRetirementExcess: boolean;
  companyRetirementExcessAmount: number; // 万円 (控除を超える額、超えなければ0)
  companyRetirementWithinLimit: number; // 万円 (控除内に収まる額)
  
  // DC/iDeCo
  dcIdecoTotal: number; // 万円

  // 整理結果サマリー
  summaryTitle: string;
  summaryText: string;
  keyPoints: string[];

  // シナリオ比較
  lumpSumScenario: LumpSumScenarioResult;
  pensionScenario: PensionScenarioResult;
  hybridScenario: HybridScenarioResult;
}

export interface AppSharedData {
  birthYearMonth?: string;           // 生年月 (YYYY-MM)
  currentAge?: number;              // 現在年齢 (歳)
  retirementAge?: number;           // 退職予定年齢 (歳)
  workUntilAge?: number;            // 何歳まで働く予定か (歳)
  retirementLumpSum?: number;       // 退職金の見込額 (万円)
  corporateDcBalance?: number;      // 企業型DCの受取時残高予想 (万円)
  idecoBalance?: number;            // iDeCoの受取時残高予想 (万円)
  dcStartAge?: number;              // DC/iDeCoの受取開始年齢 (歳)
  dcPayoutType?: 'lump' | 'annuity' | 'both' | 'undecided'; // DC/iDeCoの受取方法
  publicPensionAmount?: number;     // 65歳時点の公的年金見込額 (万円/年)
  pensionStartAge?: number;         // 公的年金の受取開始年齢 (歳)
  pensionEarlyReductionRate?: 0.004 | 0.005; // 60〜64歳の繰上げ減額率（月率）
  otherPensionAmount?: number;      // その他年金収入 (万円/年)
  incomeOtherThanPension?: number; // 年金以外の所得 (万円/年)
  hasSpouse?: boolean;              // 配偶者あり/なし
  spouseCurrentAge?: number;        // 配偶者の現在年齢 (歳)
  spousePensionAmount?: number;     // 配偶者の年金見込額 (万円/年)
  spousePensionStartAge?: number;   // 配偶者の年金受取開始年齢 (歳)
  includeKakyu?: 'none' | 'include' | 'undecided'; // 加給年金を概算に含める
  kakyuAmount?: number;             // 加給年金の概算額 (万円)
  ownerKosei20Years?: 'yes' | 'no' | 'undecided';  // 本人の厚生年金20年以上
  spouseKosei20Years?: 'yes' | 'no' | 'undecided'; // 配偶者の厚生年金20年以上
  financialAssets?: number;         // 現在の金融資産 (万円)
  annualLivingCost?: number;        // 退職後の年間生活費 (万円/年)
  largeDebt?: 'none' | 'large';     // 住居費・ローンの有無

  editedKeys?: Record<string, boolean>; // ユーザーが明示的に編集・入力したキーの記録
}

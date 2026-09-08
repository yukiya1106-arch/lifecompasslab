/**
 * 資産運用計算エンジン (investment.ts)
 * 
 * 積立移転、運用益計算、計画的取り崩し (一括/均等分割/運用しながら分割)、
 * 現預金不足時の臨時取り崩し、およびDC/iDeCo処理を行います。
 */

import { InvestmentPlanInput, DcPlanInput, RecurringInvestmentInput } from '../types/lifeplan';

export interface InvestmentStepInput {
  startCash: number;
  startTaxableAssets: number;
  startRestrictedAssets: number;
  personAge: number;
  netOrdinaryCashflow: number; // 通常家計収支 (定期収入 - 定期支出)
  nonHousingOneOffTransactions: number; // 住宅以外の単発収支 (退職金 + その他一時収入 - その他一時支出)
  housingAssetTransactions: number; // 住宅資産取引 (売却手取り - 購入初期費用)
  withdrawalStartTaxableAgeRecorded?: number | null; // 実際にNISA受取が始まった年齢
  withdrawalStartDcAgeRecorded?: number | null;      // 実際にDC受取が始まった年齢
}

export interface InvestmentStepResult {
  endCash: number;
  endTaxableAssets: number;
  endRestrictedAssets: number;
  
  investmentContributionTransfer: number; // NISA積立額 (現預金->運用資産)
  dcContributionTransfer: number;         // DC拠出額 (現預金->制限資産)
  
  plannedTaxableWithdrawal: number;       // 計画的取り崩し額 (運用資産->現預金)
  emergencyTaxableWithdrawal: number;     // 臨時取り崩し額 (運用資産->現預金)
  dcWithdrawal: number;                    // DC受取額 (制限資産->現預金)
  
  taxableInvestmentGain: number;          // 換金可能資産運用益
  restrictedInvestmentGain: number;       // 受取制限資産運用益
  totalInvestmentGain: number;
  
  unbackedShortfall: number;               // 未補填資金不足 (全資産枯渇後の赤字: 0以上)
}

/**
 * 均等分割取り崩しの定額取り崩し額を求める
 */
export function calculateEqualSplitAnnualPayout(
  balanceAtStart: number,
  years: number
): number {
  if (years <= 0 || balanceAtStart <= 0) return 0;
  return balanceAtStart / years;
}

/**
 * 運用しながら分割取り崩しの年間一定受取額を求める (期首受取型年金現価公式)
 */
export function calculateInvestedSplitAnnualPayout(
  balanceAtStart: number,
  yieldRatePct: number,
  years: number
): number {
  if (years <= 0 || balanceAtStart <= 0) return 0;
  const r = yieldRatePct / 100;
  if (r <= 0) return balanceAtStart / years;

  const ordinaryAnnuity = balanceAtStart * r / (1 - Math.pow(1 + r, -years));
  const annualPayout = ordinaryAnnuity / (1 + r);
  return annualPayout;
}

/**
 * 単年での資産運用・取り崩し・現金充当計算を実行
 */
export function processAnnualInvestmentStep(
  input: InvestmentStepInput,
  plan: InvestmentPlanInput,
  dcPlan: DcPlanInput,
  initialTaxableSnapshotAtWithdrawal: number | null, // 取り崩し開始時のNISA残高スナップショット
  initialDcSnapshotAtWithdrawal: number | null,      // 受取開始時のDC残高スナップショット
  recurringPlans?: RecurringInvestmentInput[]
): InvestmentStepResult {
  const { personAge } = input;

  // P1-1/P1-2: 受取開始年齢以降は積立・拠出しない (contributionEndAge は withdrawalStartAge を上限とする)
  const effectiveTaxableContribEndAge = Math.min(plan.contributionEndAge, plan.withdrawalStartAge);
  const effectiveDcContribEndAge = Math.min(dcPlan.contributionEndAge, dcPlan.withdrawalStartAge);

  // 1. 積立 & 拠出額の計算 (現金 -> 運用資産/制限資産 への内部移転)
  let investmentContributionTransfer = 0;
  if (personAge >= plan.contributionStartAge && personAge < effectiveTaxableContribEndAge) {
    investmentContributionTransfer = plan.monthlyContribution * 12;
  }
  const activePlans = recurringPlans?.filter(p => personAge >= p.contributionStartAge && personAge < Math.min(p.contributionEndAge, plan.withdrawalStartAge));
  if (activePlans) investmentContributionTransfer = activePlans.reduce((sum, p) => sum + p.monthlyContribution * 12, 0);

  let dcContributionTransfer = 0;
  if (personAge < effectiveDcContribEndAge) {
    dcContributionTransfer = dcPlan.monthlyContribution * 12;
  }

  // 2. DC/iDeCoの受取 (DC -> 現金)
  let dcWithdrawal = 0;
  const isDcWithdrawing = personAge >= dcPlan.withdrawalStartAge;

  // 受取初年度かどうか (スナップショット作成直後、あるいは入力で指定した開始年齢到達時)
  const isDcFirstWithdrawalYear = isDcWithdrawing && (initialDcSnapshotAtWithdrawal !== null);
  const actualDcStartAge = input.withdrawalStartDcAgeRecorded ?? (isDcWithdrawing ? Math.max(personAge, dcPlan.withdrawalStartAge) : dcPlan.withdrawalStartAge);

  if (isDcWithdrawing && input.startRestrictedAssets > 0) {
    if (dcPlan.withdrawalType === 'lump_sum') {
      // 過去年齢の場合でも、最初のシミュレーション年で一括受取を行う
      if (personAge === actualDcStartAge || initialDcSnapshotAtWithdrawal === input.startRestrictedAssets) {
        dcWithdrawal = input.startRestrictedAssets + dcContributionTransfer;
      }
    } else { // split
      const snapshot = initialDcSnapshotAtWithdrawal ?? input.startRestrictedAssets;
      const yearsElapsed = personAge - actualDcStartAge;
      if (yearsElapsed >= 0 && yearsElapsed < dcPlan.withdrawalYears) {
        const annualPayout = snapshot / Math.max(1, dcPlan.withdrawalYears);
        dcWithdrawal = Math.min(input.startRestrictedAssets + dcContributionTransfer, annualPayout);
      }
    }
  }

  // DC残高 & DC運用益計算
  const dcAfterContributionAndWithdrawal = Math.max(
    0,
    input.startRestrictedAssets + dcContributionTransfer - dcWithdrawal
  );

  let restrictedInvestmentGain = 0;
  // DC分割受取期間中は運用益を発生させず、受取終了時に残高が0となるように制御
  const dcYearsElapsed = personAge - actualDcStartAge;
  const isDcSplitActive = isDcWithdrawing && dcPlan.withdrawalType === 'split' && dcYearsElapsed < dcPlan.withdrawalYears;

  if (dcAfterContributionAndWithdrawal > 0 && dcPlan.expectedYieldRate > 0 && !isDcSplitActive) {
    restrictedInvestmentGain = dcAfterContributionAndWithdrawal * (dcPlan.expectedYieldRate / 100);
  }
  const endRestrictedAssets = dcAfterContributionAndWithdrawal + restrictedInvestmentGain;

  // 3. 換金可能運用資産 (NISA等) の計画的取り崩し (運用資産 -> 現金)
  let plannedTaxableWithdrawal = 0;
  const isTaxableWithdrawing = personAge >= plan.withdrawalStartAge;
  const actualTaxableStartAge = input.withdrawalStartTaxableAgeRecorded ?? (isTaxableWithdrawing ? Math.max(personAge, plan.withdrawalStartAge) : plan.withdrawalStartAge);

  if (isTaxableWithdrawing && input.startTaxableAssets > 0) {
    if (plan.withdrawalMethod === 'lump_sum') {
      if (personAge === actualTaxableStartAge || initialTaxableSnapshotAtWithdrawal === input.startTaxableAssets) {
        plannedTaxableWithdrawal = input.startTaxableAssets + investmentContributionTransfer;
      }
    } else if (plan.withdrawalMethod === 'equal_split') {
      const snapshot = initialTaxableSnapshotAtWithdrawal ?? input.startTaxableAssets;
      const yearsElapsed = personAge - actualTaxableStartAge;
      if (yearsElapsed >= 0 && yearsElapsed < plan.withdrawalYears) {
        const annualPayout = calculateEqualSplitAnnualPayout(snapshot, Math.max(1, plan.withdrawalYears));
        plannedTaxableWithdrawal = Math.min(input.startTaxableAssets + investmentContributionTransfer, annualPayout);
      }
    } else if (plan.withdrawalMethod === 'invested_split') {
      const snapshot = initialTaxableSnapshotAtWithdrawal ?? input.startTaxableAssets;
      const yearsElapsed = personAge - actualTaxableStartAge;
      if (yearsElapsed >= 0 && yearsElapsed < plan.withdrawalYears) {
        const annualPayout = calculateInvestedSplitAnnualPayout(snapshot, plan.expectedYieldRate, Math.max(1, plan.withdrawalYears));
        plannedTaxableWithdrawal = Math.min(input.startTaxableAssets + investmentContributionTransfer, annualPayout);
      }
    }
  }

  // 4. 現金収支および仮の期末現金の計算
  const tempCash = input.startCash 
    + input.netOrdinaryCashflow 
    + input.nonHousingOneOffTransactions
    + input.housingAssetTransactions 
    + plannedTaxableWithdrawal 
    + dcWithdrawal 
    - investmentContributionTransfer 
    - dcContributionTransfer;

  // 5. 現金不足時の臨時取り崩し (換金可能資産 -> 現金)
  let emergencyTaxableWithdrawal = 0;
  let availableTaxableForEmergency = Math.max(
    0,
    input.startTaxableAssets + investmentContributionTransfer - plannedTaxableWithdrawal
  );

  let endCash = tempCash;
  let unbackedShortfall = 0;

  if (tempCash < 0) {
    const needed = Math.abs(tempCash);
    emergencyTaxableWithdrawal = Math.min(availableTaxableForEmergency, needed);
    endCash = tempCash + emergencyTaxableWithdrawal;

    if (endCash < 0) {
      unbackedShortfall = Math.abs(endCash);
      endCash = 0; // 現預金底つき
    }
  }

  // 6. NISA等の期末残高 & 運用益計算
  const endTaxableBeforeGain = Math.max(
    0,
    input.startTaxableAssets + investmentContributionTransfer - plannedTaxableWithdrawal - emergencyTaxableWithdrawal
  );

  let taxableInvestmentGain = 0;
  // 均等分割取り崩しアクティブ期間（受取年数内）のみ運用益を発生させない
  const taxableYearsElapsed = personAge - actualTaxableStartAge;
  const isEqualSplitActive = isTaxableWithdrawing && plan.withdrawalMethod === 'equal_split' && taxableYearsElapsed < plan.withdrawalYears;

  if (endTaxableBeforeGain > 0 && plan.expectedYieldRate > 0 && !isEqualSplitActive) {
    const weight = input.startTaxableAssets + investmentContributionTransfer;
    const rate = activePlans && weight > 0
      ? (input.startTaxableAssets * plan.expectedYieldRate + activePlans.reduce((sum, p) => sum + p.monthlyContribution * 12 * p.expectedYieldRate, 0)) / weight
      : plan.expectedYieldRate;
    taxableInvestmentGain = endTaxableBeforeGain * (rate / 100);
  }

  const endTaxableAssets = endTaxableBeforeGain + taxableInvestmentGain;
  const totalInvestmentGain = taxableInvestmentGain + restrictedInvestmentGain;

  return {
    endCash,
    endTaxableAssets,
    endRestrictedAssets,
    investmentContributionTransfer,
    dcContributionTransfer,
    plannedTaxableWithdrawal,
    emergencyTaxableWithdrawal,
    dcWithdrawal,
    taxableInvestmentGain,
    restrictedInvestmentGain,
    totalInvestmentGain,
    unbackedShortfall,
  };
}

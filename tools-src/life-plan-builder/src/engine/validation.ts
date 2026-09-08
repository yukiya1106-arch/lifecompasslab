/**
 * 検算・データ整合性エンジン (validation.ts)
 * 
 * 毎年、次の恒等式が成立することを確認します：
 * 期末資産 ＝ 期首資産 ＋ 外部純収支 ＋ 運用益 ＋ 生活資金不足補正
 * (※生活資金不足補正 unbackedShortfall は、現預金が負数から0へ補正されたプラスの金額です)
 * 
 * 許容差: ACCOUNTING_TOLERANCE = 0.0001 (1万円単位で1円以下)
 */

import { AnnualCashflowRow, LifePlanInput } from '../types/lifeplan';
import { recurringPlans } from './capitalPlans';

export const ACCOUNTING_TOLERANCE = 0.0001; // 1万円単位で約1円以下の許容差

export interface ValidationCheckResult {
  isValid: boolean;
  diff: number;
  message?: string;
}

/**
 * 年次キャッシュフローの1行についての検算を実行
 */
export function validateAnnualCashflowRow(row: AnnualCashflowRow): ValidationCheckResult {
  const startTotal = row.startCash + row.startTaxableAssets + row.startRestrictedAssets;
  const externalNet = row.totalExternalNetCashflow ?? row.externalNetCashflow;
  const gains = row.totalInvestmentGain;
  const shortfallCorrection = row.unbackedShortfall;

  // 理論上の期末資産合計: 期首資産 + 外部純収支 + 運用益 + 生活資金不足補正
  const theoreticalEndTotal = startTotal + externalNet + gains + shortfallCorrection;
  const actualEndTotal = row.endTotalAssets;

  const diff = Math.abs(actualEndTotal - theoreticalEndTotal);
  const isValid = diff < ACCOUNTING_TOLERANCE;

  return {
    isValid,
    diff,
    message: isValid
      ? undefined
      : `年次検算不一致: 期首(${startTotal}) + 外部純収支(${externalNet}) + 運用益(${gains}) + 生活資金不足補正(${shortfallCorrection}) = 理論値(${theoreticalEndTotal}) != 実測値(${actualEndTotal}), 差額=${diff}`,
  };
}

/**
 * 入力値に対する全体整合性・警告チェック
 */
export function validateInputWarnings(input: LifePlanInput): string[] {
  const warnings: string[] = [];

  // 1. 額面と手取りの極端な不整合チェック (本人)
  if (input.personIncome.currentGrossIncome > 0 && input.personIncome.currentNetIncome !== undefined) {
    const ratio = input.personIncome.currentNetIncome / input.personIncome.currentGrossIncome;
    if (ratio < 0.5 || ratio > 0.95) {
      warnings.push(`本人の額面年収(${input.personIncome.currentGrossIncome}万円)に対して手取り年収(${input.personIncome.currentNetIncome}万円)の比率(${Math.round(ratio * 100)}%)が極端です。`);
    }
  }

  // 2. 配偶者の額面と手取りの不整合チェック
  if (input.hasSpouse && input.spouseIncome.currentGrossIncome > 0 && input.spouseIncome.currentNetIncome !== undefined) {
    const ratio = input.spouseIncome.currentNetIncome / input.spouseIncome.currentGrossIncome;
    if (ratio < 0.5 || ratio > 0.95) {
      warnings.push(`配偶者の額面年収(${input.spouseIncome.currentGrossIncome}万円)に対して手取り年収(${input.spouseIncome.currentNetIncome}万円)の比率(${Math.round(ratio * 100)}%)が極端です。`);
    }
  }

  // 3. 将来住宅購入の資金調達バランスチェック
  if (input.futureHousing.planType !== 'none') {
    const totalCost = input.futureHousing.propertyPrice;
    const totalFund = input.futureHousing.downPayment + input.futureHousing.loanAmount;
    if (Math.abs(totalCost - totalFund) >= 1) {
      warnings.push(`将来住宅購入の【物件価格(${input.futureHousing.propertyPrice}万)】と【頭金(${input.futureHousing.downPayment}万)＋借入額(${input.futureHousing.loanAmount}万)＝${totalFund}万】が一致していません。`);
    }
  }

  // 4. 積立期間と取り崩し期間の重なりチェック
  const plan = input.investmentPlan;
  for (const row of recurringPlans(input)) {
    if (row.contributionStartAge < plan.withdrawalStartAge && row.contributionEndAge > plan.withdrawalStartAge) {
      warnings.push(`${row.name}の「積立終了年齢(${row.contributionEndAge}歳)」が「取り崩し開始年齢(${plan.withdrawalStartAge}歳)」より後に設定されています。`);
    }
  }

  return warnings;
}

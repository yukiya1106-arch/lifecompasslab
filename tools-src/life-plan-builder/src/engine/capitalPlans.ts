import { CapitalPlanInput, LifePlanInput, RecurringInvestmentInput } from '../types/lifeplan';
import { calculateInvestedSplitAnnualPayout, InvestmentStepInput, processAnnualInvestmentStep } from './investment';

export function recurringPlans(input: LifePlanInput): RecurringInvestmentInput[] {
  return input.investmentPlans?.length ? input.investmentPlans : [{ ...input.investmentPlan, id: 'inv_1', name: '運用1' }];
}

export function aggregateRecurringPlan(input: LifePlanInput) {
  const plans = recurringPlans(input);
  const monthly = plans.reduce((sum, p) => sum + p.monthlyContribution, 0);
  return {
    ...input.investmentPlan,
    monthlyContribution: monthly,
    contributionStartAge: Math.min(...plans.map(p => p.contributionStartAge)),
    contributionEndAge: Math.max(...plans.map(p => p.contributionEndAge)),
    expectedYieldRate: monthly > 0 ? Math.round(plans.reduce((sum, p) => sum + p.monthlyContribution * p.expectedYieldRate, 0) / monthly * 100) / 100 : input.investmentPlan.expectedYieldRate,
  };
}

const finite = (value: unknown, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export function normalizeCapitalPlans(raw: unknown, age: number): CapitalPlanInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(p => p && typeof p === 'object').map((p, i) => ({
    id: String(p.id || `capital_${i + 1}`), name: String(p.name || `一括運用${i + 1}`),
    mode: p.mode === 'withdrawal' ? 'withdrawal' : 'compound',
    source: p.source === 'taxable' ? 'taxable' : 'cash',
    principal: Math.max(0, finite(p.principal, 0)),
    expectedYieldRate: Math.max(0, Math.min(100, finite(p.expectedYieldRate, 0))),
    startAge: Math.max(age, Math.min(120, Math.floor(finite(p.startAge, age)))),
    years: Math.max(1, Math.min(100, Math.floor(finite(p.years, 10)))),
  }));
}

export interface CapitalState { balance: number; funded: boolean; annualPayout: number }
export interface PortfolioState { accounts: CapitalState[]; legacySnapshot: number | null }
export function createPortfolioState(input: LifePlanInput): PortfolioState {
  return { accounts: normalizeCapitalPlans(input.capitalPlans, input.personAge).map(() => ({ balance: 0, funded: false, annualPayout: 0 })), legacySnapshot: null };
}

/** Capital accounts are slices of existing assets, never additional starting wealth. */
export function processPortfolioStep(step: InvestmentStepInput, input: LifePlanInput, state: PortfolioState, dcSnapshot: number | null, events: string[]) {
  const plans = normalizeCapitalPlans(input.capitalPlans, input.personAge);
  const legacy = aggregateRecurringPlan(input);
  const recurring = recurringPlans(input);
  let legacyBalance = Math.max(0, step.startTaxableAssets - state.accounts.reduce((sum, p) => sum + p.balance, 0));
  let cashDelta = 0;
  let transfers = 0;
  let withdrawals = 0;
  const recurringTransfer = recurring.filter(p => step.personAge >= p.contributionStartAge && step.personAge < Math.min(p.contributionEndAge, legacy.withdrawalStartAge)).reduce((sum, p) => sum + p.monthlyContribution * 12, 0);
  const dcTransfer = step.personAge < Math.min(input.dcPlan.contributionEndAge, input.dcPlan.withdrawalStartAge) ? input.dcPlan.monthlyContribution * 12 : 0;
  const availableCash = () => Math.max(0, step.startCash + step.netOrdinaryCashflow + step.nonHousingOneOffTransactions + step.housingAssetTransactions + cashDelta - recurringTransfer - dcTransfer);

  plans.forEach((plan, i) => {
    const account = state.accounts[i]!;
    if (step.personAge < plan.startAge) return;
    if (!account.funded) {
      const available = plan.source === 'cash' ? availableCash() : legacyBalance;
      account.balance = Math.min(plan.principal, available);
      account.funded = true;
      account.annualPayout = calculateInvestedSplitAnnualPayout(account.balance, plan.expectedYieldRate, plan.years);
      if (plan.source === 'cash') { cashDelta -= account.balance; transfers += account.balance; }
      else legacyBalance -= account.balance;
      events.push(`${plan.name}開始`);
      if (account.balance + 0.0001 < plan.principal) events.push(`${plan.name}：元本不足（予定${plan.principal}万円／実行${Math.round(account.balance * 100) / 100}万円）`);
    }
    const elapsed = step.personAge - plan.startAge;
    let payout = 0;
    if (plan.mode === 'compound' && elapsed === plan.years) payout = account.balance;
    if (plan.mode === 'withdrawal' && elapsed < plan.years) {
      payout = elapsed === plan.years - 1 ? account.balance : Math.min(account.balance, account.annualPayout);
    }
    account.balance -= payout;
    cashDelta += payout;
    withdrawals += payout;
    if (payout > 0) events.push(`${plan.name}${plan.mode === 'compound' ? '運用終了' : '取り崩し'}`);
  });

  if (step.personAge >= legacy.withdrawalStartAge && state.legacySnapshot === null) state.legacySnapshot = legacyBalance;
  const result = processAnnualInvestmentStep({ ...step, startCash: step.startCash + cashDelta, startTaxableAssets: legacyBalance,
    withdrawalStartTaxableAgeRecorded: Math.max(input.personAge, legacy.withdrawalStartAge),
    withdrawalStartDcAgeRecorded: Math.max(input.personAge, input.dcPlan.withdrawalStartAge),
  }, legacy, input.dcPlan, state.legacySnapshot, dcSnapshot, recurring);

  // Cover household deficits before applying each account's own annual return.
  let capitalGain = 0;
  plans.forEach((plan, i) => {
    const account = state.accounts[i]!;
    const emergency = Math.min(account.balance, result.unbackedShortfall);
    account.balance -= emergency;
    result.unbackedShortfall -= emergency;
    result.emergencyTaxableWithdrawal += emergency;
    const elapsed = step.personAge - plan.startAge;
    if (account.funded && elapsed >= 0 && elapsed < plan.years) {
      const gain = account.balance * plan.expectedYieldRate / 100;
      capitalGain += gain;
      account.balance += gain;
    }
    result.endTaxableAssets += account.balance;
  });
  result.investmentContributionTransfer += transfers;
  result.plannedTaxableWithdrawal += withdrawals;
  result.taxableInvestmentGain += capitalGain;
  result.totalInvestmentGain += capitalGain;
  return result;
}

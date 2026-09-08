import { describe, it, expect } from 'vitest';
import { defaultLifePlanInput } from '../data/defaultValues';
import { CapitalPlanInput } from '../types/lifeplan';
import { runLifePlanSimulation } from '../engine/cashflow';
import { normalizeLifePlanInput } from '../engine/normalization';
import { calculateInvestedSplitAnnualPayout } from '../engine/investment';

function scenario(plans: Partial<CapitalPlanInput>[] = [{}]) {
  const input = structuredClone(defaultLifePlanInput);
  input.personAge = 40;
  input.hasSpouse = false;
  input.calculationEndAge = 80;
  input.children = [];
  input.personIncome = { ...input.personIncome, currentGrossIncome: 0, currentNetIncome: 0, pensionEstimate: 0, retirementAllowance: 0, otherIncome: 0, incomeChangeEvents: [] };
  input.livingExpenses = { ...input.livingExpenses, monthlyExpense: 0, annualOneOffExpense: 0, insurancePremiumMonthly: 0, inflationRate: 0 };
  input.currentHousing.type = 'family';
  input.futureHousing.planType = 'none';
  input.financialAssets = { currentCash: 1000, currentTaxableAssets: 0, otherAssets: 0 };
  input.investmentPlan = { ...input.investmentPlan, monthlyContribution: 0, expectedYieldRate: 0, withdrawalStartAge: 99 };
  input.dcPlan = { ...input.dcPlan, currentBalance: 0, monthlyContribution: 0 };
  input.oneOffEvents = [];
  input.capitalPlans = plans.map((p, i) => ({ id: `plan_${i}`, name: `Plan ${i}`, mode: 'compound', source: 'cash', principal: 1000, expectedYieldRate: 4, startAge: 40, years: 10, ...p }));
  return input;
}

function simulate(input: ReturnType<typeof scenario>) {
  const result = runLifePlanSimulation(input);
  result.rows.forEach(row => {
    expect(row.calculationCheckDifference).toBeLessThan(0.0001);
    expect(row.endCash).toBeGreaterThanOrEqual(0);
    expect(row.endTaxableAssets).toBeGreaterThanOrEqual(0);
  });
  return result.rows;
}

describe('Capital plans and accounting', () => {
  it('compounds 1000 at 4% for exactly 10 years and returns it to cash once', () => {
    const rows = simulate(scenario());
    expect(rows[0]!.startTotalAssets).toBe(1000);
    expect(rows[0]!.investmentContributionTransfer).toBe(1000);
    expect(rows[9]!.endTaxableAssets).toBeCloseTo(1000 * 1.04 ** 10, 8);
    expect(rows[10]!.endCash).toBeCloseTo(1000 * 1.04 ** 10, 8);
    expect(rows[10]!.endTaxableAssets).toBe(0);
    expect(rows[11]!.plannedTaxableWithdrawal).toBe(0);
  });
  it('withdraws an annuity due for 20 years, then stops with zero residual', () => {
    const rows = simulate(scenario([{ mode: 'withdrawal', years: 20 }]));
    const annual = 1000 * 0.04 / (1 - 1.04 ** -20) / 1.04;
    rows.slice(0, 20).forEach(row => expect(row.plannedTaxableWithdrawal).toBeCloseTo(annual, 7));
    expect(rows[19]!.endTaxableAssets).toBeCloseTo(0, 8);
    expect(rows[20]!.plannedTaxableWithdrawal).toBe(0);
    expect(rows[19]!.endCash).toBeCloseTo(annual * 20, 7);
  });
  it('handles zero yield and one-year withdrawals', () => {
    for (const years of [1, 20]) {
      const rows = simulate(scenario([{ mode: 'withdrawal', expectedYieldRate: 0, years }]));
      expect(rows[0]!.plannedTaxableWithdrawal).toBeCloseTo(1000 / years, 8);
      expect(rows[years - 1]!.endTaxableAssets).toBeCloseTo(0, 8);
      expect(rows[years]!.plannedTaxableWithdrawal).toBe(0);
    }
  });
  it('allocates existing taxable assets without adding wealth or charging cash', () => {
    const input = scenario([{ source: 'taxable' }]);
    input.financialAssets = { currentCash: 0, currentTaxableAssets: 1000, otherAssets: 0 };
    input.investmentPlan.expectedYieldRate = 15;
    const rows = simulate(input);
    expect(rows[0]!.startTotalAssets).toBe(1000);
    expect(rows[0]!.endTotalAssets).toBe(1040);
    expect(rows[0]!.investmentContributionTransfer).toBe(0);
  });
  it('keeps separate rates and periods for simultaneous accounts', () => {
    const input = scenario([{ principal: 500, years: 10, expectedYieldRate: 4 }, { principal: 500, years: 5, expectedYieldRate: 2 }]);
    const rows = simulate(input);
    expect(rows[4]!.endTaxableAssets).toBeCloseTo(500 * 1.04 ** 5 + 500 * 1.02 ** 5, 8);
    expect(rows[10]!.endCash).toBeCloseTo(500 * 1.04 ** 10 + 500 * 1.02 ** 5, 8);
  });
  it('starts in a future year and transfers principal only once', () => {
    const rows = simulate(scenario([{ startAge: 45 }]));
    expect(rows[4]!.endCash).toBe(1000);
    expect(rows[5]!.investmentContributionTransfer).toBe(1000);
    expect(rows[6]!.investmentContributionTransfer).toBe(0);
    expect(rows[14]!.endTaxableAssets).toBeCloseTo(1000 * 1.04 ** 10, 8);
  });
  it('limits allocations to available funds and reports the shortage', () => {
    const input = scenario([{ principal: 800 }, { principal: 800 }]);
    const rows = simulate(input);
    expect(rows[0]!.investmentContributionTransfer).toBe(1000);
    expect(rows[0]!.endTotalAssets).toBe(1040);
    expect(rows[0]!.events.join(' ')).toContain('元本不足');
    expect(runLifePlanSimulation(input).warnings.some(w => w.message.includes('元本不足'))).toBe(true);
  });
  it('covers deficits from capital accounts before applying growth', () => {
    const input = scenario([{ source: 'taxable' }]);
    input.financialAssets = { currentCash: 0, currentTaxableAssets: 1000, otherAssets: 0 };
    input.livingExpenses.annualOneOffExpense = 100;
    const rows = simulate(input);
    expect(rows[0]!.emergencyTaxableWithdrawal).toBe(100);
    expect(rows[0]!.endTaxableAssets).toBe(936);
    expect(rows[0]!.unbackedShortfall).toBe(0);
  });
  it('retains multiple recurring plans alongside capital accounts', () => {
    const input = scenario([{ principal: 500 }]);
    input.investmentPlans = [1, 2].map((amount, i) => ({ id: `r${i}`, name: `Recurring ${i}`, monthlyContribution: amount, expectedYieldRate: 3, contributionStartAge: 40, contributionEndAge: 65 }));
    const rows = simulate(input);
    expect(rows[0]!.investmentContributionTransfer).toBe(536);
    expect(rows[0]!.endTaxableAssets).toBeCloseTo(500 * 1.04 + 36 * 1.03, 8);
  });
  it('round-trips JSON and reads legacy single/multiple plan data', () => {
    const input = scenario([{ mode: 'withdrawal', source: 'taxable' }]);
    expect(normalizeLifePlanInput(JSON.parse(JSON.stringify(input))).capitalPlans).toEqual(input.capitalPlans);
    const old = scenario([]);
    delete old.capitalPlans;
    expect(normalizeLifePlanInput(old).capitalPlans).toEqual([]);
    expect(normalizeLifePlanInput(old).investmentPlan).toEqual(old.investmentPlan);
    old.investmentPlans = [{ id: 'saved', name: 'Saved', monthlyContribution: 0, contributionStartAge: 35, contributionEndAge: 65, expectedYieldRate: 0 }];
    expect(normalizeLifePlanInput(old).investmentPlans).toEqual(old.investmentPlans);
  });
  it('deleting capital plans removes their transfers and returns to the baseline', () => {
    const rows = simulate(scenario([]));
    expect(rows[0]!.investmentContributionTransfer).toBe(0);
    expect(rows[10]!.endTotalAssets).toBe(1000);
  });
  it('sanitizes invalid imported capital fields', () => {
    const input = scenario([{ principal: -100, years: 0, expectedYieldRate: Infinity }]);
    const p = normalizeLifePlanInput(input).capitalPlans![0]!;
    expect(p.principal).toBe(0);
    expect(p.years).toBe(1);
    expect(p.expectedYieldRate).toBe(0);
    expect(calculateInvestedSplitAnnualPayout(1000, 0, 20)).toBe(50);
  });
  it('excludes assigned principal from common withdrawal and its preview', () => {
    const input = scenario([{ source: 'taxable', mode: 'withdrawal', years: 20 }]);
    input.financialAssets = { currentCash: 0, currentTaxableAssets: 1500, otherAssets: 0 };
    input.investmentPlan.withdrawalStartAge = 40;
    input.investmentPlan.withdrawalMethod = 'lump_sum';
    const rows = simulate(input);
    expect(runLifePlanSimulation(input).recurringWithdrawalBalance).toBe(500);
    expect(rows[0]!.plannedTaxableWithdrawal).toBeCloseTo(500 + calculateInvestedSplitAnnualPayout(1000, 4, 20), 8);
  });
});

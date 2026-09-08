/**
 * ライフプランシミュレーター JSON正規化・データマイグレーション (normalization.ts)
 */

import { LifePlanInput, ChildInput, IncomeChangeEvent, OneOffEventInput, CURRENT_SCHEMA_VERSION, WorkStyle, PensionType } from '../types/lifeplan';
import { defaultLifePlanInput } from '../data/defaultValues';
import { normalizeCapitalPlans } from './capitalPlans';

/**
 * 働き方に応じた年金加入区分の初期候補を取得する
 */
export function getInitialPensionTypeForWorkStyle(workStyle: WorkStyle): PensionType {
  switch (workStyle) {
    case 'employee':
    case 'public_servant':
      return 'employees_pension';
    case 'self_employed':
    case 'not_working':
      return 'national_pension_only';
    case 'part_time':
    case 'other':
    default:
      return 'unknown';
  }
}

function sanitizeNumber(val: any, defaultVal: number): number {
  if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
    return val;
  }
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && isFinite(parsed)) return parsed;
  }
  return defaultVal;
}

function normalizeChildren(childrenRaw: any): ChildInput[] {
  if (!Array.isArray(childrenRaw)) {
    return defaultLifePlanInput.children.map(c => ({ ...c }));
  }

  return childrenRaw
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const defaultSchool = {
        nursery: 'public' as const,
        kindergarten: 'private' as const,
        elementary: 'public' as const,
        juniorHigh: 'public' as const,
        highSchool: 'public' as const,
        university: 'private' as const,
      };

      const rawSchool = item.schoolType && typeof item.schoolType === 'object' ? item.schoolType : {};

      return {
        id: String(item.id || `child_${index + 1}`),
        name: String(item.name || `第${index + 1}子`),
        currentAge: sanitizeNumber(item.currentAge, 0),
        schoolType: {
          nursery: rawSchool.nursery === 'private' ? 'private' : 'public',
          kindergarten: rawSchool.kindergarten === 'public' ? 'public' : 'private',
          elementary: rawSchool.elementary === 'private' ? 'private' : 'public',
          juniorHigh: rawSchool.juniorHigh === 'private' ? 'private' : 'public',
          highSchool: rawSchool.highSchool === 'private' ? 'private' : 'public',
          university: rawSchool.university === 'public' ? 'public' : 'private',
        },
        universityLivingType: item.universityLivingType === 'away' ? 'away' : 'home',
        customActualAnnualCost: item.customActualAnnualCost !== undefined ? sanitizeNumber(item.customActualAnnualCost, 0) : undefined,
        isFutureChild: Boolean(item.isFutureChild),
        birthInYears: item.birthInYears !== undefined ? sanitizeNumber(item.birthInYears, 0) : undefined,
      };
    });
}

function normalizeIncomeChangeEvents(eventsRaw: any): IncomeChangeEvent[] {
  if (!Array.isArray(eventsRaw)) return [];
  return eventsRaw
    .filter(item => item && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id || `ice_${index + 1}`),
      age: sanitizeNumber(item.age, 40),
      grossAmount: sanitizeNumber(item.grossAmount, 500),
    }));
}

function normalizeFutureRentChanges(changesRaw: any): { id: string; age: number; monthlyRent: number }[] {
  if (!Array.isArray(changesRaw)) return [];
  return changesRaw
    .filter(item => item && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id || `rc_${index + 1}`),
      age: sanitizeNumber(item.age, 40),
      monthlyRent: sanitizeNumber(item.monthlyRent, 10),
    }));
}

function normalizeOneOffEvents(eventsRaw: any): OneOffEventInput[] {
  if (!Array.isArray(eventsRaw)) return [];
  return eventsRaw
    .filter(item => item && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id || `event_${index + 1}`),
      name: String(item.name || 'イベント'),
      age: sanitizeNumber(item.age, 50),
      type: item.type === 'expense' ? 'expense' : 'income',
      amount: sanitizeNumber(item.amount, 0),
    }));
}

function normalizeInsurance(rawInsurance: any, baseInsurance: any): any {
  if (!rawInsurance || typeof rawInsurance !== 'object') {
    return JSON.parse(JSON.stringify(baseInsurance));
  }

  const inputMode = rawInsurance.inputMode === 'detailed' ? 'detailed' : 'simple';

  const rawBenefits = Array.isArray(rawInsurance.deathBenefits) ? rawInsurance.deathBenefits : baseInsurance.deathBenefits;
  const deathBenefits = rawBenefits
    .filter((b: any) => b && typeof b === 'object')
    .map((b: any, idx: number) => ({
      id: String(b.id || `db_${idx + 1}`),
      label: String(b.label || '保障'),
      insuredPerson: b.insuredPerson === 'spouse' ? 'spouse' : 'person',
      benefitType: b.benefitType === 'income' ? 'income' : 'lump_sum',
      lumpSumAmount: sanitizeNumber(b.lumpSumAmount, 0),
      monthlyAmount: sanitizeNumber(b.monthlyAmount, 0),
      coverageEndAge: sanitizeNumber(b.coverageEndAge, 60),
      wholeLife: Boolean(b.wholeLife),
    }));

  const rawScenarios = rawInsurance.protectionScenarios && typeof rawInsurance.protectionScenarios === 'object'
    ? rawInsurance.protectionScenarios
    : baseInsurance.protectionScenarios;

  const normalizeScenario = (rawSc: any, baseSc: any) => ({
    survivorLivingExpenseRate: sanitizeNumber(rawSc?.survivorLivingExpenseRate, baseSc.survivorLivingExpenseRate),
    annualSurvivorBenefit: sanitizeNumber(rawSc?.annualSurvivorBenefit, baseSc.annualSurvivorBenefit),
    survivorBenefitEndAge: sanitizeNumber(rawSc?.survivorBenefitEndAge, baseSc.survivorBenefitEndAge),
    funeralExpense: sanitizeNumber(rawSc?.funeralExpense, baseSc.funeralExpense),
    mortgageCoveredByDanshin: typeof rawSc?.mortgageCoveredByDanshin === 'boolean'
      ? rawSc.mortgageCoveredByDanshin
      : baseSc.mortgageCoveredByDanshin,
    calculationEndAge: sanitizeNumber(rawSc?.calculationEndAge, baseSc.calculationEndAge ?? 65),
    useEstimatedSurvivorBenefit: typeof rawSc?.useEstimatedSurvivorBenefit === 'boolean'
      ? rawSc.useEstimatedSurvivorBenefit
      : (baseSc.useEstimatedSurvivorBenefit ?? true),
  });

  return {
    inputMode,
    deathBenefits,
    protectionScenarios: {
      personDeath: normalizeScenario(rawScenarios?.personDeath, baseInsurance.protectionScenarios.personDeath),
      spouseDeath: normalizeScenario(rawScenarios?.spouseDeath, baseInsurance.protectionScenarios.spouseDeath),
    },
  };
}

/**
 * バージョン別マイグレーション及びスキーマ補正関数
 */
export function migrateLifePlanInput(rawInput: any): LifePlanInput {
  if (!rawInput || typeof rawInput !== 'object') {
    return { ...defaultLifePlanInput, schemaVersion: CURRENT_SCHEMA_VERSION };
  }

  const base = JSON.parse(JSON.stringify(defaultLifePlanInput)) as LifePlanInput;

  // 1. 旧スキーマ対応 (financialAssets.currentRestrictedAssets -> dcPlan.currentBalance)
  let migratedDcCurrentBalance: number | undefined = undefined;

  if (rawInput.financialAssets && typeof rawInput.financialAssets === 'object') {
    const oldRestricted = (rawInput.financialAssets as any).currentRestrictedAssets;
    const hasOldRestricted = typeof oldRestricted === 'number' && !isNaN(oldRestricted) && oldRestricted > 0;
    
    const newDcBalance = rawInput.dcPlan && typeof rawInput.dcPlan === 'object' ? rawInput.dcPlan.currentBalance : undefined;
    const hasNewDcBalance = typeof newDcBalance === 'number' && !isNaN(newDcBalance) && newDcBalance > 0;

    if (hasOldRestricted && !hasNewDcBalance) {
      migratedDcCurrentBalance = oldRestricted;
    }
  }

  const dcBalanceVal = migratedDcCurrentBalance !== undefined
    ? migratedDcCurrentBalance
    : sanitizeNumber(rawInput.dcPlan?.currentBalance, base.dcPlan.currentBalance);

  const merged: LifePlanInput = {
    schemaVersion: CURRENT_SCHEMA_VERSION,

    personAge: sanitizeNumber(rawInput.personAge, base.personAge),
    gender: rawInput.gender || base.gender,
    hasSpouse: typeof rawInput.hasSpouse === 'boolean' ? rawInput.hasSpouse : base.hasSpouse,
    spouseAge: sanitizeNumber(rawInput.spouseAge, base.spouseAge),
    calculationEndAge: sanitizeNumber(rawInput.calculationEndAge, base.calculationEndAge),
    children: normalizeChildren(rawInput.children),

    personIncome: {
      ...base.personIncome,
      ...(rawInput.personIncome || {}),
      workStyle: rawInput.personIncome?.workStyle || base.personIncome.workStyle || 'employee',
      pensionType: rawInput.personIncome?.pensionType || base.personIncome.pensionType || 'employees_pension',
      currentGrossIncome: sanitizeNumber(rawInput.personIncome?.currentGrossIncome, base.personIncome.currentGrossIncome),
      currentNetIncome: rawInput.personIncome?.currentNetIncome !== undefined ? sanitizeNumber(rawInput.personIncome.currentNetIncome, base.personIncome.currentNetIncome ?? 0) : undefined,
      retirementAge: sanitizeNumber(rawInput.personIncome?.retirementAge, base.personIncome.retirementAge),
      annualGrowthRate: sanitizeNumber(rawInput.personIncome?.annualGrowthRate, base.personIncome.annualGrowthRate),
      pensionEstimate: sanitizeNumber(rawInput.personIncome?.pensionEstimate, base.personIncome.pensionEstimate),
      pensionStartAge: sanitizeNumber(rawInput.personIncome?.pensionStartAge, base.personIncome.pensionStartAge),
      retirementAllowance: sanitizeNumber(rawInput.personIncome?.retirementAllowance, base.personIncome.retirementAllowance),
      retirementAllowanceAge: sanitizeNumber(rawInput.personIncome?.retirementAllowanceAge, base.personIncome.retirementAllowanceAge),
      otherIncome: sanitizeNumber(rawInput.personIncome?.otherIncome, base.personIncome.otherIncome),
      incomeChangeEvents: normalizeIncomeChangeEvents(rawInput.personIncome?.incomeChangeEvents),
    },

    spouseIncome: {
      ...base.spouseIncome,
      ...(rawInput.spouseIncome || {}),
      workStyle: rawInput.spouseIncome?.workStyle || base.spouseIncome.workStyle || 'employee',
      pensionType: rawInput.spouseIncome?.pensionType || base.spouseIncome.pensionType || 'employees_pension',
      currentGrossIncome: sanitizeNumber(rawInput.spouseIncome?.currentGrossIncome, base.spouseIncome.currentGrossIncome),
      currentNetIncome: rawInput.spouseIncome?.currentNetIncome !== undefined ? sanitizeNumber(rawInput.spouseIncome.currentNetIncome, base.spouseIncome.currentNetIncome ?? 0) : undefined,
      retirementAge: sanitizeNumber(rawInput.spouseIncome?.retirementAge, base.spouseIncome.retirementAge),
      annualGrowthRate: sanitizeNumber(rawInput.spouseIncome?.annualGrowthRate, base.spouseIncome.annualGrowthRate),
      pensionEstimate: sanitizeNumber(rawInput.spouseIncome?.pensionEstimate, base.spouseIncome.pensionEstimate),
      pensionStartAge: sanitizeNumber(rawInput.spouseIncome?.pensionStartAge, base.spouseIncome.pensionStartAge),
      retirementAllowance: sanitizeNumber(rawInput.spouseIncome?.retirementAllowance, base.spouseIncome.retirementAllowance),
      retirementAllowanceAge: sanitizeNumber(rawInput.spouseIncome?.retirementAllowanceAge, base.spouseIncome.retirementAllowanceAge),
      otherIncome: sanitizeNumber(rawInput.spouseIncome?.otherIncome, base.spouseIncome.otherIncome),
      incomeChangeEvents: normalizeIncomeChangeEvents(rawInput.spouseIncome?.incomeChangeEvents),
    },

    livingExpenses: {
      ...base.livingExpenses,
      ...(rawInput.livingExpenses || {}),
      monthlyExpense: sanitizeNumber(rawInput.livingExpenses?.monthlyExpense, base.livingExpenses.monthlyExpense),
      annualOneOffExpense: sanitizeNumber(rawInput.livingExpenses?.annualOneOffExpense, base.livingExpenses.annualOneOffExpense),
      inflationRate: sanitizeNumber(rawInput.livingExpenses?.inflationRate, base.livingExpenses.inflationRate),
      insurancePremiumMonthly: sanitizeNumber(rawInput.livingExpenses?.insurancePremiumMonthly, base.livingExpenses.insurancePremiumMonthly),
      insuranceEndAge: sanitizeNumber(rawInput.livingExpenses?.insuranceEndAge, base.livingExpenses.insuranceEndAge),
    },

    insurance: normalizeInsurance(rawInput.insurance, base.insurance),

    currentHousing: {
      ...base.currentHousing,
      ...(rawInput.currentHousing || {}),
      type: rawInput.currentHousing?.type || base.currentHousing.type,
      rent: {
        ...base.currentHousing.rent,
        ...(rawInput.currentHousing?.rent || {}),
        monthlyRent: sanitizeNumber(rawInput.currentHousing?.rent?.monthlyRent, base.currentHousing.rent.monthlyRent),
        rentEndAge: sanitizeNumber(rawInput.currentHousing?.rent?.rentEndAge, base.currentHousing.rent.rentEndAge),
        futureRentChanges: normalizeFutureRentChanges(rawInput.currentHousing?.rent?.futureRentChanges),
      },
      ownLoan: {
        loanBalance: sanitizeNumber(rawInput.currentHousing?.ownLoan?.loanBalance, base.currentHousing.ownLoan.loanBalance),
        interestRate: sanitizeNumber(rawInput.currentHousing?.ownLoan?.interestRate, base.currentHousing.ownLoan.interestRate),
        remainingYears: sanitizeNumber(rawInput.currentHousing?.ownLoan?.remainingYears, base.currentHousing.ownLoan.remainingYears),
        managementFeeMonthly: sanitizeNumber(rawInput.currentHousing?.ownLoan?.managementFeeMonthly, base.currentHousing.ownLoan.managementFeeMonthly),
        propertyTaxAnnual: sanitizeNumber(rawInput.currentHousing?.ownLoan?.propertyTaxAnnual, base.currentHousing.ownLoan.propertyTaxAnnual),
      },
      ownNoLoan: {
        ...base.currentHousing.ownNoLoan,
        ...(rawInput.currentHousing?.ownNoLoan || {}),
        managementFeeMonthly: sanitizeNumber(rawInput.currentHousing?.ownNoLoan?.managementFeeMonthly, base.currentHousing.ownNoLoan.managementFeeMonthly),
        propertyTaxAnnual: sanitizeNumber(rawInput.currentHousing?.ownNoLoan?.propertyTaxAnnual, base.currentHousing.ownNoLoan.propertyTaxAnnual),
      },
    },

    futureHousing: {
      ...base.futureHousing,
      ...(rawInput.futureHousing || {}),
      planType: rawInput.futureHousing?.planType || base.futureHousing.planType,
      purchaseAge: sanitizeNumber(rawInput.futureHousing?.purchaseAge, base.futureHousing.purchaseAge),
      propertyPrice: sanitizeNumber(rawInput.futureHousing?.propertyPrice, base.futureHousing.propertyPrice),
      downPayment: sanitizeNumber(rawInput.futureHousing?.downPayment, base.futureHousing.downPayment),
      purchaseExpenses: sanitizeNumber(rawInput.futureHousing?.purchaseExpenses, base.futureHousing.purchaseExpenses),
      loanAmount: sanitizeNumber(rawInput.futureHousing?.loanAmount, base.futureHousing.loanAmount),
      interestRate: sanitizeNumber(rawInput.futureHousing?.interestRate, base.futureHousing.interestRate),
      loanTermYears: sanitizeNumber(rawInput.futureHousing?.loanTermYears, base.futureHousing.loanTermYears),
      postPurchaseManagementFeeMonthly: sanitizeNumber(rawInput.futureHousing?.postPurchaseManagementFeeMonthly, base.futureHousing.postPurchaseManagementFeeMonthly),
      postPurchasePropertyTaxAnnual: sanitizeNumber(rawInput.futureHousing?.postPurchasePropertyTaxAnnual, base.futureHousing.postPurchasePropertyTaxAnnual),
      sellCurrentHousing: rawInput.futureHousing?.sellCurrentHousing || base.futureHousing.sellCurrentHousing,
      expectedSalePrice: sanitizeNumber(rawInput.futureHousing?.expectedSalePrice, base.futureHousing.expectedSalePrice),
      saleExpenseRate: sanitizeNumber(rawInput.futureHousing?.saleExpenseRate, base.futureHousing.saleExpenseRate),
    },

    financialAssets: {
      ...base.financialAssets,
      ...(rawInput.financialAssets || {}),
      currentCash: sanitizeNumber(rawInput.financialAssets?.currentCash, base.financialAssets.currentCash),
      currentTaxableAssets: sanitizeNumber(rawInput.financialAssets?.currentTaxableAssets, base.financialAssets.currentTaxableAssets),
      otherAssets: sanitizeNumber(rawInput.financialAssets?.otherAssets, base.financialAssets.otherAssets),
    },

    investmentPlan: {
      ...base.investmentPlan,
      ...(rawInput.investmentPlan || {}),
      monthlyContribution: sanitizeNumber(rawInput.investmentPlan?.monthlyContribution, base.investmentPlan.monthlyContribution),
      contributionStartAge: sanitizeNumber(rawInput.investmentPlan?.contributionStartAge, base.investmentPlan.contributionStartAge),
      contributionEndAge: sanitizeNumber(rawInput.investmentPlan?.contributionEndAge, base.investmentPlan.contributionEndAge),
      expectedYieldRate: sanitizeNumber(rawInput.investmentPlan?.expectedYieldRate, base.investmentPlan.expectedYieldRate),
      withdrawalStartAge: sanitizeNumber(rawInput.investmentPlan?.withdrawalStartAge, base.investmentPlan.withdrawalStartAge),
      withdrawalMethod: rawInput.investmentPlan?.withdrawalMethod || base.investmentPlan.withdrawalMethod,
      withdrawalYears: sanitizeNumber(rawInput.investmentPlan?.withdrawalYears, base.investmentPlan.withdrawalYears),
    },

    investmentPlans: Array.isArray(rawInput.investmentPlans) && rawInput.investmentPlans.length > 0
      ? rawInput.investmentPlans.filter((p: any) => p && typeof p === 'object').map((p: any, i: number) => ({
          id: String(p.id || `inv_${i + 1}`), name: String(p.name || `運用${i + 1}`),
          monthlyContribution: Math.max(0, sanitizeNumber(p.monthlyContribution, 0)),
          contributionStartAge: sanitizeNumber(p.contributionStartAge, base.investmentPlan.contributionStartAge),
          contributionEndAge: sanitizeNumber(p.contributionEndAge, base.investmentPlan.contributionEndAge),
          expectedYieldRate: Math.max(0, sanitizeNumber(p.expectedYieldRate, 0)),
        })) : undefined,
    capitalPlans: normalizeCapitalPlans(rawInput.capitalPlans, sanitizeNumber(rawInput.personAge, base.personAge)),

    dcPlan: {
      ...base.dcPlan,
      ...(rawInput.dcPlan || {}),
      currentBalance: dcBalanceVal,
      monthlyContribution: sanitizeNumber(rawInput.dcPlan?.monthlyContribution, base.dcPlan.monthlyContribution),
      contributionEndAge: sanitizeNumber(rawInput.dcPlan?.contributionEndAge, base.dcPlan.contributionEndAge),
      expectedYieldRate: sanitizeNumber(rawInput.dcPlan?.expectedYieldRate, base.dcPlan.expectedYieldRate),
      withdrawalStartAge: sanitizeNumber(rawInput.dcPlan?.withdrawalStartAge, base.dcPlan.withdrawalStartAge),
      withdrawalType: rawInput.dcPlan?.withdrawalType || base.dcPlan.withdrawalType,
      withdrawalYears: sanitizeNumber(rawInput.dcPlan?.withdrawalYears, base.dcPlan.withdrawalYears),
    },

    oneOffEvents: normalizeOneOffEvents(rawInput.oneOffEvents),
  };

  return merged;
}

export function normalizeLifePlanInput(input?: Partial<LifePlanInput> | null): LifePlanInput {
  return migrateLifePlanInput(input);
}

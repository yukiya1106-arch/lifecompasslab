export type DcProjectionType = 'lump' | 'annuity' | 'both' | 'undecided';

export interface RetirementProjectionInputs {
  currentAge: number;
  retirementAge: number;
  workUntilAge: number;
  retirementLumpSum: number;
  dcBalance: number;
  publicPensionAmount: number;
  publicPensionStartAge: number;
  pensionEarlyReductionRate: 0.004 | 0.005;
  financialAssets: number;
  annualLivingCost: number;
  hasSpouse: boolean;
  largeDebt: 'none' | 'large';
  spouseCurrentAge: number;
  spousePensionAmount: number;
  spousePensionStartAge: number;
  includeKakyu: 'none' | 'include' | 'undecided';
  kakyuAmount: number;
  ownerKosei20Years: 'yes' | 'no' | 'undecided';
  spouseKosei20Years: 'yes' | 'no' | 'undecided';
  reemploymentIncome: number;
  corporatePensionAmount: number;
  otherIncome: number;
  dcPayoutType: DcProjectionType;
  dcStartAge: number;
  investmentYield: number;
  inflationRate: number;
  houseRepairActive: boolean;
  houseRepairAge: number;
  houseRepairAmount: number;
  carActive: boolean;
  carAge: number;
  carAmount: number;
  medicalActive: boolean;
  medicalAge: number;
  medicalAmount: number;
  supportActive: boolean;
  supportAge: number;
  supportAmount: number;
  otherActive: boolean;
  otherAge: number;
  otherAmount: number;
}

export interface DcProjectionScenario {
  type: DcProjectionType;
  startAge: number;
}

export interface AnnualFlow {
  age: number;
  salaryIncome: number;
  retirementLumpSum: number;
  publicPension: number;
  corporatePension: number;
  dcIncome: number;
  otherIncome: number;
  totalIncome: number;
  livingCost: number;
  largeExpense: number;
  debtExpense: number;
  totalExpense: number;
  netCashFlow: number;
  endOfYearAsset: number;
  memo: string;
}

interface AnnualIncome {
  salaryIncome: number;
  retirementLumpSum: number;
  publicPension: number;
  corporatePension: number;
  dcIncome: number;
  otherIncome: number;
  totalIncome: number;
  memo: string;
}

interface AnnualExpense {
  livingCost: number;
  largeExpense: number;
  debtExpense: number;
  totalExpense: number;
}

export function calculatePensionAdjustmentRate(
  startAge: number,
  earlyReductionRate: 0.004 | 0.005
): number {
  const normalizedAge = Math.min(75, Math.max(60, Math.round(startAge)));
  if (normalizedAge >= 65) {
    return 1 + (normalizedAge - 65) * 12 * 0.007;
  }
  return 1 - (65 - normalizedAge) * 12 * earlyReductionRate;
}

export function calculateAdjustedPublicPension(
  inputs: RetirementProjectionInputs
): number {
  return inputs.publicPensionAmount * calculatePensionAdjustmentRate(
    inputs.publicPensionStartAge,
    inputs.pensionEarlyReductionRate
  );
}

function formatManYen(value: number): string {
  return `${Math.round(value).toLocaleString()}万円`;
}

export function calculateAnnualIncome(
  age: number,
  inputs: RetirementProjectionInputs,
  dcScenario: DcProjectionScenario
): AnnualIncome {
  let salaryIncome = 0;
  let publicPension = 0;
  let corporatePension = 0;
  let dcIncome = 0;
  let otherIncome = 0;
  const memoParts: string[] = [];

  if (age >= inputs.retirementAge && age < inputs.workUntilAge) {
    salaryIncome = inputs.reemploymentIncome;
    memoParts.push('再雇用収入');
  }

  const retirementLumpSum = age === inputs.retirementAge
    ? inputs.retirementLumpSum
    : 0;
  if (retirementLumpSum > 0) memoParts.push('退職金受給');

  if (age >= inputs.publicPensionStartAge) {
    publicPension = calculateAdjustedPublicPension(inputs);
    if (age === inputs.publicPensionStartAge) memoParts.push('公的年金受給開始');
  }

  if (inputs.hasSpouse) {
    const ageDifference = inputs.currentAge - inputs.spouseCurrentAge;
    const spouseAge = age - ageDifference;

    if (spouseAge >= inputs.spousePensionStartAge) {
      publicPension += inputs.spousePensionAmount;
      if (spouseAge === inputs.spousePensionStartAge) {
        memoParts.push('配偶者年金受取開始');
      }
    }

    if (
      inputs.includeKakyu === 'include'
      && age >= inputs.publicPensionStartAge
      && spouseAge < 65
    ) {
      publicPension += inputs.kakyuAmount;
      if (age === inputs.publicPensionStartAge || spouseAge === 64) {
        memoParts.push('加給年金加算');
      }
    }
  }

  if (age >= inputs.retirementAge) {
    corporatePension = inputs.corporatePensionAmount;
    otherIncome = inputs.otherIncome;
  }

  if (dcScenario.type === 'lump') {
    if (age === dcScenario.startAge) {
      dcIncome = inputs.dcBalance;
      memoParts.push('DC一時金受領');
    }
  } else if (dcScenario.type === 'annuity' || dcScenario.type === 'undecided') {
    if (age >= dcScenario.startAge && age < dcScenario.startAge + 10) {
      dcIncome = inputs.dcBalance / 10;
      if (age === dcScenario.startAge) memoParts.push('DC年金受給開始');
    }
  } else if (dcScenario.type === 'both') {
    if (age === dcScenario.startAge) {
      dcIncome += inputs.dcBalance * 0.5;
      memoParts.push('DC一時金受領（50%）');
    }
    if (age >= dcScenario.startAge && age < dcScenario.startAge + 10) {
      dcIncome += (inputs.dcBalance * 0.5) / 10;
      if (age === dcScenario.startAge) memoParts.push('DC年金受給開始（50%）');
    }
  }

  const totalIncome = salaryIncome
    + retirementLumpSum
    + publicPension
    + corporatePension
    + dcIncome
    + otherIncome;

  return {
    salaryIncome,
    retirementLumpSum,
    publicPension,
    corporatePension,
    dcIncome,
    otherIncome,
    totalIncome,
    memo: memoParts.join(' / '),
  };
}

export function calculateAnnualExpense(
  age: number,
  inputs: RetirementProjectionInputs
): AnnualExpense {
  let livingCost = 0;
  let largeExpense = 0;
  let debtExpense = 0;

  if (age >= inputs.retirementAge) {
    livingCost = inputs.annualLivingCost;
    if (inputs.inflationRate > 0) {
      const yearsElapsed = age - inputs.retirementAge;
      livingCost *= Math.pow(1 + inputs.inflationRate / 100, yearsElapsed);
    }
  }

  if (inputs.largeDebt === 'large' && age >= inputs.retirementAge && age <= 75) {
    debtExpense = 100;
  }

  if (inputs.houseRepairActive && age === inputs.houseRepairAge) {
    largeExpense += inputs.houseRepairAmount;
  }
  if (inputs.carActive && age === inputs.carAge) {
    largeExpense += inputs.carAmount;
  }
  if (inputs.medicalActive && age === inputs.medicalAge) {
    largeExpense += inputs.medicalAmount;
  }
  if (inputs.supportActive && age === inputs.supportAge) {
    largeExpense += inputs.supportAmount;
  }
  if (inputs.otherActive && age === inputs.otherAge) {
    largeExpense += inputs.otherAmount;
  }

  return {
    livingCost,
    largeExpense,
    debtExpense,
    totalExpense: livingCost + largeExpense + debtExpense,
  };
}

export function calculateRetirementTrajectory(
  inputs: RetirementProjectionInputs,
  dcScenario: DcProjectionScenario
): AnnualFlow[] {
  const trajectory: AnnualFlow[] = [];
  let currentAsset = inputs.financialAssets;

  for (let age = inputs.currentAge; age <= 100; age++) {
    if (
      age > inputs.currentAge
      && currentAsset > 0
      && inputs.investmentYield > 0
    ) {
      currentAsset *= 1 + inputs.investmentYield / 100;
    }

    const income = calculateAnnualIncome(age, inputs, dcScenario);
    const expense = calculateAnnualExpense(age, inputs);
    let salaryIncome = income.salaryIncome;
    let livingCost = expense.livingCost;
    let totalIncome = income.totalIncome;
    let totalExpense = expense.totalExpense;

    if (age < inputs.retirementAge) {
      salaryIncome = 0;
      livingCost = 0;
      totalIncome = income.retirementLumpSum
        + income.publicPension
        + income.corporatePension
        + income.dcIncome
        + income.otherIncome;
      totalExpense = expense.largeExpense;
    }

    const netCashFlow = totalIncome - totalExpense;
    currentAsset += netCashFlow;

    const memoParts = income.memo ? [income.memo] : [];
    if (age < inputs.retirementAge) {
      memoParts.push('現役期間（給与・生活費は収支均衡として計算対象外）');
    }
    if (expense.largeExpense > 0) {
      const expenseLabels: string[] = [];
      if (inputs.houseRepairActive && age === inputs.houseRepairAge) expenseLabels.push('住宅修繕');
      if (inputs.carActive && age === inputs.carAge) expenseLabels.push('車の購入');
      if (inputs.medicalActive && age === inputs.medicalAge) expenseLabels.push('医療・介護');
      if (inputs.supportActive && age === inputs.supportAge) expenseLabels.push('家族援助');
      if (inputs.otherActive && age === inputs.otherAge) expenseLabels.push('特別支出');
      memoParts.push(`${expenseLabels.join('、')}（${formatManYen(expense.largeExpense)}）`);
    }
    if (inputs.largeDebt === 'large' && age === inputs.retirementAge) {
      memoParts.push('ローン負担あり');
    }

    trajectory.push({
      age,
      salaryIncome,
      retirementLumpSum: income.retirementLumpSum,
      publicPension: income.publicPension,
      corporatePension: income.corporatePension,
      dcIncome: income.dcIncome,
      otherIncome: income.otherIncome,
      totalIncome,
      livingCost,
      largeExpense: expense.largeExpense,
      debtExpense: expense.debtExpense,
      totalExpense,
      netCashFlow,
      endOfYearAsset: currentAsset,
      memo: memoParts.join(' / '),
    });
  }

  return trajectory;
}

export function findAssetZeroAge(trajectory: AnnualFlow[]): number | null {
  return trajectory.find((flow) => flow.endOfYearAsset < 0)?.age ?? null;
}

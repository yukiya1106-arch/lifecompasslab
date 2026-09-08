/**
 * ライフプランシミュレーター 初期入力値
 */

import { LifePlanInput, CURRENT_SCHEMA_VERSION } from '../types/lifeplan';

export const defaultLifePlanInput: LifePlanInput = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  // STEP 1: 基本情報
  personAge: 35,
  gender: 'male',
  hasSpouse: true,
  spouseAge: 33,
  calculationEndAge: 85,
  children: [
    {
      id: 'child_1',
      name: '第1子',
      currentAge: 3,
      schoolType: {
        nursery: 'public',
        kindergarten: 'private',
        elementary: 'public',
        juniorHigh: 'public',
        highSchool: 'public',
        university: 'private',
      },
      universityLivingType: 'home',
      isFutureChild: false,
    },
  ],

  // STEP 2: 収入・働き方
  personIncome: {
    workStyle: 'employee',
    pensionType: 'employees_pension',
    currentGrossIncome: 600,   // 額面600万円
    currentNetIncome: 470,     // 手取り470万円
    retirementAge: 65,
    annualGrowthRate: 1.0,     // 年1%昇給
    incomeChangeEvents: [
      { id: 'ice_1', age: 50, grossAmount: 750 }, // 50歳から750万円
    ],
    pensionEstimate: 200,      // 65歳から200万円/年
    pensionStartAge: 65,
    retirementAllowance: 1500, // 65歳で1500万円
    retirementAllowanceAge: 65,
    otherIncome: 0,
  },
  spouseIncome: {
    workStyle: 'employee',
    pensionType: 'employees_pension',
    currentGrossIncome: 200,   // 額面200万円
    currentNetIncome: 170,     // 手取り170万円
    retirementAge: 60,
    annualGrowthRate: 0.5,
    incomeChangeEvents: [],
    pensionEstimate: 100,      // 65歳から100万円/年
    pensionStartAge: 65,
    retirementAllowance: 300,
    retirementAllowanceAge: 60,
    otherIncome: 0,
  },

  // STEP 3: 生活費・物価・保険
  livingExpenses: {
    monthlyExpense: 25,        // 月25万円 (年間300万円)
    annualOneOffExpense: 20,   // 年間臨時支出20万円
    inflationRate: 1.0,        // インフレ率年1.0%
    insurancePremiumMonthly: 2,// 保険料月2万円
    insuranceEndAge: 65,
  },
  insurance: {
    inputMode: 'simple',
    deathBenefits: [
      {
        id: 'db_person_1',
        label: '本人の死亡保障',
        insuredPerson: 'person',
        benefitType: 'lump_sum',
        lumpSumAmount: 0,
        monthlyAmount: 0,
        coverageEndAge: 60,
        wholeLife: false,
      },
      {
        id: 'db_spouse_1',
        label: '配偶者の死亡保障',
        insuredPerson: 'spouse',
        benefitType: 'lump_sum',
        lumpSumAmount: 0,
        monthlyAmount: 0,
        coverageEndAge: 60,
        wholeLife: false,
      },
    ],
    protectionScenarios: {
      personDeath: {
        survivorLivingExpenseRate: 70,
        annualSurvivorBenefit: 0,
        survivorBenefitEndAge: 65,
        funeralExpense: 300,
        mortgageCoveredByDanshin: false,
        calculationEndAge: 65,
        useEstimatedSurvivorBenefit: true,
      },
      spouseDeath: {
        survivorLivingExpenseRate: 70,
        annualSurvivorBenefit: 0,
        survivorBenefitEndAge: 65,
        funeralExpense: 300,
        mortgageCoveredByDanshin: false,
        calculationEndAge: 65,
        useEstimatedSurvivorBenefit: true,
      },
    },
  },

  // STEP 5: 現在の住まい (賃貸)
  currentHousing: {
    type: 'rent',
    rent: {
      monthlyRent: 10,         // 月10万円
      rentEndAge: 40,          // 40歳で住宅購入して退去予定
      futureRentChanges: [],
    },
    ownLoan: {
      loanBalance: 3000,
      interestRate: 1.2,
      remainingYears: 25,
      managementFeeMonthly: 2.5,
      propertyTaxAnnual: 12,
    },
    ownNoLoan: {
      managementFeeMonthly: 2.0,
      propertyTaxAnnual: 10,
    },
  },

  // STEP 6: 将来の住宅購入・住み替え
  futureHousing: {
    planType: 'purchase',
    purchaseAge: 40,           // 40歳で購入
    propertyPrice: 4000,       // 4000万円
    downPayment: 500,          // 頭金500万円
    purchaseExpenses: 200,     // 諸費用200万円
    loanAmount: 3500,          // 借入3500万円 (住宅価格4000万円 - 頭金500万円)
    interestRate: 1.2,         // 1.2%
    loanTermYears: 30,         // 30年返済
    postPurchaseManagementFeeMonthly: 2.5, // 管理費月2.5万円
    postPurchasePropertyTaxAnnual: 15,     // 固定資産税年15万円
    sellCurrentHousing: 'keep',
    expectedSalePrice: 0,
    saleExpenseRate: 3.3,
  },

  // STEP 7: 金融資産 (現在時点)
  financialAssets: {
    currentCash: 500,          // 現預金500万円
    currentTaxableAssets: 200, // NISA等200万円
    otherAssets: 0,            // その他換金可能資産
  },

  // STEP 8: 資産運用
  investmentPlan: {
    monthlyContribution: 3,    // 月3万円NISA積立
    contributionStartAge: 35,  // 35歳から
    contributionEndAge: 65,    // 65歳まで
    expectedYieldRate: 3.0,     // 年3%運用
    withdrawalStartAge: 65,    // 65歳から取り崩し
    withdrawalMethod: 'invested_split', // 運用しながら分割取り崩し
    withdrawalYears: 20,       // 20年間で取り崩し
  },

  // STEP 9: DC・iDeCo
  dcPlan: {
    currentBalance: 100,
    monthlyContribution: 2,    // 月2万円
    contributionEndAge: 60,
    expectedYieldRate: 3.0,
    withdrawalStartAge: 60,
    withdrawalType: 'split',
    withdrawalYears: 20,
  },

  // STEP 10: 一時収支
  oneOffEvents: [
    {
      id: 'event_1',
      name: '車買い替え',
      age: 45,
      type: 'expense',
      amount: 300,             // 300万円支出
    },
    {
      id: 'event_2',
      name: '車買い替え',
      age: 55,
      type: 'expense',
      amount: 300,
    },
  ],
};

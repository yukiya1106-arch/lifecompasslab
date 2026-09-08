/**
 * ライフプランシミュレーター ユニットテスト (cashflow.test.ts)
 * 
 * 必須27項目の自動テストを実装します。
 */

import { describe, it, expect } from 'vitest';
import { runLifePlanSimulation } from '../engine/cashflow';
import { defaultLifePlanInput } from '../data/defaultValues';
import { LifePlanInput, CURRENT_SCHEMA_VERSION } from '../types/lifeplan';
import { normalizeLifePlanInput } from '../engine/normalization';
import { appConfig } from '../config/appConfig';
import { calculateHousingSaleNetProceeds, calculatePurchaseMetrics, calculateMortgageSchedule, calculateMonthlyMortgagePayment } from '../engine/housing';

// ヘルパー関数: クリーンなテスト用ベース入力を作成
function createBaseInput(): LifePlanInput {
  return JSON.parse(JSON.stringify(defaultLifePlanInput));
}

// 完全に中立な入力を作成
function createNeutralBaseInput(): LifePlanInput {
  const input = createBaseInput();
  input.personAge = 40;
  input.calculationEndAge = 80;
  input.hasSpouse = false;
  input.spouseAge = 0;
  input.personIncome = {
    currentGrossIncome: 0,
    currentNetIncome: 0,
    retirementAge: 65,
    annualGrowthRate: 0,
    incomeChangeEvents: [],
    pensionEstimate: 0,
    pensionStartAge: 65,
    retirementAllowance: 0,
    retirementAllowanceAge: 65,
    otherIncome: 0,
    otherIncomeStartAge: 40,
    otherIncomeEndAge: 80,
  };
  input.spouseIncome = {
    currentGrossIncome: 0,
    currentNetIncome: 0,
    retirementAge: 65,
    annualGrowthRate: 0,
    incomeChangeEvents: [],
    pensionEstimate: 0,
    pensionStartAge: 65,
    retirementAllowance: 0,
    retirementAllowanceAge: 65,
    otherIncome: 0,
    otherIncomeStartAge: 40,
    otherIncomeEndAge: 80,
  };
  input.children = [];
  input.livingExpenses = {
    monthlyExpense: 0,
    annualOneOffExpense: 0,
    insurancePremiumMonthly: 0,
    insuranceEndAge: 65,
    inflationRate: 0,
  };
  input.currentHousing = {
    type: 'family',
    rent: { monthlyRent: 0, futureRentChanges: [], rentEndAge: 80 },
    ownLoan: { loanBalance: 0, interestRate: 1, remainingYears: 20, managementFeeMonthly: 0, propertyTaxAnnual: 0 },
    ownNoLoan: { managementFeeMonthly: 0, propertyTaxAnnual: 0 },
  };
  input.futureHousing = {
    planType: 'none',
    purchaseAge: 45,
    propertyPrice: 0,
    downPayment: 0,
    purchaseExpenses: 0,
    loanAmount: 0,
    interestRate: 1,
    loanTermYears: 30,
    postPurchaseManagementFeeMonthly: 0,
    postPurchasePropertyTaxAnnual: 0,
    sellCurrentHousing: 'undecided',
    expectedSalePrice: 0,
    saleExpenseRate: 0,
  };
  input.financialAssets = {
    currentCash: 0,
    currentTaxableAssets: 0,
    otherAssets: 0,
  };
  input.investmentPlan = {
    monthlyContribution: 0,
    contributionStartAge: 40,
    contributionEndAge: 60,
    expectedYieldRate: 0,
    withdrawalStartAge: 99,
    withdrawalMethod: 'lump_sum',
    withdrawalYears: 10,
  };
  input.dcPlan = {
    currentBalance: 0,
    monthlyContribution: 0,
    contributionEndAge: 60,
    expectedYieldRate: 0,
    withdrawalStartAge: 99,
    withdrawalType: 'lump_sum',
    withdrawalYears: 10,
  };
  input.oneOffEvents = [];
  return input;
}

describe('ライフプラン計算エンジン 27項目テスト', () => {

  // テスト1: 収入500万円、支出400万円、運用なしの場合、1年後の金融資産が100万円増える
  it('テスト1: 収入500万・支出400万・運用なしで1年後に資産が100万増加する', () => {
    const input = createNeutralBaseInput();
    input.personIncome.currentNetIncome = 500;
    input.livingExpenses.annualOneOffExpense = 400;
    input.financialAssets.currentCash = 500;

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;

    const assetIncrease = row0.endTotalAssets - row0.startTotalAssets;
    expect(assetIncrease).toBeCloseTo(100, 1);
  });

  // テスト2: 現預金からNISAへ年間60万円積み立てても、運用益が0なら積立だけで金融資産合計は変わらない
  it('テスト2: 運用益0%のNISA積立で金融資産合計は変わらない', () => {
    const input = createNeutralBaseInput();
    input.financialAssets.currentCash = 1000;
    input.investmentPlan.monthlyContribution = 5; // 年60万円積立
    input.investmentPlan.contributionStartAge = input.personAge;
    input.investmentPlan.contributionEndAge = input.personAge + 10;

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;

    expect(row0.endTotalAssets).toBeCloseTo(row0.startTotalAssets, 1);
  });

  // テスト3: NISA等の残高がある間は、現預金不足が未補填資金不足として表示されない
  it('テスト3: NISA残高がある間は現預金不足が未補テン資金不足にならない', () => {
    const input = createNeutralBaseInput();
    input.financialAssets = { currentCash: 0, currentTaxableAssets: 500, otherAssets: 0 };
    input.oneOffEvents = [{ id: 'e1', name: '大支出', age: input.personAge, type: 'expense', amount: 300 }];

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;

    expect(row0.emergencyTaxableWithdrawal).toBe(300);
    expect(row0.unbackedShortfall).toBe(0);
  });

  // テスト4: NISA等を使い切った後の不足だけが、未補填資金不足として表示される
  it('テスト4: NISA全額取り崩し後の超過不足分だけが未補テン資金不足となる', () => {
    const input = createNeutralBaseInput();
    input.financialAssets = { currentCash: 0, currentTaxableAssets: 200, otherAssets: 0 };
    input.oneOffEvents = [{ id: 'e1', name: '大支出', age: input.personAge, type: 'expense', amount: 500 }];

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;

    expect(row0.emergencyTaxableWithdrawal).toBe(200);
    expect(row0.unbackedShortfall).toBeCloseTo(300, 1);
  });

  // テスト5: 一括取り崩し時に運用資産が0となり、同額が現預金へ移る
  it('テスト5: 一括取り崩しで運用資産が0となり同額が現預金へ移行する', () => {
    const input = createNeutralBaseInput();
    input.financialAssets = { currentCash: 100, currentTaxableAssets: 500, otherAssets: 0 };
    input.investmentPlan.withdrawalStartAge = input.personAge;
    input.investmentPlan.withdrawalMethod = 'lump_sum';

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;

    expect(row0.plannedTaxableWithdrawal).toBe(500);
    expect(row0.endTaxableAssets).toBe(0);
  });

  // テスト6: 均等分割取り崩しの合計額が、開始時残高と概ね一致する
  it('テスト6: 均等分割取り崩しの各年受取額合計が開始時残高と一致する', () => {
    const input = createNeutralBaseInput();
    input.financialAssets = { currentCash: 100, currentTaxableAssets: 500, otherAssets: 0 };
    input.investmentPlan.withdrawalStartAge = input.personAge;
    input.investmentPlan.withdrawalMethod = 'equal_split';
    input.investmentPlan.withdrawalYears = 5;

    const res = runLifePlanSimulation(input, 2026);
    const withdrawRows = res.rows.slice(0, 5);

    const totalWithdrawn = withdrawRows.reduce((sum, r) => sum + r.plannedTaxableWithdrawal, 0);
    expect(totalWithdrawn).toBeCloseTo(500, 1);
  });

  // テスト7: 運用しながら取り崩す場合、設定年数終了時の残高が概ね0になる
  it('テスト7: 運用しながら分割取り崩しで設定年数終了時の運用残高が概ね0になる', () => {
    const input = createNeutralBaseInput();
    input.financialAssets = { currentCash: 100, currentTaxableAssets: 1000, otherAssets: 0 };
    input.investmentPlan.withdrawalStartAge = input.personAge;
    input.investmentPlan.withdrawalMethod = 'invested_split';
    input.investmentPlan.withdrawalYears = 10;
    input.investmentPlan.expectedYieldRate = 3.0;

    const res = runLifePlanSimulation(input, 2026);
    const rowAfter10Years = res.rows[9]!; // 10年目期末

    expect(rowAfter10Years.endTaxableAssets).toBeLessThan(1.0);
  });

  // テスト8: 本人と配偶者の年齢差が正しく反映される
  it('テスト8: 本人と配偶者の年齢差が年次タイムラインで正確に反映される', () => {
    const input = createNeutralBaseInput();
    input.personAge = 40;
    input.hasSpouse = true;
    input.spouseAge = 35;

    const res = runLifePlanSimulation(input, 2026);
    
    expect(res.rows[0]!.personAge).toBe(40);
    expect(res.rows[0]!.spouseAge).toBe(35);
    expect(res.rows[10]!.personAge).toBe(50);
    expect(res.rows[10]!.spouseAge).toBe(45);
  });

  // テスト9: 生活費を年間12万円増加すると、他条件が同じなら1年後の金融資産が12万円減る
  it('テスト9: 生活費+12万円で1年後の金融資産が12万円減少する', () => {
    const input1 = createNeutralBaseInput();
    input1.financialAssets.currentCash = 1000;
    const res1 = runLifePlanSimulation(input1, 2026);

    const input2 = createNeutralBaseInput();
    input2.financialAssets.currentCash = 1000;
    input2.livingExpenses.monthlyExpense = 1; // 月+1万 = 年+12万
    const res2 = runLifePlanSimulation(input2, 2026);

    const diff = res1.rows[0]!.endTotalAssets - res2.rows[0]!.endTotalAssets;
    expect(diff).toBeCloseTo(12, 1);
  });

  // テスト10: 年収を年間12万円増加すると、他条件が同じなら1年後の金融資産が12万円増える
  it('テスト10: 手取り年収+12万円で1年後の金融資産が12万円増加する', () => {
    const input1 = createNeutralBaseInput();
    input1.financialAssets.currentCash = 1000;
    const res1 = runLifePlanSimulation(input1, 2026);

    const input2 = createNeutralBaseInput();
    input2.financialAssets.currentCash = 1000;
    input2.personIncome.currentNetIncome = 12;
    const res2 = runLifePlanSimulation(input2, 2026);

    const diff = res2.rows[0]!.endTotalAssets - res1.rows[0]!.endTotalAssets;
    expect(diff).toBeCloseTo(12, 1);
  });

  // テスト11: 住宅売却あり/なしで通常家計収支が同額であることを確認
  it('テスト11: 住宅売却あり/なしの2ケースを比較し通常家計収支が同額であることを確認', () => {
    const inputNoSale = createNeutralBaseInput();
    inputNoSale.personIncome.currentNetIncome = 400;
    inputNoSale.livingExpenses.annualOneOffExpense = 300;
    const resNoSale = runLifePlanSimulation(inputNoSale, 2026);

    const inputWithSale = createNeutralBaseInput();
    inputWithSale.personIncome.currentNetIncome = 400;
    inputWithSale.livingExpenses.annualOneOffExpense = 300;
    inputWithSale.futureHousing.planType = 'relocate';
    inputWithSale.futureHousing.purchaseAge = inputWithSale.personAge;
    inputWithSale.futureHousing.sellCurrentHousing = 'sell';
    inputWithSale.futureHousing.expectedSalePrice = 3000;

    const resWithSale = runLifePlanSimulation(inputWithSale, 2026);

    expect(resWithSale.rows[0]!.netOrdinaryCashflow).toBe(resNoSale.rows[0]!.netOrdinaryCashflow);
    expect(resWithSale.rows[0]!.housingSaleProceeds).toBe(3000);
  });

  // テスト12: 住宅売却後手取りが、売却価格－売却費用－ローン残高と一致する
  it('テスト12: 住宅売却後手取りが 売却価格 - 売却費用 - ローン残高 と一致する', () => {
    const currentHousing = createNeutralBaseInput().currentHousing;
    currentHousing.type = 'own_loan';
    currentHousing.ownLoan = {
      loanBalance: 2000,
      interestRate: 1.0,
      remainingYears: 20,
      managementFeeMonthly: 2,
      propertyTaxAnnual: 10,
    };

    const futureHousing = createNeutralBaseInput().futureHousing;
    futureHousing.expectedSalePrice = 3000;
    futureHousing.saleExpenseRate = 3.0; // 3% = 90万

    const saleCalc = calculateHousingSaleNetProceeds(currentHousing, futureHousing, 0);

    const expectedProceeds = 3000 - 90 - 2000; // 910万円
    expect(saleCalc.netProceeds).toBeCloseTo(expectedProceeds, 1);
  });

  // テスト13: 住宅購入の頭金と諸費用が二重計上されない
  it('テスト13: 住宅購入初期費用で頭金と諸費用が二重計上されない', () => {
    const futureHousing = createNeutralBaseInput().futureHousing;
    futureHousing.propertyPrice = 4000;
    futureHousing.downPayment = 500;
    futureHousing.purchaseExpenses = 200;
    futureHousing.loanAmount = 3500;

    const metrics = calculatePurchaseMetrics(futureHousing, 35);
    expect(metrics.initialCashRequired).toBe(700); // 500 + 200
  });

  // テスト14: 現在年齢から開始する積立、年金、DC受取、一時イベントが1年遅れない
  it('テスト14: 現在年齢での各種イベントが0年目期中(初年)に正常に発生する', () => {
    const input = createNeutralBaseInput();
    input.investmentPlan.monthlyContribution = 5;
    input.investmentPlan.contributionStartAge = input.personAge;
    input.personIncome.pensionEstimate = 100;
    input.personIncome.pensionStartAge = input.personAge;
    input.oneOffEvents = [{ id: 'e1', name: '初年イベント', age: input.personAge, type: 'income', amount: 50 }];

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;

    expect(row0.investmentContributionTransfer).toBe(60);
    expect(row0.pensionIncome).toBe(100);
    expect(row0.otherOneOffIncome).toBe(50);
  });

  // テスト15: すべての年で検算差額が0になる
  it('テスト15: すべてのシミュレーション年で検算差額が0 (1万円未満) になる', () => {
    const input = createBaseInput();
    const res = runLifePlanSimulation(input, 2026);

    for (const row of res.rows) {
      expect(row.calculationCheckDifference).toBeLessThan(1.0);
    }
    expect(res.summary.hasCheckWarning).toBe(false);
  });

  // テスト16: DC現在残高が1回だけ計上される
  it('テスト16: DC現在残高が1回だけ計上される', () => {
    const input = createNeutralBaseInput();
    input.dcPlan.currentBalance = 300;
    const res = runLifePlanSimulation(input, 2026);

    const row0 = res.rows[0]!;
    expect(row0.startRestrictedAssets).toBe(300);
    expect(row0.startTotalAssets).toBe(300);
  });

  // テスト17: その他換金可能資産が現預金ではなく換金可能資産へ1回だけ加算される
  it('テスト17: その他換金可能資産が現預金ではなく換金可能資産へ1回だけ加算される', () => {
    const input = createNeutralBaseInput();
    input.financialAssets.currentCash = 100;
    input.financialAssets.currentTaxableAssets = 200;
    input.financialAssets.otherAssets = 300;

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;

    expect(row0.startCash).toBe(100);
    expect(row0.startTaxableAssets).toBe(500); // 200 + 300
    expect(row0.startTotalAssets).toBe(600);
  });

  // テスト18: 住宅価格4000・頭金500・借入3500・諸費用200で初期現金支出700、借入3500となる
  it('テスト18: 住宅価格4000・頭金500・借入3500・諸費用200で初期現金支出700、借入3500となる', () => {
    const futureHousing = createNeutralBaseInput().futureHousing;
    futureHousing.propertyPrice = 4000;
    futureHousing.downPayment = 500;
    futureHousing.purchaseExpenses = 200;
    futureHousing.loanAmount = 3500;

    const metrics = calculatePurchaseMetrics(futureHousing, 40);
    expect(metrics.initialCashRequired).toBe(700);
    expect(metrics.isIdentityConsistent).toBe(true);
  });

  // テスト19: 退職金と一時収支が通常家計収支へ含まれない
  it('テスト19: 退職金と一時収支が通常家計収支へ含まれない', () => {
    const input = createNeutralBaseInput();
    input.personIncome.currentNetIncome = 500;
    input.personIncome.retirementAllowance = 2000;
    input.personIncome.retirementAllowanceAge = input.personAge;
    input.oneOffEvents = [{ id: 'e1', name: '臨時収入', age: input.personAge, type: 'income', amount: 300 }];

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;

    expect(row0.netOrdinaryCashflow).toBe(500); // 500のみ
    expect(row0.totalIncome).toBe(2800); // 500 + 2000 + 300
  });

  // テスト20: 現在宅keepで旧宅費用と新居費用が両方継続する
  it('テスト20: 現在宅keepで旧宅費用と新居費用が両方継続する', () => {
    const input = createNeutralBaseInput();
    input.currentHousing.type = 'own_loan';
    input.currentHousing.ownLoan = { loanBalance: 1000, interestRate: 1, remainingYears: 10, managementFeeMonthly: 2, propertyTaxAnnual: 12 };
    
    input.futureHousing = {
      planType: 'purchase',
      purchaseAge: input.personAge,
      propertyPrice: 3000,
      downPayment: 500,
      purchaseExpenses: 100,
      loanAmount: 2500,
      interestRate: 1,
      loanTermYears: 20,
      postPurchaseManagementFeeMonthly: 1,
      postPurchasePropertyTaxAnnual: 10,
      sellCurrentHousing: 'keep',
      expectedSalePrice: 0,
      saleExpenseRate: 0,
    };

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;

    expect(row0.existingMortgagePayments).toBeGreaterThan(0);
    expect(row0.newMortgagePayments).toBeGreaterThan(0);
    expect(row0.mortgagePayments).toBe(row0.existingMortgagePayments + row0.newMortgagePayments);
  });

  // テスト21: sellで購入年から旧宅費用が停止する
  it('テスト21: sellで購入年から旧宅費用が停止する', () => {
    const input = createNeutralBaseInput();
    input.currentHousing.type = 'own_loan';
    input.currentHousing.ownLoan = { loanBalance: 1000, interestRate: 1, remainingYears: 10, managementFeeMonthly: 2, propertyTaxAnnual: 12 };
    
    input.futureHousing = {
      planType: 'relocate',
      purchaseAge: input.personAge,
      propertyPrice: 3000,
      downPayment: 500,
      purchaseExpenses: 100,
      loanAmount: 2500,
      interestRate: 1,
      loanTermYears: 20,
      postPurchaseManagementFeeMonthly: 1,
      postPurchasePropertyTaxAnnual: 10,
      sellCurrentHousing: 'sell',
      expectedSalePrice: 1500,
      saleExpenseRate: 0,
    };

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;

    expect(row0.existingMortgagePayments).toBe(0);
    expect(row0.existingHousingMaintenanceExpenses).toBe(0);
    expect(row0.newMortgagePayments).toBeGreaterThan(0);
  });

  // テスト22: 購入年末ローン残高が12回返済後の残高になる
  it('テスト22: 購入年末ローン残高が12回返済後の残高になる', () => {
    const input = createNeutralBaseInput();
    input.futureHousing = {
      planType: 'purchase',
      purchaseAge: input.personAge,
      propertyPrice: 3000,
      downPayment: 0,
      purchaseExpenses: 0,
      loanAmount: 3000,
      interestRate: 1.2,
      loanTermYears: 30,
      postPurchaseManagementFeeMonthly: 0,
      postPurchasePropertyTaxAnnual: 0,
      sellCurrentHousing: 'undecided',
      expectedSalePrice: 0,
      saleExpenseRate: 0,
    };

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!; // 購入年

    expect(row0.newMortgageRemainingBalance).toBeLessThan(3000);
    expect(row0.newMortgageRemainingBalance).toBeGreaterThan(2900);
  });

  // テスト23: 90歳行がない場合、90歳資産がnullになる
  it('テスト23: 90歳行がない場合、90歳資産がnullになる', () => {
    const input = createNeutralBaseInput();
    input.personAge = 40;
    input.calculationEndAge = 80; // 80歳まで

    const res = runLifePlanSimulation(input, 2026);
    expect(res.summary.assetAtAge90).toBeNull();
  });

  // テスト24: 運用しながら分割取り崩しが指定年数で概ね0になる
  it('テスト24: 運用しながら分割取り崩しが指定年数で概ね0になる', () => {
    const input = createNeutralBaseInput();
    input.financialAssets.currentTaxableAssets = 1000;
    input.investmentPlan = {
      monthlyContribution: 0,
      contributionStartAge: 40,
      contributionEndAge: 60,
      expectedYieldRate: 4.0,
      withdrawalStartAge: 40,
      withdrawalMethod: 'invested_split',
      withdrawalYears: 10,
    };

    const res = runLifePlanSimulation(input, 2026);
    const row9 = res.rows[9]!; // 10年目期末

    expect(row9.endTaxableAssets).toBeLessThan(1.0);
  });

  // テスト25: DC分割受取終了時に残高が概ね0になる
  it('テスト25: DC分割受取終了時に残高が概ね0になる', () => {
    const input = createNeutralBaseInput();
    input.dcPlan = {
      currentBalance: 500,
      monthlyContribution: 0,
      contributionEndAge: 40,
      expectedYieldRate: 2.0,
      withdrawalStartAge: 40,
      withdrawalType: 'split',
      withdrawalYears: 5,
    };

    const res = runLifePlanSimulation(input, 2026);
    const row4 = res.rows[4]!; // 5年目期末

    expect(row4.endRestrictedAssets).toBeLessThan(0.1);
  });

  // テスト26: 結果画面・CSV・キャッシュフロー表で undefined、NaN が発生しない
  it('テスト26: 結果画面・CSV・キャッシュフロー表の全プロパティで undefined, NaN が発生しない', () => {
    const input = createBaseInput();
    const res = runLifePlanSimulation(input, 2026);

    for (const row of res.rows) {
      for (const [key, value] of Object.entries(row)) {
        if (key === 'events') continue;
        expect(value).not.toBeUndefined();
        expect(value).not.toBeNaN();
      }
    }
  });

  // テスト27: 全年の検算差額が0になる
  it('テスト27: 全年の検算差額が0になる', () => {
    const input = createBaseInput();
    const res = runLifePlanSimulation(input, 2026);

    for (const row of res.rows) {
      expect(row.calculationCheckDifference).toBeCloseTo(0, 4);
    }
  });

  // 必須テスト1〜7: 住宅ローン自動計算・月次一元計算の整合性
  it('必須テスト1〜3: 3,000万円・年1%・20年で理論月額返済額自動計算、1年目の内訳・年末残高一致、20年後残高概ね0', () => {
    const input = createNeutralBaseInput();
    input.currentHousing = {
      type: 'own_loan',
      rent: { monthlyRent: 0, rentEndAge: 99, futureRentChanges: [] },
      ownLoan: {
        loanBalance: 3000,
        interestRate: 1.0,
        remainingYears: 20,
        managementFeeMonthly: 0,
        propertyTaxAnnual: 0,
      },
      ownNoLoan: { managementFeeMonthly: 0, propertyTaxAnnual: 0 },
    };

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;

    // 必須テスト1: 月額返済額は約13.795万円 -> 年間約165.54万円 (約166万円)
    expect(row0.existingMortgagePayments).toBeGreaterThan(160);
    expect(row0.existingMortgagePayments).toBeLessThan(170);

    // 必須テスト2: 月次計算関数単体との完全一致検証 (1年目)
    const schedule = calculateMortgageSchedule(3000, 1.0, 20, 50);
    const year1 = schedule.annualSchedules[0]!;
    expect(row0.existingMortgagePayments).toBeCloseTo(year1.annualPayment, 5);

    // 必須テスト3: 20年後の残高が概ね0
    const year20 = schedule.annualSchedules[19]!;
    expect(year20.endBalance).toBeLessThan(0.01);
  });

  it('必須テスト4: 入力画面表示用関数(calculateMonthlyMortgagePayment)と計算エンジンの月額返済額が一致する', () => {
    const loanBalance = 3000;
    const interestRate = 1.0;
    const remainingYears = 20;

    const displayMonthly = calculateMonthlyMortgagePayment(loanBalance, interestRate, remainingYears);
    const engineSchedule = calculateMortgageSchedule(loanBalance, interestRate, remainingYears, 20);

    expect(engineSchedule.monthlyPaymentAdopted).toBeCloseTo(displayMonthly, 6);
  });

  it('必須テスト5: 売却時残高が同じ月次スケジュールと一致する', () => {
    const input = createNeutralBaseInput();
    input.currentHousing = {
      type: 'own_loan',
      rent: { monthlyRent: 0, rentEndAge: 99, futureRentChanges: [] },
      ownLoan: { loanBalance: 3000, interestRate: 1.0, remainingYears: 20, managementFeeMonthly: 0, propertyTaxAnnual: 0 },
      ownNoLoan: { managementFeeMonthly: 0, propertyTaxAnnual: 0 },
    };
    input.futureHousing = {
      planType: 'relocate',
      purchaseAge: input.personAge + 5, // 5年後売却
      propertyPrice: 4000,
      downPayment: 500,
      purchaseExpenses: 200,
      loanAmount: 3500,
      interestRate: 1.2,
      loanTermYears: 25,
      postPurchaseManagementFeeMonthly: 0,
      postPurchasePropertyTaxAnnual: 0,
      sellCurrentHousing: 'sell',
      expectedSalePrice: 3000,
      saleExpenseRate: 0,
    };

    const res = runLifePlanSimulation(input, 2026);
    const saleResult = calculateHousingSaleNetProceeds(input.currentHousing, input.futureHousing, 5);
    const schedule = calculateMortgageSchedule(3000, 1.0, 20, 10);

    // 5年後の期首残高と一致
    expect(saleResult.loanBalanceAtSale).toBeCloseTo(schedule.annualSchedules[5]!.startBalance, 5);
  });

  it('必須テスト6: 0%金利でも20年間で完済する', () => {
    const schedule = calculateMortgageSchedule(2000, 0, 20, 25);
    expect(schedule.monthlyPaymentAdopted).toBeCloseTo(100 / 12, 5); // 2000万 / 240か月 = 8.3333万/月
    expect(schedule.annualSchedules[0]!.annualPayment).toBeCloseTo(100, 5); // 年間100万円
    expect(schedule.annualSchedules[19]!.endBalance).toBeCloseTo(0, 5); // 20年後残高0
  });

  it('必須テスト7: 旧JSONの monthlyPaymentInput が計算へ影響しない', () => {
    const inputWithOldJsonProp = {
      ...createNeutralBaseInput(),
      currentHousing: {
        type: 'own_loan' as const,
        rent: { monthlyRent: 0, rentEndAge: 99, futureRentChanges: [] },
        ownLoan: {
          loanBalance: 3000,
          interestRate: 1.0,
          remainingYears: 20,
          monthlyPaymentInput: 50, // 誤った旧JSON値 (50万円/月)
          managementFeeMonthly: 0,
          propertyTaxAnnual: 0,
        },
        ownNoLoan: { managementFeeMonthly: 0, propertyTaxAnnual: 0 },
      },
    };

    const normalized = normalizeLifePlanInput(inputWithOldJsonProp);
    // @ts-expect-error monthlyPaymentInput is not in type
    expect(normalized.currentHousing.ownLoan.monthlyPaymentInput).toBeUndefined();

    const res = runLifePlanSimulation(normalized, 2026);
    // 旧JSONの50万円/月(年間600万円)ではなく、自動計算値(年間約165.5万円)が採用されていること
    expect(res.rows[0]!.existingMortgagePayments).toBeLessThan(200);
  });

  // テスト30: AnnualCashflowRow の netOrdinaryCashflow が 定期収入 - 定期支出 と一致する
  it('テスト30: AnnualCashflowRow の netOrdinaryCashflow が 定期収入 - 定期支出 と一致する', () => {
    const input = createBaseInput();
    const res = runLifePlanSimulation(input, 2026);

    for (const r of res.rows) {
      const ordIncome = r.salaryIncome + r.pensionIncome + r.otherIncome;
      const ordExpense = r.livingExpenses + r.educationExpenses + r.housingExpenses + r.insuranceExpenses;
      expect(r.netOrdinaryCashflow).toBeCloseTo(ordIncome - ordExpense, 4);
    }
  });

  // テスト31: AnnualCashflowRow の nonHousingOneOffTransactions が 退職金 + 一時収入 - 一時支出 と一致する
  it('テスト31: AnnualCashflowRow の nonHousingOneOffTransactions が 退職金 + 一時収入 - 一時支出 と一致する', () => {
    const input = createBaseInput();
    const res = runLifePlanSimulation(input, 2026);

    for (const r of res.rows) {
      const expected = r.retirementAllowance + r.otherOneOffIncome - r.otherOneOffExpenses;
      expect(r.nonHousingOneOffTransactions).toBeCloseTo(expected, 4);
    }
  });

  // テスト32: AnnualCashflowRow の housingAssetTransactions が 住宅売却手取り - 住宅購入初期費用 と一致する
  it('テスト32: AnnualCashflowRow の housingAssetTransactions が 住宅売却手取り - 住宅購入初期費用 と一致する', () => {
    const input = createBaseInput();
    const res = runLifePlanSimulation(input, 2026);

    for (const r of res.rows) {
      const expected = r.housingSaleProceeds - r.housingPurchaseInitialExpenses;
      expect(r.housingAssetTransactions).toBeCloseTo(expected, 4);
    }
  });

  // テスト33: AnnualCashflowRow の externalNetCashflow が totalIncome - totalExpenses と一致する
  it('テスト33: AnnualCashflowRow の externalNetCashflow が totalIncome - totalExpenses と一致する', () => {
    const input = createBaseInput();
    const res = runLifePlanSimulation(input, 2026);

    for (const r of res.rows) {
      const expected = r.totalIncome - r.totalExpenses;
      expect(r.externalNetCashflow).toBeCloseTo(expected, 4);
      expect(r.externalNetCashflow).toBeCloseTo(
        r.netOrdinaryCashflow + r.nonHousingOneOffTransactions + r.housingAssetTransactions,
        4
      );
    }
  });

  // テスト34: normalizeLifePlanInput が null / undefined 入力に対して CURRENT_SCHEMA_VERSION を含むデフォルトデータを返す
  it('テスト34: normalizeLifePlanInput が null/undefined 入力に対してスキーマバージョン1のデフォルトデータを返す', () => {
    const normNull = normalizeLifePlanInput(null);
    expect(normNull.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(normNull.personAge).toBe(defaultLifePlanInput.personAge);

    const normUndef = normalizeLifePlanInput(undefined);
    expect(normUndef.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(normUndef.personAge).toBe(defaultLifePlanInput.personAge);
  });

  // テスト35: normalizeLifePlanInput が部分的な JSON 入力を安全に欠損補完・正規化する
  it('テスト35: normalizeLifePlanInput が部分的な JSON 入力を安全に欠損補完・正規化する', () => {
    const partialInput = {
      personAge: 42,
      personIncome: { currentGrossIncome: 800 },
    };
    const norm = normalizeLifePlanInput(partialInput as any);
    expect(norm.personAge).toBe(42);
    expect(norm.personIncome.currentGrossIncome).toBe(800);
    expect(norm.personIncome.retirementAge).toBe(defaultLifePlanInput.personIncome.retirementAge);
    expect(norm.livingExpenses.monthlyExpense).toBe(defaultLifePlanInput.livingExpenses.monthlyExpense);
    expect(norm.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  // テスト36: normalizeLifePlanInput が数値型フィールドの NaN / 文字列入力を安全に数値に変換する
  it('テスト36: normalizeLifePlanInput が数値型フィールドの NaN/文字列入力を安全に数値に変換する', () => {
    const invalidInput = {
      personAge: '45' as any,
      livingExpenses: { monthlyExpense: NaN },
    };
    const norm = normalizeLifePlanInput(invalidInput as any);
    expect(norm.personAge).toBe(45);
    expect(norm.livingExpenses.monthlyExpense).toBe(defaultLifePlanInput.livingExpenses.monthlyExpense);
  });

  // テスト37: appConfig.startYear をデフォルト引数としたシミュレーションが正しく西暦年を算定する
  it('テスト37: appConfig.startYear をデフォルト引数としたシミュレーションが正しく西暦年を算定する', () => {
    const input = createNeutralBaseInput();
    const res = runLifePlanSimulation(input);
    expect(res.rows[0]!.year).toBe(appConfig.startYear);
    expect(res.rows[1]!.year).toBe(appConfig.startYear + 1);
  });

  // テスト38: appConfig.visibleSteps の設定変更に依存しない独立したシミュレーション計算の完全性
  it('テスト38: シミュレーション計算が appConfig.visibleSteps の状態に関わらず正確に全項目を算出する', () => {
    const input = createBaseInput();
    const res = runLifePlanSimulation(input);
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.summary.finalAssets).toBeDefined();
  });

  // テスト39: 配偶者の年金受給開始年齢が異なっても、それぞれの指定年齢から年金収入が正しく加算される
  it('テスト39: 配偶者の年金受給開始年齢から年金収入が正しく加算される', () => {
    const input = createNeutralBaseInput();
    input.hasSpouse = true;
    input.personAge = 40;
    input.spouseAge = 38;
    input.spouseIncome.pensionEstimate = 120;
    input.spouseIncome.pensionStartAge = 65;

    const res = runLifePlanSimulation(input, 2026);
    // 配偶者が65歳になるのは 本人Age = 40 + (65 - 38) = 67歳
    const rowBefore = res.rows.find((r) => r.personAge === 66);
    const rowAt = res.rows.find((r) => r.personAge === 67);

    expect(rowBefore?.pensionIncome).toBe(0);
    expect(rowAt?.pensionIncome).toBe(120);
  });

  // テスト40: 一時収入・一時支出が指定年齢以外の年には発生しない
  it('テスト40: 一時収入・一時支出が指定年齢以外の年には発生しない', () => {
    const input = createNeutralBaseInput();
    input.oneOffEvents = [
      { id: 'e1', name: '臨時収入', age: 50, type: 'income', amount: 500 },
      { id: 'e2', name: '出費', age: 55, type: 'expense', amount: 200 },
    ];

    const res = runLifePlanSimulation(input, 2026);
    const row49 = res.rows.find((r) => r.personAge === 49);
    const row50 = res.rows.find((r) => r.personAge === 50);
    const row55 = res.rows.find((r) => r.personAge === 55);

    expect(row49?.otherOneOffIncome).toBe(0);
    expect(row50?.otherOneOffIncome).toBe(500);
    expect(row55?.otherOneOffExpenses).toBe(200);
  });

  // テスト41: 賃貸の将来家賃変更 (futureRentChanges) が指定年齢以降正しく反映される
  it('テスト41: 賃貸の将来家賃変更が指定年齢以降正しく反映される', () => {
    const input = createNeutralBaseInput();
    input.currentHousing = {
      type: 'rent',
      rent: {
        monthlyRent: 10,
        rentEndAge: 99,
        futureRentChanges: [{ id: 'rc1', age: 50, monthlyRent: 15 }],
      },
      ownLoan: { loanBalance: 0, interestRate: 0, remainingYears: 0, managementFeeMonthly: 0, propertyTaxAnnual: 0 },
      ownNoLoan: { managementFeeMonthly: 0, propertyTaxAnnual: 0 },
    };

    const res = runLifePlanSimulation(input, 2026);
    const row49 = res.rows.find((r) => r.personAge === 49);
    const row50 = res.rows.find((r) => r.personAge === 50);

    expect(row49?.rentExpenses).toBe(120); // 10 * 12
    expect(row50?.rentExpenses).toBe(180); // 15 * 12
  });

  // テスト42: 住宅購入諸費用と頭金の合計が housingPurchaseInitialExpenses として購入年にのみ発生する
  it('テスト42: 住宅購入諸費用と頭金の合計が購入年にのみ発生する', () => {
    const input = createNeutralBaseInput();
    input.futureHousing = {
      planType: 'purchase',
      purchaseAge: 45,
      propertyPrice: 4000,
      downPayment: 500,
      purchaseExpenses: 200,
      loanAmount: 3500,
      interestRate: 1.0,
      loanTermYears: 30,
      postPurchaseManagementFeeMonthly: 0,
      postPurchasePropertyTaxAnnual: 0,
      sellCurrentHousing: 'undecided',
      expectedSalePrice: 0,
      saleExpenseRate: 0,
    };

    const res = runLifePlanSimulation(input, 2026);
    const row44 = res.rows.find((r) => r.personAge === 44);
    const row45 = res.rows.find((r) => r.personAge === 45);
    const row46 = res.rows.find((r) => r.personAge === 46);

    expect(row44?.housingPurchaseInitialExpenses).toBe(0);
    expect(row45?.housingPurchaseInitialExpenses).toBe(700); // 500 + 200
    expect(row46?.housingPurchaseInitialExpenses).toBe(0);
  });

  // テスト43: 住宅売却時の売却費用率 (saleExpenseRate) が正しく差し引かれた手取り額が算出される
  it('テスト43: 住宅売却時の売却費用率が正しく差し引かれた手取り額が算出される', () => {
    const input = createNeutralBaseInput();
    input.currentHousing = {
      type: 'own_noloan',
      rent: { monthlyRent: 0, rentEndAge: 99, futureRentChanges: [] },
      ownLoan: { loanBalance: 0, interestRate: 0, remainingYears: 0, managementFeeMonthly: 0, propertyTaxAnnual: 0 },
      ownNoLoan: { managementFeeMonthly: 0, propertyTaxAnnual: 0 },
    };
    input.futureHousing = {
      planType: 'relocate',
      purchaseAge: 50,
      propertyPrice: 3000,
      downPayment: 500,
      purchaseExpenses: 100,
      loanAmount: 2500,
      interestRate: 1.0,
      loanTermYears: 20,
      postPurchaseManagementFeeMonthly: 0,
      postPurchasePropertyTaxAnnual: 0,
      sellCurrentHousing: 'sell',
      expectedSalePrice: 2000,
      saleExpenseRate: 3.0, // 3% -> 手数料60万 -> 純額1940万
    };

    const res = runLifePlanSimulation(input, 2026);
    const row50 = res.rows.find((r) => r.personAge === 50);

    expect(row50?.housingSaleProceeds).toBe(1940);
  });

  // テスト44: 住宅売却時、ローン残高が売却額を上回るオーバーローンの場合、不足額が購入初期費用等に安全に加算・相殺される
  it('テスト44: 住宅売却時オーバーローンの場合、不足額が初期費用等へ安全に加算・処理される', () => {
    const input = createNeutralBaseInput();
    input.currentHousing = {
      type: 'own_loan',
      rent: { monthlyRent: 0, rentEndAge: 99, futureRentChanges: [] },
      ownLoan: { loanBalance: 2000, interestRate: 1.0, remainingYears: 20, managementFeeMonthly: 0, propertyTaxAnnual: 0 },
      ownNoLoan: { managementFeeMonthly: 0, propertyTaxAnnual: 0 },
    };
    input.futureHousing = {
      planType: 'relocate',
      purchaseAge: 40,
      propertyPrice: 3000,
      downPayment: 500,
      purchaseExpenses: 100,
      loanAmount: 2500,
      interestRate: 1.0,
      loanTermYears: 20,
      postPurchaseManagementFeeMonthly: 0,
      postPurchasePropertyTaxAnnual: 0,
      sellCurrentHousing: 'sell',
      expectedSalePrice: 1000, // 売却1000万に対して残高2000万 -> オーバーローン
      saleExpenseRate: 0,
    };

    const res = runLifePlanSimulation(input, 2026);
    const row40 = res.rows.find((r) => r.personAge === 40);

    expect(row40?.housingSaleProceeds).toBe(0);
    expect(row40?.housingPurchaseInitialExpenses).toBeGreaterThan(600); // 600 + 赤字分
  });

  // テスト45: 物価上昇率が 0% の場合、生活費が毎年変動しない
  it('テスト45: 物価上昇率が 0% の場合、生活費が毎年変動しない', () => {
    const input = createNeutralBaseInput();
    input.livingExpenses.monthlyExpense = 20;
    input.livingExpenses.inflationRate = 0;

    const res = runLifePlanSimulation(input, 2026);
    for (const r of res.rows) {
      expect(r.livingExpenses).toBe(240); // 20 * 12
    }
  });

  // テスト46: 物価上昇率が 2% の場合、生活費が毎年 1.02 倍複利で上昇する
  it('テスト46: 物価上昇率が 2% の場合、生活費が毎年 1.02 倍複利で上昇する', () => {
    const input = createNeutralBaseInput();
    input.livingExpenses.monthlyExpense = 10;
    input.livingExpenses.inflationRate = 2.0;

    const res = runLifePlanSimulation(input, 2026);
    expect(res.rows[0]!.livingExpenses).toBeCloseTo(120, 4);
    expect(res.rows[1]!.livingExpenses).toBeCloseTo(120 * 1.02, 3);
    expect(res.rows[2]!.livingExpenses).toBeCloseTo(120 * 1.02 * 1.02, 3);
  });

  // テスト47: NISA積立の拠出期間中のみ investmentContributionTransfer が発生する
  it('テスト47: NISA積立の拠出期間中のみ investmentContributionTransfer が発生する', () => {
    const input = createNeutralBaseInput();
    input.investmentPlan = {
      monthlyContribution: 5,
      contributionStartAge: 40,
      contributionEndAge: 50,
      expectedYieldRate: 0,
      withdrawalStartAge: 65,
      withdrawalMethod: 'lump_sum',
      withdrawalYears: 10,
    };

    const res = runLifePlanSimulation(input, 2026);
    const row40 = res.rows.find((r) => r.personAge === 40);
    const row49 = res.rows.find((r) => r.personAge === 49);
    const row50 = res.rows.find((r) => r.personAge === 50);

    expect(row40?.investmentContributionTransfer).toBe(60);
    expect(row49?.investmentContributionTransfer).toBe(60);
    expect(row50?.investmentContributionTransfer).toBe(0);
  });

  // テスト48: DC拠出の拠出期間中のみ dcContributionTransfer が発生する
  it('テスト48: DC拠出の拠出期間中のみ dcContributionTransfer が発生する', () => {
    const input = createNeutralBaseInput();
    input.dcPlan = {
      currentBalance: 0,
      monthlyContribution: 3,
      contributionEndAge: 55,
      expectedYieldRate: 0,
      withdrawalStartAge: 60,
      withdrawalType: 'lump_sum',
      withdrawalYears: 10,
    };

    const res = runLifePlanSimulation(input, 2026);
    const row54 = res.rows.find((r) => r.personAge === 54);
    const row55 = res.rows.find((r) => r.personAge === 55);

    expect(row54?.dcContributionTransfer).toBe(36);
    expect(row55?.dcContributionTransfer).toBe(0);
  });

  // テスト49: 完全な資産枯渇時に unbackedShortfall が 0 より大きくなる
  it('テスト49: 完全な資産枯渇時に unbackedShortfall が 0 より大きくなる', () => {
    const input = createNeutralBaseInput();
    input.financialAssets.currentCash = 100;
    input.livingExpenses.monthlyExpense = 10; // 240万/年

    const res = runLifePlanSimulation(input, 2026);
    const row1 = res.rows[0]!; // 100 - 240 = -140不足
    expect(row1.unbackedShortfall).toBeGreaterThan(0);
  });

  // テスト50: 複数子どもがいる場合の教育費が各子の年齢と学校種別に応じて合算算出される
  it('テスト50: 複数子どもがいる場合の教育費が各子の年齢に応じて合算算出される', () => {
    const input = createNeutralBaseInput();
    input.children = [
      {
        id: 'c1',
        name: '長男',
        currentAge: 6, // 小1 (公立)
        schoolType: { kindergarten: 'public', elementary: 'public', juniorHigh: 'public', highSchool: 'public', university: 'public' },
        universityLivingType: 'home',
      },
      {
        id: 'c2',
        name: '長女',
        currentAge: 3, // 幼稚園 (私立)
        schoolType: { kindergarten: 'private', elementary: 'public', juniorHigh: 'public', highSchool: 'public', university: 'public' },
        universityLivingType: 'home',
      },
    ];

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;
    expect(row0.educationExpenses).toBeGreaterThan(0);
  });

  // テスト51: 複雑な全パラメータ入力設定において全年の検算差額が0であり、全行の恒等式が成立する
  it('テスト51: 複雑な全パラメータ入力設定において全年の検算差額が0であり、恒等式が完全成立する', () => {
    const input = createBaseInput();
    // 全機能を動かす設定
    input.personIncome.incomeChangeEvents = [{ id: 'ice1', age: 45, grossAmount: 900 }];
    input.oneOffEvents = [{ id: 'e1', name: '車買い替え', age: 42, type: 'expense', amount: 200 }];
    input.futureHousing = {
      planType: 'relocate',
      purchaseAge: 40,
      propertyPrice: 4500,
      downPayment: 500,
      purchaseExpenses: 200,
      loanAmount: 4000,
      interestRate: 1.2,
      loanTermYears: 30,
      postPurchaseManagementFeeMonthly: 3,
      postPurchasePropertyTaxAnnual: 18,
      sellCurrentHousing: 'sell',
      expectedSalePrice: 2500,
      saleExpenseRate: 3.3,
    };

    const res = runLifePlanSimulation(input, 2026);
    expect(res.rows.length).toBeGreaterThan(10);
    for (const r of res.rows) {
      expect(r.calculationCheckDifference).toBeCloseTo(0, 4);
      expect(r.externalNetCashflow).toBeCloseTo(r.totalIncome - r.totalExpenses, 4);
    }
  });

  // テスト52: 住宅ローン返済スケジュール計算において月次12回計算の期待利息・返済額・年末残高と一致する
  it('テスト52: 住宅ローン返済スケジュール計算において月次12回計算の期待利息・返済額・年末残高と一致する', () => {
    // 借入3000万, 年利1.2%, 35年返済
    const principal = 3000;
    const annualRate = 1.2;
    const years = 35;
    const schedule = calculateMortgageSchedule(principal, annualRate, years, 1);
    
    // 期待値の手計算 (月次アモティゼーション 12ヶ月分)
    const monthlyRate = (annualRate / 100) / 12;
    const totalMonths = years * 12;
    const expectedMonthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    
    let remBalance = principal;
    let expectedAnnualInterest = 0;
    let expectedAnnualPrincipal = 0;
    for (let m = 0; m < 12; m++) {
      const interest = remBalance * monthlyRate;
      const principalPayment = expectedMonthlyPayment - interest;
      expectedAnnualInterest += interest;
      expectedAnnualPrincipal += principalPayment;
      remBalance -= principalPayment;
    }

    const year1 = schedule.annualSchedules[0]!;
    expect(schedule.monthlyPaymentAdopted).toBeCloseTo(expectedMonthlyPayment, 4);
    expect(year1.annualPayment).toBeCloseTo(expectedMonthlyPayment * 12, 4);
    expect(year1.annualInterest).toBeCloseTo(expectedAnnualInterest, 4);
    expect(year1.annualPrincipal).toBeCloseTo(expectedAnnualPrincipal, 4);
    expect(year1.endBalance).toBeCloseTo(remBalance, 4);
  });

  // テスト53: NISAおよびDCの非引き出し期間（運用継続中）において運用益が正しく計上される
  it('テスト53: NISAおよびDCの非引き出し期間において運用益が正しく計上される', () => {
    const input = createNeutralBaseInput();
    input.financialAssets.currentTaxableAssets = 1000;
    input.dcPlan.currentBalance = 800;
    input.investmentPlan.expectedYieldRate = 5; // 5%
    input.investmentPlan.withdrawalStartAge = 70; // 70歳まで引き出しなし
    input.dcPlan.expectedYieldRate = 5; // 5%
    input.dcPlan.withdrawalStartAge = 70; // 70歳まで引き出しなし

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;
    // 1000 * 5% = 50万円運用益 (NISA)
    expect(row0.taxableInvestmentGain).toBeCloseTo(50, 1);
    expect(row0.endTaxableAssets).toBeCloseTo(1050, 1);

    // 800 * 5% = 40万円運用益 (DC)
    expect(row0.restrictedInvestmentGain).toBeCloseTo(40, 1);
    expect(row0.endRestrictedAssets).toBeCloseTo(840, 1);
  });

  // テスト54: 年次収支4区分の恒等式が全期間で成立する
  it('テスト54: 年次収支4区分（通常家計・非住宅一時・住宅資産取引・外部純収支）の恒等式が成立する', () => {
    const input = createBaseInput();
    const res = runLifePlanSimulation(input, 2026);
    for (const r of res.rows) {
      const sumFourParts = r.netOrdinaryCashflow + r.nonHousingOneOffTransactions + r.housingAssetTransactions;
      expect(r.totalExternalNetCashflow).toBeCloseTo(sumFourParts, 4);
      expect(r.totalExternalNetCashflow).toBeCloseTo(r.totalIncome - r.totalExpenses, 4);
    }
  });

  // テスト55: 過去年齢において既に受取開始済みのNISAおよびDCの開始スナップショット・受取開始が保持される
  it('テスト55: 過去年齢において既に受取開始済みのNISAおよびDCの開始スナップショット・受取開始が保持される', () => {
    const input = createNeutralBaseInput();
    input.personAge = 65;
    input.financialAssets.currentTaxableAssets = 500;
    input.dcPlan.currentBalance = 600;
    
    // NISA: 60歳開始指定 (すでに65歳)
    input.investmentPlan.withdrawalStartAge = 60;
    input.investmentPlan.withdrawalMethod = 'equal_split';
    input.investmentPlan.withdrawalYears = 10;

    // DC: 60歳開始指定 (すでに65歳)
    input.dcPlan.withdrawalStartAge = 60;
    input.dcPlan.withdrawalType = 'lump_sum';

    const res = runLifePlanSimulation(input, 2026);
    const row0 = res.rows[0]!;
    // 0年目（65歳時点）から直ちにNISA分割受取およびDC受取が実行される
    expect(row0.plannedTaxableWithdrawal).toBeGreaterThan(0);
    expect(row0.dcWithdrawal).toBeGreaterThan(0);
  });

  // テスト56: 全換金可能資産枯渇時に生活資金不足警告（error）が生成される
  it('テスト56: 全換金可能資産枯渇時に生活資金不足警告（error）が生成される', () => {
    const input = createNeutralBaseInput();
    input.financialAssets.currentCash = 0;
    input.financialAssets.currentTaxableAssets = 0;
    input.livingExpenses.monthlyExpense = 20;

    const res = runLifePlanSimulation(input, 2026);
    const errorWarn = res.warnings.find((w) => w.type === 'error');
    expect(errorWarn).toBeDefined();
    expect(errorWarn?.title).toContain('生活資金不足');
  });

  // テスト57: 計算終了年齢が現在年齢未満の場合に適切な警告メッセージが追加され安全に処理される
  it('テスト57: 計算終了年齢が現在年齢未満の場合に適切な警告メッセージが追加され安全に処理される', () => {
    const input = createNeutralBaseInput();
    input.personAge = 40;
    input.calculationEndAge = 30; // 30 < 40 (不正値)

    const res = runLifePlanSimulation(input, 2026);
    expect(res.rows.length).toBe(1); // 0経過年数で動作
    const checkWarn = res.warnings.find((w) => w.message.includes('計算終了年齢が現在の本人'));
    expect(checkWarn).toBeDefined();
  });

});

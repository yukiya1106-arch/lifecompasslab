/**
 * 住宅計算エンジン (housing.ts)
 * 
 * 元利均等返済計算、住宅売却手取り、将来購入・住み替え費用を計算します。
 */

import { CurrentHousingInput, FutureHousingInput } from '../types/lifeplan';

/**
 * 元利均等返済の毎月返済額を計算 (万円)
 */
export function calculateMonthlyMortgagePayment(
  loanAmount: number,     // 借入額 (万円)
  annualRatePct: number,  // 金利 (%)
  termYears: number       // 返済期間 (年)
): number {
  if (loanAmount <= 0 || termYears <= 0) return 0;
  
  const r = annualRatePct / 100 / 12; // 月利
  const n = termYears * 12;           // 返済月数

  if (r <= 0) {
    return loanAmount / n;
  }

  const factor = Math.pow(1 + r, n);
  const monthlyPayment = loanAmount * (r * factor) / (factor - 1);
  return monthlyPayment;
}

export interface MortgageAnnualSchedule {
  yearIndex: number;      // 経過年数 (0 = 1年目, 1 = 2年目, ...)
  startBalance: number;   // 期首残高 (年初)
  annualPayment: number;  // 年間返済額合計
  annualInterest: number; // 年間利息合計
  annualPrincipal: number;// 年間元金返済合計
  endBalance: number;     // 期末残高 (年末)
}

export interface MortgageScheduleResult {
  monthlyPaymentAdopted: number; // 採用月額返済額 (万円)
  annualSchedules: MortgageAnnualSchedule[];
}

/**
 * 住宅ローンの月次計算を正本とするスケジュール計算関数 (元利均等返済)
 * 
 * 当月利息 = 当月期首残高 × 月利
 * 当月返済額 = min(理論元利均等返済額, 当月期首残高 + 当月利息)
 * 翌月残高 = max(0, 当月期首残高 + 当月利息 - 当月返済額)
 */
export function calculateMortgageSchedule(
  initialLoanAmount: number,       // 借入額 / 現在残高 (万円)
  annualRatePct: number,           // 年金利 (%)
  remainingTermYears: number,      // 残り返済期間 (年)
  simulationMaxYears: number = 50   // 最大計算年数
): MortgageScheduleResult {
  if (initialLoanAmount <= 0 || remainingTermYears <= 0) {
    return {
      monthlyPaymentAdopted: 0,
      annualSchedules: Array.from({ length: simulationMaxYears + 1 }, (_, y) => ({
        yearIndex: y,
        startBalance: 0,
        annualPayment: 0,
        annualInterest: 0,
        annualPrincipal: 0,
        endBalance: 0,
      })),
    };
  }

  const adoptedMonthly = calculateMonthlyMortgagePayment(initialLoanAmount, annualRatePct, remainingTermYears);
  const monthlyRate = annualRatePct / 100 / 12;

  let currentBalance = initialLoanAmount;
  const annualSchedules: MortgageAnnualSchedule[] = [];

  for (let y = 0; y <= simulationMaxYears; y++) {
    const startBalance = currentBalance;
    let annualPayment = 0;
    let annualInterest = 0;
    let annualPrincipal = 0;

    for (let m = 0; m < 12; m++) {
      if (currentBalance <= 0) {
        break;
      }

      const interest = currentBalance * monthlyRate;
      const payment = Math.min(adoptedMonthly, currentBalance + interest);
      const principal = payment - interest;
      const endBalance = Math.max(0, currentBalance + interest - payment);

      annualPayment += payment;
      annualInterest += interest;
      annualPrincipal += principal;

      currentBalance = endBalance;
    }

    annualSchedules.push({
      yearIndex: y,
      startBalance,
      annualPayment,
      annualInterest,
      annualPrincipal,
      endBalance: currentBalance,
    });
  }

  return {
    monthlyPaymentAdopted: adoptedMonthly,
    annualSchedules,
  };
}

/**
 * 経過月数後の住宅ローン残高を計算 (万円)
 */
export function calculateRemainingLoanBalance(
  initialLoanAmount: number,
  annualRatePct: number,
  termYears: number,
  elapsedMonths: number
): number {
  if (initialLoanAmount <= 0 || elapsedMonths <= 0) return initialLoanAmount;
  const elapsedYears = Math.floor(elapsedMonths / 12);
  const remainingMonthsInYear = elapsedMonths % 12;

  const schedule = calculateMortgageSchedule(initialLoanAmount, annualRatePct, termYears, elapsedYears + 1);
  if (elapsedYears >= schedule.annualSchedules.length) return 0;

  if (remainingMonthsInYear === 0) {
    return schedule.annualSchedules[elapsedYears]?.startBalance ?? 0;
  }

  let balance = schedule.annualSchedules[elapsedYears]?.startBalance ?? 0;
  const monthlyRate = annualRatePct / 100 / 12;
  const adoptedMonthly = schedule.monthlyPaymentAdopted;

  for (let m = 0; m < remainingMonthsInYear; m++) {
    if (balance <= 0) break;
    const interest = balance * monthlyRate;
    const payment = Math.min(adoptedMonthly, balance + interest);
    balance = Math.max(0, balance + interest - payment);
  }

  return balance;
}

/**
 * 将来の住宅購入に必要な金額明細・試算結果
 */
export interface HousingPurchaseMetrics {
  monthlyPayment: number;       // 毎月返済額 (万円)
  annualPayment: number;        // 年間返済額 (万円)
  totalPayment: number;         // 総返済額 (万円)
  totalInterest: number;        // 総利息額 (万円)
  payoffAge: number;            // 完済年齢
  initialCashRequired: number;  // 購入時現金支出 (頭金 + 諸費用)
  isIdentityConsistent: boolean;// 恒等式 (価格 + 諸費用 == 頭金 + 借入額) の整合性
  identityDiff: number;         // 差額 (万円)
}

export function calculatePurchaseMetrics(
  input: FutureHousingInput,
  _personCurrentAge: number
): HousingPurchaseMetrics {
  const monthly = calculateMonthlyMortgagePayment(input.loanAmount, input.interestRate, input.loanTermYears);
  const annual = monthly * 12;
  const totalPayment = monthly * input.loanTermYears * 12;
  const totalInterest = Math.max(0, totalPayment - input.loanAmount);
  const payoffAge = input.purchaseAge + input.loanTermYears;
  const initialCashRequired = input.downPayment + input.purchaseExpenses;

  // 恒等式チェック: 住宅価格 ＝ 頭金 + 借入額
  const totalCost = input.propertyPrice;
  const totalFund = input.downPayment + input.loanAmount;
  const identityDiff = Math.abs(totalCost - totalFund);
  const isIdentityConsistent = identityDiff < 0.1; // 1000円以内の端数調整は許容

  return {
    monthlyPayment: monthly,
    annualPayment: annual,
    totalPayment,
    totalInterest,
    payoffAge,
    initialCashRequired,
    isIdentityConsistent,
    identityDiff,
  };
}

/**
 * 住宅売却手取り額を計算
 */
export interface HousingSaleCalculationResult {
  salePrice: number;            // 想定売却価格 (万円)
  saleExpenses: number;         // 売却費用 (万円)
  loanBalanceAtSale: number;    // 売却時住宅ローン残高 (万円)
  netProceeds: number;          // 売却後手取り (万円)
}

export function calculateHousingSaleNetProceeds(
  currentHousing: CurrentHousingInput,
  futureHousing: FutureHousingInput,
  elapsedYearsAtSale: number
): HousingSaleCalculationResult {
  const salePrice = futureHousing.expectedSalePrice;
  const saleExpenses = salePrice * (futureHousing.saleExpenseRate / 100);

  let loanBalanceAtSale = 0;
  if (currentHousing.type === 'own_loan') {
    const loan = currentHousing.ownLoan;
    const schedule = calculateMortgageSchedule(
      loan.loanBalance,
      loan.interestRate,
      loan.remainingYears,
      elapsedYearsAtSale + 1
    );
    // 売却年は年初売却として、その年の返済は0、売却時残高は売却年の期首残高
    loanBalanceAtSale = schedule.annualSchedules[elapsedYearsAtSale]?.startBalance ?? 0;
  }

  const netProceeds = salePrice - saleExpenses - loanBalanceAtSale;

  return {
    salePrice,
    saleExpenses,
    loanBalanceAtSale,
    netProceeds,
  };
}

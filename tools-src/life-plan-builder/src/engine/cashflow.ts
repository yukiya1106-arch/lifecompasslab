/**
 * キャッシュフロー計算メインエンジン (cashflow.ts)
 * 
 * 入力データから年次キャッシュフローと金融資産残高推移を精密に計算します。
 */

import {
  LifePlanInput,
  AnnualCashflowRow,
  SimulationResult,
} from '../types/lifeplan';
import { defaultEducationCostsMaster } from '../data/educationCosts';
import { appConfig } from '../config/appConfig';

import { calculateAnnualPersonIncome } from './income';
import {
  calculateMortgageSchedule,
  calculateHousingSaleNetProceeds,
} from './housing';
import { createPortfolioState, processPortfolioStep } from './capitalPlans';
import { validateAnnualCashflowRow, validateInputWarnings } from './validation';

export function runLifePlanSimulation(
  input: LifePlanInput,
  startYear: number = appConfig.startYear
): SimulationResult {
  const rows: AnnualCashflowRow[] = [];
  const checkWarnings: string[] = validateInputWarnings(input);

  // 計算終了年数(経過年数)の決定
  // P1-1: 年下の成人(本人 or 配偶者)が計算終了年齢に達するまで
  const personDiff = input.calculationEndAge - input.personAge;
  let maxElapsedYears = personDiff;

  if (input.hasSpouse && input.spouseAge < input.personAge) {
    const spouseDiff = input.calculationEndAge - input.spouseAge;
    maxElapsedYears = Math.max(maxElapsedYears, spouseDiff);
  }

  if (maxElapsedYears < 0) {
    checkWarnings.push('計算終了年齢が現在の本人（または配偶者）の年齢より低く設定されています。');
    maxElapsedYears = 0;
  }

  // P0-1: 住宅ローンスケジュールの月次一元計算
  const existingLoanSchedule = input.currentHousing.type === 'own_loan'
    ? calculateMortgageSchedule(
        input.currentHousing.ownLoan.loanBalance,
        input.currentHousing.ownLoan.interestRate,
        input.currentHousing.ownLoan.remainingYears,
        maxElapsedYears + 1
      )
    : null;

  const newLoanSchedule = input.futureHousing.planType !== 'none'
    ? calculateMortgageSchedule(
        input.futureHousing.loanAmount,
        input.futureHousing.interestRate,
        input.futureHousing.loanTermYears,
        maxElapsedYears + 1
      )
    : null;

  // 資産状態の初期化
  let currentCash = input.financialAssets.currentCash;
  let currentTaxable = input.financialAssets.currentTaxableAssets + input.financialAssets.otherAssets;
  let currentRestricted = input.dcPlan.currentBalance;
  const portfolioState = createPortfolioState(input);

  // NISA / DC の取り崩し開始時スナップショット保持用
  let initialTaxableSnapshotAtWithdrawal: number | null = null;
  let initialDcSnapshotAtWithdrawal: number | null = null;

  // 各年のループ計算 (0年目期首資産〜最終年)
  for (let t = 0; t <= maxElapsedYears; t++) {
    const year = startYear + t;
    const personAge = input.personAge + t;
    const spouseAge = input.hasSpouse ? input.spouseAge + t : 0;
    const events: string[] = [];

    const inflationFactor = Math.pow(1 + input.livingExpenses.inflationRate / 100, t);

    // 期首資産 (Start Assets)
    const startCash = currentCash;
    const startTaxableAssets = currentTaxable;
    const startRestrictedAssets = currentRestricted;
    const startTotalAssets = startCash + startTaxableAssets + startRestrictedAssets;

    // --- 1. 収入の計算 ---
    const personInc = calculateAnnualPersonIncome(input.personIncome, input.personAge, personAge);
    const spouseInc = input.hasSpouse
      ? calculateAnnualPersonIncome(input.spouseIncome, input.spouseAge, spouseAge)
      : { grossSalary: 0, netSalary: 0, pension: 0, retirementAllowance: 0, otherIncome: 0, isRetired: false };

    const personNetSalary = personInc.netSalary;
    const spouseNetSalary = spouseInc.netSalary;
    const salaryIncome = personNetSalary + spouseNetSalary;
    const pensionIncome = personInc.pension + spouseInc.pension;
    const otherIncome = personInc.otherIncome + spouseInc.otherIncome;
    const retirementAllowance = personInc.retirementAllowance + spouseInc.retirementAllowance;

    if (personInc.retirementAllowance > 0) events.push('本人退職金');
    if (spouseInc.retirementAllowance > 0) events.push('配偶者退職金');
    if (personAge === input.personIncome.pensionStartAge) events.push('本人年金開始');

    // --- 2. 支出の計算 ---
    // A. 生活費
    const livingExpenses = (input.livingExpenses.monthlyExpense * 12 + input.livingExpenses.annualOneOffExpense) * inflationFactor;

    // B. 保険料
    let insuranceExpenses = 0;
    if (personAge < input.livingExpenses.insuranceEndAge) {
      insuranceExpenses = input.livingExpenses.insurancePremiumMonthly * 12 * inflationFactor;
    }

    // C. 教育費 (子どもごと)
    let educationExpenses = 0;
    for (const child of input.children) {
      let childAge = child.currentAge + t;
      if (child.isFutureChild && child.birthInYears !== undefined) {
        childAge = t - child.birthInYears;
      }

      if (childAge < 0) continue; // 未誕生

      // 0年目で実学費入力がある場合は優先
      if (t === 0 && child.customActualAnnualCost !== undefined && child.customActualAnnualCost > 0) {
        educationExpenses += child.customActualAnnualCost;
        continue;
      }

      const master = defaultEducationCostsMaster.stages;
      let stageCost = 0;

      if (childAge >= master.nursery.entranceAge && childAge < master.nursery.entranceAge + master.nursery.durationYears) {
        const nurseryType = child.schoolType.nursery || 'public';
        stageCost = nurseryType === 'public' ? master.nursery.publicAnnual : master.nursery.privateAnnual;
      } else if (childAge >= master.kindergarten.entranceAge && childAge < master.kindergarten.entranceAge + master.kindergarten.durationYears) {
        stageCost = child.schoolType.kindergarten === 'public' ? master.kindergarten.publicAnnual : master.kindergarten.privateAnnual;
      } else if (childAge >= master.elementary.entranceAge && childAge < master.elementary.entranceAge + master.elementary.durationYears) {
        stageCost = child.schoolType.elementary === 'public' ? master.elementary.publicAnnual : master.elementary.privateAnnual;
        if (childAge === master.elementary.entranceAge) events.push(`${child.name}小学校入学`);
      } else if (childAge >= master.juniorHigh.entranceAge && childAge < master.juniorHigh.entranceAge + master.juniorHigh.durationYears) {
        stageCost = child.schoolType.juniorHigh === 'public' ? master.juniorHigh.publicAnnual : master.juniorHigh.privateAnnual;
        if (childAge === master.juniorHigh.entranceAge) events.push(`${child.name}中学校入学`);
      } else if (childAge >= master.highSchool.entranceAge && childAge < master.highSchool.entranceAge + master.highSchool.durationYears) {
        stageCost = child.schoolType.highSchool === 'public' ? master.highSchool.publicAnnual : master.highSchool.privateAnnual;
        if (childAge === master.highSchool.entranceAge) events.push(`${child.name}高校入学`);
      } else if (childAge >= master.university.entranceAge && childAge < master.university.entranceAge + master.university.durationYears) {
        stageCost = child.schoolType.university === 'public' ? master.university.publicAnnual : master.university.privateAnnual;
        if (child.universityLivingType === 'away') {
          stageCost += defaultEducationCostsMaster.universityLivingAwayExtraAnnual;
        }
        if (childAge === master.university.entranceAge) events.push(`${child.name}大学入学`);
      }

      educationExpenses += stageCost * inflationFactor;
    }

    // D. 住居費・住宅資産取引
    let existingMortgagePayments = 0;
    let newMortgagePayments = 0;
    let rentExpenses = 0;
    let existingHousingMaintenanceExpenses = 0;
    let newHousingMaintenanceExpenses = 0;
    let housingPurchaseInitialExpenses = 0;
    let housingSaleProceeds = 0;

    const isFutureHousingPurchased = input.futureHousing.planType !== 'none' && personAge >= input.futureHousing.purchaseAge;
    const isPurchaseYear = input.futureHousing.planType !== 'none' && personAge === input.futureHousing.purchaseAge;
    const isOldHomeSold = isFutureHousingPurchased && input.futureHousing.planType === 'relocate' && input.futureHousing.sellCurrentHousing === 'sell';

    if (isPurchaseYear) {
      events.push('住宅購入・住み替え');
      housingPurchaseInitialExpenses = input.futureHousing.downPayment + input.futureHousing.purchaseExpenses;

      if (input.futureHousing.planType === 'relocate' && input.futureHousing.sellCurrentHousing === 'sell') {
        const saleResult = calculateHousingSaleNetProceeds(input.currentHousing, input.futureHousing, t);
        if (saleResult.netProceeds >= 0) {
          housingSaleProceeds = saleResult.netProceeds;
        } else {
          // マイナスの場合は購入時に必要な追加資金として初期費用に加算
          housingPurchaseInitialExpenses += Math.abs(saleResult.netProceeds);
        }
      }
    }

    // 新居の費用
    if (isFutureHousingPurchased) {
      const elapsedSincePurchase = personAge - input.futureHousing.purchaseAge;
      if (newLoanSchedule && elapsedSincePurchase >= 0 && elapsedSincePurchase < input.futureHousing.loanTermYears) {
        newMortgagePayments = newLoanSchedule.annualSchedules[elapsedSincePurchase]?.annualPayment ?? 0;
      }
      newHousingMaintenanceExpenses = (input.futureHousing.postPurchaseManagementFeeMonthly * 12 + input.futureHousing.postPurchasePropertyTaxAnnual) * inflationFactor;
    }

    // 旧居の費用
    if (!isOldHomeSold) {
      if (input.currentHousing.type === 'rent') {
        // P1-3: 将来住宅計画なし (planType === 'none') の場合、家賃は計算終了まで継続
        const isRentActive = input.futureHousing.planType === 'none'
          ? true
          : (!isFutureHousingPurchased && personAge < input.currentHousing.rent.rentEndAge);

        if (isRentActive) {
          let monthlyRent = input.currentHousing.rent.monthlyRent;
          for (const rc of input.currentHousing.rent.futureRentChanges) {
            if (personAge >= rc.age) {
              monthlyRent = rc.monthlyRent;
            }
          }
          rentExpenses = monthlyRent * 12 * inflationFactor;
        }
      } else if (input.currentHousing.type === 'own_loan') {
        const loan = input.currentHousing.ownLoan;
        if (existingLoanSchedule && t < existingLoanSchedule.annualSchedules.length) {
          existingMortgagePayments = existingLoanSchedule.annualSchedules[t]?.annualPayment ?? 0;
        }
        existingHousingMaintenanceExpenses = (loan.managementFeeMonthly * 12 + loan.propertyTaxAnnual) * inflationFactor;
      } else if (input.currentHousing.type === 'own_noloan') {
        const own = input.currentHousing.ownNoLoan;
        existingHousingMaintenanceExpenses = (own.managementFeeMonthly * 12 + own.propertyTaxAnnual) * inflationFactor;
      }
    }

    const mortgagePayments = existingMortgagePayments + newMortgagePayments;
    const housingMaintenanceExpenses = existingHousingMaintenanceExpenses + newHousingMaintenanceExpenses;
    const housingExpenses = mortgagePayments + rentExpenses + housingMaintenanceExpenses;

    // E. その他一時収支
    let otherOneOffIncome = 0;
    let otherOneOffExpenses = 0;

    for (const ev of input.oneOffEvents) {
      if (ev.age === personAge) {
        events.push(ev.name);
        if (ev.type === 'income') {
          otherOneOffIncome += ev.amount;
        } else {
          otherOneOffExpenses += ev.amount;
        }
      }
    }

    // 集計 (全項目)
    const totalIncome = salaryIncome + pensionIncome + otherIncome + retirementAllowance + housingSaleProceeds + otherOneOffIncome;
    const totalExpenses = livingExpenses + educationExpenses + housingExpenses + insuranceExpenses + housingPurchaseInitialExpenses + otherOneOffExpenses;

    // P0-2: 年次収支4区分
    const totalOrdinaryIncome = salaryIncome + pensionIncome + otherIncome;
    const totalOrdinaryExpenses = livingExpenses + educationExpenses + housingExpenses + insuranceExpenses;
    const netOrdinaryCashflow = totalOrdinaryIncome - totalOrdinaryExpenses;

    const nonHousingOneOffTransactions = retirementAllowance + otherOneOffIncome - otherOneOffExpenses;
    const housingAssetTransactions = housingSaleProceeds - housingPurchaseInitialExpenses;
    const totalExternalNetCashflow = netOrdinaryCashflow + nonHousingOneOffTransactions + housingAssetTransactions;

    // --- 3. 資産運用・取り崩し・現金充当ステップ ---
    // P1-2: 過去開始年齢の考慮
    if (personAge >= input.investmentPlan.withdrawalStartAge && initialTaxableSnapshotAtWithdrawal === null) {
      initialTaxableSnapshotAtWithdrawal = startTaxableAssets;
      events.push('NISA取り崩し開始');
    }
    if (personAge >= input.dcPlan.withdrawalStartAge && initialDcSnapshotAtWithdrawal === null) {
      initialDcSnapshotAtWithdrawal = startRestrictedAssets;
      events.push('DC受取開始');
    }

    const investResult = processPortfolioStep(
      {
        startCash,
        startTaxableAssets,
        startRestrictedAssets,
        personAge,
        netOrdinaryCashflow,
        nonHousingOneOffTransactions,
        housingAssetTransactions,
      },
      input,
      portfolioState,
      initialDcSnapshotAtWithdrawal,
      events
    );

    // 次年の期首資産へ引き継ぎ
    for (const event of events) {
      if (event.includes('元本不足')) checkWarnings.push(`${year}年（${personAge}歳）${event}`);
    }
    currentCash = investResult.endCash;
    currentTaxable = investResult.endTaxableAssets;
    currentRestricted = investResult.endRestrictedAssets;

    const endTotalAssets = currentCash + currentTaxable + currentRestricted;

    // 住宅ローン残高算出 (年末時点)
    let newMortgageRemainingBalance = 0;
    if (isFutureHousingPurchased && newLoanSchedule) {
      const elapsedSincePurchase = personAge - input.futureHousing.purchaseAge;
      if (elapsedSincePurchase >= 0) {
        newMortgageRemainingBalance = newLoanSchedule.annualSchedules[elapsedSincePurchase]?.endBalance ?? 0;
      }
    }

    let existingMortgageRemainingBalance = 0;
    if (input.currentHousing.type === 'own_loan' && !isOldHomeSold && existingLoanSchedule) {
      if (t < existingLoanSchedule.annualSchedules.length) {
        existingMortgageRemainingBalance = existingLoanSchedule.annualSchedules[t]?.endBalance ?? 0;
      }
    }

    const mortgageRemainingBalance = existingMortgageRemainingBalance + newMortgageRemainingBalance;

    const row: AnnualCashflowRow = {
      year,
      elapsedYears: t,
      personAge,
      spouseAge,
      events,
      
      startCash,
      startTaxableAssets,
      startRestrictedAssets,
      startTotalAssets,
      
      personNetSalary,
      spouseNetSalary,
      salaryIncome,
      pensionIncome,
      otherIncome,
      retirementAllowance,
      housingSaleProceeds,
      otherOneOffIncome,
      totalIncome,
      
      livingExpenses,
      educationExpenses,
      existingMortgagePayments,
      newMortgagePayments,
      mortgagePayments,
      rentExpenses,
      existingHousingMaintenanceExpenses,
      newHousingMaintenanceExpenses,
      housingMaintenanceExpenses,
      housingExpenses,
      insuranceExpenses,
      housingPurchaseInitialExpenses,
      otherOneOffExpenses,
      totalExpenses,
      
      totalOrdinaryIncome,
      totalOrdinaryExpenses,
      netOrdinaryCashflow,
      nonHousingOneOffTransactions,
      housingAssetTransactions,
      totalExternalNetCashflow,
      externalNetCashflow: totalExternalNetCashflow,
      
      investmentContributionTransfer: investResult.investmentContributionTransfer,
      dcContributionTransfer: investResult.dcContributionTransfer,
      plannedTaxableWithdrawal: investResult.plannedTaxableWithdrawal,
      emergencyTaxableWithdrawal: investResult.emergencyTaxableWithdrawal,
      dcWithdrawal: investResult.dcWithdrawal,
      
      taxableInvestmentGain: investResult.taxableInvestmentGain,
      restrictedInvestmentGain: investResult.restrictedInvestmentGain,
      totalInvestmentGain: investResult.totalInvestmentGain,
      
      endCash: investResult.endCash,
      endTaxableAssets: investResult.endTaxableAssets,
      endRestrictedAssets: investResult.endRestrictedAssets,
      endTotalAssets,
      
      unbackedShortfall: investResult.unbackedShortfall,
      existingMortgageRemainingBalance,
      newMortgageRemainingBalance,
      mortgageRemainingBalance,
      calculationCheckDifference: 0,
    };

    // 検算チェック実行
    const validation = validateAnnualCashflowRow(row);
    row.calculationCheckDifference = validation.diff;
    if (!validation.isValid) {
      checkWarnings.push(`【${year}年(${personAge}歳)】${validation.message}`);
    }

    rows.push(row);
  }

  // サマリー指標の算出
  const currentAnnualCashflow = rows.length > 0 ? rows[0]!.netOrdinaryCashflow : 0;
  
  let cashDepletionAge: number | null = null;
  let investmentWithdrawalStartAge: number | null = null;
  let liquidAssetShortfallAge: number | null = null;
  let peakAssetAmount = 0;
  let peakAssetAge = input.personAge;
  let totalEducationExpenses = 0;
  let totalMortgagePayments = 0;

  for (const r of rows) {
    if (r.endTotalAssets > peakAssetAmount) {
      peakAssetAmount = r.endTotalAssets;
      peakAssetAge = r.personAge;
    }
    totalEducationExpenses += r.educationExpenses;
    totalMortgagePayments += r.mortgagePayments;

    if (cashDepletionAge === null && (r.emergencyTaxableWithdrawal > 0 || r.unbackedShortfall > 0)) {
      cashDepletionAge = r.personAge;
    }
    if (investmentWithdrawalStartAge === null && (r.plannedTaxableWithdrawal > 0 || r.emergencyTaxableWithdrawal > 0)) {
      investmentWithdrawalStartAge = r.personAge;
    }
    if (liquidAssetShortfallAge === null && r.unbackedShortfall > 0) {
      liquidAssetShortfallAge = r.personAge;
    }
  }

  const row65 = rows.find(r => r.personAge === 65);
  const row90 = rows.find(r => r.personAge === 90);

  const assetAtAge65 = row65 ? Math.round(row65.endTotalAssets) : null;
  const assetAtAge90 = row90 ? Math.round(row90.endTotalAssets) : null;
  const finalAssets = Math.round(rows[rows.length - 1]?.endTotalAssets ?? 0);

  // P0-3: 構造化警告メッセージの生成 (用語統一: 生活資金不足)
  const warnings: { type: 'error' | 'warning' | 'info'; title: string; message: string }[] = [];

  if (checkWarnings.length > 0) {
    for (const cw of checkWarnings) {
      warnings.push({
        type: 'warning',
        title: '入力条件・整合性警告',
        message: cw,
      });
    }
  }

  if (liquidAssetShortfallAge !== null) {
    warnings.push({
      type: 'error',
      title: '生活資金不足の発生',
      message: `${liquidAssetShortfallAge}歳時点で生活資金（現預金および換金可能資産）が不足し、未補填資金不足が発生しています。(※DC・iDeCo等の受取制限資産は残っている可能性があります)`,
    });
  } else if (cashDepletionAge !== null) {
    warnings.push({
      type: 'info',
      title: '現預金の取り崩しと運用資産充当',
      message: `${cashDepletionAge}歳時点で一時的な現預金不足が生じ、NISA等の運用資産から自動補填取崩しが実行されました。(資産全体としては黒字です)`,
    });
  }

  // P1-2: 積立・受取年数の確認
  if (input.investmentPlan.withdrawalYears <= 0) {
    warnings.push({
      type: 'warning',
      title: 'NISA受取年数エラー',
      message: 'NISAの取り崩し年数は1年以上に設定してください。',
    });
  }
  if (input.dcPlan.withdrawalType === 'split' && input.dcPlan.withdrawalYears <= 0) {
    warnings.push({
      type: 'warning',
      title: 'DC分割受取年数エラー',
      message: 'DCの分割受取年数は1年以上に設定してください。',
    });
  }

  // 住宅資金不整合等の警告を追加
  if (input.futureHousing.planType !== 'none') {
    const f = input.futureHousing;
    const sources = f.downPayment + f.loanAmount;
    const uses = f.propertyPrice;
    if (Math.abs(sources - uses) > 1) {
      warnings.push({
        type: 'warning',
        title: '住宅購入資金調達のアンバランス',
        message: `物件価格(${uses}万円)と調達合計(頭金+借入 ${sources}万円)に差額(${sources - uses}万円)があります。`,
      });
    }
  }

  return {
    recurringWithdrawalBalance: portfolioState.legacySnapshot,
    annualRows: rows,
    rows,
    summary: {
      peakAssets: { amount: Math.round(peakAssetAmount), age: peakAssetAge },
      shortfallAge: liquidAssetShortfallAge,
      liquidAssetShortfallAge,
      finalAssets,
      totalEducationExpenses: Math.round(totalEducationExpenses),
      totalMortgagePayments: Math.round(totalMortgagePayments),
      currentAnnualCashflow,
      cashDepletionAge,
      investmentWithdrawalStartAge,
      assetAtAge65,
      assetAtAge90,
      hasCheckWarning: checkWarnings.length > 0,
      checkWarningDetails: checkWarnings.length > 0 ? checkWarnings : undefined,
    },
    warnings,
  };
}

export const runCashflowSimulation = runLifePlanSimulation;

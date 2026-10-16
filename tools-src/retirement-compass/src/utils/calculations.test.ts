import assert from 'node:assert/strict';
import test from 'node:test';
import { CompassInputs, PastLumpSum } from '../types';
import {
  analyzePastLumpSums,
  calculateBasicDeduction2026,
  calculateCompanyRetirementTaxSummary,
  calculatePensionDeduction,
  calculateRetirementDeduction,
  calculateServiceYears,
  calculateServiceYearsBetween,
  calculateCustomCompassScenario,
  calculateDcContributionContinuationImpact,
  calculateDcTimingComparison,
  runCompassCalculation,
} from './calculations';

function createInputs(overrides: Partial<CompassInputs> = {}): CompassInputs {
  return {
    birthYearMonth: '1961-07',
    joinedYearMonth: '2014-04',
    dcJoinedYearMonth: '1979-04',
    dcJoinedEndYearMonth: '2026-07',
    companyRetirementAge: 65,
    companyRetirementEstimate: 1000,
    corporateDcEstimate: 2500,
    idecoEstimate: 0,
    dcIdecoReceiptAge: 65,
    dcIdecoReceiptMethod: 'lumpSum',
    publicPensionEstimate: 200,
    publicPensionStartAge: 65,
    workAfterRetirement: false,
    workUntilAge: 65,
    workAnnualSalary: 0,
    companyRetirementMonth: 7,
    companyRetirementPaymentMonth: 7,
    corporateDcJoinStart: '1979-04',
    corporateDcJoinEnd: '2026-07',
    idecoJoinStart: '',
    idecoJoinEnd: '',
    hasPastLumpSum: 'yes',
    pastLumpSums: [],
    ...overrides,
  };
}

function createPastLumpSum(overrides: Partial<PastLumpSum> = {}): PastLumpSum {
  return {
    id: 'past-1',
    name: '前職退職金',
    receiveYearMonth: '2014-04',
    amount: 1000,
    joinStart: '1979-04',
    joinEnd: '2014-04',
    type: 'companyRetirement',
    ...overrides,
  };
}

test('退職所得控除の基本式を計算する', () => {
  assert.equal(calculateRetirementDeduction(12), 480);
  assert.equal(calculateRetirementDeduction(20), 800);
  assert.equal(calculateRetirementDeduction(35), 1850);
});

test('勤続38年・退職金2400万円の会社退職金単体の課税関係を計算する', () => {
  assert.equal(calculateServiceYears('1989-04', '1966-07', 60), 38);

  const deduction = calculateRetirementDeduction(38);
  const summary = calculateCompanyRetirementTaxSummary(2400, deduction);

  assert.equal(deduction, 2060);
  assert.equal(summary.excessAmount, 340);
  assert.equal(summary.taxableRetirementIncome, 170);
  assert.equal(summary.estimatedTax, 25.68);
  assert.equal(summary.estimatedNetAmount, 2374.32);
});

test('令和8年分の基礎控除を合計所得金額別に返す', () => {
  assert.equal(calculateBasicDeduction2026(100), 104);
  assert.equal(calculateBasicDeduction2026(200), 88);
  assert.equal(calculateBasicDeduction2026(400), 68);
  assert.equal(calculateBasicDeduction2026(600), 67);
  assert.equal(calculateBasicDeduction2026(1000), 62);
});

test('公的年金等控除は年金収入1000万円超で195.5万円を上限とする', () => {
  assert.equal(calculatePensionDeduction(1200, 64), 195.5);
  assert.equal(calculatePensionDeduction(1200, 65), 195.5);
});

test('会社退職金の前に受けた通常の退職金は前年以前4年内だけを一般調整対象にする', () => {
  const past = createPastLumpSum({
    receiveYearMonth: '2022-04',
    joinStart: '2010-04',
    joinEnd: '2022-04',
    amount: 800,
  });
  const inputs = createInputs({
    birthYearMonth: '1961-07',
    joinedYearMonth: '2020-04',
    pastLumpSums: [past],
  });
  const years = calculateServiceYears(inputs.joinedYearMonth, inputs.birthYearMonth, 65);
  const analysis = analyzePastLumpSums(
    inputs,
    calculateRetirementDeduction(years),
    years,
    inputs.joinedYearMonth,
    65,
    'companyRetirement'
  );

  assert.equal(analysis.details[0].adjustmentRule, 'general-5-year');

  const outside = analyzePastLumpSums(
    { ...inputs, pastLumpSums: [{ ...past, receiveYearMonth: '2021-04' }] },
    calculateRetirementDeduction(years),
    years,
    inputs.joinedYearMonth,
    65,
    'companyRetirement'
  );
  assert.equal(outside.details[0].adjustmentRule, 'none');
});

test('2026年以後のDC一時金を先に受けた場合は前年以前9年内を10年ルール対象にする', () => {
  const pastDc = createPastLumpSum({
    type: 'corporateDc',
    receiveYearMonth: '2026-06',
    joinStart: '2001-04',
    joinEnd: '2026-06',
    amount: 1500,
  });
  const inputs = createInputs({
    birthYearMonth: '1970-07',
    joinedYearMonth: '2001-04',
    pastLumpSums: [pastDc],
  });
  const years = calculateServiceYears(inputs.joinedYearMonth, inputs.birthYearMonth, 65);
  const within = analyzePastLumpSums(
    inputs,
    calculateRetirementDeduction(years),
    years,
    inputs.joinedYearMonth,
    65,
    'companyRetirement'
  );
  assert.equal(within.details[0].adjustmentRule, 'dc-first-10-year');

  const outsideInputs = { ...inputs, birthYearMonth: '1971-07' };
  const outsideYears = calculateServiceYears(outsideInputs.joinedYearMonth, outsideInputs.birthYearMonth, 65);
  const outside = analyzePastLumpSums(
    outsideInputs,
    calculateRetirementDeduction(outsideYears),
    outsideYears,
    outsideInputs.joinedYearMonth,
    65,
    'companyRetirement'
  );
  assert.equal(outside.details[0].adjustmentRule, 'none');
});

test('DC一時金を今回受ける場合は前年以前19年内を調整対象にする', () => {
  const inputs = createInputs({
    birthYearMonth: '1968-07',
    pastLumpSums: [createPastLumpSum()],
  });
  const years = calculateServiceYears(inputs.dcJoinedYearMonth, inputs.birthYearMonth, 65);
  const within = analyzePastLumpSums(
    inputs,
    calculateRetirementDeduction(years),
    years,
    inputs.dcJoinedYearMonth,
    65,
    'dcIdeco'
  );
  assert.equal(within.details[0].adjustmentRule, 'dc-current-20-year');

  const outsideInputs = { ...inputs, birthYearMonth: '1969-07' };
  const outsideYears = calculateServiceYears(outsideInputs.dcJoinedYearMonth, outsideInputs.birthYearMonth, 65);
  const outside = analyzePastLumpSums(
    outsideInputs,
    calculateRetirementDeduction(outsideYears),
    outsideYears,
    outsideInputs.dcJoinedYearMonth,
    65,
    'dcIdeco'
  );
  assert.equal(outside.details[0].adjustmentRule, 'none');
});

test('過去一時金が当時の控除額未満なら支給額から求めた期間で重複を調整する', () => {
  const inputs = createInputs({ pastLumpSums: [createPastLumpSum()] });
  const years = calculateServiceYears(inputs.dcJoinedYearMonth, inputs.birthYearMonth, 65);
  const originalDeduction = calculateRetirementDeduction(years);
  const analysis = analyzePastLumpSums(
    inputs,
    originalDeduction,
    years,
    inputs.dcJoinedYearMonth,
    65,
    'dcIdeco'
  );

  assert.equal(years, 48);
  assert.equal(analysis.details[0].usedAmountBasedPeriod, true);
  assert.equal(analysis.details[0].effectivePastYears, 22);
  assert.equal(analysis.overlapYears, 22);
  assert.equal(analysis.reductionAmount, 940);
  assert.equal(analysis.adjustedDeduction, 1820);
});

test('前職退職金1000万円の事例は未使用控除を持ち越さず支給額相当22年で合算控除を調整する', () => {
  const inputs = createInputs({ pastLumpSums: [createPastLumpSum()] });
  const results = runCompassCalculation(inputs);

  assert.equal(results.combinedOriginalDeduction, 2760);
  assert.equal(results.combinedReductionAmount, 940);
  assert.equal(results.combinedAdjustedDeduction, 1820);
  assert.equal(results.lumpSumScenario.taxableIncome, 840);
});

test('会社退職金を先に受ける場合は今回の会社退職金を後のDC控除調整へ反映する', () => {
  const inputs = createInputs({
    birthYearMonth: '1966-07',
    joinedYearMonth: '1988-04',
    dcJoinedYearMonth: '2001-10',
    companyRetirementAge: 60,
    companyRetirementEstimate: 2000,
    corporateDcEstimate: 500,
    dcIdecoReceiptAge: 65,
    hasPastLumpSum: 'no',
  });
  const results = runCompassCalculation(inputs);

  assert.equal(results.lumpSumScenario.sameYearReceipt, false);
  assert.equal(results.companyRetirementDeduction, 2130);
  assert.equal(results.dcIdecoOriginalDeduction, 1150);
  assert.equal(results.dcIdecoAdjustedDeduction, 140);
  assert.equal(results.dcIdecoPastLumpSumAnalysis.details[0].name, '今回の会社退職金');
  assert.equal(results.dcIdecoPastLumpSumAnalysis.details[0].adjustmentRule, 'dc-current-20-year');
  assert.equal(results.lumpSumScenario.dcIdecoTaxableIncome, 180);
});

test('会社退職金とDCを同じ年に受ける場合だけ合算控除で計算する', () => {
  const inputs = createInputs({
    birthYearMonth: '1966-07',
    joinedYearMonth: '1988-04',
    dcJoinedYearMonth: '2001-10',
    companyRetirementAge: 60,
    companyRetirementEstimate: 2000,
    corporateDcEstimate: 500,
    dcIdecoReceiptAge: 60,
    hasPastLumpSum: 'no',
  });
  const results = runCompassCalculation(inputs);

  assert.equal(results.lumpSumScenario.sameYearReceipt, true);
  assert.equal(results.lumpSumScenario.deductionLimit, results.combinedAdjustedDeduction);
  assert.equal(results.lumpSumScenario.taxableIncome, 185);
});

test('DC一時金を先に受ける場合は今回DCを後の会社退職金の10年ルールへ反映する', () => {
  const inputs = createInputs({
    birthYearMonth: '1966-07',
    joinedYearMonth: '1988-04',
    dcJoinedYearMonth: '2001-10',
    companyRetirementAge: 65,
    companyRetirementEstimate: 2300,
    corporateDcEstimate: 500,
    dcIdecoReceiptAge: 60,
    hasPastLumpSum: 'no',
  });
  const results = runCompassCalculation(inputs);

  assert.equal(results.lumpSumScenario.sameYearReceipt, false);
  assert.equal(results.pastLumpSumAnalysis.details[0].name, '今回のDC/iDeCo一時金');
  assert.equal(results.pastLumpSumAnalysis.details[0].adjustmentRule, 'dc-first-10-year');
  assert.equal(results.companyRetirementDeduction, 2000);
  assert.equal(results.lumpSumScenario.companyTaxableIncome, 150);

  const custom = calculateCustomCompassScenario(inputs, results, 250);
  assert.ok(custom.companyRetirementTax < results.lumpSumScenario.estimatedTax);
});

test('DCの加入終了後に受取を待っても通算加入年数は増えない', () => {
  const serviceYears = calculateServiceYearsBetween('2001-10', '2026-07');
  const age65Result = runCompassCalculation(createInputs({
    birthYearMonth: '1966-07',
    joinedYearMonth: '1988-04',
    dcJoinedYearMonth: '2001-10',
    dcJoinedEndYearMonth: '2026-07',
    companyRetirementAge: 60,
    dcIdecoReceiptAge: 65,
    hasPastLumpSum: 'no',
  }));
  const age75Result = runCompassCalculation(createInputs({
    birthYearMonth: '1966-07',
    joinedYearMonth: '1988-04',
    dcJoinedYearMonth: '2001-10',
    dcJoinedEndYearMonth: '2026-07',
    companyRetirementAge: 60,
    dcIdecoReceiptAge: 75,
    hasPastLumpSum: 'no',
  }));

  assert.equal(serviceYears, 25);
  assert.equal(age65Result.dcIdecoOriginalDeduction, 1150);
  assert.equal(age75Result.dcIdecoOriginalDeduction, 1150);
});

test('会社退職後のDC受取候補を60・65・70・75歳で比較する', () => {
  const inputs = createInputs({
    birthYearMonth: '1966-07',
    joinedYearMonth: '1988-04',
    dcJoinedYearMonth: '2001-10',
    dcJoinedEndYearMonth: '2026-07',
    companyRetirementAge: 60,
    companyRetirementEstimate: 2000,
    corporateDcEstimate: 500,
    idecoEstimate: 0,
    dcIdecoReceiptAge: 65,
    hasPastLumpSum: 'no',
  });
  const comparison = calculateDcTimingComparison(inputs, 0);

  assert.deepEqual(comparison.map((item) => item.receiptAge), [60, 65, 70, 75]);
  assert.ok(comparison.every((item) => item.projectedDcIdecoTotal === 500));
  assert.equal(comparison[0].timingRule, 'same-year');
  assert.ok(comparison.slice(1).every((item) => item.timingRule === 'within-19-years'));
  assert.equal(comparison.find((item) => item.receiptAge === 65)?.isSelected, true);
});

test('比較用運用率は会社退職時点の基準残高を候補年齢へ換算する', () => {
  const inputs = createInputs({
    birthYearMonth: '1966-07',
    joinedYearMonth: '1988-04',
    dcJoinedYearMonth: '2001-10',
    dcJoinedEndYearMonth: '2026-07',
    companyRetirementAge: 60,
    corporateDcEstimate: 500,
    idecoEstimate: 0,
    dcIdecoReceiptAge: 65,
    hasPastLumpSum: 'no',
  });
  const comparison = calculateDcTimingComparison(inputs, 2);
  const age65 = comparison.find((item) => item.receiptAge === 65);
  const age70 = comparison.find((item) => item.receiptAge === 70);

  assert.equal(age65?.projectedDcIdecoTotal, 552.04);
  assert.equal(age70?.projectedDcIdecoTotal, 609.5);
});

test('月5000円の積立継続を候補年齢ごとの控除額と税額差へ反映する', () => {
  const inputs = createInputs({
    birthYearMonth: '1966-07',
    joinedYearMonth: '1988-04',
    dcJoinedYearMonth: '2001-10',
    dcJoinedEndYearMonth: '2026-07',
    companyRetirementAge: 60,
    companyRetirementEstimate: 2000,
    corporateDcEstimate: 500,
    idecoEstimate: 0,
    dcIdecoReceiptAge: 65,
    hasPastLumpSum: 'no',
  });
  const comparison = calculateDcTimingComparison(inputs, 0, 0.5, 500);
  const age60 = comparison.find((item) => item.receiptAge === 60);
  const age65 = comparison.find((item) => item.receiptAge === 65);
  const age70 = comparison.find((item) => item.receiptAge === 70);
  const age75 = comparison.find((item) => item.receiptAge === 75);

  assert.equal(age60?.additionalContributions, 0);
  assert.equal(age65?.contributionEndAge, 65);
  assert.equal(age65?.additionalContributions, 30);
  assert.equal(age65?.projectedDcIdecoTotal, 530);
  assert.equal(age65?.serviceYearsIncrease, 5);
  assert.equal(age65?.deductionIncreaseFromRetirementEnd, 350);
  assert.ok((age65?.taxDifferenceFromRetirementEnd ?? 0) < 0);

  assert.equal(age70?.contributionEndAge, 70);
  assert.equal(age70?.additionalContributions, 60);
  assert.equal(age70?.projectedDcIdecoTotal, 560);
  assert.equal(age70?.deductionIncreaseFromRetirementEnd, 700);

  assert.equal(age75?.contributionEndAge, 70);
  assert.equal(age75?.additionalContributions, 60);
  assert.equal(age75?.projectedDcIdecoTotal, 560);
});

test('会社退職後も掛金拠出を続けると加入年数とDC控除額の変化を表示できる', () => {
  const inputs = createInputs({
    birthYearMonth: '1966-07',
    joinedYearMonth: '1988-04',
    dcJoinedYearMonth: '2001-10',
    dcJoinedEndYearMonth: '2031-07',
    companyRetirementAge: 60,
    companyRetirementEstimate: 2000,
    corporateDcEstimate: 500,
    idecoEstimate: 0,
    dcIdecoReceiptAge: 65,
    hasPastLumpSum: 'no',
  });
  const impact = calculateDcContributionContinuationImpact(inputs);

  assert.equal(impact.companyRetirementYearMonth, '2026-07');
  assert.equal(impact.additionalServiceYears, 5);
  assert.equal(impact.retirementEndServiceYears, 25);
  assert.equal(impact.currentServiceYears, 30);
  assert.equal(impact.retirementEndOriginalDeduction, 1150);
  assert.equal(impact.currentOriginalDeduction, 1500);
  assert.equal(impact.originalDeductionIncrease, 350);
  assert.equal(impact.retirementEndAdjustedDeduction, 140);
  assert.equal(impact.currentAdjustedDeduction, 490);
  assert.equal(impact.adjustedDeductionIncrease, 350);
});

test('会社退職時に掛金拠出を終える設定では控除額の増加を0とする', () => {
  const inputs = createInputs({
    birthYearMonth: '1966-07',
    joinedYearMonth: '1988-04',
    dcJoinedYearMonth: '2001-10',
    dcJoinedEndYearMonth: '2026-07',
    companyRetirementAge: 60,
    companyRetirementEstimate: 2000,
    corporateDcEstimate: 500,
    idecoEstimate: 0,
    dcIdecoReceiptAge: 65,
    hasPastLumpSum: 'no',
  });
  const impact = calculateDcContributionContinuationImpact(inputs);

  assert.equal(impact.additionalServiceYears, 0);
  assert.equal(impact.originalDeductionIncrease, 0);
  assert.equal(impact.adjustedDeductionIncrease, 0);
});

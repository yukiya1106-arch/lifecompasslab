import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateAdjustedPublicPension,
  calculateRetirementTrajectory,
  findAssetZeroAge,
  RetirementProjectionInputs,
} from './retirementProjection';

function createInputs(
  overrides: Partial<RetirementProjectionInputs> = {}
): RetirementProjectionInputs {
  return {
    currentAge: 55,
    retirementAge: 60,
    workUntilAge: 65,
    retirementLumpSum: 1000,
    dcBalance: 1500,
    publicPensionAmount: 180,
    publicPensionStartAge: 65,
    pensionEarlyReductionRate: 0.004,
    financialAssets: 2000,
    annualLivingCost: 480,
    hasSpouse: true,
    largeDebt: 'none',
    spouseCurrentAge: 52,
    spousePensionAmount: 80,
    spousePensionStartAge: 65,
    includeKakyu: 'none',
    kakyuAmount: 40,
    ownerKosei20Years: 'undecided',
    spouseKosei20Years: 'undecided',
    reemploymentIncome: 240,
    corporatePensionAmount: 0,
    otherIncome: 0,
    dcPayoutType: 'annuity',
    dcStartAge: 65,
    investmentYield: 0,
    inflationRate: 0,
    houseRepairActive: false,
    houseRepairAge: 65,
    houseRepairAmount: 300,
    carActive: false,
    carAge: 70,
    carAmount: 250,
    medicalActive: false,
    medicalAge: 80,
    medicalAmount: 200,
    supportActive: false,
    supportAge: 60,
    supportAmount: 150,
    otherActive: false,
    otherAge: 75,
    otherAmount: 100,
    ...overrides,
  };
}

test('添付ケースの入力値を年次収支と資産残高へ反映する', () => {
  const inputs = createInputs();
  const trajectory = calculateRetirementTrajectory(inputs, {
    type: inputs.dcPayoutType,
    startAge: inputs.dcStartAge,
  });

  const age59 = trajectory.find((flow) => flow.age === 59);
  const age60 = trajectory.find((flow) => flow.age === 60);
  const age65 = trajectory.find((flow) => flow.age === 65);
  const age68 = trajectory.find((flow) => flow.age === 68);

  assert.equal(age59?.totalIncome, 0);
  assert.equal(age59?.totalExpense, 0);
  assert.equal(age59?.endOfYearAsset, 2000);
  assert.match(age59?.memo ?? '', /給与・生活費は収支均衡/);

  assert.equal(age60?.salaryIncome, 240);
  assert.equal(age60?.retirementLumpSum, 1000);
  assert.equal(age60?.livingCost, 480);
  assert.equal(age60?.endOfYearAsset, 2760);

  assert.equal(age65?.publicPension, 180);
  assert.equal(age65?.dcIncome, 150);
  assert.equal(age65?.endOfYearAsset, 1650);

  assert.equal(age68?.publicPension, 260);
  assert.equal(age68?.endOfYearAsset, 1280);
  assert.equal(findAssetZeroAge(trajectory), 78);
});

test('公的年金の受取開始年齢と繰下げ率を総合確認へ反映する', () => {
  const inputs = createInputs({ publicPensionStartAge: 70 });
  const trajectory = calculateRetirementTrajectory(inputs, {
    type: inputs.dcPayoutType,
    startAge: inputs.dcStartAge,
  });
  const age69 = trajectory.find((flow) => flow.age === 69);
  const age70 = trajectory.find((flow) => flow.age === 70);

  assert.equal(calculateAdjustedPublicPension(inputs), 255.6);
  assert.equal(age69?.publicPension, 80);
  assert.equal(age70?.publicPension, 335.6);
});

test('60歳からの繰上げ受取は月0.4%の減額率を反映する', () => {
  const inputs = createInputs({
    publicPensionStartAge: 60,
    pensionEarlyReductionRate: 0.004,
  });

  assert.equal(calculateAdjustedPublicPension(inputs), 136.8);
});

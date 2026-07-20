(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CompassEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.4.0';
  const EPS = 1e-9;

  // 令和5年度「子供の学習費調査」訂正後の概算（万円/年）
  const SCHOOL_COST = {
    kindergarten: { public: 17.7, private: 34.7 },
    elementary: { public: 36.7, private: 174.3 },
    middle: { public: 54.3, private: 155.7 },
    high: { public: 59.3, private: 117.3 },
    university: { public: 60.0, private: 131.0 },
    junior: { public: 86.4, private: 100.3 },
    vocational: { public: 100.0, private: 100.0 }
  };
  const AWAY_FROM_HOME_ADD = 48.0;

  // 基本生活費に対する、子どもの成長段階別の概算上乗せ額（万円/年・現在価値）
  // 既存の子は「現在との差分」のみを反映し、二重計上を避ける。
  const CHILD_LIVING_STAGE = [
    { min: 0, max: 5, value: 24 },
    { min: 6, max: 11, value: 36 },
    { min: 12, max: 14, value: 48 },
    { min: 15, max: 17, value: 60 },
    { min: 18, max: 21, value: 36 }
  ];

  const NET_ANCHORS = [
    [0, 0], [150, 130.5], [250, 210], [400, 320], [600, 462],
    [800, 592], [1000, 720], [1500, 1020], [2000, 1320], [3000, 1890]
  ];

  function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function int(value, fallback = 0) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, digits = 1) {
    const p = 10 ** digits;
    return Math.round((value + Number.EPSILON) * p) / p;
  }

  function deepMerge(base, extra) {
    if (Array.isArray(extra)) return extra.slice();
    if (!extra || typeof extra !== 'object') return extra === undefined ? base : extra;
    const out = Object.assign({}, base || {});
    Object.keys(extra).forEach((key) => {
      const source = extra[key];
      out[key] = source && typeof source === 'object' && !Array.isArray(source)
        ? deepMerge(base && base[key] || {}, source)
        : source;
    });
    return out;
  }

  function estimateNetIncome(gross) {
    gross = Math.max(0, num(gross));
    if (gross <= 0) return 0;
    for (let i = 1; i < NET_ANCHORS.length; i++) {
      const [x1, y1] = NET_ANCHORS[i - 1];
      const [x2, y2] = NET_ANCHORS[i];
      if (gross <= x2) {
        const ratio = (gross - x1) / (x2 - x1);
        return y1 + (y2 - y1) * ratio;
      }
    }
    const [x1, y1] = NET_ANCHORS[NET_ANCHORS.length - 2];
    const [x2, y2] = NET_ANCHORS[NET_ANCHORS.length - 1];
    const slope = (y2 - y1) / (x2 - x1);
    return y2 + (gross - x2) * slope;
  }

  function pensionFactor(startAge, birthYear) {
    startAge = clamp(int(startAge, 65), 60, 75);
    if (startAge === 65) return 1;
    const months = Math.abs(startAge - 65) * 12;
    if (startAge < 65) {
      const monthlyReduction = birthYear && birthYear <= 1962 ? 0.005 : 0.004;
      return Math.max(0, 1 - monthlyReduction * months);
    }
    return 1 + 0.007 * months;
  }

  function monthlyPayment(principal, annualRatePct, termYears) {
    principal = Math.max(0, num(principal));
    termYears = Math.max(0, num(termYears));
    if (!principal || !termYears) return 0;
    const n = Math.round(termYears * 12);
    const r = Math.max(0, num(annualRatePct)) / 100 / 12;
    if (r <= EPS) return principal / n;
    return principal * r * ((1 + r) ** n) / (((1 + r) ** n) - 1);
  }

  function childStage(age) {
    age = num(age, -99);
    if (age >= 3 && age <= 5) return 'kindergarten';
    if (age >= 6 && age <= 11) return 'elementary';
    if (age >= 12 && age <= 14) return 'middle';
    if (age >= 15 && age <= 17) return 'high';
    if (age >= 18 && age <= 21) return 'university';
    return 'none';
  }

  function childLivingCost(age) {
    for (const stage of CHILD_LIVING_STAGE) {
      if (age >= stage.min && age <= stage.max) return stage.value;
    }
    return 0;
  }

  function schoolTypeForStage(route, stage) {
    route = route || 'public';
    if (route === 'private') return 'private';
    if (route === 'middlePrivate') {
      return ['middle', 'high', 'university', 'junior', 'vocational'].includes(stage) ? 'private' : 'public';
    }
    if (route === 'highPrivate') {
      return ['high', 'university', 'junior', 'vocational'].includes(stage) ? 'private' : 'public';
    }
    if (route === 'universityPrivate') {
      return ['university', 'junior', 'vocational'].includes(stage) ? 'private' : 'public';
    }
    return 'public';
  }

  function educationCostCurrentValue(child, age, projectionYearIndex) {
    const finalEdu = child.finalEdu || 'university';
    const route = child.route || 'public';
    const currentAge = child.timing === 'planned'
      ? -Math.max(1, int(child.yearsUntilBirth, 1))
      : num(child.age, 0);

    const stage = childStage(age);
    if (stage === 'none') return 0;

    const currentStage = childStage(currentAge);
    const actualCurrent = Math.max(0, num(child.currentEducation, 0));
    if (actualCurrent > 0 && stage === currentStage && projectionYearIndex >= 0) {
      return actualCurrent;
    }

    if (stage === 'university') {
      if (finalEdu === 'high') return 0;
      if ((finalEdu === 'junior' || finalEdu === 'vocational') && age > 19) return 0;
      if (finalEdu === 'university' && age > 21) return 0;
      const key = finalEdu === 'junior' ? 'junior' : finalEdu === 'vocational' ? 'vocational' : 'university';
      const schoolType = schoolTypeForStage(route, key);
      let cost = SCHOOL_COST[key][schoolType];
      if (child.away === true || child.away === 'yes') cost += AWAY_FROM_HOME_ADD;
      return cost;
    }

    const schoolType = schoolTypeForStage(route, stage);
    return SCHOOL_COST[stage][schoolType] || 0;
  }

  function normalizePerson(raw, baseAge) {
    raw = raw || {};
    const currentGross = Math.max(0, num(raw.gross, 0));
    const currentNet = Math.max(0, num(raw.net, 0));
    const changes = Array.isArray(raw.changes) ? raw.changes
      .map((c) => ({ age: int(c.age, 0), gross: Math.max(0, num(c.gross, 0)) }))
      .filter((c) => c.age > baseAge && c.gross >= 0)
      .sort((a, b) => a.age - b.age) : [];
    return {
      currentGross,
      currentNet,
      growthRate: num(raw.growthRate, 0),
      growthUntilAge: Math.max(baseAge, int(raw.growthUntilAge, baseAge)),
      changes,
      retireAge: int(raw.retireAge, 65),
      pensionStartAge: int(raw.pensionStartAge, 65),
      pensionMonthly65: Math.max(0, num(raw.pensionMonthly65, 0)),
      severance: Math.max(0, num(raw.severance, 0)),
      otherAnnual: Math.max(0, num(raw.otherAnnual, 0)),
      otherIncomeEndAge: int(raw.otherIncomeEndAge, int(raw.retireAge, 65)),
      birthYear: int(raw.birthYear, 0)
    };
  }

  function grossAtAge(person, baseAge, age) {
    if (age >= person.retireAge) return 0;
    let milestoneAge = baseAge;
    let milestoneGross = person.currentGross;
    for (const change of person.changes || []) {
      if (change.age <= age && change.age > milestoneAge) {
        milestoneAge = change.age;
        milestoneGross = change.gross;
      }
    }
    const growthEnd = Math.min(age, person.growthUntilAge);
    const years = Math.max(0, growthEnd - milestoneAge);
    return milestoneGross * ((1 + person.growthRate / 100) ** years);
  }

  function netAtAge(person, baseAge, age) {
    const gross = grossAtAge(person, baseAge, age);
    if (gross <= 0) return 0;
    if (person.currentNet > 0 && person.currentGross > 0) {
      const ratio = person.currentNet / person.currentGross;
      return gross * ratio;
    }
    return estimateNetIncome(gross);
  }

  function pensionAtAge(person, age) {
    if (age < person.pensionStartAge) return 0;
    const annual65 = person.pensionMonthly65 * 12;
    return annual65 * pensionFactor(person.pensionStartAge, person.birthYear);
  }

  function createMortgage(housing) {
    const price = Math.max(0, num(housing.price, 0));
    const down = Math.min(price, Math.max(0, num(housing.downPayment, 0)));
    const misc = price * Math.max(0, num(housing.miscRate, 0)) / 100;
    const miscInLoan = housing.miscInLoan === true || housing.miscInLoan === 'yes';
    const principal = Math.max(0, price - down + (miscInLoan ? misc : 0));
    const termYears = Math.max(1, int(housing.loanTerm, 35));
    const rate = Math.max(0, num(housing.interestRate, 0));
    return {
      principal,
      balance: principal,
      monthlyPayment: monthlyPayment(principal, rate, termYears),
      annualRate: rate,
      monthsRemaining: termYears * 12,
      upfront: down + (miscInLoan ? 0 : misc),
      misc,
      termYears,
      totalInterest: 0
    };
  }

  function createExistingMortgage(housing) {
    const balance = Math.max(0, num(housing.currentMortgageBalance, 0));
    const termYears = Math.max(1, int(housing.currentMortgageRemainingYears, 25));
    const rate = Math.max(0, num(housing.currentMortgageRate, 0));
    return {
      principal: balance,
      balance,
      monthlyPayment: monthlyPayment(balance, rate, termYears),
      annualRate: rate,
      monthsRemaining: termYears * 12,
      upfront: 0,
      misc: 0,
      termYears,
      totalInterest: 0
    };
  }

  function payMortgageYear(mortgage) {
    if (!mortgage || mortgage.monthsRemaining <= 0 || mortgage.balance <= EPS) {
      return { payment: 0, interest: 0, principal: 0 };
    }
    let payment = 0;
    let interest = 0;
    let principalPaid = 0;
    const r = mortgage.annualRate / 100 / 12;
    const months = Math.min(12, mortgage.monthsRemaining);
    for (let m = 0; m < months; m++) {
      const interestPart = mortgage.balance * r;
      let principalPart = Math.max(0, mortgage.monthlyPayment - interestPart);
      let monthPayment = mortgage.monthlyPayment;
      if (principalPart > mortgage.balance) {
        principalPart = mortgage.balance;
        monthPayment = principalPart + interestPart;
      }
      mortgage.balance = Math.max(0, mortgage.balance - principalPart);
      mortgage.monthsRemaining -= 1;
      payment += monthPayment;
      interest += interestPart;
      principalPaid += principalPart;
      if (mortgage.balance <= EPS) break;
    }
    mortgage.totalInterest += interest;
    return { payment, interest, principal: principalPaid };
  }

  function mortgagePreview(housing, buyAge) {
    const mortgage = createMortgage(housing || {});
    const months = mortgage.termYears * 12;
    const totalPayment = mortgage.monthlyPayment * months;
    return {
      principal: round(mortgage.principal, 1),
      monthlyPayment: round(mortgage.monthlyPayment, 2),
      annualPayment: round(mortgage.monthlyPayment * 12, 1),
      totalPayment: round(totalPayment, 1),
      totalInterest: round(Math.max(0, totalPayment - mortgage.principal), 1),
      upfront: round(mortgage.upfront, 1),
      misc: round(mortgage.misc, 1),
      completionAge: int(buyAge, 0) + mortgage.termYears,
      termYears: mortgage.termYears
    };
  }

  function existingMortgagePreview(housing, currentAge) {
    const mortgage = createExistingMortgage(housing || {});
    const months = mortgage.termYears * 12;
    const totalPayment = mortgage.monthlyPayment * months;
    return {
      balance: round(mortgage.balance, 1),
      monthlyPayment: round(mortgage.monthlyPayment, 2),
      annualPayment: round(mortgage.monthlyPayment * 12, 1),
      totalPayment: round(totalPayment, 1),
      totalInterest: round(Math.max(0, totalPayment - mortgage.balance), 1),
      completionAge: int(currentAge, 0) + mortgage.termYears,
      termYears: mortgage.termYears
    };
  }

  function homeSalePreview(housing, currentAge) {
    const currentType = housing && housing.currentType || 'rent';
    const saleAge = int(housing && housing.buyAge, int(currentAge, 35) + 1);
    let remainingBalance = 0;
    if (currentType === 'ownerLoan') {
      const mortgage = createExistingMortgage(housing || {});
      const yearsBeforeSale = Math.max(0, saleAge - int(currentAge, 35));
      for (let i = 0; i < yearsBeforeSale; i++) payMortgageYear(mortgage);
      remainingBalance = mortgage.balance;
    }
    const salePrice = Math.max(0, num(housing && housing.expectedSalePrice, 0));
    const saleCost = salePrice * Math.max(0, num(housing && housing.saleCostRate, 0)) / 100;
    const netProceeds = salePrice - saleCost - remainingBalance;
    return {
      saleAge,
      salePrice: round(salePrice, 1),
      saleCost: round(saleCost, 1),
      remainingBalance: round(remainingBalance, 1),
      netProceeds: round(netProceeds, 1),
      requiredCash: round(Math.max(0, -netProceeds), 1)
    };
  }

  function defaultData() {
    const currentYear = new Date().getFullYear();
    return {
      meta: { version: VERSION, currentYear, horizonAge: 90, inflationRate: 1.0 },
      family: { selfAge: 35, hasSpouse: true, spouseAge: 33, children: [] },
      income: {
        self: { gross: 600, net: '', growthRate: 1, growthUntilAge: 50, changes: [], retireAge: 65, pensionStartAge: 65, pensionMonthly65: 15, severance: 1000, otherAnnual: 0, otherIncomeEndAge: 65 },
        spouse: { gross: 400, net: '', growthRate: 1, growthUntilAge: 50, changes: [], retireAge: 65, pensionStartAge: 65, pensionMonthly65: 10, severance: 500, otherAnnual: 0, otherIncomeEndAge: 65 }
      },
      living: { baseMonthly: 25, otherAnnual: 30, inflateOther: true, childLivingAdjust: true },
      assets: { cash: 500, investment: 200, retirement: 100, investReturn: 3, retirementReturn: 3, monthlyInvestment: 5, investmentStartAge: 35, investmentEndAge: 60, withdrawalStartAge: 65, withdrawalMethod: 'annuity', withdrawalYears: 20, autoEmergencyWithdrawal: true, monthlyRetirement: 2, retirementContributionEndAge: 60, retirementReceiveAge: 65 },
      housing: { currentType: 'rent', monthlyCost: 10, currentCostEndAge: 99, currentAnnualAfterEnd: 0, currentOwnerMonthlyCost: 2, currentOwnerAnnualMaintenance: 20, currentMortgageBalance: 2500, currentMortgageRate: 1.0, currentMortgageRemainingYears: 25, purchasePlan: false, currentHomeDisposition: 'sell', expectedSalePrice: 3500, saleCostRate: 4, buyAge: 40, price: 4500, downPayment: 500, miscRate: 7, miscInLoan: false, loanTerm: 35, interestRate: 1.0, annualMaintenance: 30 },
      insurance: { annualPremium: 24, premiumEndAge: 65 },
      events: []
    };
  }

  function normalizeData(rawData) {
    const merged = deepMerge(defaultData(), rawData || {});
    if ((merged.living.baseMonthly === '' || merged.living.baseMonthly == null) && merged.living.baseAnnual != null) {
      merged.living.baseMonthly = num(merged.living.baseAnnual, 0) / 12;
    }
    const rawAssets = rawData && rawData.assets ? rawData.assets : {};
    if (rawAssets.investmentStartAge == null || rawAssets.investmentStartAge === '') {
      merged.assets.investmentStartAge = int(merged.family.selfAge, 35);
    }
    if (rawAssets.withdrawalStartAge == null || rawAssets.withdrawalStartAge === '') {
      merged.assets.withdrawalStartAge = Math.max(int(merged.assets.investmentEndAge, 60) + 1, int(merged.income.self.retireAge, 65));
    }
    if (!['lump', 'equal', 'annuity'].includes(merged.assets.withdrawalMethod)) merged.assets.withdrawalMethod = 'annuity';
    merged.assets.withdrawalYears = clamp(int(merged.assets.withdrawalYears, 20), 1, 50);
    merged.assets.autoEmergencyWithdrawal = merged.assets.autoEmergencyWithdrawal !== false && merged.assets.autoEmergencyWithdrawal !== 'no';
    merged.housing = merged.housing || {};
    if (merged.housing.currentType === 'owner') {
      merged.housing.currentType = num(merged.housing.currentMortgageBalance, 0) > 0 ? 'ownerLoan' : 'ownerNoLoan';
      if (merged.housing.currentOwnerMonthlyCost == null || merged.housing.currentOwnerMonthlyCost === '') merged.housing.currentOwnerMonthlyCost = num(merged.housing.monthlyCost, 0);
    }
    if (!['rent', 'ownerLoan', 'ownerNoLoan', 'family'].includes(merged.housing.currentType)) merged.housing.currentType = 'rent';
    if (!['sell', 'retain', 'undecided'].includes(merged.housing.currentHomeDisposition)) merged.housing.currentHomeDisposition = 'sell';
    return merged;
  }

  function annuityWithdrawal(principal, annualRate, years) {
    principal = Math.max(0, num(principal, 0));
    years = clamp(int(years, 1), 1, 50);
    annualRate = clamp(num(annualRate, 0), -0.95, 1);
    if (principal <= EPS) return 0;
    if (Math.abs(annualRate) <= EPS) return principal / years;
    const denominator = 1 - (1 + annualRate) ** (-years);
    if (Math.abs(denominator) <= EPS) return principal / years;
    return principal * annualRate / denominator;
  }

  function investmentPlanPreview(rawAssets, currentAge) {
    const a = deepMerge(defaultData().assets, rawAssets || {});
    const age0 = clamp(int(currentAge, 35), 18, 85);
    const startAge = clamp(int(a.investmentStartAge, age0), age0, 100);
    const endAge = clamp(int(a.investmentEndAge, Math.max(age0, 60)), startAge, 100);
    const withdrawalStartAge = clamp(int(a.withdrawalStartAge, Math.max(endAge + 1, 65)), age0, 110);
    const years = clamp(int(a.withdrawalYears, 20), 1, 50);
    const method = ['lump', 'equal', 'annuity'].includes(a.withdrawalMethod) ? a.withdrawalMethod : 'annuity';
    const rate = clamp(num(a.investReturn, 3), -20, 20) / 100;
    const annualContribution = Math.max(0, num(a.monthlyInvestment, 0)) * 12;
    let balance = Math.max(0, num(a.investment, 0));
    for (let age = age0; age < withdrawalStartAge; age++) {
      balance *= (1 + rate);
      if (age >= startAge && age <= endAge) balance += annualContribution;
    }
    const annualWithdrawal = method === 'lump'
      ? balance
      : method === 'equal'
        ? balance / years
        : annuityWithdrawal(balance, rate, years);
    return {
      projectedBalance: round(balance, 1),
      annualWithdrawal: round(annualWithdrawal, 1),
      monthlyWithdrawal: round(annualWithdrawal / 12, 2),
      withdrawalStartAge,
      endAge: method === 'lump' ? withdrawalStartAge : withdrawalStartAge + years - 1,
      method,
      years
    };
  }

  function project(rawData) {
    const data = normalizeData(rawData);
    const currentYear = int(data.meta.currentYear, new Date().getFullYear());
    const selfAge0 = clamp(int(data.family.selfAge, 35), 18, 85);
    const hasSpouse = data.family.hasSpouse === true || data.family.hasSpouse === 'yes';
    const spouseAge0 = hasSpouse ? clamp(int(data.family.spouseAge, selfAge0), 18, 85) : null;
    const horizonAge = clamp(int(data.meta.horizonAge, 90), Math.max(selfAge0, spouseAge0 || selfAge0) + 1, 110);
    const projectionYears = Math.max(
      horizonAge - selfAge0,
      hasSpouse ? horizonAge - spouseAge0 : 0
    );
    const finalSelfAge = selfAge0 + projectionYears;
    const finalSpouseAge = hasSpouse ? spouseAge0 + projectionYears : null;
    const inflationRate = clamp(num(data.meta.inflationRate, 1), -3, 10) / 100;
    const children = Array.isArray(data.family.children) ? data.family.children : [];

    const self = normalizePerson(data.income.self, selfAge0);
    const spouse = hasSpouse ? normalizePerson(data.income.spouse, spouseAge0) : null;
    if (!self.birthYear) self.birthYear = currentYear - selfAge0;
    if (spouse && !spouse.birthYear) spouse.birthYear = currentYear - spouseAge0;

    let cash = num(data.assets.cash, 0);
    let investment = Math.max(0, num(data.assets.investment, 0));
    let retirement = Math.max(0, num(data.assets.retirement, 0));
    const initialFinancialAssets = cash + investment + retirement;
    let mortgage = null;
    let purchased = false;
    const currentHomeType = data.housing.currentType || 'rent';
    const currentHomeIsOwned = currentHomeType === 'ownerLoan' || currentHomeType === 'ownerNoLoan';
    const currentHomeDisposition = data.housing.currentHomeDisposition || 'sell';
    let existingMortgage = currentHomeType === 'ownerLoan' ? createExistingMortgage(data.housing) : null;
    let currentHomeSold = false;
    let homeSaleProcessed = false;
    let retirementReleased = false;

    const investReturn = clamp(num(data.assets.investReturn, 3), -20, 20) / 100;
    const retirementReturn = clamp(num(data.assets.retirementReturn, 3), -20, 20) / 100;
    const annualInvestContribution = Math.max(0, num(data.assets.monthlyInvestment, 0)) * 12;
    const annualRetirementContribution = Math.max(0, num(data.assets.monthlyRetirement, 0)) * 12;
    const investStartAge = clamp(int(data.assets.investmentStartAge, selfAge0), selfAge0, 100);
    const investEndAge = clamp(int(data.assets.investmentEndAge, self.retireAge), investStartAge, 100);
    const withdrawalStartAge = clamp(int(data.assets.withdrawalStartAge, Math.max(investEndAge + 1, self.retireAge)), selfAge0, 110);
    const withdrawalMethod = ['lump', 'equal', 'annuity'].includes(data.assets.withdrawalMethod) ? data.assets.withdrawalMethod : 'annuity';
    const withdrawalYears = clamp(int(data.assets.withdrawalYears, 20), 1, 50);
    const autoEmergencyWithdrawal = data.assets.autoEmergencyWithdrawal !== false && data.assets.autoEmergencyWithdrawal !== 'no';
    const effectiveInvestEndAge = Math.min(investEndAge, withdrawalStartAge - 1);
    const retirementContributionEndAge = int(data.assets.retirementContributionEndAge, self.retireAge);
    const retirementReceiveAge = int(data.assets.retirementReceiveAge, 65);
    let plannedAnnualWithdrawal = null;

    const baseLiving = Math.max(0, num(data.living.baseMonthly, num(data.living.baseAnnual, 0) / 12)) * 12;
    const otherAnnualBase = Math.max(0, num(data.living.otherAnnual, 0));
    const insuranceAnnual = Math.max(0, num(data.insurance.annualPremium, 0));
    const insuranceEndAge = int(data.insurance.premiumEndAge, self.retireAge);
    const purchasePlan = data.housing.purchasePlan === true || data.housing.purchasePlan === 'yes';
    const buyAge = int(data.housing.buyAge, 99);

    const rows = [];
    const events = [];
    let firstCashShortfallAge = null;
    let firstLiquidShortfallAge = null;
    let firstTotalShortfallAge = null;
    let firstPlannedWithdrawalAge = null;
    let firstEmergencyWithdrawalAge = null;
    let minCash = cash;
    let minCashAge = selfAge0;
    let minLiquid = cash + investment;
    let minLiquidAge = selfAge0;
    let maxAnnualDeficit = 0;
    let maxAnnualDeficitAge = null;
    let maxReconciliationGap = 0;

    rows.push({
      index: -1,
      year: currentYear,
      selfAge: selfAge0,
      spouseAge: spouseAge0,
      openingCash: round(cash),
      openingInvestment: round(investment),
      openingRetirement: round(retirement),
      openingTotalFinancialAssets: round(initialFinancialAssets),
      income: 0,
      recurringIncome: 0,
      expense: 0,
      assetTransactionInflow: 0,
      assetTransactionOutflow: 0,
      netAssetTransaction: 0,
      annualBalance: 0,
      cashChange: 0,
      plannedInvestmentWithdrawal: 0,
      emergencyInvestmentWithdrawal: 0,
      investmentWithdrawal: 0,
      cash: round(cash),
      investment: round(investment),
      retirement: round(retirement),
      liquidAssets: round(cash + investment),
      totalFinancialAssets: round(initialFinancialAssets),
      cashShortfall: round(Math.max(0, -cash)),
      totalShortfall: round(Math.max(0, -initialFinancialAssets)),
      reconciliationGap: 0,
      currentMortgageBalance: round(existingMortgage ? existingMortgage.balance : 0),
      newMortgageBalance: 0,
      mortgageBalance: round(existingMortgage ? existingMortgage.balance : 0),
      homeSaleNet: 0,
      isSnapshot: true
    });

    for (let idx = 0; idx <= projectionYears; idx++) {
      const year = currentYear + idx;
      const selfAge = selfAge0 + idx;
      const spouseAge = hasSpouse ? spouseAge0 + idx : null;
      const inflationFactor = (1 + inflationRate) ** idx;

      const openingCash = cash;
      const openingInvestment = investment;
      const openingRetirement = retirement;
      const openingTotalFinancialAssets = openingCash + openingInvestment + openingRetirement;

      const distributionWithoutGrowth = (withdrawalMethod === 'equal' || withdrawalMethod === 'lump') && selfAge >= withdrawalStartAge;
      const investmentReturnAmount = distributionWithoutGrowth ? 0 : openingInvestment * investReturn;
      const retirementReturnAmount = openingRetirement * retirementReturn;
      investment = openingInvestment + investmentReturnAmount;
      retirement = openingRetirement + retirementReturnAmount;

      let retirementRelease = 0;
      if (!retirementReleased && selfAge >= retirementReceiveAge && retirement > 0) {
        retirementRelease = retirement;
        retirement = 0;
        retirementReleased = true;
        events.push({ year, age: selfAge, type: 'retirement-release', label: 'DC・iDeCo等を現預金へ移転', amount: round(retirementRelease) });
      }

      const selfEmployment = netAtAge(self, selfAge0, selfAge);
      const spouseEmployment = spouse ? netAtAge(spouse, spouseAge0, spouseAge) : 0;
      const selfPension = pensionAtAge(self, selfAge);
      const spousePension = spouse ? pensionAtAge(spouse, spouseAge) : 0;
      const selfOther = selfAge <= self.otherIncomeEndAge ? self.otherAnnual : 0;
      const spouseOther = spouse && spouseAge <= spouse.otherIncomeEndAge ? spouse.otherAnnual : 0;
      const selfSeverance = selfAge === self.retireAge ? self.severance : 0;
      const spouseSeverance = spouse && spouseAge === spouse.retireAge ? spouse.severance : 0;
      let oneTimeIncome = 0;
      let oneTimeExpense = 0;

      for (const ev of data.events) {
        if (int(ev.ageSelf, -1) !== selfAge) continue;
        const amount = Math.max(0, num(ev.amount, 0)) * ((ev.inflate === true || ev.inflate === 'yes') ? inflationFactor : 1);
        if (ev.kind === 'income') oneTimeIncome += amount;
        else oneTimeExpense += amount;
        events.push({ year, age: selfAge, type: ev.kind || 'expense', label: ev.label || 'ライフイベント', amount: round(amount) });
      }

      const employmentIncome = selfEmployment + spouseEmployment;
      const pensionIncome = selfPension + spousePension;
      const severanceIncome = selfSeverance + spouseSeverance;
      const otherIncome = selfOther + spouseOther + oneTimeIncome;
      const recurringIncome = employmentIncome + pensionIncome + selfOther + spouseOther;
      const totalIncome = employmentIncome + pensionIncome + severanceIncome + otherIncome;

      let childLivingAdjustment = 0;
      let education = 0;
      for (const child of children) {
        const childAge0 = child.timing === 'planned'
          ? -Math.max(1, int(child.yearsUntilBirth, 1))
          : num(child.age, 0);
        const childAge = childAge0 + idx;
        if (data.living.childLivingAdjust === true || data.living.childLivingAdjust === 'yes') {
          const baseStage = child.timing === 'planned' ? 0 : childLivingCost(childAge0);
          const futureStage = childLivingCost(childAge);
          childLivingAdjustment += (futureStage - baseStage) * inflationFactor;
        }
        education += educationCostCurrentValue(child, childAge, idx) * inflationFactor;
      }

      const livingExpense = Math.max(0, baseLiving * inflationFactor + childLivingAdjustment);
      const otherAnnual = otherAnnualBase * ((data.living.inflateOther === true || data.living.inflateOther === 'yes') ? inflationFactor : 1);
      const insurance = selfAge <= insuranceEndAge ? insuranceAnnual : 0;

      let housingExpense = 0;
      let mortgageInterest = 0;
      let mortgagePrincipal = 0;
      let currentMortgageInterest = 0;
      let currentMortgagePrincipal = 0;
      let newMortgageInterest = 0;
      let newMortgagePrincipal = 0;
      let homeUpfront = 0;
      let homeSaleNet = 0;
      let homeSalePrice = 0;
      let homeSaleCost = 0;
      let currentMortgagePayoff = 0;

      // 住み替え年は年初に現在の住宅を売却し、その後に新居を購入する簡易前提。
      if (purchasePlan && !purchased && selfAge >= buyAge) {
        if (currentHomeIsOwned && currentHomeDisposition === 'sell' && !homeSaleProcessed) {
          homeSalePrice = Math.max(0, num(data.housing.expectedSalePrice, 0));
          homeSaleCost = homeSalePrice * Math.max(0, num(data.housing.saleCostRate, 0)) / 100;
          currentMortgagePayoff = existingMortgage ? existingMortgage.balance : 0;
          homeSaleNet = homeSalePrice - homeSaleCost - currentMortgagePayoff;
          events.push({ year, age: selfAge, type: homeSaleNet >= 0 ? 'home-sale' : 'home-sale-loss', label: homeSaleNet >= 0 ? '現在の住宅を売却' : '住宅売却時の追加資金', amount: round(Math.abs(homeSaleNet)) });
          if (existingMortgage) {
            existingMortgage.balance = 0;
            existingMortgage.monthsRemaining = 0;
          }
          currentHomeSold = true;
          homeSaleProcessed = true;
        }
        mortgage = createMortgage(data.housing);
        purchased = true;
        homeUpfront = mortgage.upfront;
        events.push({ year, age: selfAge, type: 'home', label: '新しい住宅を購入', amount: round(homeUpfront) });
      }

      // 現在の住まい。売却した場合のみ住居費を停止し、保有継続なら新居購入後も残す。
      if (!currentHomeSold) {
        if (currentHomeType === 'ownerLoan' || currentHomeType === 'ownerNoLoan') {
          if (currentHomeType === 'ownerLoan' && existingMortgage) {
            const paid = payMortgageYear(existingMortgage);
            housingExpense += paid.payment;
            currentMortgageInterest = paid.interest;
            currentMortgagePrincipal = paid.principal;
          }
          housingExpense += Math.max(0, num(data.housing.currentOwnerMonthlyCost, 0)) * 12 * inflationFactor;
          housingExpense += Math.max(0, num(data.housing.currentOwnerAnnualMaintenance, 0)) * inflationFactor;
        } else if (!purchased) {
          const currentEndAge = int(data.housing.currentCostEndAge, 999);
          if (selfAge <= currentEndAge) housingExpense += Math.max(0, num(data.housing.monthlyCost, 0)) * 12 * inflationFactor;
          else housingExpense += Math.max(0, num(data.housing.currentAnnualAfterEnd, 0)) * inflationFactor;
        }
      }

      // 新居のローンと維持費。現在の住宅を保有する場合は両方を計上する。
      if (purchased) {
        const paid = payMortgageYear(mortgage);
        housingExpense += paid.payment;
        newMortgageInterest = paid.interest;
        newMortgagePrincipal = paid.principal;
        housingExpense += Math.max(0, num(data.housing.annualMaintenance, 0)) * inflationFactor;
      }
      mortgageInterest = currentMortgageInterest + newMortgageInterest;
      mortgagePrincipal = currentMortgagePrincipal + newMortgagePrincipal;

      const investContribution = selfAge >= investStartAge && selfAge <= effectiveInvestEndAge ? annualInvestContribution : 0;
      const retirementContribution = selfAge <= retirementContributionEndAge && selfAge < retirementReceiveAge ? annualRetirementContribution : 0;
      const totalExpense = livingExpense + otherAnnual + education + housingExpense + insurance + oneTimeExpense;
      const householdBalance = totalIncome - totalExpense;
      const assetTransactionInflow = Math.max(0, homeSaleNet);
      const assetTransactionOutflow = homeUpfront + Math.max(0, -homeSaleNet);
      const netAssetTransaction = assetTransactionInflow - assetTransactionOutflow;

      investment += investContribution;
      retirement += retirementContribution;

      let plannedInvestmentWithdrawal = 0;
      if (selfAge >= withdrawalStartAge && investment > EPS) {
        const installmentNumber = selfAge - withdrawalStartAge + 1;
        if (firstPlannedWithdrawalAge === null) {
          firstPlannedWithdrawalAge = selfAge;
          events.push({ year, age: selfAge, type: 'investment-withdrawal-start', label: 'NISA等の計画的な取り崩し開始', amount: 0 });
        }
        if (withdrawalMethod === 'lump' && selfAge === withdrawalStartAge) {
          plannedInvestmentWithdrawal = investment;
        } else if (withdrawalMethod !== 'lump' && installmentNumber <= withdrawalYears) {
          if (plannedAnnualWithdrawal === null) {
            const principalAtStart = openingInvestment;
            plannedAnnualWithdrawal = withdrawalMethod === 'equal'
              ? principalAtStart / withdrawalYears
              : annuityWithdrawal(principalAtStart, investReturn, withdrawalYears);
          }
          plannedInvestmentWithdrawal = installmentNumber === withdrawalYears
            ? investment
            : Math.min(investment, Math.max(0, plannedAnnualWithdrawal));
        }
      }
      plannedInvestmentWithdrawal = Math.min(investment, Math.max(0, plannedInvestmentWithdrawal));
      investment -= plannedInvestmentWithdrawal;

      let cashBeforeEmergency = openingCash + householdBalance + netAssetTransaction - investContribution - retirementContribution + retirementRelease + plannedInvestmentWithdrawal;
      let emergencyInvestmentWithdrawal = 0;
      if (autoEmergencyWithdrawal && cashBeforeEmergency < -EPS && investment > EPS) {
        emergencyInvestmentWithdrawal = Math.min(-cashBeforeEmergency, investment);
        investment -= emergencyInvestmentWithdrawal;
        cashBeforeEmergency += emergencyInvestmentWithdrawal;
        if (firstEmergencyWithdrawalAge === null) {
          firstEmergencyWithdrawalAge = selfAge;
          events.push({ year, age: selfAge, type: 'investment-emergency-withdrawal', label: 'NISA等の臨時取り崩し開始', amount: round(emergencyInvestmentWithdrawal) });
        }
      }

      cash = cashBeforeEmergency;
      const investmentWithdrawal = plannedInvestmentWithdrawal + emergencyInvestmentWithdrawal;
      const cashChange = cash - openingCash;

      const liquid = cash + investment;
      const totalFinancialAssets = liquid + retirement;
      const expectedTotal = openingTotalFinancialAssets + householdBalance + netAssetTransaction + investmentReturnAmount + retirementReturnAmount;
      const reconciliationGap = totalFinancialAssets - expectedTotal;
      maxReconciliationGap = Math.max(maxReconciliationGap, Math.abs(reconciliationGap));

      if (cash < -EPS && firstCashShortfallAge === null) firstCashShortfallAge = selfAge;
      if (liquid < -EPS && firstLiquidShortfallAge === null) firstLiquidShortfallAge = selfAge;
      if (totalFinancialAssets < -EPS && firstTotalShortfallAge === null) firstTotalShortfallAge = selfAge;
      if (cash < minCash) { minCash = cash; minCashAge = selfAge; }
      if (liquid < minLiquid) { minLiquid = liquid; minLiquidAge = selfAge; }
      if (householdBalance < maxAnnualDeficit) {
        maxAnnualDeficit = householdBalance;
        maxAnnualDeficitAge = selfAge;
      }

      rows.push({
        index: idx,
        year,
        selfAge,
        spouseAge,
        openingCash: round(openingCash),
        openingInvestment: round(openingInvestment),
        openingRetirement: round(openingRetirement),
        openingTotalFinancialAssets: round(openingTotalFinancialAssets),
        income: round(totalIncome),
        recurringIncome: round(recurringIncome),
        employmentIncome: round(employmentIncome),
        pensionIncome: round(pensionIncome),
        severanceIncome: round(severanceIncome),
        otherIncome: round(otherIncome),
        expense: round(totalExpense),
        livingExpense: round(livingExpense),
        childLivingAdjustment: round(childLivingAdjustment),
        educationExpense: round(education),
        housingExpense: round(housingExpense),
        mortgageInterest: round(mortgageInterest),
        mortgagePrincipal: round(mortgagePrincipal),
        insuranceExpense: round(insurance),
        otherExpense: round(otherAnnual + oneTimeExpense),
        homeUpfront: round(homeUpfront),
        homeSaleNet: round(homeSaleNet),
        homeSalePrice: round(homeSalePrice),
        homeSaleCost: round(homeSaleCost),
        currentMortgagePayoff: round(currentMortgagePayoff),
        assetTransactionInflow: round(assetTransactionInflow),
        assetTransactionOutflow: round(assetTransactionOutflow),
        netAssetTransaction: round(netAssetTransaction),
        investmentContribution: round(investContribution),
        retirementContribution: round(retirementContribution),
        retirementRelease: round(retirementRelease),
        plannedInvestmentWithdrawal: round(plannedInvestmentWithdrawal),
        emergencyInvestmentWithdrawal: round(emergencyInvestmentWithdrawal),
        investmentWithdrawal: round(investmentWithdrawal),
        annualBalance: round(householdBalance),
        basicBalance: round(householdBalance),
        cashChange: round(cashChange),
        investmentReturn: round(investmentReturnAmount),
        retirementReturn: round(retirementReturnAmount),
        totalReturn: round(investmentReturnAmount + retirementReturnAmount),
        cash: round(cash),
        investment: round(investment),
        retirement: round(retirement),
        liquidAssets: round(liquid),
        totalFinancialAssets: round(totalFinancialAssets),
        cashShortfall: round(Math.max(0, -cash)),
        totalShortfall: round(Math.max(0, -totalFinancialAssets)),
        cumulativeShortfall: round(Math.max(0, -cash)),
        reconciliationGap: round(reconciliationGap, 6),
        currentMortgageBalance: round(existingMortgage ? existingMortgage.balance : 0),
        newMortgageBalance: round(mortgage ? mortgage.balance : 0),
        mortgageBalance: round((existingMortgage ? existingMortgage.balance : 0) + (mortgage ? mortgage.balance : 0)),
        isSnapshot: false
      });
    }

    const currentYearRow = rows.find((r) => !r.isSnapshot && r.selfAge === selfAge0);
    const currentHousing = currentYearRow ? currentYearRow.housingExpense : 0;
    const currentInsurance = currentYearRow ? currentYearRow.insuranceExpense : 0;
    const currentOther = currentYearRow ? currentYearRow.otherExpense : otherAnnualBase;
    const emergencyFund = (baseLiving + currentHousing + currentInsurance + currentOther) / 2;

    const retirementRow = self.retireAge <= selfAge0
      ? rows[0]
      : rows.find((r) => !r.isSnapshot && r.selfAge === self.retireAge) || rows[rows.length - 1];
    const finalRow = rows[rows.length - 1];
    const buyRow = purchased ? rows.find((r) => !r.isSnapshot && r.selfAge >= int(data.housing.buyAge, 999)) : null;
    const housingBurden = buyRow && buyRow.recurringIncome > 0 ? (buyRow.housingExpense / buyRow.recurringIncome) * 100 : null;
    const saleRow = rows.find((r) => !r.isSnapshot && (Math.abs(num(r.homeSaleNet, 0)) > EPS || num(r.currentMortgagePayoff, 0) > EPS)) || null;

    const warnings = [];
    if (firstTotalShortfallAge !== null) {
      warnings.push({ level: 'danger', code: 'TOTAL_SHORTFALL', title: `${firstTotalShortfallAge}歳で金融資産全体が不足`, detail: '現預金と換金可能な運用資産を使い切り、DC等の残高を含めても未補填の資金不足が発生します。' });
    } else if (firstLiquidShortfallAge !== null) {
      warnings.push({ level: 'danger', code: 'LIQUID_SHORTFALL', title: `${firstLiquidShortfallAge}歳で利用可能資産が不足`, detail: '現預金とNISA等を使い切っても不足します。DC等の受取時期または支出計画を確認してください。' });
    }
    if (firstEmergencyWithdrawalAge !== null) {
      warnings.push({ level: 'warn', code: 'EMERGENCY_WITHDRAWAL', title: `${firstEmergencyWithdrawalAge}歳から計画外の取り崩し`, detail: '現預金不足を補うため、設定した受取開始前または計画額を超えてNISA等を取り崩しています。' });
    }
    if (minCash < emergencyFund && firstTotalShortfallAge === null) {
      warnings.push({ level: 'warn', code: 'EMERGENCY', title: '生活防衛資金を下回る時期あり', detail: `現預金の最低額は${round(minCash)}万円（${minCashAge}歳）、目安は約${round(emergencyFund)}万円です。` });
    }
    if (currentYearRow && currentYearRow.cashChange < 0) {
      warnings.push({ level: 'warn', code: 'CURRENT_CASH_DEFICIT', title: '現在の積立後の現金増減がマイナス', detail: `現在の入力では、積立や資産取引を含めると年間約${round(Math.abs(currentYearRow.cashChange))}万円を既存資産から補う計画です。` });
    }
    if (housingBurden !== null && housingBurden > 30) {
      warnings.push({ level: 'warn', code: 'HOUSING', title: '購入年の住居費負担が高め', detail: `購入年の通常住居費は定常的な手取り収入の約${round(housingBurden)}％です。売却代金や退職金などの一時収入は分母に含めていません。` });
    }
    if (saleRow && saleRow.homeSaleNet < 0) {
      warnings.push({ level: 'danger', code: 'HOME_SALE_SHORTFALL', title: '住み替え時に追加資金が必要', detail: `想定売却価格から売却費用とローン残高を差し引くと、約${round(Math.abs(saleRow.homeSaleNet))}万円の持ち出しが必要です。` });
    }
    if (purchasePlan && currentHomeIsOwned && currentHomeDisposition === 'undecided') {
      warnings.push({ level: 'info', code: 'HOME_DISPOSITION_UNDECIDED', title: '現在の住宅の扱いが未定', detail: '保守的に、売却代金を見込まず現在の住宅ローン・維持費も継続する前提で計算しています。' });
    }
    if (withdrawalStartAge <= investEndAge) {
      warnings.push({ level: 'warn', code: 'INVEST_OVERLAP', title: '積立期間と取り崩し時期が重複', detail: '計算上は取り崩し開始の前年でNISA等の積立を停止しています。入力期間を確認してください。' });
    }
    const addNetWarning = (person, label, code) => {
      if (!person || person.currentNet <= 0 || person.currentGross <= 0) return;
      const ratio = person.currentNet / person.currentGross;
      if (ratio < 0.3 || ratio > 1.05) {
        warnings.push({ level: 'warn', code, title: `${label}の手取り率を確認`, detail: `入力された手取りは額面の約${round(ratio * 100, 1)}％です。実入力をそのまま将来収入へ反映しています。` });
      }
    };
    if (data.income.self && !num(data.income.self.net, 0)) {
      warnings.push({ level: 'info', code: 'NET_ESTIMATE', title: '本人の手取りは概算', detail: '手取り年収を入力すると、税・社会保険の個人差によるズレを抑えられます。' });
    } else addNetWarning(self, '本人', 'NET_RATIO');
    if (hasSpouse && data.income.spouse && num(data.income.spouse.gross, 0) > 0 && !num(data.income.spouse.net, 0)) {
      warnings.push({ level: 'info', code: 'SPOUSE_NET_ESTIMATE', title: '配偶者の手取りは概算', detail: '配偶者の手取り年収を入力すると精度が上がります。' });
    } else if (spouse) addNetWarning(spouse, '配偶者', 'SPOUSE_NET_RATIO');
    if (maxReconciliationGap > 0.01) {
      warnings.push({ level: 'danger', code: 'RECONCILIATION', title: 'キャッシュフローの検算差額あり', detail: `最大差額は${round(maxReconciliationGap, 3)}万円です。入力ではなく計算処理の確認が必要です。` });
    }

    return {
      version: VERSION,
      assumptions: {
        currentYear,
        selfAge0,
        spouseAge0,
        horizonAge,
        finalSelfAge,
        finalSpouseAge,
        inflationRatePct: round(inflationRate * 100, 2),
        investReturnPct: round(investReturn * 100, 2),
        retirementReturnPct: round(retirementReturn * 100, 2),
        timing: '現在年齢の行から当年の収入・支出・積立・受取を反映し、期首スナップショットと年末残高を分けて表示',
        assetScope: '住宅資産価値は金融資産合計に含めず、売却時のみ売却手取りを資産取引として現預金へ反映。現預金不足時はNISA等を必要額だけ自動で取り崩す',
        taxScope: '所得税・住民税・社会保険料・退職所得税は概算または未反映',
        reconciliation: '期末金融資産合計＝期首金融資産合計＋通常家計収支＋資産取引純額＋運用収益',
        withdrawal: withdrawalMethod === 'lump' ? `${withdrawalStartAge}歳にNISA等を一括取り崩し` : `${withdrawalStartAge}歳から${withdrawalYears}年間、${withdrawalMethod === 'equal' ? '運用を止めて均等' : '運用しながら定額'}取り崩し`,
        housingMove: purchasePlan && currentHomeIsOwned ? (currentHomeDisposition === 'sell' ? `${buyAge}歳に現在の住宅を売却し、ローン完済後の手取りを新居購入へ反映` : '現在の住宅を保有したまま、新居の住居費を追加') : '現在の住居費は新居購入年に停止',
        pensionBirthYear: `年齢から概算した生年（本人${self.birthYear}年${spouse ? `・配偶者${spouse.birthYear}年` : ''}）を繰上げ減額率の判定に使用`
      },
      current: {
        netIncome: currentYearRow ? currentYearRow.income : 0,
        expense: currentYearRow ? currentYearRow.expense : 0,
        contributions: currentYearRow ? round(currentYearRow.investmentContribution + currentYearRow.retirementContribution) : 0,
        annualBalance: currentYearRow ? currentYearRow.annualBalance : 0,
        cashChange: currentYearRow ? currentYearRow.cashChange : 0,
        education: currentYearRow ? currentYearRow.educationExpense : 0,
        housing: currentYearRow ? currentYearRow.housingExpense : 0,
        emergencyFund: round(emergencyFund),
        financialAssets: round(initialFinancialAssets),
        yearEndFinancialAssets: currentYearRow ? currentYearRow.totalFinancialAssets : round(initialFinancialAssets)
      },
      metrics: {
        firstCashShortfallAge,
        firstLiquidShortfallAge,
        firstTotalShortfallAge,
        firstPlannedWithdrawalAge,
        firstEmergencyWithdrawalAge,
        minCash: round(minCash),
        minCashAge,
        minLiquid: round(minLiquid),
        minLiquidAge,
        maxAnnualDeficit: round(maxAnnualDeficit),
        maxAnnualDeficitAge,
        maxReconciliationGap: round(maxReconciliationGap, 6),
        retirementAssets: retirementRow ? retirementRow.totalFinancialAssets : null,
        finalAssets: finalRow.totalFinancialAssets,
        finalCash: finalRow.cash,
        finalCashShortfall: finalRow.cashShortfall,
        cumulativeShortfall: finalRow.cashShortfall,
        housingBurdenPct: housingBurden === null ? null : round(housingBurden),
        homeSaleNet: saleRow ? round(saleRow.homeSaleNet) : null,
        homeSaleMortgagePayoff: saleRow ? round(saleRow.currentMortgagePayoff) : null,
        mortgageTotalInterest: round((existingMortgage ? existingMortgage.totalInterest : 0) + (mortgage ? mortgage.totalInterest : 0))
      },
      rows,
      events,
      warnings,
      normalized: data
    };
  }

  return {
    VERSION,
    SCHOOL_COST,
    AWAY_FROM_HOME_ADD,
    defaultData,
    normalizeData,
    normalizePerson,
    estimateNetIncome,
    pensionFactor,
    monthlyPayment,
    mortgagePreview,
    existingMortgagePreview,
    homeSalePreview,
    annuityWithdrawal,
    investmentPlanPreview,
    grossAtAge,
    netAtAge,
    educationCostCurrentValue,
    project,
    round
  };
});

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CompassEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';
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
      // 1962/4/2以降生まれは月0.4%。それ以前は月0.5%。
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

    // 現在と同じ学校段階にいる間は、入力された実額を優先する。
    const currentStage = childStage(currentAge);
    const actualCurrent = Math.max(0, num(child.currentEducation, 0));
    if (actualCurrent > 0 && stage === currentStage && projectionYearIndex > 0) {
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

    // 高校卒業までの指定の場合、18歳以降はゼロ。
    const schoolType = schoolTypeForStage(route, stage);
    return SCHOOL_COST[stage][schoolType] || 0;
  }

  function normalizePerson(raw, baseAge) {
    raw = raw || {};
    const currentGross = Math.max(0, num(raw.gross, 0));
    const currentNet = Math.max(0, num(raw.net, 0));
    const changes = Array.isArray(raw.changes) ? raw.changes
      .map((c) => ({ age: int(c.age, 0), gross: Math.max(0, num(c.gross, 0)) }))
      .filter((c) => c.age >= baseAge && c.gross >= 0)
      .sort((a, b) => a.age - b.age) : [];
    return {
      currentGross,
      currentNet,
      growthRate: num(raw.growthRate, 0),
      growthUntilAge: int(raw.growthUntilAge, baseAge),
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
    for (const change of person.changes) {
      if (change.age <= age && change.age >= milestoneAge) {
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
      const ratio = clamp(person.currentNet / person.currentGross, 0.45, 0.95);
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
    const principal = Math.max(0, price - down + ((housing.miscInLoan === true || housing.miscInLoan === 'yes') ? misc : 0));
    const termYears = Math.max(1, int(housing.loanTerm, 35));
    const rate = Math.max(0, num(housing.interestRate, 0));
    return {
      principal,
      balance: principal,
      monthlyPayment: monthlyPayment(principal, rate, termYears),
      annualRate: rate,
      monthsRemaining: termYears * 12,
      upfront: down + ((housing.miscInLoan === true || housing.miscInLoan === 'yes') ? 0 : misc),
      misc,
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

  function defaultData() {
    const currentYear = new Date().getFullYear();
    return {
      meta: { version: VERSION, currentYear, horizonAge: 90, inflationRate: 1.0 },
      family: { selfAge: 35, hasSpouse: true, spouseAge: 33, children: [] },
      income: {
        self: { gross: 600, net: '', growthRate: 1, growthUntilAge: 50, changes: [], retireAge: 65, pensionStartAge: 65, pensionMonthly65: 15, severance: 1000, otherAnnual: 0, otherIncomeEndAge: 65 },
        spouse: { gross: 400, net: '', growthRate: 1, growthUntilAge: 50, changes: [], retireAge: 65, pensionStartAge: 65, pensionMonthly65: 10, severance: 500, otherAnnual: 0, otherIncomeEndAge: 65 }
      },
      living: { baseAnnual: 300, otherAnnual: 30, inflateOther: true, childLivingAdjust: true },
      assets: { cash: 500, investment: 200, retirement: 100, investReturn: 3, retirementReturn: 3, monthlyInvestment: 5, investmentEndAge: 65, monthlyRetirement: 2, retirementContributionEndAge: 60, retirementReceiveAge: 65 },
      housing: { currentType: 'rent', monthlyCost: 10, currentCostEndAge: 99, currentAnnualAfterEnd: 0, purchasePlan: false, buyAge: 40, price: 4500, downPayment: 500, miscRate: 7, miscInLoan: false, loanTerm: 35, interestRate: 1.0, annualMaintenance: 30 },
      insurance: { annualPremium: 24, premiumEndAge: 65 },
      events: []
    };
  }

  function project(rawData) {
    const data = Object.assign(defaultData(), rawData || {});
    data.meta = Object.assign(defaultData().meta, rawData && rawData.meta || {});
    data.family = Object.assign(defaultData().family, rawData && rawData.family || {});
    data.income = Object.assign(defaultData().income, rawData && rawData.income || {});
    data.living = Object.assign(defaultData().living, rawData && rawData.living || {});
    data.assets = Object.assign(defaultData().assets, rawData && rawData.assets || {});
    data.housing = Object.assign(defaultData().housing, rawData && rawData.housing || {});
    data.insurance = Object.assign(defaultData().insurance, rawData && rawData.insurance || {});
    data.events = Array.isArray(rawData && rawData.events) ? rawData.events : [];

    const currentYear = int(data.meta.currentYear, new Date().getFullYear());
    const selfAge0 = clamp(int(data.family.selfAge, 35), 18, 85);
    const hasSpouse = data.family.hasSpouse === true || data.family.hasSpouse === 'yes';
    const spouseAge0 = hasSpouse ? clamp(int(data.family.spouseAge, selfAge0), 18, 85) : null;
    const horizonAge = clamp(int(data.meta.horizonAge, 90), selfAge0 + 1, 110);
    const inflationRate = clamp(num(data.meta.inflationRate, 1), -3, 10) / 100;
    const children = Array.isArray(data.family.children) ? data.family.children : [];

    const self = normalizePerson(data.income.self, selfAge0);
    const spouse = hasSpouse ? normalizePerson(data.income.spouse, spouseAge0) : null;

    let cash = Math.max(0, num(data.assets.cash, 0));
    let investment = Math.max(0, num(data.assets.investment, 0));
    let retirement = Math.max(0, num(data.assets.retirement, 0));
    const initialFinancialAssets = cash + investment + retirement;
    let cumulativeShortfall = 0;
    let mortgage = null;
    let purchased = false;
    let retirementReleased = false;

    const investReturn = clamp(num(data.assets.investReturn, 3), -20, 20) / 100;
    const retirementReturn = clamp(num(data.assets.retirementReturn, 3), -20, 20) / 100;
    const annualInvestContribution = Math.max(0, num(data.assets.monthlyInvestment, 0)) * 12;
    const annualRetirementContribution = Math.max(0, num(data.assets.monthlyRetirement, 0)) * 12;
    const investEndAge = int(data.assets.investmentEndAge, self.retireAge);
    const retirementContributionEndAge = int(data.assets.retirementContributionEndAge, self.retireAge);
    const retirementReceiveAge = int(data.assets.retirementReceiveAge, 65);

    const baseLiving = Math.max(0, num(data.living.baseAnnual, 0));
    const otherAnnualBase = Math.max(0, num(data.living.otherAnnual, 0));
    const insuranceAnnual = Math.max(0, num(data.insurance.annualPremium, 0));
    const insuranceEndAge = int(data.insurance.premiumEndAge, self.retireAge);

    const rows = [];
    const events = [];
    let firstLiquidShortfallAge = null;
    let firstTotalShortfallAge = null;
    let minLiquid = cash + investment;
    let minLiquidAge = selfAge0;
    let maxAnnualDeficit = 0;
    let maxAnnualDeficitAge = null;

    // 現在時点スナップショット。年次収支はまだ反映しない。
    rows.push({
      index: 0,
      year: currentYear,
      selfAge: selfAge0,
      spouseAge: spouseAge0,
      income: 0,
      expense: 0,
      annualBalance: 0,
      cash: round(cash),
      investment: round(investment),
      retirement: round(retirement),
      liquidAssets: round(cash + investment),
      totalFinancialAssets: round(cash + investment + retirement),
      cumulativeShortfall: 0,
      mortgageBalance: 0,
      isSnapshot: true
    });

    for (let idx = 1; idx <= horizonAge - selfAge0; idx++) {
      const year = currentYear + idx;
      const selfAge = selfAge0 + idx;
      const spouseAge = hasSpouse ? spouseAge0 + idx : null;
      const inflationFactor = (1 + inflationRate) ** idx;

      let investmentReturnAmount = investment * investReturn;
      let retirementReturnAmount = retirement * retirementReturn;
      investment += investmentReturnAmount;
      retirement += retirementReturnAmount;

      if (!retirementReleased && selfAge >= retirementReceiveAge && retirement > 0) {
        cash += retirement;
        events.push({ year, age: selfAge, type: 'retirement-release', label: 'DC・iDeCo等を現金化', amount: round(retirement) });
        retirement = 0;
        retirementReleased = true;
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

      const totalIncome = selfEmployment + spouseEmployment + selfPension + spousePension + selfOther + spouseOther + selfSeverance + spouseSeverance + oneTimeIncome;

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
      let homeUpfront = 0;

      const purchasePlan = data.housing.purchasePlan === true || data.housing.purchasePlan === 'yes';
      const buyAge = int(data.housing.buyAge, 99);
      if (purchasePlan && !purchased && selfAge >= buyAge) {
        mortgage = createMortgage(data.housing);
        purchased = true;
        homeUpfront = mortgage.upfront;
        events.push({ year, age: selfAge, type: 'home', label: '住宅購入', amount: round(homeUpfront) });
      }

      if (purchased) {
        const paid = payMortgageYear(mortgage);
        housingExpense += paid.payment;
        mortgageInterest = paid.interest;
        mortgagePrincipal = paid.principal;
        housingExpense += Math.max(0, num(data.housing.annualMaintenance, 0)) * inflationFactor;
      } else {
        const currentEndAge = int(data.housing.currentCostEndAge, 999);
        if (selfAge <= currentEndAge) housingExpense += Math.max(0, num(data.housing.monthlyCost, 0)) * 12 * inflationFactor;
        else housingExpense += Math.max(0, num(data.housing.currentAnnualAfterEnd, 0)) * inflationFactor;
      }

      const investContribution = selfAge <= investEndAge ? annualInvestContribution : 0;
      const retirementContribution = selfAge <= retirementContributionEndAge && selfAge < retirementReceiveAge ? annualRetirementContribution : 0;
      const totalExpense = livingExpense + otherAnnual + education + housingExpense + insurance + oneTimeExpense + homeUpfront;
      const annualBalanceBeforeContributions = totalIncome - totalExpense;
      let cashFlowAfterContributions = annualBalanceBeforeContributions - investContribution - retirementContribution;

      cash += cashFlowAfterContributions;
      investment += investContribution;
      retirement += retirementContribution;

      let investmentWithdrawal = 0;
      let retirementWithdrawal = 0;
      let annualShortfall = 0;
      if (cash < -EPS) {
        let need = -cash;
        investmentWithdrawal = Math.min(investment, need);
        investment -= investmentWithdrawal;
        cash += investmentWithdrawal;
        need = Math.max(0, -cash);
        if (need > EPS && selfAge >= retirementReceiveAge) {
          retirementWithdrawal = Math.min(retirement, need);
          retirement -= retirementWithdrawal;
          cash += retirementWithdrawal;
        }
        if (cash < -EPS) {
          annualShortfall = -cash;
          cumulativeShortfall += annualShortfall;
          cash = 0;
          if (firstTotalShortfallAge === null) firstTotalShortfallAge = selfAge;
        }
      }

      const liquid = cash + investment;
      const totalFinancialAssets = liquid + retirement;
      if (liquid <= EPS && firstLiquidShortfallAge === null) firstLiquidShortfallAge = selfAge;
      if (liquid < minLiquid) {
        minLiquid = liquid;
        minLiquidAge = selfAge;
      }
      const annualBalance = cashFlowAfterContributions;
      if (annualBalance < maxAnnualDeficit) {
        maxAnnualDeficit = annualBalance;
        maxAnnualDeficitAge = selfAge;
      }

      rows.push({
        index: idx,
        year,
        selfAge,
        spouseAge,
        income: round(totalIncome),
        employmentIncome: round(selfEmployment + spouseEmployment),
        pensionIncome: round(selfPension + spousePension),
        severanceIncome: round(selfSeverance + spouseSeverance),
        otherIncome: round(selfOther + spouseOther + oneTimeIncome),
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
        investmentContribution: round(investContribution),
        retirementContribution: round(retirementContribution),
        annualBalance: round(annualBalance),
        basicBalance: round(annualBalanceBeforeContributions),
        cashFlowAfterContributions: round(cashFlowAfterContributions),
        investmentReturn: round(investmentReturnAmount),
        retirementReturn: round(retirementReturnAmount),
        investmentWithdrawal: round(investmentWithdrawal),
        retirementWithdrawal: round(retirementWithdrawal),
        annualShortfall: round(annualShortfall),
        cumulativeShortfall: round(cumulativeShortfall),
        cash: round(cash),
        investment: round(investment),
        retirement: round(retirement),
        liquidAssets: round(liquid),
        totalFinancialAssets: round(totalFinancialAssets),
        mortgageBalance: round(mortgage ? mortgage.balance : 0),
        isSnapshot: false
      });
    }

    const currentNetIncome = netAtAge(self, selfAge0, selfAge0) + (spouse ? netAtAge(spouse, spouseAge0, spouseAge0) : 0) + (selfAge0 <= self.otherIncomeEndAge ? self.otherAnnual : 0) + (spouse && spouseAge0 <= spouse.otherIncomeEndAge ? spouse.otherAnnual : 0);
    const currentEducation = children.reduce((sum, child) => sum + Math.max(0, num(child.currentEducation, 0)), 0);
    const currentHousing = Math.max(0, num(data.housing.monthlyCost, 0)) * 12;
    const currentInsurance = selfAge0 <= insuranceEndAge ? insuranceAnnual : 0;
    const currentInvest = selfAge0 <= investEndAge ? annualInvestContribution : 0;
    const currentRetirementContribution = selfAge0 <= retirementContributionEndAge ? annualRetirementContribution : 0;
    const currentOther = otherAnnualBase;
    const currentExpense = baseLiving + currentEducation + currentHousing + currentInsurance + currentOther;
    const currentBalance = currentNetIncome - currentExpense - currentInvest - currentRetirementContribution;
    const emergencyFund = (baseLiving + currentHousing + currentInsurance + currentOther) / 2;

    const retirementRow = rows.find((r) => r.selfAge === self.retireAge) || rows[rows.length - 1];
    const finalRow = rows[rows.length - 1];
    const buyRow = purchased ? rows.find((r) => r.selfAge >= int(data.housing.buyAge, 999)) : null;
    const housingBurden = buyRow && buyRow.income > 0 ? (buyRow.housingExpense / buyRow.income) * 100 : null;

    const warnings = [];
    if (firstTotalShortfallAge !== null) {
      warnings.push({ level: 'danger', code: 'SHORTFALL', title: `${firstTotalShortfallAge}歳で資金不足`, detail: '現預金・運用資産・受取可能な退職資産を使っても支出を賄えない年があります。' });
    } else if (firstLiquidShortfallAge !== null) {
      warnings.push({ level: 'warn', code: 'LIQUIDITY', title: `${firstLiquidShortfallAge}歳で流動資産が枯渇`, detail: 'DC・iDeCo等が残っていても、受取前に使えるお金が不足する可能性があります。' });
    }
    if (minLiquid < emergencyFund && firstTotalShortfallAge === null) {
      warnings.push({ level: 'warn', code: 'EMERGENCY', title: '生活防衛資金を下回る時期あり', detail: `流動資産の最低額は${round(minLiquid)}万円（${minLiquidAge}歳）、目安は約${round(emergencyFund)}万円です。` });
    }
    if (currentBalance < 0) {
      warnings.push({ level: 'warn', code: 'CURRENT_DEFICIT', title: '現在の年間収支が赤字', detail: `現在の入力では、積立を含め年間約${round(Math.abs(currentBalance))}万円の不足です。` });
    }
    if (housingBurden !== null && housingBurden > 30) {
      warnings.push({ level: 'warn', code: 'HOUSING', title: '購入年の住居費負担が高め', detail: `購入年の住居費は手取り収入の約${round(housingBurden)}％です。維持費を含むため、購入前後の現預金も確認してください。` });
    }
    if (rows.some((r) => !r.isSnapshot && r.investmentContribution > 0 && r.investmentWithdrawal > 0)) {
      warnings.push({ level: 'warn', code: 'CONTRIBUTE_WITHDRAW', title: '積立と取崩しが同じ年に発生', detail: '計画した積立額を維持するために運用資産を取り崩す年があります。積立額か支出条件を見直してください。' });
    }
    if (data.income.self && !num(data.income.self.net, 0)) {
      warnings.push({ level: 'info', code: 'NET_ESTIMATE', title: '本人の手取りは概算', detail: '手取り年収を入力すると、税・社会保険の個人差によるズレを抑えられます。' });
    }
    if (hasSpouse && data.income.spouse && num(data.income.spouse.gross, 0) > 0 && !num(data.income.spouse.net, 0)) {
      warnings.push({ level: 'info', code: 'SPOUSE_NET_ESTIMATE', title: '配偶者の手取りは概算', detail: '配偶者の手取り年収を入力すると精度が上がります。' });
    }

    return {
      version: VERSION,
      assumptions: {
        currentYear,
        selfAge0,
        spouseAge0,
        horizonAge,
        inflationRatePct: round(inflationRate * 100, 2),
        investReturnPct: round(investReturn * 100, 2),
        retirementReturnPct: round(retirementReturn * 100, 2),
        timing: '現在時点を0年目とし、各年齢になる年の年間収支を年末残高へ反映',
        assetScope: '住宅資産価値は含めず、金融資産のみを表示',
        taxScope: '所得税・住民税・社会保険料・退職所得税は概算または未反映'
      },
      current: {
        netIncome: round(currentNetIncome),
        expense: round(currentExpense),
        contributions: round(currentInvest + currentRetirementContribution),
        annualBalance: round(currentBalance),
        education: round(currentEducation),
        housing: round(currentHousing),
        emergencyFund: round(emergencyFund),
        financialAssets: round(initialFinancialAssets)
      },
      metrics: {
        firstLiquidShortfallAge,
        firstTotalShortfallAge,
        minLiquid: round(minLiquid),
        minLiquidAge,
        maxAnnualDeficit: round(maxAnnualDeficit),
        maxAnnualDeficitAge,
        retirementAssets: retirementRow ? retirementRow.totalFinancialAssets : null,
        finalAssets: finalRow.totalFinancialAssets,
        cumulativeShortfall: finalRow.cumulativeShortfall,
        housingBurdenPct: housingBurden === null ? null : round(housingBurden),
        mortgageTotalInterest: mortgage ? round(mortgage.totalInterest) : 0
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
    estimateNetIncome,
    pensionFactor,
    monthlyPayment,
    grossAtAge,
    netAtAge,
    educationCostCurrentValue,
    project,
    round
  };
});

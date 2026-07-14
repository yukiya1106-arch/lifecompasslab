/**
 * engine.js
 * =========================================================
 * 家計コンパス β版 - 年次キャッシュフロー計算エンジン
 *
 * 入力データ（formData）を受け取り、本人年齢〜90歳まで
 * 1年ごとのキャッシュフローと資産残高を計算して返します。
 *
 * 外部依存なし。results.js・pdf.js から呼び出します。
 * =========================================================
 */

'use strict';

// =========================================================
// 教育費テーブル（単位：万円/年）
// 参考：文部科学省「子供の学習費調査」等をもとに設定
// =========================================================
const EDU_COST = {
  // 幼稚園（3歳〜5歳）
  kindergarten: { public: 23, private: 53 },
  // 小学校（6歳〜11歳）
  elementary:   { public: 35, private: 167 },
  // 中学校（12歳〜14歳）
  middle:        { public: 53, private: 141 },
  // 高校（15歳〜17歳）
  high:          { public: 51, private: 105 },
  // 専門学校（18歳〜19歳・2年）
  vocational:    { public: 93, private: 93 },
  // 短期大学（18歳〜19歳・2年）
  junior:        { public: 62, private: 105 },
  // 大学（18歳〜21歳・4年）
  university:    { public: 108, private: 152 },
};

// 一人暮らし追加費用（大学在学中のみ）
const AWAY_COST = 112.5; // 万円/年

// =========================================================
// 手取り推計（額面 → 手取り）
// 社会保険料・所得税・住民税を大まかに考慮した推計式
// =========================================================
function estimateNet(gross) {
  if (!gross || gross <= 0) return 0;
  // 額面（万円） → 手取り（万円）の概算
  if (gross <= 150)  return gross * 0.87;
  if (gross <= 250)  return gross * 0.84;
  if (gross <= 400)  return gross * 0.80;
  if (gross <= 600)  return gross * 0.77;
  if (gross <= 800)  return gross * 0.74;
  if (gross <= 1000) return gross * 0.72;
  return gross * 0.70;
}

// =========================================================
// 収入カーブ係数（基準年からの係数）
// =========================================================
function incomeCurveRate(curve, baseAge, currentAge) {
  const yearsElapsed = currentAge - baseAge;
  switch (curve) {
    case 'up1':   return Math.pow(1.01, yearsElapsed);
    case 'up2':   return Math.pow(1.02, yearsElapsed);
    case 'down50':
      if (currentAge >= 50) return 0.90;
      return 1.0;
    case 'down60':
      if (currentAge >= 60) return 0.70;
      return 1.0;
    default: return 1.0; // flat
  }
}

// =========================================================
// 年金調整（繰上げ・繰下げ）
// 65歳基準からの増減率
// 繰上げ：-4.8%/年、繰下げ：+8.4%/年
// =========================================================
function pensionAdjustRate(startAge) {
  const diff = startAge - 65;
  if (diff < 0) return 1 + diff * 0.048; // 繰上げ（1年-4.8%）
  if (diff > 0) return 1 + diff * 0.084; // 繰下げ（1年+8.4%）
  return 1.0;
}

// =========================================================
// 元利均等返済 月額計算
// principal: 借入元本（万円）
// annualRate: 年利（%、例：1.0 = 1%）
// termYears: 返済期間（年）
// 戻り値: 月額返済額（万円）
// =========================================================
function calcMonthlyRepaymentWan(principal, annualRate, termYears) {
  if (!principal || principal <= 0) return 0;
  if (!termYears || termYears <= 0) return 0;
  const P = principal;         // 万円
  const r = annualRate / 100 / 12; // 月利（小数）
  const n = termYears * 12;        // 返済回数
  if (r <= 0) return P / n;
  const monthly = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return monthly; // 万円/月
}

// =========================================================
// 子どもの教育費（1人・1年分）を計算
// childAge: 当該年の子どもの年齢
// finalEdu: 'university' | 'junior' | 'vocational' | 'high'
// eduPolicy: 'public' | 'univ_private' | 'high_private' | 'mid_private' | 'private' | 'undecided'
// univStyle: 'local' | 'away' | 'mix' | 'none'
// extraEduRate: 塾倍率（1.0 / 1.1 / 1.25）
// =========================================================
function calcChildEduCost(childAge, finalEdu, eduPolicy, univStyle, extraEduRate) {
  if (childAge < 0 || childAge > 24) return 0;

  let cost = 0;
  const p = eduPolicy; // 教育方針

  // 幼稚園（3〜5歳）
  if (childAge >= 3 && childAge <= 5) {
    const isPrivateKinder = (p === 'private');
    cost += isPrivateKinder ? EDU_COST.kindergarten.private : EDU_COST.kindergarten.public;
  }

  // 小学校（6〜11歳）
  if (childAge >= 6 && childAge <= 11) {
    const isPrivate = (p === 'private');
    cost += isPrivate ? EDU_COST.elementary.private : EDU_COST.elementary.public;
  }

  // 中学校（12〜14歳）
  if (childAge >= 12 && childAge <= 14) {
    const isPrivate = (p === 'private' || p === 'mid_private');
    cost += isPrivate ? EDU_COST.middle.private : EDU_COST.middle.public;
  }

  // 高校（15〜17歳）
  if (childAge >= 15 && childAge <= 17) {
    const isPrivate = (p === 'private' || p === 'mid_private' || p === 'high_private' || p === 'undecided');
    cost += isPrivate ? EDU_COST.high.private : EDU_COST.high.public;
  }

  // 大学・短大・専門学校（18歳〜）
  const isPrivateUniv = (p === 'private' || p === 'mid_private' || p === 'high_private' || p === 'univ_private' || p === 'undecided');

  if (finalEdu === 'university' && childAge >= 18 && childAge <= 21) {
    cost += isPrivateUniv ? EDU_COST.university.private : EDU_COST.university.public;
    if (univStyle === 'away') cost += AWAY_COST;
    else if (univStyle === 'mix') cost += AWAY_COST * 0.5;
  }
  if (finalEdu === 'junior' && childAge >= 18 && childAge <= 19) {
    cost += isPrivateUniv ? EDU_COST.junior.private : EDU_COST.junior.public;
    if (univStyle === 'away') cost += AWAY_COST;
    else if (univStyle === 'mix') cost += AWAY_COST * 0.5;
  }
  if (finalEdu === 'vocational' && childAge >= 18 && childAge <= 19) {
    cost += EDU_COST.vocational.private; // 専門は公私同額
    if (univStyle === 'away') cost += AWAY_COST;
    else if (univStyle === 'mix') cost += AWAY_COST * 0.5;
  }
  // 高卒（高校まで）= 追加なし

  return cost * extraEduRate;
}

// =========================================================
// 子どもの独立判定（最終学歴を終えた年齢）
// =========================================================
function childGraduationAge(finalEdu) {
  switch (finalEdu) {
    case 'university':  return 22;
    case 'junior':      return 20;
    case 'vocational':  return 20;
    default:            return 18; // 高校卒業
  }
}

// =========================================================
// メイン計算関数
// 引数: formData（入力データオブジェクト）
// 戻値: 年次キャッシュフロー配列 + 診断メタ情報
// =========================================================
function calcCashflow(formData) {
  // ---- 入力値の読み取り ----
  const f   = formData.family    || {};
  const i1  = formData.income1   || {};
  const i2  = formData.income2   || {};
  const lv  = formData.living    || {};
  const as  = formData.assets    || {};
  const hw  = formData.housing   || {};
  const ins = formData.insurance || {};

  const selfAge   = parseInt(f.ageSelf   || 35);
  const spouseAge = parseInt(f.ageSpouse || 33);
  const hasSpouse = f.hasSpouse === 'yes';
  const childrenCount = parseInt(f.childrenCount || 0);
  const children = (f.children || []).slice(0, childrenCount);

  // ---- 本人収入 ----
  const i1GrossBase = parseFloat(i1.grossIncome   || 0);
  const i1NetBase   = parseFloat(i1.netIncome     || 0) || estimateNet(i1GrossBase);
  const i1Retire    = parseInt(i1.retireAge       || 65);
  const i1PenStart  = parseInt(i1.pensionStartAge || 65);
  const i1Pen65     = parseFloat(i1.pensionAmount || 0) * 12; // 月額→年額（万円）
  const i1PenAdj    = i1Pen65 * pensionAdjustRate(i1PenStart);
  const i1Curve     = i1.incomeCurve || 'flat';
  const i1Other     = parseFloat(i1.otherIncome   || 0);
  const i1Severance = parseFloat(i1.severancePay  || 0);

  // ---- 配偶者収入 ----
  // 配偶者の退職・年金開始を「本人年齢換算」する
  // 例：本人35歳・配偶者33歳の場合、配偶者65歳退職 → 本人67歳のとき
  const spouseAgeDiff = hasSpouse ? (spouseAge - selfAge) : 0; // 配偶者年齢 - 本人年齢

  const i2GrossBase  = hasSpouse ? parseFloat(i2.grossIncome   || 0) : 0;
  const i2NetBase    = hasSpouse ? (parseFloat(i2.netIncome    || 0) || estimateNet(i2GrossBase)) : 0;
  const i2RetireAge  = hasSpouse ? parseInt(i2.retireAge       || 65) : 99; // 配偶者年齢ベース
  // 本人年齢ベースへの変換（配偶者のXX歳 = 本人の XX - spouseAgeDiff 歳）
  const i2RetireSelfAge  = hasSpouse ? i2RetireAge  - spouseAgeDiff : 999;
  const i2PenStartAge    = hasSpouse ? parseInt(i2.pensionStartAge || 65) : 65;
  const i2PenStartSelfAge = hasSpouse ? i2PenStartAge - spouseAgeDiff : 999;
  const i2Pen65      = hasSpouse ? parseFloat(i2.pensionAmount  || 0) * 12 : 0;
  const i2PenAdj     = i2Pen65 * pensionAdjustRate(i2PenStartAge);
  const i2Curve      = i2.incomeCurve || 'flat';
  const i2Other      = hasSpouse ? parseFloat(i2.otherIncome    || 0) : 0;
  const i2Severance  = hasSpouse ? parseFloat(i2.severancePay   || 0) : 0;

  // ---- 生活費 ----
  const baseExpense   = parseFloat(lv.annualExpense || 240);
  const otherFixed    = parseFloat(lv.otherFixed    || 0);
  const otherAnnual   = parseFloat(lv.otherAnnual   || 0);
  const eduPolicy     = lv.eduPolicy  || 'undecided';
  const univStyle     = lv.univStyle  || 'local';
  const extraEduLabel = lv.extraEdu   || 'standard';
  const extraEduRate  = { standard: 1.0, active: 1.1, heavy: 1.25 }[extraEduLabel] || 1.0;

  // ---- 資産（初期値）----
  let cash       = parseFloat(as.cash         || 0);
  let investment = parseFloat(as.investment   || 0);
  let dc         = parseFloat(as.dc           || 0);

  const monthlySaving  = parseFloat(as.monthlySaving || 0);
  const nisaAnnual     = monthlySaving * 12; // 年間NISA積立（万円）
  const dcMonthly      = parseFloat(as.dcMonthly     || 0);
  const dcAnnual       = dcMonthly * 12;
  const dcEndAge       = parseInt(as.dcEndAge    || 65);
  const dcReceiveAge   = parseInt(as.dcReceiveAge|| 65);
  const investPolicy   = as.investPolicy || 'moderate';
  const returnRate     = { conservative: 0.015, moderate: 0.03, aggressive: 0.05 }[investPolicy] || 0.03;

  // ---- 生活防衛資金 = 年間消費支出 ÷ 2（6か月分）----
  const emergencyFund = baseExpense / 2;

  // ---- 住宅 ----
  const currentHouseType  = hw.currentType    || 'rent';
  const currentHouseCost  = parseFloat(hw.monthlyCost || 0) * 12; // 年額（万円）
  const loanEndAge        = parseInt(hw.loanEndAge    || 99);
  const hasPurchasePlan   = hw.purchasePlan === 'yes';
  const buyAge            = parseInt(hw.buyAge        || 99);
  const housePrice        = parseFloat(hw.price       || 0);
  const downPayment       = parseFloat(hw.downPayment || 0);
  const miscRate          = parseFloat(hw.miscRate    || 6) / 100;
  const miscAmount        = housePrice * miscRate;
  const miscInLoan        = hw.miscInLoan === 'yes';
  const loanTerm          = parseInt(hw.loanTerm      || 35);
  const interestRate      = parseFloat(hw.interestRate|| 0.5);
  const repayMode         = hw.repayMode   || 'auto';
  const repayManual       = parseFloat(hw.repayManual || 0);

  // 借入額計算（万円）
  const loanPrincipal = miscInLoan
    ? Math.max(0, housePrice - downPayment + miscAmount)
    : Math.max(0, housePrice - downPayment);

  // 月額返済額（万円/月）
  const monthlyRepay = (repayMode === 'manual' && repayManual > 0)
    ? repayManual
    : calcMonthlyRepaymentWan(loanPrincipal, interestRate, loanTerm);
  const annualRepay = monthlyRepay * 12; // 年額（万円）

  // 購入後ローン完済年齢
  const loanEndAfterBuy = hasPurchasePlan ? buyAge + loanTerm : 999;

  // ---- 保険料 ----
  // monthlyPremium（円/月）が入力された場合は月額×12÷10000で万円/年に変換
  // 後方互換：annualPremium（万円/年）が入力されていればそのまま使用
  const annualPremium = ins.monthlyPremium
    ? parseFloat(ins.monthlyPremium) / 10000 * 12
    : parseFloat(ins.annualPremium || 0);

  // ---- キャッシュフロー計算ループ ----
  const rows   = [];
  const events = [];

  // 子どもの独立年齢（本人年齢ベース）
  const childGradSelfAges = children.map(c => {
    const childCurrentAge = parseInt(c.age || 0);
    const gradAge = childGraduationAge(c.education || 'university');
    return selfAge + (gradAge - childCurrentAge); // 本人XX歳のとき子が独立
  });

  // 全子ども独立後の本人年齢
  const allChildrenIndependSelfAge = childGradSelfAges.length > 0
    ? Math.max(...childGradSelfAges)
    : selfAge; // 子どもなし → 既に独立済み扱い

  // DC・iDeCo受取フラグ
  let dcReceived = false;

  for (let age = selfAge; age <= 90; age++) {
    const yr = new Date().getFullYear() + (age - selfAge);

    // ========================
    // 収入計算
    // ========================
    let income = 0;

    // 本人給与収入（退職前）
    if (age < i1Retire) {
      const curveR = incomeCurveRate(i1Curve, selfAge, age);
      income += i1NetBase * curveR;
      // 就業中のみその他収入
      income += i1Other;
    }

    // 本人退職金（退職年に一括）
    if (age === i1Retire && i1Severance > 0) {
      income += i1Severance;
      events.push({ age, label: '本人退職・退職金受取', type: 'retire' });
    } else if (age === i1Retire && i1Severance <= 0) {
      events.push({ age, label: '本人退職', type: 'retire' });
    }

    // 本人公的年金
    if (age >= i1PenStart) {
      income += i1PenAdj;
      if (age === i1PenStart) events.push({ age, label: '本人年金受給開始', type: 'pension' });
    }

    // 配偶者給与収入（配偶者の退職前）
    if (hasSpouse) {
      if (age < i2RetireSelfAge) {
        const curveR2 = incomeCurveRate(i2Curve, selfAge, age);
        income += i2NetBase * curveR2;
        income += i2Other;
      }

      // 配偶者退職金（配偶者退職年に一括）
      if (age === i2RetireSelfAge && i2Severance > 0) {
        income += i2Severance;
        events.push({ age, label: '配偶者退職・退職金受取', type: 'retire' });
      } else if (age === i2RetireSelfAge) {
        events.push({ age, label: '配偶者退職', type: 'retire' });
      }

      // 配偶者公的年金
      if (age >= i2PenStartSelfAge && i2PenAdj > 0) {
        income += i2PenAdj;
        if (age === i2PenStartSelfAge) events.push({ age, label: '配偶者年金受給開始', type: 'pension' });
      }
    }

    // DC・iDeCo受取（受取年齢に一時金として現預金へ）
    let dcReceiveAmount = 0;
    if (!dcReceived && age >= dcReceiveAge) {
      if (dc > 0) {
        dcReceiveAmount = dc;
        dc = 0;
        dcReceived = true;
        events.push({ age, label: 'DC・iDeCo一時金受取', type: 'dc' });
      } else {
        dcReceived = true;
      }
    }

    // ========================
    // 支出計算
    // ========================

    // 就業中フラグ
    const isWorking = age < i1Retire;

    // 生活費（毎年1%上昇）
    const inflFactor = Math.pow(1.01, age - selfAge);
    let livingCost   = baseExpense * inflFactor;

    // 子どもによる生活費追加（小学校入学時+24万、中学入学時からさらに+24万）
    children.forEach(c => {
      const childCurrentAge = parseInt(c.age || 0);
      const childAgeNow     = childCurrentAge + (age - selfAge);
      const independAge     = childGraduationAge(c.education || 'university');
      if (childAgeNow >= 6 && childAgeNow < independAge) {
        livingCost += 24; // 小学生以上
      }
      if (childAgeNow >= 12 && childAgeNow < independAge) {
        livingCost += 24; // 中学生以上（追加24万）
      }
    });

    // 全子ども独立後は生活費80%
    if (children.length > 0 && age > allChildrenIndependSelfAge) {
      livingCost *= 0.80;
    }

    // 教育費
    let eduCost = 0;
    children.forEach((c, idx) => {
      const childCurrentAge = parseInt(c.age || 0);
      const childAgeNow     = childCurrentAge + (age - selfAge);
      const cost = calcChildEduCost(childAgeNow, c.education || 'university', eduPolicy, univStyle, extraEduRate);
      eduCost += cost;

      // イベント：子どもの入学・卒業
      if (childAgeNow === 6)  events.push({ age, label: `第${idx+1}子 小学校入学`, type: 'edu' });
      if (childAgeNow === 12) events.push({ age, label: `第${idx+1}子 中学校入学`, type: 'edu' });
      if (childAgeNow === 15) events.push({ age, label: `第${idx+1}子 高校入学`,   type: 'edu' });
      if (childAgeNow === 18) events.push({ age, label: `第${idx+1}子 高校卒業`,   type: 'edu' });
      const gradA = childGraduationAge(c.education || 'university');
      if (childAgeNow === gradA) events.push({ age, label: `第${idx+1}子 独立`,     type: 'edu' });
    });

    // 住居費
    let housingCost = 0;
    if (hasPurchasePlan) {
      if (age < buyAge) {
        // 購入前：現在の住居費
        housingCost = currentHouseCost;
      } else if (age < loanEndAfterBuy) {
        // 購入後〜完済前：ローン返済
        housingCost = annualRepay;
        if (age === buyAge) events.push({ age, label: '住宅購入', type: 'house' });
      } else {
        // 完済後：住居費なし
        housingCost = 0;
        if (age === loanEndAfterBuy) events.push({ age, label: '住宅ローン完済', type: 'house' });
      }
    } else {
      // 購入予定なし
      if (currentHouseType === 'own') {
        if (age < loanEndAge) {
          housingCost = currentHouseCost;
        } else {
          housingCost = 0;
          if (age === loanEndAge) events.push({ age, label: '住宅ローン完済', type: 'house' });
        }
      } else {
        housingCost = currentHouseCost;
      }
    }

    // 住宅購入年の頭金・諸費用（現預金から一括控除）
    let housingLumpSum = 0;
    if (hasPurchasePlan && age === buyAge) {
      housingLumpSum = miscInLoan
        ? downPayment               // 諸費用はローンに組込→頭金のみ現金
        : downPayment + miscAmount; // 諸費用も現金払い
    }

    // NISA等積立・DC掛金（就業中のみ。実行額は後段で現金余力に合わせて調整）
    const plannedNisaThisYear = isWorking ? nisaAnnual : 0;
    const plannedDcThisYear = (isWorking && age < dcEndAge && !dcReceived) ? dcAnnual : 0;

    // 保険料（退職後は大幅減と仮定して30%）
    const premiumThisYear = isWorking ? annualPremium : annualPremium * 0.3;

    // ========================
    // 資産更新
    // ========================

    // 1. 今年の現預金収支
    //    収入 - (生活費 + 教育費 + 住居費 + 保険料 + 臨時支出 + 固定費 + 住宅一括)
    //    + DC受取額。投資/DC積立はこの後、現金余力に応じて実行額を決める。
    const cashflowBeforeSaving = income - livingCost - eduCost - housingCost
      - premiumThisYear - otherAnnual - otherFixed - housingLumpSum + dcReceiveAmount;

    // NISA積立・DC掛金は「現預金から出ていくが資産として別口座に積まれる」。
    // ただし簡易版では、生活防衛資金を割り込むほどの無理な積立は自動で抑制する。
    const investableCash = Math.max(0, cash + cashflowBeforeSaving - emergencyFund);
    const nisaThisYear = Math.min(plannedNisaThisYear, investableCash);
    const dcThisYear = Math.min(plannedDcThisYear, Math.max(0, investableCash - nisaThisYear));
    const savingShortfall = (plannedNisaThisYear - nisaThisYear) + (plannedDcThisYear - dcThisYear);

    const cashflowNet = cashflowBeforeSaving - nisaThisYear - dcThisYear;
    cash += cashflowNet;

    // 2. 現預金が生活防衛資金を下回ったら投資資産を取り崩す
    if (cash < emergencyFund && investment > 0) {
      const shortfall = emergencyFund - cash;
      const withdraw  = Math.min(shortfall, investment);
      cash       += withdraw;
      investment -= withdraw;
    }

    // 3. 現預金がマイナスになったら投資資産からさらにカバー
    if (cash < 0 && investment > 0) {
      const cover    = Math.min(-cash, investment);
      cash       += cover;
      investment -= cover;
    }

    // 4. 投資資産へ運用増 + NISA積立
    //    ※ 取り崩し後の残高に対して運用リターン、その後積立を加算
    investment = Math.max(0, investment) * (1 + returnRate) + nisaThisYear;

    // 5. DC・iDeCo運用増 + 掛金積立（受取前のみ）
    if (!dcReceived) {
      dc = Math.max(0, dc) * (1 + returnRate) + dcThisYear;
    }

    // 6. 資産合計（マイナスは0とする）
    const cashFinal       = Math.max(0, cash);
    const investFinal     = Math.max(0, investment);
    const dcFinal         = dcReceived ? 0 : Math.max(0, dc);
    const totalAsset      = cashFinal + investFinal + dcFinal;

    // 純収支（表示用：積立を除く収支）
    const netCashflow = income - (livingCost + eduCost + housingCost + premiumThisYear + otherAnnual + otherFixed + housingLumpSum);

    rows.push({
      age,
      yr,
      income:        Math.round(income),
      expense:       Math.round(livingCost + eduCost + housingCost + premiumThisYear + otherAnnual + otherFixed + nisaThisYear + dcThisYear + housingLumpSum),
      netCashflow:   Math.round(netCashflow),
      eduCost:       Math.round(eduCost),
      housingCost:   Math.round(housingCost),
      livingCost:    Math.round(livingCost),
      premiumCost:   Math.round(premiumThisYear),
      otherCost:     Math.round(otherAnnual + otherFixed),
      nisaSaving:    Math.round(nisaThisYear),
      dcSaving:      Math.round(dcThisYear),
      plannedNisaSaving: Math.round(plannedNisaThisYear),
      plannedDcSaving:   Math.round(plannedDcThisYear),
      savingShortfall:   Math.round(savingShortfall),
      cash:          Math.round(cashFinal),
      investment:    Math.round(investFinal),
      dc:            Math.round(dcFinal),
      totalAsset:    Math.round(totalAsset),
      emergencyFund: Math.round(emergencyFund),
      isWorking,
    });
  }

  // ---- 診断メタ情報の抽出 ----
  const meta = extractMeta(rows, {
    selfAge, i1Retire, emergencyFund, hasPurchasePlan, buyAge,
    loanEndAfterBuy, loanEndAge, currentHouseType,
  });

  return { rows, events: dedupeEvents(events), meta, emergencyFund };
}

// =========================================================
// 診断メタ情報の抽出
// =========================================================
function extractMeta(rows, ctx) {
  const result = {
    assetDepletionAge:       null, // 現預金+投資資産が両方なくなる年齢
    cashBelowEmergencyAge:   null, // 現預金が防衛資金を下回る最初の年齢
    investWithdrawStartAge:  null, // 投資資産の取り崩し開始年齢
    maxEduCostAge:           null, // 教育費が最大の年齢
    loanPayoffAge:           null, // ローン完済年齢
    peakAssetAge:            null, // 資産ピーク年齢
    peakAssetAmount:         0,
  };

  let maxEduCost = 0;
  let prevInvestment = (rows[0] || {}).investment ?? 0;
  let prevInvestAge  = rows[0]?.age ?? 0;

  rows.forEach((r, idx) => {
    // 資産枯渇判定（現預金も投資資産もゼロ）
    if (result.assetDepletionAge === null && r.cash <= 0 && r.investment <= 0 && !r.isWorking) {
      result.assetDepletionAge = r.age;
    }

    // 現預金が防衛資金を下回る（退職後のみ）
    if (result.cashBelowEmergencyAge === null && r.cash < r.emergencyFund && !r.isWorking) {
      result.cashBelowEmergencyAge = r.age;
    }

    // 投資資産取り崩し開始（退職後に投資が減少した最初の年）
    if (result.investWithdrawStartAge === null && idx > 0 && !r.isWorking && r.investment < prevInvestment) {
      result.investWithdrawStartAge = r.age;
    }
    if (!r.isWorking) {
      prevInvestment = r.investment;
    }

    // 教育費ピーク
    if (r.eduCost > maxEduCost) {
      maxEduCost = r.eduCost;
      result.maxEduCostAge = r.age;
    }

    // 資産ピーク
    if (r.totalAsset > result.peakAssetAmount) {
      result.peakAssetAmount = r.totalAsset;
      result.peakAssetAge    = r.age;
    }
  });

  // 住宅ローン完済
  if (ctx.hasPurchasePlan && ctx.loanEndAfterBuy < 999) {
    result.loanPayoffAge = ctx.loanEndAfterBuy;
  } else if (!ctx.hasPurchasePlan && ctx.currentHouseType === 'own' && ctx.loanEndAge < 99) {
    result.loanPayoffAge = ctx.loanEndAge;
  }

  return result;
}

// =========================================================
// イベントの重複排除（同一年・同一ラベルの重複を除去）
// =========================================================
function dedupeEvents(events) {
  const seen = new Set();
  return events.filter(e => {
    const key = `${e.age}-${e.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.age - b.age);
}

// =========================================================
// 診断スコア計算
// 各観点をスコアリングして総合スコアを算出
// =========================================================
function calcScores(rows, data, meta, emergencyFund) {
  const f   = data.family    || {};
  const i1  = data.income1   || {};
  const ins = data.insurance || {};
  const hw  = data.housing   || {};
  const as  = data.assets    || {};

  const selfAge   = parseInt(f.ageSelf    || 35);
  const i1Retire  = parseInt(i1.retireAge || 65);
  const retireRow = rows.find(r => r.age === i1Retire) || rows[rows.length - 1];
  const firstRow  = rows[0] || {};

  // ---- ① ライフプラン（枯渇リスク・退職時資産） ----
  let scoreLifePlan = 100;

  // 現役中の枯渇
  const depletionDuringWork = meta.assetDepletionAge !== null && meta.assetDepletionAge <= i1Retire;
  if (depletionDuringWork) {
    scoreLifePlan -= 50;
  } else if (meta.assetDepletionAge !== null && meta.assetDepletionAge <= 75) {
    scoreLifePlan -= 30;
  } else if (meta.assetDepletionAge !== null && meta.assetDepletionAge <= 85) {
    scoreLifePlan -= 15;
  } else if (meta.assetDepletionAge !== null) {
    scoreLifePlan -= 8;
  }

  // 退職時資産が少ない場合も減点
  if (retireRow) {
    const yearsOfRetire = 90 - i1Retire;
    const annualExp = parseFloat(data.living?.annualExpense || 240);
    const minRetireAsset = annualExp * Math.min(yearsOfRetire, 25) * 0.4; // 年間支出×25年×40%
    if (retireRow.totalAsset < emergencyFund) {
      scoreLifePlan -= 20;
    } else if (retireRow.totalAsset < minRetireAsset) {
      scoreLifePlan -= 10;
    }
  }
  scoreLifePlan = Math.max(0, Math.min(100, scoreLifePlan));

  // ---- ② 現預金不足（現役中） ----
  const workRows = rows.filter(r => r.isWorking);
  const cashShortYears = workRows.filter(r => r.cash < r.emergencyFund).length;
  // 現役期間の何%で不足しているか
  const cashShortRatio = workRows.length > 0 ? cashShortYears / workRows.length : 0;
  let scoreCash = 100 - Math.round(cashShortRatio * 100);
  // 住宅購入年の一括支出後に厳しくなる場合も評価
  if (meta.cashBelowEmergencyAge !== null && meta.cashBelowEmergencyAge <= i1Retire) {
    scoreCash = Math.max(0, scoreCash - 15);
  }
  scoreCash = Math.max(0, Math.min(100, scoreCash));

  // ---- ③ 死亡保障（必要保障額 vs 現在の保障） ----
  const needMonthly  = parseFloat(ins.needMonthly        || 0);
  const needUntilAge = parseInt(ins.needUntilAge          || 65);
  const remainYears  = Math.max(0, needUntilAge - selfAge);
  const totalNeed    = needMonthly * 12 * remainYears;

  // 新UI: hasLifeIns / receiveType ベースの保障額算出
  // 後方互換：旧 incomeProtectMonthly / lumpSumCoverage も参照
  let currentCov = 0;
  const hasLifeIns  = ins.hasLifeIns  || '';
  const receiveType = ins.receiveType || '';

  if (hasLifeIns === 'yes' && receiveType && receiveType !== 'unsure') {
    const lumpVal   = parseFloat(ins.lumpSumCoverage       || 0);
    const annuityMV = parseFloat(ins.incomeProtectMonthly  || 0);
    const annuityEnd= parseInt(ins.incomeProtectUntil       || 65);
    const ipYears   = Math.max(0, annuityEnd - selfAge);
    const annuityEq = annuityMV * 12 * ipYears;
    currentCov = lumpVal + annuityEq;
  } else if (!hasLifeIns) {
    // 旧UIデータとの後方互換
    const ipMonthly = parseFloat(ins.incomeProtectMonthly || 0);
    const ipUntil   = parseInt(ins.incomeProtectUntil     || 65);
    const ipYears   = Math.max(0, ipUntil - selfAge);
    currentCov = ipMonthly * 12 * ipYears + parseFloat(ins.lumpSumCoverage || 0);
  }
  // hasLifeIns === 'no' || 'unsure' → currentCov = 0

  const insGap       = Math.max(0, totalNeed - currentCov);
  let scoreIns;
  if (totalNeed <= 0) {
    scoreIns = 80; // 必要保障額未入力
  } else {
    const coverRatio = Math.min(1, currentCov / totalNeed);
    scoreIns = Math.round(coverRatio * 100);
  }
  if (ins.hasDisability === 'no') scoreIns = Math.max(0, scoreIns - 10);
  if (ins.hasMedical    === 'no') scoreIns = Math.max(0, scoreIns - 5);
  // 死亡保障なし/不明の場合は追加減点
  if (hasLifeIns === 'no')     scoreIns = Math.max(0, scoreIns - 20);
  if (hasLifeIns === 'unsure') scoreIns = Math.max(0, scoreIns - 10);
  scoreIns = Math.max(0, Math.min(100, scoreIns));

  // ===== 住まい・住宅資金 スコア（3項目加算式：100点満点） =====
  const hasPlan = hw.purchasePlan === 'yes';
  const bAge    = parseInt(hw.buyAge || 99);
  const bRow    = hasPlan ? rows.find(r => r.age === bAge) : null;
  const evalRow = (hasPlan && bRow) ? bRow : firstRow;

  // --- ① 住宅費負担率スコア（最大50点）---
  const i1GrossNow     = parseFloat(i1.grossIncome || 0);
  const i2GrossNow     = parseFloat(data.income2?.grossIncome || 0);
  const hasSpouseLocal = data.family?.hasSpouse === 'yes';
  const householdGross = i1GrossNow + (hasSpouseLocal ? i2GrossNow : 0);
  const grossBase      = householdGross > 0 ? householdGross : (evalRow.income > 0 ? evalRow.income : 1);
  const evalRatio      = evalRow.housingCost > 0 ? evalRow.housingCost / grossBase : 0;
  let ratioScore;
  if      (evalRatio <= 0.15) ratioScore = 50;
  else if (evalRatio <= 0.20) ratioScore = 45;
  else if (evalRatio <= 0.25) ratioScore = 35;
  else if (evalRatio <= 0.30) ratioScore = 20;
  else if (evalRatio <= 0.35) ratioScore = 10;
  else                        ratioScore = 0;

  const ratioText = (grossBase > 0 && evalRow.housingCost > 0)
    ? (evalRatio * 100).toFixed(1) + '%' : '―';

  // --- ② 現預金・生活防衛資金スコア（最大25点）---
  let cashScore25 = 0;
  let cashComment = '';
  const oneMo = emergencyFund / 6;
  if (hasPlan && bRow) {
    const postCash = bRow.cash;
    const months   = oneMo > 0 ? postCash / oneMo : 99;
    if      (months >= 12) { cashScore25 = 25; }
    else if (months >= 6)  { cashScore25 = 20; cashComment = '購入直後の現預金が生活防衛資金の12か月分を下回ります（約' + Math.round(postCash) + '万円）。'; }
    else if (months >= 3)  { cashScore25 = 12; cashComment = '購入直後の現預金が生活防衛資金の6か月分を下回ります（約' + Math.round(postCash) + '万円）。'; }
    else if (months >= 1)  { cashScore25 =  5; cashComment = '購入直後の現預金が生活防衛資金の3か月分を下回ります（約' + Math.round(postCash) + '万円）。'; }
    else                   { cashScore25 =  0; cashComment = '購入直後の現預金が生活防衛資金の1か月分未満です（約' + Math.round(postCash) + '万円）。早急に見直しが必要です。'; }
  } else {
    const nowCash = firstRow.cash;
    const months  = oneMo > 0 ? nowCash / oneMo : 99;
    if      (months >= 12) { cashScore25 = 25; }
    else if (months >= 6)  { cashScore25 = 20; cashComment = '現在の現預金が生活防衛資金の12か月分を下回っています。'; }
    else if (months >= 3)  { cashScore25 = 12; cashComment = '現在の現預金が生活防衛資金の6か月分を下回っています。'; }
    else if (months >= 1)  { cashScore25 =  5; cashComment = '現在の現預金が生活防衛資金の3か月分を下回っています。'; }
    else                   { cashScore25 =  0; cashComment = '現在の現預金が生活防衛資金の1か月分未満です。早急な見直しが必要です。'; }
  }

  // --- ③ 将来キャッシュフロースコア（最大25点）---
  const depletionAge = meta.assetDepletionAge;
  let cfScore25;
  let cfComment = '';
  if (!depletionAge) {
    cfScore25 = 25;
  } else if (depletionAge > 80) {
    cfScore25 = 18; cfComment = depletionAge + '歳頃に資産が枯渇する見込みです。';
  } else if (depletionAge >= 65) {
    cfScore25 = 8;  cfComment = depletionAge + '歳頃（老後）に資産が枯渇する見込みです。';
  } else {
    cfScore25 = 0;  cfComment = depletionAge + '歳頃（現役中）に資産が枯渇する見込みです。';
  }

  // --- 完済年齢による減点 ---
  const loanEndAge = hasPlan
    ? bAge + parseInt(hw.loanTerm || 35)
    : (!hasPlan && hw.currentType === 'own' ? parseInt(hw.loanEndAge || 99) : 0);
  let payoffPenalty = 0;
  let payoffComment = '';
  if (loanEndAge > 0 && loanEndAge <= 999) {
    if      (loanEndAge >= 81) { payoffPenalty = 20; payoffComment = '住宅ローンの返済が老後まで続く予定です。退職後の返済原資と、教育費・老後生活費との重なりを確認しましょう。'; }
    else if (loanEndAge >= 76) { payoffPenalty = 12; payoffComment = '住宅ローンの返済が老後まで続く予定です。退職後の返済原資と、教育費・老後生活費との重なりを確認しましょう。'; }
    else if (loanEndAge >= 71) { payoffPenalty =  7; payoffComment = '住宅ローンの返済が老後まで続く予定です。退職後の返済原資と、教育費・老後生活費との重なりを確認しましょう。'; }
    else if (loanEndAge >= 66) { payoffPenalty =  3; payoffComment = '住宅ローンの返済が老後まで続く予定です。退職後の返済原資と、教育費・老後生活費との重なりを確認しましょう。'; }
  }

  // --- 頭金0円注意 ---
  const downPayment   = parseFloat(hw.downPayment || 0);
  const noDownComment = (hasPlan && downPayment === 0)
    ? '頭金なしの計画です。購入時の諸費用と、購入後に残る現預金を確認しましょう。' : '';

  // --- 合計スコア（0〜100）---
  let scoreHousing = ratioScore + cashScore25 + cfScore25 - payoffPenalty;

  // --- 最低点ルール ---
  const noDepletion   = !depletionAge;
  const hasAssetAfter = hasPlan && bRow ? (bRow.cash > 0 || bRow.investment > 0) : true;
  const ratioUnder35  = evalRatio <= 0.35;
  if (noDepletion && hasAssetAfter && ratioUnder35) scoreHousing = Math.max(40, scoreHousing);
  if (noDepletion && payoffPenalty > 0)             scoreHousing = Math.max(40, scoreHousing);
  scoreHousing = Math.max(0, Math.min(100, scoreHousing));

  // --- 診断コメント ---
  let housingComment = '';
  if (evalRow.income <= 0 && !hasPlan) {
    housingComment = '収入情報が未入力のため、住宅費負担率を計算できません。';
  } else if (!hasPlan && firstRow.housingCost === 0) {
    housingComment = '住宅費の入力がありません。';
  } else {
    if      (evalRatio <= 0.15) housingComment = '返済負担率は' + ratioText + 'で、余裕のある水準です。';
    else if (evalRatio <= 0.20) housingComment = '返済負担率は' + ratioText + 'で、許容範囲です。';
    else if (evalRatio <= 0.25) housingComment = '返済負担率は' + ratioText + 'で、やや高めです。';
    else if (evalRatio <= 0.30) housingComment = '返済負担率は' + ratioText + 'で、家計への圧迫が懸念されます。';
    else if (evalRatio <= 0.35) housingComment = '返済負担率は' + ratioText + 'で、高水準です。';
    else if (evalRatio > 0)     housingComment = '返済負担率は' + ratioText + 'と高く、生活費を圧迫するリスクがあります。';
    const subComments = [cashComment, cfComment, payoffComment, noDownComment].filter(Boolean);
    if (subComments.length > 0) housingComment += 'また、' + subComments[0];
    if (subComments.length > 1) housingComment += subComments[1];
    if (!cashComment && !cfComment && !payoffComment && !noDownComment) {
      if (hasPlan && bRow && bRow.cash >= emergencyFund * 2) housingComment += '購入後の手元資金も十分に確保できる見込みです。';
    }
  }
  const housingRatio = evalRatio;
  const scorePoint   = Math.round(scoreHousing / 100 * 4) + 1;

  // ---- ⑤ 資産運用（積立状況・退職時資産・資産配分） ----
  const retireAsset   = retireRow ? retireRow.totalAsset : 0;
  const annualExpense = parseFloat(data.living?.annualExpense || 240);
  // FIREルール（4%ルール）をベースに老後25年の資産目安
  const targetRetire  = annualExpense * 25;
  let scoreInvest = Math.min(100, Math.round((retireAsset / targetRetire) * 100));

  // 現在の資産配分チェック（現預金ばかりはマイナス）
  const totalNowAsset = parseFloat(as.cash || 0) + parseFloat(as.investment || 0) + parseFloat(as.dc || 0);
  const cashRatio = totalNowAsset > 0 ? parseFloat(as.cash || 0) / totalNowAsset : 1;
  if (cashRatio > 0.9 && totalNowAsset > emergencyFund * 3) {
    // 3倍以上の現預金があるのに全部現金はもったいない
    scoreInvest = Math.max(0, scoreInvest - 15);
  } else if (cashRatio > 0.7 && totalNowAsset > emergencyFund * 5) {
    scoreInvest = Math.max(0, scoreInvest - 8);
  }
  // 積立なしはさらに減点
  const monthlySaving = parseFloat(as.monthlySaving || 0) + parseFloat(as.dcMonthly || 0);
  if (monthlySaving <= 0) scoreInvest = Math.max(0, scoreInvest - 10);
  scoreInvest = Math.max(0, Math.min(100, scoreInvest));

  // ---- 総合スコア = 4分野（ライフプラン・万一への備え・資産運用・住まい）の平均 ----
  // 未入力のまま結果へ進んだ場合でも NaN を画面に出さないため、最後に必ず正規化する。
  const normalizeScore = (value, fallback = 0) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(100, Math.round(n)));
  };

  scoreLifePlan = normalizeScore(scoreLifePlan, 0);
  scoreIns      = normalizeScore(scoreIns, 80);
  scoreInvest   = normalizeScore(scoreInvest, 0);
  scoreHousing  = normalizeScore(scoreHousing, 0);

  const overall = Math.round((scoreLifePlan + scoreIns + scoreInvest + scoreHousing) / 4);

  return {
    overall:        normalizeScore(overall, 0),
    lifePlan:       scoreLifePlan,
    insurance:      scoreIns,
    investment:     scoreInvest,
    housing:        scoreHousing,
    cashScore:      scoreCash,
    insGap,
    currentCov,
    totalNeed,
    housingRatio:   Number.isFinite(housingRatio) ? Math.round(housingRatio * 1000) / 10 : 0,
    housingPoint:   Number.isFinite(scorePoint) ? scorePoint : 0,
    housingComment: housingComment,
  };
}

// =========================================================
// 優先課題の自動抽出（最大3件）
// =========================================================
function extractIssues(rows, data, meta, scores, emergencyFund) {
  const issues = [];
  const selfAge  = parseInt(data.family?.ageSelf  || 35);
  const i1Retire = parseInt(data.income1?.retireAge || 65);
  const ins      = data.insurance || {};

  // --- 課題1：現役中の資産枯渇（最重要）---
  if (meta.assetDepletionAge !== null && meta.assetDepletionAge <= i1Retire) {
    issues.push({
      priority: 1,
      title:    `${meta.assetDepletionAge}歳（現役中）に資産が枯渇する見込みです`,
      why:      `現在の収支・積立・運用方針で計算すると、${meta.assetDepletionAge}歳頃に現預金と運用資産の両方がなくなる見込みです。退職を迎える前に資産が尽きる可能性があります。`,
      action:   `①固定費・支出の見直し、②積立額の増額、③就業終了年齢の延長を検討してください。`,
    });
  }

  // --- 課題2：老後の資産枯渇 ---
  if (meta.assetDepletionAge !== null && meta.assetDepletionAge > i1Retire && issues.length < 3) {
    const isEarly = meta.assetDepletionAge <= 80;
    issues.push({
      priority: issues.length + 1,
      title:    `${meta.assetDepletionAge}歳頃に資産が枯渇する見込みです`,
      why:      `現在の計画では${meta.assetDepletionAge}歳頃に資産が底をつく見込みです。${isEarly ? '比較的早い段階での枯渇です。' : '90歳まで資産を維持するための対策が必要です。'}`,
      action:   `①iDeCo・NISAの積立増額、②年金受給開始年齢の繰下げ（+8.4%/年）、③支出水準の見直しを検討してください。`,
    });
  }

  // --- 課題3：死亡保障不足 ---
  if (scores.insGap > 500 && issues.length < 3) {
    issues.push({
      priority: issues.length + 1,
      title:    '死亡・就業不能の保障が不足している可能性があります',
      why:      `必要保障額の試算では、現在の保障との差が約 ${Math.round(scores.insGap).toLocaleString('ja-JP')} 万円ある見込みです。万一の際に遺族の生活費が賄えなくなるリスクがあります。`,
      action:   `現在の保険の保障額・受取期間・特約内容を整理し、必要保障額と比較してください。収入保障保険で効率よく準備できる場合があります。`,
    });
  }

  // --- 課題3a：死亡保障なし（保障不足より優先） ---
  if (ins.hasLifeIns === 'no' && scores.totalNeed > 0 && issues.length < 3) {
    if (!issues.find(i => i.title.includes('死亡'))) {
      issues.push({
        priority: issues.length + 1,
        title:    '死亡保障に加入していません',
        why:      `死亡保障がない場合、万一の際に遺族の生活費を賄う手段がなくなります。必要保障額の試算は約 ${Math.round(scores.totalNeed).toLocaleString('ja-JP')} 万円です。`,
        action:   `定期保険・収入保障保険などでの保障準備を検討してください。ライフステージに合わせた保障額を専門家と確認しましょう。`,
      });
    }
  }

  // ===== 住宅関連課題（最優先候補4条件） =====
  if (data.housing?.purchasePlan === 'yes') {
    const bAge2 = parseInt(data.housing.buyAge || 99);
    const bRow2 = rows.find(r => r.age === bAge2);
    const loanTerm2 = parseInt(data.housing.loanTerm || 35);
    const loanEnd2  = bAge2 + loanTerm2;

    // 条件①：購入直後の生活防衛資金割れ
    if (issues.length < 3 && bRow2 && bRow2.cash < emergencyFund) {
      if (bRow2.cash <= 0) {
        issues.push({ priority: issues.length + 1,
          title:  '住宅購入直後に現預金が0円以下になる見込みです',
          why:    `頭金・諸費用の支払い後、現預金がマイナスになる試算です（約${Math.round(bRow2.cash)}万円）。`,
          action: `頭金額を引き下げるか購入時期を遅らせ、手元資金を確保した上での購入を検討してください。` });
      } else {
        issues.push({ priority: issues.length + 1,
          title:  '住宅購入後の手元資金が生活防衛資金を下回る見込みです',
          why:    `頭金・諸費用の支払い後、現預金が生活防衛資金（${Math.round(emergencyFund)}万円）を下回る見込みです（購入直後：約${Math.round(bRow2.cash)}万円）。`,
          action: `頭金の割合を調整するか購入時期を遅らせ、購入後も生活防衛資金6か月分を確保する計画に見直してください。` });
      }
    }

    // 条件②：住宅費負担率30%超
    if (issues.length < 3 && bRow2 && bRow2.income > 0 && (bRow2.housingCost / bRow2.income) > 0.30) {
      const r2 = (bRow2.housingCost / bRow2.income * 100).toFixed(1);
      issues.push({ priority: issues.length + 1,
        title:  `住宅費の返済負担率が${r2}%と高水準です`,
        why:    `購入後のローン返済額が世帯手取りの30%を超えており、日常生活費・貯蓄余力が大きく制約される恐れがあります。`,
        action: `借入額の圧縮（物件価格・頭金の見直し）または返済期間の延長により、返済負担率を25%以下に抑えることを検討してください。` });
    }

    // 条件③：教育費ピーク時に現預金が生活防衛資金を下回る
    if (issues.length < 3 && meta.maxEduCostAge && meta.maxEduCostAge >= bAge2 && meta.maxEduCostAge < loanEnd2) {
      const ePeakRow = rows.find(r => r.age === meta.maxEduCostAge);
      if (ePeakRow && ePeakRow.cash < emergencyFund) {
        issues.push({ priority: issues.length + 1,
          title:  `教育費ピーク（${meta.maxEduCostAge}歳頃）時にローン返済との二重負担が発生します`,
          why:    `教育費が最大となる${meta.maxEduCostAge}歳頃に住宅ローン返済が重なり、現預金が生活防衛資金を下回る見込みです（約${Math.round(ePeakRow.cash)}万円）。`,
          action: `教育資金を早期に別途積み立てる（学資保険・ジュニアNISA）か、繰り上げ返済でローン負担を軽減することを検討してください。` });
      }
    }

    // 条件④：65歳以降の返済で資産枯渇
    if (issues.length < 3 && loanEnd2 > 65) {
      const postR = rows.filter(r => r.age >= 65 && r.age < loanEnd2 && !r.isWorking);
      if (postR.some(r => r.cash <= 0 && r.investment <= 0)) {
        issues.push({ priority: issues.length + 1,
          title:  `老後もローン返済が続き（${loanEnd2}歳まで）、資産枯渇の恐れがあります`,
          why:    `65歳以降も${loanEnd2}歳まで住宅ローン返済が続く計画で、その期間中に現預金・運用資産が枯渇する試算です。`,
          action: `繰り上げ返済で返済期間を短縮するか、退職前に住宅ローンを完済できるよう購入時期・借入額を見直してください。` });
      }
    }
  }

  // 購入計画なし・高負担率チェック
  const firstRow = rows[0] || {};
  if (data.housing?.purchasePlan !== 'yes' && issues.length < 3) {
    if (firstRow.income > 0 && (firstRow.housingCost / firstRow.income) > 0.30) {
      const r3 = (firstRow.housingCost / firstRow.income * 100).toFixed(1);
      issues.push({ priority: issues.length + 1,
        title:  `住宅費の負担率が${r3}%と高い状態です`,
        why:    `現在の住宅費（ローン返済または家賃）が世帯手取りの30%を超えており、生活費や貯蓄の余力が少ない状態です。`,
        action: `住み替え・ローンの借り換えなどで住宅費の削減ができないか検討してください。` });
    }
  }

  // --- 課題5：就業不能リスクへの備えなし ---
  if (ins.hasDisability === 'no' && selfAge < 55 && issues.length < 3) {
    issues.push({
      priority: issues.length + 1,
      title:    '就業不能リスクへの備えが確認できません',
      why:      `長期の病気・ケガで就労できなくなった場合、給与収入がゼロになります。公的保障（傷病手当金・障害年金）だけでは生活費を賄えないケースが多くあります。`,
      action:   `傷病手当金の受給期間・金額を確認し、就業不能保険や収入保障保険の必要性を専門家と検討してください。`,
    });
  }

  // --- 課題6：退職時資産が少ない（枯渇はないが不十分）---
  if (meta.assetDepletionAge === null && issues.length < 3) {
    const retireRow    = rows.find(r => r.age === i1Retire);
    const annualExpense = parseFloat(data.living?.annualExpense || 240);
    if (retireRow && retireRow.totalAsset < annualExpense * 10) {
      issues.push({
        priority: issues.length + 1,
        title:    '退職時の資産残高が少ない水準です',
        why:      `退職時（${i1Retire}歳）の資産残高試算は約 ${Math.round(retireRow.totalAsset).toLocaleString('ja-JP')} 万円です。年金収入だけでは生活費を賄えない月が生じる可能性があります。`,
        action:   `ねんきんネットで年金見込額を確認し、iDeCo・NISAで不足分を補う計画を立ててください。`,
      });
    }
  }

  return issues.slice(0, 3); // 最大3件
}

// グローバル公開
window.CalcEngine = {
  calcCashflow,
  calcScores,
  extractIssues,
};

/**
 * ライフプランシミュレーター 型定義ファイル
 */

export const CURRENT_SCHEMA_VERSION = 3;

// 性別型
export type Gender = 'male' | 'female' | 'other' | 'unspecified';

// 働き方・年金加入区分
export type WorkStyle = 'employee' | 'public_servant' | 'part_time' | 'self_employed' | 'not_working' | 'other';
export type PensionType = 'employees_pension' | 'national_pension_only' | 'unknown';

// 学歴・学校種別
export type SchoolStage = 'nursery' | 'kindergarten' | 'elementary' | 'juniorHigh' | 'highSchool' | 'university';
export type SchoolType = 'public' | 'private';
export type UniversityLivingType = 'home' | 'away';

// 子ども情報
export interface ChildInput {
  id: string;
  name: string;
  currentAge: number;
  schoolType: {
    nursery?: SchoolType; // 乳幼児・保育園 (0〜2歳)
    kindergarten: SchoolType;
    elementary: SchoolType;
    juniorHigh: SchoolType;
    highSchool: SchoolType;
    university: SchoolType;
  };
  universityLivingType: UniversityLivingType;
  customActualAnnualCost?: number; // 現在実際にかかっている年間教育費の実数（入力がある場合は優先）
  isFutureChild?: boolean;         // 将来予定の子どもか
  birthInYears?: number;           // 将来生まれるまでの年数（0なら現在0歳）
}

// 年収変更イベント ("○歳から年収○万円")
export interface IncomeChangeEvent {
  id: string;
  age: number;
  grossAmount: number; // 万円
}

// 個人所得・働き方設定
export interface PersonIncomeInput {
  workStyle?: WorkStyle;           // 働き方
  pensionType?: PensionType;       // 年金加入区分
  currentGrossIncome: number;      // 額面年収 (万円)
  currentNetIncome?: number;       // 手取り年収 (万円) - オプションだが入力優先
  retirementAge: number;          // 退職年齢
  annualGrowthRate: number;        // 現在から指定年齢までの年収上昇率 (%)
  incomeChangeEvents: IncomeChangeEvent[]; // 年収変更イベント一覧
  pensionEstimate: number;         // 年金見込額 (万円/年)
  pensionStartAge: number;         // 年金受給開始年齢
  retirementAllowance: number;     // 退職金 (万円)
  retirementAllowanceAge: number;  // 退職金受取年齢
  otherIncome: number;             // その他の継続収入 (万円/年)
  otherIncomeStartAge?: number;
  otherIncomeEndAge?: number;
}

// 生活費・物価設定
export interface LivingExpensesInput {
  monthlyExpense: number;          // 現在の毎月生活費 (万円/月)
  annualOneOffExpense: number;     // 年間の臨時生活費 (万円/年)
  inflationRate: number;           // 物価上昇率 (%)
  insurancePremiumMonthly: number; // 保険料 (万円/月)
  insuranceEndAge: number;         // 保険料払込終了年齢
}

// 死亡保障・必要保障額入力
export type InsuredPerson = 'person' | 'spouse';
export type DeathBenefitType = 'lump_sum' | 'income';
export type InsuranceInputMode = 'simple' | 'detailed';

export interface DeathBenefitInput {
  id: string;
  label: string;
  insuredPerson: InsuredPerson;
  benefitType: DeathBenefitType;
  lumpSumAmount: number;    // 一時金保障額 (万円)
  monthlyAmount: number;    // 毎月受取額 (万円/月)
  coverageEndAge: number;   // 保障終了年齢 (歳)
  wholeLife: boolean;       // 終身保障フラグ
}

export interface ProtectionScenarioInput {
  survivorLivingExpenseRate: number; // 万一後の基本生活費割合 (%) 例: 70
  annualSurvivorBenefit: number;     // 遺族年金等の見込額 (万円/年)
  survivorBenefitEndAge: number;     // 遺族年金等の受取終了年齢 (歳)
  funeralExpense: number;            // 葬儀・整理資金 (万円)
  mortgageCoveredByDanshin: boolean; // 団信等で住宅ローンが完済されるか
  calculationEndAge: number;         // 必要保障額の計算対象終了年齢（歳 例: 65, 100=シミュレーション最後）
  useEstimatedSurvivorBenefit?: boolean; // 参考目安を使用するか (初期値: true)
}

export interface InsuranceInput {
  inputMode: InsuranceInputMode;
  deathBenefits: DeathBenefitInput[];
  protectionScenarios: {
    personDeath: ProtectionScenarioInput;
    spouseDeath: ProtectionScenarioInput;
  };
}

// 教育費標準値構造
export interface StageEducationCost {
  publicAnnual: number;  // 公立年間学費 (万円)
  privateAnnual: number; // 私立年間学費 (万円)
  durationYears: number; // 年数
  entranceAge: number;   // 入学年齢
}

export interface EducationCostsMaster {
  lastUpdated: string;
  source: string;
  baseYear: number;
  stages: {
    nursery: StageEducationCost;
    kindergarten: StageEducationCost;
    elementary: StageEducationCost;
    juniorHigh: StageEducationCost;
    highSchool: StageEducationCost;
    university: StageEducationCost;
  };
  universityLivingAwayExtraAnnual: number; // 自宅外通学の年間追加生活・仕送り費 (万円)
}

// 現在の住まい設定
export type HousingType = 'rent' | 'own_loan' | 'own_noloan' | 'family';

export interface RentHousingInput {
  monthlyRent: number;             // 月額家賃 (万円)
  rentEndAge: number;              // 退去・住み替え予定年齢
  futureRentChanges: { id: string; age: number; monthlyRent: number }[];
}

export interface ExistingLoanHousingInput {
  loanBalance: number;             // 住宅ローン残高 (万円)
  interestRate: number;            // 金利 (%)
  remainingYears: number;          // 残り返済期間 (年)
  managementFeeMonthly: number;    // 管理費・修繕積立金等の月額 (万円/月)
  propertyTaxAnnual: number;       // 固定資産税・修繕費等の年額 (万円/年)
}

export interface CurrentHousingInput {
  type: HousingType;
  rent: RentHousingInput;
  ownLoan: ExistingLoanHousingInput;
  ownNoLoan: {
    managementFeeMonthly: number;
    propertyTaxAnnual: number;
  };
}

// 将来の住宅購入・住み替え設定
export type FutureHousingPlanType = 'none' | 'purchase' | 'relocate';
export type ExistingHousingSaleChoice = 'sell' | 'keep' | 'undecided';

export interface FutureHousingInput {
  planType: FutureHousingPlanType;
  purchaseAge: number;             // 購入・住み替え年齢 (本人の年齢)
  propertyPrice: number;           // 住宅価格 (万円)
  downPayment: number;             // 頭金 (万円)
  purchaseExpenses: number;        // 購入諸費用 (万円)
  loanAmount: number;              // 借入額 (万円)
  interestRate: number;            // 金利 (%)
  loanTermYears: number;           // 返済期間 (年)
  postPurchaseManagementFeeMonthly: number; // 購入後管理費・修繕積立金 (万円/月)
  postPurchasePropertyTaxAnnual: number;    // 購入後固定資産税・都市計画税等 (万円/年)
  
  // 住み替え時の旧居扱い
  sellCurrentHousing: ExistingHousingSaleChoice;
  expectedSalePrice: number;       // 想定売却価格 (万円)
  saleExpenseRate: number;         // 売却費用率 (例: 3.3% -> 3.3)
}

// 金融資産設定 (現在の資産)
export interface FinancialAssetsInput {
  currentCash: number;             // 現預金 (万円)
  currentTaxableAssets: number;    // NISA、投資信託、株式等の換金可能資産 (万円)
  otherAssets: number;             // その他換金可能資産 (万円)
}

// 資産運用設定
export type WithdrawalMethod = 'lump_sum' | 'equal_split' | 'invested_split';

export interface InvestmentPlanInput {
  monthlyContribution: number;     // 毎月積立額 (万円/月)
  contributionStartAge: number;    // 積立開始年齢
  contributionEndAge: number;      // 積立終了年齢
  expectedYieldRate: number;       // 想定運用利回り (%)
  
  withdrawalStartAge: number;      // 取り崩し開始年齢
  withdrawalMethod: WithdrawalMethod; // 取り崩し方法
  withdrawalYears: number;         // 受取・取り崩し年数
}

export interface RecurringInvestmentInput {
  id: string;
  name: string;
  monthlyContribution: number;
  contributionStartAge: number;
  contributionEndAge: number;
  expectedYieldRate: number;
}

export interface CapitalPlanInput {
  id: string;
  name: string;
  mode: 'compound' | 'withdrawal';
  source: 'cash' | 'taxable';
  principal: number;
  expectedYieldRate: number;
  startAge: number;
  years: number;
}

// DC・iDeCo設定
export interface DcPlanInput {
  currentBalance: number;          // 現在残高 (万円)
  monthlyContribution: number;     // 毎月拠出額 (万円/月)
  contributionEndAge: number;      // 拠出終了年齢
  expectedYieldRate: number;       // 想定運用利回り (%)
  withdrawalStartAge: number;      // 受取開始年齢
  withdrawalType: 'lump_sum' | 'split'; // 一括受取 or 分割受取
  withdrawalYears: number;         // 分割受取年数
}

// 一時収支イベント
export interface OneOffEventInput {
  id: string;
  name: string;
  age: number;                     // 発生年齢 (本人の年齢)
  type: 'income' | 'expense';
  amount: number;                  // 金額 (万円)
}

// シミュレーション全入力データ
export interface LifePlanInput {
  schemaVersion: number;
  
  // STEP 1
  personAge: number;
  gender?: Gender;
  hasSpouse: boolean;
  spouseAge: number;
  calculationEndAge: number;
  children: ChildInput[];
  
  // STEP 2
  personIncome: PersonIncomeInput;
  spouseIncome: PersonIncomeInput;
  
  // STEP 3
  livingExpenses: LivingExpensesInput;
  insurance: InsuranceInput;
  
  // STEP 5 & 6
  currentHousing: CurrentHousingInput;
  futureHousing: FutureHousingInput;
  
  // STEP 7
  financialAssets: FinancialAssetsInput;
  
  // STEP 8 & 9
  investmentPlan: InvestmentPlanInput;
  investmentPlans?: RecurringInvestmentInput[];
  capitalPlans?: CapitalPlanInput[];
  dcPlan: DcPlanInput;
  
  // STEP 10
  oneOffEvents: OneOffEventInput[];
}

// 年次キャッシュフローの1行
export interface AnnualCashflowRow {
  year: number;                    // 暦年 (例: 2026)
  elapsedYears: number;            // 経過年数 (0年目期首資産 = 0)
  personAge: number;               // 本人年齢
  spouseAge: number;               // 配偶者年齢
  events: string[];                // イベントタグ・コメント (例: ["退職", "住宅購入"])
  
  // 期首資産 (Start of Year)
  startCash: number;
  startTaxableAssets: number;
  startRestrictedAssets: number;
  startTotalAssets: number;
  
  // 当年中の外部収入 (Incomes)
  personNetSalary: number;         // 本人手取り給与 (万円)
  spouseNetSalary: number;         // 配偶者手取り給与 (万円)
  salaryIncome: number;            // 給与・手取り収入 (本人+配偶者)
  pensionIncome: number;           // 年金収入 (本人+配偶者)
  otherIncome: number;             // その他継続収入
  retirementAllowance: number;     // 退職金
  housingSaleProceeds: number;     // 住宅売却手取り
  otherOneOffIncome: number;       // その他一時収入
  totalIncome: number;             // 総収入
  
  // 当年中の消費・実支出 (Expenses)
  livingExpenses: number;          // 生活費 (物価スライド)
  educationExpenses: number;       // 教育費 (物価スライド)
  existingMortgagePayments: number; // 旧住宅ローン返済額
  newMortgagePayments: number;     // 新住宅ローン返済額
  mortgagePayments: number;        // 住宅ローン返済額 (合計)
  rentExpenses: number;            // 家賃 (物価スライド)
  existingHousingMaintenanceExpenses: number; // 旧住宅維持費・管理費・固定資産税
  newHousingMaintenanceExpenses: number;      // 新住宅維持費・管理費・固定資産税
  housingMaintenanceExpenses: number; // 住宅維持費・管理費・固定資産税 (合計)
  housingExpenses: number;         // 住宅関連支出合計 (mortgagePayments + rentExpenses + housingMaintenanceExpenses)
  insuranceExpenses: number;       // 保険料 (物価スライド)
  housingPurchaseInitialExpenses: number; // 住宅購入初期費用 (頭金+諸費用)
  otherOneOffExpenses: number;     // その他一時支出
  totalExpenses: number;           // 総支出
  
  // 家計収支分類
  totalOrdinaryIncome: number;            // 通常収入 = salaryIncome + pensionIncome + otherIncome
  totalOrdinaryExpenses: number;          // 通常支出 = livingExpenses + educationExpenses + housingExpenses + insuranceExpenses
  netOrdinaryCashflow: number;            // 通常家計収支 = totalOrdinaryIncome - totalOrdinaryExpenses
  nonHousingOneOffTransactions: number;  // 非住宅一時収支 = retirementAllowance + otherOneOffIncome - otherOneOffExpenses
  housingAssetTransactions: number;      // 住宅資産取引 = housingSaleProceeds - housingPurchaseInitialExpenses
  totalExternalNetCashflow: number;      // 外部純収支 = netOrdinaryCashflow + nonHousingOneOffTransactions + housingAssetTransactions
  /** @deprecated Use totalExternalNetCashflow instead */
  externalNetCashflow: number;           // 互換用 (totalExternalNetCashflow と同値)
  
  // 資産内部移転 & 計画取り崩し (Transfers & Planned Withdrawals)
  investmentContributionTransfer: number; // 積立移転 (現預金 -> 換金可能資産)
  dcContributionTransfer: number;         // DC拠出移転 (現預金 -> 受取制限資産)
  plannedTaxableWithdrawal: number;       // 計画的運用資産取り崩し (換金可能資産 -> 現預金)
  emergencyTaxableWithdrawal: number;     // 現預金不足時の臨時取り崩し (換金可能資産 -> 現預金)
  dcWithdrawal: number;                    // DC受取 (受取制限資産 -> 現預金)
  
  // 運用収益 (Investment Gains)
  taxableInvestmentGain: number;          // 換金可能資産運用益
  restrictedInvestmentGain: number;       // 受取制限資産運用益
  totalInvestmentGain: number;           // 運用収益合計
  
  // 期末資産 (End of Year)
  endCash: number;                         // 期末現預金
  endTaxableAssets: number;                // 期末換金可能運用資産
  endRestrictedAssets: number;             // 期末DC・iDeCo
  endTotalAssets: number;                  // 期末金融資産合計 (endCash + endTaxable + endRestricted)
  
  // 不足 & 負債
  unbackedShortfall: number;               // 未補填資金不足 (全換金可能資産枯渇後の不足額: 0以上)
  existingMortgageRemainingBalance: number; // 旧住宅ローン残高
  newMortgageRemainingBalance: number;      // 新住宅ローン残高
  mortgageRemainingBalance: number;        // 住宅ローン残高合計
  calculationCheckDifference: number;     // 検算差額 (MUST BE 0)
}

export interface CalculationWarning {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// シミュレーション実行結果全般
export interface SimulationResult {
  recurringWithdrawalBalance?: number | null;
  annualRows: AnnualCashflowRow[];
  rows: AnnualCashflowRow[];
  summary: {
    peakAssets: { amount: number; age: number };
    shortfallAge: number | null;
    liquidAssetShortfallAge: number | null;
    finalAssets: number;
    totalEducationExpenses: number;
    totalMortgagePayments: number;
    currentAnnualCashflow: number;
    cashDepletionAge: number | null;
    investmentWithdrawalStartAge: number | null;
    assetAtAge65: number | null;
    assetAtAge90: number | null;
    hasCheckWarning: boolean;
    checkWarningDetails?: string[];
  };
  warnings: CalculationWarning[];
}

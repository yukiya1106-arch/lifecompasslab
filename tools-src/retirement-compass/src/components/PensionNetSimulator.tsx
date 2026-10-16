/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Compass, HelpCircle, Calculator, Info, ChevronDown, ChevronUp, DollarSign, Percent, CheckCircle, TrendingDown, Coins, ShieldAlert, User, Users } from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { AppSharedData } from '../types';
import { calculateBasicDeduction2026 } from '../utils/calculations';
import { CompassHeader } from './CompassBrand';

interface NetSimulatorInputs {
  age: number;                        // 年齢
  publicPensionIncome: number;        // 公的年金の年額
  otherPensionIncome: number;         // その他の年金収入（企業年金、iDeCo等）
  otherIncome: number;                // 年金以外の所得（給与、不動産、雑所得等）
  hasSpouse: boolean;                 // 配偶者（なし/あり）
  includeSocialInsurance: boolean;    // 社会保険料の概算を含める（ON/OFF）
  
  // 詳細設定
  spouseIncome: number;               // 配偶者の所得
  dependentsCount: number;            // 扶養親族の人数
  regionalCostType: 'standard' | 'low' | 'high'; // 居住地域の概算区分
  insuranceSystemType: 'auto' | 'kokuho' | 'kouki'; // 医療保険の区分
  kaigoPremiumType: 'standard' | 'low' | 'high'; // 介護保険料の概算区分
  
  // 追加所得控除
  medicalDeduction: number;           // 医療費控除
  lifeInsuranceDeduction: number;     // 生命保険料控除
  otherDeduction: number;             // その他控除
}

interface PensionNetSimulatorProps {
  onBackToDashboard: () => void;
  sharedData?: AppSharedData;
  updateSharedData?: (newData: Partial<AppSharedData>, editedKeysToMark?: string[]) => void;
  onGoToTotalDiagnosis?: () => void;
}

export default function PensionNetSimulator({ 
  onBackToDashboard,
  sharedData,
  updateSharedData,
  onGoToTotalDiagnosis
}: PensionNetSimulatorProps) {
  // 1. 入力値の状態定義
  const [inputs, setInputs] = useState<NetSimulatorInputs>(() => {
    const base: NetSimulatorInputs = {
      age: 65,
      publicPensionIncome: 200, // 200万円
      otherPensionIncome: 0,   // 0万円
      otherIncome: 0,          // 0万円
      hasSpouse: true,
      includeSocialInsurance: true,
      
      spouseIncome: 0,         // 0万円
      dependentsCount: 0,
      regionalCostType: 'standard',
      insuranceSystemType: 'auto',
      kaigoPremiumType: 'standard',
      
      medicalDeduction: 0,     // 0万円
      lifeInsuranceDeduction: 0, // 0万円
      otherDeduction: 0,       // 0万円
    };
    if (sharedData) {
      if (sharedData.currentAge !== undefined) {
        base.age = sharedData.currentAge;
      }
      if (sharedData.publicPensionAmount !== undefined) {
        base.publicPensionIncome = sharedData.publicPensionAmount;
      }
      if (sharedData.otherPensionAmount !== undefined) {
        base.otherPensionIncome = sharedData.otherPensionAmount;
      }
      if (sharedData.incomeOtherThanPension !== undefined) {
        base.otherIncome = sharedData.incomeOtherThanPension;
      }
      if (sharedData.hasSpouse !== undefined) {
        base.hasSpouse = sharedData.hasSpouse;
      }
    }
    return base;
  });
  const [ageDraft, setAgeDraft] = useState(() => String(inputs.age));

  React.useEffect(() => {
    setAgeDraft(String(inputs.age));
  }, [inputs.age]);

  const handleAgeDraftChange = (raw: string) => {
    setAgeDraft(raw);
    const parsed = Number(raw);
    if (raw !== '' && Number.isInteger(parsed) && parsed >= 60 && parsed <= 100) {
      setInputs(prev => ({ ...prev, age: parsed }));
    }
  };

  const commitAgeDraft = (raw: string) => {
    if (raw.trim() === '') {
      setAgeDraft(String(inputs.age));
      return;
    }
    const parsed = Number(raw);
    const normalized = Number.isFinite(parsed)
      ? Math.min(100, Math.max(60, Math.round(parsed)))
      : inputs.age;
    setInputs(prev => ({ ...prev, age: normalized }));
    setAgeDraft(String(normalized));
  };

  // 状態の変更を共有データに反映
  React.useEffect(() => {
    if (updateSharedData) {
      const editedKeys: string[] = [];
      const initialDefaultAge = 65;
      const initialDefaultPension = 200;
      const initialDefaultOtherPension = 0;
      const initialDefaultOtherIncome = 0;
      const initialDefaultSpouse = true;

      if (inputs.age !== initialDefaultAge) editedKeys.push('currentAge');
      if (inputs.publicPensionIncome !== initialDefaultPension) editedKeys.push('publicPensionAmount');
      if (inputs.otherPensionIncome !== initialDefaultOtherPension) editedKeys.push('otherPensionAmount');
      if (inputs.otherIncome !== initialDefaultOtherIncome) editedKeys.push('incomeOtherThanPension');
      if (inputs.hasSpouse !== initialDefaultSpouse) editedKeys.push('hasSpouse');

      updateSharedData({
        currentAge: inputs.age,
        publicPensionAmount: inputs.publicPensionIncome,
        otherPensionAmount: inputs.otherPensionIncome,
        incomeOtherThanPension: inputs.otherIncome,
        hasSpouse: inputs.hasSpouse,
      }, editedKeys);
    }
  }, [inputs.age, inputs.publicPensionIncome, inputs.otherPensionIncome, inputs.otherIncome, inputs.hasSpouse, updateSharedData]);


  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');

  // 1万円単位のフォーマット
  const formatManYen = (yen: number) => {
    return `${(yen / 10000).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}万円`;
  };

  // 円単位のフォーマット
  const formatYen = (yen: number) => {
    return `${Math.round(yen).toLocaleString()}円`;
  };

  // 2. 税・社会保険料計算ロジック
  const calculations = useMemo(() => {
    const {
      age,
      hasSpouse,
      includeSocialInsurance,
      dependentsCount,
      regionalCostType,
      insuranceSystemType,
      kaigoPremiumType,
    } = inputs;

    // 内部計算用に万円を円に変換
    const publicPensionIncome = inputs.publicPensionIncome * 10000;
    const otherPensionIncome = inputs.otherPensionIncome * 10000;
    const otherIncome = inputs.otherIncome * 10000;
    const spouseIncome = inputs.spouseIncome * 10000;
    const medicalDeduction = inputs.medicalDeduction * 10000;
    const lifeInsuranceDeduction = inputs.lifeInsuranceDeduction * 10000;
    const otherDeduction = inputs.otherDeduction * 10000;

    // A. 公的年金等の合計額面
    const totalPensionIncome = publicPensionIncome + otherPensionIncome;
    const totalGrossIncome = totalPensionIncome + otherIncome;

    // B. 公的年金等控除の計算
    // 65歳未満（2026年時点で65歳未満＝昭和36年4月2日以降生まれ相当）か65歳以上かで分岐
    const isUnder65 = age < 65;
    let pensionDeduction = 0;

    if (isUnder65) {
      if (totalPensionIncome <= 1300000) {
        pensionDeduction = 600000;
      } else if (totalPensionIncome < 4100000) {
        pensionDeduction = totalPensionIncome * 0.25 + 275000;
      } else if (totalPensionIncome < 7700000) {
        pensionDeduction = totalPensionIncome * 0.15 + 685000;
      } else if (totalPensionIncome < 10000000) {
        pensionDeduction = totalPensionIncome * 0.05 + 1455000;
      } else {
        pensionDeduction = 1955000;
      }
      // 最低保障
      if (pensionDeduction < 600000 && totalPensionIncome > 0) {
        pensionDeduction = 600000;
      }
    } else {
      // 65歳以上
      if (totalPensionIncome <= 3300000) {
        pensionDeduction = 1100000;
      } else if (totalPensionIncome < 4100000) {
        pensionDeduction = totalPensionIncome * 0.25 + 275000;
      } else if (totalPensionIncome < 7700000) {
        pensionDeduction = totalPensionIncome * 0.15 + 685000;
      } else if (totalPensionIncome < 10000000) {
        pensionDeduction = totalPensionIncome * 0.05 + 1455000;
      } else {
        pensionDeduction = 1955000;
      }
      // 最低保障
      if (pensionDeduction < 1100000 && totalPensionIncome > 0) {
        pensionDeduction = 1100000;
      }
    }

    // C. 公的年金等に係る雑所得の計算 (上限0円)
    const pensionMiscIncome = Math.max(0, totalPensionIncome - pensionDeduction);

    // 合計所得金額
    const totalIncomeSum = pensionMiscIncome + otherIncome;

    // D. 社会保険料の計算
    let healthInsurance = 0;
    let kaigoInsurance = 0;
    let koukiInsurance = 0;

    // どの保険制度になるかの判定
    const currentSystem = insuranceSystemType === 'auto'
      ? (age >= 75 ? 'kouki' : 'kokuho')
      : insuranceSystemType;

    // 社会保険料の旧ただし書所得（住民税基礎控除43万円をマイナスした額。下限0）
    const baseForInsurance = Math.max(0, totalIncomeSum - 430000);

    // 地域調整の料率補正
    const regionalRateMultiplier = regionalCostType === 'high' ? 1.15 : regionalCostType === 'low' ? 0.85 : 1.0;

    if (includeSocialInsurance && totalGrossIncome > 0) {
      if (currentSystem === 'kokuho') {
        // 国民健康保険の概算
        const kokuhoRate = 0.095 * regionalRateMultiplier; // 標準 9.5%
        const kokuhoPerCapita = (hasSpouse ? 70000 : 35000) * (regionalCostType === 'high' ? 1.1 : regionalCostType === 'low' ? 0.9 : 1.0);
        healthInsurance = baseForInsurance * kokuhoRate + kokuhoPerCapita;
      } else {
        // 後期高齢者医療の概算
        const koukiRate = 0.085 * regionalRateMultiplier; // 標準 8.5%
        const koukiPerCapita = (hasSpouse ? 90000 : 45000) * (regionalCostType === 'high' ? 1.1 : regionalCostType === 'low' ? 0.9 : 1.0);
        koukiInsurance = baseForInsurance * koukiRate + koukiPerCapita;
      }

      // 介護保険料（65歳以上または明示的な介護保険）
      if (age >= 40) {
        let baseKaigo = 65000; // 標準の年間介護保険料目安（第5～6段階付近）
        
        // 介護保険料区分による補正
        const kaigoMultiplier = kaigoPremiumType === 'high' ? 1.3 : kaigoPremiumType === 'low' ? 0.7 : 1.0;

        // 本人の所得段階による標準的な補正
        let incomeStageFactor = 1.0;
        if (totalIncomeSum <= 1250000) {
          incomeStageFactor = 0.7; // 低所得
        } else if (totalIncomeSum > 3000000) {
          incomeStageFactor = 1.3; // やや高所得
        }

        kaigoInsurance = baseKaigo * incomeStageFactor * kaigoMultiplier;
      }
    }

    const totalSocialInsurance = healthInsurance + koukiInsurance + kaigoInsurance;

    // E. 所得税の計算
    // 所得税控除の合算
    const socialDeduction = totalSocialInsurance; // 社会保険料控除は全額
    const spouseDeduction = (hasSpouse && spouseIncome <= 620000) ? 380000 : 0;
    const basicDeduction = calculateBasicDeduction2026(totalIncomeSum / 10000) * 10000;
    const otherDepDeduction = dependentsCount * 380000;

    const totalTaxDeductions = 
      socialDeduction + 
      spouseDeduction + 
      basicDeduction + 
      otherDepDeduction + 
      medicalDeduction + 
      lifeInsuranceDeduction + 
      otherDeduction;

    const taxableIncomeForTax = Math.max(0, totalIncomeSum - totalTaxDeductions);

    // 所得税率テーブル（超過累進）
    let baseTax = 0;
    if (taxableIncomeForTax <= 1950000) {
      baseTax = taxableIncomeForTax * 0.05;
    } else if (taxableIncomeForTax <= 3300000) {
      baseTax = taxableIncomeForTax * 0.10 - 97500;
    } else if (taxableIncomeForTax <= 6950000) {
      baseTax = taxableIncomeForTax * 0.20 - 427500;
    } else if (taxableIncomeForTax <= 9000000) {
      baseTax = taxableIncomeForTax * 0.23 - 636000;
    } else if (taxableIncomeForTax <= 18000000) {
      baseTax = taxableIncomeForTax * 0.33 - 1536000;
    } else if (taxableIncomeForTax <= 40000000) {
      baseTax = taxableIncomeForTax * 0.40 - 2796000;
    } else {
      baseTax = taxableIncomeForTax * 0.45 - 4796000;
    }

    // 復興特別所得税 (2.1%)
    const fukkoTax = baseTax * 0.021;
    const totalIncomeTax = baseTax + fukkoTax;

    // F. 住民税の計算
    const spouseDeductionForInhabitant = (hasSpouse && spouseIncome <= 480000) ? 330000 : 0;
    const basicDeductionForInhabitant = 430000; // 住民税基礎控除
    const otherDepDeductionForInhabitant = dependentsCount * 330000;

    const totalInhabitantDeductions = 
      socialDeduction + 
      spouseDeductionForInhabitant + 
      basicDeductionForInhabitant + 
      otherDepDeductionForInhabitant + 
      medicalDeduction + 
      lifeInsuranceDeduction + 
      otherDeduction;

    const taxableIncomeForInhabitant = Math.max(0, totalIncomeSum - totalInhabitantDeductions);
    
    // 住民税所得割 (一律10%)
    let inhabitantIncomePart = taxableIncomeForInhabitant * 0.10;

    // 住民税の均等割 (概算 5,000円)
    let inhabitantEqualPart = totalGrossIncome > 0 ? 5000 : 0;

    // 住民税非課税の判定（簡易基準）
    // 単身かつ合計所得金額が45万以下、あるいは扶養ありで一定以下
    let isTaxFree = false;
    if (totalGrossIncome > 0) {
      const dependentsTotalCount = hasSpouse ? (dependentsCount + 1) : dependentsCount;
      if (dependentsTotalCount === 0) {
        if (totalIncomeSum <= 450000) isTaxFree = true;
      } else {
        if (totalIncomeSum <= (350000 * (dependentsTotalCount + 1) + 210000)) isTaxFree = true;
      }
    }

    if (isTaxFree) {
      inhabitantIncomePart = 0;
      inhabitantEqualPart = 0;
    }

    const totalInhabitantTax = inhabitantIncomePart + inhabitantEqualPart;

    // G. 概算手取りの計算
    const totalDeductions = totalIncomeTax + totalInhabitantTax + totalSocialInsurance;
    const netAnnualIncome = Math.max(0, totalGrossIncome - totalDeductions);
    const netMonthlyIncome = netAnnualIncome / 12;

    // 所得控除詳細の整理
    return {
      totalPensionIncome,
      totalGrossIncome,
      pensionMiscIncome,
      totalIncomeSum,
      pensionDeduction,
      healthInsurance,
      kaigoInsurance,
      koukiInsurance,
      totalSocialInsurance,
      socialDeduction,
      spouseDeduction,
      basicDeduction,
      totalTaxDeductions,
      taxableIncomeForTax,
      totalIncomeTax,
      totalInhabitantTax,
      totalDeductions,
      netAnnualIncome,
      netMonthlyIncome,
      isTaxFree,
      currentSystem,
    };
  }, [inputs]);

  // 3. グラフ用データの構築
  const chartData = useMemo(() => {
    const { 
      totalGrossIncome,
      totalIncomeTax, 
      totalInhabitantTax, 
      totalSocialInsurance, 
      netAnnualIncome 
    } = calculations;

    if (totalGrossIncome === 0) {
      return [];
    }

    // 万円単位
    return [
      {
        name: '総収入',
        '総額': Math.round(totalGrossIncome / 10000),
      },
      {
        name: '内訳',
        '概算手取り': Math.round(netAnnualIncome / 10000),
        '社会保険料': Math.round(totalSocialInsurance / 10000),
        '住民税': Math.round(totalInhabitantTax / 10000),
        '所得税': Math.round(totalIncomeTax / 10000),
      }
    ];
  }, [calculations]);

  return (
    <div className="compass-page">
      <CompassHeader toolName="年金手取りシミュレーター" onBack={onBackToDashboard} />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Title Block */}
        <div className="border-b border-slate-200 pb-5">
          <p className="compass-kicker">PENSION / NET INCOME</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#063A70] sm:text-3xl">
            年金の額面と手取り
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
            公的年金などから差し引かれる所得税・住民税・社会保険料を整理し、概算手取り額を確認します。
          </p>
        </div>

        {/* Column Grid: Left inputs, Right results */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Inputs (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Input Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4.5">
                <h2 className="font-bold text-[#002D62] flex items-center space-x-2 text-sm sm:text-base border-l-2 border-[#1D4ED8]/70 pl-3">
                  <span>まずはここだけ入力</span>
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                
                {/* 年齢 */}
                <div>
                  <label htmlFor="pension-net-age-input" className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#002D62]">
                    <span>年齢</span>
                    <span className="text-[11px] font-medium text-slate-400">60〜100歳</span>
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <input
                      id="pension-net-age-input"
                      type="number"
                      inputMode="numeric"
                      min="60"
                      max="100"
                      step="1"
                      value={ageDraft}
                      onChange={(e) => handleAgeDraftChange(e.target.value)}
                      onBlur={(e) => commitAgeDraft(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-12 text-base font-bold text-[#002D62] transition-all focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/10"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                      <span className="text-xs font-bold text-slate-400">歳</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    ※65歳を境に年金控除額が変わり、75歳で医療保険制度が切り替わります。
                  </p>
                </div>

                {/* 公的年金年額 */}
                <div>
                  <label className="block text-xs font-bold text-[#002D62] mb-1.5 flex justify-between">
                    <span>公的年金の年額（国民年金・厚生年金等）</span>
                    <span className="text-[#1D4ED8] font-bold bg-blue-50/60 border border-blue-100 px-2 py-0.5 rounded-lg text-[11px]">
                      {formatManYen(inputs.publicPensionIncome * 10000)}
                    </span>
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="5"
                      value={inputs.publicPensionIncome}
                      onChange={(e) => setInputs(prev => ({ ...prev, publicPensionIncome: Number(e.target.value) }))}
                      className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-16 text-sm text-slate-900 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all font-mono"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-xs text-slate-400 font-mono">万円/年</span>
                    </div>
                  </div>
                </div>

                {/* その他年金収入 */}
                <div>
                  <label className="block text-xs font-bold text-[#002D62] mb-1.5 flex justify-between">
                    <span>その他の年金収入（企業年金・iDeCoなど）</span>
                    <span className="text-slate-600 font-bold bg-slate-100/80 border border-slate-200 px-2 py-0.5 rounded-lg text-[11px]">
                      {formatManYen(inputs.otherPensionIncome * 10000)}
                    </span>
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="5"
                      value={inputs.otherPensionIncome}
                      onChange={(e) => setInputs(prev => ({ ...prev, otherPensionIncome: Number(e.target.value) }))}
                      className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-16 text-sm text-slate-900 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all font-mono"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-xs text-slate-400 font-mono">万円/年</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    企業年金や確定拠出年金（iDeCo等）の年金受取などが該当します。
                  </p>
                </div>

                {/* 年金以外の所得 */}
                <div>
                  <label className="block text-xs font-bold text-[#002D62] mb-1.5 flex justify-between">
                    <span>年金以外の所得（給与・不動産・事業等）</span>
                    <span className="text-slate-600 font-bold bg-slate-100/80 border border-slate-200 px-2 py-0.5 rounded-lg text-[11px]">
                      {formatManYen(inputs.otherIncome * 10000)}
                    </span>
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <input
                      type="number"
                      min="0"
                      max="2000"
                      step="5"
                      value={inputs.otherIncome}
                      onChange={(e) => setInputs(prev => ({ ...prev, otherIncome: Number(e.target.value) }))}
                      className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-16 text-sm text-slate-900 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all font-mono"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-xs text-slate-400 font-mono">万円/年</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    ※収入金額ではなく、経費や給与所得控除を差し引いた「所得」をご入力ください。
                  </p>
                </div>

                {/* 配偶者＆社会保険料スイッチ */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  
                  {/* 配偶者 */}
                  <div>
                    <label className="block text-xs font-bold text-[#002D62] mb-1.5">
                      配偶者の有無
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setInputs(prev => ({ ...prev, hasSpouse: false }))}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                          !inputs.hasSpouse
                            ? 'border-[#1D4ED8] bg-blue-50/60 text-[#1D4ED8]'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        なし
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputs(prev => ({ ...prev, hasSpouse: true }))}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                          inputs.hasSpouse
                            ? 'border-[#1D4ED8] bg-blue-50/60 text-[#1D4ED8]'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        あり
                      </button>
                    </div>
                  </div>

                  {/* 保険料含める */}
                  <div>
                    <label className="block text-xs font-bold text-[#002D62] mb-1.5">
                      社会保険料を考慮する
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setInputs(prev => ({ ...prev, includeSocialInsurance: false }))}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                          !inputs.includeSocialInsurance
                            ? 'border-slate-400 bg-slate-50/60 text-slate-700'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        除く
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputs(prev => ({ ...prev, includeSocialInsurance: true }))}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                          inputs.includeSocialInsurance
                            ? 'border-[#1D4ED8] bg-blue-50/60 text-[#1D4ED8]'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        含む
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Detailed Inputs Foldable */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between px-5 py-4.5 bg-slate-50 border-b border-slate-100 focus:outline-none cursor-pointer hover:bg-slate-100/50 transition-colors"
              >
                <h3 className="font-bold text-[#002D62] text-xs sm:text-sm flex items-center space-x-2 border-l-2 border-[#1D4ED8]/70 pl-3">
                  <span>必要に応じて詳しく入力</span>
                </h3>
                {showDetails ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              </button>

              {showDetails && (
                <div className="p-6 space-y-5 bg-white animate-fadeIn text-xs">
                  
                  {/* 配偶者所得 & 扶養人数 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                        配偶者の年間所得
                      </label>
                      <div className="relative rounded-xl shadow-2xs">
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          step="1"
                          value={inputs.spouseIncome}
                          onChange={(e) => setInputs(prev => ({ ...prev, spouseIncome: Number(e.target.value) }))}
                          className="block w-full rounded-xl border border-slate-200 py-2 pl-3.5 pr-10 text-slate-900 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all font-mono text-xs"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-[10px] text-slate-400 font-mono">万円</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block leading-tight">
                        ※48万円以下で配偶者控除が適用されます。
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                        扶養親族の人数 (除く配偶者)
                      </label>
                      <div className="relative rounded-xl shadow-2xs">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={inputs.dependentsCount}
                          onChange={(e) => setInputs(prev => ({ ...prev, dependentsCount: Math.max(0, Number(e.target.value)) }))}
                          className="block w-full rounded-xl border border-slate-200 py-2 pl-3.5 pr-10 text-slate-900 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all font-mono text-xs"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-[10px] text-slate-400 font-mono">人</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 居住地域 & 医療保険区分 */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                        居住地域の概算区分
                      </label>
                      <select
                        value={inputs.regionalCostType}
                        onChange={(e) => setInputs(prev => ({ ...prev, regionalCostType: e.target.value as any }))}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-2 px-3 cursor-pointer text-slate-900 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all text-xs"
                      >
                        <option value="standard">標準（全国平均並み）</option>
                        <option value="low">やや低め（保険料が安い地域）</option>
                        <option value="high">やや高め（保険料が高い都市部等）</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                        健康保険の制度区分
                      </label>
                      <select
                        value={inputs.insuranceSystemType}
                        onChange={(e) => setInputs(prev => ({ ...prev, insuranceSystemType: e.target.value as any }))}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-2 px-3 cursor-pointer text-slate-900 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all text-xs"
                      >
                        <option value="auto">自動判定（年齢に基づく）</option>
                        <option value="kokuho">国民健康保険</option>
                        <option value="kouki">後期高齢者医療制度</option>
                      </select>
                    </div>
                  </div>

                  {/* 介護保険料区分 */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      介護保険料の概算区分
                    </label>
                    <select
                      value={inputs.kaigoPremiumType}
                      onChange={(e) => setInputs(prev => ({ ...prev, kaigoPremiumType: e.target.value as any }))}
                      className="block w-full rounded-xl border border-slate-200 bg-white py-2 px-3 cursor-pointer text-slate-900 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all text-xs"
                    >
                      <option value="standard">標準</option>
                      <option value="low">やや低め</option>
                      <option value="high">やや高め</option>
                    </select>
                  </div>

                  {/* 所得控除の追加入力 */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <span className="font-bold text-slate-700 block text-[11px]">その他の所得控除（該当する場合）</span>
                    
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">医療費控除</label>
                        <div className="relative rounded-xl shadow-2xs">
                          <input
                            type="number"
                            min="0"
                            max="500"
                            step="1"
                            value={inputs.medicalDeduction}
                            onChange={(e) => setInputs(prev => ({ ...prev, medicalDeduction: Number(e.target.value) }))}
                            className="block w-full rounded-xl border border-slate-200 py-1.5 pl-2 pr-7 text-right text-slate-900 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all font-mono text-xs"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <span className="text-[9px] text-slate-400 font-mono">万円</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">生命保険料控除</label>
                        <div className="relative rounded-xl shadow-2xs">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            step="1"
                            value={inputs.lifeInsuranceDeduction}
                            onChange={(e) => setInputs(prev => ({ ...prev, lifeInsuranceDeduction: Number(e.target.value) }))}
                            className="block w-full rounded-xl border border-slate-200 py-1.5 pl-2 pr-7 text-right text-slate-900 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all font-mono text-xs"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <span className="text-[9px] text-slate-400 font-mono">万円</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">その他控除</label>
                        <div className="relative rounded-xl shadow-2xs">
                          <input
                            type="number"
                            min="0"
                            max="500"
                            step="1"
                            value={inputs.otherDeduction}
                            onChange={(e) => setInputs(prev => ({ ...prev, otherDeduction: Number(e.target.value) }))}
                            className="block w-full rounded-xl border border-slate-200 py-1.5 pl-2 pr-7 text-right text-slate-900 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all font-mono text-xs"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <span className="text-[9px] text-slate-400 font-mono">万円</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* RIGHT: Results & Visualizations (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Top Three Big Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Gross Income Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">総額（額面収入）</span>
                  <p className="text-[11px] text-slate-500 mt-1 leading-tight">年金およびその他所得の合計額</p>
                </div>
                <div className="mt-4 text-right">
                  <span className="text-xl sm:text-2xl font-black text-[#002D62] tracking-tight font-mono">
                    {formatManYen(calculations.totalGrossIncome)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 ml-0.5">/年</span>
                </div>
              </div>

              {/* Deductions Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between border-l-2 border-l-[#F59E0B]/50">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">引かれる金額の目安（計）</span>
                  <p className="text-[11px] text-slate-500 mt-1 leading-tight">所得税＋住民税＋社会保険料</p>
                </div>
                <div className="mt-4 text-right">
                  <span className="text-xl sm:text-2xl font-black text-[#F59E0B] tracking-tight font-mono">
                    {formatManYen(calculations.totalDeductions)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 ml-0.5">/年</span>
                </div>
              </div>

              {/* Net Income Card */}
              <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs flex flex-col justify-between border-l-2 border-l-[#1D4ED8]/50 bg-blue-50/25">
                <div>
                  <span className="text-[10px] font-black text-[#002D62] uppercase tracking-wider block">概算手取り額（目安）</span>
                  <p className="text-[11px] text-[#002D62]/70 mt-1 leading-tight">差引後に実質手元に残る金額</p>
                </div>
                <div className="mt-4 text-right">
                  <span className="text-2xl sm:text-3xl font-black text-[#1D4ED8] tracking-tight font-mono">
                    {formatManYen(calculations.netAnnualIncome)}
                  </span>
                  <span className="text-[10px] font-bold text-[#1D4ED8] ml-0.5">/年</span>
                </div>
              </div>

            </div>

            {/* Inner Breakdown Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* 所得税 */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 block">所得税の目安</span>
                <span className="text-sm font-black text-[#002D62] block mt-1.5 font-mono">
                  {formatYen(calculations.totalIncomeTax)}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  うち復興特別所得税含
                </span>
              </div>

              {/* 住民税 */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 block">住民税の目安</span>
                <span className="text-sm font-black text-[#002D62] block mt-1.5 font-mono">
                  {calculations.isTaxFree ? '非課税 (0円)' : formatYen(calculations.totalInhabitantTax)}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {calculations.isTaxFree ? '所得非課税基準未満' : '所得割＋均等割の概算'}
                </span>
              </div>

              {/* 社会保険料 */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 block">社会保険料の目安</span>
                <span className="text-sm font-black text-[#002D62] block mt-1.5 font-mono">
                  {formatYen(calculations.totalSocialInsurance)}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {calculations.currentSystem === 'kouki' ? '後期医療' : '国民健康保険'} ＋介護等
                </span>
              </div>

              {/* 手取り月額 */}
              <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-2xs bg-blue-50/10">
                <span className="text-[10px] font-bold text-blue-800 block">手取り月額の目安</span>
                <span className="text-base font-black text-blue-700 block mt-1 font-mono">
                  {formatManYen(calculations.netMonthlyIncome)}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  ※2ヶ月ごと支給の目安
                </span>
              </div>

            </div>

            {/* Main Display: Tabs (Chart / Detailed Table) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50 flex items-center justify-between px-4">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveTab('chart')}
                    className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-colors focus:outline-none cursor-pointer ${
                      activeTab === 'chart' 
                        ? 'border-[#1D4ED8] text-[#1D4ED8]' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    控除内訳のビジュアル化（グラフ）
                  </button>
                  <button
                    onClick={() => setActiveTab('table')}
                    className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-colors focus:outline-none cursor-pointer ${
                      activeTab === 'table' 
                        ? 'border-[#1D4ED8] text-[#1D4ED8]' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    計算ステップの詳細（目安）
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'chart' ? (
                  calculations.totalGrossIncome === 0 ? (
                    <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 text-xs">
                      <HelpCircle className="h-8 w-8 text-slate-300 mb-2" />
                      <span>年金収入などのシミュレーション条件をご入力ください</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="h-[180px] w-full">
                        <ResponsiveContainer key={activeTab} width="100%" height={180}>
                          <BarChart
                            layout="vertical"
                            data={chartData}
                            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis type="number" unit="万" tick={{ fontSize: 10, fill: '#64748B' }} stroke="#CBD5E1" />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#475569' }} stroke="#CBD5E1" />
                            <Tooltip formatter={(value) => [`${value}万円`, '']} contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            {/* 積み上げ表示設定 */}
                            <Bar dataKey="概算手取り" stackId="a" fill="#1D4ED8" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="社会保険料" stackId="a" fill="#F59E0B" />
                            <Bar dataKey="住民税" stackId="a" fill="#10B981" />
                            <Bar dataKey="所得税" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="総額" fill="#64748B" radius={[0, 4, 4, 0]} hide={activeTab !== 'chart'} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                        額面総額から、社会保険料、住民税、所得税が段階的に引かれ、残りが実質的な手取り（青色の部分）となります。
                      </p>
                    </div>
                  )
                ) : (
                  <div className="w-full overflow-hidden sm:overflow-visible">
                    <table className="min-w-full text-xs text-left divide-y divide-slate-100">
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2.5 font-bold text-slate-700">1. 総額（額面年金＋その他所得）</td>
                          <td className="py-2.5 text-right font-mono text-slate-900">{formatYen(calculations.totalGrossIncome)}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 pl-4 text-slate-500">└ 公的年金 + 企業年金等の合算</td>
                          <td className="py-2.5 text-right font-mono text-slate-600">{formatYen(calculations.totalPensionIncome)}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 pl-4 text-slate-500">└ 年金以外のその他所得</td>
                          <td className="py-2.5 text-right font-mono text-slate-600">{formatYen(inputs.otherIncome)}</td>
                        </tr>
                        <tr className="bg-slate-50/50">
                          <td className="py-2.5 font-bold text-slate-700">2. 公的年金等控除額（目安）</td>
                          <td className="py-2.5 text-right font-mono text-amber-600">▲ {formatYen(calculations.pensionDeduction)}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 pl-4 text-slate-500">└ 差引後の公的年金等雑所得</td>
                          <td className="py-2.5 text-right font-mono text-slate-900">{formatYen(calculations.pensionMiscIncome)}</td>
                        </tr>
                        <tr className="bg-slate-50/50">
                          <td className="py-2.5 font-bold text-slate-700">3. 所得控除合計（所得税ベース）</td>
                          <td className="py-2.5 text-right font-mono text-amber-600">▲ {formatYen(calculations.totalTaxDeductions)}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 pl-4 text-slate-500">└ うち社会保険料控除分</td>
                          <td className="py-2.5 text-right font-mono text-slate-600">{formatYen(calculations.totalSocialInsurance)}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 pl-4 text-slate-500">└ うち基礎・配偶者・扶養控除等</td>
                          <td className="py-2.5 text-right font-mono text-slate-600">{formatYen(calculations.totalTaxDeductions - calculations.totalSocialInsurance)}</td>
                        </tr>
                        <tr className="border-t border-slate-200 bg-blue-50/20">
                          <td className="py-2.5 font-extrabold text-blue-900">4. 概算手取り額（1 ‐ 税金・保険料）</td>
                          <td className="py-2.5 text-right font-mono font-extrabold text-blue-700">{formatYen(calculations.netAnnualIncome)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Input analysis and insights */}
            <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-6 space-y-4">
              <h4 className="font-bold text-[#002D62] text-sm flex items-center space-x-1.5">
                <CheckCircle className="h-4.5 w-4.5 text-[#1D4ED8]" />
                <span>入力内容から見た整理と確認ポイント</span>
              </h4>

              <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-start space-x-2">
                  <span className="inline-block mt-0.5 text-blue-600 font-bold">•</span>
                  <p>
                    公的年金とその他の年金を合わせた額面年額は<span className="font-bold text-blue-700">{formatManYen(calculations.totalPensionIncome)}</span>です。
                    {calculations.totalPensionIncome > 0 && (
                      <>
                        これに対応する公的年金等控除額は概算で【<span className="font-bold text-blue-700">{formatManYen(calculations.pensionDeduction)}</span>】となり、課税対象となる雑所得は【<span className="font-bold text-blue-700">{formatManYen(calculations.pensionMiscIncome)}</span>】として整理されます。
                      </>
                    )}
                  </p>
                </div>

                {inputs.otherIncome > 0 && (
                  <div className="flex items-start space-x-2">
                    <span className="inline-block mt-0.5 text-blue-600 font-bold">•</span>
                    <p>
                      年金以外の所得（給与、不動産所得など）が<span className="font-bold text-blue-700">{formatManYen(inputs.otherIncome)}</span>あるため、社会保険料の段階区分が上がるほか、所得税の税率区分も変わり、手取り割合に影響を及ぼす可能性があります。
                    </p>
                  </div>
                )}

                <div className="flex items-start space-x-2">
                  <span className="inline-block mt-0.5 text-blue-600 font-bold">•</span>
                  <p>
                    {inputs.age >= 75 ? (
                      <>
                        年齢が75歳以上であるため、医療保険は<span className="font-bold text-blue-700">「後期高齢者医療制度」</span>が適用される目安で計算しています。
                      </>
                    ) : (
                      <>
                        現在{inputs.age}歳のため、75歳以降になると後期高齢者医療制度の対象になり、医療保険料の計算構造（均等割額や所得割率）が変わるため、社会保険料の見方が変化します。
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="inline-block mt-0.5 text-blue-600 font-bold">•</span>
                  <p>
                    このシミュレーション結果は、全国的な標準負担モデルをベースとした概算であり、自治体別の厳密な保険料率や個別の高度な控除状況は考慮されていません。目安としてご活用ください。
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* 総合確認への導線 */}
        {onGoToTotalDiagnosis && (
          <div className="compass-panel flex flex-col items-start justify-between gap-5 border-l-4 border-l-[#2F6FED] p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-[#063A70]">退職後のお金全体をまとめて確認</h4>
              <p className="max-w-2xl text-xs leading-relaxed text-slate-600">
                ここまでに試算した年齢（{inputs.age}歳）や公的年金の見込額、その他の所得を引き継ぎ、退職金や生活費を含めた資金推移を確認できます。
              </p>
            </div>
            <button
              id="cta-goto-total-from-net"
              onClick={onGoToTotalDiagnosis}
              className="flex min-h-10 flex-shrink-0 cursor-pointer items-center gap-2 rounded-md bg-[#063A70] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0A4B88] sm:text-sm"
            >
              <span>この内容で総合確認へ進む</span>
              <Compass className="h-4 w-4 text-[#1D4ED8]" />
            </button>
          </div>
        )}

        {/* 6. 注意書き */}
        <div className="bg-slate-100/60 border border-slate-200/40 rounded-xl p-4 sm:p-5 text-[11px] text-slate-500 leading-relaxed font-medium">
          <p>
            ※ このシミュレーションは、入力内容と概算式にもとづく目安です。社会保険料は自治体や世帯状況によって異なるため、実際の金額とは異なる場合があります。具体的な金額は、お住まいの自治体や年金機構等の資料でご確認ください。
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-10 text-center text-xs text-slate-500 mt-20 space-y-3">
        <p className="text-slate-500 text-[11px] sm:text-xs px-4 max-w-3xl mx-auto leading-relaxed">
          年金手取りシミュレーター（概算版） | 本ツールは相談時の比較検討を目的とした参考情報であり、税務・年金の個別助言ではありません。
        </p>
        <p className="text-[10px] text-slate-400 tracking-wider">© 2026 LIFE COMPASS LAB. All Rights Reserved. (COMPASS Series)</p>
      </footer>
    </div>
  );
}

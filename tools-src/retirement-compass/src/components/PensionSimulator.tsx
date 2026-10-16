/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Award,
  Users,
  Percent
} from 'lucide-react';
import { CompassHeader } from './CompassBrand';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { CompassInputs, AppSharedData } from '../types';

interface PensionInputs {
  pension65Total: number;       // 65歳時点の年金見込額（年額・円）
  pension65Basic: number;       // 老齢基礎年金
  pension65Kosei: number;       // 老齢厚生年金
  selectedAge: number;          // 比較したい受取開始年齢 (60〜75)
  birthDateRule: 'after_1962_04_02' | 'before_1962_04_01'; // 生年月日ルール
  milestoneAge: 80 | 90 | 100;  // 重視する寿命の目安
  includeTaxSocialInsurance: boolean; // 税・社会保険料の概算を含める
  hasSpouse: boolean;           // 配偶者あり/なし
  otherIncome: number;          // その他所得
  taxSocialRate: number;        // 税・社会保険料の概算率 (%)
}

// 年齢計算のためのヘルパー関数
function calculateAgeAtYM(birthYM: string, targetYM: string): number | null {
  if (!birthYM || !targetYM) return null;
  const [birthY, birthM] = birthYM.split('-').map(Number);
  const [targetY, targetM] = targetYM.split('-').map(Number);
  if (isNaN(birthY) || isNaN(birthM) || isNaN(targetY) || isNaN(targetM)) return null;
  let age = targetY - birthY;
  if (targetM < birthM) {
    age--;
  }
  return age;
}

// 損益分岐点計算用のヘルパー関数
function getBreakEvenAgeStr(selectedAge: number, baseAge: number, rate: number): string {
  if (selectedAge === baseAge) {
    return '基準（65歳）と同じ';
  }
  let age = 0;
  if (selectedAge > baseAge) {
    // 繰下げ
    age = selectedAge + (selectedAge - baseAge) / (rate - 1);
  } else {
    // 繰上げ
    age = baseAge + ((baseAge - selectedAge) * rate) / (1 - rate);
  }
  const totalMonths = Math.round(age * 12);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return `${years}歳${months}ヶ月`;
}

interface PensionSimulatorProps {
  onBackToDashboard: () => void;
  sharedData?: AppSharedData;
  updateSharedData?: (newData: Partial<AppSharedData>, editedKeysToMark?: string[]) => void;
  onGoToTotalDiagnosis?: () => void;
}

export default function PensionSimulator({ 
  onBackToDashboard,
  sharedData,
  updateSharedData,
  onGoToTotalDiagnosis
}: PensionSimulatorProps) {
  // 入力値の状態
  const [inputs, setInputs] = useState<PensionInputs>(() => {
    const base: PensionInputs = {
      pension65Total: 2000000,
      pension65Basic: 800000,
      pension65Kosei: 1200000,
      selectedAge: 70,
      birthDateRule: 'after_1962_04_02',
      milestoneAge: 90,
      includeTaxSocialInsurance: true,
      hasSpouse: true,
      otherIncome: 0,
      taxSocialRate: 15,
    };
    if (sharedData) {
      if (sharedData.publicPensionAmount !== undefined) {
        base.pension65Total = sharedData.publicPensionAmount * 10000;
        base.pension65Basic = Math.round(base.pension65Total * 0.4);
        base.pension65Kosei = Math.round(base.pension65Total * 0.6);
      }
      if (sharedData.pensionStartAge !== undefined) {
        base.selectedAge = sharedData.pensionStartAge;
      }
      if (sharedData.hasSpouse !== undefined) {
        base.hasSpouse = sharedData.hasSpouse;
      }
      if (sharedData.incomeOtherThanPension !== undefined) {
        base.otherIncome = sharedData.incomeOtherThanPension * 10000;
      }
    }
    return base;
  });
  const [selectedAgeDraft, setSelectedAgeDraft] = useState(() => String(inputs.selectedAge));

  React.useEffect(() => {
    setSelectedAgeDraft(String(inputs.selectedAge));
  }, [inputs.selectedAge]);

  const handleSelectedAgeDraftChange = (raw: string) => {
    setSelectedAgeDraft(raw);
    const parsed = Number(raw);
    if (raw !== '' && Number.isInteger(parsed) && parsed >= 60 && parsed <= 75) {
      setInputs(prev => ({ ...prev, selectedAge: parsed }));
    }
  };

  const commitSelectedAgeDraft = (raw: string) => {
    if (raw.trim() === '') {
      setSelectedAgeDraft(String(inputs.selectedAge));
      return;
    }
    const parsed = Number(raw);
    const normalized = Number.isFinite(parsed)
      ? Math.min(75, Math.max(60, Math.round(parsed)))
      : inputs.selectedAge;
    setInputs(prev => ({ ...prev, selectedAge: normalized }));
    setSelectedAgeDraft(String(normalized));
  };

  // 状態の変更を共有データに反映
  React.useEffect(() => {
    if (updateSharedData) {
      const editedKeys: string[] = [];
      const initialDefaultTotal = 2000000;
      const initialDefaultStartAge = 70;
      const initialDefaultSpouse = true;
      const initialDefaultOtherIncome = 0;

      if (inputs.pension65Total !== initialDefaultTotal) editedKeys.push('publicPensionAmount');
      if (inputs.selectedAge !== initialDefaultStartAge) editedKeys.push('pensionStartAge');
      if (inputs.hasSpouse !== initialDefaultSpouse) editedKeys.push('hasSpouse');
      if (inputs.otherIncome !== initialDefaultOtherIncome) editedKeys.push('incomeOtherThanPension');

      updateSharedData({
        publicPensionAmount: inputs.pension65Total / 10000,
        pensionStartAge: inputs.selectedAge,
        pensionEarlyReductionRate: inputs.birthDateRule === 'after_1962_04_02' ? 0.004 : 0.005,
        hasSpouse: inputs.hasSpouse,
        incomeOtherThanPension: inputs.otherIncome / 10000,
      }, editedKeys);
    }
  }, [inputs.pension65Total, inputs.selectedAge, inputs.birthDateRule, inputs.hasSpouse, inputs.otherIncome, updateSharedData]);


  // 詳細設定の折りたたみ状態
  const [showDetails, setShowDetails] = useState(false);

  // 1万円単位のフォーマット
  const formatManYen = (yen: number) => {
    return `${(yen / 10000).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}万円`;
  };

  // 円単位のフォーマット
  const formatYen = (yen: number) => {
    return `${Math.round(yen).toLocaleString()}円`;
  };

  // 合計金額の変更処理
  const handleTotalChange = (total: number) => {
    setInputs(prev => ({
      ...prev,
      pension65Total: total,
      // 簡易的に40%を基礎年金、60%を厚生年金として自動按分
      pension65Basic: Math.round(total * 0.4),
      pension65Kosei: Math.round(total * 0.6),
    }));
  };

  // 基礎年金の変更処理
  const handleBasicChange = (basic: number) => {
    setInputs(prev => {
      const total = basic + prev.pension65Kosei;
      return {
        ...prev,
        pension65Basic: basic,
        pension65Total: total,
      };
    });
  };

  // 厚生年金の変更処理
  const handleKoseiChange = (kosei: number) => {
    setInputs(prev => {
      const total = prev.pension65Basic + kosei;
      return {
        ...prev,
        pension65Kosei: kosei,
        pension65Total: total,
      };
    });
  };

  // 全開始年齢（60歳〜75歳）の計算データを生成
  const ageItems = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => {
      const age = 60 + i;
      let rate = 1;
      if (age >= 65) {
        // 繰下げ: 1か月あたり0.7%増額
        rate = 1 + (age - 65) * 12 * 0.007;
      } else {
        // 繰上げ: 昭和37年4月2日以降は0.4%、以前は0.5%減額
        const rRate = inputs.birthDateRule === 'after_1962_04_02' ? 0.004 : 0.005;
        rate = 1 - (65 - age) * 12 * rRate;
      }

      const grossAnnual = inputs.pension65Total * rate;
      const netRate = inputs.includeTaxSocialInsurance ? (1 - inputs.taxSocialRate / 100) : 1;
      const netAnnual = grossAnnual * netRate;

      const grossMonthly = grossAnnual / 12;
      const netMonthly = netAnnual / 12;

      // 累計計算に使う年額 (手取り or 額面)
      const annualToUse = inputs.includeTaxSocialInsurance ? netAnnual : grossAnnual;

      const cumulative80 = Math.max(0, 80 - age) * annualToUse;
      const cumulative90 = Math.max(0, 90 - age) * annualToUse;
      const cumulative100 = Math.max(0, 100 - age) * annualToUse;

      return {
        age,
        rate,
        grossAnnual,
        netAnnual,
        grossMonthly,
        netMonthly,
        annualToUse,
        cumulative80,
        cumulative90,
        cumulative100,
      };
    });
  }, [inputs.pension65Total, inputs.birthDateRule, inputs.includeTaxSocialInsurance, inputs.taxSocialRate]);

  // 選択中の年齢のデータ
  const selectedItem = useMemo(() => {
    return ageItems.find(item => item.age === inputs.selectedAge) || ageItems[10]; // デフォルト70
  }, [ageItems, inputs.selectedAge]);

  // 基準（65歳）のデータ
  const baseItem = useMemo(() => {
    return ageItems.find(item => item.age === 65)!;
  }, [ageItems]);

  // グラフA用の時系列データの作成 (到達年齢 60歳 〜 100歳)
  const lineChartData = useMemo(() => {
    return Array.from({ length: 41 }, (_, i) => {
      const reachedAge = 60 + i;
      
      // 65歳開始の累計受給
      const baseCumulative = Math.max(0, reachedAge - 65) * baseItem.annualToUse;
      
      // 選択中開始年齢の累計受給
      const selectedCumulative = Math.max(0, reachedAge - inputs.selectedAge) * selectedItem.annualToUse;

      return {
        age: reachedAge,
        ageLabel: `${reachedAge}歳`,
        '65歳開始': Math.round(baseCumulative / 10000),
        '選択中の開始年齢': Math.round(selectedCumulative / 10000),
      };
    });
  }, [inputs.selectedAge, baseItem.annualToUse, selectedItem.annualToUse]);

  // グラフB用の比較データ (60歳, 65歳, 選択中年齢, 75歳をスマートに抽出して比較)
  const barChartData = useMemo(() => {
    // 比較する受給開始年齢のセットを重複なしで作成しソート
    const targetAges = Array.from(new Set([60, 65, inputs.selectedAge, 75])).sort((a, b) => a - b);
    
    const milestones = [
      { key: 'cumulative80', label: '80歳時点' },
      { key: 'cumulative90', label: '90歳時点' },
      { key: 'cumulative100', label: '100歳時点' },
    ];

    return milestones.map(m => {
      const dataObj: any = { name: m.label };
      targetAges.forEach(age => {
        const item = ageItems.find(x => x.age === age);
        if (item) {
          const val = m.key === 'cumulative80' ? item.cumulative80 :
                      m.key === 'cumulative90' ? item.cumulative90 : item.cumulative100;
          dataObj[`${age}歳開始`] = Math.round(val / 10000);
        }
      });
      return dataObj;
    });
  }, [ageItems, inputs.selectedAge]);

  // グラフB用のバー定義リスト
  const barAges = useMemo(() => {
    return Array.from(new Set([60, 65, inputs.selectedAge, 75])).sort((a, b) => a - b);
  }, [inputs.selectedAge]);

  // 交差年齢（損益分岐点）の計算
  const breakEvenStr = useMemo(() => {
    return getBreakEvenAgeStr(inputs.selectedAge, 65, selectedItem.rate);
  }, [inputs.selectedAge, selectedItem.rate]);

  // カード表示用データ
  const diffAnnual = selectedItem.annualToUse - baseItem.annualToUse;
  const diffCumulative = (selectedItem[`cumulative${inputs.milestoneAge}` as keyof typeof selectedItem] as number) - 
                         (baseItem[`cumulative${inputs.milestoneAge}` as keyof typeof baseItem] as number);

  return (
    <div className="compass-page font-sans">
      <CompassHeader toolName="公的年金受取シミュレーター" onBack={onBackToDashboard} />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Intro */}
        <div className="border-b border-slate-200 pb-5">
          <p className="compass-kicker">PUBLIC PENSION / TIMING</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#063A70] sm:text-3xl">
            公的年金受取時期の検討
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
            60歳から75歳までの受取開始年齢を比べ、年額・累計額・損益分岐の目安を確認します。
          </p>
        </div>

        {/* 1. 入力カード */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="font-bold text-[#002D62] flex items-center space-x-2 text-sm sm:text-base border-l-2 border-[#1D4ED8]/70 pl-3">
              <span>シミュレーション条件の設定</span>
            </h2>
            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
              <Info className="h-3.5 w-3.5 text-[#1D4ED8]" />
              <span>西暦2026年時点の税制に基づく試算モデル</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* かんたん入力セクション */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* 年金見込額 */}
              <div>
                <label className="block text-xs font-bold text-[#002D62] mb-2 flex justify-between items-center">
                  <span>65歳時点の年金見込額（年額）</span>
                  <span className="text-[11px] font-bold text-[#1D4ED8] bg-blue-50/60 border border-blue-100 px-2 py-0.5 rounded-lg">
                    {formatManYen(inputs.pension65Total)}
                  </span>
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <input
                    type="number"
                    min="500000"
                    max="10000000"
                    step="50000"
                    value={inputs.pension65Total}
                    onChange={(e) => handleTotalChange(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-12 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/10 transition-all font-mono"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs text-slate-400 font-mono">円/年</span>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400 font-medium">
                  月額換算：約 {formatManYen(inputs.pension65Total / 12)}
                </p>
              </div>

              {/* 比較したい受取開始年齢 */}
              <div>
                <label htmlFor="pension-start-age-input" className="mb-2 flex items-center justify-between text-xs font-bold text-[#002D62]">
                  <span>比較したい受取開始年齢</span>
                  <span className="text-[11px] font-medium text-slate-400">60〜75歳</span>
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <input
                    id="pension-start-age-input"
                    type="number"
                    inputMode="numeric"
                    min="60"
                    max="75"
                    step="1"
                    value={selectedAgeDraft}
                    onChange={(e) => handleSelectedAgeDraftChange(e.target.value)}
                    onBlur={(e) => commitSelectedAgeDraft(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-12 text-base font-bold text-[#002D62] transition-all focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/10"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                    <span className="text-xs font-bold text-slate-400">歳</span>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400 font-medium">
                  65歳基準と比較する受取開始年齢を直接入力します。
                </p>
              </div>

              {/* 生年月日ルール */}
              <div>
                <label className="block text-xs font-bold text-[#002D62] mb-2">
                  生年月日ルール（繰上げ減額率）
                </label>
                <div className="space-y-3.5">
                  <label className="flex items-start space-x-2.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name="birthDateRule"
                      checked={inputs.birthDateRule === 'after_1962_04_02'}
                      onChange={() => setInputs(prev => ({ ...prev, birthDateRule: 'after_1962_04_02' }))}
                      className="mt-0.5 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                    />
                    <div>
                      <span className="font-bold text-slate-800">昭和37年4月2日以降生まれ</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">繰上げ減額率：0.4% / 月 (60歳受取で-24.0%)</p>
                    </div>
                  </label>
                  <label className="flex items-start space-x-2.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name="birthDateRule"
                      checked={inputs.birthDateRule === 'before_1962_04_01'}
                      onChange={() => setInputs(prev => ({ ...prev, birthDateRule: 'before_1962_04_01' }))}
                      className="mt-0.5 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                    />
                    <div>
                      <span className="font-bold text-slate-800">昭和37年4月1日以前生まれ</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">繰上げ減額率：0.5% / 月 (60歳受取で-30.0%)</p>
                    </div>
                  </label>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
              
              {/* 累計額を比較する年齢 */}
              <div>
                <label className="block text-xs font-bold text-[#002D62] mb-2">
                  累計額を比較する年齢
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {([80, 90, 100] as const).map(age => (
                    <button
                      key={age}
                      type="button"
                      onClick={() => setInputs(prev => ({ ...prev, milestoneAge: age }))}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                        inputs.milestoneAge === age
                          ? 'border-[#1D4ED8] bg-blue-50/60 text-[#1D4ED8] ring-1 ring-[#1D4ED8]/10'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {age}歳まで
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  選んだ年齢まで受け取った場合の累計額を比較します。
                </p>
              </div>

              {/* 税・社会保険料の概算を含める */}
              <div>
                <label className="block text-xs font-bold text-[#002D62] mb-2">
                  税・社会保険料の控除概算
                </label>
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      inputs.includeTaxSocialInsurance ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {inputs.includeTaxSocialInsurance ? '手取りベース' : '額面ベース'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {inputs.includeTaxSocialInsurance ? `標準概算モデル（約${inputs.taxSocialRate}%控除）` : '控除なしで全額比較'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInputs(prev => ({ ...prev, includeTaxSocialInsurance: !prev.includeTaxSocialInsurance }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      inputs.includeTaxSocialInsurance ? 'bg-[#1D4ED8]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        inputs.includeTaxSocialInsurance ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  ※実際に使える金額を比べる場合は、手取りベース（控除あり）で確認すると整理しやすくなります。
                </p>
              </div>

            </div>

            {/* 折りたたみ詳細入力 */}
            <div className="border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center space-x-1.5 text-xs font-bold text-[#1D4ED8] hover:text-[#0a46a6] focus:outline-none cursor-pointer transition-colors"
              >
                <span>{showDetails ? '詳細設定を閉じる' : '詳細設定を展開（年金内訳、配偶者、控除率の調整）'}</span>
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showDetails && (
                <div className="mt-4 p-5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-5 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    
                    {/* 老齢基礎年金 */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#002D62] mb-1.5">
                        老齢基礎年金（年額・円）
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="2000000"
                        step="10000"
                        value={inputs.pension65Basic}
                        onChange={(e) => handleBasicChange(Number(e.target.value))}
                        className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        国民年金部分（満額 約81.6万円/年）
                      </span>
                    </div>

                    {/* 老齢厚生年金 */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#002D62] mb-1.5">
                        老齢厚生年金（年額・円）
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="8000000"
                        step="10000"
                        value={inputs.pension65Kosei}
                        onChange={(e) => handleKoseiChange(Number(e.target.value))}
                        className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        厚生年金（報酬比例部分）
                      </span>
                    </div>

                    {/* 配偶者あり/なし */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#002D62] mb-1.5">
                        配偶者の有無
                      </label>
                      <div className="flex space-x-4 py-1">
                        <label className="inline-flex items-center text-xs text-slate-700 cursor-pointer font-medium">
                          <input
                            type="radio"
                            checked={inputs.hasSpouse}
                            onChange={() => setInputs(prev => ({ ...prev, hasSpouse: true }))}
                            className="text-[#1D4ED8] focus:ring-[#1D4ED8]"
                          />
                          <span className="ml-1.5 flex items-center"><Users className="h-3.5 w-3.5 mr-1 text-slate-400" />あり</span>
                        </label>
                        <label className="inline-flex items-center text-xs text-slate-700 cursor-pointer font-medium">
                          <input
                            type="radio"
                            checked={!inputs.hasSpouse}
                            onChange={() => setInputs(prev => ({ ...prev, hasSpouse: false }))}
                            className="text-[#1D4ED8] focus:ring-[#1D4ED8]"
                          />
                          <span className="ml-1.5">なし</span>
                        </label>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        配偶者控除等の目安に反映
                      </span>
                    </div>

                    {/* その他所得 */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#002D62] mb-1.5">
                        年金以外のその他所得（年額）
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10000000"
                        step="100000"
                        value={inputs.otherIncome}
                        onChange={(e) => setInputs(prev => ({ ...prev, otherIncome: Number(e.target.value) }))}
                        className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 focus:outline-none transition-all font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        不動産所得やアルバイト所得等
                      </span>
                    </div>

                  </div>

                  <div className="pt-3 border-t border-slate-200/60">
                    <label className="block text-[11px] font-bold text-[#002D62] mb-1.5 flex justify-between">
                      <span>税・社会保険料の想定概算率</span>
                      <span className="text-[#1D4ED8] font-bold">{inputs.taxSocialRate}%</span>
                    </label>
                    <div className="flex items-center space-x-3.5">
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="1"
                        value={inputs.taxSocialRate}
                        onChange={(e) => setInputs(prev => ({ ...prev, taxSocialRate: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1D4ED8]"
                      />
                      <span className="text-[10px] text-slate-400 font-mono w-10 text-right">5%〜30%</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      ※年金収入における税・社会保険料（住民税、所得税、国民健康保険、介護保険等）の目安負担率です。配偶者ありで平均的な年金見込額の場合、約10〜15%が一般的な控除目安（実質手取り率85〜90%）となります。
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 4. 受取開始年齢別一覧表 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4.5">
            <h3 className="font-bold text-[#002D62] text-sm sm:text-base flex items-center space-x-2 border-l-2 border-[#1D4ED8]/70 pl-3">
              <span>受取開始年齢別の詳細一覧表（60歳〜75歳）</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              行をクリックすると、その開始年齢をシミュレーションの「選択年齢」に設定し、詳細を上のカードやグラフに反映できます。
            </p>
          </div>

          <div className="min-w-0">
            <table className="w-full table-fixed divide-y divide-slate-200 text-left text-[11px] sm:text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold">
                <tr>
                  <th scope="col" className="px-1.5 sm:px-3 py-3 text-center">開始年齢</th>
                  <th scope="col" className="hidden px-1.5 py-3 text-center sm:table-cell sm:px-3">受取率</th>
                  <th scope="col" className="hidden px-1.5 py-3 text-right md:table-cell sm:px-3">年額（税引前）</th>
                  <th scope="col" className="hidden px-1.5 py-3 text-right lg:table-cell sm:px-3">月額換算</th>
                  <th scope="col" className="px-1.5 sm:px-3 py-3 text-right bg-blue-50/40 text-blue-900 font-bold">手取り年額(目安)</th>
                  <th scope="col" className="px-1.5 py-3 text-right text-slate-700 md:hidden">{inputs.milestoneAge}歳累計</th>
                  <th scope="col" className="hidden px-1.5 py-3 text-right text-slate-700 md:table-cell sm:px-3">80歳累計</th>
                  <th scope="col" className="hidden px-1.5 py-3 text-right text-slate-700 md:table-cell sm:px-3">90歳累計</th>
                  <th scope="col" className="hidden px-1.5 py-3 text-right text-slate-700 md:table-cell sm:px-3">100歳累計</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {ageItems.map((item) => {
                  const is65 = item.age === 65;
                  const isSelected = item.age === inputs.selectedAge;
                  
                  return (
                    <tr 
                      key={item.age}
                      onClick={() => setInputs(prev => ({ ...prev, selectedAge: item.age }))}
                      className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50/80 font-semibold ring-2 ring-blue-600 ring-inset' 
                          : is65 
                          ? 'bg-blue-50/30' 
                          : ''
                      }`}
                    >
                      <td className="px-1.5 sm:px-3 py-3 text-center font-bold text-slate-900">
                        <div className="flex items-center justify-center space-x-1">
                          <span>{item.age}歳</span>
                          {is65 && <span className="text-[9px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-normal">基準</span>}
                          {isSelected && <span className="text-[9px] bg-blue-600 text-white px-1 py-0.2 rounded font-normal">選択中</span>}
                        </div>
                      </td>
                      <td className="hidden px-1.5 py-3 text-center text-slate-600 sm:table-cell sm:px-3">
                        {(item.rate * 100).toFixed(0)}%
                      </td>
                      <td className="hidden px-1.5 py-3 text-right font-mono text-slate-600 md:table-cell sm:px-3">
                        {formatYen(item.grossAnnual)}
                      </td>
                      <td className="hidden px-1.5 py-3 text-right font-mono text-slate-600 lg:table-cell sm:px-3">
                        {formatYen(item.grossMonthly)}
                      </td>
                      <td className="px-1.5 sm:px-3 py-3 text-right font-mono font-bold bg-blue-50/10 text-blue-700">
                        {inputs.includeTaxSocialInsurance ? formatYen(item.netAnnual) : formatYen(item.grossAnnual)}
                      </td>
                      <td className="px-1.5 py-3 text-right font-mono font-bold text-slate-700 md:hidden">
                        {formatManYen(inputs.milestoneAge === 80 ? item.cumulative80 : inputs.milestoneAge === 90 ? item.cumulative90 : item.cumulative100)}
                      </td>
                      <td className={`hidden px-1.5 py-3 text-right font-mono md:table-cell sm:px-3 ${inputs.milestoneAge === 80 ? 'font-bold text-slate-900 bg-amber-50/20' : 'text-slate-500'}`}>
                        {formatManYen(item.cumulative80)}
                      </td>
                      <td className={`hidden px-1.5 py-3 text-right font-mono md:table-cell sm:px-3 ${inputs.milestoneAge === 90 ? 'font-bold text-slate-900 bg-amber-50/20' : 'text-slate-500'}`}>
                        {formatManYen(item.cumulative90)}
                      </td>
                      <td className={`hidden px-1.5 py-3 text-right font-mono md:table-cell sm:px-3 ${inputs.milestoneAge === 100 ? 'font-bold text-slate-900 bg-amber-50/20' : 'text-slate-500'}`}>
                        {formatManYen(item.cumulative100)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. 65歳受給との比較カード 3枚 */}
        <div className="space-y-4">
          <h3 className="font-bold text-[#002D62] text-sm sm:text-base flex items-center space-x-2 border-l-2 border-[#1D4ED8]/70 pl-3">
            <span>65歳開始とのシミュレーション比較（選択中: {inputs.selectedAge}歳開始）</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* カード 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">年額（受取額）の差</span>
                <span className="text-[11px] text-slate-500 block mt-1">基準（65歳）と比べた年間の差額</span>
              </div>
              <div className="mt-5 flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-500">
                  {inputs.includeTaxSocialInsurance ? '手取り差' : '額面差'}
                </span>
                <span className={`text-xl sm:text-2xl font-black tracking-tight ${
                  diffAnnual > 0 ? 'text-emerald-600' : diffAnnual < 0 ? 'text-rose-600' : 'text-slate-600'
                }`}>
                  {diffAnnual > 0 ? '+' : ''}
                  {formatManYen(diffAnnual)}
                  <span className="text-xs font-semibold text-slate-400 ml-0.5">/ 年</span>
                </span>
              </div>
              <div className="mt-3 text-[10px] text-slate-400 font-medium">
                選択中の受取率: <span className="font-bold text-slate-700">{(selectedItem.rate * 100).toFixed(0)}%</span> (基準との比率)
              </div>
            </div>

            {/* カード 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{inputs.milestoneAge}歳到達時点の累計差額</span>
                <span className="text-[11px] text-slate-500 block mt-1">{inputs.milestoneAge}歳まで受け取った場合の累計額差</span>
              </div>
              <div className="mt-5 flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-500">
                  累計受取額の差
                </span>
                <span className={`text-xl sm:text-2xl font-black tracking-tight ${
                  diffCumulative > 0 ? 'text-emerald-600' : diffCumulative < 0 ? 'text-rose-600' : 'text-slate-600'
                }`}>
                  {diffCumulative > 0 ? '+' : ''}
                  {formatManYen(diffCumulative)}
                </span>
              </div>
              <div className="mt-3 text-[10px] text-slate-400 font-medium">
                比較年齢({inputs.milestoneAge}歳)では: <span className="font-bold text-slate-700">
                  {diffCumulative >= 0 ? '多い' : '少ない'}（差額: {formatManYen(Math.abs(diffCumulative))}）
                </span>
              </div>
            </div>

            {/* カード 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">損益が入れ替わる年齢（分岐点）</span>
                <span className="text-[11px] text-slate-500 block mt-1">65歳開始の受取総額を追い越す年齢</span>
              </div>
              <div className="mt-5 flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-500">
                  損益分岐目安
                </span>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-[#1D4ED8]">
                  {breakEvenStr === '基準（65歳）と同じ' ? '逆転なし' : breakEvenStr}
                </span>
              </div>
              <div className="mt-3 text-[10px] text-slate-400 font-medium">
                {inputs.selectedAge > 65 
                  ? `${breakEvenStr === '基準（65歳）と同じ' ? '選択年齢は基準です' : `これ以降の生存期間があれば、${inputs.selectedAge}歳開始がお得`}`
                  : `これより早く受給完了した場合は、${inputs.selectedAge}歳開始がお得`
                }
              </div>
            </div>

          </div>
        </div>

        {/* 3. グラフ2枚を横並び */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* グラフ A: 累計額推移 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="mb-5">
              <h4 className="font-bold text-[#002D62] text-sm flex items-center space-x-1.5">
                <TrendingUp className="h-4 w-4 text-[#1D4ED8]" />
                <span>到達年齢別の累計額推移（損益分岐の視覚化）</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                何歳時点でどちらの受取開始のほうが総受取額が多くなるかを表します（単位：万円）
              </p>
            </div>
            
            <div className="h-[280px] w-full">
              <ResponsiveContainer key={`line-${inputs.selectedAge}`} width="100%" height={280}>
                <LineChart
                  data={lineChartData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="age" 
                    tickFormatter={(v) => `${v}歳`} 
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    stroke="#CBD5E1"
                  />
                  <YAxis 
                    tickFormatter={(v) => `${v}万`}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    stroke="#CBD5E1"
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${value}万円`, '']}
                    labelFormatter={(label: any) => `到達年齢: ${label}歳`}
                    contentStyle={{ fontSize: '11px', borderRadius: '6px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="65歳開始" 
                    stroke="#CBD5E1" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="選択中の開始年齢" 
                    name={`${inputs.selectedAge}歳受給開始`} 
                    stroke="#1D4ED8" 
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* グラフ B: 開始年齢別累計額比較 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="mb-5">
              <h4 className="font-bold text-[#002D62] text-sm flex items-center space-x-1.5">
                <span className="inline-block h-4 w-4 rounded bg-blue-50 text-[#1D4ED8] text-center font-bold text-xs leading-4">B</span>
                <span>生存想定別の累計受取額比較</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                80歳・90歳・100歳まで生存された場合の各開始年齢における受取総額（単位：万円）
              </p>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer key={`bar-${inputs.selectedAge}`} width="100%" height={280}>
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fontWeight: 'bold', fill: '#475569' }}
                    stroke="#CBD5E1"
                  />
                  <YAxis 
                    tickFormatter={(v) => `${v}万`}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    stroke="#CBD5E1"
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${value}万円`, '']}
                    contentStyle={{ fontSize: '11px', borderRadius: '6px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                  {barAges.map((age, idx) => {
                    // カラーパレットの設定（選択中は高コントラストのブルー、65歳はニュートラル、その他はグレー調）
                    let barColor = '#CBD5E1';
                    if (age === inputs.selectedAge) {
                      barColor = '#1D4ED8';
                    } else if (age === 65) {
                      barColor = '#002D62';
                    } else if (age === 60) {
                      barColor = '#E2E8F0';
                    } else if (age === 75) {
                      barColor = '#94A3B8';
                    }
                    return (
                      <Bar 
                        key={age} 
                        dataKey={`${age}歳開始`} 
                        fill={barColor}
                        radius={[4, 4, 0, 0]}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* 5. このシミュレーションからの示唆 */}
        <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-6 sm:p-8 space-y-5">
          <h4 className="font-bold text-[#002D62] text-sm sm:text-base flex items-center space-x-2">
            <Award className="h-5 w-5 text-[#1D4ED8]" />
            <span>このシミュレーションから得られる示唆と確認ポイント</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs leading-relaxed text-slate-700">
            
            {/* 示唆 1 */}
            <div className="bg-white p-5 rounded-xl border border-blue-100/60 shadow-2xs space-y-2">
              <span className="font-bold text-[#002D62] text-xs block">① 年額を厚くする安心（終身保障）</span>
              <p className="text-slate-600">
                {inputs.selectedAge > 65 ? (
                  <>
                    選択中の<span className="font-bold text-blue-700">{inputs.selectedAge}歳</span>受給開始の場合、年金月額は65歳開始より【<span className="font-bold text-blue-700">{(selectedItem.rate * 100 - 100).toFixed(1)}%</span>】増額されます。年金は一生涯受け取れる終身保障であるため、ベースとなる固定収入を厚くできることは、超高齢期を迎えた際の何よりの経済的・精神的安心感に繋がります。
                  </>
                ) : inputs.selectedAge < 65 ? (
                  <>
                    受取開始を遅らせる（繰下げる）と、年金額は1か月ごとに0.7%（1年間で8.4%）増額されます。仮に65歳開始から70歳開始にするだけで【<span className="font-bold text-blue-700">42.0%</span>】増額となり、その増額された年金額は一生涯引き継がれます。
                  </>
                ) : (
                  <>
                    年金は一度受給を開始すると、その時点の受取比率が一生涯固定されます。1か月繰下げるごとに0.7%増額されるため、健康状態や他資産に余裕がある場合は、少しでも開始時期を遅らせることで基本生活費のベースを手厚くすることができます。
                  </>
                )}
              </p>
            </div>

            {/* 示唆 2 */}
            <div className="bg-white p-5 rounded-xl border border-blue-100/60 shadow-2xs space-y-2">
              <span className="font-bold text-[#002D62] text-xs block">② 損益分岐点の目安</span>
              <p className="text-slate-600">
                {inputs.selectedAge === 65 ? (
                  <>
                    65歳は公的年金の本来の受給開始年齢であり、将来的な健康状態の不安要素や平均寿命に対する標準的なバランスが保たれています。繰下げや繰上げを行う際は、この65歳開始を基準として「何年生存すれば有利になるか」を意識することが大切です。
                  </>
                ) : (
                  <>
                    65歳開始と選択中の<span className="font-bold text-blue-700">{inputs.selectedAge}歳</span>開始を比較した場合、累計受取総額の損益分岐点はおおむね【<span className="font-bold text-blue-700">{breakEvenStr}</span>】となります。この年齢を越えて生存される場合は、{inputs.selectedAge > 65 ? '受給開始を遅らせた（繰下げた）' : '65歳から受給した'}方が累計受取額が多くなります。
                  </>
                )}
              </p>
            </div>

            {/* 示唆 3 */}
            <div className="bg-white p-5 rounded-xl border border-blue-100/60 shadow-2xs space-y-2">
              <span className="font-bold text-[#002D62] text-xs block">③ 累計額の比較結果</span>
              <p className="text-slate-600">
                <span className="font-bold text-blue-700">{inputs.milestoneAge}歳</span>まで受け取ると仮定した場合、65歳開始の累計額は【<span className="font-bold text-blue-700">{formatManYen(baseItem[`cumulative${inputs.milestoneAge}` as keyof typeof baseItem] as number)}</span>】、選択中の<span className="font-bold text-blue-700">{inputs.selectedAge}歳</span>開始では【<span className="font-bold text-blue-700">{formatManYen(selectedItem[`cumulative${inputs.milestoneAge}` as keyof typeof selectedItem] as number)}</span>】となり、
                {diffCumulative > 0 ? (
                  <>選択中の<span className="font-bold text-blue-700">{inputs.selectedAge}歳</span>開始の方が【<span className="font-bold text-blue-700">約{formatManYen(diffCumulative)}</span>】多くなる可能性があります。この年齢まで受け取る場合は、受取時期を遅らせる（または繰下げている）効果が発揮されます。</>
                ) : (
                  <>65歳開始の方が【<span className="font-bold text-blue-700">約{formatManYen(Math.abs(diffCumulative))}</span>】多くなる可能性があります。早期に資金を手元に確保したい場合や、この年齢までの累計を優先する場合に適しています。</>
                )}
              </p>
            </div>

            {/* 示唆 4 */}
            <div className="bg-white p-5 rounded-xl border border-blue-100/60 shadow-2xs space-y-2">
              <span className="font-bold text-[#002D62] text-xs block">④ 受取時期を考えるときの確認項目</span>
              <p className="text-slate-600">
                どちらが一概に良いというより、ご本人やご家族の「今後の就労収入の見込み」「退職金・DC等の他資産の有無」「健康状態への不安や安心感」によって確認したい受取時期は変わります。
                手元に流動資金を厚くしておきたいか、超高齢期の老後生存に伴う支出継続に備えて終身収入を最大化したいかなど、ご自身のライフビジョンに合わせてご検討ください。
              </p>
            </div>

          </div>
        </div>

        {/* 総合確認への導線 */}
        {onGoToTotalDiagnosis && (
          <div className="compass-panel flex flex-col items-start justify-between gap-5 border-l-4 border-l-[#2F6FED] p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-[#063A70]">退職後のお金全体をまとめて確認</h4>
              <p className="max-w-2xl text-xs leading-relaxed text-slate-600">
                ここまでに試算した年金受取開始年齢（{inputs.selectedAge}歳）や見込額を引き継ぎ、退職金や生活費を含めた資金推移を確認できます。
              </p>
            </div>
            <button
              id="cta-goto-total-from-pension"
              onClick={onGoToTotalDiagnosis}
              className="flex min-h-10 flex-shrink-0 cursor-pointer items-center gap-2 rounded-md bg-[#063A70] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0A4B88] sm:text-sm"
            >
              <span>この内容で総合確認へ進む</span>
              <Compass className="h-4 w-4 text-[#1D4ED8]" />
            </button>
          </div>
        )}

        {/* 6. 注意事項・注記 */}
        <div className="bg-slate-100/60 border border-slate-200/40 rounded-xl p-4 sm:p-5 text-[11px] text-slate-500 leading-relaxed font-medium">
          <p>
            ※ 税額は所得税・住民税の簡易テーブルによる概算、社会保険料は「単身・年金収入のみ」を前提とした標準モデルによる概算です。実際の自治体・世帯構成・控除状況により金額は変動します。累計受取額・損益分岐点は税引前の年額を基に、受取開始年齢から想定生存年齢までの年数を単純に掛けた概算です。
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-10 text-center text-xs text-slate-500 mt-20 space-y-3">
        <p className="text-slate-500 text-[11px] sm:text-xs px-4 max-w-3xl mx-auto leading-relaxed">
          年金受取シミュレーター（概算版） | 本ツールは相談時の比較検討を目的とした参考情報であり、税務・年金の個別助言ではありません。
        </p>
        <p className="text-[10px] text-slate-400 tracking-wider">© 2026 LIFE COMPASS LAB. All Rights Reserved. (COMPASS Series)</p>
      </footer>
    </div>
  );
}

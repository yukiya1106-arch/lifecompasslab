/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Compass,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  HelpCircle,
  TrendingUp,
  User,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  MapPin,
  ReceiptText,
  BookOpenCheck,
  Lightbulb
} from 'lucide-react';
import { CompassHeader } from './CompassBrand';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { CompassInputs, PastLumpSum, AppSharedData } from '../types';
import {
  runCompassCalculation,
  calculateServiceYears,
  calculateServiceYearsBetween,
  calculateCompanyRetirementTaxSummary,
  calculateCustomCompassScenario,
  calculateDcContributionContinuationImpact,
  calculateDcTimingComparison,
  buildDcIdecoGuidance
} from '../utils/calculations';

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

function formatManYenAmount(value: number): string {
  return value.toLocaleString('ja-JP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

interface RetirementDcCompassProps {
  onBackToDashboard: () => void;
  sharedData?: AppSharedData;
  updateSharedData?: (newData: Partial<AppSharedData>, editedKeysToMark?: string[]) => void;
  onGoToTotalDiagnosis?: () => void;
}

export default function RetirementDcCompass({
  onBackToDashboard,
  sharedData,
  updateSharedData,
  onGoToTotalDiagnosis
}: RetirementDcCompassProps) {
  // --- 初期状態設定 ---
  const [inputs, setInputs] = useState<CompassInputs>(() => {
    const initialBirth = sharedData?.birthYearMonth || '1966-07';
    const [birthY, birthM] = initialBirth.split('-').map(Number);
    const calculatedJoined = `${birthY + 23}-04`;
    const calculatedDcEnd = `${birthY + 60}-${String(birthM).padStart(2, '0')}`;

    const base: CompassInputs = {
      birthYearMonth: initialBirth,
      joinedYearMonth: calculatedJoined,
      dcJoinedYearMonth: '2001-10', // DC/iDeCo通算加入開始年月
      dcJoinedEndYearMonth: calculatedDcEnd,
      companyRetirementAge: 60,
      companyRetirementEstimate: 2000, // 2000万円
      corporateDcEstimate: 500, // 500万円
      idecoEstimate: 0, // 0万円
      dcIdecoReceiptAge: 65,
      dcIdecoReceiptMethod: 'lumpSum', // 一時金
      publicPensionEstimate: 200, // 年間200万円
      publicPensionStartAge: 65,

      // A. 退職後の働き方
      workAfterRetirement: false,
      workUntilAge: 65,
      workAnnualSalary: 300,

      // B. 会社退職・支給月
      companyRetirementMonth: 7,
      companyRetirementPaymentMonth: 8,

      // C. DC/iDeCoの加入期間
      corporateDcJoinStart: '2001-10',
      corporateDcJoinEnd: '2026-07',
      idecoJoinStart: '',
      idecoJoinEnd: '',

      // D. 過去の一時金
      hasPastLumpSum: 'no',
      pastLumpSums: [],
    };
    if (sharedData) {
      if (sharedData.birthYearMonth !== undefined) {
        base.birthYearMonth = sharedData.birthYearMonth;
        const [sharedBirthY] = sharedData.birthYearMonth.split('-').map(Number);
        if (!isNaN(sharedBirthY)) {
          base.joinedYearMonth = `${sharedBirthY + 23}-04`;
        }
      }
      if (sharedData.retirementAge !== undefined) {
        base.companyRetirementAge = sharedData.retirementAge;
      }
      if (sharedData.retirementLumpSum !== undefined) {
        base.companyRetirementEstimate = sharedData.retirementLumpSum;
      }
      if (sharedData.corporateDcBalance !== undefined) {
        base.corporateDcEstimate = sharedData.corporateDcBalance;
      }
      if (sharedData.idecoBalance !== undefined) {
        base.idecoEstimate = sharedData.idecoBalance;
      }
      if (sharedData.dcStartAge !== undefined) {
        base.dcIdecoReceiptAge = sharedData.dcStartAge;
      }
      if (sharedData.publicPensionAmount !== undefined) {
        base.publicPensionEstimate = sharedData.publicPensionAmount;
      }
      if (sharedData.pensionStartAge !== undefined) {
        base.publicPensionStartAge = sharedData.pensionStartAge;
      }
      if (sharedData.workUntilAge !== undefined) {
        base.workUntilAge = sharedData.workUntilAge;
      }
    }
    const [finalBirthY, finalBirthM] = base.birthYearMonth.split('-').map(Number);
    base.dcJoinedEndYearMonth = `${finalBirthY + base.companyRetirementAge}-${String(finalBirthM).padStart(2, '0')}`;
    base.corporateDcJoinEnd = base.dcJoinedEndYearMonth;
    return base;
  });

  // 任意プランのスライダー調整用の状態
  const [customLumpSum, setCustomLumpSum] = useState<number>(250);
  const [timingAnnualReturn, setTimingAnnualReturn] = useState<number>(0);
  const [timingMonthlyContribution, setTimingMonthlyContribution] = useState<number>(0.5);
  const [timingBaseBalance, setTimingBaseBalance] = useState<number>(
    () => inputs.corporateDcEstimate + inputs.idecoEstimate
  );

  // 選択中のプリセットを追跡する状態
  const [activePreset, setActivePreset] = useState<'A' | 'B' | 'C' | 'D' | null>(null);

  // 詳細設定アコーディオンの開閉
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // 過去の一時金入力用の一時ステート
  const [tempPastLump, setTempPastLump] = useState<Omit<PastLumpSum, 'id'>>({
    name: '前職一時金',
    receiveYearMonth: '2020-03',
    amount: 300,
    joinStart: '2010-04',
    joinEnd: '2020-03',
    type: 'companyRetirement'
  });

  // アクティブタブ ('summary'=受取プラン, 'deduction'=控除枠, 'assumptions'=計算根拠)
  const [activeTab, setActiveTab] = useState<'summary' | 'deduction' | 'assumptions'>('summary');

  // インプット変更時のハンドラ
  const handleInputChange = (key: keyof CompassInputs, value: any) => {
    setActivePreset(null); // 入力変更があったらプリセット選択をクリア
    setInputs(prev => {
      const next = { ...prev, [key]: value };
      
      // DC/iDeCo残高の変更時は、任意プランの初期スライダー値も更新
      if (key === 'corporateDcEstimate' || key === 'idecoEstimate') {
        const total = (key === 'corporateDcEstimate' ? value : prev.corporateDcEstimate) + 
                      (key === 'idecoEstimate' ? value : prev.idecoEstimate);
        setCustomLumpSum(Math.round(total / 2));
        setTimingBaseBalance(total);
      }
      
      // シェアードデータへの自動フィードバック
      if (updateSharedData) {
        const sharedMapping: Partial<Record<keyof CompassInputs, keyof AppSharedData>> = {
          birthYearMonth: 'birthYearMonth',
          companyRetirementAge: 'retirementAge',
          companyRetirementEstimate: 'retirementLumpSum',
          corporateDcEstimate: 'corporateDcBalance',
          idecoEstimate: 'idecoBalance',
          dcIdecoReceiptAge: 'dcStartAge',
          publicPensionEstimate: 'publicPensionAmount',
          publicPensionStartAge: 'pensionStartAge',
          workUntilAge: 'workUntilAge'
        };
        const mappedKey = sharedMapping[key];
        if (mappedKey) {
          updateSharedData({ [mappedKey]: value }, [mappedKey]);
        }
      }
      
      return next;
    });
  };

  const applyDcTimingCandidate = (
    receiptAge: number,
    contributionEndAge: number,
    projectedTotal: number
  ) => {
    setActivePreset(null);
    const currentTotal = inputs.corporateDcEstimate + inputs.idecoEstimate;
    const corporateShare = currentTotal > 0 ? inputs.corporateDcEstimate / currentTotal : 1;
    const corporateDcEstimate = Math.round(projectedTotal * corporateShare * 100) / 100;
    const idecoEstimate = Math.round((projectedTotal - corporateDcEstimate) * 100) / 100;
    const [birthY, birthM] = inputs.birthYearMonth.split('-').map(Number);
    const contributionEndYearMonth = `${birthY + contributionEndAge}-${String(birthM).padStart(2, '0')}`;

    setInputs(prev => ({
      ...prev,
      dcIdecoReceiptAge: receiptAge,
      dcJoinedEndYearMonth: contributionEndYearMonth,
      corporateDcJoinEnd: contributionEndYearMonth,
      corporateDcEstimate,
      idecoEstimate,
    }));
    setCustomLumpSum(Math.round(projectedTotal / 2));

    if (updateSharedData) {
      updateSharedData(
        {
          dcStartAge: receiptAge,
          corporateDcBalance: corporateDcEstimate,
          idecoBalance: idecoEstimate,
        },
        ['dcStartAge', 'corporateDcBalance', 'idecoBalance']
      );
    }
  };

  const setDcContributionEndAge = (age: number) => {
    const [birthY, birthM] = inputs.birthYearMonth.split('-').map(Number);
    if (!Number.isFinite(birthY) || !Number.isFinite(birthM)) return;
    const yearMonth = `${birthY + age}-${String(birthM).padStart(2, '0')}`;

    setActivePreset(null);
    setInputs(prev => ({
      ...prev,
      dcJoinedEndYearMonth: yearMonth,
      corporateDcJoinEnd: yearMonth,
      dcIdecoReceiptAge: Math.max(prev.dcIdecoReceiptAge, age),
    }));
    if (updateSharedData && age > inputs.dcIdecoReceiptAge) {
      updateSharedData({ dcStartAge: age }, ['dcStartAge']);
    }
  };

  // 過去の一時金追加
  const addPastLumpSum = () => {
    const newItem: PastLumpSum = {
      ...tempPastLump,
      id: Math.random().toString(36).substr(2, 9)
    };
    handleInputChange('pastLumpSums', [...inputs.pastLumpSums, newItem]);
    // 過去の一時金のフォーム入力値を初期化（日付をデフォルト値にして整合性エラーが最初から出ないように配慮）
    setTempPastLump({
      name: '',
      amount: 0,
      receiveYearMonth: '2010-04',
      joinStart: '2001-10',
      joinEnd: '2010-04',
      type: 'companyRetirement'
    });
  };

  // 過去の一時金削除
  const removePastLumpSum = (id: string) => {
    handleInputChange('pastLumpSums', inputs.pastLumpSums.filter(item => item.id !== id));
  };

  // シナリオプリセットの適用
  const applyTestPreset = (preset: 'A' | 'B' | 'C' | 'D') => {
    setActivePreset(preset);
    const defaultBirth = '1966-07';
    switch (preset) {
      case 'A': // 60歳退職・65歳まで再雇用
        setInputs({
          birthYearMonth: defaultBirth,
          joinedYearMonth: '1986-04',
          dcJoinedYearMonth: '2001-10',
          dcJoinedEndYearMonth: '2026-07',
          companyRetirementAge: 60,
          companyRetirementEstimate: 2000,
          corporateDcEstimate: 800,
          idecoEstimate: 200,
          dcIdecoReceiptAge: 65,
          dcIdecoReceiptMethod: 'lumpSum',
          publicPensionEstimate: 220,
          publicPensionStartAge: 65,
          workAfterRetirement: true,
          workUntilAge: 65,
          workAnnualSalary: 350,
          companyRetirementMonth: 7,
          companyRetirementPaymentMonth: 8,
          corporateDcJoinStart: '2001-10',
          corporateDcJoinEnd: '2026-07',
          idecoJoinStart: '2016-10',
          idecoJoinEnd: '2026-07',
          hasPastLumpSum: 'no',
          pastLumpSums: []
        });
        setCustomLumpSum(500);
        setTimingBaseBalance(1000);
        break;
      case 'B': // 60歳退職・DCも同時受取
        setInputs({
          birthYearMonth: defaultBirth,
          joinedYearMonth: '1986-04',
          dcJoinedYearMonth: '2001-10',
          dcJoinedEndYearMonth: '2026-07',
          companyRetirementAge: 60,
          companyRetirementEstimate: 1500,
          corporateDcEstimate: 1000,
          idecoEstimate: 0,
          dcIdecoReceiptAge: 60, // 同年受取
          dcIdecoReceiptMethod: 'lumpSum',
          publicPensionEstimate: 180,
          publicPensionStartAge: 65,
          workAfterRetirement: false,
          workUntilAge: 65,
          workAnnualSalary: 0,
          companyRetirementMonth: 7,
          companyRetirementPaymentMonth: 8,
          corporateDcJoinStart: '2001-10',
          corporateDcJoinEnd: '2026-07',
          idecoJoinStart: '',
          idecoJoinEnd: '',
          hasPastLumpSum: 'no',
          pastLumpSums: []
        });
        setCustomLumpSum(770);
        setTimingBaseBalance(1000);
        break;
      case 'C': // 65歳退職・年金開始と同時期
        setInputs({
          birthYearMonth: '1961-07',
          joinedYearMonth: '1986-04', // 勤続40年
          dcJoinedYearMonth: '2001-10',
          dcJoinedEndYearMonth: '2026-07',
          companyRetirementAge: 65,
          companyRetirementEstimate: 2000,
          corporateDcEstimate: 500,
          idecoEstimate: 0,
          dcIdecoReceiptAge: 65,
          dcIdecoReceiptMethod: 'lumpSum',
          publicPensionEstimate: 240,
          publicPensionStartAge: 65,
          workAfterRetirement: false,
          workUntilAge: 65,
          workAnnualSalary: 0,
          companyRetirementMonth: 7,
          companyRetirementPaymentMonth: 8,
          corporateDcJoinStart: '2001-10',
          corporateDcJoinEnd: '2026-07',
          idecoJoinStart: '',
          idecoJoinEnd: '',
          hasPastLumpSum: 'no',
          pastLumpSums: []
        });
        setCustomLumpSum(250);
        setTimingBaseBalance(500);
        break;
      case 'D': // 早期退職・再就職あり
        setInputs({
          birthYearMonth: '1971-07',
          joinedYearMonth: '1996-04', // 勤続29年
          dcJoinedYearMonth: '2001-10',
          dcJoinedEndYearMonth: '2026-07',
          companyRetirementAge: 55, // 早期退職
          companyRetirementEstimate: 1200,
          corporateDcEstimate: 400,
          idecoEstimate: 0,
          dcIdecoReceiptAge: 65,
          dcIdecoReceiptMethod: 'lumpSum',
          publicPensionEstimate: 200,
          publicPensionStartAge: 65,
          workAfterRetirement: true,
          workUntilAge: 65,
          workAnnualSalary: 400,
          companyRetirementMonth: 7,
          companyRetirementPaymentMonth: 8,
          corporateDcJoinStart: '2001-10',
          corporateDcJoinEnd: '2026-07',
          idecoJoinStart: '',
          idecoJoinEnd: '',
          hasPastLumpSum: 'no',
          pastLumpSums: []
        });
        setCustomLumpSum(200);
        setTimingBaseBalance(400);
        break;
    }
  };

  // 計算処理の実行
  const results = useMemo(() => {
    return runCompassCalculation(inputs);
  }, [inputs]);

  // 任意（カスタム）プランの計算結果
  const customScenarioResult = useMemo(() => {
    return calculateCustomCompassScenario(inputs, results, customLumpSum);
  }, [inputs, results, customLumpSum]);

  // 過去一時金の入力整合性チェック
  const pastLumpSumInconsistency = useMemo(() => {
    const result = {
      hasInconsistency: false,
      hasFutureEnd: false,
      hasJobOverlap: false,
      messages: [] as string[]
    };

    if (inputs.hasPastLumpSum !== 'yes' || inputs.pastLumpSums.length === 0) {
      return result;
    }

    inputs.pastLumpSums.forEach(item => {
      if (!item.receiveYearMonth) return;

      // 1. 受取年月と終了年月を比較し、受取年月より後に終了年月がある場合は「要確認」
      if (item.joinEnd) {
        const [recY, recM] = item.receiveYearMonth.split('-').map(Number);
        const [endY, endM] = item.joinEnd.split('-').map(Number);

        if (!isNaN(recY) && !isNaN(recM) && !isNaN(endY) && !isNaN(endM)) {
          const recTotal = recY * 12 + recM;
          const endTotal = endY * 12 + endM;

          if (endTotal > recTotal) {
            result.hasInconsistency = true;
            result.hasFutureEnd = true;
            result.messages.push(
              `過去一時金「${item.name || '過去退職金等'}」の対象期間が、受取年月より後まで設定されています。前職退職金などの場合、通常は受取時点までの勤続期間を確認します。受取年月（${item.receiveYearMonth}）または対象期間（${item.joinStart || ''}〜${item.joinEnd}）をご確認ください。`
            );
          }
        }
      }

      // 2. 過去一時金の対象期間と現職期間の重複チェック (例: 過去一時金受取年月と現職入社年月が2010年04月で、対象期間が2020年03月まで)
      if (inputs.joinedYearMonth && item.joinStart && item.joinEnd) {
        const [currY, currM] = inputs.joinedYearMonth.split('-').map(Number);
        const [startY, startM] = item.joinStart.split('-').map(Number);
        const [endY, endM] = item.joinEnd.split('-').map(Number);

        if (!isNaN(currY) && !isNaN(currM) && !isNaN(startY) && !isNaN(startM) && !isNaN(endY) && !isNaN(endM)) {
          const currTotal = currY * 12 + currM;
          const startTotal = startY * 12 + startM;
          const endTotal = endY * 12 + endM;

          // 過去一時金の対象期間（joinStart〜joinEnd）が現職期間（joinedYearMonth〜）と重複している場合
          // 特に joinEnd が joinedYearMonth より大きい（後である）場合
          if (endTotal > currTotal && startTotal <= currTotal) {
            result.hasInconsistency = true;
            result.hasJobOverlap = true;
            result.messages.push(
              `過去一時金「${item.name || '過去退職金等'}」の対象期間（〜${item.joinEnd}）と、現職の勤続期間（${inputs.joinedYearMonth}〜）に重複があります。通常、前職の退職等に伴い一時金が支払われた場合、その対象期間は前職の退職年月までとなります。この入力内容では、重複期間が大きく表示されている可能性がありますので、入力内容をご確認ください。`
            );
          }
        }
      }
    });

    return result;
  }, [inputs.pastLumpSums, inputs.hasPastLumpSum, inputs.joinedYearMonth]);

  // 現在の年齢
  const currentAge = useMemo(() => {
    return calculateAgeAtYM(inputs.birthYearMonth, '2026-07') || 60;
  }, [inputs.birthYearMonth]);

  // 勤続年数
  const serviceYears = useMemo(() => {
    return calculateServiceYears(inputs.joinedYearMonth, inputs.birthYearMonth, inputs.companyRetirementAge);
  }, [inputs.joinedYearMonth, inputs.birthYearMonth, inputs.companyRetirementAge]);

  // DC/iDeCoの通算加入期間
  const dcServiceYears = useMemo(() => {
    const start = inputs.dcJoinedYearMonth || inputs.joinedYearMonth;
    return calculateServiceYearsBetween(start, inputs.dcJoinedEndYearMonth);
  }, [inputs.dcJoinedYearMonth, inputs.joinedYearMonth, inputs.dcJoinedEndYearMonth]);

  const dcPeriodCheck = useMemo(() => {
    const [birthY, birthM] = (inputs.birthYearMonth || '').split('-').map(Number);
    const receiptYearMonth = !isNaN(birthY) && !isNaN(birthM)
      ? `${birthY + inputs.dcIdecoReceiptAge}-${String(birthM).padStart(2, '0')}`
      : '';
    const start = inputs.dcJoinedYearMonth || inputs.joinedYearMonth;
    return {
      endBeforeStart: Boolean(start && inputs.dcJoinedEndYearMonth && inputs.dcJoinedEndYearMonth <= start),
      endAfterReceipt: Boolean(
        inputs.dcJoinedEndYearMonth &&
        receiptYearMonth &&
        inputs.dcJoinedEndYearMonth > receiptYearMonth
      ),
    };
  }, [
    inputs.birthYearMonth,
    inputs.dcIdecoReceiptAge,
    inputs.dcJoinedEndYearMonth,
    inputs.dcJoinedYearMonth,
    inputs.joinedYearMonth,
  ]);

  const dcTimingComparison = useMemo(() => {
    return calculateDcTimingComparison(
      inputs,
      timingAnnualReturn,
      timingMonthlyContribution,
      timingBaseBalance
    );
  }, [inputs, timingAnnualReturn, timingMonthlyContribution, timingBaseBalance]);

  const dcContributionImpact = useMemo(() => {
    return calculateDcContributionContinuationImpact(inputs);
  }, [inputs]);

  // チャート用データ
  const chartData = useMemo(() => {
    const s1 = results.lumpSumScenario;
    const s2 = results.pensionScenario;
    const s3 = results.hybridScenario;
    const s4 = customScenarioResult;

    return [
      {
        name: '全額一時金',
        '手取り総額': Math.round(s1.netAmount),
        '概算税額等': Math.round(s1.totalAmount - s1.netAmount),
        '額面総額': s1.totalAmount
      },
      {
        name: '年金分割',
        '手取り総額': Math.round(s2.cumulativeNetWithCompanyRetirement),
        '概算税額等': Math.round((inputs.companyRetirementEstimate + results.dcIdecoTotal) - s2.cumulativeNetWithCompanyRetirement),
        '額面総額': inputs.companyRetirementEstimate + results.dcIdecoTotal
      },
      {
        name: '同年配分例',
        '手取り総額': Math.round(s3.cumulativeNetWithCompanyRetirement),
        '概算税額等': Math.round((inputs.companyRetirementEstimate + results.dcIdecoTotal) - s3.cumulativeNetWithCompanyRetirement),
        '額面総額': inputs.companyRetirementEstimate + results.dcIdecoTotal
      },
      {
        name: '任意プラン',
        '手取り総額': Math.round(s4.cumulativeNetWithCompanyRetirement),
        '概算税額等': Math.round((inputs.companyRetirementEstimate + results.dcIdecoTotal) - s4.cumulativeNetWithCompanyRetirement),
        '額面総額': inputs.companyRetirementEstimate + results.dcIdecoTotal
      }
    ];
  }, [results, customScenarioResult, inputs.companyRetirementEstimate, results.dcIdecoTotal]);

  return (
    <div className="compass-page pb-16 font-sans" id="retirement-dc-compass-root">
      <CompassHeader
        toolName="退職金・DC受取COMPASS"
        onBack={onBackToDashboard}
        action={onGoToTotalDiagnosis ? (
          <button
            type="button"
            onClick={onGoToTotalDiagnosis}
            className="min-h-9 rounded-md border border-[#B8CDEC] bg-[#F4F8FF] px-3 text-xs font-bold text-[#1D4ED8] transition-colors hover:bg-[#EAF2FF]"
            id="go-to-diagnosis-btn"
          >
            総合確認へ
          </button>
        ) : undefined}
      />

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* ==================== 左カラム: 入力フォーム (4/12) ==================== */}
          <div className="min-w-0 space-y-6 lg:col-span-4" id="input-column">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 sm:p-6 space-y-5">
                <h2 className="text-sm font-bold text-[#002D62] flex items-center space-x-2 border-l-2 border-[#1D4ED8]/70 pl-3">
                  <span>受取プランの計算条件</span>
                </h2>

            {/* A. 生年月・現職入社年月・DC加入年月 */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">生年月 (西暦)</label>
                  <input
                    type="month"
                    value={inputs.birthYearMonth}
                    onChange={(e) => handleInputChange('birthYearMonth', e.target.value)}
                    className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    id="birthYearMonth-input"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">現在: {currentAge}歳</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">現職入社年月</label>
                  <input
                    type="month"
                    value={inputs.joinedYearMonth}
                    onChange={(e) => handleInputChange('joinedYearMonth', e.target.value)}
                    className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    id="joinedYearMonth-input"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">想定勤続: {serviceYears}年</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">DC/iDeCo通算加入開始年月</label>
                  <input
                    type="month"
                    value={inputs.dcJoinedYearMonth}
                    onChange={(e) => handleInputChange('dcJoinedYearMonth', e.target.value)}
                    className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    id="dcJoinedYearMonth-input"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">通算加入終了年月（予定）</label>
                  <input
                    type="month"
                    value={inputs.dcJoinedEndYearMonth}
                    onChange={(e) => handleInputChange('dcJoinedEndYearMonth', e.target.value)}
                    className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    id="dcJoinedEndYearMonth-input"
                  />
                </div>
                <div className="col-span-2 rounded-md border border-blue-100 bg-blue-50/45 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-[#002D62]">60歳以降の掛金拠出予定</span>
                    <span className="text-[9px] text-slate-500">控除額の加入年数へ反映</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {Array.from(new Set([inputs.companyRetirementAge, 65, 70]))
                      .filter((age) => age >= inputs.companyRetirementAge && age <= 70)
                      .map((age) => {
                        const [birthY, birthM] = inputs.birthYearMonth.split('-').map(Number);
                        const optionYearMonth = `${birthY + age}-${String(birthM).padStart(2, '0')}`;
                        const isActive = inputs.dcJoinedEndYearMonth === optionYearMonth;
                        return (
                          <button
                            type="button"
                            key={age}
                            onClick={() => setDcContributionEndAge(age)}
                            className={`min-h-8 rounded-md border px-2 text-[10px] font-bold transition-colors ${
                              isActive
                                ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
                            }`}
                          >
                            {age === inputs.companyRetirementAge ? `退職時（${age}歳）` : `${age}歳まで積立`}
                          </button>
                        );
                      })}
                  </div>
                  <p className="mt-2 text-[9px] leading-relaxed text-slate-500">
                    掛金を拠出する期間です。掛金を止めた後、受取まで運用だけを続ける期間とは分けて入力します。70歳までの加入可否は制度・勤務先規約を確認します。
                  </p>
                </div>
                <span className="col-span-2 text-[9px] text-slate-400">
                  通算加入期間: {dcServiceYears}年。受取を待つだけの期間は加入年数へ含めません。
                </span>
                {(dcPeriodCheck.endBeforeStart || dcPeriodCheck.endAfterReceipt) && (
                  <div className="col-span-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[9px] leading-relaxed text-amber-900">
                    {dcPeriodCheck.endBeforeStart
                      ? '要確認：通算加入終了年月が開始年月以前になっています。'
                      : '要確認：現在の受取年齢が通算加入終了予定より前です。計算上は受取年月までの加入期間に短縮しています。'}
                  </div>
                )}
              </div>
            </div>

            {/* B. 会社退職金の見込額と年齢 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">会社退職年齢 (歳)</label>
                <input
                  type="number"
                  min="50"
                  max="75"
                  placeholder="60"
                  value={inputs.companyRetirementAge === 0 ? '' : inputs.companyRetirementAge}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const clean = raw.replace(/^0+([0-9])/, '$1');
                    e.currentTarget.value = clean;
                    handleInputChange('companyRetirementAge', clean === '' ? 0 : Number(clean));
                  }}
                  onBlur={(e) => {
                    const val = Number(e.target.value) || 0;
                    e.target.value = String(val);
                    handleInputChange('companyRetirementAge', val);
                  }}
                  className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  id="companyRetirementAge-input"
                />
                <span className="text-[9px] text-slate-400 mt-1 block">退職時: {inputs.companyRetirementAge}歳 / 勤続: {serviceYears}年</span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">会社退職金見込額 (万円)</label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="50"
                  placeholder="0"
                  value={inputs.companyRetirementEstimate === 0 ? '' : inputs.companyRetirementEstimate}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const clean = raw.replace(/^0+([0-9])/, '$1');
                    e.currentTarget.value = clean;
                    handleInputChange('companyRetirementEstimate', clean === '' ? 0 : Number(clean));
                  }}
                  onBlur={(e) => {
                    const val = Number(e.target.value) || 0;
                    e.target.value = String(val);
                    handleInputChange('companyRetirementEstimate', val);
                  }}
                  className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 font-bold focus:border-blue-500 focus:outline-none text-blue-800"
                  id="companyRetirementEstimate-input"
                />
              </div>
            </div>

            {/* C. DC/iDeCo残高予想 */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">DC受取時点の企業型DC残高予想（万円）</label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    step="50"
                    placeholder="0"
                    value={inputs.corporateDcEstimate === 0 ? '' : inputs.corporateDcEstimate}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const clean = raw.replace(/^0+([0-9])/, '$1');
                      e.currentTarget.value = clean;
                      handleInputChange('corporateDcEstimate', clean === '' ? 0 : Number(clean));
                    }}
                    onBlur={(e) => {
                      const val = Number(e.target.value) || 0;
                      e.target.value = String(val);
                      handleInputChange('corporateDcEstimate', val);
                    }}
                    className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    id="corporateDcEstimate-input"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">iDeCo受取時点の残高予想（万円）</label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    step="50"
                    placeholder="0"
                    value={inputs.idecoEstimate === 0 ? '' : inputs.idecoEstimate}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const clean = raw.replace(/^0+([0-9])/, '$1');
                      e.currentTarget.value = clean;
                      handleInputChange('idecoEstimate', clean === '' ? 0 : Number(clean));
                    }}
                    onBlur={(e) => {
                      const val = Number(e.target.value) || 0;
                      e.target.value = String(val);
                      handleInputChange('idecoEstimate', val);
                    }}
                    className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    id="idecoEstimate-input"
                  />
                </div>
              </div>
              <div className="text-[9px] text-slate-500 bg-slate-100 p-2.5 rounded-xl space-y-1 leading-relaxed border border-slate-200/50">
                <p>• 現在の評価額ではなく、受取予定時点の残高見込みを入力してください。</p>
                <p>• 前職から移換した企業型DC資産がある場合は、移換分も含めた受取時点の見込み額を入力してください。</p>
              </div>
            </div>

            {/* D. DC/iDeCoの希望受取条件 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">希望受取開始年齢 (歳)</label>
                <input
                  type="number"
                  min="60"
                  max="75"
                  placeholder="65"
                  value={inputs.dcIdecoReceiptAge === 0 ? '' : inputs.dcIdecoReceiptAge}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const clean = raw.replace(/^0+([0-9])/, '$1');
                    e.currentTarget.value = clean;
                    handleInputChange('dcIdecoReceiptAge', clean === '' ? 0 : Number(clean));
                  }}
                  onBlur={(e) => {
                    const val = Number(e.target.value) || 0;
                    e.target.value = String(val);
                    handleInputChange('dcIdecoReceiptAge', val);
                  }}
                  className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  id="dcIdecoReceiptAge-input"
                />
                <span className="text-[9px] text-slate-400 mt-1 block">
                  会社退職金受取から {Math.max(0, inputs.dcIdecoReceiptAge - inputs.companyRetirementAge)}年後
                </span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">公的年金年額 (万円/年)</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="10"
                  placeholder="0"
                  value={inputs.publicPensionEstimate === 0 ? '' : inputs.publicPensionEstimate}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const clean = raw.replace(/^0+([0-9])/, '$1');
                    e.currentTarget.value = clean;
                    handleInputChange('publicPensionEstimate', clean === '' ? 0 : Number(clean));
                  }}
                  onBlur={(e) => {
                    const val = Number(e.target.value) || 0;
                    e.target.value = String(val);
                    handleInputChange('publicPensionEstimate', val);
                  }}
                  className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  id="publicPensionEstimate-input"
                />
              </div>
            </div>

            {/* 詳細設定アコーディオン */}
            <div className="border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full flex items-center justify-between text-xs text-slate-600 hover:text-slate-900 font-bold py-1"
                id="advanced-accordion-toggle"
              >
                <span>高度な設定 (働き方・過去の一時金など)</span>
                {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {isAdvancedOpen && (
                <div className="mt-3 space-y-4 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">

                  {/* 退職後の働き方 */}
                  <div>
                    <label className="flex items-center space-x-2 text-[10px] font-bold text-slate-500 mb-1.5">
                      <input
                        type="checkbox"
                        checked={inputs.workAfterRetirement}
                        onChange={(e) => handleInputChange('workAfterRetirement', e.target.checked)}
                        className="rounded text-blue-700 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                        id="workAfterRetirement-checkbox"
                      />
                      <span>退職後も再雇用等で働く予定</span>
                    </label>
                    {inputs.workAfterRetirement && (
                      <div className="grid grid-cols-2 gap-2 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                        <div>
                          <label className="block text-[8px] text-slate-500">働く年齢上限 (歳)</label>
                          <input
                            type="number"
                            placeholder="65"
                            value={inputs.workUntilAge === 0 ? '' : inputs.workUntilAge}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const clean = raw.replace(/^0+([0-9])/, '$1');
                              e.currentTarget.value = clean;
                              handleInputChange('workUntilAge', clean === '' ? 0 : Number(clean));
                            }}
                            onBlur={(e) => {
                              const val = Number(e.target.value) || 0;
                              e.target.value = String(val);
                              handleInputChange('workUntilAge', val);
                            }}
                            className="block w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-500">見込年収 (万円/年)</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={inputs.workAnnualSalary === 0 ? '' : inputs.workAnnualSalary}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const clean = raw.replace(/^0+([0-9])/, '$1');
                              e.currentTarget.value = clean;
                              handleInputChange('workAnnualSalary', clean === '' ? 0 : Number(clean));
                            }}
                            onBlur={(e) => {
                              const val = Number(e.target.value) || 0;
                              e.target.value = String(val);
                              handleInputChange('workAnnualSalary', val);
                            }}
                            className="block w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 過去の一時金受取履歴 */}
                  <div className="border-t border-slate-100 pt-3">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      過去に受け取った退職金・DC一時金の登録 (19年以内)
                    </label>
                    <select
                      value={inputs.hasPastLumpSum}
                      onChange={(e) => handleInputChange('hasPastLumpSum', e.target.value)}
                      className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800"
                    >
                      <option value="no">なし</option>
                      <option value="yes">あり（登録する）</option>
                      <option value="unknown">不明（退職票等がない）</option>
                    </select>

                    {inputs.hasPastLumpSum === 'yes' && (
                      <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
                        <span className="text-[9px] font-bold text-slate-500 block">過去に受け取った退職金・DC一時金の新規追加</span>
                        
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5">一時金の名称 / 種類</label>
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              type="text"
                              value={tempPastLump.name}
                              onChange={(e) => setTempPastLump({ ...tempPastLump, name: e.target.value })}
                              className="block w-full rounded-md border border-slate-300 px-1.5 py-1 text-[10px]"
                              placeholder="例：前職退職金、前職DC一時金"
                            />
                            <select
                              value={tempPastLump.type}
                              onChange={(e) => setTempPastLump({ ...tempPastLump, type: e.target.value as any })}
                              className="block w-full rounded-md border border-slate-300 px-1.5 py-1 text-[10px]"
                            >
                              <option value="companyRetirement">会社退職金</option>
                              <option value="corporatePension">企業年金</option>
                              <option value="corporateDc">企業型DC</option>
                              <option value="ideco">iDeCo一時金</option>
                              <option value="other">その他</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] text-slate-500 mb-0.5">受取金額 (万円)</label>
                            <input
                              type="number"
                              placeholder="0"
                              value={tempPastLump.amount === 0 ? '' : tempPastLump.amount}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const clean = raw.replace(/^0+([0-9])/, '$1');
                                e.currentTarget.value = clean;
                                setTempPastLump({ ...tempPastLump, amount: clean === '' ? 0 : Number(clean) });
                              }}
                              onBlur={(e) => {
                                const val = Number(e.target.value) || 0;
                                e.target.value = String(val);
                                setTempPastLump({ ...tempPastLump, amount: val });
                              }}
                              className="block w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <span className="text-[7.5px] text-slate-400 mt-0.5 block leading-tight">※ 実際に受け取った額面</span>
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-slate-500 mb-0.5 flex items-center justify-between">
                              <span>受取年月</span>
                              {inputs.birthYearMonth && tempPastLump.receiveYearMonth && (
                                <span className="text-slate-500 font-medium text-[9px]">
                                  (当時{calculateAgeAtYM(inputs.birthYearMonth, tempPastLump.receiveYearMonth)}歳)
                                </span>
                              )}
                            </label>
                            <input
                              type="month"
                              value={tempPastLump.receiveYearMonth}
                              onChange={(e) => setTempPastLump({ ...tempPastLump, receiveYearMonth: e.target.value })}
                              className="block w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <span className="text-[7.5px] text-slate-400 mt-0.5 block leading-tight">※ その一時金を受け取った年月</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
                            <span>対応する勤続・加入期間 (開始 〜 終了)</span>
                            {inputs.birthYearMonth && (tempPastLump.joinStart || tempPastLump.joinEnd) && (
                              <span className="text-slate-500 font-medium text-[9px]">
                                ({tempPastLump.joinStart ? `${calculateAgeAtYM(inputs.birthYearMonth, tempPastLump.joinStart)}歳` : '未設定'} 〜 {tempPastLump.joinEnd ? `${calculateAgeAtYM(inputs.birthYearMonth, tempPastLump.joinEnd)}歳` : '未設定'})
                              </span>
                            )}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="month"
                              value={tempPastLump.joinStart}
                              onChange={(e) => setTempPastLump({ ...tempPastLump, joinStart: e.target.value })}
                              className="block w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              type="month"
                              value={tempPastLump.joinEnd}
                              onChange={(e) => setTempPastLump({ ...tempPastLump, joinEnd: e.target.value })}
                              className="block w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                          <span className="text-[7.5px] text-slate-400 mt-1 block leading-tight">※ その一時金の計算対象になった勤務期間・加入期間</span>
                        </div>

                        {tempPastLump.joinEnd && tempPastLump.receiveYearMonth && tempPastLump.joinEnd > tempPastLump.receiveYearMonth && (
                          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-[9px] text-amber-900 leading-relaxed animate-fadeIn">
                            対象期間の終了年月が、受取年月より後になっています。前職退職金などの場合、通常は受取時点までの勤続期間を確認します。受取年月または対象期間をご確認ください。
                          </div>
                        )}

                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={addPastLumpSum}
                            className="inline-flex items-center justify-center space-x-1 rounded-md bg-blue-700 px-3 py-1.5 text-xs text-white hover:bg-blue-800 transition-colors cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>一時金を追加</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 追加済リスト */}
                    {inputs.hasPastLumpSum === 'yes' && inputs.pastLumpSums.length > 0 && (
                      <div className="mt-3 border-t border-slate-200 pt-2 space-y-1.5">
                        <span className="text-[9px] font-bold text-slate-400 block mb-1">登録済み履歴</span>
                        {inputs.pastLumpSums.map((item) => (
                          <div key={item.id} className="flex flex-col bg-white p-2.5 rounded-lg border border-slate-200 text-xs relative">
                            <button
                              onClick={() => removePastLumpSum(item.id)}
                              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                              type="button"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <div className="font-semibold text-slate-800 pr-6">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                              <p>種類: {
                                item.type === 'companyRetirement' ? '会社退職金' :
                                item.type === 'corporatePension' ? '企業年金・退職一時金' :
                                item.type === 'corporateDc' ? '企業型DC一時金' :
                                item.type === 'ideco' ? 'iDeCo一時金' : 'その他'
                              }</p>
                              <p>
                                受取年月: {item.receiveYearMonth}
                                {inputs.birthYearMonth && item.receiveYearMonth && (
                                  <span className="text-slate-500 ml-1">
                                    (当時{calculateAgeAtYM(inputs.birthYearMonth, item.receiveYearMonth)}歳)
                                  </span>
                                )}
                                {' '}| 受取額: <span className="font-semibold text-slate-900">{item.amount}万円</span>
                              </p>
                              <p>
                                加入期間: {item.joinStart}
                                {inputs.birthYearMonth && item.joinStart && (
                                  <span className="text-slate-400 text-[9px]">({calculateAgeAtYM(inputs.birthYearMonth, item.joinStart)}歳)</span>
                                )}
                                {' 〜 '}
                                {item.joinEnd}
                                {inputs.birthYearMonth && item.joinEnd && (
                                  <span className="text-slate-400 text-[9px]">({calculateAgeAtYM(inputs.birthYearMonth, item.joinEnd)}歳)</span>
                                )}
                              </p>

                              {item.joinEnd && item.receiveYearMonth && item.joinEnd > item.receiveYearMonth && (
                                <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-[9px] text-amber-900 leading-relaxed mt-1.5 animate-fadeIn">
                                  対象期間の終了年月が、受取年月より後になっています。前職退職金などの場合、通常は受取時点までの勤続期間を確認します。受取年月または対象期間をご確認ください。
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 代表的なケースの読み込みパネル */}
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <span className="text-xs font-bold text-slate-700 block mb-1 flex items-center space-x-1">
                      <span className="inline-block h-3.5 w-1 bg-blue-700"></span>
                      <span>よくあるケースを読み込む</span>
                    </span>
                    <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                      入力の参考になる代表的なケースを読み込めます。選択後も各項目は自由に変更できます。
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {[
                        {
                          key: 'A' as const,
                          title: '60歳退職・65歳まで再雇用',
                          desc: '60歳で会社退職金を受け取り、65歳まで働くケース'
                        },
                        {
                          key: 'B' as const,
                          title: '60歳退職・DCも同時受取',
                          desc: '会社退職金とDC/iDeCoを同じ年に一時金で受け取るケース'
                        },
                        {
                          key: 'D' as const,
                          title: '早期退職・再就職あり',
                          desc: '60歳前に退職金を受け取り、その後も働くケース'
                        },
                        {
                          key: 'C' as const,
                          title: '65歳退職・年金開始と同時期',
                          desc: '65歳で退職金を受け取り、公的年金の開始時期と重なるケース'
                        }
                      ].map((presetItem) => {
                        const isSelected = activePreset === presetItem.key;
                        return (
                          <button
                            key={presetItem.key}
                            type="button"
                            onClick={() => applyTestPreset(presetItem.key)}
                            className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-full ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-[11px] font-bold ${isSelected ? 'text-blue-800' : 'text-slate-800'}`}>
                                  {presetItem.title}
                                </span>
                                {isSelected && (
                                  <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.25 rounded font-bold">
                                    選択中
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 leading-relaxed">
                                {presetItem.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>

        {/* ==================== 右カラム: タブ切り替え & 結果表示 (8/12) ==================== */}
        <div className="lg:col-span-8 space-y-6 min-w-0" id="result-column">
          
          {/* Tab Header */}
          <div className="border-b border-slate-200/80">
            <nav className="-mb-px flex flex-wrap gap-x-6 sm:gap-x-8 overflow-x-visible" aria-label="Tabs">
              {[
                { id: 'summary', name: '受取プラン', icon: MapPin },
                { id: 'deduction', name: '計算内訳', icon: ReceiptText },
                { id: 'assumptions', name: '計算根拠', icon: BookOpenCheck }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-2 py-4 text-sm font-bold transition-colors ${
                      isActive
                        ? 'border-[#002D62] text-[#002D62]'
                        : 'border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    }`}
                    id={`tab-btn-${tab.id}`}
                  >
                    <TabIcon className={`h-4 w-4 ${isActive ? 'text-[#2F6FED]' : 'opacity-60'}`} />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Contents */}
          {/* ==================== 1. 受取プラン (Summary & Comparison Combined) ==================== */}
          {activeTab === 'summary' && (() => {
            const compRet = inputs.companyRetirementEstimate;
            const companyDeduction = results.companyRetirementDeduction;
            const sameYearDeduction = results.combinedAdjustedDeduction;
            const dcTotal = results.dcIdecoTotal;
            const isSameYearReceipt = inputs.companyRetirementAge === inputs.dcIdecoReceiptAge;
            const availableDcDeduction = isSameYearReceipt
              ? Math.max(0, sameYearDeduction - compRet)
              : results.dcIdecoAdjustedDeduction;
            const excessAmount = Math.max(0, dcTotal - availableDcDeduction);
            const summaryTitle = results.summaryTitle;
            const summaryText = results.summaryText;
            const companyTaxSummary = calculateCompanyRetirementTaxSummary(
              compRet,
              companyDeduction
            );

            // 動的な今回の確認ポイント (3つに厳選・インライン背景)
            const point1 = results.isCompanyRetirementExcess ? (
              <span>
                会社退職金（<span className="bg-blue-50 text-blue-900 border border-blue-100 px-1 py-0.5 rounded font-bold">{compRet.toLocaleString()}万円</span>）は、会社退職金単体の退職所得控除（<span className="bg-blue-50 text-blue-900 border border-blue-100 px-1 py-0.5 rounded font-bold">{companyDeduction.toLocaleString()}万円</span>）を超える見込みです。
              </span>
            ) : (
              <span>
                会社退職金（<span className="bg-blue-50 text-blue-900 border border-blue-100 px-1 py-0.5 rounded font-bold">{compRet.toLocaleString()}万円</span>）は、会社退職金単体の退職所得控除（<span className="bg-blue-50 text-blue-900 border border-blue-100 px-1 py-0.5 rounded font-bold">{companyDeduction.toLocaleString()}万円</span>）の範囲内に収まる見込みです。
              </span>
            );

            let point2 = null;
            if (results.isCompanyRetirementExcess) {
              point2 = (
                <span>
                  会社退職金のみで控除額を超えています。DC/iDeCo一時金は、{isSameYearReceipt ? '同年分として会社退職金と合算' : '受取年ごとの調整後控除額で別に計算'}します。
                </span>
              );
            } else if (dcTotal <= availableDcDeduction) {
              point2 = (
                <span>
                  DC/iDeCoの想定残高（<span className="bg-blue-50 text-blue-900 border border-blue-100 px-1 py-0.5 rounded font-bold">{dcTotal.toLocaleString()}万円</span>）は、{isSameYearReceipt ? '同年受取の控除残額' : '受取順序を反映した控除額'}（<span className="bg-blue-50 text-blue-900 border border-blue-100 px-1 py-0.5 rounded font-bold">{availableDcDeduction.toLocaleString()}万円</span>）に収まる目安です。
                </span>
              );
            } else {
              point2 = (
                <span>
                  DC/iDeCoを全額一時金で受け取ると、{isSameYearReceipt ? '同年受取の控除残額' : '受取順序を反映した控除額'}（<span className="bg-blue-50 text-blue-900 border border-blue-100 px-1 py-0.5 rounded font-bold">{availableDcDeduction.toLocaleString()}万円</span>）を <span className="bg-amber-50 text-amber-950 border border-amber-200 px-1 py-0.5 rounded font-bold">{excessAmount.toLocaleString()}万円</span> 超え、その2分の1が課税退職所得となる計算です。
                </span>
              );
            }

            const point3 = (
              <span>
                働き終える年に受け取るかどうかは、給与収入が終わる時期と生活費の切り替わりを見ながら確認すると整理しやすくなります。
              </span>
            );

            return (
              <div className="flex flex-col gap-8 animate-fadeIn" id="tab-summary-content">
                
                {/* 1. 会社退職金の課税関係 */}
                <div
                  className="compass-panel p-5 sm:p-6"
                  data-testid="company-retirement-tax-overview"
                >
                  <div className="border-b border-slate-200 pb-4">
                    <h3 className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1D4ED8]"></span>
                      <span>1. まず会社退職金の課税関係</span>
                    </h3>
                    <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-600">
                      DC・iDeCoの受取時期を比べる前に、会社退職金の額面から退職所得控除、課税退職所得、概算税額までを順番に確認します。
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <span className="block text-[10px] font-bold text-slate-500">会社退職金の額面</span>
                      <span className="mt-1.5 block text-xl font-extrabold text-[#002D62]">
                        {formatManYenAmount(compRet)}万円
                      </span>
                      <span className="mt-1 block text-[10px] text-slate-400">
                        想定勤続年数：{serviceYears}年
                      </span>
                    </div>

                    <div className="rounded-lg border border-blue-100 bg-blue-50/45 p-4">
                      <span className="block text-[10px] font-bold text-slate-500">今回使える退職所得控除</span>
                      <span className="mt-1.5 block text-xl font-extrabold text-blue-900">
                        {formatManYenAmount(companyDeduction)}万円
                      </span>
                      <span className="mt-1 block text-[10px] text-slate-500">
                        調整前 {formatManYenAmount(results.companyOriginalDeduction)}万円
                        {results.companyReductionAmount > 0
                          ? ` − 重複調整 ${formatManYenAmount(results.companyReductionAmount)}万円`
                          : '（重複調整なし）'}
                      </span>
                    </div>

                    <div className={`rounded-lg border p-4 ${
                      companyTaxSummary.excessAmount > 0
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-emerald-200 bg-emerald-50'
                    }`}>
                      <span className="block text-[10px] font-bold text-slate-500">控除を超える額</span>
                      <span className={`mt-1.5 block text-xl font-extrabold ${
                        companyTaxSummary.excessAmount > 0 ? 'text-amber-950' : 'text-emerald-800'
                      }`}>
                        {formatManYenAmount(companyTaxSummary.excessAmount)}万円
                      </span>
                      <span className="mt-1 block text-[10px] text-slate-500">
                        額面 − 調整後控除
                      </span>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                      <span className="block text-[10px] font-bold text-slate-500">課税退職所得の目安</span>
                      <span className="mt-1.5 block text-xl font-extrabold text-slate-900">
                        {formatManYenAmount(companyTaxSummary.taxableRetirementIncome)}万円
                      </span>
                      <span className="mt-1 block text-[10px] text-slate-500">
                        控除超過額 × 1/2
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                      <h4 className="text-xs font-bold text-[#002D62]">計算の流れ</h4>
                      <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs leading-relaxed text-slate-700">
                        <span className="rounded bg-white px-2 py-1 font-bold">{formatManYenAmount(compRet)}万円</span>
                        <span>−</span>
                        <span className="rounded bg-blue-50 px-2 py-1 font-bold text-blue-900">{formatManYenAmount(companyDeduction)}万円</span>
                        <span>＝</span>
                        <span className="rounded bg-amber-50 px-2 py-1 font-bold text-amber-900">{formatManYenAmount(companyTaxSummary.excessAmount)}万円</span>
                        <span>× 1/2 ＝</span>
                        <span className="rounded bg-white px-2 py-1 font-extrabold text-[#002D62]">{formatManYenAmount(companyTaxSummary.taxableRetirementIncome)}万円</span>
                      </div>
                      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                        一般退職手当等として、控除を超える額の2分の1を課税退職所得とする概算です。
                      </p>
                    </div>

                    <div className="rounded-lg border border-[#B8CDF6] bg-[#F3F7FF] p-4">
                      <div className="flex items-center justify-between gap-3 border-b border-blue-100 pb-2">
                        <span className="text-xs font-bold text-slate-600">会社退職金単体の概算税額</span>
                        <span className="text-lg font-extrabold text-[#002D62]">
                          {pastLumpSumInconsistency.hasInconsistency
                            ? '要確認'
                            : `${formatManYenAmount(companyTaxSummary.estimatedTax)}万円`}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-slate-600">概算手取り</span>
                        <span className="text-lg font-extrabold text-blue-700">
                          {pastLumpSumInconsistency.hasInconsistency
                            ? '要確認'
                            : `${formatManYenAmount(companyTaxSummary.estimatedNetAmount)}万円`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-[11px] leading-relaxed text-slate-600">
                    <p className="font-bold text-[#002D62]">この結果の読み方</p>
                    <p className="mt-1.5">
                      {isSameYearReceipt
                        ? '上記は会社退職金だけを先に切り分けた基準です。同じ年にDC・iDeCo一時金も受け取る場合は、この税額を単純に足さず、同年の一時金を合算して下の受取プランで再計算します。'
                        : 'DC・iDeCoを別の年に受け取る場合、会社退職金側はこの単体計算を起点とし、DC・iDeCo側は受取年の調整後控除額で別に確認します。'}
                    </p>
                    <p className="mt-1.5 text-slate-500">
                      概算税額は所得税・復興特別所得税・住民税の簡易合計です。勤続5年以下の短期退職手当等、特定役員退職手当等、障害退職、退職所得の受給に関する申告書を提出しない場合などは扱いが異なるため、個別に確認します。
                    </p>
                  </div>
                </div>

                {/* 2. DC/iDeCoをいつ受け取るか */}
                <div className="compass-panel p-5 sm:p-6">
                  <div className="border-b border-slate-200 pb-4">
                    <h3 className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1D4ED8]"></span>
                      <span>2. いつ受け取るか / 会社退職後のDC・iDeCo</span>
                    </h3>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-600">
                      会社退職時に掛金を止める場合と、月額掛金を続ける場合を、受取年齢ごとに比較します。時期を選んだ後、その下で一時金・年金・併用を確認します。
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 rounded-lg border border-blue-100 bg-blue-50/45 p-4 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold text-slate-500">退職時点の比較基準残高</span>
                      <span className="relative block">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={timingBaseBalance}
                          onChange={(event) => setTimingBaseBalance(Math.max(0, Number(event.target.value) || 0))}
                          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm font-bold text-[#002D62] focus:border-blue-500 focus:outline-none"
                          id="dc-timing-base-balance-input"
                        />
                        <span className="pointer-events-none absolute right-3 top-2.5 text-[10px] text-slate-400">万円</span>
                      </span>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold text-slate-500">継続する掛金（月額）</span>
                      <span className="relative block">
                        <input
                          type="number"
                          min="0"
                          max="6.2"
                          step="0.1"
                          value={timingMonthlyContribution}
                          onChange={(event) => setTimingMonthlyContribution(Math.max(0, Number(event.target.value) || 0))}
                          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm font-bold text-[#002D62] focus:border-blue-500 focus:outline-none"
                          id="dc-timing-monthly-contribution-input"
                        />
                        <span className="pointer-events-none absolute right-3 top-2.5 text-[10px] text-slate-400">万円</span>
                      </span>
                      <span className="mt-1 block text-[9px] text-slate-500">
                        {Math.round(timingMonthlyContribution * 10000).toLocaleString()}円 / 月
                      </span>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold text-slate-500">比較用の想定運用率（年率）</span>
                      <span className="relative block">
                        <input
                          type="number"
                          min="-10"
                          max="20"
                          step="0.5"
                          value={timingAnnualReturn}
                          onChange={(event) => setTimingAnnualReturn(Number(event.target.value) || 0)}
                          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm font-bold text-[#002D62] focus:border-blue-500 focus:outline-none"
                          id="dc-timing-return-rate-input"
                        />
                        <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-slate-400">%</span>
                      </span>
                    </label>
                    <p className="sm:col-span-3 text-[10px] leading-relaxed text-slate-600">
                      各カードは、同じ受取年齢で「退職時に拠出終了」と「表示年齢まで掛金を継続」を比較します。75歳受取は70歳で拠出を終え、その後は運用だけを続ける計算です。
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {dcTimingComparison.map((item) => (
                      <article
                        key={item.receiptAge}
                        className={`flex min-w-0 flex-col rounded-lg border p-4 ${
                          item.isSelected
                            ? 'border-[#1D4ED8] bg-[#F4F8FF] shadow-sm'
                            : 'border-slate-200 bg-white'
                        }`}
                        id={`dc-timing-card-${item.receiptAge}`}
                      >
                        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-extrabold text-[#002D62]">{item.receiptAge}</span>
                              <span className="text-xs font-bold text-slate-500">歳受取</span>
                            </div>
                            <p className="mt-1 text-[10px] text-slate-500">
                              会社退職金から{item.yearsAfterCompanyRetirement === 0 ? '同年' : `${item.yearsAfterCompanyRetirement}年後`}
                            </p>
                          </div>
                          <span className={`rounded px-2 py-1 text-[9px] font-bold ${
                            item.isSelected
                              ? 'bg-[#1D4ED8] text-white'
                              : item.timingRule === 'outside-19-years'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.isSelected ? '現在設定' : item.timingRuleLabel}
                          </span>
                        </div>

                        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 text-[10px]">
                          <div>
                            <dt className="text-slate-400">追加掛金累計</dt>
                            <dd className="mt-0.5 text-sm font-bold text-[#002D62]">
                              {item.additionalContributions.toLocaleString()}万円
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">受取時の比較残高</dt>
                            <dd className="mt-0.5 text-sm font-bold text-[#002D62]">
                              {Math.round(item.projectedDcIdecoTotal).toLocaleString()}万円
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">通算加入期間</dt>
                            <dd className="mt-0.5 text-sm font-bold text-slate-700">
                              <span className="block">{item.serviceYears}年</span>
                              {item.serviceYearsIncrease > 0 && (
                                <span className="mt-0.5 block whitespace-nowrap text-[8px] font-medium leading-tight text-blue-700 sm:text-[9px]">
                                  【退職時終了比：{item.serviceYearsIncrease}年増】
                                </span>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">{item.deductionLabel}</dt>
                            <dd className="mt-0.5 text-sm font-bold text-[#002D62]">
                              <span className="block">{item.applicableDeduction.toLocaleString()}万円</span>
                              {item.deductionIncreaseFromRetirementEnd > 0 && (
                                <span className="mt-0.5 block whitespace-nowrap text-[8px] font-medium leading-tight text-blue-700 sm:text-[9px]">
                                  【退職時終了比：{item.deductionIncreaseFromRetirementEnd.toLocaleString()}万円増】
                                </span>
                              )}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
                          <div className="flex items-center justify-between gap-3 text-[10px]">
                            <span className="font-bold text-slate-500">概算税額（退職金と合計）</span>
                            <span className="text-right font-bold text-amber-800">
                              <span className="block">{item.estimatedTax.toLocaleString()}万円</span>
                              {item.taxDifferenceFromRetirementEnd !== 0 && (
                                <span className={`mt-0.5 block text-[9px] font-medium leading-tight ${
                                  item.taxDifferenceFromRetirementEnd < 0 ? 'text-blue-700' : 'text-amber-800'
                                }`}>
                                  【退職時終了比：
                                  {Math.abs(item.taxDifferenceFromRetirementEnd).toLocaleString()}万円
                                  {item.taxDifferenceFromRetirementEnd < 0 ? '減' : '増'}】
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-end justify-between gap-3">
                            <span className="text-[10px] font-bold text-slate-500">会社退職金＋DC手取り</span>
                            <span className="text-base font-extrabold text-[#002D62]">
                              {Math.round(item.totalNetAmount).toLocaleString()}万円
                            </span>
                          </div>
                          <p className="mt-1 text-right text-[10px] text-slate-500">
                            退職時に拠出終了した場合との差：
                            <span className={item.differenceFromRetirementEnd > 0 ? 'font-bold text-blue-700' : item.differenceFromRetirementEnd < 0 ? 'font-bold text-amber-800' : 'font-bold text-slate-600'}>
                              {Math.abs(Math.round(item.differenceFromRetirementEnd)).toLocaleString()}万円
                              {item.differenceFromRetirementEnd > 0 ? '増' : item.differenceFromRetirementEnd < 0 ? '減' : ''}
                            </span>
                            <span className="block text-[9px] text-slate-400">追加掛金を含む差額</span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => applyDcTimingCandidate(
                            item.receiptAge,
                            item.contributionEndAge,
                            item.projectedDcIdecoTotal
                          )}
                          disabled={item.isSelected}
                          className={`mt-4 min-h-9 rounded-md border px-3 text-[11px] font-bold transition-colors ${
                            item.isSelected
                              ? 'cursor-default border-blue-200 bg-blue-50 text-blue-700'
                              : 'cursor-pointer border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700'
                          }`}
                        >
                          {item.isSelected
                            ? '現在の入力条件'
                            : `${item.receiptAge}歳受取・${item.contributionEndAge}歳まで積立を反映`}
                        </button>
                      </article>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                      <h4 className="mb-2 flex items-center space-x-1.5 text-xs font-bold text-[#002D62]">
                        <Info className="h-4 w-4 text-[#1D4ED8]" />
                        <span>比較結果の読み方</span>
                      </h4>
                      <div className="space-y-2 text-[11px] leading-relaxed text-slate-700">
                        <p>
                          • 【退職時終了との比較】は、表示中の結果へ足す金額ではなく、同じ受取年齢で会社退職時に掛金を止めた場合との差です。
                        </p>
                        <p>
                          • 基準残高{timingBaseBalance.toLocaleString()}万円に、月額{timingMonthlyContribution.toLocaleString()}万円の掛金と年率{timingAnnualReturn}%の運用を反映しています。口座管理手数料や商品ごとの値動きは含みません。
                        </p>
                        <p>
                          • 控除額の増加がそのまま節税額になるわけではありません。概算税額の下段に、退職時に拠出を終える場合との税額差を表示しています。
                        </p>
                        <p>
                          • 掛金拠出時の所得控除による税負担差は、この受取時期比較には含めていません。
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                      <h4 className="mb-2 flex items-center space-x-1.5 text-xs font-bold text-[#002D62]">
                        <Calendar className="h-4 w-4 text-[#1D4ED8]" />
                        <span>時期を決める確認ポイント</span>
                      </h4>
                      <div className="space-y-2 text-[11px] leading-relaxed text-slate-700">
                        {dcTimingComparison.some((item) => item.receiptAge > inputs.companyRetirementAge) &&
                          dcTimingComparison
                            .filter((item) => item.receiptAge > inputs.companyRetirementAge)
                            .every((item) => item.timingRule === 'within-19-years') && (
                            <p>
                              • 今回並べた会社退職後の候補は、いずれも19年ルールの確認対象です。受取を65歳・70歳・75歳へ動かすだけで重複期間調整がなくなる比較ではありません。
                            </p>
                          )}
                        <p>
                          • 退職直後の生活資金、働き終える年齢、公的年金の開始時期、運用を続ける期間を並べて確認します。
                        </p>
                        <p>
                          • 実際に選べる受取時期や受取方法は、通算加入者等期間と加入先の規約・商品内容も確認します。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="mb-2 flex items-center space-x-1.5 text-xs font-bold text-[#002D62]">
                      <Lightbulb className="h-4 w-4 text-[#2F6FED]" />
                      <span>現在設定の確認メモ</span>
                    </h4>
                    <div className="space-y-2">
                      {buildDcIdecoGuidance(
                        inputs,
                        results.dcIdecoTotal,
                        results.companyRetirementDeduction,
                        results.combinedAdjustedDeduction,
                        results.dcIdecoAdjustedDeduction
                      ).slice(0, 2).map((adv, idx) => (
                        <div key={idx} className="flex items-start space-x-1.5 text-[11px] text-slate-700 leading-relaxed">
                          <span className="text-[#1D4ED8] mt-1 shrink-0">•</span>
                          <span>{adv}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="compass-panel p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/60 pb-4 mb-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1D4ED8]"></span>
                      <span>3. どう受け取るか / 一時金・年金・併用の比較</span>
                    </h3>
                    <p className="text-xs text-[#002D62] mt-1.5 sm:mt-0 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg">
                      DC・iDeCo総額: <span className="font-extrabold">{results.dcIdecoTotal}万円</span>
                    </p>
                  </div>

                  {/* 過去一時金不整合時の確認アラート */}
                  {pastLumpSumInconsistency.hasInconsistency && (
                    <div className="mb-6 bg-amber-50/80 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 flex items-start space-x-3 animate-fadeIn">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-amber-950">入力整合性の確認ポイント（要確認）</span>
                        <p className="mt-1 leading-relaxed text-amber-800 font-medium">
                          登録された過去一時金の対象期間に不整合（受取年月より後の期間が設定されているなど）があるため、以下の各プランの計算結果は断定せず「要確認」としています。入力内容をご確認いただくか、FP説明メモ内の解説ポイントをご確認ください。
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 3つの比較カード */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                    {/* カード1: 全額一時金 */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                          <span className="text-sm font-bold text-slate-800">1. 全額一時金受取</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">一括受取</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed mb-4">
                          DC・iDeCoをすべて一時金として受け取ります。{results.lumpSumScenario.sameYearReceipt ? '会社退職金と同年分として合算します。' : '会社退職金とDC/iDeCoを受取年ごとに計算します。'}
                        </p>
                        <div className="bg-slate-50/50 p-3 rounded-xl text-xs space-y-2 mb-4 border border-slate-100">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">額面合計:</span>
                            <span className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded font-bold text-xs">{results.lumpSumScenario.totalAmount}万円</span>
                          </div>
                          <div className="flex justify-between items-center text-blue-900">
                            <span className="text-slate-500 font-medium">概算税額:</span>
                            <span className="bg-amber-50 text-amber-950 border border-amber-200 px-2 py-0.5 rounded font-bold text-xs">
                              {pastLumpSumInconsistency.hasInconsistency ? '要確認' : `${results.lumpSumScenario.estimatedTax}万円`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 pt-3 mt-3">
                        <div className="flex justify-between items-baseline">
                           <span className="text-xs text-slate-500 font-medium">概算手取り:</span>
                          {pastLumpSumInconsistency.hasInconsistency ? (
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">要確認</span>
                          ) : (
                            <span className="text-base font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">{Math.round(results.lumpSumScenario.netAmount)}万円</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* カード2: 一時金・年金の配分例 */}
                    <div className="relative flex flex-col justify-between overflow-hidden rounded-lg border-2 border-[#1D4ED8] bg-blue-50/35 p-5 shadow-sm">
                      <div className="absolute top-0 right-0 bg-[#1D4ED8] text-white text-[9px] font-extrabold px-2.5 py-1 rounded-bl-xl tracking-wider">
                        併用プラン例
                      </div>
                      <div>
                        <div className="flex items-center justify-between border-b border-blue-100 pb-3 mb-3">
                          <span className="text-sm font-extrabold text-[#002D62]">2. 一時金・年金の配分例</span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-extrabold">併用プラン</span>
                        </div>
                        <p className="text-xs text-[#002D62] leading-relaxed mb-4 font-medium">
                          DC/iDeCoのうち調整後控除額までを一時金、残りを10年年金とした場合を比較します。
                        </p>
                        <div className="bg-white p-3 rounded-xl text-xs space-y-2 mb-4 border border-blue-100 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">一時金部分:</span>
                            <span className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded font-extrabold text-xs">{results.hybridScenario.lumpSumRatio}% ({results.hybridScenario.lumpSumAmount}万円)</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">年金部分:</span>
                            <span className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded font-extrabold text-xs">{results.hybridScenario.pensionRatio}% ({results.hybridScenario.annualPensionAmount}万/年)</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-blue-100 pt-3 mt-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-slate-500 font-medium">10年累計:</span>
                          {pastLumpSumInconsistency.hasInconsistency ? (
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">要確認</span>
                          ) : (
                            <span className="text-base font-bold text-blue-800 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">{Math.round(results.hybridScenario.cumulativeNetWithCompanyRetirement)}万円</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* カード3: 任意プラン */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                          <span className="text-sm font-bold text-slate-800">3. 任意プラン</span>
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">カスタム</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed mb-4">
                          一時金として受け取る金額をスライダーで自由にシミュレーションできます。
                        </p>
                        
                        {/* 任意プランスライダー調整 */}
                        <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-100 space-y-2 mb-4">
                          <div className="flex items-center justify-between text-xs text-amber-900">
                            <span className="font-semibold">一時金受取額:</span>
                            <span className="bg-amber-50 text-amber-950 border border-amber-200 px-2 py-0.5 rounded font-bold">{customLumpSum}万円</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={results.dcIdecoTotal}
                            step="10"
                            value={customLumpSum}
                            onChange={(e) => setCustomLumpSum(Number(e.target.value))}
                            className="w-full accent-amber-600 h-1.5 bg-amber-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                            <span>0万</span>
                            <span>年金: <span className="bg-blue-50 text-blue-900 px-1 py-0.5 rounded font-bold">{results.dcIdecoTotal - customLumpSum}万</span></span>
                            <span>{results.dcIdecoTotal}万</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 pt-3 mt-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-slate-500 font-medium">10年累計:</span>
                          {pastLumpSumInconsistency.hasInconsistency ? (
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">要確認</span>
                          ) : (
                            <span className="text-base font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">{Math.round(customScenarioResult.cumulativeNetWithCompanyRetirement)}万円</span>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* 棒グラフによる手取り額比較 */}
                  <div className="mt-8 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <h4 className="text-xs font-bold text-[#002D62] tracking-wider mb-4 flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-[#1D4ED8]" />
                      <span>各受取プランの総手取り額と想定控除内・外比率 (万円)</span>
                    </h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer key={activeTab} width="100%" height={256}>
                        <BarChart
                          data={chartData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                          <Tooltip
                            formatter={(value: any) => [`${value}万円`, '']}
                            contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="手取り総額" stackId="a" fill="#002D62" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => {
                              if (entry.name === '任意プラン') {
                                return <Cell key={`cell-${index}`} fill="#d97706" />;
                              }
                              return <Cell key={`cell-${index}`} fill="#002D62" />;
                            })}
                          </Bar>
                          <Bar dataKey="概算税額等" stackId="a" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center space-x-6 text-[10px] text-slate-500 mt-4 border-t border-slate-100 pt-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-3 h-3 bg-[#002D62] inline-block rounded"></span>
                        <span>標準手取り額 (万円)</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-3 h-3 bg-amber-600 inline-block rounded"></span>
                        <span>任意手取り額 (万円)</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-3 h-3 bg-slate-200 inline-block rounded"></span>
                        <span>概算税額・社会保険料等 (万円)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start space-x-2 rounded-lg border border-blue-100/60 bg-blue-50/50 p-4 text-xs leading-relaxed text-slate-600">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]" />
                    <div>
                      <span className="font-bold text-[#002D62]">簡易税額等モデルについて:</span> 
                      <p className="mt-1">
                        DC/iDeCoを年金で分割受給する場合、公的年金等控除を反映し、年金部分の10%を社会保険料の概算として手取り額と所得控除に反映します。他の年金収入と合算し、10年間の累積手取り目安を比較しています。
                      </p>
                    </div>
                  </div>

                </div>

                {/* 4. 退職所得全体の整理 */}
                <div className="compass-panel p-5 sm:p-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1D4ED8]"></span>
                    <span>4. 退職所得全体の整理</span>
                  </h3>

                  {/* 最重要の結論を大きく表示 */}
                  <div className="relative mb-6 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60 p-5">
                    {/* Tiny watermark */}
                    <div className="absolute right-3 top-3 opacity-10">
                      <Compass className="h-20 w-20 text-[#002D62]" />
                    </div>

                    <div className="relative flex items-start space-x-4">
                      <div className="shrink-0 rounded-md bg-blue-50 p-2 text-[#1D4ED8]">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-base sm:text-lg font-extrabold text-[#002D62] leading-snug">{summaryTitle}</h4>
                        <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">{summaryText}</p>
                      </div>
                    </div>

                    {/* 重要な数字を3つの小カードで表示 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-200/60">
                      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm text-center">
                        <div className="text-[10px] font-bold text-slate-400 tracking-wider">{isSameYearReceipt ? '同年受取の控除残額' : 'DC一時金の調整後控除額'}</div>
                        <div className="text-lg sm:text-xl font-extrabold text-[#002D62] mt-1.5">
                          {availableDcDeduction.toLocaleString()}万円
                        </div>
                      </div>
                      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm text-center">
                        <div className="text-[10px] font-bold text-slate-400 tracking-wider">企業型DC/iDeCo合計</div>
                        <div className="text-lg sm:text-xl font-extrabold text-[#002D62] mt-1.5">
                          {dcTotal.toLocaleString()}万円
                        </div>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                        <div className="text-[10px] font-bold text-amber-800 tracking-wider">控除を超える可能性がある額</div>
                        <div className="text-lg sm:text-xl font-extrabold text-amber-950 mt-1.5">
                          {excessAmount.toLocaleString()}万円
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 tracking-wider uppercase mb-2">確認・判断のポイント:</h4>
                    {[point1, point2, point3].map((pointElement, idx) => (
                      <div key={idx} className="flex items-start space-x-3 text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/50 hover:bg-slate-50 p-3 rounded-xl transition-all border border-slate-100">
                        <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#1D4ED8]" />
                        <span>{pointElement}</span>
                      </div>
                    ))}
                  </div>

                  {results.pastLumpSumAnalysis.hasImpact && (
                    <div className="mt-5 p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start space-x-2.5">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed font-medium">{results.pastLumpSumAnalysis.statusMessage}</p>
                    </div>
                  )}
                  {results.dcIdecoPastLumpSumAnalysis.hasImpact && (
                    <div className="mt-5 p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start space-x-2.5">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed font-medium">{results.dcIdecoPastLumpSumAnalysis.statusMessage}</p>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          {/* ==================== 2. 計算の内訳 (Deduction Framework Details) ==================== */}
          {activeTab === 'deduction' && (
            <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-fadeIn" id="tab-deduction-content">
              {pastLumpSumInconsistency.hasInconsistency && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 space-y-1.5 animate-fadeIn">
                  <span className="font-bold flex items-center space-x-1.5 text-amber-800">
                    <AlertCircle className="h-4.5 w-4.5" />
                    <span>入力整合性の確認ポイント（要確認）</span>
                  </span>
                  <p className="leading-relaxed">
                    過去一時金の入力内容に不整合があるため、以下に表示される控除額や重複期間は目安としてご覧ください。入力内容をご確認ください。
                  </p>
                </div>
              )}

              {/* Section 1: 今回の控除枠の使い方 */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                  <span className="inline-block h-3.5 w-1 bg-blue-700"></span>
                  <span>1. 今回の控除枠の使い方</span>
                </h3>

                {/* 退職所得控除の計算内訳 */}
                <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <span className="flex items-center border-b pb-1.5 text-xs font-bold text-slate-800">
                    <ReceiptText className="mr-1.5 h-4 w-4 text-[#2F6FED]" />
                    退職所得控除の計算内訳
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* 左：会社退職金控除内訳 */}
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-2">
                      <div className="font-bold text-slate-700 pb-1 border-b border-slate-200">
                        【会社退職金】
                      </div>
                      <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                        <span className="text-slate-500">今回の会社退職金の控除額</span>
                        <span className="font-semibold text-slate-700">
                          {results.companyOriginalDeduction.toLocaleString()}万円
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                        <span className="text-slate-500">過去退職金等との重複で差し引かれる額</span>
                        <span className="font-semibold text-red-600">
                          {results.companyReductionAmount > 0 ? `-${results.companyReductionAmount.toLocaleString()}万円` : '0万円'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 font-bold text-slate-800 bg-blue-50/50 px-1.5 rounded mt-1">
                        <span>今回会社退職金で使える控除額 (重複調整後)</span>
                        <span className="text-blue-900 font-extrabold">
                          {results.companyRetirementDeduction.toLocaleString()}万円
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block pt-0.5">
                        ※ 想定勤続年数: {serviceYears}年
                      </span>
                    </div>

                    {/* 右：DC/iDeCo控除内訳 */}
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-2">
                      <div className="font-bold text-slate-700 pb-1 border-b border-slate-200">
                        【DC / iDeCo】
                      </div>
                      <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                        <span className="text-slate-500">DC/iDeCoの通算加入期間による控除額</span>
                        <span className="font-semibold text-slate-700">
                          {results.dcIdecoOriginalDeduction.toLocaleString()}万円
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                        <span className="text-slate-500">過去退職金との重複期間で差し引かれる控除額</span>
                        <span className="font-semibold text-red-600">
                          {results.dcIdecoReductionAmount > 0 ? `-${results.dcIdecoReductionAmount.toLocaleString()}万円` : '0万円'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 font-bold text-slate-800 bg-indigo-50/50 px-1.5 rounded mt-1">
                        <span>今回DC/iDeCoで使える控除額</span>
                        <span className="text-indigo-900 font-extrabold">
                          {results.dcIdecoAdjustedDeduction.toLocaleString()}万円
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block pt-0.5">
                        ※ 通算加入期間: {dcServiceYears}年
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  {/* カード1: 会社退職金用の控除額 */}
                  <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-500 block">会社退職金用の控除枠</span>
                    <span className="text-lg font-extrabold text-blue-900 mt-2 block">
                      {results.companyRetirementDeduction.toLocaleString()}万円
                    </span>
                  </div>

                  {/* カード2: DC/iDeCo用の控除額 */}
                  <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-500 block">DC/iDeCo用の控除枠</span>
                    <span className="text-lg font-extrabold text-indigo-900 mt-2 block">
                      {results.dcIdecoDeduction.toLocaleString()}万円
                    </span>
                  </div>
                  
                  {/* カード3: 会社退職金 */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-500 block">会社退職金</span>
                    <span className="text-lg font-extrabold text-slate-800 mt-2 block">
                      {inputs.companyRetirementEstimate.toLocaleString()}万円
                    </span>
                  </div>
                  
                  {/* カード4: 収まり状況 */}
                  {inputs.companyRetirementEstimate <= results.companyRetirementDeduction ? (
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex flex-col justify-between ring-1 ring-emerald-300">
                      <span className="text-xs font-bold text-emerald-800 block">会社退職金単体の控除残額</span>
                      <span className="text-lg font-extrabold text-emerald-800 mt-2 block">
                        {Math.max(0, results.companyRetirementDeduction - inputs.companyRetirementEstimate).toLocaleString()}万円
                      </span>
                    </div>
                  ) : (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex flex-col justify-between">
                      <span className="text-xs font-bold text-amber-800 block">控除を超える額</span>
                      <span className="text-lg font-extrabold text-amber-800 mt-2 block">
                        {Math.max(0, inputs.companyRetirementEstimate - results.companyRetirementDeduction).toLocaleString()}万円
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                  {inputs.companyRetirementEstimate <= results.companyRetirementDeduction ? (
                    "会社退職金は、会社退職金単体の控除内に収まる目安です。同じ年にDC/iDeCoも受け取る場合は、次の合算控除額で改めて確認します。"
                  ) : (
                    "会社退職金は、会社退職金単体の控除額を超える目安です。同じ年にDC/iDeCoも受け取る場合は、次の合算控除額で課税対象の目安を確認します。"
                  )}
                  <span className="block mt-1 font-semibold text-amber-800">
                    ※ 過去の退職金等で使わなかった控除枠を、次回の退職金やDCの計算に持ち越せるわけではありません。それぞれの退職所得控除は、各受取時の条件に応じて独立して、または合算調整されて適用されます。
                  </span>
                </p>
              </div>

              {/* Section 2: DC/iDeCoを同じ年に一時金で受け取る場合 */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5 border-b pb-2">
                  <span>2. {results.lumpSumScenario.sameYearReceipt ? '同じ年に一時金で受け取る場合' : '受取年を分けて一時金で受け取る場合'} (目安)</span>
                </h3>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">会社退職金</span>
                    <span className="font-bold text-slate-800">{inputs.companyRetirementEstimate.toLocaleString()}万円</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">DC/iDeCo一時金</span>
                    <span className="font-bold text-slate-800">{results.dcIdecoTotal.toLocaleString()}万円</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 bg-slate-50 px-2 rounded">
                    <span className="text-slate-700 font-bold">合計</span>
                    <span className="font-bold text-slate-900">{(inputs.companyRetirementEstimate + results.dcIdecoTotal).toLocaleString()}万円</span>
                  </div>
                  {results.lumpSumScenario.sameYearReceipt ? (
                    <>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">重複調整前の合算控除額</span>
                        <span className="font-bold text-slate-800">{results.combinedOriginalDeduction.toLocaleString()}万円</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">過去一時金との重複で差し引かれる額</span>
                        <span className="font-bold text-red-600">
                          {results.combinedReductionAmount > 0 ? `-${results.combinedReductionAmount.toLocaleString()}万円` : '0万円'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">退職所得控除 (合算・重複調整後)</span>
                        <span className="font-bold text-slate-800">{results.lumpSumScenario.deductionLimit.toLocaleString()}万円</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">会社退職金の調整後控除額</span>
                        <span className="font-bold text-slate-800">{results.lumpSumScenario.companyDeductionLimit.toLocaleString()}万円</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">DC/iDeCo一時金の調整後控除額</span>
                        <span className="font-bold text-slate-800">{results.lumpSumScenario.dcIdecoDeductionLimit.toLocaleString()}万円</span>
                      </div>
                    </>
                  )}
                  
                  {(() => {
                    const sumLumpSum = inputs.companyRetirementEstimate + results.dcIdecoTotal;
                    const excess = Math.max(0, sumLumpSum - results.lumpSumScenario.deductionLimit);
                    const taxable = Math.max(0, excess * 0.5);
                    return (
                      <>
                        <div className={`flex justify-between py-2 border-b border-slate-100 px-2 rounded ${excess > 0 ? 'bg-amber-50 text-amber-900 font-bold' : 'bg-blue-50 text-blue-900'}`}>
                          <span>控除を超える額</span>
                          <span className="font-bold">{excess.toLocaleString()}万円</span>
                        </div>
                        <div className="flex justify-between py-2.5 border-b border-slate-200 px-2 rounded bg-blue-50/50 font-bold">
                          <span className="text-blue-900">退職所得の課税対象目安</span>
                          <span className="text-sm font-bold text-blue-900">{taxable.toLocaleString()}万円</span>
                        </div>
                        
                        <div className="mt-2.5 bg-slate-50 p-3 rounded-lg text-[10px] text-slate-500 space-y-1 font-mono">
                          <div>【計算式】</div>
                          <div>
                            {results.lumpSumScenario.sameYearReceipt
                              ? `${sumLumpSum.toLocaleString()}万円 - ${results.lumpSumScenario.deductionLimit.toLocaleString()}万円 = ${excess.toLocaleString()}万円`
                              : `会社退職金の超過額 ${Math.max(0, inputs.companyRetirementEstimate - results.lumpSumScenario.companyDeductionLimit).toLocaleString()}万円 + DC/iDeCoの超過額 ${Math.max(0, results.dcIdecoTotal - results.lumpSumScenario.dcIdecoDeductionLimit).toLocaleString()}万円 = ${excess.toLocaleString()}万円`}
                          </div>
                          {excess > 0 && (
                            <div>
                              {excess.toLocaleString()}万円 × 1/2 = {taxable.toLocaleString()}万円
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Section 3: 一時金・年金の配分例 */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5 border-b pb-2">
                  <span>3. 一時金・年金の配分例 (目安)</span>
                </h3>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">DC/iDeCo合計</span>
                    <span className="font-bold text-slate-800">{results.dcIdecoTotal.toLocaleString()}万円</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">一時金にする部分</span>
                    <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      {results.hybridScenario.lumpSumAmount.toLocaleString()}万円
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">年金にする部分</span>
                    <span className="font-bold text-slate-800">
                      {(results.dcIdecoTotal - results.hybridScenario.lumpSumAmount).toLocaleString()}万円
                    </span>
                  </div>
                  
                  {(() => {
                    const remainingLimit = results.lumpSumScenario.sameYearReceipt
                      ? Math.max(0, results.combinedAdjustedDeduction - inputs.companyRetirementEstimate)
                      : results.dcIdecoAdjustedDeduction;
                    return (
                      <div className="mt-2.5 bg-slate-50 p-3 rounded-lg text-[10px] text-slate-500 space-y-1 font-mono">
                        <div>【計算式】</div>
                        <div>
                          DC/iDeCo合計 {results.dcIdecoTotal.toLocaleString()}万円 - {results.lumpSumScenario.sameYearReceipt ? '同年受取の控除残額' : 'DC一時金の調整後控除額'} {remainingLimit.toLocaleString()}万円 = 年金部分 {(results.dcIdecoTotal - results.hybridScenario.lumpSumAmount).toLocaleString()}万円
                        </div>
                      </div>
                    );
                  })()}
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    {results.lumpSumScenario.sameYearReceipt ? '同年受取の控除残額' : 'DC一時金の調整後控除額'}に収まる部分を一時金、超える部分を年金として分ける比較例です。
                  </p>
                </div>
              </div>

              {/* Section 4: 任意プランとの関係 */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5 border-b pb-2">
                  <span>4. 任意プランとの関係 (目安)</span>
                </h3>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">任意プランの一時金額</span>
                    <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{customLumpSum.toLocaleString()}万円</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{results.lumpSumScenario.sameYearReceipt ? '同年受取の控除残額' : 'DC一時金の調整後控除額'}</span>
                    <span className="font-bold text-slate-800">
                      {(results.lumpSumScenario.sameYearReceipt
                        ? Math.max(0, results.combinedAdjustedDeduction - inputs.companyRetirementEstimate)
                        : results.dcIdecoAdjustedDeduction
                      ).toLocaleString()}万円
                    </span>
                  </div>
                  
                  {(() => {
                    const remainingDeduction = results.lumpSumScenario.sameYearReceipt
                      ? Math.max(0, results.combinedAdjustedDeduction - inputs.companyRetirementEstimate)
                      : results.dcIdecoAdjustedDeduction;
                    const isExcess = customLumpSum > remainingDeduction;
                    const diff = isExcess ? customLumpSum - remainingDeduction : remainingDeduction - customLumpSum;
                    return (
                      <>
                        <div className={`flex justify-between py-2 border-b border-slate-100 px-2 rounded ${isExcess ? 'bg-amber-50 text-amber-900 font-bold' : 'bg-blue-50 text-blue-900'}`}>
                          <span>{isExcess ? '控除を超える部分' : '控除枠との差額'}</span>
                          <span>{diff.toLocaleString()}万円{isExcess ? '' : '余り'}</span>
                        </div>
                      </>
                    );
                  })()}
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    任意プランの一時金額を変えると、控除枠内に収まるかどうかも変わります。
                  </p>
                </div>
              </div>

              {/* Section 5: 過去の一時金・重なり期間の確認 */}
              <div className="bg-slate-100/60 p-4 rounded-xl border border-slate-200 space-y-2 text-[11px] text-slate-600">
                <div className="font-bold text-slate-700 mb-1">【確認ポイント】</div>
                <p className="leading-relaxed">
                  • DC/iDeCo一時金を先に受け取り、その後に会社退職金を受け取る場合、2026年1月1日以後の受取は10年ルールが関係する場合があります。
                </p>
                <p className="leading-relaxed">
                  • 会社退職金を先に受け取り、その後にDC/iDeCo一時金を受け取る場合は、19年ルールが関係する場合があります。
                </p>
                <p className="leading-relaxed">
                  • 制度改正前後の扱いに関する確認や、過去の一時金がある場合は支払通知書や源泉徴収票を確認してください。
                </p>
              </div>



              {/* Section 6: FP説明メモ */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 animate-fadeIn" id="fp-explanation-memo">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <ReceiptText className="h-4 w-4 text-[#2F6FED]" />
                    <span>FP説明メモ</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    入力前提から控除・課税の計算過程、重複期間の調整状況を整理した、受取プランの解説メモです。
                  </p>
                </div>

                {/* 1. 入力前提の確認 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-700"></span>
                    <span>1. 入力前提の確認</span>
                  </h4>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                    <p className="leading-relaxed">
                      • <span className="font-semibold text-slate-800">会社退職金:</span> 現職入社年月「<span className="font-bold text-blue-700 bg-blue-50 px-1 rounded">{inputs.joinedYearMonth || '要確認'}</span>」から会社退職金受取年月（想定: <span className="font-bold text-blue-700">{(() => {
                        const [birthY, birthM] = (inputs.birthYearMonth || '').split('-').map(Number);
                        if (!isNaN(birthY) && !isNaN(birthM)) {
                          const retireY = birthY + inputs.companyRetirementAge;
                          return `${retireY}年${String(birthM).padStart(2, '0')}月`;
                        }
                        return '要確認';
                      })()}</span>）までの勤続期間（想定勤続: <span className="font-bold text-blue-700 bg-blue-50 px-1 rounded">{serviceYears !== undefined ? `${serviceYears}年` : '要確認'}</span>）を前提とし、額面 <span className="font-bold text-blue-700">{inputs.companyRetirementEstimate ? `${inputs.companyRetirementEstimate.toLocaleString()}万円` : '0万円'}</span>（受取想定年齢: <span className="font-bold text-blue-700">{inputs.companyRetirementAge}歳</span>）として確認します。
                    </p>
                    <p className="leading-relaxed">
                      • <span className="font-semibold text-slate-800">DC / iDeCo:</span> 現職入社年月ではなく、通算加入期間「<span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded">{inputs.dcJoinedYearMonth || inputs.joinedYearMonth || '要確認'}</span> 〜 <span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded">{inputs.dcJoinedEndYearMonth || '要確認'}</span>」（<span className="font-bold text-indigo-700">{dcServiceYears}年</span>）で重複調整前の控除額を計算します。受取年月は別に、想定 <span className="font-bold text-indigo-700">{(() => {
                        const [birthY, birthM] = (inputs.birthYearMonth || '').split('-').map(Number);
                        if (!isNaN(birthY) && !isNaN(birthM)) {
                          const receiptY = birthY + inputs.dcIdecoReceiptAge;
                          return `${receiptY}年${String(birthM).padStart(2, '0')}月`;
                        }
                        return '要確認';
                      })()}</span>（<span className="font-bold text-indigo-700">{inputs.dcIdecoReceiptAge}歳</span>）、総額 <span className="font-bold text-indigo-700">{results.dcIdecoTotal ? `${results.dcIdecoTotal.toLocaleString()}万円` : '0万円'}</span>として確認します。加入終了後に受取を待つ期間は、通算加入期間へ加えていません。
                    </p>
                    <p className="leading-relaxed rounded-md border border-blue-100 bg-blue-50/60 p-2.5">
                      • <span className="font-semibold text-slate-800">受取時期比較:</span> 会社退職時点の比較基準残高
                      <span className="font-bold text-blue-700"> {timingBaseBalance.toLocaleString()}万円</span>、
                      継続掛金は月額
                      <span className="font-bold text-blue-700"> {timingMonthlyContribution.toLocaleString()}万円</span>
                      （{Math.round(timingMonthlyContribution * 10000).toLocaleString()}円）、
                      想定運用率は年率
                      <span className="font-bold text-blue-700"> {timingAnnualReturn}%</span>
                      です。同じ受取年齢で退職時に拠出を終える場合と比較し、控除額と概算税額の差を表示しています。
                    </p>
                    {dcContributionImpact.additionalServiceYears > 0 && (
                      <p className="leading-relaxed rounded-md border border-blue-100 bg-blue-50/60 p-2.5">
                        • <span className="font-semibold text-slate-800">退職後の掛金拠出:</span> 会社退職時で積立を終える場合より通算加入期間が
                        <span className="font-bold text-blue-700"> {dcContributionImpact.additionalServiceYears}年</span> 長い設定です。
                        重複調整前の控除額は
                        <span className="font-bold text-blue-700"> +{dcContributionImpact.originalDeductionIncrease.toLocaleString()}万円</span>、
                        重複期間調整後に今回使えるDC控除額は
                        <span className="font-bold text-blue-700"> +{dcContributionImpact.adjustedDeductionIncrease.toLocaleString()}万円</span>
                        となる計算です。
                      </p>
                    )}
                    <p className="leading-relaxed">
                      • <span className="font-semibold text-slate-800">過去の一時金履歴:</span>{' '}
                      {inputs.hasPastLumpSum === 'no' ? (
                        <span className="text-slate-500 font-medium">登録はありません。</span>
                      ) : inputs.hasPastLumpSum === 'unknown' ? (
                        <span className="text-amber-700 font-bold bg-amber-50 px-1 rounded">不明（詳細な履歴を確認後に整理します）</span>
                      ) : inputs.pastLumpSums && inputs.pastLumpSums.length > 0 ? (
                        <span className="text-slate-700">以下の通り登録されています：</span>
                      ) : (
                        <span className="text-amber-700 font-bold bg-amber-50 px-1 rounded">あり（詳細な登録は未設定のため要確認）</span>
                      )}
                    </p>
                    {inputs.hasPastLumpSum === 'yes' && inputs.pastLumpSums && inputs.pastLumpSums.length > 0 && (
                      <div className="mt-1.5 space-y-1.5">
                        {inputs.pastLumpSums.map((item) => (
                          <div key={item.id} className="ml-3 pl-2.5 border-l-2 border-slate-300 py-0.5 text-[11px] text-slate-600 animate-fadeIn">
                            - <span className="font-bold text-slate-700">{item.name || '過去退職金等'}</span>: <span className="font-bold text-amber-700">{item.receiveYearMonth ? `${item.receiveYearMonth.split('-')[0]}年${item.receiveYearMonth.split('-')[1]}月` : '受取月要確認'}</span>受取 / 金額 <span className="font-bold text-amber-700">{item.amount ? `${item.amount.toLocaleString()}万円` : '0万円'}</span> / 対象となった期間 (<span className="font-semibold text-slate-600">{item.joinStart ? `${item.joinStart.split('-')[0]}年${item.joinStart.split('-')[1]}月` : '要確認'}</span> 〜 <span className="font-semibold text-slate-600">{item.joinEnd ? `${item.joinEnd.split('-')[0]}年${item.joinEnd.split('-')[1]}月` : '要確認'}</span>)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. 退職所得控除の計算過程 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-700"></span>
                    <span>2. 退職所得控除の計算過程</span>
                  </h4>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2.5">
                    <p className="leading-relaxed">
                      • <span className="font-semibold text-slate-800">会社退職金側の控除額:</span>{' '}
                      勤続年数 <span className="font-bold text-blue-700 bg-blue-50 px-1 rounded">{serviceYears}年</span> に基づく控除額は{' '}
                      <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-sm">{results.companyOriginalDeduction.toLocaleString()}万円</span> です。
                      {results.companyReductionAmount > 0 && (
                        <span>（過去退職金等との重複期間調整により、実際の控除額は <strong className="text-red-600 font-bold bg-red-50 px-1 rounded">{results.companyRetirementDeduction.toLocaleString()}万円</strong> に減少します）</span>
                      )}
                    </p>
                    <p className="leading-relaxed">
                      • <span className="font-semibold text-slate-800">DC / iDeCo側の控除額:</span>{' '}
                      通算加入期間 <span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded">{dcServiceYears}年</span> に基づく重複調整前の控除額は{' '}
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">{results.dcIdecoOriginalDeduction.toLocaleString()}万円</span> です。
                      {results.dcIdecoReductionAmount > 0 && (
                        <span>（重複期間調整により、実際の控除額は <strong className="text-red-600 font-bold bg-red-50 px-1 rounded">{results.dcIdecoAdjustedDeduction.toLocaleString()}万円</strong> に減少します）</span>
                      )}
                    </p>
                    {dcContributionImpact.additionalServiceYears > 0 && (
                      <p className="leading-relaxed text-slate-600">
                        • 会社退職時に掛金拠出を終える条件では、重複調整前
                        <span className="font-bold text-slate-800"> {dcContributionImpact.retirementEndOriginalDeduction.toLocaleString()}万円</span>、
                        調整後
                        <span className="font-bold text-slate-800"> {dcContributionImpact.retirementEndAdjustedDeduction.toLocaleString()}万円</span>
                        です。現在の加入終了年月まで拠出を続ける条件では、重複調整前
                        <span className="font-bold text-indigo-700"> {dcContributionImpact.currentOriginalDeduction.toLocaleString()}万円</span>、
                        調整後
                        <span className="font-bold text-indigo-700"> {dcContributionImpact.currentAdjustedDeduction.toLocaleString()}万円</span>
                        として比較できます。
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. 重複期間調整の見方 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-700"></span>
                    <span>3. 重複期間調整の見方</span>
                  </h4>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                    {(() => {
                      const diffYears = Math.abs(inputs.companyRetirementAge - inputs.dcIdecoReceiptAge);
                      const isCompanyFirst = inputs.companyRetirementAge < inputs.dcIdecoReceiptAge;
                      const isDcFirst = inputs.companyRetirementAge > inputs.dcIdecoReceiptAge;
                      const isSameYear = inputs.companyRetirementAge === inputs.dcIdecoReceiptAge;

                      return (
                        <>
                          <p className="leading-relaxed font-semibold text-slate-800">
                            【受取時期の間隔：{isSameYear ? <span className="font-bold text-blue-700">同年受取</span> : <span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded">{diffYears}年あけるプラン</span>}】
                          </p>
                          {isCompanyFirst && (
                            <p className="leading-relaxed">
                              会社退職金を先に受け取り（<span className="font-bold text-blue-700">{inputs.companyRetirementAge}歳</span>）、その後DC/iDeCo一時金を受け取る（<span className="font-bold text-indigo-700">{inputs.dcIdecoReceiptAge}歳</span>）計画です。
                              この受取時期の差は <span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded">{diffYears}年</span> です。会社退職金を先に受け取る場合は、
                              <span className="font-semibold text-slate-800">「19年ルール」</span>の確認対象として扱います。
                            </p>
                          )}
                          {isDcFirst && (
                            <p className="leading-relaxed">
                              DC/iDeCo一時金を先に受け取り（<span className="font-bold text-indigo-700">{inputs.dcIdecoReceiptAge}歳</span>）、その後会社退職金を受け取る（<span className="font-bold text-blue-700">{inputs.companyRetirementAge}歳</span>）計画です。
                              この受取時期の差は <span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded">{diffYears}年</span> です。DC/iDeCo一時金を先に受け取る場合は、
                              <span className="font-semibold text-slate-800">「10年ルール」</span>（2026年1月1日以後の受取分）の確認対象として扱います。
                            </p>
                          )}
                          {isSameYear && (
                            <p className="leading-relaxed">
                              会社退職金とDC/iDeCo一時金を同じ年（<span className="font-bold text-blue-700">{inputs.companyRetirementAge}歳</span>）に受け取る計画です。
                              同年受領の扱いに基づき、加入・勤続期間の和集合をもとに算出した合算控除枠が適用されます。
                            </p>
                          )}
                        </>
                      );
                    })()}

                    {results.companyReductionAmount > 0 || results.dcIdecoReductionAmount > 0 ? (
                      <p className="leading-relaxed">
                        • 先に受け取る一時金または登録した過去の一時金と、後に受け取る退職金・DC/iDeCoの加入・勤続期間が重なっています。重複期間（<span className="font-bold text-red-600 bg-red-50 px-1 rounded">{results.pastLumpSumAnalysis.overlapYears || results.dcIdecoPastLumpSumAnalysis.overlapYears || 0}年</span>）に対応する控除額（会社退職金分で <span className="font-bold text-red-600">-{results.companyReductionAmount.toLocaleString()}万円</span>、DC/iDeCo分で <span className="font-bold text-red-600">-{results.dcIdecoReductionAmount.toLocaleString()}万円</span>）を差し引いています。
                      </p>
                    ) : (
                      <p className="leading-relaxed text-slate-500 font-medium">
                        • 現在の受取時期の間隔（または期間登録）においては、重複部分に対応する控除額の差し引きは発生していません。
                      </p>
                    )}

                    {[...results.pastLumpSumAnalysis.details, ...results.dcIdecoPastLumpSumAnalysis.details]
                      .filter((detail, index, all) =>
                        detail.usedAmountBasedPeriod
                        && detail.adjustmentRule !== 'none'
                        && all.findIndex((item) => item.id === detail.id) === index
                      )
                      .map((detail) => (
                        <p key={detail.id} className="leading-relaxed rounded-md border border-blue-100 bg-blue-50/60 p-2.5">
                          • <span className="font-semibold text-slate-800">{detail.name}</span>は、受取額が当時の退職所得控除額を下回る入力です。
                          そのため、受取額から求める計算上の期間（<span className="font-bold text-blue-700">{detail.effectivePastYears}年</span>）を、
                          登録した期間の初日から数えて重複期間を整理しています。
                        </p>
                      ))}
                    
                    <p className="leading-relaxed text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      ※ 過去の退職金で使わなかった控除枠がそのまま次回へ持ち越されるわけではありません。過去の勤続期間と今回の加入期間が重なるかを確認し、重複している期間に対応する控除額を調整します。
                    </p>
                  </div>
                </div>

                {/* 4. 税額につながる部分 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-700"></span>
                    <span>4. 税額につながる部分</span>
                  </h4>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                    <p className="leading-relaxed font-semibold">
                      【DC / iDeCo一時金受領時の課税退職所得計算（目安）】
                    </p>
                    {(() => {
                      const total = results.dcIdecoTotal;
                      const adjustedDeduction = results.lumpSumScenario.sameYearReceipt
                        ? Math.max(0, results.combinedAdjustedDeduction - inputs.companyRetirementEstimate)
                        : results.dcIdecoAdjustedDeduction;
                      const excess = Math.max(0, total - adjustedDeduction);
                      const taxable = excess * 0.5;

                      if (excess === 0) {
                        return (
                          <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] shadow-sm">
                            式： (額面 <span className="font-bold text-indigo-700">{total.toLocaleString()}万円</span> − 調整後控除額 <span className="font-bold text-indigo-700">{adjustedDeduction.toLocaleString()}万円</span>) ＝ 0万円 以下
                            <br />
                            <span className="text-emerald-700 font-bold">⇒ 課税退職所得の目安：0円（控除枠内に収まります）</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1 shadow-sm">
                            <div>式： (額面 <span className="font-bold text-indigo-700">{total.toLocaleString()}万円</span> − 調整後控除額 <span className="font-bold text-indigo-700">{adjustedDeduction.toLocaleString()}万円</span>) × 1/2</div>
                            <div>＝ <span className="font-bold text-indigo-700">{excess.toLocaleString()}万円</span> × 1/2</div>
                            <div className="text-blue-900 font-bold">⇒ 課税退職所得の目安：<span className="font-bold text-blue-700 bg-blue-50 px-1 rounded">{taxable.toLocaleString()}万円</span></div>
                          </div>
                        );
                      }
                    })()}
                    <p className="leading-relaxed text-[11px] text-slate-500">
                      この課税退職所得をもとに所得税等や住民税が計算され、それらが差し引かれて最終的な手取り見込額の目安に繋がります（本ツールに示される数値はあくまで概算・目安であり、実際の税額と異なる場合があります）。
                    </p>
                  </div>
                </div>

                {/* 5. COMPASSナビゲーター */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-700"></span>
                    <span>5. COMPASSナビゲーター</span>
                  </h4>
                  <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-200 text-xs text-slate-700 space-y-2.5">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <p className="leading-relaxed">
                        DC/iDeCoは通算加入期間で見ると控除額が大きく見えますが、過去の退職金と同じ期間を二重に控除へ使わないように調整します。そのため、今回使える控除額は通算加入期間だけで見た金額より小さく表示される場合があります。
                      </p>
                    </div>

                    {dcContributionImpact.additionalServiceYears > 0 && (
                      <div className="flex items-start space-x-2 border-t border-slate-200/50 pt-2.5">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <p className="leading-relaxed">
                          会社退職後も掛金拠出を続ける設定は加入年数へ反映しています。一方、掛金を止めて受取だけを待つ期間は加入年数へ加えていません。面談では「いつまで積み立てるか」と「いつ受け取るか」を分けて確認します。
                        </p>
                      </div>
                    )}

                    {results.companyReductionAmount > 0 && (
                      <div className="flex items-start space-x-2 border-t border-slate-200/50 pt-2.5">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <p className="leading-relaxed">
                          今回は会社退職金の退職所得控除額が、過去退職金等との重複により{' '}
                          <span className="font-bold text-red-600 bg-red-50 px-1 rounded">{results.companyReductionAmount.toLocaleString()}万円</span> 減少しています。支払通知書等で過去の加入期間や受取時期を再確認することをご検討ください。
                        </p>
                      </div>
                    )}

                    {results.dcIdecoReductionAmount > 0 && (
                      <div className="flex items-start space-x-2 border-t border-slate-200/50 pt-2.5">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <p className="leading-relaxed">
                          今回はDC/iDeCo一時金の退職所得控除額が、過去退職金等との重複により{' '}
                          <span className="font-bold text-red-600 bg-red-50 px-1 rounded">{results.dcIdecoReductionAmount.toLocaleString()}万円</span> 減少しています。受取時期比較で19年ルールの確認対象が続くかを確認し、必要資金の時期や運用期間と合わせて整理します。
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 3. 計算根拠 (Calculation Premise & Logic) ==================== */}
          {activeTab === 'assumptions' && (
            <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-fadeIn" id="tab-assumptions-content">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-2">退職所得の課税方式および計算モデル</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  本シミュレーターの裏で動作している税額および社会保険料の概算根拠・前提条件、および関連する一般的な制度説明を示します。
                </p>
              </div>

              {/* 退職所得の税率構造 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">1. 一時金受領時の課税所得（退職所得と分離課税）</h4>
                <div className="bg-slate-50 p-3 rounded-lg border text-xs text-slate-700 font-mono leading-relaxed">
                  課税退職所得 ＝ (受取一時金の総額 － 退職所得控除額) × 1/2 (※)
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  ※ 退職所得控除を超える超過分の半分に対してのみ課税されます（実質的な税率1/2効果）。
                  日本の所得税法において、退職一時金は他の所得（給与や事業など）と分けて課税される「分離課税」が適用され、税負担が著しく軽減されています。
                  ここに所得税（累進課税）および復興特別所得税（所得税の2.1%）、一律10%の住民税（都道府県民税・市町村民税）が課せられます。
                </p>
              </div>

              {/* 退職所得控除の基本構造と計算ルール */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">2. 退職所得控除の計算ルール（勤続・加入年数ベース）</h4>
                <div className="w-full overflow-hidden sm:overflow-visible">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="py-2 px-3">勤続・加入年数</th>
                        <th className="py-2 px-3">1年あたりの控除額</th>
                        <th className="py-2 px-3">退職所得控除額の計算公式</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-2.5 px-3">20年以下</td>
                        <td className="py-2.5 px-3 font-semibold text-blue-700">40万円</td>
                        <td className="py-2.5 px-3">40万円 × 勤続年数</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3">20年超の部分</td>
                        <td className="py-2.5 px-3 font-semibold text-blue-700">70万円</td>
                        <td className="py-2.5 px-3">800万円 + 70万円 × (勤続年数 - 20年)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="space-y-1 text-[10px] leading-relaxed text-slate-500">
                  <p>※ 勤続年数に1年未満の端数がある場合は、たとえ1ヶ月でも1年に切り上げてカウントします。</p>
                  <p>※ DC/iDeCoは入力した通算加入開始年月から加入終了年月までで計算します。加入資格を失った後、受取開始まで運用だけを続ける期間は加入年数へ加えません。</p>
                  <p>※ 会社退職後も実際に掛金拠出を続ける場合は、その加入期間を退職所得控除の年数へ反映します。企業型DCは勤務先の制度、iDeCoは加入資格と施行時期を確認して入力します。</p>
                  <p>※ 受取時期比較の残高は、退職時点の比較基準残高に月額掛金を加え、入力した年率で月次換算した概算です。掛金拠出時の所得控除、口座管理手数料、商品ごとの値動きは含みません。</p>
                  <p>※ 老齢給付金は原則60歳から75歳までの間で受取開始時期を選べますが、通算加入者等期間や加入先の規約によって確認が必要です。</p>
                </div>
              </div>

              {/* 年金受取時の前提 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">3. 年金受領時（雑所得）の計算前提</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  DC/iDeCoを「年金」として受け取る場合、税法上は「雑所得（公的年金等）」に分類され、公的年金等控除が適用されます。
                </p>
                <div className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <p>• <strong>公的年金等控除:</strong> 65歳未満は60万円、65歳以上は110万円を最低控除額として、年金収入等に応じた2026年分の区分で概算します。</p>
                  <p>• <strong>社会保険料:</strong> 年金受取に対応する概算として、DC/iDeCo年金部分の10%を試算上の保険料とし、手取り額と所得控除に反映します。実際の保険料は自治体や加入制度などで異なります。</p>
                  <p>• <strong>基礎控除:</strong> 2026年分の所得税の基礎控除を、合計所得金額に応じて104万円から0円の区分で概算します。</p>
                </div>
              </div>

              {/* 10年ルール・19年ルールの詳しい制度説明 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">4. 重複期間調整 (10年ルール・19年ルール)</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  過去に退職一時金や確定拠出年金（DC/iDeCo）の一時金を受け取っている場合、今回の退職所得控除の計算にあたって「勤続・加入期間の重複部分」が控除額から差し引かれる特別なルールが存在します。
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  • <strong>DC/iDeCo一時金を先に受け取り、その後に会社退職金を受け取る場合:</strong><br />
                  DC/iDeCo一時金を先に受け取り、その後に会社退職金を受け取る場合、2026年1月1日以後の受取は10年ルールが関係する場合があります。
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  • <strong>会社退職金を先に受け取り、その後にDC/iDeCo一時金を受け取る場合:</strong><br />
                  会社退職金を先に受け取り、その後にDC/iDeCo一時金を受け取る場合は、19年ルールが関係する場合があります。
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  • <strong>確認メモ:</strong><br />
                  制度改正の前後で扱いが異なる場合があるため、過去の一時金がある場合は支払通知書や源泉徴収票を確認してください。
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  同じ年に会社退職金とDC/iDeCo一時金を受け取る場合は、同年分を合算し、対象となる勤続・加入期間をもとに控除額を確認します。
                  受取年を分ける場合も、過去の受取時期と期間の重なりによって控除額が変わるため、画面の計算内訳と支払通知書等をあわせて確認してください。
                </p>
              </div>

              {/* 注意事項 */}
              <div className="p-4 bg-blue-50 text-blue-900 rounded-xl border border-blue-100 text-[11px] leading-relaxed">
                <span className="font-bold">計算上の補足:</span>
                <p className="mt-1">
                  本シミュレーションは2026年分の主要税制および概算的な社会保険料モデルに基づいています。
                  住民税や国民健康保険料は自治体ごとに異なるほか、配偶者控除や医療費控除などの個別条件、一時金受取における勤続期間の厳密な重複調整（10年・19年ルール）
                  の実務適用については、最寄りの税務署または税理士などの専門家へのご相談をご検討ください。
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  </div>
  );
}

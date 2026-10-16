/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Calculator, 
  FileText, 
  RefreshCw, 
  Layers, 
  Check,
  AlertTriangle
} from 'lucide-react';
import { CompassHeader } from './CompassBrand';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { AppSharedData } from '../types';
import {
  AnnualFlow,
  calculateAdjustedPublicPension,
  calculateRetirementTrajectory,
  findAssetZeroAge,
  RetirementProjectionInputs as DiagnosisInputs,
} from '../utils/retirementProjection';

interface RetirementTotalDiagnosisProps {
  onBackToDashboard: () => void;
  sharedData?: AppSharedData;
  updateSharedData?: (newData: Partial<AppSharedData>, editedKeysToMark?: string[]) => void;
}

export default function RetirementTotalDiagnosis({ 
  onBackToDashboard,
  sharedData,
  updateSharedData
}: RetirementTotalDiagnosisProps) {
  // 初期状態の設定
  const [inputs, setInputs] = useState<DiagnosisInputs>(() => {
    const base: DiagnosisInputs = {
      currentAge: 55,
      retirementAge: 60,
      workUntilAge: 65,
      retirementLumpSum: 1500,
      dcBalance: 500,
      publicPensionAmount: 180,
      publicPensionStartAge: 65,
      pensionEarlyReductionRate: 0.004,
      financialAssets: 1000,
      annualLivingCost: 300,
      hasSpouse: true,
      largeDebt: 'none',

      // 配偶者簡易入力
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
    };
    if (sharedData) {
      if (sharedData.currentAge !== undefined) {
        base.currentAge = sharedData.currentAge;
      }
      if (sharedData.retirementAge !== undefined) {
        base.retirementAge = sharedData.retirementAge;
      }
      if (sharedData.workUntilAge !== undefined) {
        base.workUntilAge = sharedData.workUntilAge;
      }
      if (sharedData.retirementLumpSum !== undefined) {
        base.retirementLumpSum = sharedData.retirementLumpSum;
      }
      if (sharedData.corporateDcBalance !== undefined || sharedData.idecoBalance !== undefined) {
        base.dcBalance = (sharedData.corporateDcBalance ?? 0) + (sharedData.idecoBalance ?? 0);
      }
      if (sharedData.publicPensionAmount !== undefined) {
        base.publicPensionAmount = sharedData.publicPensionAmount;
      }
      if (sharedData.pensionStartAge !== undefined) {
        base.publicPensionStartAge = sharedData.pensionStartAge;
      }
      if (sharedData.pensionEarlyReductionRate !== undefined) {
        base.pensionEarlyReductionRate = sharedData.pensionEarlyReductionRate;
      }
      if (sharedData.hasSpouse !== undefined) {
        base.hasSpouse = sharedData.hasSpouse;
      }
      if (sharedData.spouseCurrentAge !== undefined) {
        base.spouseCurrentAge = sharedData.spouseCurrentAge;
      } else if (sharedData.currentAge !== undefined) {
        base.spouseCurrentAge = Math.max(0, sharedData.currentAge - 3);
      }
      if (sharedData.spousePensionAmount !== undefined) {
        base.spousePensionAmount = sharedData.spousePensionAmount;
      }
      if (sharedData.spousePensionStartAge !== undefined) {
        base.spousePensionStartAge = sharedData.spousePensionStartAge;
      }
      if (sharedData.includeKakyu !== undefined) {
        base.includeKakyu = sharedData.includeKakyu;
      }
      if (sharedData.kakyuAmount !== undefined) {
        base.kakyuAmount = sharedData.kakyuAmount;
      }
      if (sharedData.ownerKosei20Years !== undefined) {
        base.ownerKosei20Years = sharedData.ownerKosei20Years;
      }
      if (sharedData.spouseKosei20Years !== undefined) {
        base.spouseKosei20Years = sharedData.spouseKosei20Years;
      }
      if (sharedData.financialAssets !== undefined) {
        base.financialAssets = sharedData.financialAssets;
      }
      if (sharedData.annualLivingCost !== undefined) {
        base.annualLivingCost = sharedData.annualLivingCost;
      }
      if (sharedData.dcPayoutType !== undefined) {
        base.dcPayoutType = sharedData.dcPayoutType;
      }
      if (sharedData.dcStartAge !== undefined) {
        base.dcStartAge = sharedData.dcStartAge;
      }
    }
    return base;
  });

  // 状態の変更を共有データに反映
  React.useEffect(() => {
    if (updateSharedData) {
      const editedKeys: string[] = [];
      const initialDefaultAge = 55;
      const initialDefaultRetireAge = 60;
      const initialDefaultWorkUntil = 65;
      const initialDefaultLump = 1500;
      const initialDefaultDc = 500;
      const initialDefaultPension = 180;
      const initialDefaultPensionStartAge = 65;
      const initialDefaultSpouse = true;
      const initialDefaultAssets = 1000;
      const initialDefaultLivingCost = 300;

      const initialDefaultSpouseAge = 52;
      const initialDefaultSpousePension = 80;
      const initialDefaultSpousePensionStart = 65;
      const initialDefaultIncludeKakyu = 'none';
      const initialDefaultKakyuAmount = 40;
      const initialDefaultOwnerKosei20 = 'undecided';
      const initialDefaultSpouseKosei20 = 'undecided';

      if (inputs.currentAge !== initialDefaultAge) editedKeys.push('currentAge');
      if (inputs.retirementAge !== initialDefaultRetireAge) editedKeys.push('retirementAge');
      if (inputs.workUntilAge !== initialDefaultWorkUntil) editedKeys.push('workUntilAge');
      if (inputs.retirementLumpSum !== initialDefaultLump) editedKeys.push('retirementLumpSum');
      if (inputs.dcBalance !== initialDefaultDc) {
        editedKeys.push('corporateDcBalance');
        editedKeys.push('idecoBalance');
      }
      if (inputs.publicPensionAmount !== initialDefaultPension) editedKeys.push('publicPensionAmount');
      if (inputs.publicPensionStartAge !== initialDefaultPensionStartAge) editedKeys.push('pensionStartAge');
      if (inputs.hasSpouse !== initialDefaultSpouse) editedKeys.push('hasSpouse');
      if (inputs.financialAssets !== initialDefaultAssets) editedKeys.push('financialAssets');
      if (inputs.annualLivingCost !== initialDefaultLivingCost) editedKeys.push('annualLivingCost');

      if (inputs.spouseCurrentAge !== initialDefaultSpouseAge) editedKeys.push('spouseCurrentAge');
      if (inputs.spousePensionAmount !== initialDefaultSpousePension) editedKeys.push('spousePensionAmount');
      if (inputs.spousePensionStartAge !== initialDefaultSpousePensionStart) editedKeys.push('spousePensionStartAge');
      if (inputs.includeKakyu !== initialDefaultIncludeKakyu) editedKeys.push('includeKakyu');
      if (inputs.kakyuAmount !== initialDefaultKakyuAmount) editedKeys.push('kakyuAmount');
      if (inputs.ownerKosei20Years !== initialDefaultOwnerKosei20) editedKeys.push('ownerKosei20Years');
      if (inputs.spouseKosei20Years !== initialDefaultSpouseKosei20) editedKeys.push('spouseKosei20Years');

      updateSharedData({
        currentAge: inputs.currentAge,
        retirementAge: inputs.retirementAge,
        workUntilAge: inputs.workUntilAge,
        retirementLumpSum: inputs.retirementLumpSum,
        corporateDcBalance: inputs.dcBalance,
        idecoBalance: 0,
        publicPensionAmount: inputs.publicPensionAmount,
        pensionStartAge: inputs.publicPensionStartAge,
        pensionEarlyReductionRate: inputs.pensionEarlyReductionRate,
        hasSpouse: inputs.hasSpouse,
        financialAssets: inputs.financialAssets,
        annualLivingCost: inputs.annualLivingCost,
        dcPayoutType: inputs.dcPayoutType,
        dcStartAge: inputs.dcStartAge,
        spouseCurrentAge: inputs.spouseCurrentAge,
        spousePensionAmount: inputs.spousePensionAmount,
        spousePensionStartAge: inputs.spousePensionStartAge,
        includeKakyu: inputs.includeKakyu,
        kakyuAmount: inputs.kakyuAmount,
        ownerKosei20Years: inputs.ownerKosei20Years,
        spouseKosei20Years: inputs.spouseKosei20Years,
      }, editedKeys);
    }
  }, [
    inputs.currentAge,
    inputs.retirementAge,
    inputs.workUntilAge,
    inputs.retirementLumpSum,
    inputs.dcBalance,
    inputs.publicPensionAmount,
    inputs.publicPensionStartAge,
    inputs.pensionEarlyReductionRate,
    inputs.hasSpouse,
    inputs.financialAssets,
    inputs.annualLivingCost,
    inputs.dcPayoutType,
    inputs.dcStartAge,
    inputs.spouseCurrentAge,
    inputs.spousePensionAmount,
    inputs.spousePensionStartAge,
    inputs.includeKakyu,
    inputs.kakyuAmount,
    inputs.ownerKosei20Years,
    inputs.spouseKosei20Years,
    updateSharedData
  ]);


  const [showDetailedInputs, setShowDetailedInputs] = useState(false);
  const [showAllYearsTable, setShowAllYearsTable] = useState(false);
  const [integerDrafts, setIntegerDrafts] = useState<Partial<Record<keyof DiagnosisInputs, string>>>({});

  // 共有データが存在するか判定
  const hasSharedData = useMemo(() => {
    if (!sharedData) return false;
    return Object.keys(sharedData).some(k => sharedData[k as keyof AppSharedData] !== undefined);
  }, [sharedData]);

  // 共有データから自動反映されたかのラベル描画
  const renderSharedReflectedLabel = (key: keyof AppSharedData | 'dcBalance') => {
    if (!sharedData) return null;
    let isReflected = false;
    if (key === 'dcBalance') {
      isReflected = sharedData.corporateDcBalance !== undefined || sharedData.idecoBalance !== undefined;
    } else {
      isReflected = sharedData[key] !== undefined;
    }
    if (isReflected) {
      return (
        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-normal ml-1.5 border border-emerald-100/70 inline-block">
          入力済みデータを反映
        </span>
      );
    }
    return null;
  };

  // 金額フォーマット関数
  const formatManYen = (val: number): string => {
    if (val === 0) return '0円';
    if (val >= 10000) {
      const oku = Math.floor(val / 10000);
      const man = Math.round(val % 10000);
      return man > 0 ? `${oku}億${man}万円` : `${oku}億円`;
    }
    return `${Math.round(val)}万円`;
  };

  // 年次計算は純粋なTypeScriptロジックとして utils で管理する。
  // 5年刻み＆重要節目表示用データの作成
  const get5YearIntervals = (trajectory: AnnualFlow[]): AnnualFlow[] => {
    if (trajectory.length === 0) return [];
    
    const intervals: AnnualFlow[] = [];
    const startAge = trajectory[0].age;
    const zeroAge = findAssetZeroAge(trajectory);

    // 節目年齢リスト (現在、退職、働く終了、0になる歳、100歳、および5の倍数年齢)
    const milestoneAges = new Set<number>([
      startAge,
      inputs.retirementAge,
      inputs.workUntilAge,
      100
    ]);
    if (zeroAge) milestoneAges.add(zeroAge);

    trajectory.forEach(flow => {
      const isFiveMultiple = flow.age % 5 === 0;
      if (isFiveMultiple || milestoneAges.has(flow.age)) {
        intervals.push(flow);
      }
    });

    // 年齢順にソートして重複を排除
    return intervals
      .filter((v, i, a) => a.findIndex(t => t.age === v.age) === i)
      .sort((a, b) => a.age - b.age);
  };

  // 現在の設定に基づく標準シナリオの計算
  const currentScenario = useMemo(() => {
    return {
      type: inputs.dcPayoutType,
      startAge: inputs.dcStartAge
    };
  }, [inputs.dcPayoutType, inputs.dcStartAge]);

  const trajectoryData = useMemo(() => {
    return calculateRetirementTrajectory(inputs, currentScenario);
  }, [inputs, currentScenario]);

  const zeroAssetAge = useMemo(() => {
    return findAssetZeroAge(trajectoryData);
  }, [trajectoryData]);

  const adjustedPublicPensionAmount = useMemo(
    () => calculateAdjustedPublicPension(inputs),
    [
      inputs.publicPensionAmount,
      inputs.publicPensionStartAge,
      inputs.pensionEarlyReductionRate,
    ]
  );

  const tableData = useMemo(() => {
    return showAllYearsTable ? trajectoryData : get5YearIntervals(trajectoryData);
  }, [trajectoryData, showAllYearsTable]);

  // F. シナリオ比較の計算 (3つのシナリオ比較)
  const scenarioComparisons = useMemo(() => {
    // A. 標準シナリオ
    const trajA = trajectoryData;
    const zeroAgeA = zeroAssetAge;
    const asset65A = trajA.find(f => f.age === 65)?.endOfYearAsset ?? 0;
    const asset75A = trajA.find(f => f.age === 75)?.endOfYearAsset ?? 0;
    const asset85A = trajA.find(f => f.age === 85)?.endOfYearAsset ?? 0;

    // B. 早め受取シナリオ (60歳または現在年齢から10年年金受給)
    const startAgeB = Math.max(60, inputs.currentAge);
    const trajB = calculateRetirementTrajectory(inputs, { type: 'annuity', startAge: startAgeB });
    const zeroAgeB = findAssetZeroAge(trajB);
    const asset65B = trajB.find(f => f.age === 65)?.endOfYearAsset ?? 0;
    const asset75B = trajB.find(f => f.age === 75)?.endOfYearAsset ?? 0;
    const asset85B = trajB.find(f => f.age === 85)?.endOfYearAsset ?? 0;

    // C. 後ろ倒しシナリオ (70歳または現在年齢がそれ以上の場合は75歳から10年年金受給)
    const startAgeC = Math.max(70, inputs.currentAge);
    const trajC = calculateRetirementTrajectory(inputs, { type: 'annuity', startAge: startAgeC });
    const zeroAgeC = findAssetZeroAge(trajC);
    const asset65C = trajC.find(f => f.age === 65)?.endOfYearAsset ?? 0;
    const asset75C = trajC.find(f => f.age === 75)?.endOfYearAsset ?? 0;
    const asset85C = trajC.find(f => f.age === 85)?.endOfYearAsset ?? 0;

    return {
      a: {
        title: '標準（入力どおり）',
        zeroAge: zeroAgeA,
        asset65: asset65A,
        asset75: asset75A,
        asset85: asset85A,
        memo: `設定した受取方法（${inputs.dcPayoutType === 'lump' ? '一時金' : inputs.dcPayoutType === 'annuity' ? '年金' : inputs.dcPayoutType === 'both' ? '併用' : '未定'}）かつ開始年齢（${inputs.dcStartAge}歳）での推移です。`
      },
      b: {
        title: '早め受取（60歳から年金）',
        zeroAge: zeroAgeB,
        asset65: asset65B,
        asset75: asset75B,
        asset85: asset85B,
        memo: '退職直後などの早い段階から年金受給することで、年金受給開始前の生活費取り崩しを抑える効果があります。'
      },
      c: {
        title: '後ろ倒し（70歳から年金）',
        zeroAge: zeroAgeC,
        asset65: asset65C,
        asset75: asset75C,
        asset85: asset85C,
        memo: '公的年金の開始後や再雇用終了後に受取時期を遅らせることで、老後の後半期の資金を手厚くする効果が期待できます。'
      }
    };
  }, [inputs, trajectoryData, zeroAssetAge]);

  // Rechartsグラフ用の整形データ
  const chartData = useMemo(() => {
    return trajectoryData.map(flow => ({
      name: `${flow.age}歳`,
      age: flow.age,
      '給与収入': Math.max(0, flow.salaryIncome),
      '公的年金': Math.max(0, flow.publicPension),
      '企業年金': Math.max(0, flow.corporatePension),
      'DC/iDeCo': Math.max(0, flow.dcIncome),
      'その他収入': Math.max(0, flow.otherIncome),
      '退職金': Math.max(0, flow.retirementLumpSum),
      '生活費': -Math.max(0, flow.livingCost),
      '大きな支出': -Math.max(0, flow.largeExpense),
      '住宅ローン負担': -Math.max(0, flow.debtExpense),
      '資産残高': Math.round(flow.endOfYearAsset),
    }));
  }, [trajectoryData]);

  const assetAxis = useMemo(() => {
    const tickStep = 500;
    const balances = chartData.map(row => row['資産残高']);
    if (balances.length === 0) {
      return { domain: [0, tickStep] as [number, number], ticks: [0, tickStep] };
    }

    const domainMin = Math.floor(Math.min(0, ...balances) / tickStep) * tickStep;
    let domainMax = Math.ceil(Math.max(0, ...balances) / tickStep) * tickStep;
    if (domainMin === domainMax) {
      domainMax += tickStep;
    }

    const tickCount = Math.round((domainMax - domainMin) / tickStep) + 1;
    return {
      domain: [domainMin, domainMax] as [number, number],
      ticks: Array.from({ length: tickCount }, (_, index) => domainMin + index * tickStep),
    };
  }, [chartData]);

  // 入力から見た整理テキストの構築
  const organizedPoints = useMemo(() => {
    const points: string[] = [];

    // ポイント1: 公的年金開始前の補完設計
    if (inputs.retirementAge < inputs.publicPensionStartAge) {
      points.push(`公的年金が始まる前の期間（${inputs.retirementAge}歳〜${inputs.publicPensionStartAge - 1}歳）は、給与・退職金・金融資産で生活費を補う設計になります。`);
    } else {
      points.push('退職後すぐに公的年金を受給できる年齢設計になっています。大きな支出のタイミングを確認することが目安となります。');
    }

    // ポイント2: 再雇用収入とDCのタイミング
    if (inputs.workUntilAge > inputs.retirementAge && inputs.dcStartAge < inputs.workUntilAge) {
      points.push(`再雇用収入（年${inputs.reemploymentIncome}万円）がある期間（${inputs.retirementAge}歳〜${inputs.workUntilAge - 1}歳）は、DC/iDeCoを急いで受け取らず、働き終える時期に合わせて受け取り開始年齢を調整すると、お金の流れを整理しやすくなります。`);
    } else if (inputs.workUntilAge > inputs.retirementAge) {
      points.push(`働き終える${inputs.workUntilAge}歳までは再雇用収入があるため、それ以降の年金受給と合わせることで、資金推移が安定しやすくなります。`);
    } else {
      points.push('退職後すぐに就労を終える想定のため、退職金や金融資産を取り崩しながら公的年金へつなぐ推移を確認することがポイントです。');
    }

    // ポイント3: 資産寿命
    if (zeroAssetAge) {
      points.push(`生活費を年間${inputs.annualLivingCost}万円とした場合、現在の試算では概算で${zeroAssetAge}歳ごろに資産が引き当てラインを下回る目安です。生活費の見直しや働く期間の延長、または受取時期の確認がポイントになります。`);
    } else {
      points.push(`生活費を年間${inputs.annualLivingCost}万円とした場合、100歳時点でも概算で${formatManYen(trajectoryData[trajectoryData.length - 1].endOfYearAsset)}の資産が残る見込みです。`);
    }

    // ポイント4: 大きな支出
    const totalLargeExpenses = 
      (inputs.houseRepairActive ? inputs.houseRepairAmount : 0) +
      (inputs.carActive ? inputs.carAmount : 0) +
      (inputs.medicalActive ? inputs.medicalAmount : 0) +
      (inputs.supportActive ? inputs.supportAmount : 0) +
      (inputs.otherActive ? inputs.otherAmount : 0);

    if (totalLargeExpenses > 0) {
      points.push(`退職後に予定している大きな支出（合計${totalLargeExpenses}万円）が発生する時期は、一時的に資産残高が大きく減少するため、該当する年齢での資産残高を意識しておくことで、より実態に即した計画が立てやすくなります。`);
    } else {
      points.push('現在、一時的な大きな支出（住宅修繕・車の買い替え等）は設定されていません。必要に応じて「詳しく入力」から追加して、資産推移への影響を確認できます。');
    }

    // 配偶者・加給年金に関する確認メモ
    if (inputs.hasSpouse) {
      if (inputs.ownerKosei20Years === 'yes' && inputs.spouseCurrentAge < 65) {
        points.push('本人の厚生年金加入期間が20年以上で、配偶者が65歳未満の場合、加給年金が関係することがあります。');
      }
      if (inputs.includeKakyu === 'include') {
        points.push('配偶者が65歳になるまでの期間だけ、加給年金の概算額を世帯収入に含めています。');
      }
      points.push('配偶者自身の厚生年金加入期間などにより、実際の加給年金の有無は変わる場合があります。');
    }

    return points;
  }, [inputs, zeroAssetAge, trajectoryData]);

  // 入力ハンドラ
  const handleInputChange = (key: keyof DiagnosisInputs, value: any) => {
    setInputs(prev => {
      const next = { ...prev, [key]: value };
      
      // 整合性チェック: 退職予定年齢は現在年齢以上
      if (key === 'currentAge' && next.retirementAge < value) {
        next.retirementAge = value;
      }
      // 整合性チェック: 働く予定年齢は退職予定年齢以上
      if (key === 'retirementAge' && next.workUntilAge < value) {
        next.workUntilAge = value;
      }
      if (key === 'retirementAge' && next.currentAge > value) {
        next.currentAge = value;
      }
      if (key === 'workUntilAge' && next.retirementAge > value) {
        next.retirementAge = value;
      }
      
      return next;
    });
  };

  const getIntegerInputProps = (key: keyof DiagnosisInputs, value: number) => {
    const draft = integerDrafts[key];
    return {
      value: draft ?? String(value),
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value;
        const cleaned = raw.replace(/^0+(?=\d)/, '');
        setIntegerDrafts((prev) => ({ ...prev, [key]: cleaned }));
        if (cleaned !== '' && /^\d+$/.test(cleaned)) {
          handleInputChange(key, Number(cleaned));
        }
      },
      onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
        const raw = event.currentTarget.value;
        const cleaned = raw.replace(/^0+(?=\d)/, '');
        const normalized = cleaned === '' ? 0 : Number(cleaned);
        handleInputChange(key, Number.isFinite(normalized) ? normalized : value);
        setIntegerDrafts((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      },
    };
  };

  return (
    <div className="compass-page pb-16 font-sans">
      <CompassHeader toolName="リタイアメント総合確認" onBack={onBackToDashboard} />

      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* タイトルセクション */}
        <div className="mb-8 border-b border-slate-200 pb-5">
          <p className="compass-kicker">RETIREMENT / CASH FLOW</p>
          <h1 className="text-2xl font-black text-[#002D62] flex items-center space-x-2.5">
            <Layers className="h-6 w-6 text-[#1D4ED8]" />
            <span>リタイアメント総合確認</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-3xl leading-relaxed">
            退職金、DC/iDeCo、公的年金、金融資産、生活費をまとめて確認し、退職後のお金の流れを年齢別に見える化します。
          </p>
        </div>

        {hasSharedData ? (
          <div className="bg-emerald-50/50 border border-emerald-200/80 text-emerald-800 rounded-2xl p-5 flex items-start space-x-3 text-xs mb-6 shadow-2xs">
            <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900">これまで入力した内容を反映しました。不足している項目だけ入力してください。</p>
              <p className="text-emerald-700/90 mt-1.5 leading-relaxed">
                他のシミュレーター（年金受取開始年齢、見込額、退職金見込額など）で入力・シミュレーションされたデータが自動的に引き継がれています。この画面で自由に変更・上書きも可能です。
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50/50 border border-blue-200/80 text-blue-800 rounded-2xl p-5 flex items-start space-x-3 text-xs mb-6 shadow-2xs">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900">まずは基本情報を入力してください。あとから各シミュレーターの入力内容も反映できます。</p>
              <p className="text-blue-700/90 mt-1.5 leading-relaxed">
                この画面で入力されたデータは他のシミュレーター（年金や退職金・DC）とも裏側で自動的に共有されます。
              </p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          
          {/* 2. 入力エリア */}
          <div className="space-y-6">
            
            {/* まずはここだけ入力 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
                <h2 className="font-bold text-[#002D62] flex items-center space-x-2 text-sm sm:text-base">
                  <span className="bg-[#1D4ED8] text-white text-[10px] font-black px-1.5 py-0.5 rounded-sm">STEP 1</span>
                  <span>まずはここだけ入力</span>
                </h2>
              </div>
              
              <div className="p-5 sm:p-6 space-y-6">
                {/* 1行目: 年齢関連 (3カラム) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-b border-slate-100 pb-5">
                  {/* 現在年齢 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                      <span>現在年齢</span>
                      {renderSharedReflectedLabel('currentAge')}
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <input
                        type="number"
                        min="40"
                        max="100"
                        {...getIntegerInputProps('currentAge', inputs.currentAge)}
                        className="block w-full h-11 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm text-right focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-mono font-medium"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-xs text-slate-400 font-mono">歳</span>
                      </div>
                    </div>
                  </div>

                  {/* 退職予定年齢 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                      <span>退職予定年齢</span>
                      {renderSharedReflectedLabel('retirementAge')}
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <input
                        type="number"
                        min={inputs.currentAge}
                        max="100"
                        {...getIntegerInputProps('retirementAge', inputs.retirementAge)}
                        className="block w-full h-11 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm text-right focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-mono font-medium"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-xs text-slate-400 font-mono">歳</span>
                      </div>
                    </div>
                  </div>

                  {/* 何歳まで働く予定か */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                      <span>何歳まで働く予定か（再雇用等含む）</span>
                      {renderSharedReflectedLabel('workUntilAge')}
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <input
                        type="number"
                        min={inputs.retirementAge}
                        max="100"
                        {...getIntegerInputProps('workUntilAge', inputs.workUntilAge)}
                        className="block w-full h-11 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm text-right focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-mono font-medium"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-xs text-slate-400 font-mono">歳</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2行目: 資産関連 (3カラム) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-b border-slate-100 pb-5">
                  {/* 金融資産残高 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                      <span className="flex items-center">
                        <span>現在の金融資産（預貯金・株式等）</span>
                        {renderSharedReflectedLabel('financialAssets')}
                      </span>
                      <span className="text-slate-500 font-bold font-mono text-[11px]">
                        {formatManYen(inputs.financialAssets)}
                      </span>
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        step="50"
                        {...getIntegerInputProps('financialAssets', inputs.financialAssets)}
                        className="block w-full h-11 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-12 text-sm text-right focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-mono font-medium"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-xs text-slate-400 font-mono">万円</span>
                      </div>
                    </div>
                  </div>

                  {/* 退職金見込 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                      <span className="flex items-center">
                        <span>退職金の見込額（一時金・手取り概算）</span>
                        {renderSharedReflectedLabel('retirementLumpSum')}
                      </span>
                      <span className="text-slate-500 font-bold font-mono text-[11px]">
                        {formatManYen(inputs.retirementLumpSum)}
                      </span>
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        step="50"
                        {...getIntegerInputProps('retirementLumpSum', inputs.retirementLumpSum)}
                        className="block w-full h-11 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-12 text-sm text-right focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-mono font-medium"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-xs text-slate-400 font-mono">万円</span>
                      </div>
                    </div>
                  </div>

                  {/* DC/iDeCo残高予想 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                      <span className="flex items-center">
                        <span>DC / iDeCoの受取時残高予想</span>
                        {renderSharedReflectedLabel('dcBalance')}
                      </span>
                      <span className="text-slate-500 font-bold font-mono text-[11px]">
                        {formatManYen(inputs.dcBalance)}
                      </span>
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        step="50"
                        {...getIntegerInputProps('dcBalance', inputs.dcBalance)}
                        className="block w-full h-11 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-12 text-sm text-right focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-mono font-medium"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-xs text-slate-400 font-mono">万円</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3行目: 年金、生活費、家族・住居費設定 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* 公的年金額面 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                      <span className="flex items-center">
                        <span>65歳時点の公的年金見込額（年間・額面）</span>
                        {renderSharedReflectedLabel('publicPensionAmount')}
                      </span>
                      <span className="text-slate-500 font-bold font-mono text-[11px]">
                        {formatManYen(inputs.publicPensionAmount)}/年
                      </span>
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        step="10"
                        {...getIntegerInputProps('publicPensionAmount', inputs.publicPensionAmount)}
                        className="block w-full h-11 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-16 text-sm text-right focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-mono font-medium"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-xs text-slate-400 font-mono">万円/年</span>
                      </div>
                    </div>
                  </div>

                  {/* 公的年金の受取開始年齢 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                      <span className="flex items-center">
                        <span>公的年金の受取開始年齢</span>
                        {renderSharedReflectedLabel('pensionStartAge')}
                      </span>
                      <span className="text-[#1D4ED8] font-bold font-mono text-[11px]">
                        {formatManYen(adjustedPublicPensionAmount)}/年
                      </span>
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <input
                        type="number"
                        min="60"
                        max="75"
                        step="1"
                        {...getIntegerInputProps('publicPensionStartAge', inputs.publicPensionStartAge)}
                        className="block w-full h-11 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm text-right focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-mono font-medium"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-xs text-slate-400 font-mono">歳</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      65歳基準額に繰上げ・繰下げ率を反映。
                    </p>
                  </div>

                  {/* 退職後の生活費 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                      <span className="flex items-center">
                        <span>退職後の年間生活費（目安）</span>
                        {renderSharedReflectedLabel('annualLivingCost')}
                      </span>
                      <span className="text-slate-500 font-bold font-mono text-[11px]">
                        {formatManYen(inputs.annualLivingCost)}/年
                      </span>
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        step="10"
                        {...getIntegerInputProps('annualLivingCost', inputs.annualLivingCost)}
                        className="block w-full h-11 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-16 text-sm text-right focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-mono font-medium"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-xs text-slate-400 font-mono">万円/年</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      現役時代の約7〜8割が一般的な目安です。
                    </p>
                  </div>

                  {/* 簡易設定 (配偶者有無、住宅関連) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                        <span>配偶者の有無</span>
                        {renderSharedReflectedLabel('hasSpouse')}
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-0.5 h-11 items-center">
                        <button
                          type="button"
                          onClick={() => handleInputChange('hasSpouse', true)}
                          className={`h-10 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            inputs.hasSpouse ? 'bg-white text-[#1D4ED8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          あり
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('hasSpouse', false)}
                          className={`h-10 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            !inputs.hasSpouse ? 'bg-white text-[#1D4ED8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          なし
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">住宅ローン・家賃</label>
                      <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-0.5 h-11 items-center">
                        <button
                          type="button"
                          onClick={() => handleInputChange('largeDebt', 'large')}
                          className={`h-10 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            inputs.largeDebt === 'large' ? 'bg-white text-[#1D4ED8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          あり
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('largeDebt', 'none')}
                          className={`h-10 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            inputs.largeDebt === 'none' ? 'bg-white text-[#1D4ED8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          なし
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {inputs.largeDebt === 'large' && (
                  <div className="rounded-2xl bg-blue-50/50 border border-blue-100 p-3 mt-2">
                    <p className="text-[11px] text-blue-700 leading-normal">
                      ※「あり」の場合、退職予定年齢から75歳まで年間100万円が支出に上乗せして計算されます。
                    </p>
                  </div>
                )}

                {/* 簡易配偶者入力エリア */}
                {inputs.hasSpouse && (
                  <div className="mt-5 p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100/50 space-y-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800">
                      <div className="w-1.5 h-3.5 bg-emerald-500 rounded-sm" />
                      <span>配偶者の基本情報（簡易反映）</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* 配偶者現在年齢 */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          配偶者の現在年齢
                        </label>
                        <div className="relative rounded-lg shadow-sm">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={inputs.spouseCurrentAge}
                            onChange={(e) => handleInputChange('spouseCurrentAge', Number(e.target.value))}
                            className="block w-full h-11 rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm text-right focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-xs text-slate-400 font-mono">歳</span>
                          </div>
                        </div>
                      </div>

                      {/* 配偶者年金受取開始年齢 */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          配偶者の受取開始年齢
                        </label>
                        <div className="relative rounded-lg shadow-sm">
                          <input
                            type="number"
                            min="60"
                            max="75"
                            value={inputs.spousePensionStartAge}
                            onChange={(e) => handleInputChange('spousePensionStartAge', Number(e.target.value))}
                            className="block w-full h-11 rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm text-right focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-xs text-slate-400 font-mono">歳</span>
                          </div>
                        </div>
                      </div>

                      {/* 配偶者の公的年金見込額 */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                          <span>配偶者の公的年金（年額）</span>
                          <span className="text-slate-500 font-medium font-mono text-[11px]">
                            {formatManYen(inputs.spousePensionAmount)}/年
                          </span>
                        </label>
                        <div className="relative rounded-lg shadow-sm">
                          <input
                            type="number"
                            min="0"
                            max="5000"
                            step="10"
                            value={inputs.spousePensionAmount}
                            onChange={(e) => handleInputChange('spousePensionAmount', Number(e.target.value))}
                            className="block w-full h-11 rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-16 text-sm text-right focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-xs text-slate-400 font-mono">万円/年</span>
                          </div>
                        </div>
                      </div>

                      {/* 加給年金を概算に含める */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          加給年金を概算に含める
                        </label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-100 rounded-lg p-0.5 h-11 items-center">
                          <button
                            type="button"
                            onClick={() => handleInputChange('includeKakyu', 'none')}
                            className={`h-10 text-[11px] font-bold rounded-md transition-colors ${
                              inputs.includeKakyu === 'none' ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            含めない
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange('includeKakyu', 'include')}
                            className={`h-10 text-[11px] font-bold rounded-md transition-colors ${
                              inputs.includeKakyu === 'include' ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            含める
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange('includeKakyu', 'undecided')}
                            className={`h-10 text-[11px] font-bold rounded-md transition-colors ${
                              inputs.includeKakyu === 'undecided' ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            不明
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      配偶者の年金は、世帯収入として簡易的に反映します。加給年金は対象になる場合がありますが、ここでは詳細判定ではなく概算として扱います。
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 必要に応じて詳しく入力 (アコーディオン) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDetailedInputs(!showDetailedInputs)}
                className="w-full bg-slate-50/55 px-5 py-4 flex items-center justify-between text-[#002D62] border-b border-slate-100 cursor-pointer"
              >
                <span className="font-bold flex items-center space-x-2.5 text-sm">
                  <span className="bg-[#1D4ED8] text-white text-[10px] font-black px-1.5 py-0.5 rounded-sm">STEP 2</span>
                  <span>必要に応じて詳しく入力</span>
                </span>
                {showDetailedInputs ? (
                  <ChevronUp className="h-4.5 w-4.5 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4.5 w-4.5 text-slate-500" />
                )}
              </button>

              {showDetailedInputs && (
                <div className="p-5 sm:p-6 space-y-6">
                  {/* 1行目: 追加収入関連 (3カラム) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* 再雇用中の収入 */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between">
                        <span>再雇用中の年間収入（手取り目安）</span>
                        <span className="text-slate-500 font-medium font-mono text-[11px]">
                          {inputs.workUntilAge > inputs.retirementAge ? `${formatManYen(inputs.reemploymentIncome)}/年` : "対象外（退職と同時のため）"}
                        </span>
                      </label>
                      <div className="relative rounded-lg shadow-sm">
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          step="10"
                          disabled={inputs.workUntilAge <= inputs.retirementAge}
                          value={inputs.reemploymentIncome}
                          onChange={(e) => handleInputChange('reemploymentIncome', Number(e.target.value))}
                          className="block w-full h-11 rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-16 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-xs text-slate-400 font-mono">万円/年</span>
                        </div>
                      </div>
                      {inputs.workUntilAge > inputs.retirementAge && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          ※{inputs.retirementAge}歳から{inputs.workUntilAge}歳までの期間のみ反映。
                        </p>
                      )}
                    </div>

                    {/* 企業年金の年額 */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between">
                        <span>企業年金の年額（退職後から終身）</span>
                        <span className="text-slate-500 font-medium font-mono text-[11px]">
                          {formatManYen(inputs.corporatePensionAmount)}/年
                        </span>
                      </label>
                      <div className="relative rounded-lg shadow-sm">
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          step="10"
                          value={inputs.corporatePensionAmount}
                          onChange={(e) => handleInputChange('corporatePensionAmount', Number(e.target.value))}
                          className="block w-full h-11 rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-16 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-xs text-slate-400 font-mono">万円/年</span>
                        </div>
                      </div>
                    </div>

                    {/* その他収入 */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between">
                        <span>その他の年間収入（個人年金等）</span>
                        <span className="text-slate-500 font-medium font-mono text-[11px]">
                          {formatManYen(inputs.otherIncome)}/年
                        </span>
                      </label>
                      <div className="relative rounded-lg shadow-sm">
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          step="10"
                          value={inputs.otherIncome}
                          onChange={(e) => handleInputChange('otherIncome', Number(e.target.value))}
                          className="block w-full h-11 rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-16 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-xs text-slate-400 font-mono">万円/年</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2行目: 設定詳細関連 (3カラム) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-slate-100 pt-5">
                    {/* DC/iDeCo受取方法 */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        DC/iDeCoの受取方法
                      </label>
                      <select
                        value={inputs.dcPayoutType}
                        onChange={(e) => handleInputChange('dcPayoutType', e.target.value)}
                        className="block w-full h-11 rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="annuity">年金形式（10年分割）</option>
                        <option value="lump">一時金形式（一括）</option>
                        <option value="both">併用形式（一括50% ＆ 10年年金50%）</option>
                        <option value="undecided">未定（年金形式10年として計算）</option>
                      </select>
                    </div>

                    {/* DC/iDeCo受取開始年齢 */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        DC/iDeCo受取開始年齢
                      </label>
                      <div className="relative rounded-lg shadow-sm">
                        <input
                          type="number"
                          min="60"
                          max="75"
                          value={inputs.dcStartAge}
                          onChange={(e) => handleInputChange('dcStartAge', Number(e.target.value))}
                          className="block w-full h-11 rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-xs text-slate-400 font-mono">歳</span>
                        </div>
                      </div>
                    </div>

                    {/* 資産運用の想定利回り */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        資産運用の想定利回り
                      </label>
                      <div className="grid grid-cols-4 gap-1 bg-slate-100 rounded-lg p-0.5 h-11 items-center">
                        {[0, 1, 2, 3].map((yieldVal) => (
                          <button
                            key={yieldVal}
                            type="button"
                            onClick={() => handleInputChange('investmentYield', yieldVal)}
                            className={`h-10 text-xs font-bold rounded transition-colors ${
                              inputs.investmentYield === yieldVal
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {yieldVal}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3行目への導入用ボーダー */}
                  <div className="border-t border-slate-100" />

                  {/* 物価上昇率 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      物価上昇率（生活費への影響）
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-100 rounded-lg p-0.5">
                      {[0, 1, 2].map((infVal) => (
                        <button
                          key={infVal}
                          type="button"
                          onClick={() => handleInputChange('inflationRate', infVal)}
                          className={`py-1 text-xs font-bold rounded transition-colors ${
                            inputs.inflationRate === infVal
                              ? 'bg-white text-blue-700 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {infVal}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 大きな支出予定 */}
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-xs font-bold text-slate-700 block mb-3">大きな支出予定</span>
                    
                    <div className="space-y-3.5">
                      {/* 住宅修繕 */}
                      <div className="flex flex-col space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inputs.houseRepairActive}
                            onChange={(e) => handleInputChange('houseRepairActive', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700">住宅修繕</span>
                        </label>
                        {inputs.houseRepairActive && (
                          <div className="grid grid-cols-2 gap-2 pl-6">
                            <div>
                              <span className="text-[10px] text-slate-500">発生年齢 (歳)</span>
                              <input
                                type="number"
                                min={inputs.currentAge}
                                max="100"
                                value={inputs.houseRepairAge}
                                onChange={(e) => handleInputChange('houseRepairAge', Math.max(inputs.currentAge, Number(e.target.value)))}
                                className="block w-full rounded border border-slate-300 bg-white py-1 px-1.5 text-xs text-right focus:outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500">支出額 (万円)</span>
                              <input
                                type="number"
                                min="0"
                                max="5000"
                                value={inputs.houseRepairAmount}
                                onChange={(e) => handleInputChange('houseRepairAmount', Number(e.target.value))}
                                className="block w-full rounded border border-slate-300 bg-white py-1 px-1.5 text-xs text-right focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 車 */}
                      <div className="flex flex-col space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inputs.carActive}
                            onChange={(e) => handleInputChange('carActive', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700">車の買い替え</span>
                        </label>
                        {inputs.carActive && (
                          <div className="grid grid-cols-2 gap-2 pl-6">
                            <div>
                              <span className="text-[10px] text-slate-500">発生年齢 (歳)</span>
                              <input
                                type="number"
                                min={inputs.currentAge}
                                max="100"
                                value={inputs.carAge}
                                onChange={(e) => handleInputChange('carAge', Math.max(inputs.currentAge, Number(e.target.value)))}
                                className="block w-full rounded border border-slate-300 bg-white py-1 px-1.5 text-xs text-right focus:outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500">支出額 (万円)</span>
                              <input
                                type="number"
                                min="0"
                                max="5000"
                                value={inputs.carAmount}
                                onChange={(e) => handleInputChange('carAmount', Number(e.target.value))}
                                className="block w-full rounded border border-slate-300 bg-white py-1 px-1.5 text-xs text-right focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 医療・介護 */}
                      <div className="flex flex-col space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inputs.medicalActive}
                            onChange={(e) => handleInputChange('medicalActive', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700">医療・介護費備え</span>
                        </label>
                        {inputs.medicalActive && (
                          <div className="grid grid-cols-2 gap-2 pl-6">
                            <div>
                              <span className="text-[10px] text-slate-500">発生年齢 (歳)</span>
                              <input
                                type="number"
                                min={inputs.currentAge}
                                max="100"
                                value={inputs.medicalAge}
                                onChange={(e) => handleInputChange('medicalAge', Math.max(inputs.currentAge, Number(e.target.value)))}
                                className="block w-full rounded border border-slate-300 bg-white py-1 px-1.5 text-xs text-right focus:outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500">支出額 (万円)</span>
                              <input
                                type="number"
                                min="0"
                                max="5000"
                                value={inputs.medicalAmount}
                                onChange={(e) => handleInputChange('medicalAmount', Number(e.target.value))}
                                className="block w-full rounded border border-slate-300 bg-white py-1 px-1.5 text-xs text-right focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 子・孫への援助 */}
                      <div className="flex flex-col space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inputs.supportActive}
                            onChange={(e) => handleInputChange('supportActive', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700">子や孫への援助</span>
                        </label>
                        {inputs.supportActive && (
                          <div className="grid grid-cols-2 gap-2 pl-6">
                            <div>
                              <span className="text-[10px] text-slate-500">発生年齢 (歳)</span>
                              <input
                                type="number"
                                min={inputs.currentAge}
                                max="100"
                                value={inputs.supportAge}
                                onChange={(e) => handleInputChange('supportAge', Math.max(inputs.currentAge, Number(e.target.value)))}
                                className="block w-full rounded border border-slate-300 bg-white py-1 px-1.5 text-xs text-right focus:outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500">支出額 (万円)</span>
                              <input
                                type="number"
                                min="0"
                                max="5000"
                                value={inputs.supportAmount}
                                onChange={(e) => handleInputChange('supportAmount', Number(e.target.value))}
                                className="block w-full rounded border border-slate-300 bg-white py-1 px-1.5 text-xs text-right focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* その他 */}
                      <div className="flex flex-col space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inputs.otherActive}
                            onChange={(e) => handleInputChange('otherActive', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700">その他大きな支出</span>
                        </label>
                        {inputs.otherActive && (
                          <div className="grid grid-cols-2 gap-2 pl-6">
                            <div>
                              <span className="text-[10px] text-slate-500">発生年齢 (歳)</span>
                              <input
                                type="number"
                                min={inputs.currentAge}
                                max="100"
                                value={inputs.otherAge}
                                onChange={(e) => handleInputChange('otherAge', Math.max(inputs.currentAge, Number(e.target.value)))}
                                className="block w-full rounded border border-slate-300 bg-white py-1 px-1.5 text-xs text-right focus:outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500">支出額 (万円)</span>
                              <input
                                type="number"
                                min="0"
                                max="5000"
                                value={inputs.otherAmount}
                                onChange={(e) => handleInputChange('otherAmount', Number(e.target.value))}
                                className="block w-full rounded border border-slate-300 bg-white py-1 px-1.5 text-xs text-right focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 配偶者詳細設定 */}
                  {inputs.hasSpouse && (
                    <div className="border-t border-slate-100 pt-5">
                      <span className="text-xs font-bold text-slate-700 block mb-3">配偶者に関する詳細設定</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* 加給年金の概算年額 */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                            <span>加給年金の概算年額</span>
                            <span className="text-slate-500 font-bold font-mono text-[11px]">
                              {formatManYen(inputs.kakyuAmount)}/年
                            </span>
                          </label>
                          <div className="relative rounded-xl shadow-2xs">
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              step="5"
                              value={inputs.kakyuAmount}
                              onChange={(e) => handleInputChange('kakyuAmount', Number(e.target.value))}
                              className="block w-full h-11 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-16 text-sm text-right focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-mono font-medium"
                            />
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                              <span className="text-xs text-slate-400 font-mono">万円/年</span>
                            </div>
                          </div>
                        </div>

                        {/* 本人の厚生年金加入期間が20年以上 */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            本人の厚生年金加入期間が20年以上
                          </label>
                          <div className="grid grid-cols-3 gap-1 bg-slate-100 rounded-xl p-0.5 h-11 items-center">
                            <button
                              type="button"
                              onClick={() => handleInputChange('ownerKosei20Years', 'yes')}
                              className={`h-10 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                inputs.ownerKosei20Years === 'yes' ? 'bg-white text-[#1D4ED8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              はい
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInputChange('ownerKosei20Years', 'no')}
                              className={`h-10 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                inputs.ownerKosei20Years === 'no' ? 'bg-white text-[#1D4ED8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              いいえ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInputChange('ownerKosei20Years', 'undecided')}
                              className={`h-10 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                inputs.ownerKosei20Years === 'undecided' ? 'bg-white text-[#1D4ED8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              不明
                            </button>
                          </div>
                        </div>

                        {/* 配偶者の厚生年金加入期間が20年以上 */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            配偶者の厚生年金加入期間が20年以上
                          </label>
                          <div className="grid grid-cols-3 gap-1 bg-slate-100 rounded-xl p-0.5 h-11 items-center">
                            <button
                              type="button"
                              onClick={() => handleInputChange('spouseKosei20Years', 'yes')}
                              className={`h-10 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                inputs.spouseKosei20Years === 'yes' ? 'bg-white text-[#1D4ED8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              はい
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInputChange('spouseKosei20Years', 'no')}
                              className={`h-10 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                inputs.spouseKosei20Years === 'no' ? 'bg-white text-[#1D4ED8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              いいえ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInputChange('spouseKosei20Years', 'undecided')}
                              className={`h-10 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                inputs.spouseKosei20Years === 'undecided' ? 'bg-white text-[#1D4ED8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              不明
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 総合確認の結果エリア (下部全幅) */}
          <div className="space-y-6">
            
            {/* 3. 結果上部のサマリーカード */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* カード1: 資産が持つ目安 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
                <div>
                  <span className="inline-block bg-blue-50 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-sm mb-2">
                    資産寿命の目安
                  </span>
                  <h3 className="font-bold text-[#002D62] text-sm mb-1.5">資産が持つ目安</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {zeroAssetAge ? (
                      <>現在の入力内容に基づくと、概算で<span className="text-[#1D4ED8] font-bold text-sm">{zeroAssetAge}歳ごろ</span>に資産残高が引き当てライン（0円）を下回る見込みです。</>
                    ) : (
                      <>現在の入力内容に基づくと、概算で<span className="text-emerald-700 font-bold text-sm">100歳時点</span>でも十分に資産が続く見込みです。</>
                    )}
                  </p>
                </div>
              </div>

              {/* カード2: 収入が少なくなりやすい期間 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
                <div>
                  <span className="inline-block bg-amber-50 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded mb-2">
                    資金取り崩し期間
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mb-1.5">収入が少なくなりやすい期間</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {inputs.retirementAge < inputs.publicPensionStartAge ? (
                      <><span className="font-semibold text-slate-900">{inputs.retirementAge}〜{inputs.publicPensionStartAge - 1}歳</span>は公的年金開始前の期間に該当するため、主に再雇用収入・退職金・金融資産で生活費を補う期間になりやすいです。</>
                    ) : (
                      <>退職時より公的年金が受給できますが、再雇用終了後など、ライフステージの変化に応じた資産推移の変化を確認することが大切です。</>
                    )}
                  </p>
                </div>
              </div>

              {/* カード3: 一時金の使い方 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
                <div>
                  <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded mb-2">
                    受取資金の活用
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mb-1.5">一時金の使い方</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    退職金（{formatManYen(inputs.retirementLumpSum)}）やDC/iDeCo一時金などは、そのまま生活口座に混ぜず、老後の取崩枠として別管理（分けて使う）しておくことで、年間の資産推移が把握しやすくなります。
                  </p>
                </div>
              </div>

              {/* カード4: 確認したいポイント */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
                <div>
                  <span className="inline-block bg-blue-50 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded mb-2">
                    見直しのヒント
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mb-1.5">確認したいポイント</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    基本生活費の想定のほか、再雇用時の実際の収入見込や、DC/iDeCoの「年金」受取を選択した場合の開始年齢を再確認いただくことで、より実態に即した推移が算出できます。
                  </p>
                </div>
              </div>
            </div>

            {/* 4. メイングラフ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 mb-4 gap-2">
                <div>
                  <h2 className="font-bold text-[#061021] text-base">年齢別のお金（収支・資産）の推移グラフ</h2>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium">
                    <span className="text-[#1D4ED8]">青い折れ線は左軸：年末資産残高</span>
                    <span className="text-slate-500">棒グラフは右軸：年間の収入・支出</span>
                  </div>
                </div>
                {zeroAssetAge && (
                  <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 animate-pulse">
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                    <span>{zeroAssetAge}歳付近で資産が0円を下回る目安</span>
                  </span>
                )}
              </div>

              <div className="mb-3 grid gap-2 border-y border-slate-100 py-3 text-[11px] leading-relaxed text-slate-600 md:grid-cols-3">
                <div>
                  <span className="block font-bold text-[#002D62]">退職前の扱い</span>
                  {inputs.currentAge < inputs.retirementAge
                    ? `${inputs.currentAge}〜${inputs.retirementAge - 1}歳は給与と生活費を収支均衡とし、現在資産を起点に据え置いて表示`
                    : '現在年齢から退職後の収支を反映'}
                </div>
                <div>
                  <span className="block font-bold text-[#002D62]">公的年金</span>
                  {inputs.publicPensionStartAge}歳から約{formatManYen(adjustedPublicPensionAmount)}/年
                  <span className="block text-slate-400">65歳基準額 {formatManYen(inputs.publicPensionAmount)}/年から換算</span>
                </div>
                <div>
                  <span className="block font-bold text-[#002D62]">退職金・DC/iDeCo</span>
                  退職金は{inputs.retirementAge}歳に{formatManYen(inputs.retirementLumpSum)}、
                  DC/iDeCoは{inputs.dcStartAge}歳から
                  {inputs.dcPayoutType === 'lump'
                    ? '一時金'
                    : inputs.dcPayoutType === 'annuity'
                      ? '10年年金'
                      : inputs.dcPayoutType === 'both'
                        ? '一時金・年金の併用'
                        : '10年年金の仮置き'}
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer key={`composed-${chartData.length}-${inputs.retirementAge}-${inputs.publicPensionStartAge}`} width="100%" height={320}>
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 20, right: 14, left: 42, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      stroke="#cbd5e1"
                    />
                    <YAxis 
                      yAxisId="left" 
                      domain={assetAxis.domain}
                      ticks={assetAxis.ticks}
                      tick={{ fill: '#1D4ED8', fontSize: 10, fontWeight: 700 }} 
                      stroke="#93b4ef"
                      label={{ value: '年末資産 (万円・左軸)', angle: -90, position: 'insideLeft', style: { fill: '#1D4ED8', fontSize: 10, fontWeight: 700 } }} 
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      stroke="#cbd5e1"
                      label={{ value: '年間収支 (万円・右軸)', angle: 90, position: 'insideRight', style: { fill: '#64748b', fontSize: 10 } }} 
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                      formatter={(value: any, name: any) => {
                        const val = Math.round(Number(value));
                        if (name === '年末資産残高（左軸）') return [`${val}万円`, name];
                        return [`${Math.abs(val)}万円`, name];
                      }}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    
                    {/* 収入スタック (プラス値) */}
                    <Bar yAxisId="right" dataKey="給与収入" stackId="income" name="給与収入" fill="#3b82f6" />
                    <Bar yAxisId="right" dataKey="退職金" stackId="income" name="退職金" fill="#60a5fa" />
                    <Bar yAxisId="right" dataKey="公的年金" stackId="income" name="公的年金" fill="#1e40af" />
                    <Bar yAxisId="right" dataKey="企業年金" stackId="income" name="企業年金" fill="#475569" />
                    <Bar yAxisId="right" dataKey="DC/iDeCo" stackId="income" name="DC/iDeCo" fill="#0284c7" />
                    <Bar yAxisId="right" dataKey="その他収入" stackId="income" name="その他収入" fill="#94a3b8" />
                    
                    {/* 支出スタック (マイナス値) */}
                    <Bar yAxisId="right" dataKey="生活費" stackId="expense" name="生活費" fill="#f87171" />
                    <Bar yAxisId="right" dataKey="大きな支出" stackId="expense" name="大きな支出" fill="#fca5a5" />
                    <Bar yAxisId="right" dataKey="住宅ローン負担" stackId="expense" name="住宅ローン・家賃負担" fill="#ef4444" />

                    {/* 資産残高 (折れ線) */}
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="資産残高" 
                      stroke="#1D4ED8" 
                      strokeWidth={3} 
                      dot={false}
                      activeDot={{ r: 4, fill: '#1D4ED8', stroke: '#ffffff', strokeWidth: 2 }}
                      name="年末資産残高（左軸）"
                    />

                    {/* 資産0基準線 */}
                    <ReferenceLine yAxisId="left" y={0} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 6. シナリオ比較 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h2 className="font-bold text-[#002D62] text-base flex items-center space-x-2">
                  <RefreshCw className="h-5 w-5 text-[#1D4ED8]" />
                  <span>DC / iDeCoの受取タイミングによるシナリオ比較</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">※受取開始年齢を変化させ、資産推移の見通し（生涯残高の目安）を比較します。</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['a', 'b', 'c'].map((scKey) => {
                  const sc = scenarioComparisons[scKey as 'a' | 'b' | 'c'];
                  const isCurrent = (scKey === 'a');
                  return (
                    <div 
                      key={scKey} 
                      className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                        isCurrent 
                          ? 'border-[#1D4ED8] bg-blue-50/20 shadow-2xs ring-1 ring-[#1D4ED8]/10' 
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-sm ${
                            isCurrent ? 'bg-[#1D4ED8] text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            シナリオ {scKey.toUpperCase()}
                          </span>
                          {isCurrent && <span className="text-[10px] font-bold text-[#1D4ED8]">現在の設定</span>}
                        </div>
                        <h3 className="font-bold text-slate-900 text-xs mb-3">{sc.title}</h3>
                        
                        <div className="space-y-2 mb-4 text-xs">
                          <div className="flex justify-between border-b border-slate-100 pb-1.5">
                            <span className="text-slate-500">資産寿命の目安</span>
                            <span className="font-bold text-slate-900">
                              {sc.zeroAge ? `${sc.zeroAge}歳ごろ` : '100歳以上'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1.5">
                            <span className="text-slate-500">65歳時点の残高</span>
                            <span className="font-bold text-slate-900">{formatManYen(sc.asset65)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1.5">
                            <span className="text-slate-500">75歳時点の残高</span>
                            <span className="font-bold text-slate-900">{formatManYen(sc.asset75)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1.5">
                            <span className="text-slate-500">85歳時点の残高</span>
                            <span className="font-bold text-slate-900">{formatManYen(sc.asset85)}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-normal bg-slate-50 rounded-lg p-2.5 border border-slate-100 mt-2">
                        {sc.memo}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7. 入力内容から見た整理 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h2 className="font-bold text-[#002D62] text-base flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-[#1D4ED8]" />
                  <span>入力内容から見た整理・確認ポイント</span>
                </h2>
              </div>

              <div className="space-y-3">
                {organizedPoints.map((point, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5">
                    <div className="bg-blue-50 text-[#1D4ED8] rounded-full p-1 mt-0.5 flex-shrink-0">
                      <Check className="h-3 w-3" />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. 年齢別キャッシュフロー表 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="bg-slate-50/55 px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h2 className="font-bold text-[#002D62] text-sm sm:text-base">年齢別キャッシュフロー推移表</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">※初期表示は5年刻み＆重要な節目年齢です。「すべて表示」で1年刻みの表を展開できます。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllYearsTable(!showAllYearsTable)}
                  className="px-3.5 py-2 text-xs font-bold text-[#1D4ED8] hover:text-[#1D4ED8]/90 bg-[#1D4ED8]/10 hover:bg-[#1D4ED8]/20 rounded-xl transition-all cursor-pointer"
                >
                  {showAllYearsTable ? '主要年のみ表示（5年刻み等）' : 'すべての年齢を表示（1年刻み）'}
                </button>
              </div>

              <div className="min-w-0">
                <table className="w-full table-fixed border-collapse text-left text-[11px] sm:text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-bold">
                      <th className="py-2.5 px-1 sm:px-2 md:px-3 text-center">年齢</th>
                      <th className="hidden px-1 py-2.5 text-right md:table-cell sm:px-2 md:px-3">給与・退職金等</th>
                      <th className="hidden px-1 py-2.5 text-right sm:table-cell sm:px-2 md:px-3">年金受取額(合計)</th>
                      <th className="hidden px-1 py-2.5 text-right md:table-cell sm:px-2 md:px-3">支出額(生活費等)</th>
                      <th className="py-2.5 px-1 sm:px-2 md:px-3 text-right">年間収支</th>
                      <th className="py-2.5 px-1 sm:px-2 md:px-3 text-right">年末資産残高</th>
                      <th className="hidden px-1.5 py-2.5 text-left lg:table-cell sm:px-3">主なトピック</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row) => {
                      const isZeroOrNegative = row.endOfYearAsset < 0;
                      const isMilestone = 
                        row.age === inputs.currentAge || 
                        row.age === inputs.retirementAge || 
                        row.age === inputs.workUntilAge ||
                        row.age === zeroAssetAge;

                      // 年金合計
                      const pensionSum = row.publicPension + row.corporatePension + row.dcIncome;
                      // 給与・退職金・その他収入
                      const primaryIncome = row.salaryIncome + row.retirementLumpSum + row.otherIncome;

                      return (
                        <tr 
                          key={row.age} 
                          className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                            isZeroOrNegative ? 'bg-red-50/30' : isMilestone ? 'bg-blue-50/10 font-medium' : ''
                          }`}
                        >
                          <td className="py-2.5 px-1 sm:px-2 md:px-3 text-center font-bold text-slate-900">
                            {row.age}歳
                          </td>
                          <td className="hidden px-1 py-2.5 text-right text-slate-600 md:table-cell sm:px-2 md:px-3">
                            {primaryIncome > 0 ? `${Math.round(primaryIncome)}万円` : '-'}
                          </td>
                          <td className="hidden px-1 py-2.5 text-right text-slate-700 sm:table-cell sm:px-2 md:px-3">
                            {pensionSum > 0 ? `${Math.round(pensionSum)}万円` : '-'}
                          </td>
                          <td className="hidden px-1 py-2.5 text-right text-red-600 md:table-cell sm:px-2 md:px-3">
                            {row.totalExpense > 0 ? `▲${Math.round(row.totalExpense)}万円` : '-'}
                          </td>
                          <td className={`py-2.5 px-1 sm:px-2 md:px-3 text-right font-semibold ${
                            row.netCashFlow > 0 ? 'text-emerald-700' : row.netCashFlow < 0 ? 'text-red-700' : 'text-slate-600'
                          }`}>
                            {row.netCashFlow > 0 ? `+${Math.round(row.netCashFlow)}` : row.netCashFlow < 0 ? `▲${Math.abs(Math.round(row.netCashFlow))}` : '0'}万円
                          </td>
                          <td className={`py-2.5 px-1 sm:px-2 md:px-3 text-right font-bold ${
                            isZeroOrNegative ? 'text-red-700' : 'text-slate-900'
                          }`}>
                            {Math.round(row.endOfYearAsset).toLocaleString()}万円
                          </td>
                          <td className="hidden max-w-xs truncate px-1.5 py-2.5 text-left leading-normal text-slate-500 lg:table-cell sm:px-3" title={row.memo}>
                            {row.memo || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        </div>

        {/* 9. 注意書き */}
        <div className="mt-12 border-t border-slate-200 pt-6 space-y-2">
          <p className="text-[10px] leading-relaxed text-slate-400 text-center">
            このシミュレーションは、入力内容と概算式にもとづく目安です。税額、社会保険料、運用成果、物価、医療・介護費などは実際と異なる場合があります。将来の生活設計を考えるための参考情報としてご利用ください。
          </p>
          <p className="text-[10px] leading-relaxed text-slate-400 text-center">
            配偶者の年金と加給年金は、世帯収入として簡易的に反映しています。加給年金の実際の対象可否、振替加算、遺族年金、税金・社会保険料への影響は個別条件により異なります。
          </p>
        </div>
      </main>
    </div>
  );
}

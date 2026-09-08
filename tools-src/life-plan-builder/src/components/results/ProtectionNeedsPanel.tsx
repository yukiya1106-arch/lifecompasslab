/**
 * 必要保障額＆死亡保障比較パネル (ProtectionNeedsPanel.tsx)
 * 
 * 年齢ごとの必要保障額、現在加入中の死亡保障額、不足額・余力をグラフとカードで可視化します。
 */

import React, { useState, useMemo } from 'react';
import { LifePlanInput, InsuredPerson, AnnualCashflowRow } from '../../types/lifeplan';
import { calculateProtectionNeedsAnalysis, ProtectionNeedsAgeData } from '../../engine/protection';
import { calculateSurvivorBenefitEstimate } from '../../utils/pension';
import { getThemeColor } from '../../utils/theme';
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ProtectionNeedsPanelProps {
  input: LifePlanInput;
  rows: AnnualCashflowRow[];
  onUpdateInput?: (newInput: LifePlanInput) => void;
}

export const ProtectionNeedsPanel: React.FC<ProtectionNeedsPanelProps> = ({
  input,
  rows,
  onUpdateInput,
}) => {
  const [selectedPerson, setSelectedPerson] = useState<InsuredPerson>('person');
  const [selectedAge, setSelectedAge] = useState<number | null>(null);

  // テーマカラー取得
  const primaryColor = getThemeColor('--app-primary', '#1e3a8a');

  // 扶養家族（配偶者なし・子ども0人）のチェック
  const hasDependents = input.hasSpouse || (input.children && input.children.length > 0);

  // 必要保障額分析データ算出
  const analysis = useMemo(() => {
    return calculateProtectionNeedsAnalysis(input, rows, selectedPerson);
  }, [input, rows, selectedPerson]);

  // 選択中のシナリオ
  const currentScenario = selectedPerson === 'person'
    ? input.insurance.protectionScenarios.personDeath
    : input.insurance.protectionScenarios.spouseDeath;

  const useEstimated = currentScenario?.useEstimatedSurvivorBenefit !== false;
  const estimatedSurvivorBenefit = useMemo(() => {
    return calculateSurvivorBenefitEstimate(input, selectedPerson).annualAmount;
  }, [input, selectedPerson]);
  const isSurvivorBenefitZero = useEstimated
    ? estimatedSurvivorBenefit === 0
    : currentScenario?.annualSurvivorBenefit === 0;

  // 選択された年齢のデータを特定 (デフォルトは開始年齢)
  const activeData: ProtectionNeedsAgeData | undefined = useMemo(() => {
    if (analysis.data.length === 0) return undefined;
    if (selectedAge !== null) {
      const found = analysis.data.find((d) => d.insuredAge === selectedAge);
      if (found) return found;
    }
    return analysis.data[0];
  }, [analysis, selectedAge]);

  // 扶養家族がいない場合の案内表示
  if (!hasDependents) {
    return (
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 pb-4 border-b border-gray-100">
          <Shield className="w-5 h-5 text-[var(--app-primary,#1e3a8a)]" />
          <h3 className="text-base font-bold text-[#1E293B]">必要保障額(概算) ＆ 現在の死亡保障比較</h3>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-600 leading-relaxed space-y-1">
          <p className="font-bold text-slate-800">
            配偶者・子どもなどの扶養家族がいない場合、本機能による生活保障の簡易算定は対象外です。
          </p>
          <p className="text-slate-500">
            葬儀費用、債務、相続対策等は個別にご確認ください。
          </p>
        </div>
      </div>
    );
  }

  // ツールチップコンポーネント
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload as ProtectionNeedsAgeData;

    return (
      <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-slate-200 shadow-md text-xs space-y-1.5">
        <p className="font-bold text-slate-800 border-b pb-1 border-slate-100">
          {data.insuredAge}歳時点 ({data.year}年)
        </p>
        <div className="space-y-0.5">
          <p className="text-slate-600 flex justify-between gap-4">
            <span>必要保障額(概算)：</span>
            <strong className="text-slate-900">{data.protectionNeeds.toLocaleString()} 万円</strong>
          </p>
          <p className="text-emerald-700 flex justify-between gap-4">
            <span>現在の死亡保障：</span>
            <strong className="text-emerald-800">{data.currentCoverage.toLocaleString()} 万円</strong>
          </p>
          {data.shortfall > 0 ? (
            <p className="text-rose-600 font-bold flex justify-between gap-4 pt-1 border-t border-slate-100">
              <span>計算上の保障不足：</span>
              <span>-{data.shortfall.toLocaleString()} 万円</span>
            </p>
          ) : (
            <p className="text-emerald-600 font-bold flex justify-between gap-4 pt-1 border-t border-slate-100">
              <span>計算上の保障余力：</span>
              <span>+{data.surplus.toLocaleString()} 万円</span>
            </p>
          )}
        </div>
        <p className="text-[10px] text-slate-400 pt-0.5">※クリック・タップで詳細数値を固定表示</p>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-xs space-y-6">
      
      {/* パネルヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-[var(--app-primary,#1e3a8a)]" />
            <h3 className="text-base font-bold text-[#1E293B]">必要保障額(概算) ＆ 現在の死亡保障比較</h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            万一の際の必要保障額と現在契約中の死亡保障額を年齢別に比較します。
          </p>
        </div>

        {/* 本人 / 配偶者 タブ */}
        {input.hasSpouse && (
          <div className="flex items-center p-1 bg-gray-100/80 rounded-2xl text-xs font-bold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedPerson('person');
                setSelectedAge(null);
              }}
              className={`px-4 py-1.5 rounded-xl transition-all ${
                selectedPerson === 'person'
                  ? 'bg-[var(--app-primary,#1e3a8a)] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              本人
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPerson('spouse');
                setSelectedAge(null);
              }}
              className={`px-4 py-1.5 rounded-xl transition-all ${
                selectedPerson === 'spouse'
                  ? 'bg-[var(--app-primary,#1e3a8a)] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              配偶者
            </button>
          </div>
        )}
      </div>

      {/* 保障を考える期間のカスタマイズバー */}
      <div className="bg-slate-50 border border-slate-200/80 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-slate-800">保障を考える期間：</span>
            <span className="text-slate-600 ml-1 font-semibold">
              {(currentScenario?.calculationEndAge ?? 65) === input.calculationEndAge || (currentScenario?.calculationEndAge ?? 65) >= 90
                ? `ライフプラン終了まで (${input.calculationEndAge}歳)`
                : `${currentScenario?.calculationEndAge ?? 65}歳まで`}
            </span>
          </div>
        </div>

        {onUpdateInput && (
          <div className="flex items-center space-x-1.5 flex-wrap">
            <span className="text-xs text-slate-500 font-semibold mr-1">保障を考える期間:</span>
            {Array.from(new Set([60, 65, 70, input.calculationEndAge])).map((age) => {
              const currentAge = currentScenario?.calculationEndAge ?? 65;
              const isSelected = age === input.calculationEndAge
                ? (currentAge === input.calculationEndAge || currentAge >= 90)
                : currentAge === age;
              return (
                <button
                  key={age}
                  type="button"
                  onClick={() => {
                    const key = selectedPerson === 'person' ? 'personDeath' : 'spouseDeath';
                    const newScenarios = {
                      ...input.insurance.protectionScenarios,
                      [key]: {
                        ...input.insurance.protectionScenarios[key],
                        calculationEndAge: age,
                      },
                    };
                    onUpdateInput({
                      ...input,
                      insurance: {
                        ...input.insurance,
                        protectionScenarios: newScenarios,
                      },
                    });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[var(--app-primary,#1e3a8a)] text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {age === input.calculationEndAge ? 'ライフプラン終了まで' : `${age}歳まで`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 遺族年金等0円時の注意パネル */}
      {isSurvivorBenefitZero && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-950">
              遺族年金等が0円で計算されています。
            </p>
            <p className="text-amber-800 leading-relaxed">
              公的保障等を反映していないため、必要保障額が大きく表示される可能性があります。
              STEP3の『必要保障額の計算前提』にて、現在の年収や家族構成に基づいた公的遺族年金の目安を自動計算・反映できます。
            </p>
          </div>
        </div>
      )}

      {/* 3つのサマリーカード (選択年齢の数値表示) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* カード1: 必要保障額 */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
          <p className="text-xs font-semibold text-slate-500">必要保障額 (概算)</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900">
            {activeData ? `${activeData.protectionNeeds.toLocaleString()} 万円` : '-'}
          </p>
          <p className="text-[11px] text-slate-500">
            {activeData ? `${activeData.insuredAge}歳時点 (${activeData.year}年)` : ''}
          </p>
        </div>

        {/* カード2: 現在の死亡保障 */}
        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-1">
          <p className="text-xs font-semibold text-emerald-800">現在の死亡保障</p>
          <p className="text-xl sm:text-2xl font-black text-emerald-900">
            {activeData ? `${activeData.currentCoverage.toLocaleString()} 万円` : '-'}
          </p>
          <p className="text-[11px] text-emerald-700">
            {activeData ? `${activeData.insuredAge}歳時点の保障合計` : ''}
          </p>
        </div>

        {/* カード3: 保障不足または保障余力 */}
        {activeData && activeData.shortfall > 0 ? (
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 space-y-1">
            <div className="flex items-center space-x-1 text-rose-800 font-bold text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>計算上の保障不足</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-600">
              -{activeData.shortfall.toLocaleString()} 万円
            </p>
            <p className="text-[11px] text-rose-700">必要保障額に対する不足試算額</p>
          </div>
        ) : (
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 space-y-1">
            <div className="flex items-center space-x-1 text-blue-800 font-bold text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>計算上の保障余力</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-blue-700">
              +{activeData ? activeData.surplus.toLocaleString() : 0} 万円
            </p>
            <p className="text-[11px] text-blue-700">必要保障額に対する保障余力</p>
          </div>
        )}
      </div>

      {/* 積み上げ棒＋折れ線 グラフ */}
      <div className="pt-2">
        <p className="text-xs font-semibold text-slate-600 mb-2">
          【推移グラフ】バーをタップすると年齢ごとの試算結果を上に表示します
        </p>

        <div className="w-full h-[320px] sm:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={analysis.data}
              margin={{ top: 20, right: 15, bottom: 20, left: 10 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                  const payload = state.activePayload[0].payload as ProtectionNeedsAgeData;
                  if (payload) {
                    setSelectedAge(payload.insuredAge);
                  }
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="insuredAge"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) => `${val}歳`}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) => `${val}万`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 12, fontSize: '12px' }}
                formatter={(value) => {
                  if (value === 'coveredAmount') return '必要保障額(概算 - カバー済み分)';
                  if (value === 'shortfall') return '保障不足部分';
                  if (value === 'currentCoverage') return '現在の死亡保障';
                  return value;
                }}
              />
              {/* 積み上げ棒: 必要保障額のうちカバー済み(テーマカラー) + 不足(赤) */}
              <Bar dataKey="coveredAmount" stackId="needs" fill={primaryColor} name="coveredAmount" />
              <Bar dataKey="shortfall" stackId="needs" fill="#ef4444" name="shortfall" radius={[4, 4, 0, 0]} />
              {/* 折れ線: 現在の死亡保障(緑) */}
              <Line
                type="monotone"
                dataKey="currentCoverage"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 2.5, fill: '#10b981' }}
                activeDot={{ r: 5, fill: '#059669' }}
                name="currentCoverage"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 注意書き */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-600 space-y-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-800">
          <Info className="w-4 h-4 text-slate-500" />
          <span>【グラフおよび計算に関するご注意事項】</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-500 leading-relaxed pl-1">
          <li>入力された生活費割合、遺族年金等の見込額、葬儀・整理資金、住宅ローンの団信条件をもとに試算しています。</li>
          <li>税制や公的遺族年金・遺族補償等を精密に自動計算するものではありません。</li>
          <li>収入保障保険は月額受取額 × 12 × 残存年数による概算です。</li>
          <li>実際の保険商品内容、特約条件、保険金支払条件とは異なる可能性があります。</li>
          <li>最終的な判断はご利用者様または専門家（FP・保険募集人等）が行ってください。</li>
        </ul>
      </div>

    </div>
  );
};

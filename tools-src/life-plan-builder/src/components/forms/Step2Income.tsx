/**
 * STEP 2: 収入・働き方 フォーム
 */

import React from 'react';
import { LifePlanInput, PersonIncomeInput, IncomeChangeEvent, WorkStyle, PensionType } from '../../types/lifeplan';
import { calculateAnnualPersonIncome, getEstimatedNetIncome } from '../../engine/income';
import { getInitialPensionTypeForWorkStyle } from '../../engine/normalization';
import { Briefcase, Plus, Trash2, AlertTriangle, TrendingUp, HelpCircle } from 'lucide-react';

interface Step2IncomeProps {
  input: LifePlanInput;
  onChange: (updated: LifePlanInput) => void;
}

const WORK_STYLE_OPTIONS: { value: WorkStyle; label: string }[] = [
  { value: 'employee', label: '会社員' },
  { value: 'public_servant', label: '公務員' },
  { value: 'part_time', label: 'パート・アルバイト' },
  { value: 'self_employed', label: '自営業・フリーランス' },
  { value: 'not_working', label: '無職・専業' },
  { value: 'other', label: 'その他' },
];

const PENSION_TYPE_OPTIONS: { value: PensionType; label: string }[] = [
  { value: 'employees_pension', label: '厚生年金に加入' },
  { value: 'national_pension_only', label: '国民年金のみ' },
  { value: 'unknown', label: '分からない' },
];

export const Step2Income: React.FC<Step2IncomeProps> = ({ input, onChange }) => {
  const [activeTab, setActiveTab] = React.useState<'person' | 'spouse'>('person');

  const updatePersonIncome = (fields: Partial<PersonIncomeInput>) => {
    onChange({
      ...input,
      personIncome: { ...input.personIncome, ...fields },
    });
  };

  const updateSpouseIncome = (fields: Partial<PersonIncomeInput>) => {
    onChange({
      ...input,
      spouseIncome: { ...input.spouseIncome, ...fields },
    });
  };

  const currentData = activeTab === 'person' ? input.personIncome : input.spouseIncome;
  const currentAge = activeTab === 'person' ? input.personAge : input.spouseAge;
  const updateCurrentData = activeTab === 'person' ? updatePersonIncome : updateSpouseIncome;

  const workStyle = currentData.workStyle ?? 'employee';
  const pensionType = currentData.pensionType ?? 'employees_pension';

  const getIncomeLabels = (style: WorkStyle) => {
    switch (style) {
      case 'self_employed':
        return { gross: '年間事業所得', net: '生活に使える年間手取り額' };
      case 'not_working':
        return { gross: '年間収入', net: '生活に使える年間手取り額' };
      case 'other':
        return { gross: '年間収入', net: '手取り年収' };
      case 'employee':
      case 'public_servant':
      case 'part_time':
      default:
        return { gross: '額面年収', net: '手取り年収' };
    }
  };

  const labels = getIncomeLabels(workStyle);
  const isEstimatedNet = currentData.currentNetIncome === undefined;
  const estimatedNetAmount = getEstimatedNetIncome(currentData.currentGrossIncome, workStyle);

  // 働き方変更時の処理 (年金加入区分の初期値を自動連動)
  const handleWorkStyleChange = (newStyle: WorkStyle) => {
    const defaultPensionType = getInitialPensionTypeForWorkStyle(newStyle);
    updateCurrentData({
      workStyle: newStyle,
      pensionType: defaultPensionType,
    });
  };

  const handleAddEvent = () => {
    const newEvent: IncomeChangeEvent = {
      id: `ice_${Date.now()}`,
      age: currentAge + 10,
      grossAmount: currentData.currentGrossIncome > 0 ? Math.round(currentData.currentGrossIncome * 1.2) : 500,
    };
    updateCurrentData({
      incomeChangeEvents: [...currentData.incomeChangeEvents, newEvent],
    });
  };

  const handleRemoveEvent = (id: string) => {
    updateCurrentData({
      incomeChangeEvents: currentData.incomeChangeEvents.filter((ev) => ev.id !== id),
    });
  };

  const handleUpdateEvent = (id: string, fields: Partial<IncomeChangeEvent>) => {
    updateCurrentData({
      incomeChangeEvents: currentData.incomeChangeEvents.map((ev) =>
        ev.id === id ? { ...ev, ...fields } : ev
      ),
    });
  };

  // ミニプレビューグラフ用のデータ生成
  const previewPoints = React.useMemo(() => {
    const points: { age: number; netSalary: number; pension: number }[] = [];
    const maxAge = Math.min(85, currentAge + 45);
    for (let a = currentAge; a <= maxAge; a += 1) {
      const inc = calculateAnnualPersonIncome(currentData, currentAge, a);
      points.push({ age: a, netSalary: Math.round(inc.netSalary), pension: Math.round(inc.pension) });
    }
    return points;
  }, [currentData, currentAge]);

  // 額面と手取りの警告判定
  const netRatioWarning = React.useMemo(() => {
    if (currentData.currentGrossIncome > 0 && currentData.currentNetIncome !== undefined) {
      const ratio = currentData.currentNetIncome / currentData.currentGrossIncome;
      if (ratio < 0.5 || ratio > 0.95) {
        return `額面年収(${currentData.currentGrossIncome}万円)に対する手取り年収(${currentData.currentNetIncome}万円)の割合(${Math.round(ratio * 100)}%)が一般的な水準(約75〜85%)から大きく離れています。手取り実入力がそのまま優先使用されます。`;
      }
    }
    return null;
  }, [currentData.currentGrossIncome, currentData.currentNetIncome]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg border-b pb-2 border-slate-200">
        <Briefcase className="w-5 h-5 text-[var(--app-accent,#2563eb)]" />
        <span>STEP 2：収入・働き方</span>
      </div>

      {/* 本人 / 配偶者 切替タブ */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          type="button"
          onClick={() => setActiveTab('person')}
          className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'person'
              ? 'border-[var(--app-accent,#2563eb)] text-[var(--app-accent,#2563eb)]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          本人 ({input.personAge}歳)
        </button>
        {input.hasSpouse && (
          <button
            type="button"
            onClick={() => setActiveTab('spouse')}
            className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition ${
              activeTab === 'spouse'
                ? 'border-[var(--app-accent,#2563eb)] text-[var(--app-accent,#2563eb)]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            配偶者 ({input.spouseAge}歳)
          </button>
        )}
      </div>

      {netRatioWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{netRatioWarning}</span>
        </div>
      )}

      {/* 働き方・年金加入区分 選択部 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="font-semibold text-slate-700 text-sm">現在の働き方・年金加入区分</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">現在の働き方</label>
            <select
              value={workStyle}
              onChange={(e) => handleWorkStyleChange(e.target.value as WorkStyle)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
            >
              {WORK_STYLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">現在の年金加入区分</label>
            <select
              value={pensionType}
              onChange={(e) => updateCurrentData({ pensionType: e.target.value as PensionType })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
            >
              {PENSION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
          給与明細で『厚生年金保険料』が引かれている場合は、通常『厚生年金に加入』を選択します。分からない場合は、そのまま進めることができます。
        </p>
      </div>

      {/* フォーム入力部 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 左側：現在の年収と昇給・退職 */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <h4 className="font-semibold text-slate-700 text-sm">給与・就労設定</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{labels.gross}</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={currentData.currentGrossIncome}
                  onChange={(e) => updateCurrentData({ currentGrossIncome: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                />
                <span className="text-xs text-slate-600 font-medium">万円</span>
              </div>
              {workStyle === 'self_employed' && (
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  売上ではなく、売上から必要経費を差し引いた年間の事業所得を入力してください。
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-600">
                  {labels.net}
                </label>
                {isEstimatedNet && (
                  <span className="text-[10px] font-semibold text-[var(--app-accent,#2563eb)] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    概算手取り
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={currentData.currentNetIncome ?? ''}
                  onChange={(e) => updateCurrentData({ currentNetIncome: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder={`概算 ${estimatedNetAmount}万円`}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none placeholder:text-slate-400"
                />
                <span className="text-xs text-slate-600 font-medium">万円</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                税金や社会保険料等を簡易的に見込んだ概算値です。実際の手取り額が分かる場合は上書きしてください。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">退職予定年齢</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min={50}
                  max={80}
                  value={currentData.retirementAge}
                  onChange={(e) => updateCurrentData({ retirementAge: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                />
                <span className="text-xs text-slate-600 font-medium">歳</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">想定昇給率 (年率)</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  step={0.1}
                  min={-5}
                  max={10}
                  value={currentData.annualGrowthRate}
                  onChange={(e) => updateCurrentData({ annualGrowthRate: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                />
                <span className="text-xs text-slate-600 font-medium">%</span>
              </div>
            </div>
          </div>

          {/* 年収変更イベント ("○歳から年収○万円") */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">ステップ変更イベント (○歳から額面○万円)</span>
              <button
                type="button"
                onClick={handleAddEvent}
                className="flex items-center space-x-1 text-xs font-semibold text-[var(--app-accent,#2563eb)] hover:opacity-80"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>追加</span>
              </button>
            </div>

            {currentData.incomeChangeEvents.length === 0 ? (
              <p className="text-xs text-slate-400 italic">役職定年や転職、再雇用などの年収変化を追加できます。</p>
            ) : (
              <div className="space-y-2">
                {currentData.incomeChangeEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                    <input
                      type="number"
                      min={currentAge}
                      max={80}
                      value={ev.age}
                      onChange={(e) => handleUpdateEvent(ev.id, { age: Number(e.target.value) })}
                      className="w-16 border rounded px-1.5 py-1 text-center"
                    />
                    <span>歳から 額面</span>
                    <input
                      type="number"
                      step={10}
                      value={ev.grossAmount}
                      onChange={(e) => handleUpdateEvent(ev.id, { grossAmount: Number(e.target.value) })}
                      className="w-20 border rounded px-1.5 py-1 text-center"
                    />
                    <span>万円/年</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEvent(ev.id)}
                      className="text-slate-400 hover:text-red-500 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* 右側：年金・退職金 & プレビュー */}
        <div className="space-y-4">
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="font-semibold text-slate-700 text-sm">年金・退職金設定</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">公的年金見込額</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step={10}
                    value={currentData.pensionEstimate}
                    onChange={(e) => updateCurrentData({ pensionEstimate: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                  />
                  <span className="text-xs text-slate-600 font-medium">万円/年</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">年金開始年齢</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={60}
                    max={75}
                    value={currentData.pensionStartAge}
                    onChange={(e) => updateCurrentData({ pensionStartAge: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                  />
                  <span className="text-xs text-slate-600 font-medium">歳</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200 leading-normal">
              年金定期便やねんきんネットの見込額が分かる場合は入力してください。
              分からない場合は仮入力のままシミュレーションできます。
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">退職金 (一括)</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step={50}
                    value={currentData.retirementAllowance}
                    onChange={(e) => updateCurrentData({ retirementAllowance: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                  />
                  <span className="text-xs text-slate-600 font-medium">万円</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">退職金受取年齢</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={50}
                    max={75}
                    value={currentData.retirementAllowanceAge}
                    onChange={(e) => updateCurrentData({ retirementAllowanceAge: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
                  />
                  <span className="text-xs text-slate-600 font-medium">歳</span>
                </div>
              </div>
            </div>
          </div>

          {/* 年収推移プレビュー */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <TrendingUp className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
                <span>年収・年金 推移プレビュー</span>
              </span>
              <span className="text-xs text-slate-400">手取り＋年金概算</span>
            </div>

            <div className="h-28 flex items-end space-x-1 pt-4 pb-1 px-1 border-b border-slate-200">
              {previewPoints.map((pt) => {
                const total = pt.netSalary + pt.pension;
                const maxVal = Math.max(...previewPoints.map(p => p.netSalary + p.pension), 100);
                const salaryHeightPct = (pt.netSalary / maxVal) * 100;
                const pensionHeightPct = (pt.pension / maxVal) * 100;

                return (
                  <div key={pt.age} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                      {pt.age}歳: {total}万円
                    </div>

                    <div className="w-full max-w-[12px] flex flex-col justify-end h-full">
                      {pt.pension > 0 && (
                        <div style={{ height: `${pensionHeightPct}%` }} className="bg-emerald-500 rounded-t-xs" />
                      )}
                      {pt.netSalary > 0 && (
                        <div style={{ height: `${salaryHeightPct}%` }} className="bg-[var(--app-accent,#2563eb)] rounded-xs" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>{currentAge}歳</span>
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-xs bg-[var(--app-accent,#2563eb)] inline-block"></span><span>給与手取り (概算/実入力)</span></span>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span><span>公的年金</span></span>
              </div>
              <span>{Math.min(85, currentAge + 45)}歳</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};


/**
 * 条件入力ページ (InputPage)
 * 
 * STEP 1 〜 STEP 10 のアコーディオン/ステップナビゲーション形式フォーム
 */

import React from 'react';
import { LifePlanInput } from '../types/lifeplan';
import { Step1Basic } from '../components/forms/Step1Basic';
import { Step2Income } from '../components/forms/Step2Income';
import { Step3Living } from '../components/forms/Step3Living';
import { Step4Education } from '../components/forms/Step4Education';
import { Step5CurrentHousing } from '../components/forms/Step5CurrentHousing';
import { Step6FutureHousing } from '../components/forms/Step6FutureHousing';
import { Step7Assets } from '../components/forms/Step7Assets';
import { Step8Investment } from '../components/forms/Step8Investment';
import { Step9Dc } from '../components/forms/Step9Dc';
import { Step10OneOff } from '../components/forms/Step10OneOff';
import { appConfig } from '../config/appConfig';
import {
  Users,
  Briefcase,
  ShoppingBag,
  GraduationCap,
  Home,
  Building,
  Wallet,
  TrendingUp,
  Lock,
  Calendar,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  RotateCcw,
} from 'lucide-react';

interface InputPageProps {
  input: LifePlanInput;
  onChange: (updated: LifePlanInput) => void;
  onNavigateToResult: () => void;
  onResetToDefault: () => void;
}

const ALL_STEPS = [
  { id: 1, key: 'basic' as const, title: '基本情報', icon: Users },
  { id: 2, key: 'income' as const, title: '収入・働き方', icon: Briefcase },
  { id: 3, key: 'living' as const, title: '生活費・物価・保険', icon: ShoppingBag },
  { id: 4, key: 'education' as const, title: '教育費', icon: GraduationCap },
  { id: 5, key: 'currentHousing' as const, title: '現在の住まい', icon: Home },
  { id: 6, key: 'futureHousing' as const, title: '将来の住宅計画', icon: Building },
  { id: 7, key: 'assets' as const, title: '金融資産残高', icon: Wallet },
  { id: 8, key: 'investment' as const, title: '運用＆取り崩し', icon: TrendingUp },
  { id: 9, key: 'dc' as const, title: 'DC・iDeCo', icon: Lock },
  { id: 10, key: 'oneOff' as const, title: '一時収支', icon: Calendar },
];

export const InputPage: React.FC<InputPageProps> = ({
  input,
  onChange,
  onNavigateToResult,
  onResetToDefault,
}) => {
  // visibleSteps のフィルタリング (すべて false の場合も考慮)
  const visibleSteps = React.useMemo(() => {
    const filtered = ALL_STEPS.filter((step) => appConfig.visibleSteps[step.key]);
    return filtered.length > 0 ? filtered : ALL_STEPS;
  }, []);

  const [activeStepId, setActiveStepId] = React.useState<number>(() => {
    return visibleSteps[0]?.id ?? 1;
  });

  const currentVisibleIndex = visibleSteps.findIndex((s) => s.id === activeStepId);
  const currentStepObj = (currentVisibleIndex >= 0 ? visibleSteps[currentVisibleIndex] : visibleSteps[0]) ?? ALL_STEPS[0];

  const nextStep = () => {
    if (currentVisibleIndex >= 0 && currentVisibleIndex < visibleSteps.length - 1) {
      const nextStepObj = visibleSteps[currentVisibleIndex + 1];
      if (nextStepObj) {
        setActiveStepId(nextStepObj.id);
      }
    } else {
      onNavigateToResult();
    }
  };

  const prevStep = () => {
    if (currentVisibleIndex > 0) {
      const prevStepObj = visibleSteps[currentVisibleIndex - 1];
      if (prevStepObj) {
        setActiveStepId(prevStepObj.id);
      }
    }
  };

  const isFirst = currentVisibleIndex <= 0;
  const isLast = currentVisibleIndex >= visibleSteps.length - 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* ページタイトルバー */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-[#1E293B]">{appConfig.appName} シミュレーション条件入力</h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-[var(--app-primary,#1e3a8a)] border border-slate-200">
              {visibleSteps.length}ステップ
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            {appConfig.description || '条件を変更すると年次キャッシュフローと金融資産残高が即座に再計算され、自動保存されます。'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onResetToDefault}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>初期値へリセット</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToResult}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[var(--app-primary,#1e3a8a)] text-white shadow-xs hover:opacity-90 transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            <span>シミュレーション結果を見る</span>
          </button>
        </div>
      </div>

      {/* ステップ ナビゲーション */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[760px] gap-1.5">
          {visibleSteps.map((step) => {
            const Icon = step.icon;
            const isActive = activeStepId === step.id;
            const stepIdx = visibleSteps.findIndex(s => s.id === step.id);
            const isCompleted = currentVisibleIndex > stepIdx;
            const stepNum = step.id < 10 ? `0${step.id}` : `${step.id}`;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStepId(step.id)}
                className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center space-y-1 transition-all ${
                  isActive
                    ? 'bg-[var(--app-primary,#1e3a8a)] text-white shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <span className={`text-[10px] font-extrabold ${isActive ? 'opacity-80' : isCompleted ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {stepNum}
                  </span>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="whitespace-nowrap text-[11px] tracking-tight">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ステップコンテンツ表示部 */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-xs min-h-[400px]">
        {currentStepObj?.id === 1 && <Step1Basic input={input} onChange={onChange} />}
        {currentStepObj?.id === 2 && <Step2Income input={input} onChange={onChange} />}
        {currentStepObj?.id === 3 && <Step3Living input={input} onChange={onChange} />}
        {currentStepObj?.id === 4 && <Step4Education input={input} onChange={onChange} />}
        {currentStepObj?.id === 5 && <Step5CurrentHousing input={input} onChange={onChange} />}
        {currentStepObj?.id === 6 && <Step6FutureHousing input={input} onChange={onChange} />}
        {currentStepObj?.id === 7 && <Step7Assets input={input} onChange={onChange} />}
        {currentStepObj?.id === 8 && <Step8Investment input={input} onChange={onChange} />}
        {currentStepObj?.id === 9 && <Step9Dc input={input} onChange={onChange} />}
        {currentStepObj?.id === 10 && <Step10OneOff input={input} onChange={onChange} />}
      </div>

      {/* フッター操作ボタン */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={prevStep}
          disabled={isFirst}
          className={`flex items-center space-x-1.5 px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
            isFirst
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-gray-200/80 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>前へ</span>
        </button>

        <span className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
          Step {currentVisibleIndex + 1} of {visibleSteps.length}
        </span>

        <button
          type="button"
          onClick={nextStep}
          className="flex items-center space-x-1.5 px-6 py-2.5 rounded-full text-xs font-bold bg-[var(--app-primary,#1e3a8a)] text-white hover:opacity-90 transition-all shadow-xs"
        >
          <span>{isLast ? '診断結果を見る' : '次へ進む'}</span>
          {isLast ? <BarChart3 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>

    </div>
  );
};

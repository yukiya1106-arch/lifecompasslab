/**
 * STEP 4: 教育費 フォーム
 */

import React from 'react';
import { LifePlanInput, ChildInput, SchoolType, UniversityLivingType } from '../../types/lifeplan';
import { defaultEducationCostsMaster } from '../../data/educationCosts';
import { GraduationCap, BookOpen, Building, Home, CheckCircle2 } from 'lucide-react';

interface Step4EducationProps {
  input: LifePlanInput;
  onChange: (updated: LifePlanInput) => void;
}

export const Step4Education: React.FC<Step4EducationProps> = ({ input, onChange }) => {
  const handleUpdateChild = (id: string, fields: Partial<ChildInput>) => {
    onChange({
      ...input,
      children: input.children.map((c) => (c.id === id ? { ...c, ...fields } : c)),
    });
  };

  const handleUpdateSchoolType = (id: string, stage: keyof ChildInput['schoolType'], value: SchoolType) => {
    const child = input.children.find((c) => c.id === id);
    if (!child) return;
    handleUpdateChild(id, {
      schoolType: {
        ...child.schoolType,
        [stage]: value,
      },
    });
  };

  const master = defaultEducationCostsMaster.stages;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg border-b pb-2 border-slate-200">
        <GraduationCap className="w-5 h-5 text-[var(--app-accent,#2563eb)]" />
        <span>STEP 4：教育費・進路設定</span>
      </div>

      {input.children.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl text-center text-xs text-slate-500">
          お子様の設定はありません。進路設定が必要な場合は「STEP 1：基本情報」から子どもを追加してください。
        </div>
      ) : (
        <div className="space-y-6">
          {input.children.map((child) => (
            <div key={child.id} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
                  <span className="font-bold text-slate-800 text-sm">{child.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-[var(--app-primary,#1e3a8a)] font-semibold">
                    {child.isFutureChild ? `${child.birthInYears ?? 1}年後誕生` : `現在 ${child.currentAge} 歳`}
                  </span>
                </div>

                {/* 現在の実教育費入力（ある場合は優先） */}
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-600">現在かかっている実教育費 (優先指定):</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="標準値を使用"
                    value={child.customActualAnnualCost ?? ''}
                    onChange={(e) =>
                      handleUpdateChild(child.id, {
                        customActualAnnualCost: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-28 bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-[var(--app-accent,#2563eb)]"
                  />
                  <span className="text-slate-600">万円/年</span>
                </div>
              </div>

              {/* 学校段階ごとの公立/私立選択 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                
                {/* 乳幼児・保育園 */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs space-y-2">
                  <span className="font-bold text-slate-700 block">保育園 (0〜2歳)</span>
                  <select
                    value={child.schoolType.nursery || 'public'}
                    onChange={(e) => handleUpdateSchoolType(child.id, 'nursery', e.target.value as SchoolType)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-xs font-medium focus:ring-1 focus:ring-[var(--app-accent,#2563eb)]"
                  >
                    <option value="public">公立 ({master.nursery.publicAnnual}万/年)</option>
                    <option value="private">私立 ({master.nursery.privateAnnual}万/年)</option>
                  </select>
                </div>

                {/* 幼稚園 */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs space-y-2">
                  <span className="font-bold text-slate-700 block">幼稚園 (3〜5歳)</span>
                  <select
                    value={child.schoolType.kindergarten}
                    onChange={(e) => handleUpdateSchoolType(child.id, 'kindergarten', e.target.value as SchoolType)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-xs font-medium focus:ring-1 focus:ring-[var(--app-accent,#2563eb)]"
                  >
                    <option value="public">公立 ({master.kindergarten.publicAnnual}万/年)</option>
                    <option value="private">私立 ({master.kindergarten.privateAnnual}万/年)</option>
                  </select>
                </div>

                {/* 小学校 */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs space-y-2">
                  <span className="font-bold text-slate-700 block">小学校 (6〜11歳)</span>
                  <select
                    value={child.schoolType.elementary}
                    onChange={(e) => handleUpdateSchoolType(child.id, 'elementary', e.target.value as SchoolType)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-xs font-medium focus:ring-1 focus:ring-[var(--app-accent,#2563eb)]"
                  >
                    <option value="public">公立 ({master.elementary.publicAnnual}万/年)</option>
                    <option value="private">私立 ({master.elementary.privateAnnual}万/年)</option>
                  </select>
                </div>

                {/* 中学校 */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs space-y-2">
                  <span className="font-bold text-slate-700 block">中学校 (12〜14歳)</span>
                  <select
                    value={child.schoolType.juniorHigh}
                    onChange={(e) => handleUpdateSchoolType(child.id, 'juniorHigh', e.target.value as SchoolType)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-xs font-medium focus:ring-1 focus:ring-[var(--app-accent,#2563eb)]"
                  >
                    <option value="public">公立 ({master.juniorHigh.publicAnnual}万/年)</option>
                    <option value="private">私立 ({master.juniorHigh.privateAnnual}万/年)</option>
                  </select>
                </div>

                {/* 高校 */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs space-y-2">
                  <span className="font-bold text-slate-700 block">高校 (15〜17歳)</span>
                  <select
                    value={child.schoolType.highSchool}
                    onChange={(e) => handleUpdateSchoolType(child.id, 'highSchool', e.target.value as SchoolType)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-xs font-medium focus:ring-1 focus:ring-[var(--app-accent,#2563eb)]"
                  >
                    <option value="public">公立 ({master.highSchool.publicAnnual}万/年)</option>
                    <option value="private">私立 ({master.highSchool.privateAnnual}万/年)</option>
                  </select>
                </div>

                {/* 大学 */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs space-y-2">
                  <span className="font-bold text-slate-700 block">大学 (18〜21歳)</span>
                  <select
                    value={child.schoolType.university}
                    onChange={(e) => handleUpdateSchoolType(child.id, 'university', e.target.value as SchoolType)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-xs font-medium focus:ring-1 focus:ring-[var(--app-accent,#2563eb)]"
                  >
                    <option value="public">国公立 ({master.university.publicAnnual}万/年)</option>
                    <option value="private">私立 ({master.university.privateAnnual}万/年)</option>
                  </select>
                </div>

              </div>

              {/* 大学の通学区分 (自宅 vs 自宅外) */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                <span className="font-semibold text-slate-700 flex items-center space-x-1">
                  <Home className="w-3.5 h-3.5 text-[var(--app-accent,#2563eb)]" />
                  <span>大学進学時の通学環境：</span>
                </span>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`living_${child.id}`}
                      value="home"
                      checked={child.universityLivingType === 'home'}
                      onChange={() => handleUpdateChild(child.id, { universityLivingType: 'home' })}
                      className="accent-[var(--app-accent,#2563eb)]"
                    />
                    <span>自宅通学</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`living_${child.id}`}
                      value="away"
                      checked={child.universityLivingType === 'away'}
                      onChange={() => handleUpdateChild(child.id, { universityLivingType: 'away' })}
                      className="accent-[var(--app-accent,#2563eb)]"
                    />
                    <span>自宅外通学 (仕送り+100万円/年)</span>
                  </label>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* 標準値の出典情報 */}
      <div className="text-xs text-slate-400 bg-white p-3 rounded-lg border border-slate-200">
        <p className="font-semibold text-slate-600 mb-0.5">【教育費の標準値出典】</p>
        <p>{defaultEducationCostsMaster.source} (基準年: {defaultEducationCostsMaster.baseYear}年)</p>
      </div>

    </div>
  );
};

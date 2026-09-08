/**
 * STEP 1: 基本情報フォーム
 */

import React from 'react';
import { LifePlanInput, ChildInput } from '../../types/lifeplan';
import { Users, Plus, Trash2, Calendar, UserCheck } from 'lucide-react';

interface Step1BasicProps {
  input: LifePlanInput;
  onChange: (updated: LifePlanInput) => void;
}

export const Step1Basic: React.FC<Step1BasicProps> = ({ input, onChange }) => {
  const handleAddChild = () => {
    const newChild: ChildInput = {
      id: `child_${Date.now()}`,
      name: `第${input.children.length + 1}子`,
      currentAge: 0,
      schoolType: {
        nursery: 'public',
        kindergarten: 'private',
        elementary: 'public',
        juniorHigh: 'public',
        highSchool: 'public',
        university: 'private',
      },
      universityLivingType: 'home',
      isFutureChild: false,
    };
    onChange({
      ...input,
      children: [...input.children, newChild],
    });
  };

  const handleRemoveChild = (id: string) => {
    onChange({
      ...input,
      children: input.children.filter((c) => c.id !== id),
    });
  };

  const handleUpdateChild = (id: string, fields: Partial<ChildInput>) => {
    onChange({
      ...input,
      children: input.children.map((c) => (c.id === id ? { ...c, ...fields } : c)),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-[#1E293B] font-bold text-lg border-b pb-3 border-gray-100">
        <Users className="w-5 h-5 text-[var(--app-accent,#2563eb)]" />
        <span>STEP 1：世帯の基本情報</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 本人情報 */}
        <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200/80 space-y-4">
          <h4 className="font-bold text-gray-800 text-sm flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
            <span>本人情報</span>
          </h4>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">現在の年齢</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={18}
                max={90}
                value={input.personAge}
                onChange={(e) => onChange({ ...input, personAge: Number(e.target.value) })}
                className="w-full bg-white border border-gray-200/90 rounded-xl px-3.5 py-2 text-sm text-[#1E293B] focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:border-transparent focus:outline-none font-medium shadow-2xs"
              />
              <span className="text-sm text-gray-600 font-medium">歳</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">性別 (任意)</label>
            <select
              value={input.gender ?? 'unspecified'}
              onChange={(e) => onChange({ ...input, gender: e.target.value as any })}
              className="w-full bg-white border border-gray-200/90 rounded-xl px-3.5 py-2 text-sm text-[#1E293B] focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:border-transparent focus:outline-none font-medium shadow-2xs"
            >
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
              <option value="unspecified">指定しない</option>
            </select>
          </div>
        </div>

        {/* 配偶者情報 */}
        <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-800 text-sm flex items-center space-x-2">
              <Users className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
              <span>配偶者情報</span>
            </h4>
            <label className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={input.hasSpouse}
                onChange={(e) => onChange({ ...input, hasSpouse: e.target.checked })}
                className="rounded text-[var(--app-accent,#2563eb)] focus:ring-[var(--app-accent,#2563eb)] w-4 h-4"
              />
              <span>配偶者あり</span>
            </label>
          </div>

          {input.hasSpouse ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">配偶者の現在年齢</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={18}
                  max={90}
                  value={input.spouseAge}
                  onChange={(e) => onChange({ ...input, spouseAge: Number(e.target.value) })}
                  className="w-full bg-white border border-gray-200/90 rounded-xl px-3.5 py-2 text-sm text-[#1E293B] focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:border-transparent focus:outline-none font-medium shadow-2xs"
                />
                <span className="text-sm text-gray-600 font-medium">歳</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic py-4">「配偶者あり」にチェックを入れると設定項目が表示されます。</p>
          )}
        </div>

      </div>

      {/* シミュレーション計算期間 */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center space-x-1">
            <Calendar className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
            <span>計算終了年齢 (何歳までシミュレーションするか)</span>
          </label>
          <p className="text-xs text-slate-500">
            世帯内で最も若い成人が設定年齢に達するまで年次キャッシュフローを算出します。
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <input
            type="number"
            min={60}
            max={105}
            value={input.calculationEndAge}
            onChange={(e) => onChange({ ...input, calculationEndAge: Number(e.target.value) })}
            className="w-24 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-center focus:ring-2 focus:ring-[var(--app-accent,#2563eb)] focus:outline-none"
          />
          <span className="text-sm text-slate-700 font-bold">歳まで</span>
        </div>
      </div>

      {/* 子ども情報 */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-700 text-sm">子ども情報 ({input.children.length}人)</h4>
          <button
            type="button"
            onClick={handleAddChild}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--app-accent,#2563eb)] text-white hover:opacity-90 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>子どもを追加</span>
          </button>
        </div>

        {input.children.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
            子ども情報はありません。「子どもを追加」から設定できます。(将来予定のお子様も対応)
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {input.children.map((child, idx) => (
              <div key={child.id} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 relative shadow-xs">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={child.name}
                    onChange={(e) => handleUpdateChild(child.id, { name: e.target.value })}
                    className="font-bold text-sm text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:border-[var(--app-accent,#2563eb)] focus:outline-none px-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveChild(child.id)}
                    className="text-slate-400 hover:text-red-500 p-1 transition"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">区別</label>
                    <select
                      value={child.isFutureChild ? 'future' : 'current'}
                      onChange={(e) => handleUpdateChild(child.id, { isFutureChild: e.target.value === 'future' })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                    >
                      <option value="current">現在いる子ども</option>
                      <option value="future">将来生まれる予定</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {child.isFutureChild ? '何年後に誕生予定か' : '現在の年齢'}
                    </label>
                    <div className="flex items-center space-x-1">
                      {child.isFutureChild ? (
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={child.birthInYears ?? 1}
                          onChange={(e) => handleUpdateChild(child.id, { birthInYears: Number(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-center"
                        />
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={child.currentAge}
                          onChange={(e) => handleUpdateChild(child.id, { currentAge: Number(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-center"
                        />
                      )}
                      <span className="text-xs text-slate-600 font-medium">{child.isFutureChild ? '年後' : '歳'}</span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

/**
 * STEP 10: 一時収支イベント フォーム
 */

import React from 'react';
import { LifePlanInput, OneOffEventInput } from '../../types/lifeplan';
import { Calendar, Plus, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Step10OneOffProps {
  input: LifePlanInput;
  onChange: (updated: LifePlanInput) => void;
}

export const Step10OneOff: React.FC<Step10OneOffProps> = ({ input, onChange }) => {
  const handleAddEvent = () => {
    const newEv: OneOffEventInput = {
      id: `oneoff_${Date.now()}`,
      name: '車の買い替え',
      age: input.personAge + 5,
      type: 'expense',
      amount: 300,
    };
    onChange({
      ...input,
      oneOffEvents: [...input.oneOffEvents, newEv],
    });
  };

  const handleRemoveEvent = (id: string) => {
    onChange({
      ...input,
      oneOffEvents: input.oneOffEvents.filter((ev) => ev.id !== id),
    });
  };

  const handleUpdateEvent = (id: string, fields: Partial<OneOffEventInput>) => {
    onChange({
      ...input,
      oneOffEvents: input.oneOffEvents.map((ev) => (ev.id === id ? { ...ev, ...fields } : ev)),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-2 border-slate-200">
        <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg">
          <Calendar className="w-5 h-5 text-[var(--app-accent,#2563eb)]" />
          <span>STEP 10：一時収支イベント (車、リフォーム、贈与、相続等)</span>
        </div>
        <button
          type="button"
          onClick={handleAddEvent}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--app-accent,#2563eb)] text-white hover:opacity-90 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>イベント追加</span>
        </button>
      </div>

      {input.oneOffEvents.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-xl text-center text-xs text-slate-400">
          一時的な特別収支はありません。「イベント追加」から車購入・リフォーム・旅行・相続などを登録できます。
        </div>
      ) : (
        <div className="space-y-3">
          {input.oneOffEvents.map((ev) => (
            <div
              key={ev.id}
              className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={ev.name}
                  onChange={(e) => handleUpdateEvent(ev.id, { name: e.target.value })}
                  placeholder="イベント名 (例: 車買い替え)"
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:ring-1 focus:ring-[var(--app-accent,#2563eb)]"
                />

                <div className="flex items-center space-x-1">
                  <span className="text-xs text-slate-500 shrink-0">発生年齢:</span>
                  <input
                    type="number"
                    min={input.personAge}
                    max={100}
                    value={ev.age}
                    onChange={(e) => handleUpdateEvent(ev.id, { age: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center"
                  />
                  <span className="text-xs text-slate-500">歳</span>
                </div>

                <select
                  value={ev.type}
                  onChange={(e) => handleUpdateEvent(ev.id, { type: e.target.value as 'income' | 'expense' })}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold"
                >
                  <option value="expense">支出 (特別出費)</option>
                  <option value="income">収入 (臨時臨時収入)</option>
                </select>

                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={ev.amount}
                    onChange={(e) => handleUpdateEvent(ev.id, { amount: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center"
                  />
                  <span className="text-xs text-slate-500 font-bold">万円</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span
                  className={`text-xs px-2 py-1 rounded font-bold flex items-center space-x-1 ${
                    ev.type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {ev.type === 'expense' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                  <span>{ev.type === 'expense' ? `-${ev.amount}万` : `+${ev.amount}万`}</span>
                </span>

                <button
                  type="button"
                  onClick={() => handleRemoveEvent(ev.id)}
                  className="text-slate-400 hover:text-red-500 p-1 transition"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

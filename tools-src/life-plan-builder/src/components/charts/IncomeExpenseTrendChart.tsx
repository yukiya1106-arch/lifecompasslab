/**
 * グラフ: 将来の収入と支出の推移グラフ (Recharts)
 * 
 * 上段：収入の推移とその内訳 (世帯主年収、配偶者年収、退職金、老後の年金、定期収入、臨時収入)
 * 下段：支出の推移とその内訳 (日常生活費、保険料、教育費、住宅費、臨時支出)
 */

import React from 'react';
import { AnnualCashflowRow } from '../../types/lifeplan';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface IncomeExpenseTrendChartProps {
  rows: AnnualCashflowRow[];
}

export const IncomeExpenseTrendChart: React.FC<IncomeExpenseTrendChartProps> = ({ rows }) => {
  const chartData = React.useMemo(() => {
    return rows.map((r) => {
      const personSalary = Math.round(r.personNetSalary);
      const spouseSalary = Math.round(r.spouseNetSalary);
      const retirement = Math.round(r.retirementAllowance);
      const pension = Math.round(r.pensionIncome);
      const otherIncome = Math.round(r.otherIncome);
      const oneOffIncome = Math.round(r.otherOneOffIncome + r.housingSaleProceeds);
      const totalIncome = personSalary + spouseSalary + retirement + pension + otherIncome + oneOffIncome;

      const living = Math.round(r.livingExpenses);
      const insurance = Math.round(r.insuranceExpenses);
      const education = Math.round(r.educationExpenses);
      const housing = Math.round(r.housingExpenses);
      const oneOffExpense = Math.round(r.otherOneOffExpenses + r.housingPurchaseInitialExpenses);
      const totalExpense = living + insurance + education + housing + oneOffExpense;

      return {
        age: `${r.personAge}歳`,
        personAge: r.personAge,
        spouseAge: r.spouseAge,
        year: r.year,
        // 収入内訳
        personSalary,
        spouseSalary,
        retirement,
        pension,
        otherIncome,
        oneOffIncome,
        totalIncome,
        // 支出内訳
        living,
        insurance,
        education,
        housing,
        oneOffExpense,
        totalExpense,
      };
    });
  }, [rows]);

  const IncomeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1.5 border border-slate-700 min-w-[180px]">
          <p className="font-bold border-b border-slate-700 pb-1 text-slate-200">
            {data.personAge}歳 ({data.year}年) 収入内訳
          </p>
          <div className="space-y-1">
            {data.personSalary > 0 && (
              <div className="flex justify-between space-x-4">
                <span className="text-blue-400">本人手取り収入:</span>
                <span className="font-bold text-white">{data.personSalary} 万円</span>
              </div>
            )}
            {data.spouseSalary > 0 && (
              <div className="flex justify-between space-x-4">
                <span className="text-rose-400">配偶者手取り収入:</span>
                <span className="font-bold text-white">{data.spouseSalary} 万円</span>
              </div>
            )}
            {data.retirement > 0 && (
              <div className="flex justify-between space-x-4">
                <span className="text-slate-400">退職金合計:</span>
                <span className="font-bold text-white">{data.retirement} 万円</span>
              </div>
            )}
            {data.pension > 0 && (
              <div className="flex justify-between space-x-4">
                <span className="text-emerald-400">老後の年金合計:</span>
                <span className="font-bold text-white">{data.pension} 万円</span>
              </div>
            )}
            {data.otherIncome > 0 && (
              <div className="flex justify-between space-x-4">
                <span className="text-amber-400">定期収入:</span>
                <span className="font-bold text-white">{data.otherIncome} 万円</span>
              </div>
            )}
            {data.oneOffIncome > 0 && (
              <div className="flex justify-between space-x-4">
                <span className="text-pink-400">臨時収入:</span>
                <span className="font-bold text-white">{data.oneOffIncome} 万円</span>
              </div>
            )}
            <div className="flex justify-between space-x-4 pt-1 border-t border-slate-800">
              <span className="font-bold text-slate-300">収入合計:</span>
              <span className="font-extrabold text-amber-300">{data.totalIncome} 万円</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const ExpenseTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1.5 border border-slate-700 min-w-[180px]">
          <p className="font-bold border-b border-slate-700 pb-1 text-slate-200">
            {data.personAge}歳 ({data.year}年) 支出内訳
          </p>
          <div className="space-y-1">
            {data.living > 0 && (
              <div className="flex justify-between space-x-4">
                <span className="text-blue-400">日常生活費:</span>
                <span className="font-bold text-white">{data.living} 万円</span>
              </div>
            )}
            {data.insurance > 0 && (
              <div className="flex justify-between space-x-4">
                <span className="text-rose-400">保険料:</span>
                <span className="font-bold text-white">{data.insurance} 万円</span>
              </div>
            )}
            {data.education > 0 && (
              <div className="flex justify-between space-x-4">
                <span className="text-emerald-400">教育費:</span>
                <span className="font-bold text-white">{data.education} 万円</span>
              </div>
            )}
            {data.housing > 0 && (
              <div className="flex justify-between space-x-4">
                <span className="text-sky-400">住宅費:</span>
                <span className="font-bold text-white">{data.housing} 万円</span>
              </div>
            )}
            {data.oneOffExpense > 0 && (
              <div className="flex justify-between space-x-4">
                <span className="text-purple-400">臨時支出:</span>
                <span className="font-bold text-white">{data.oneOffExpense} 万円</span>
              </div>
            )}
            <div className="flex justify-between space-x-4 pt-1 border-t border-slate-800">
              <span className="font-bold text-slate-300">支出合計:</span>
              <span className="font-extrabold text-amber-300">{data.totalExpense} 万円</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 py-2">
      {/* 共通タイトル＆ご案内 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/70 border border-purple-200/80 p-4 rounded-2xl">
        <div className="flex items-center space-x-2.5">
          <div className="w-3.5 h-3.5 bg-purple-700 rounded-xs shrink-0" />
          <h4 className="text-sm font-bold text-slate-800">将来の収入と支出の推移グラフ</h4>
        </div>
        <div className="text-xs text-slate-600 leading-relaxed font-medium space-y-1">
          <p>
            人生において、どのような収入・支出が多いのか、色分けによって直感的に確認できます。各年の具体的な内訳の金額は、あとのキャッシュフロー表のページをご覧ください。
          </p>
          <p>
            資産運用への積立や、NISA・DC等の取崩しはこのグラフに含まれません。『資産内部取引・取崩』タブで確認できます。
          </p>
        </div>
      </div>

      {/* 1. 収入の推移とその内訳 */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1">
          <h5 className="text-xs font-bold text-slate-700">収入の推移とその内訳</h5>
          <span className="text-[11px] text-slate-500 font-semibold">単位: 万円 / 横軸: 世帯主年齢</span>
        </div>
        <div className="w-full h-72 sm:h-80 bg-slate-50/50 p-2 sm:p-4 rounded-2xl border border-slate-200/60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="age" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="万" />
              <Tooltip content={<IncomeTooltip />} />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                formatter={(value) => {
                  if (value === 'personSalary') return '本人手取り収入';
                  if (value === 'spouseSalary') return '配偶者手取り収入';
                  if (value === 'retirement') return '退職金合計';
                  if (value === 'pension') return '老後の年金合計';
                  if (value === 'otherIncome') return '定期収入';
                  if (value === 'oneOffIncome') return '臨時収入';
                  return value;
                }}
              />
              <Bar dataKey="personSalary" stackId="income" fill="#3b82f6" name="personSalary" />
              <Bar dataKey="spouseSalary" stackId="income" fill="#e11d48" name="spouseSalary" />
              <Bar dataKey="retirement" stackId="income" fill="#64748b" name="retirement" />
              <Bar dataKey="pension" stackId="income" fill="#22c55e" name="pension" />
              <Bar dataKey="otherIncome" stackId="income" fill="#f97316" name="otherIncome" />
              <Bar dataKey="oneOffIncome" stackId="income" fill="#ec4899" name="oneOffIncome" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. 支出の推移とその内訳 */}
      <div className="space-y-2 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1">
          <h5 className="text-xs font-bold text-slate-700">支出の推移とその内訳</h5>
          <span className="text-[11px] text-slate-600 font-medium">
            将来に、どのような支出に、どれくらいかかるのか、今のうちに把握をしておきましょう。
          </span>
        </div>
        <div className="w-full h-72 sm:h-80 bg-slate-50/50 p-2 sm:p-4 rounded-2xl border border-slate-200/60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="age" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="万" />
              <Tooltip content={<ExpenseTooltip />} />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                formatter={(value) => {
                  if (value === 'living') return '日常生活費';
                  if (value === 'insurance') return '保険料';
                  if (value === 'education') return '教育費';
                  if (value === 'housing') return '住宅費';
                  if (value === 'oneOffExpense') return '臨時支出';
                  return value;
                }}
              />
              <Bar dataKey="living" stackId="expense" fill="#3b82f6" name="living" />
              <Bar dataKey="insurance" stackId="expense" fill="#dc2626" name="insurance" />
              <Bar dataKey="education" stackId="expense" fill="#10b981" name="education" />
              <Bar dataKey="housing" stackId="expense" fill="#0ea5e9" name="housing" />
              <Bar dataKey="oneOffExpense" stackId="expense" fill="#a855f7" name="oneOffExpense" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/**
 * グラフ3/表: 資産取引と取り崩しの推移 (Recharts)
 * 
 * 住宅取引(購入頭金/売却手取り)、計画取り崩し、臨時取り崩し、DC受取を年別に可視化します。
 */

import React from 'react';
import { AnnualCashflowRow } from '../../types/lifeplan';
import { getThemeColor } from '../../utils/theme';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface AssetTransactionsChartProps {
  rows: AnnualCashflowRow[];
}

export const AssetTransactionsChart: React.FC<AssetTransactionsChartProps> = ({ rows }) => {
  // 取引・取り崩し・受取が発生している年のみ抽出、または全標本表示
  const chartData = React.useMemo(() => {
    return rows.map((r) => {
      return {
        age: `${r.personAge}歳`,
        personAge: r.personAge,
        year: r.year,
        housingProceeds: Math.round(r.housingSaleProceeds),
        housingInitialExp: Math.round(r.housingPurchaseInitialExpenses),
        plannedWithdrawal: Math.round(r.plannedTaxableWithdrawal),
        emergencyWithdrawal: Math.round(r.emergencyTaxableWithdrawal),
        dcWithdrawal: Math.round(r.dcWithdrawal),
      };
    });
  }, [rows]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1.5 border border-slate-700">
          <p className="font-bold border-b border-slate-700 pb-1 text-slate-200">
            {data.personAge}歳 ({data.year}年) 資産取引・取り崩し
          </p>
          <div className="space-y-1">
            {data.housingProceeds > 0 && <div className="flex justify-between space-x-4 text-emerald-400"><span>住宅売却手取り:</span><span>+{data.housingProceeds} 万円</span></div>}
            {data.housingInitialExp > 0 && <div className="flex justify-between space-x-4 text-red-400"><span>住宅購入初期費用:</span><span>-{data.housingInitialExp} 万円</span></div>}
            {data.plannedWithdrawal > 0 && <div className="flex justify-between space-x-4 text-sky-300"><span>運用資産の計画取り崩し:</span><span>+{data.plannedWithdrawal} 万円</span></div>}
            {data.emergencyWithdrawal > 0 && <div className="flex justify-between space-x-4 text-amber-400"><span>現預金不足・臨時取り崩し:</span><span>+{data.emergencyWithdrawal} 万円</span></div>}
            {data.dcWithdrawal > 0 && <div className="flex justify-between space-x-4 text-indigo-400"><span>DC・iDeCo受取:</span><span>+{data.dcWithdrawal} 万円</span></div>}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="age" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="万" />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
            formatter={(value) => {
              if (value === 'housingProceeds') return '住宅売却手取り';
              if (value === 'housingInitialExp') return '住宅購入頭金+諸費用';
              if (value === 'plannedWithdrawal') return '運用資産の計画取り崩し';
              if (value === 'emergencyWithdrawal') return '臨時補テン取り崩し';
              if (value === 'dcWithdrawal') return 'DC受取';
              return value;
            }}
          />
          <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />

          <Bar dataKey="housingProceeds" fill="#10b981" />
          <Bar dataKey="plannedWithdrawal" fill={getThemeColor('--app-accent', '#2563eb')} />
          <Bar dataKey="emergencyWithdrawal" fill="#f59e0b" />
          <Bar dataKey="dcWithdrawal" fill="#6366f1" />
          <Bar dataKey="housingInitialExp" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

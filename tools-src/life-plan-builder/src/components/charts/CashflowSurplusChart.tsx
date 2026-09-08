/**
 * グラフ2: 家計収支の推移 (Recharts)
 * 
 * 通常家計黒字・通常家計赤字の推移を表示
 * 住宅売却代金や購入頭金等は混ぜません。
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
  ReferenceLine,
  Cell,
} from 'recharts';

interface CashflowSurplusChartProps {
  rows: AnnualCashflowRow[];
}

export const CashflowSurplusChart: React.FC<CashflowSurplusChartProps> = ({ rows }) => {
  const chartData = React.useMemo(() => {
    return rows.map((r) => {
      const net = Math.round(r.netOrdinaryCashflow);
      return {
        age: `${r.personAge}歳`,
        personAge: r.personAge,
        year: r.year,
        netOrdinaryCashflow: net,
        surplus: net >= 0 ? net : 0,
        deficit: net < 0 ? net : 0,
      };
    });
  }, [rows]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isSurplus = data.netOrdinaryCashflow >= 0;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1 border border-slate-700">
          <p className="font-bold border-b border-slate-700 pb-1 text-slate-200">
            {data.personAge}歳 ({data.year}年)
          </p>
          <div className="flex justify-between space-x-4">
            <span className="text-slate-400">通常家計収支:</span>
            <span className={`font-extrabold ${isSurplus ? 'text-emerald-400' : 'text-red-400'}`}>
              {isSurplus ? `+${data.netOrdinaryCashflow} 万円` : `${data.netOrdinaryCashflow} 万円`}
            </span>
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
              if (value === 'surplus') return '通常家計黒字';
              if (value === 'deficit') return '通常家計赤字';
              return value;
            }}
          />
          <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
          
          <Bar dataKey="surplus" fill="#10b981" />
          <Bar dataKey="deficit" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

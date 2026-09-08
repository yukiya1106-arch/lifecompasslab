/**
 * グラフ1: 金融資産の構成と推移 (Recharts)
 * 
 * 積み上げ棒グラフ：現預金、NISA等の換金可能運用資産、DC・iDeCo
 * 補助線：金融資産合計
 * 赤表示：全資産枯渇後の「未補填資金不足」のみ0円以下へ表示
 */

import React from 'react';
import { AnnualCashflowRow } from '../../types/lifeplan';
import { getThemeColor } from '../../utils/theme';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface AssetTrendChartProps {
  rows: AnnualCashflowRow[];
}

export const AssetTrendChart: React.FC<AssetTrendChartProps> = ({ rows }) => {
  const chartData = React.useMemo(() => {
    return rows.map((r) => {
      return {
        age: `${r.personAge}歳`,
        personAge: r.personAge,
        year: r.year,
        cash: Math.round(r.endCash),
        taxable: Math.round(r.endTaxableAssets),
        restricted: Math.round(r.endRestrictedAssets),
        total: Math.round(r.endTotalAssets),
        // 全換金可能資産枯渇後の未補填不足額を負数としてグラフ化
        shortfall: r.unbackedShortfall > 0 ? -Math.round(r.unbackedShortfall) : 0,
      };
    });
  }, [rows]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1.5 border border-slate-700">
          <p className="font-bold border-b border-slate-700 pb-1 text-slate-200">
            {data.personAge}歳 ({data.year}年)
          </p>
          <div className="space-y-1">
            <div className="flex justify-between space-x-4">
              <span className="text-slate-400">現預金:</span>
              <span className="font-bold text-sky-400">{data.cash} 万円</span>
            </div>
            <div className="flex justify-between space-x-4">
              <span className="text-slate-400">NISA・投信:</span>
              <span className="font-bold text-sky-300">{data.taxable} 万円</span>
            </div>
            <div className="flex justify-between space-x-4">
              <span className="text-slate-400">DC・iDeCo:</span>
              <span className="font-bold text-indigo-400">{data.restricted} 万円</span>
            </div>
            <div className="flex justify-between space-x-4 pt-1 border-t border-slate-800">
              <span className="font-bold text-white">金融資産合計:</span>
              <span className="font-extrabold text-amber-300">{data.total} 万円</span>
            </div>
            {data.shortfall < 0 && (
              <div className="flex justify-between space-x-4 pt-1 text-red-400 font-bold">
                <span>生活資金不足(未補填):</span>
                <span>{data.shortfall} 万円</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80 sm:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="age" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="万" />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
            formatter={(value) => {
              if (value === 'cash') return '現預金';
              if (value === 'taxable') return 'NISA・運用資産';
              if (value === 'restricted') return 'DC・iDeCo';
              if (value === 'total') return '金融資産合計';
              if (value === 'shortfall') return '生活資金不足(未補填)';
              return value;
            }}
          />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
          
          <Bar dataKey="cash" stackId="assets" fill="#38bdf8" />
          <Bar dataKey="taxable" stackId="assets" fill={getThemeColor('--app-accent', '#2563eb')} />
          <Bar dataKey="restricted" stackId="assets" fill="#6366f1" />
          <Bar dataKey="shortfall" stackId="assets" fill="#ef4444" />
          
          <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * 診断結果：警告・注意事項パネル
 */

import React from 'react';
import { CalculationWarning } from '../../types/lifeplan';
import { AlertTriangle, Info, CheckCircle2, AlertOctagon } from 'lucide-react';

interface WarningsPanelProps {
  warnings: CalculationWarning[];
}

export const WarningsPanel: React.FC<WarningsPanelProps> = ({ warnings }) => {
  if (warnings.length === 0) {
    return (
      <div className="bg-emerald-50/80 border border-emerald-200/80 p-4 rounded-2xl flex items-center space-x-3 text-emerald-900 text-xs font-medium">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>現在入力されている条件において、顕著な警告・不整合事項は検出されませんでした。</span>
      </div>
    );
  }

  const errorWarnings = warnings.filter((w) => w.type === 'error');
  const alertWarnings = warnings.filter((w) => w.type === 'warning');
  const infoWarnings = warnings.filter((w) => w.type === 'info');

  return (
    <div className="space-y-3">
      <h4 className="font-bold text-[#1E293B] text-sm flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <span>FP診断アドバイス＆注意事項 ({warnings.length}件)</span>
      </h4>

      <div className="space-y-2.5">
        {/* エラー (枯渇・不整合) */}
        {errorWarnings.map((w, idx) => (
          <div key={idx} className="bg-red-50/80 border border-red-200/80 p-4 rounded-2xl flex items-start space-x-3 text-xs text-red-950">
            <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-red-900">【重要】{w.title}</span>
              <p className="leading-relaxed text-red-800 font-medium">{w.message}</p>
            </div>
          </div>
        ))}

        {/* 警告 */}
        {alertWarnings.map((w, idx) => (
          <div key={idx} className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-2xl flex items-start space-x-3 text-xs text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-amber-900">{w.title}</span>
              <p className="leading-relaxed text-amber-800 font-medium">{w.message}</p>
            </div>
          </div>
        ))}

        {/* 情報 */}
        {infoWarnings.map((w, idx) => (
          <div key={idx} className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-start space-x-3 text-xs text-slate-800">
            <Info className="w-4 h-4 text-[var(--app-accent,#2563eb)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-[var(--app-primary,#1e3a8a)]">{w.title}</span>
              <p className="leading-relaxed text-slate-700 font-medium">{w.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

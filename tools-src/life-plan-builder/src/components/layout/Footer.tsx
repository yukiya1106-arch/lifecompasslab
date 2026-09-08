/**
 * フッター コンポーネント
 */

import React from 'react';
import { appConfig } from '../../config/appConfig';
import { ShieldAlert } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white text-gray-500 text-xs py-8 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        
        {/* 免責文 */}
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 flex items-start space-x-3 text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px] font-medium">
            【免責事項】本シミュレーションは、入力された条件と一定の仮定に基づく将来予測であり、実際の結果を保証するものではありません。税金、社会保険、年金、教育費、住宅費等は簡易的な計算を含みます。重要な判断を行う際は、最新制度を確認し、必要に応じてファイナンシャルプランナー等の専門家へご相談ください。
          </p>
        </div>

        {/* 著作権 & 設定表示 */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-400 font-medium">
          <p>{appConfig.footerText}</p>
          <p className="mt-1 sm:mt-0 italic">
            Template Ver 1.2.0 | Powered by FP Engine
          </p>
        </div>

      </div>
    </footer>
  );
};

/**
 * 計算前提条件 & モデリング仕様 説明モーダル / アコーディオン
 */

import React from 'react';
import { BookOpen, CheckCircle2, X } from 'lucide-react';

interface AssumptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssumptionsModal: React.FC<AssumptionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#1E293B]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200/80">
        
        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-[var(--app-accent,#2563eb)]" />
            <h3 className="font-bold text-[#1E293B] text-lg tracking-tight">計算モデル・FP監修前提条件</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6 text-xs text-gray-600 leading-relaxed font-medium">
          
          <section className="space-y-2">
            <h4 className="font-bold text-[#1E293B] text-sm flex items-center space-x-1.5 text-[var(--app-primary,#1e3a8a)]">
              <CheckCircle2 className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
              <span>1. 会計恒等式と資金フローの一貫性</span>
            </h4>
            <p className="bg-gray-50 p-3.5 rounded-xl border border-gray-200/80 font-mono text-[11px] text-slate-800">
              期末資産合計 ＝ 期首資産合計 ＋ 年間総収入 － 年間総支出 ＋ 年間運用損益 ＋ 生活資金不足(未補填)
            </p>
            <p>
              すべての年度において上記恒等式が厳密に成立するよう一貫計算されています。現預金がマイナスになった場合は、NISA等の換金可能資産から自動で補填取崩しが行われます。換金可能資産も枯渇した場合は「生活資金不足(未補填)」として明確に記録されます。
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-[#1E293B] text-sm flex items-center space-x-1.5 text-[var(--app-primary,#1e3a8a)]">
              <CheckCircle2 className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
              <span>2. 額面年収・手取り年収・社会保険・税金</span>
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>手取り年収が実入力されている場合は、額面年収に対する手取り率を算出して将来の年収推移へ適用します。</li>
              <li>手取り年収が未入力の場合は、額面年収の78％を簡易手取り額として一律使用します。（※税金・社会保険料を個別に精密計算する機能ではありません）</li>
              <li>想定昇給率は毎年複利で適用され、個別イベント（役職定年等）がある場合は指定年齢で上書きされます。</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-[#1E293B] text-sm flex items-center space-x-1.5 text-[var(--app-primary,#1e3a8a)]">
              <CheckCircle2 className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
              <span>3. インフレ（物価上昇率）の適用ルール</span>
            </h4>
            <p>
              設定された「想定物価上昇率」は、基本生活費、教育費、賃貸家賃、維持管理費、保険料、一時特別出費等に毎年複利適用されます。一方、固定住宅ローンの返済額や積立設定額には適用されません。
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-[#1E293B] text-sm flex items-center space-x-1.5 text-[var(--app-primary,#1e3a8a)]">
              <CheckCircle2 className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
              <span>4. 住宅ローン・住み替え・資産売却計算</span>
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>住宅ローン返済額は「元利均等返済」の月利複利計算式に基づき算出されます。</li>
              <li>住み替え時の旧居売却手取り額は「想定売却価格 － 売却諸費用 － 売却時ローン残高」として正確に算出され、現金へ注入されます。</li>
              <li>新規購入時の「頭金 ＋ 借入額 ＝ 物件価格」の資金調達恒等式が不整合な場合は、警告が表示されます（購入諸費用は別途現金から支出されます）。</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-[#1E293B] text-sm flex items-center space-x-1.5 text-[var(--app-primary,#1e3a8a)]">
              <CheckCircle2 className="w-4 h-4 text-[var(--app-accent,#2563eb)]" />
              <span>5. NISA・DC・iDeCoの資産区分と受取制限</span>
            </h4>
            <p>
              DC・iDeCo等の受取制限資産は原則受取開始年齢まで中途引き出し不可とし、通常生活費赤字の自動補填には充当されません。NISA等の非制限運用資産のみが、現預金不足時に優先補填充当されます。
            </p>
          </section>

        </div>

        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-[var(--app-primary,#1e3a8a)] text-white rounded-full text-xs font-bold hover:opacity-90 transition-opacity shadow-xs"
          >
            閉じる
          </button>
        </div>

      </div>
    </div>
  );
};

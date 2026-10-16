import React from 'react';
import {
  ArrowRight,
  Calculator,
  ChartLine,
  Clock,
  Info,
  ReceiptText,
} from 'lucide-react';
import { CompassHeader, CompassMark } from './CompassBrand';

interface DashboardProps {
  onSelectTool: (toolId: string) => void;
}

const tools = [
  {
    id: 'pension-timing',
    index: '01',
    label: 'PUBLIC PENSION',
    title: '公的年金の受取時期',
    desc: '60歳から75歳までの受取開始年齢を比較し、年額と累計額の違いを確認します。',
    button: '受取時期を確認',
    icon: Clock,
    accent: 'text-[#2F6FED] bg-[#EEF4FF]',
  },
  {
    id: 'retirement-dc',
    index: '02',
    label: 'RETIREMENT & DC',
    title: '退職金・DCの受取時期と方法',
    desc: '会社退職金のあとにDC/iDeCoをいつ受け取るかを比べ、その後に一時金・年金・併用を確認します。',
    button: '受取時期から確認',
    icon: Calculator,
    accent: 'text-[#063A70] bg-[#EDF3F8]',
  },
  {
    id: 'pension-net',
    index: '03',
    label: 'PENSION NET',
    title: '年金の額面と手取り',
    desc: '年金から差し引かれる所得税・住民税・社会保険料の目安を整理します。',
    button: '手取りを確認',
    icon: ReceiptText,
    accent: 'text-[#147D75] bg-[#EAF7F5]',
  },
  {
    id: 'total-diagnosis',
    index: '04',
    label: 'RETIREMENT PLAN',
    title: '退職後資金の総合確認',
    desc: '年金、退職金、金融資産、生活費をまとめ、年齢ごとの資金推移を確認します。',
    button: '資金推移を確認',
    icon: ChartLine,
    accent: 'text-[#9A6500] bg-[#FFF6DE]',
  },
] as const;

export default function Dashboard({ onSelectTool }: DashboardProps) {
  return (
    <div className="compass-page">
      <CompassHeader />

      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-slate-200 py-9 md:grid-cols-[minmax(0,1fr)_360px] md:items-center md:py-12">
          <div className="min-w-0">
            <p className="compass-kicker">RETIREMENT COMPASS</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-[#07233F] sm:text-4xl">
              退職後のお金を、
              <br className="hidden sm:block" />
              目的ごとに見通す。
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              公的年金、退職金・DC/iDeCo、年金手取り、退職後資金を、
              それぞれの確認目的に分けて試算します。
            </p>
          </div>

          <div className="hidden min-w-0 items-center gap-4 md:flex" aria-hidden="true">
            <CompassMark size="lg" className="shrink-0 text-[#063A70]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                <span>PENSION</span>
                <span className="h-px flex-1 bg-slate-300" />
                <span>RETIREMENT</span>
                <span className="h-px flex-1 bg-slate-300" />
                <span>CASH FLOW</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                数字を比べ、理由をたどり、次に確認する項目を整理するための道しるべです。
              </p>
            </div>
          </div>
        </section>

        <section className="py-9">
          <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="compass-kicker">SELECT A COMPASS</p>
              <h2 className="mt-2 text-xl font-bold text-[#063A70]">確認したい項目を選ぶ</h2>
            </div>
            <p className="text-xs text-slate-500">入力内容は各ツール内で変更できます。</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <article
                  key={tool.id}
                  className="compass-panel group flex min-w-0 flex-col p-5 transition-colors hover:border-[#9BB9E8] sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${tool.accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="compass-number text-xs font-bold text-slate-300">{tool.index}</span>
                  </div>

                  <div className="mt-5 min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-[#2F6FED]">{tool.label}</p>
                    <h3 className="mt-1.5 text-base font-bold text-[#07233F] sm:text-lg">{tool.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{tool.desc}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectTool(tool.id)}
                    className="mt-6 inline-flex min-h-11 w-full items-center justify-between border-t border-slate-200 pt-4 text-sm font-bold text-[#063A70] transition-colors hover:text-[#2F6FED]"
                    id={`btn-open-${tool.id}`}
                  >
                    <span>{tool.button}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="flex items-start gap-3 border-t border-slate-200 pt-6 text-xs leading-6 text-slate-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2F6FED]" />
          <p>
            表示する金額は、入力内容と簡易計算式にもとづく概算です。
            税制・社会保険制度や個別条件によって実際の金額は異なるため、資金計画を確認するための目安としてご利用ください。
          </p>
        </aside>
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-[11px] text-slate-400">
        LIFE COMPASS LAB / COMPASS SERIES
      </footer>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  Compass,
  Home,
  Lightbulb,
  Mail,
} from "lucide-react";
import { labLogs, type LabLog } from "./data/labLogData";
import { categoryFilters, statuses, tools, type Tool, type ToolIcon, type ToolStatus } from "./data/toolsData";
import MortgageDeductionCompass from "./tools/mortgageDeduction/MortgageDeductionCompass";
import "./styles.css";

const navItems = [
  { label: "Home", href: "#top" },
  { label: "Tools", href: "#/tools" },
  { label: "Lab Log", href: "#/lab-log" },
  { label: "Note", href: "#note" },
  { label: "Data", href: "#/data" },
  { label: "Contact", href: "#/contact" },
];

const contactFormUrl =
  "https://docs.google.com/forms/d/e/1FAIpQLSdQcwYaLeJNPLQ9LnV-Js7yINfEnwlUNy0068YYGA8U3JbfCg/viewform?usp=dialog";

function App() {
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-white text-ink">
      <Header />
      <main>
        {route === "mortgage-deduction-compass" && <MortgageDeductionCompass />}
        {route === "tools" && <ToolsPage />}
        {route === "lab-log" && <LabLogPage />}
        {route === "data" && <DataPage />}
        {route === "about-site" && <AboutSitePage />}
        {route === "contact" && <ContactPage />}
        {route === "home" && <HomePage />}
      </main>
      <Footer />
    </div>
  );
}

function getRoute() {
  if (window.location.hash.startsWith("#/tools/mortgage-deduction-compass")) return "mortgage-deduction-compass";
  if (window.location.hash.startsWith("#/tools")) return "tools";
  if (window.location.hash.startsWith("#/lab-log")) return "lab-log";
  if (window.location.hash.startsWith("#/data")) return "data";
  if (window.location.hash.startsWith("#/about-site")) return "about-site";
  if (window.location.hash.startsWith("#/contact")) return "contact";
  return "home";
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex w-[min(1120px,calc(100%-32px))] flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
        <a href="#top" className="flex items-center gap-3 text-navy no-underline">
          <img
            src="/lifecompasslab/assets/lifecompasslab-logo-wide.png"
            alt="LIFE COMPASS LAB"
            className="h-9 w-auto max-w-[260px] object-contain object-left"
          />
        </a>
        <nav aria-label="主要ナビゲーション">
          <ul className="flex flex-wrap items-center gap-1 p-0 text-sm font-semibold text-slate-600">
            {navItems.map((item) => (
              <li key={item.href} className="list-none">
                <a className="rounded-full px-3 py-2 transition hover:bg-lightBlue hover:text-navy" href={item.href}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

function HomePage() {
  const featuredTools = [
    tools.find((tool) => tool.url === "#/tools/mortgage-deduction-compass"),
    ...tools.filter((tool) => tool.featured && tool.url !== "#/tools/mortgage-deduction-compass"),
  ]
    .filter((tool): tool is Tool => Boolean(tool))
    .slice(0, 3);

  return (
    <>
      <Hero />
      <FeaturedToolsSection featuredTools={featuredTools} />
      <PhilosophySection />
      <LabLogSection />
      <AboutSection />
      <NoteSection />
      <HomeContactSection />
    </>
  );
}

function Hero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden border-b border-slate-100 bg-[linear-gradient(180deg,#FFFFFF_0%,#F6FAFF_100%)]"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.16]">
        <img
          src="/lifecompasslab/assets/lifecompasslab-hero.png"
          alt=""
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="pointer-events-none absolute right-[-120px] top-20 -z-10 h-[420px] w-[420px] rounded-full border border-blue/15 md:right-12" />
      <div className="mx-auto grid min-h-[calc(100svh-78px)] w-[min(1120px,calc(100%-32px))] content-center py-20 md:min-h-[720px] md:py-24">
        <div className="max-w-3xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue/15 bg-white/80 px-4 py-2 text-sm font-semibold text-navy shadow-sm">
            <Compass aria-hidden="true" size={17} />
            Financial Planner × AI Builder
          </p>
          <h1 className="mb-6 text-[clamp(2.8rem,8vw,6.2rem)] font-semibold leading-[0.98] tracking-[0.08em] text-navy">
            LIFE
            <br />
            COMPASS
            <br />
            LAB
          </h1>
          <p className="mb-7 text-[clamp(1.55rem,4vw,2.7rem)] font-semibold leading-tight text-ink">
            人生の選択に、
            <br className="sm:hidden" />
            道しるべを。
          </p>
          <div className="mb-9 max-w-2xl space-y-4 text-base leading-8 text-sub md:text-lg md:leading-9">
            <p>目的地は決まっていても、行き方に迷う。住宅購入、資産形成、家計管理。</p>
            <p>
              人生の選択に必要なのは、正解ではなく、自分に合った道しるべ。LIFE COMPASS LABは、FPの知見とAIを活用し、課題を仕組みで解決するためのツールを開発しています。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="#tools" variant="primary">
              公開中のツールを見る
            </Button>
            <Button href="#lab-log" variant="secondary">
              LAB LOGを見る
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedToolsSection({ featuredTools }: { featuredTools: Tool[] }) {
  return (
    <Section id="tools" eyebrow="FEATURED TOOLS" title="公開中のツール">
      <div className="mb-10 max-w-2xl text-base leading-8 text-sub md:text-lg">
        LIFE COMPASS LABでは、人生のお金に関する意思決定を支援するツールを少しずつ開発・公開しています。
        <br />
        住宅購入、退職後資金、ライフプラン。まずは気になるテーマから、現在地を整理してみてください。
      </div>
      <ToolGrid tools={featuredTools} />
      <div className="mt-8">
        <Button href="#/tools" variant="secondary">
          すべてのツールを見る
        </Button>
      </div>
    </Section>
  );
}

function ToolGrid({ tools: toolItems }: { tools: Tool[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {toolItems.map((tool) => {
        const Icon = getToolIcon(tool.icon);
        return (
          <article
            key={tool.title}
            className="flex min-h-[390px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_14px_44px_rgba(11,42,91,0.06)] transition hover:-translate-y-1 hover:border-blue/25 hover:bg-[#fbfdff]"
          >
            <div>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lightBlue text-blue">
                  <Icon aria-hidden="true" size={24} strokeWidth={1.8} />
                </div>
                <StatusBadge status={tool.status} />
              </div>
              <p className="mb-3 text-xs font-bold tracking-[0.18em] text-blue">{tool.category}</p>
              <h3 className="mb-4 text-xl font-semibold leading-snug text-navy">{tool.title}</h3>
              <p className="text-sm leading-7 text-sub">{tool.description}</p>
            </div>
            <a
              href={tool.url}
              className="mt-8 inline-flex items-center justify-between rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-navy transition hover:border-blue hover:bg-lightBlue"
            >
              {tool.buttonLabel}
              <ArrowRight aria-hidden="true" size={17} />
            </a>
          </article>
        );
      })}
    </div>
  );
}

function ToolsPage() {
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const filteredTools = useMemo(
    () =>
      selectedCategory === "すべて"
        ? tools
        : tools.filter((tool) => tool.categories.includes(selectedCategory)),
    [selectedCategory],
  );

  return (
    <PageShell eyebrow="TOOLS" title="すべてのツール" lead="公開中・開発中・構想中のツールを一覧できる、LIFE COMPASS LABのツール棚です。必要なテーマから、今の状況を整理してみてください。">
      <div className="mb-10 flex flex-wrap gap-2">
        {categoryFilters.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              selectedCategory === category
                ? "border-blue bg-lightBlue text-navy"
                : "border-slate-200 bg-white text-sub hover:border-blue hover:text-navy"
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      <div className="space-y-14">
        {statuses.map((status) => {
          const groupTools = filteredTools.filter((tool) => tool.status === status);
          return (
            <section key={status} className="py-0">
              <div className="mb-5 flex items-center gap-3">
                <StatusBadge status={status} />
                <h2 className="text-2xl font-semibold text-navy">{status}</h2>
              </div>
              {groupTools.length > 0 ? (
                <ToolGrid tools={groupTools} />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-sub">
                  現在、この分類に該当するツールはありません。
                </div>
              )}
            </section>
          );
        })}
      </div>
      <div className="mt-12 border-t border-blue/15 bg-lightBlue/40 px-5 py-5 text-sm leading-7 text-sub md:px-6">
        各ツールは無料でご利用いただけますが、表示される結果は入力内容に基づく概算・参考情報です。
        将来の結果や個別判断を保証するものではありません。重要な判断は、ご自身の責任において、一次情報や専門家の確認を踏まえて行ってください。
      </div>
    </PageShell>
  );
}

function DataPage() {
  return (
    <PageShell eyebrow="DATA POLICY" title="データの取り扱い" lead="LIFE COMPASS LABでは、住宅購入、家計管理、退職後資金などに関する意思決定を支援するためのツールを公開しています。各ツールでは、入力された情報をもとに概算の試算や整理結果を表示します。">
      <div className="grid gap-5">
        <PolicyBlock title="無料利用と免責について">
          <p>LIFE COMPASS LABで公開しているツールは、無料でご利用いただけます。</p>
          <p>
            各ツールで表示される試算結果やAIによるコメントは、入力内容に基づく概算・参考情報です。将来の資産額、税額、社会保険料、住宅購入の可否、年金や退職金の最適な受け取り方などを保証するものではありません。
          </p>
          <p>
            ツールの利用および表示結果に基づく判断は、ご自身の責任において行ってください。重要な判断を行う際は、必ず一次情報を確認し、必要に応じて専門家へご相談ください。
          </p>
          <p>
            LIFE COMPASS LABは、法令上認められる範囲において、ツールの利用により生じた損害等について責任を負いません。
          </p>
        </PolicyBlock>
        <PolicyBlock title="入力情報について">
          <p>
            ツールの利用にあたって、年齢、収入、支出、資産額、住宅価格、退職金見込額などの情報を入力いただく場合があります。これらの情報は、試算結果を表示するために利用されます。
          </p>
          <p>
            氏名、住所、電話番号、勤務先、金融機関の口座情報、マイナンバーなど、個人を直接特定できる情報は入力しないでください。
          </p>
        </PolicyBlock>
        <PolicyBlock title="試算結果について">
          <p>
            表示される結果は、入力内容に基づく概算・参考情報です。将来の資産額、税額、社会保険料、住宅購入の可否、退職金や年金の最適な受け取り方を保証するものではありません。
          </p>
          <p>制度改正、金利、収入、支出、家族構成、運用状況などにより、実際の結果は変動します。</p>
        </PolicyBlock>
        <PolicyBlock title="AIの利用について">
          <p>
            一部のツールでは、入力内容をもとにAIがコメントや整理結果を生成する場合があります。AIの出力には誤りや不十分な点が含まれる可能性があります。
          </p>
          <p>重要な判断を行う際は、必ず一次情報や専門家の確認を行ってください。</p>
        </PolicyBlock>
        <PolicyBlock title="個別相談について">
          <p>
            LIFE COMPASS LABのツールは、意思決定のための判断材料を整理することを目的としています。個別の税務判断、投資判断、保険商品や金融商品の推奨、住宅購入の最終判断などについては、必要に応じて専門家へご相談ください。
          </p>
        </PolicyBlock>
        <PolicyBlock title="ツールごとの仕様について">
          <p>
            各ツールごとにデータ保存仕様が異なる場合があります。必要に応じて、ツール側にも個別の注意書きを設置します。
          </p>
        </PolicyBlock>
        <PolicyBlock title="お問い合わせ">
          <p>不具合、改善要望、データの取り扱いに関するご質問がありましたら、お問い合わせページよりご連絡ください。</p>
          <div className="mt-5">
            <Button href="#/contact" variant="secondary">
              お問い合わせページへ
            </Button>
          </div>
        </PolicyBlock>
      </div>
    </PageShell>
  );
}

function AboutSitePage() {
  return (
    <PageShell
      eyebrow="ABOUT THIS SITE"
      title="このサイトについて"
      lead="LIFE COMPASS LABの運営目的と位置づけについてまとめています。"
    >
      <PolicyBlock title="個人運営の研究・開発プロジェクトです">
        <p>
          LIFE COMPASS LABは、人生のお金に関する意思決定を少しでも分かりやすくするための、個人運営による研究・開発プロジェクトです。
        </p>
        <p>
          家計、住宅、退職金、相続、教育費、老後資金など、人生の節目で迷いやすいテーマについて、考え方の整理や概算シミュレーションを行うためのツール・コンテンツを制作しています。
        </p>
        <p>
          本サイトは、所属組織、勤務先、提携金融機関、取引先その他の団体とは関係ありません。
          掲載内容は、運営者個人の見解・試作・研究に基づくものであり、所属組織等の公式見解ではありません。
        </p>
        <p>
          本サイトは、特定の金融商品、保険商品、証券会社、金融機関、不動産、投資手法等の勧誘・推奨を目的とするものではありません。
        </p>
        <p>
          本サイト上で、金融商品の購入、証券口座の開設、保険契約、不動産取引等の案内・媒介・取次ぎは行いません。
        </p>
        <p>
          現時点で、本サイトには金融商品、証券口座、保険商品等に関する広告、アフィリエイトリンク、紹介リンク、個別相談の受付窓口は設置していません。
        </p>
        <p>
          各種ツールの試算結果は、入力条件に基づく概算であり、実際の税額、控除額、社会保険料、住宅ローン審査、相続税額等とは異なる場合があります。
          実際の判断にあたっては、必要に応じて各専門家・金融機関・公的機関等にご確認ください。
        </p>
      </PolicyBlock>
    </PageShell>
  );
}

function ContactPage() {
  return (
    <section className="relative isolate min-h-[70svh] overflow-hidden bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBFF_100%)] py-20 md:py-28">
      <div className="pointer-events-none absolute -right-44 top-20 -z-10 h-[520px] w-[520px] rounded-full border border-blue/10" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 -z-10 h-80 w-80 rounded-full bg-lightBlue/70 blur-sm" />
      <div className="mx-auto grid w-[min(1040px,calc(100%-32px))] gap-12 md:grid-cols-[0.86fr_1.14fr] md:gap-16">
        <div>
          <p className="mb-4 text-xs font-bold tracking-[0.22em] text-blue">CONTACT</p>
          <h1 className="mb-6 text-[clamp(2.8rem,7vw,5rem)] font-semibold leading-none text-navy">CONTACT</h1>
          <p className="max-w-sm text-base leading-8 text-sub md:text-lg">
            LIFE COMPASS LABへの感想、改善要望、不具合報告、ツール追加の希望などを受け付けています。
          </p>
        </div>
        <div className="border-t border-blue/20 pt-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-lightBlue text-blue">
            <Mail aria-hidden="true" size={24} />
          </div>
          <h2 className="mb-5 text-3xl font-semibold leading-tight text-navy md:text-4xl">感想・改善案を送る</h2>
          <div className="max-w-3xl space-y-4 text-base leading-8 text-sub md:text-lg">
            <p>LIFE COMPASS LABは、使っていただいた方の声をもとに少しずつ改善していきます。</p>
            <p>使ってみた感想、不具合、改善アイデア、追加してほしい機能などがあれば、お気軽にお寄せください。</p>
            <p>個別の金融商品、税務判断、住宅購入可否などの具体的なご相談には、このフォーム上では回答できない場合があります。</p>
          </div>
          <div className="my-8 max-w-3xl border-y border-blue/20 bg-lightBlue/45 py-5 text-sm font-semibold leading-7 text-navy">
            氏名、住所、勤務先、金融機関の口座情報、マイナンバーなど、個人を直接特定できる情報や機微な情報は入力しないでください。
          </div>
          <Button href={contactFormUrl} variant="primary">
            フォームを開く
          </Button>
          <p className="mt-4 text-xs text-sub">外部フォームが新しいタブまたは現在のタブで開きます。</p>
        </div>
      </div>
    </section>
  );
}

function PhilosophySection() {
  return (
    <section className="border-y border-slate-100 bg-slate-50/70 py-20 md:py-28">
      <div className="mx-auto grid w-[min(1120px,calc(100%-32px))] gap-12 md:grid-cols-[0.85fr_1.15fr] md:items-start">
        <div className="md:sticky md:top-28">
          <p className="mb-4 text-xs font-bold tracking-[0.22em] text-blue">PHILOSOPHY</p>
          <h2 className="text-[clamp(2rem,5vw,3.7rem)] font-semibold leading-tight text-navy">
            人生は、
            <br />
            正解だけでは
            <br />
            決められない。
          </h2>
        </div>
        <div className="space-y-7 text-base leading-8 text-sub md:text-lg md:leading-9">
          <p>AIは、制度を調べることも、数字を比較することも、シミュレーションを作ることも得意です。</p>
          <p>でも、人生の選択は合理性だけでは決まりません。</p>
          <p>
            住宅購入。資産形成。退職金の受け取り方。数字上の正解が、その人にとって納得できる選択とは限らない。
          </p>
          <p>
            LIFE COMPASS LABは、AIで答えを押し付ける場所ではなく、納得して選ぶための判断材料を整理する場所を目指しています。
          </p>
          <blockquote className="rounded-3xl border border-blue/15 bg-white p-7 text-xl font-semibold leading-relaxed text-navy shadow-soft md:text-2xl">
            AIは答えを出せる。でも、納得は人の中にしか生まれない。
          </blockquote>
        </div>
      </div>
    </section>
  );
}

function LabLogSection() {
  const latestLogs = labLogs.slice(0, 3);

  return (
    <Section id="lab-log" eyebrow="LAB LOG" title="LAB LOG">
      <div className="grid gap-10 md:grid-cols-[0.86fr_1.14fr] md:items-start">
        <p className="max-w-xl text-base leading-8 text-sub md:text-lg">
          LIFE COMPASS LABの開発記録や試行錯誤を少しずつ残しています。作ったもの、試したこと、改善したことを積み上げていくページです。
        </p>
        <div>
          <div className="border-t border-slate-200">
            {latestLogs.map((log) => (
              <LabLogCard key={`${log.date}-${log.title}`} log={log} compact />
            ))}
          </div>
          <div className="mt-7">
            <Button href="#/lab-log" variant="secondary">
              すべてのLAB LOGを見る
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}

function LabLogPage() {
  return (
    <PageShell
      eyebrow="LAB LOG"
      title="LAB LOG"
      lead="LIFE COMPASS LABの開発記録や試行錯誤を、新しい順にまとめています。完成品だけではなく、作ったもの、試したこと、改善したことを積み上げていくページです。"
    >
      <div className="border-t border-slate-200">
        {labLogs.map((log) => (
          <LabLogCard key={`${log.date}-${log.title}`} log={log} />
        ))}
      </div>
    </PageShell>
  );
}

function LabLogCard({
  log,
  compact = false,
}: {
  log: LabLog;
  compact?: boolean;
}) {
  return (
    <article className="grid gap-3 border-b border-slate-200 py-7 md:grid-cols-[112px_minmax(0,1fr)] md:gap-8">
      <time className="text-sm font-semibold text-blue">{log.date}</time>
      <div>
        <h2 className="mb-2 text-xl font-semibold leading-snug text-navy md:text-2xl">{log.title}</h2>
        <p className="text-sm leading-7 text-sub md:text-base">{log.summary}</p>
        {!compact && <p className="mt-3 text-sm leading-7 text-sub">{log.body}</p>}
        {!compact && log.linkUrl && (
          <a
            href={log.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-sm font-semibold text-blue underline-offset-4 hover:underline"
          >
            {log.linkLabel ?? "関連リンク"}
          </a>
        )}
      </div>
    </article>
  );
}

function AboutSection() {
  return (
    <section id="about" className="bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBFF_100%)] py-20 md:py-28">
      <div className="mx-auto grid w-[min(1120px,calc(100%-32px))] gap-12 md:grid-cols-[0.8fr_1.2fr] md:items-start">
        <div>
          <p className="mb-4 text-xs font-bold tracking-[0.22em] text-blue">ABOUT</p>
          <h2 className="mb-4 text-4xl font-semibold text-navy md:text-5xl">石井 悠己也</h2>
          <p className="mb-8 text-sm font-semibold tracking-[0.16em] text-blue">Financial Planner × AI Builder</p>
          <div className="inline-flex items-center gap-2 rounded-full bg-lightBlue px-4 py-2 text-sm font-semibold text-navy">
            <Lightbulb aria-hidden="true" size={17} />
            課題を、仕組みで解決する。
          </div>
        </div>
        <div className="space-y-6 text-base leading-8 text-sub md:text-lg md:leading-9">
          <p>ファイナンシャルプランナーとして、住宅購入、ライフプラン、資産形成などの相談に携わっています。</p>
          <p>
            相談現場で感じてきたのは、多くの方が「情報がないから迷っている」のではなく、「自分の場合、どう判断すればよいか」で迷っているということです。
          </p>
          <p>
            LIFE COMPASS LABでは、FPの知見とAIを組み合わせ、相談前に状況を整理できる仕組みや、納得して次の一歩を選ぶためのツールを開発しています。
          </p>
          <p>
            大きく見せるより、一つずつ積み上げる。課題を、仕組みで解決する。そんな職人型のプロジェクトとして育てていきます。
          </p>
        </div>
      </div>
    </section>
  );
}

function NoteSection() {
  return (
    <Section id="note" eyebrow="NOTE" title="NOTE">
      <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-soft md:grid-cols-[1fr_auto] md:items-center md:p-9">
        <div className="max-w-2xl">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-lightBlue text-blue">
            <BookOpen aria-hidden="true" size={24} />
          </div>
          <p className="text-base leading-8 text-sub md:text-lg">
            お金のこと、住宅購入のこと、資産形成のこと。そして、LIFE COMPASS LABの開発過程や考えていることをnoteで発信しています。
          </p>
        </div>
        <Button href="https://note.com/yukiyaishii" variant="primary">
          noteを読む
        </Button>
      </div>
    </Section>
  );
}

function HomeContactSection() {
  return (
    <section id="feedback" className="bg-navy py-20 text-white md:py-28">
      <div className="mx-auto grid w-[min(1120px,calc(100%-32px))] gap-8 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="mb-4 text-xs font-bold tracking-[0.22em] text-blue">CONTACT</p>
          <h2 className="mb-5 text-4xl font-semibold leading-tight md:text-5xl">CONTACT</h2>
          <p className="max-w-2xl text-base leading-8 text-white/74 md:text-lg">
            LIFE COMPASS LABは、使っていただいた方の声をもとに少しずつ改善していきます。感想、不具合、改善アイデア、追加してほしい機能などをお寄せください。
          </p>
        </div>
        <a
          href="#/contact"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-navy transition hover:bg-lightBlue"
        >
          <Mail aria-hidden="true" size={18} />
          フォームを開く
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white py-10">
      <div className="mx-auto flex w-[min(1120px,calc(100%-32px))] flex-col gap-4 border-t border-slate-200 pt-8 text-sm text-sub md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-1 font-semibold tracking-[0.12em] text-navy">LIFE COMPASS LAB</p>
          <p>人生の選択に、道しるべを。</p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <a href="#/about-site" className="text-xs font-semibold text-sub transition hover:text-navy">
            このサイトについて
          </a>
          <p>© 2026 LIFE COMPASS LAB</p>
        </div>
      </div>
    </footer>
  );
}

function PageShell({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-[70svh] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBFF_100%)] py-20 md:py-28">
      <div className="mx-auto w-[min(1120px,calc(100%-32px))]">
        <p className="mb-4 text-xs font-bold tracking-[0.22em] text-blue">{eyebrow}</p>
        <h1 className="mb-5 text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-tight text-navy">{title}</h1>
        <p className="mb-12 max-w-3xl text-base leading-8 text-sub md:text-lg">{lead}</p>
        {children}
      </div>
    </section>
  );
}

function PolicyBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_14px_44px_rgba(11,42,91,0.06)] md:p-9">
      <h2 className="mb-4 text-2xl font-semibold text-navy">{title}</h2>
      <div className="space-y-4 text-base leading-8 text-sub">{children}</div>
    </section>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="py-20 md:py-28">
      <div className="mx-auto w-[min(1120px,calc(100%-32px))]">
        <div className="mb-10">
          <p className="mb-4 text-xs font-bold tracking-[0.22em] text-blue">{eyebrow}</p>
          <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-tight text-navy">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function Button({
  href,
  variant,
  children,
}: {
  href: string;
  variant: "primary" | "secondary";
  children: React.ReactNode;
}) {
  const className =
    variant === "primary"
      ? "bg-navy text-white hover:bg-blue"
      : "border border-slate-200 bg-white/85 text-navy hover:border-blue hover:bg-lightBlue";

  return (
    <a
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold shadow-sm transition ${className}`}
    >
      {children}
      <ArrowRight aria-hidden="true" size={18} />
    </a>
  );
}

function StatusBadge({ status }: { status: ToolStatus }) {
  const tone =
    status === "公開中"
      ? "bg-lightBlue text-blue"
      : status === "開発中"
        ? "bg-slate-100 text-navy"
        : "bg-slate-50 text-sub";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function getToolIcon(icon: ToolIcon) {
  if (icon === "home") return Home;
  if (icon === "compass") return Compass;
  return ChartNoAxesCombined;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

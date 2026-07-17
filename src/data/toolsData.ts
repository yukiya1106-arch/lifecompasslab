export type ToolStatus = "公開中" | "開発中" | "構想中";
export type ToolIcon = "home" | "compass" | "chart";

export type Tool = {
  title: string;
  category: string;
  categories: string[];
  status: ToolStatus;
  description: string;
  url: string;
  buttonLabel: string;
  icon: ToolIcon;
  featured: boolean;
};

export const categoryFilters = [
  "すべて",
  "住宅購入",
  "退職後資金",
  "ライフプラン",
  "家計管理",
  "資産形成",
  "教育費",
  "保険",
  "相続",
];

export const statuses: ToolStatus[] = ["公開中", "開発中", "構想中"];

export const tools: Tool[] = [
  {
    title: "家計コンパスHOME",
    category: "住宅購入",
    categories: ["住宅購入", "家計管理"],
    status: "公開中",
    description:
      "物件価格やローン返済額だけでなく、管理費、修繕積立金、駐車場、固定資産税まで一括で整理。最大3件の物件情報をAIで解析し、「買えるか」だけでなく、「わが家にフィットする物件か」を確認するための住宅購入支援ツールです。",
    url: "https://home-201056094402.asia-east1.run.app/",
    buttonLabel: "試してみる",
    icon: "home",
    featured: false,
  },
  {
    title: "リタイアメントCOMPASS",
    category: "退職後資金 / 年金 / 税金",
    categories: ["退職後資金", "資産形成"],
    status: "公開中",
    description:
      "退職後の資金計画、税金、年金受取時期など、老後の生活設計における「お金の確認」を目的別にサポートするシミュレーションプラットフォームです。退職金、企業型DC、iDeCo、公的年金など、退職前後に整理しておきたい論点を見える化します。",
    url: "https://remix-compass-201056094402.asia-east1.run.app/",
    buttonLabel: "試してみる",
    icon: "compass",
    featured: true,
  },
  {
    title: "年金受取シミュレーター",
    category: "退職後資金 / 年金 / 税金",
    categories: ["退職後資金", "資産形成"],
    status: "公開中",
    description:
      "退職金COMPASSから年金の受け取り計算部分を独立させた概算シミュレーターです。公的年金の受取開始年齢による違いや、企業型DC・iDeCoの一時金・年金・併用受取を比較し、相談前の整理に使えます。",
    url: "/lifecompasslab/tools/pension-receipt-simulator/",
    buttonLabel: "試してみる",
    icon: "compass",
    featured: false,
  },
  {
    title: "COMPASS PLAN LIGHT",
    category: "ライフプラン / 家計管理 / 教育費 / 住宅購入",
    categories: ["ライフプラン", "家計管理", "教育費", "住宅購入", "資産形成", "保険"],
    status: "公開中",
    description:
      "住宅、教育、働き方、資産形成などの選択が、将来の年次キャッシュフローと金融資産にどう影響するかを確認できるライト版ライフプランシミュレーターです。",
    url: "/lifecompasslab/tools/kakei-compass-mini/",
    buttonLabel: "試してみる",
    icon: "chart",
    featured: true,
  },
  {
    title: "ライフプラン電卓",
    category: "ライフプラン / 家計管理 / 住宅購入 / 資産形成",
    categories: ["ライフプラン", "家計管理", "住宅購入", "資産形成"],
    status: "公開中",
    description:
      "手取り収入から固定費を引いて生活費を逆算したり、使途不明金を洗い出したりできるミニツール集です。住宅ローンの返済目安や、資産運用の複利計算もまとめて確認できます。",
    url: "/lifecompasslab/tools/lifeplan-calculator/",
    buttonLabel: "試してみる",
    icon: "chart",
    featured: false,
  },
  {
    title: "住宅ローン控除COMPASS",
    category: "住宅購入 / 税金",
    categories: ["住宅購入", "家計管理"],
    status: "公開中",
    description:
      "ペアローン、育休、住宅性能、所得税・住民税の想定から、住宅ローン控除をどのくらい使い切れるかを見える化する概算シミュレーターです。控除可能額、実際に使える控除額、使い切れない控除額を世帯・夫婦別に確認できます。",
    url: "#/tools/mortgage-deduction-compass",
    buttonLabel: "試してみる",
    icon: "home",
    featured: true,
  },
];

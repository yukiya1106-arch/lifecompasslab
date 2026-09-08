/**
 * CSVエクスポートエンジン (csvExport.ts)
 * 
 * シミュレーション結果から各種年次収支・資産残高をCSV形式で出力します。
 */

import { SimulationResult } from '../types/lifeplan';

export interface CsvExportOptions {
  currencyUnit?: string;
}

export function generateCashflowCsv(
  result: SimulationResult,
  options: CsvExportOptions = {}
): string {
  const currencyUnit = options.currencyUnit || '万円';

  const headers = [
    '経過年数',
    '西暦年',
    '本人年齢',
    '配偶者年齢',
    'イベント',
    `通常収入(${currencyUnit})`,
    `通常支出(${currencyUnit})`,
    `通常家計収支(${currencyUnit})`,
    `非住宅一時収支(${currencyUnit})`,
    `住宅資産取引(${currencyUnit})`,
    `外部純収支(${currencyUnit})`,
    `運用益(${currencyUnit})`,
    `期末現預金(${currencyUnit})`,
    `期末NISA・運用資産(${currencyUnit})`,
    `期末DC・iDeCo(${currencyUnit})`,
    `期末総資産(${currencyUnit})`,
    `生活資金不足(未補填)(${currencyUnit})`,
    `検算差額(${currencyUnit})`,
  ];

  const lines: string[] = [];
  lines.push(headers.join(','));

  for (const row of result.rows) {
    const eventsStr = `"${(row.events || []).join(' / ').replace(/"/g, '""')}"`;

    const rowData = [
      formatNum(row.elapsedYears),
      formatNum(row.year),
      formatNum(row.personAge),
      formatNum(row.spouseAge),
      eventsStr,
      formatNum(row.totalOrdinaryIncome),
      formatNum(row.totalOrdinaryExpenses),
      formatNum(row.netOrdinaryCashflow),
      formatNum(row.nonHousingOneOffTransactions),
      formatNum(row.housingAssetTransactions),
      formatNum(row.totalExternalNetCashflow),
      formatNum(row.totalInvestmentGain),
      formatNum(row.endCash),
      formatNum(row.endTaxableAssets),
      formatNum(row.endRestrictedAssets),
      formatNum(row.endTotalAssets),
      formatNum(row.unbackedShortfall),
      formatNum(row.calculationCheckDifference),
    ];

    lines.push(rowData.join(','));
  }

  // BOMを追加してExcelでの文字化けを防止
  return '\uFEFF' + lines.join('\r\n');
}

function formatNum(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) {
    return '0';
  }
  // 小数点第2位までに丸め
  const rounded = Math.round(val * 100) / 100;
  return String(rounded);
}

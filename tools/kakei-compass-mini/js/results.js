/**
 * results.js
 * =========================================================
 * 家計コンパス β版 - 結果画面レンダリング（計算エンジン連携版）
 *
 * 計算エンジン（engine.js）の CalcEngine を使って
 * 実際の入力データから年次キャッシュフローを計算し、
 * 結果画面・グラフ・診断スコアを生成します。
 * =========================================================
 */

'use strict';

// =========================================================
// カラー定数
// =========================================================
const COLORS = {
  primary:   '#1a3f6f',
  primaryL:  '#2558a3',
  primaryXL: '#e8f0fb',
  accent:    '#3a9e6c',
  accentL:   '#e8f7f0',
  warnY:     '#f0c330',
  warnO:     '#e07a20',
  warnR:     '#c0392b',
  gray:      '#dde3ec',
  bg:        '#f5f7fa',
  teal:      '#17a2b8',
};

// =========================================================
// スコアのラベル・色を返す
// =========================================================
function getScoreLabel(score) {
  if (score >= 85) return { label: '非常に良好', colorClass: 'text-green',  barColor: '#3a9e6c' };
  if (score >= 70) return { label: '概ね良好',   colorClass: 'text-green',  barColor: '#27ae60' };
  if (score >= 55) return { label: '要確認',     colorClass: 'text-orange', barColor: '#e07a20' };
  return                  { label: '要改善',     colorClass: 'text-red',    barColor: '#c0392b' };
}

// =========================================================
// 数値フォーマット
// =========================================================
const fmt  = v => Math.round(v).toLocaleString('ja-JP');
const fmtY = v => `${fmt(v)} 万円`;
const fmtA = v => `${v} 歳`;

// =========================================================
// Chart インスタンス管理（再描画時に破棄）
// =========================================================
const chartInstances = {};
function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

// =========================================================
// メインレンダラー
// =========================================================
const ResultRenderer = {

  render(data) {
    const main = document.getElementById('result-main');
    if (!main) return;

    // 計算エンジンで年次データ生成
    const { rows, events, meta, emergencyFund } = CalcEngine.calcCashflow(data);
    const scores = CalcEngine.calcScores(rows, data, meta, emergencyFund);
    const issues = CalcEngine.extractIssues(rows, data, meta, scores, emergencyFund);

    const r = { rows, events, meta, emergencyFund, scores, issues, data };
    main.innerHTML = this.buildHtml(r);
    this.initCharts(r);
  },

  // ===================================================
  // HTML生成
  // ===================================================
  buildHtml(r) {
    const { scores, issues, meta, emergencyFund, rows, data } = r;
    const overallL = getScoreLabel(scores.overall);
    const selfAge  = parseInt(data.family?.ageSelf || 35);
    const retireAge= parseInt(data.income1?.retireAge || 65);
    const retireRow= rows.find(row => row.age === retireAge) || rows[rows.length - 1];
    const nowRow   = rows[0] || {};

    // ---- スコアカード ----
    const scoreItems = [
      { label: 'ライフプラン', val: scores.lifePlan },
      { label: '万一への備え', val: scores.insurance },
      { label: '資産運用',    val: scores.investment },
    ];

    // ---- キーファクト ----
    const keyFacts = this.buildKeyFacts(meta, rows, data, emergencyFund);

    // ---- 各セクション ----
    return `
      <!-- アクションボタン -->
      <div class="result-actions">
        <button class="btn btn-secondary" id="btn-pdf-save">
          <i class="fa-solid fa-file-pdf"></i> PDFで保存
        </button>
        <button class="btn btn-ghost" id="btn-result-recalc">
          <i class="fa-solid fa-pen-to-square"></i> 入力を修正する
        </button>
      </div>

      <!-- ① 3つの結論 -->
      ${this.buildTopInsights(r, retireRow, nowRow)}

      <!-- ② 家計健康スコア -->
      <div class="score-card">
        <p class="score-card-title">家計健康スコア</p>
        <div class="score-number">${scores.overall}<span>/100</span></div>
        <div class="score-label" style="color:${scores.overall >= 70 ? '#a0e8c0' : '#ffe082'}">
          ${overallL.label}
        </div>
        <p style="font-size:0.75rem;opacity:0.7;margin-bottom:14px;">
          ※ 入力情報に基づく簡易スコアです。目安としてご参照ください。
        </p>
        <div class="score-items">
          ${scoreItems.map(s => {
            const l = getScoreLabel(s.val);
            return `<div class="score-item">
              <div class="score-item-label">${s.label}</div>
              <div class="score-item-val">${s.val}</div>
              <div style="background:rgba(255,255,255,0.2);border-radius:4px;height:4px;overflow:hidden;margin-top:5px;">
                <div style="width:${s.val}%;height:100%;background:${l.barColor};border-radius:4px;"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- ③ キーファクト -->
      <div class="result-section">
        <div class="result-section-header">
          <i class="fa-solid fa-calendar-check result-section-icon"></i>
          <span class="result-section-title">主要な確認ポイント</span>
        </div>
        <div class="result-section-body">
          ${keyFacts}
        </div>
      </div>

      <!-- ④ ライフプラン概要 -->
      <div class="result-section">
        <div class="result-section-header">
          <i class="fa-solid fa-timeline result-section-icon"></i>
          <span class="result-section-title">ライフプラン</span>
        </div>
        <div class="result-section-body">
          ${this.buildStatusBar(scores.lifePlan)}
          <p class="status-detail">
            現在 <strong>${selfAge}歳</strong>、退職予定 <strong>${retireAge}歳</strong>。
            ${data.family?.hasSpouse === 'yes' ? `配偶者（${data.family.ageSpouse}歳）。` : ''}
            子ども <strong>${parseInt(data.family?.childrenCount || 0)}人</strong>。
          </p>
          <p class="status-detail">
            現在の年間収入（試算）：<strong>${fmtY(nowRow.income)}</strong> ／
            年間支出（試算）：<strong>${fmtY(nowRow.expense)}</strong>
          </p>
          <p class="status-detail">
            現在の総資産：<strong>${fmtY(nowRow.totalAsset)}</strong>
            （現預金 ${fmtY(nowRow.cash)}、運用資産 ${fmtY(nowRow.investment)}、DC/iDeCo ${fmtY(nowRow.dc)}）
          </p>
          <p class="status-detail">
            退職時（${retireAge}歳）の資産試算：<strong>${retireRow ? fmtY(retireRow.totalAsset) : '―'}</strong>
          </p>
          ${meta.assetDepletionAge
            ? `<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i>
                <strong>${meta.assetDepletionAge}歳頃に資産が枯渇する見込み</strong>です。早期の対策をご検討ください。</div>`
            : `<div class="alert alert-success"><i class="fa-solid fa-circle-check"></i>
                90歳まで資産枯渇なし（試算）。引き続き計画的な資産形成を続けましょう。</div>`
          }
        </div>
      </div>

      <!-- ⑤ 万一への備え -->
      <div class="result-section">
        <div class="result-section-header">
          <i class="fa-solid fa-shield-halved result-section-icon"></i>
          <span class="result-section-title">万一への備え（保険）</span>
        </div>
        <div class="result-section-body">
          ${this.buildStatusBar(scores.insurance)}
          <p class="status-detail">
            必要保障額の試算（月額 × 年数）：<strong>${fmtY(scores.totalNeed)}</strong><br>
            現在の死亡保障額（試算）：<strong>${fmtY(scores.currentCov)}</strong><br>
            ${scores.insGap > 0
              ? `<span style="color:var(--color-warn-o)"><strong>不足額の試算：約 ${fmtY(scores.insGap)}</strong></span>`
              : `<span style="color:var(--color-accent)"><strong>試算上は充足しています</strong></span>`}
          </p>
          ${data.insurance?.hasLifeIns === 'no'
            ? `<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> 死亡保障に加入していません。万一の際に遺族の生活費が確保できない可能性があります。</div>` : ''}
          ${data.insurance?.hasLifeIns === 'unsure'
            ? `<div class="alert alert-warn"><i class="fa-solid fa-triangle-exclamation"></i> 死亡保障の内容を確認してください。保険証券や保険会社に問い合わせてみましょう。</div>` : ''}
          ${data.insurance?.hasMedical === 'no'
            ? `<div class="alert alert-warn"><i class="fa-solid fa-triangle-exclamation"></i> 医療保険の加入がありません。高額療養費制度と合わせて確認しましょう。</div>` : ''}
          ${data.insurance?.hasDisability === 'no'
            ? `<div class="alert alert-warn"><i class="fa-solid fa-triangle-exclamation"></i> 就業不能保険の加入状況を確認してください。長期入院・療養に備える保障です。</div>` : ''}
          <p style="font-size:0.78rem;color:var(--color-text-mute);">
            ※ 遺族年金・公的保障は考慮していません。詳細はFPへご相談ください。
          </p>
        </div>
      </div>

      <!-- ⑥ 資産運用 -->
      <div class="result-section">
        <div class="result-section-header">
          <i class="fa-solid fa-chart-line result-section-icon"></i>
          <span class="result-section-title">資産運用</span>
        </div>
        <div class="result-section-body">
          ${this.buildStatusBar(scores.investment)}
          <p class="status-detail">
            運用方針：<strong>${{conservative:'堅め（1.5%/年）',moderate:'通常（3.0%/年）',aggressive:'積極的（5.0%/年）'}[data.assets?.investPolicy] || '通常（3.0%/年）'}</strong><br>
            毎月積立（NISA等）：<strong>${data.assets?.monthlySaving || 0} 万円/月</strong>、
            DC/iDeCo：<strong>${data.assets?.dcMonthly || 0} 万円/月</strong>
          </p>
          <p class="status-detail">
            退職時（${retireAge}歳）の試算資産：<strong>${retireRow ? fmtY(retireRow.totalAsset) : '―'}</strong>
            （うち現預金 ${retireRow ? fmtY(retireRow.cash) : '―'}、運用資産 ${retireRow ? fmtY(retireRow.investment) : '―'}、DC/iDeCo ${retireRow ? fmtY(retireRow.dc) : '―'}）
          </p>
          ${meta.investWithdrawStartAge
            ? `<p class="status-detail">運用資産の取り崩し開始の見込み：<strong>${meta.investWithdrawStartAge}歳頃</strong></p>` : ''}
          <p style="font-size:0.78rem;color:var(--color-text-mute);">
            ※ 運用成果・税制優遇効果を保証するものではありません。
          </p>
        </div>
      </div>

      <!-- ⑦ 住まい・住宅資金 -->
      <div class="result-section">
        <div class="result-section-header">
          <i class="fa-solid fa-house result-section-icon"></i>
          <span class="result-section-title">住まい・住宅資金</span>
        </div>
        <div class="result-section-body">
          ${this.buildStatusBar(scores.housing)}
          ${data.housing?.purchasePlan === 'yes' ? `
          <p class="status-detail">
            購入予定年齢：<strong>${data.housing.buyAge}歳</strong>、
            物件価格：<strong>${fmtY(parseFloat(data.housing.price || 0))}</strong>、
            頭金：<strong>${fmtY(parseFloat(data.housing.downPayment || 0))}</strong>
          </p>
          <p class="status-detail">
            ローン返済期間：${data.housing.loanTerm}年 ／ 想定金利：${data.housing.interestRate}%<br>
            ${meta.loanPayoffAge ? `完済予定年齢：<strong>${meta.loanPayoffAge}歳</strong>` : ''}
          </p>
          ${(() => {
            const buyAgeNum = parseInt(data.housing.buyAge || 99);
            const buyRow = rows.find(row => row.age === buyAgeNum);
            const ratio = buyRow && buyRow.income > 0
              ? (buyRow.housingCost / buyRow.income * 100).toFixed(1) + '%'
              : scores.housingRatio > 0 ? scores.housingRatio + '%' : '―';
            return `<p class="status-detail">
              購入後のローン返済負担率（目安）：
              <strong>${ratio}</strong>
              <span style="font-size:0.78rem;color:var(--color-text-mute);">（目安：手取り収入の25%以内）</span>
            </p>`;
          })()}
          ` : `
          <p class="status-detail">
            現在の住まい：<strong>${{rent:'賃貸',own:'持ち家（ローン中）',paid:'持ち家（完済）',other:'その他'}[data.housing?.currentType] || '―'}</strong>。
            月額住居費：<strong>${data.housing?.monthlyCost || 0} 万円/月</strong>。
          </p>
          ${meta.loanPayoffAge ? `<p class="status-detail">現在のローン完済予定：<strong>${meta.loanPayoffAge}歳</strong></p>` : ''}
          `}
        </div>
      </div>

      <!-- ⑧ 優先課題 -->
      <div class="result-section">
        <div class="result-section-header">
          <i class="fa-solid fa-circle-exclamation result-section-icon" style="color:var(--color-warn-o)"></i>
          <span class="result-section-title">最優先で確認したいこと</span>
        </div>
        <div class="result-section-body">
          ${issues.length === 0
            ? `<div class="alert alert-success"><i class="fa-solid fa-circle-check"></i>
               入力内容の範囲では、特に大きな課題は見当たりません。引き続き計画的な資産形成を続けましょう。</div>`
            : issues.map((issue, idx) => {
                const badges   = ['badge-red', 'badge-orange', 'badge-yellow'];
                const labels   = ['優先度：高', '優先度：中', '優先度：中'];
                const classes  = ['priority-1', 'priority-2', 'priority-3'];
                return `
                  <div class="issue-card ${classes[idx]}">
                    <span class="issue-badge ${badges[idx]}">${labels[idx]}</span>
                    <div class="issue-title">${issue.title}</div>
                    <div class="issue-why">${issue.why}</div>
                    <div class="issue-action">
                      <strong><i class="fa-solid fa-clipboard-list"></i> まず確認すること：</strong><br>
                      ${issue.action}
                    </div>
                  </div>`;
              }).join('')}
        </div>
      </div>

      <!-- ⑨ その他の確認ポイント -->
      <div class="result-section">
        <div class="result-section-header">
          <i class="fa-solid fa-list-check result-section-icon"></i>
          <span class="result-section-title">その他の確認ポイント</span>
        </div>
        <div class="result-section-body">
          <ul style="padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;">
            <li class="alert alert-info"><i class="fa-solid fa-circle-info"></i>
              <div><strong>ねんきんネット</strong>で年金見込額を確認しましょう。iDeCo・NISAの非課税メリットを最大限に活用することも重要です。</div>
            </li>
            <li class="alert alert-info"><i class="fa-solid fa-circle-info"></i>
              <div><strong>緊急予備費</strong>（生活費6か月分 ≒ ${fmtY(emergencyFund)}）が手元現金で確保できているか確認しましょう。</div>
            </li>
            ${parseInt(data.family?.childrenCount || 0) > 0 ? `
            <li class="alert alert-info"><i class="fa-solid fa-circle-info"></i>
              <div><strong>教育費</strong>は小学校〜大学まで累計で数百万〜1,000万円超かかることがあります。学資保険・ジュニアNISAの活用も検討しましょう。</div>
            </li>` : ''}
            ${meta.maxEduCostAge ? `
            <li class="alert alert-info"><i class="fa-solid fa-circle-info"></i>
              <div>教育費が最も高くなる見込み時期：<strong>${meta.maxEduCostAge}歳頃</strong>（年間 ${fmtY(rows.find(r=>r.age===meta.maxEduCostAge)?.eduCost||0)}）。この時期の収支を事前に確認してください。</div>
            </li>` : ''}
            <li class="alert alert-info"><i class="fa-solid fa-circle-info"></i>
              <div><strong>高額療養費制度・傷病手当金</strong>など公的保障の内容を把握したうえで、民間保険の必要性を評価しましょう。</div>
            </li>
          </ul>
        </div>
      </div>

      <!-- ⑩ グラフ -->
      <div class="result-section">
        <div class="result-section-header">
          <i class="fa-solid fa-chart-bar result-section-icon"></i>
          <span class="result-section-title">収支・資産のグラフ</span>
        </div>
        <div class="result-section-body">

          <p class="chart-title"><i class="fa-solid fa-chart-column"></i> 年間収入・年間支出・年間収支の推移</p>
          <div class="chart-container" style="height:280px;">
            <canvas id="chart-cashflow"></canvas>
          </div>
          <div id="chart-cashflow-events" class="chart-events-row"></div>
          <p style="font-size:0.75rem;color:var(--color-text-mute);margin-bottom:20px;">
            ※ 横軸は本人年齢。退職後は年金収入のみ（概算）。
          </p>

          <p class="chart-title"><i class="fa-solid fa-chart-area"></i> 資産推移（現預金・運用資産・DC/iDeCo・合計）</p>
          <div class="chart-container" style="height:300px;">
            <canvas id="chart-assets"></canvas>
          </div>
          <div id="chart-assets-events" class="chart-events-row"></div>
          <p style="font-size:0.75rem;color:var(--color-text-mute);margin-bottom:20px;">
            ※ 生活防衛資金ライン（${fmtY(emergencyFund)}）を点線で表示。運用成果は保証しません。
          </p>

          <p class="chart-title"><i class="fa-solid fa-chart-pie"></i> 現在の資産内訳</p>
          <div class="chart-container" style="height:220px;">
            <canvas id="chart-asset-pie"></canvas>
          </div>

        </div>
      </div>

      <!-- ⑪ 年次キャッシュフロー表 -->
      ${this.buildCashflowTable(r)}

      <!-- ⑫ 個別相談 -->
      <div class="consult-card">
        <h3><i class="fa-solid fa-comments"></i> もう少し具体的に整理したい方へ</h3>
        <p class="consult-lead">
          住宅購入、教育費、老後資金、保険、資産運用など、複数の条件を踏まえた個別のシミュレーションをご希望の場合は、ファイナンシャルプランナーへご相談ください。
        </p>
        <div class="consult-info">
          <div class="consult-info-role">ファイナンシャルプランナー</div>
          <div class="consult-info-name">石井 悠己也</div>
          <div class="consult-info-email"><i class="fa-solid fa-envelope"></i> yukiya.fp1106@gmail.com</div>
        </div>
        <div class="consult-actions">
          <button class="btn btn-accent" id="btn-consult-email">
            <i class="fa-solid fa-envelope"></i> この結果について相談する
          </button>
          <button class="btn" style="background:rgba(255,255,255,0.18);color:#fff;border-color:rgba(255,255,255,0.3);" id="btn-pdf-save">
            <i class="fa-solid fa-file-pdf"></i> まずPDFで保存する
          </button>
        </div>
      </div>

      <!-- 注意書き -->
      <div class="card card-notice" style="margin-bottom:16px;">
        <h3><i class="fa-solid fa-triangle-exclamation text-orange"></i> 注意事項</h3>
        <p>本診断は、入力情報と一定の前提条件に基づく<strong>簡易シミュレーション</strong>です。将来の収入・物価・運用成果・税金・社会保険・年金・住宅ローン金利などを保証するものではありません。</p>
        <p>本診断は、金融商品・保険商品・住宅ローン等の契約を推奨するものではありません。具体的なご検討にあたっては、ファイナンシャルプランナー等の専門家へご相談ください。</p>
      </div>
    `;
  },

  // ===================================================
  // 3つの結論
  // ===================================================
  buildTopInsights(r, retireRow, nowRow) {
    const { meta, data, rows } = r;
    const retireAge = parseInt(data.income1?.retireAge || 65);
    const firstDepletion = meta.assetDepletionAge
      ? `${meta.assetDepletionAge}歳頃`
      : '90歳まで枯渇なし';
    const retireAsset = retireRow ? retireRow.totalAsset : 0;
    const finalRow = rows[rows.length - 1] || {};
    const annualGap = nowRow ? (nowRow.income - nowRow.expense) : 0;

    const cards = [
      {
        icon: 'fa-location-dot',
        label: 'いまの年間収支',
        value: `${annualGap >= 0 ? '+' : ''}${fmtY(annualGap)}`,
        note: `収入 ${fmtY(nowRow?.income || 0)} / 支出 ${fmtY(nowRow?.expense || 0)}`,
        tone: annualGap >= 0 ? 'good' : 'warn',
      },
      {
        icon: 'fa-flag-checkered',
        label: `${retireAge}歳時点の資産`,
        value: fmtY(retireAsset),
        note: '退職金・DC受取・積立を含む概算',
        tone: retireAsset > 0 ? 'good' : 'warn',
      },
      {
        icon: meta.assetDepletionAge ? 'fa-triangle-exclamation' : 'fa-mountain-sun',
        label: '老後資金の見通し',
        value: firstDepletion,
        note: meta.assetDepletionAge
          ? `最終年の資産 ${fmtY(finalRow.totalAsset || 0)}`
          : `90歳時点の資産 ${fmtY(finalRow.totalAsset || 0)}`,
        tone: meta.assetDepletionAge ? 'danger' : 'good',
      },
    ];

    return `
      <div class="mini-insights">
        <div class="mini-insights-head">
          <span class="mini-eyebrow">LIFE COMPASS MINI</span>
          <h2>まず見る3つの結論</h2>
          <p>グラフを見る前に、家計の現在地・退職時点・老後資金の見通しをざっくり確認します。</p>
        </div>
        <div class="mini-insight-grid">
          ${cards.map(c => `
            <div class="mini-insight-card ${c.tone}">
              <i class="fa-solid ${c.icon}"></i>
              <span class="mini-insight-label">${c.label}</span>
              <strong>${c.value}</strong>
              <small>${c.note}</small>
            </div>
          `).join('')}
        </div>
      </div>`;
  },

  // ===================================================
  // キーファクト（主要確認ポイント）の生成
  // ===================================================
  buildKeyFacts(meta, rows, data, emergencyFund) {
    const facts = [];
    const selfAge  = parseInt(data.family?.ageSelf || 35);
    const retireAge= parseInt(data.income1?.retireAge || 65);

    // 資産枯渇
    facts.push({
      icon:  meta.assetDepletionAge ? 'fa-triangle-exclamation' : 'fa-circle-check',
      color: meta.assetDepletionAge ? 'var(--color-warn-r)' : 'var(--color-accent)',
      label: '資産枯渇',
      value: meta.assetDepletionAge
        ? `${meta.assetDepletionAge}歳頃に枯渇の見込み`
        : '90歳まで枯渇なし（試算）',
    });

    // 取り崩し開始
    facts.push({
      icon:  'fa-arrow-trend-down',
      color: meta.investWithdrawStartAge ? 'var(--color-warn-o)' : 'var(--color-text-mute)',
      label: '運用資産の取り崩し開始',
      value: meta.investWithdrawStartAge
        ? `${meta.investWithdrawStartAge}歳頃から`
        : '取り崩しなし（試算）',
    });

    // 現預金が防衛資金を下回る年齢
    facts.push({
      icon:  'fa-wallet',
      color: meta.cashBelowEmergencyAge ? 'var(--color-warn-o)' : 'var(--color-accent)',
      label: '現預金が防衛資金を下回る',
      value: meta.cashBelowEmergencyAge
        ? `${meta.cashBelowEmergencyAge}歳頃から`
        : '90歳まで下回らない（試算）',
    });

    // 住宅ローン完済
    if (meta.loanPayoffAge) {
      facts.push({
        icon:  'fa-house-circle-check',
        color: 'var(--color-primary-l)',
        label: 'ローン完済予定',
        value: `${meta.loanPayoffAge}歳`,
      });
    }

    // 教育費ピーク
    if (meta.maxEduCostAge) {
      const maxRow = rows.find(r => r.age === meta.maxEduCostAge);
      facts.push({
        icon:  'fa-graduation-cap',
        color: 'var(--color-primary-l)',
        label: '教育費がピーク',
        value: `${meta.maxEduCostAge}歳頃（年間 ${fmtY(maxRow?.eduCost || 0)}）`,
      });
    }

    return `
      <div style="display:grid;grid-template-columns:1fr;gap:8px;">
        ${facts.map(f => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--color-bg);border-radius:8px;border-left:3px solid ${f.color};">
            <i class="fa-solid ${f.icon}" style="color:${f.color};font-size:1.1rem;flex-shrink:0;width:20px;text-align:center;"></i>
            <div>
              <div style="font-size:0.78rem;color:var(--color-text-sub);">${f.label}</div>
              <div style="font-size:0.95rem;font-weight:700;">${f.value}</div>
            </div>
          </div>
        `).join('')}
      </div>`;
  },

  // ===================================================
  // ステータスバー
  // ===================================================
  buildStatusBar(score) {
    const l = getScoreLabel(score);
    return `
      <div class="status-bar">
        <div class="status-indicator" style="background:${l.barColor};"></div>
        <span class="status-label">${l.label}（${score}点）</span>
      </div>`;
  },

  // ===================================================
  // 年次キャッシュフロー表
  // ===================================================
  buildCashflowTable(r) {
    const eventMap = new Map();
    r.events.forEach(e => {
      const list = eventMap.get(e.age) || [];
      list.push(e.label);
      eventMap.set(e.age, list);
    });

    const rowsHtml = r.rows.map(row => {
      const events = eventMap.get(row.age) || [];
      const annualBalance = row.income - row.expense;
      const rowClass = [
        events.length ? 'has-event' : '',
        r.meta.assetDepletionAge === row.age ? 'is-depletion' : '',
        row.savingShortfall > 0 ? 'has-saving-adjust' : '',
      ].filter(Boolean).join(' ');
      const eventText = events.length ? events.join(' / ') : '';
      return `
        <tr class="${rowClass}">
          <td>${row.age}歳</td>
          <td>${fmt(row.income)}</td>
          <td>${fmt(row.expense)}</td>
          <td class="${annualBalance < 0 ? 'num-minus' : 'num-plus'}">${annualBalance >= 0 ? '+' : ''}${fmt(annualBalance)}</td>
          <td>${fmt(row.cash)}</td>
          <td>${fmt(row.investment)}</td>
          <td>${fmt(row.dc)}</td>
          <td><strong>${fmt(row.totalAsset)}</strong></td>
          <td>${eventText}${row.savingShortfall > 0 ? `${eventText ? ' / ' : ''}積立を${fmt(row.savingShortfall)}万円自動調整` : ''}</td>
        </tr>`;
    }).join('');

    return `
      <div class="result-section">
        <div class="result-section-header">
          <i class="fa-solid fa-table result-section-icon"></i>
          <span class="result-section-title">年ごとのキャッシュフロー表</span>
        </div>
        <div class="result-section-body">
          <details class="cashflow-details">
            <summary>
              <span><i class="fa-solid fa-magnifying-glass-chart"></i> グラフの内訳を表で確認する</span>
              <small>収入・支出・資産残高を年齢別に表示</small>
            </summary>
            <div class="cashflow-table-note">
              金額は万円単位です。支出には生活費・教育費・住居費・保険料・臨時支出・実行できた積立を含みます。
            </div>
            <div class="cashflow-table-wrap">
              <table class="cashflow-table">
                <thead>
                  <tr>
                    <th>年齢</th>
                    <th>収入</th>
                    <th>支出</th>
                    <th>年間収支</th>
                    <th>現預金</th>
                    <th>運用資産</th>
                    <th>DC/iDeCo</th>
                    <th>資産合計</th>
                    <th>イベント</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>
          </details>
        </div>
      </div>`;
  },

  // ===================================================
  // グラフ初期化
  // ===================================================
  initCharts(r) {
    setTimeout(() => {
      this.drawCashflowChart(r);
      this.drawAssetsChart(r);
      this.drawAssetPieChart(r);
    }, 120);
  },

  // ===================================================
  // グラフ用ラベル（5年おきに表示）
  // ===================================================
  makeLabels(rows) {
    return rows.map(r => r.age % 5 === 0 ? `${r.age}歳` : '');
  },

  // ===================================================
  // イベントラベルのHTML生成
  // ===================================================
  buildEventsRow(events, rows, containerId) {
    const container = document.getElementById(containerId);
    if (!container || events.length === 0) return;

    const typeColors = {
      retire: COLORS.primaryL,
      pension: COLORS.accent,
      house:  COLORS.warnO,
      edu:    COLORS.teal,
      dc:     COLORS.warnY,
    };

    container.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 2px;">
        ${events.slice(0, 12).map(e => `
          <span style="
            font-size:0.72rem;background:${typeColors[e.type]||'#888'};color:#fff;
            padding:2px 7px;border-radius:10px;display:inline-flex;align-items:center;gap:4px;">
            <i class="fa-solid fa-tag" style="font-size:0.65rem;"></i>
            ${e.age}歳：${e.label}
          </span>`).join('')}
      </div>`;
  },

  // ===================================================
  // ① 収支推移グラフ（棒グラフ + 折れ線）
  // ===================================================
  drawCashflowChart(r) {
    destroyChart('cashflow');
    const ctx = document.getElementById('chart-cashflow');
    if (!ctx) return;

    const labels  = this.makeLabels(r.rows);
    const income  = r.rows.map(row => row.income);
    const expense = r.rows.map(row => row.expense);
    const net     = r.rows.map(row => row.income - row.expense);

    chartInstances['cashflow'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '年間収入（万円）',
            data: income,
            backgroundColor: 'rgba(37,88,163,0.75)',
            borderRadius: 2,
            order: 2,
          },
          {
            label: '年間支出（万円）',
            data: expense,
            backgroundColor: 'rgba(224,122,32,0.65)',
            borderRadius: 2,
            order: 2,
          },
          {
            label: '年間収支（積立後・万円）',
            data: net,
            type: 'line',
            borderColor: COLORS.accent,
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 14 } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}：${fmt(ctx.parsed.y)} 万円`,
            },
          },
        },
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 0 } },
          y: { ticks: { font: { size: 10 }, callback: v => fmt(v) + '万' } },
        },
      },
    });

    // イベントラベル
    this.buildEventsRow(
      r.events.filter(e => ['retire','pension','edu'].includes(e.type)),
      r.rows,
      'chart-cashflow-events'
    );
  },

  // ===================================================
  // ② 資産推移グラフ（3資産分離 + 合計 + 防衛資金ライン）
  // ===================================================
  drawAssetsChart(r) {
    destroyChart('assets');
    const ctx = document.getElementById('chart-assets');
    if (!ctx) return;

    const labels     = this.makeLabels(r.rows);
    const cash       = r.rows.map(row => row.cash);
    const investment = r.rows.map(row => row.investment);
    const dc         = r.rows.map(row => row.dc);
    const total      = r.rows.map(row => row.totalAsset);
    const emergency  = r.rows.map(() => r.emergencyFund);

    chartInstances['assets'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '現預金',
            data: cash,
            borderColor: COLORS.primaryL,
            backgroundColor: 'rgba(37,88,163,0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2,
            order: 2,
          },
          {
            label: '運用資産（NISA等）',
            data: investment,
            borderColor: COLORS.accent,
            backgroundColor: 'rgba(58,158,108,0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2,
            order: 2,
          },
          {
            label: 'DC・iDeCo',
            data: dc,
            borderColor: COLORS.warnY,
            backgroundColor: 'rgba(240,195,48,0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2,
            order: 2,
          },
          {
            label: '資産合計',
            data: total,
            borderColor: COLORS.primary,
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            borderDash: [],
            pointRadius: 0,
            tension: 0.3,
            order: 1,
          },
          {
            label: `生活防衛資金（${fmtY(r.emergencyFund)}）`,
            data: emergency,
            borderColor: COLORS.warnR,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [6, 4],
            pointRadius: 0,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 10 }, boxWidth: 12, padding: 8 },
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}：${fmt(ctx.parsed.y)} 万円`,
            },
          },
        },
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 0 } },
          y: {
            ticks: { font: { size: 10 }, callback: v => fmt(v) + '万' },
            min: 0,
          },
        },
      },
    });

    // イベントラベル
    this.buildEventsRow(
      r.events.filter(e => ['house','dc','retire'].includes(e.type)),
      r.rows,
      'chart-assets-events'
    );
  },

  // ===================================================
  // ③ 資産内訳ドーナツグラフ
  // ===================================================
  drawAssetPieChart(r) {
    destroyChart('pie');
    const ctx = document.getElementById('chart-asset-pie');
    if (!ctx) return;

    const nowRow = r.rows[0] || {};
    const cash  = nowRow.cash       || 0;
    const inv   = nowRow.investment || 0;
    const dc    = nowRow.dc         || 0;

    if (cash + inv + dc === 0) {
      ctx.parentElement.innerHTML += '<p class="text-center" style="font-size:0.85rem;color:var(--color-text-mute);">資産データが入力されていません</p>';
      return;
    }

    chartInstances['pie'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['現預金', 'NISA・運用資産', 'DC・iDeCo'],
        datasets: [{
          data:            [cash, inv, dc],
          backgroundColor: [COLORS.primaryL, COLORS.accent, COLORS.warnY],
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 14 } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return `${ctx.label}：${fmt(ctx.parsed)} 万円（${pct}%）`;
              },
            },
          },
        },
      },
    });
  },
};

window.ResultRenderer = ResultRenderer;

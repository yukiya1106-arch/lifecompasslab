/**
 * pdf.js
 * =========================================================
 * 家計コンパス β版 - PDF保存機能
 *
 * html2canvas でHTMLをキャプチャ → jsPDF に貼り付け
 * 日本語が正確に出力されます。
 *
 * 詳細版：すべての入力金額 + 診断結果 + グラフ
 * 簡易版：家族構成・教育・住宅・主要前提・診断結果 + グラフ
 * =========================================================
 */

'use strict';

const PdfExporter = {

  async export(mode, data) {
    this.showLoading(true);
    try {
      // 計算エンジンで結果を計算
      const { rows, events, meta, emergencyFund } = CalcEngine.calcCashflow(data);
      const scores = CalcEngine.calcScores(rows, data, meta, emergencyFund);
      const issues = CalcEngine.extractIssues(rows, data, meta, scores, emergencyFund);

      const html = this.buildPdfHtml(mode, data, { rows, meta, scores, issues, emergencyFund });
      await this.renderAndSave(html, mode);
    } catch (e) {
      console.error('[PDF] 生成エラー:', e);
      alert('PDFの生成に失敗しました。ブラウザの印刷機能（Ctrl+P / ⌘P）をご利用ください。');
    } finally {
      this.showLoading(false);
    }
  },

  // ---------------------------------------------------
  showLoading(show) {
    let el = document.getElementById('pdf-loading');
    if (show) {
      if (!el) {
        el = document.createElement('div');
        el.id = 'pdf-loading';
        el.style.cssText = [
          'position:fixed;inset:0;background:rgba(10,20,40,0.65);',
          'display:flex;align-items:center;justify-content:center;',
          'z-index:9999;flex-direction:column;gap:16px;',
          'color:#fff;font-size:1rem;font-family:sans-serif;',
        ].join('');
        el.innerHTML = `
          <div style="width:44px;height:44px;border:4px solid rgba(255,255,255,0.3);
            border-top-color:#fff;border-radius:50%;animation:pdf-spin 0.8s linear infinite;"></div>
          <div>PDFを生成しています…<br><small style="opacity:0.7">しばらくお待ちください</small></div>`;
        if (!document.getElementById('pdf-spin-style')) {
          const s = document.createElement('style');
          s.id = 'pdf-spin-style';
          s.textContent = '@keyframes pdf-spin{to{transform:rotate(360deg)}}';
          document.head.appendChild(s);
        }
        document.body.appendChild(el);
      }
    } else { el?.remove(); }
  },

  // ---------------------------------------------------
  async renderAndSave(htmlContent, mode) {
    const { jsPDF } = window.jspdf;

    const container = document.createElement('div');
    container.style.cssText = [
      'position:fixed;left:-9999px;top:0;',
      'width:800px;background:#fff;',
      'padding:24px 20px;font-family:"Noto Sans JP","Hiragino Sans","Meiryo",sans-serif;',
      'line-height:1.7;color:#1f2d3d;font-size:13px;',
    ].join('');
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    await this.injectChartImages(container);
    await new Promise(r => setTimeout(r, 400));

    try {
      const canvas = await html2canvas(container, {
        scale: 1.8, useCORS: true, logging: false, backgroundColor: '#ffffff',
      });

      const imgData   = canvas.toDataURL('image/jpeg', 0.92);
      const pdfW = 210, pdfH = 297, margin = 10;
      const printW = pdfW - margin * 2, printH = pdfH - margin * 2;
      const imgWidth  = canvas.width;
      const imgHeight = canvas.height;
      const mmPerPx   = printW / imgWidth;
      const totalMM   = imgHeight * mmPerPx;
      const pageCount = Math.ceil(totalMM / printH);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      for (let p = 0; p < pageCount; p++) {
        if (p > 0) doc.addPage();
        const srcY  = (p * printH / mmPerPx);
        const srcH  = Math.min(printH / mmPerPx, imgHeight - srcY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width  = imgWidth;
        pageCanvas.height = Math.round(srcH);
        pageCanvas.getContext('2d').drawImage(canvas, 0, -Math.round(srcY));
        const pageImg = pageCanvas.toDataURL('image/jpeg', 0.92);

        doc.addImage(pageImg, 'JPEG', margin, margin, printW, srcH * mmPerPx);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `家計コンパス β版 | ${p+1}/${pageCount}ページ | FP: 石井 悠己也`,
          margin, pdfH - 4
        );
      }

      const fname = mode === 'detail'
        ? `家計コンパス_詳細版_${this.dateStr()}.pdf`
        : `家計コンパス_簡易版_${this.dateStr()}.pdf`;
      doc.save(fname);
    } finally {
      container.remove();
    }
  },

  // ---------------------------------------------------
  async injectChartImages(container) {
    for (const id of ['chart-cashflow', 'chart-assets', 'chart-asset-pie']) {
      const orig = document.getElementById(id);
      if (!orig) continue;
      try {
        const dataUrl = orig.toDataURL('image/png');
        const ph = container.querySelector(`[data-chart-id="${id}"]`);
        if (ph) {
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.cssText = 'width:100%;height:auto;display:block;border-radius:6px;';
          ph.replaceWith(img);
        }
      } catch (e) { console.warn('[PDF] chart inject failed:', id, e); }
    }
  },

  // ---------------------------------------------------
  buildPdfHtml(mode, data, calc) {
    const { rows, meta, scores, issues, emergencyFund } = calc;
    const fmt  = v => Math.round(v).toLocaleString('ja-JP');
    const fmtY = v => `${fmt(v)} 万円`;
    const fmtA = v => v ? `${v} 歳` : '―';
    const yen  = v => v ? `${Number(v).toLocaleString('ja-JP')} 万円` : '―';
    const yesNo = v => v === 'yes' ? 'あり' : v === 'no' ? 'なし' : v === 'unsure' ? '不明' : '―';

    const f   = data.family    || {};
    const i1  = data.income1   || {};
    const i2  = data.income2   || {};
    const lv  = data.living    || {};
    const as  = data.assets    || {};
    const hw  = data.housing   || {};
    const ins = data.insurance || {};

    const selfAge  = parseInt(f.ageSelf || 35);
    const retireAge= parseInt(i1.retireAge || 65);
    const retireRow= rows.find(r => r.age === retireAge) || rows[rows.length - 1];
    const nowRow   = rows[0] || {};

    const eduPLabels = {
      public:'公立中心', univ_private:'大学から私立', high_private:'高校から私立',
      mid_private:'中学から私立', private:'私立中心', undecided:'まだ決めていない',
    };
    const workLabels = {
      employee_full:'会社員（正規）', employee_part:'会社員（非正規）',
      self_employed:'自営業・フリーランス', officer:'役員・経営者',
      not_working:'現在就労なし', other:'その他',
    };
    const investLabels = {conservative:'堅め（1.5%）',moderate:'通常（3.0%）',aggressive:'積極的（5.0%）'};

    const scoreColor = s => s >= 70 ? '#27ae60' : s >= 55 ? '#e07a20' : '#c0392b';

    // 子ども行
    const cc = parseInt(f.childrenCount || 0);
    let childRows = '';
    const eduMap = {high:'高校卒業',vocational:'専門学校卒業',junior:'短大卒業',university:'大学卒業'};
    for (let i = 0; i < cc; i++) {
      const c = (f.children || [])[i] || {};
      childRows += `<tr><td>第${i+1}子</td><td>${fmtA(c.age)}　${eduMap[c.education] || '―'}</td></tr>`;
    }

    // 優先課題
    const issueHtml = issues.map((iss, idx) => `
      <div style="border:1.5px solid ${['#c0392b','#e07a20','#f0c330'][idx]};border-radius:6px;padding:10px;margin-bottom:8px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${iss.title}</div>
        <div style="font-size:11px;color:#5a6a7e;margin-bottom:6px;line-height:1.5;">${iss.why}</div>
        <div style="background:#e8f7f0;border-left:3px solid #3a9e6c;padding:6px 8px;font-size:11px;border-radius:0 4px 4px 0;">
          まず確認すること：${iss.action}
        </div>
      </div>`).join('');

    // 詳細版の追加HTML
    const detailSection = mode === 'detail' ? `
      <h2>A. 本人の収入（詳細）</h2>
      <table>
        <tr><td>働き方</td><td>${workLabels[i1.workType] || '―'}</td></tr>
        <tr><td>額面年収</td><td>${yen(i1.grossIncome)}</td></tr>
        <tr><td>手取り年収</td><td>${yen(i1.netIncome)}</td></tr>
        <tr><td>収入カーブ</td><td>${{flat:'横ばい',up1:'毎年1%上昇',up2:'毎年2%上昇',down50:'50歳から10%減',down60:'60歳から30%減'}[i1.incomeCurve]||'―'}</td></tr>
        <tr><td>就業終了年齢</td><td>${fmtA(i1.retireAge)}</td></tr>
        <tr><td>年金受給開始年齢</td><td>${fmtA(i1.pensionStartAge)}</td></tr>
        <tr><td>年金見込額（月・65歳基準）</td><td>${i1.pensionAmount ? i1.pensionAmount + ' 万円/月' : '―'}</td></tr>
        <tr><td>その他収入</td><td>${yen(i1.otherIncome)}</td></tr>
        <tr><td>退職金</td><td>${yen(i1.severancePay)}</td></tr>
      </table>
      ${f.hasSpouse === 'yes' ? `
      <h2>B. 配偶者の収入（詳細）</h2>
      <table>
        <tr><td>働き方</td><td>${workLabels[i2.workType] || '―'}</td></tr>
        <tr><td>額面年収</td><td>${yen(i2.grossIncome)}</td></tr>
        <tr><td>手取り年収</td><td>${yen(i2.netIncome)}</td></tr>
        <tr><td>就業終了年齢</td><td>${fmtA(i2.retireAge)}</td></tr>
        <tr><td>退職金</td><td>${yen(i2.severancePay)}</td></tr>
      </table>` : ''}
      <h2>C. 資産と積立（詳細）</h2>
      <table>
        <tr><td>現預金</td><td>${yen(as.cash)}</td></tr>
        <tr><td>NISA・投資資産</td><td>${yen(as.investment)}</td></tr>
        <tr><td>DC・iDeCo残高</td><td>${yen(as.dc)}</td></tr>
        <tr><td>毎月積立（NISA等）</td><td>${as.monthlySaving ? as.monthlySaving + ' 万円/月' : '―'}</td></tr>
        <tr><td>DC・iDeCo掛金</td><td>${as.dcMonthly ? as.dcMonthly + ' 万円/月' : '―'}</td></tr>
        <tr><td>DC受取開始年齢</td><td>${fmtA(as.dcReceiveAge)}</td></tr>
        <tr><td>運用方針</td><td>${investLabels[as.investPolicy] || '―'}</td></tr>
      </table>
      <h2>D. 万一への備え（詳細）</h2>
      <table>
        <tr><td>必要保障額（月額）</td><td>${ins.needMonthly ? ins.needMonthly + ' 万円/月' : '―'}</td></tr>
        <tr><td>保障終了年齢</td><td>${fmtA(ins.needUntilAge)}</td></tr>
        <tr><td>死亡保障の有無</td><td>${{yes:'あり',no:'なし',unsure:'わからない'}[ins.hasLifeIns] || '―'}</td></tr>
        <tr><td>受取方法</td><td>${{lump:'一時金',annuity:'年金型',both:'一時金・年金型両方',unsure:'わからない'}[ins.receiveType] || '―'}</td></tr>
        <tr><td>一時金型死亡保障</td><td>${yen(ins.lumpSumCoverage)}</td></tr>
        <tr><td>年金型死亡保障（月額）</td><td>${ins.incomeProtectMonthly ? ins.incomeProtectMonthly + ' 万円/月' : '―'}</td></tr>
        <tr><td>年金型保障終了年齢</td><td>${fmtA(ins.incomeProtectUntil)}</td></tr>
        <tr><td>毎月の保険料合計</td><td>${ins.monthlyPremium ? Number(ins.monthlyPremium).toLocaleString('ja-JP') + ' 円/月' : ins.annualPremium ? yen(ins.annualPremium) + '/年' : '―'}</td></tr>
        <tr><td>医療保険</td><td>${yesNo(ins.hasMedical)}</td></tr>
        <tr><td>就業不能保険</td><td>${yesNo(ins.hasDisability)}</td></tr>
      </table>
    ` : '';

    const css = `
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Noto Sans JP','Hiragino Sans','Meiryo',sans-serif;font-size:13px;color:#1f2d3d;line-height:1.65;}
      h1{font-size:17px;font-weight:700;color:#fff;margin:0 0 3px;}
      h2{font-size:12.5px;font-weight:700;background:#1a3f6f;color:#fff;padding:5px 10px;margin:14px 0 6px;border-radius:4px;}
      h3{font-size:11.5px;font-weight:700;color:#1a3f6f;background:#e8f0fb;padding:4px 8px;margin:10px 0 5px;border-radius:3px;}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px;}
      td{padding:5px 8px;border-bottom:1px solid #dde3ec;vertical-align:top;}
      td:first-child{color:#5a6a7e;width:44%;}
      td:last-child{font-weight:600;}
      .header-bar{background:#1a3f6f;color:#fff;padding:14px 16px;margin-bottom:14px;border-radius:6px;}
      .score-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:8px 0;}
      .score-box{border:1.5px solid #dde3ec;border-radius:6px;padding:7px 4px;text-align:center;}
      .score-box .val{font-size:18px;font-weight:700;}
      .score-box .lbl{font-size:9px;color:#5a6a7e;line-height:1.3;}
      .key-fact{display:flex;align-items:center;gap:8px;padding:7px 10px;background:#f5f7fa;border-radius:6px;border-left:3px solid #1a3f6f;margin-bottom:5px;}
      .key-fact .lbl{font-size:10px;color:#5a6a7e;}
      .key-fact .val{font-size:12px;font-weight:700;}
      .chart-wrap{margin:8px 0;border:1px solid #dde3ec;border-radius:6px;padding:8px;background:#fafbfc;}
      .chart-label{font-size:11px;font-weight:700;color:#1a3f6f;margin-bottom:6px;}
      .disclaimer{font-size:9px;color:#8a99aa;border-top:1px solid #dde3ec;padding-top:8px;margin-top:12px;line-height:1.6;}
    `;

    return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
      <style>${css}</style></head><body>

      <div class="header-bar">
        <h1>家計コンパス β版　診断レポート${mode === 'detail' ? '（詳細版）' : '（簡易版）'}</h1>
        <div style="font-size:10px;opacity:0.85;">作成日：${new Date().toLocaleDateString('ja-JP')}　FP：石井 悠己也　yukiya.fp1106@gmail.com</div>
      </div>

      <h2>1. 家族構成 / 教育方針</h2>
      <table>
        <tr><td>本人年齢</td><td>${fmtA(f.ageSelf)}</td></tr>
        <tr><td>配偶者</td><td>${f.hasSpouse === 'yes' ? 'あり（' + fmtA(f.ageSpouse) + '）' : 'なし / 未定'}</td></tr>
        <tr><td>子どもの人数</td><td>${cc > 0 ? cc + '人' : 'なし'}</td></tr>
        ${childRows}
        <tr><td>教育方針</td><td>${eduPLabels[lv.eduPolicy] || '―'}</td></tr>
        <tr><td>大学通学想定</td><td>${{local:'自宅通学',away:'自宅外',mix:'子どもによる',none:'想定なし'}[lv.univStyle] || '―'}</td></tr>
        <tr><td>塾・習い事</td><td>${{standard:'標準的',active:'やや力を入れたい',heavy:'受験・留学も検討'}[lv.extraEdu] || '―'}</td></tr>
      </table>

      <h2>2. 住まい / 住宅購入計画</h2>
      <table>
        <tr><td>現在の住まい</td><td>${{rent:'賃貸',own:'持ち家（ローン中）',paid:'持ち家（完済）',other:'その他'}[hw.currentType] || '―'}</td></tr>
        <tr><td>月額住居費</td><td>${hw.monthlyCost ? hw.monthlyCost + ' 万円/月' : '―'}</td></tr>
        <tr><td>住宅購入予定</td><td>${yesNo(hw.purchasePlan)}</td></tr>
        ${hw.purchasePlan === 'yes' ? `
        <tr><td>購入予定年齢</td><td>${fmtA(hw.buyAge)}</td></tr>
        <tr><td>物件価格</td><td>${yen(hw.price)}</td></tr>
        <tr><td>頭金</td><td>${yen(hw.downPayment)}</td></tr>
        <tr><td>返済期間 / 金利</td><td>${hw.loanTerm}年 / ${hw.interestRate}%</td></tr>
        ${meta.loanPayoffAge ? `<tr><td>完済予定年齢</td><td>${meta.loanPayoffAge}歳</td></tr>` : ''}
        ` : ''}
      </table>

      <h2>3. 主要前提</h2>
      <table>
        <tr><td>本人 額面年収</td><td>${yen(i1.grossIncome)}</td></tr>
        <tr><td>退職予定年齢</td><td>${fmtA(i1.retireAge)}</td></tr>
        <tr><td>年間消費支出</td><td>${yen(lv.annualExpense)}</td></tr>
        <tr><td>現預金</td><td>${yen(as.cash)}</td></tr>
        <tr><td>NISA・運用資産</td><td>${yen(as.investment)}</td></tr>
        <tr><td>DC・iDeCo</td><td>${yen(as.dc)}</td></tr>
        <tr><td>毎月積立</td><td>${as.monthlySaving ? as.monthlySaving + ' 万円/月' : '―'}</td></tr>
        <tr><td>運用方針</td><td>${investLabels[as.investPolicy] || '―'}</td></tr>
        <tr><td>生活防衛資金（6か月分）</td><td>${fmtY(emergencyFund)}</td></tr>
      </table>

      <h2>4. 診断スコア</h2>
      <div class="score-grid">
        ${[
          {l:'総合',           v: scores.overall},
          {l:'ライフプラン',   v: scores.lifePlan},
          {l:'万一への備え',   v: scores.insurance},
          {l:'資産運用',       v: scores.investment},
          {l:'住まい',         v: scores.housing},
        ].map(s => `
          <div class="score-box">
            <div class="val" style="color:${scoreColor(s.v)}">${s.v}</div>
            <div class="lbl">${s.l}</div>
          </div>`).join('')}
      </div>

      <h2>5. 主要な確認ポイント</h2>
      <div class="key-fact" style="border-left-color:${meta.assetDepletionAge ? '#c0392b' : '#3a9e6c'};">
        <div><div class="lbl">資産枯渇</div><div class="val">${meta.assetDepletionAge ? meta.assetDepletionAge + '歳頃に枯渇の見込み' : '90歳まで枯渇なし（試算）'}</div></div>
      </div>
      ${meta.investWithdrawStartAge ? `<div class="key-fact"><div><div class="lbl">運用資産取り崩し開始</div><div class="val">${meta.investWithdrawStartAge}歳頃から</div></div></div>` : ''}
      ${meta.cashBelowEmergencyAge  ? `<div class="key-fact" style="border-left-color:#e07a20;"><div><div class="lbl">現預金が防衛資金を下回る</div><div class="val">${meta.cashBelowEmergencyAge}歳頃から</div></div></div>` : ''}
      ${meta.loanPayoffAge ? `<div class="key-fact"><div><div class="lbl">ローン完済予定</div><div class="val">${meta.loanPayoffAge}歳</div></div></div>` : ''}
      ${meta.maxEduCostAge ? `<div class="key-fact"><div><div class="lbl">教育費ピーク</div><div class="val">${meta.maxEduCostAge}歳頃</div></div></div>` : ''}

      <h2>6. 優先課題</h2>
      ${issues.length === 0
        ? '<p style="color:#3a9e6c;font-size:12px;">特に大きな課題は見当たりません（試算）。</p>'
        : issueHtml}

      <h2>7. グラフ</h2>
      <div class="chart-wrap">
        <div class="chart-label">年間収入・支出・収支の推移</div>
        <div data-chart-id="chart-cashflow" style="width:100%;height:180px;background:#f5f7fa;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#8a99aa;font-size:11px;">グラフを読み込み中...</div>
      </div>
      <div class="chart-wrap">
        <div class="chart-label">資産推移（現預金・運用資産・DC/iDeCo・合計・生活防衛資金ライン）</div>
        <div data-chart-id="chart-assets" style="width:100%;height:180px;background:#f5f7fa;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#8a99aa;font-size:11px;">グラフを読み込み中...</div>
      </div>
      <div class="chart-wrap">
        <div class="chart-label">資産内訳（現時点）</div>
        <div data-chart-id="chart-asset-pie" style="width:100%;height:150px;background:#f5f7fa;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#8a99aa;font-size:11px;">グラフを読み込み中...</div>
      </div>

      ${detailSection}

      <div class="disclaimer">
        本診断は、入力情報と一定の前提条件に基づく簡易シミュレーションです。将来の収入・物価・運用成果・税金・社会保険・年金・住宅ローン金利などを保証するものではありません。本診断は、金融商品・保険商品・住宅ローン等の契約を推奨するものではありません。
      </div>

      </body></html>`;
  },

  dateStr() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  },
};

window.PdfExporter = PdfExporter;

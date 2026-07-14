/**
 * steps.js
 * =========================================================
 * 家計コンパス β版 - 入力ステップ定義
 * =========================================================
 */

'use strict';

const STEPS = [
  { id: 'family',    icon: 'fa-users',           title: '家族構成',          shortLabel: '家族' },
  { id: 'income1',   icon: 'fa-briefcase',       title: '本人の仕事と収入',    shortLabel: '本人' },
  { id: 'income2',   icon: 'fa-briefcase',       title: '配偶者の仕事と収入',  shortLabel: '配偶者' },
  { id: 'assets',    icon: 'fa-piggy-bank',      title: '資産と積立',          shortLabel: '資産' },
  { id: 'housing',   icon: 'fa-building',        title: '住まい',             shortLabel: '住まい' },
  { id: 'insurance', icon: 'fa-shield-halved',   title: '万一への備え',        shortLabel: '備え' },
  { id: 'living',    icon: 'fa-house',           title: '生活費と教育',        shortLabel: '生活費' },
  { id: 'confirm',   icon: 'fa-clipboard-check', title: '入力内容の確認',      shortLabel: '確認' },
];

const StepBuilders = {

  // ---------------------------------------------------------
  // STEP 1: 家族構成
  // ---------------------------------------------------------
  family(data) {
    const d = data.family || {};
    const childrenCount = parseInt(d.childrenCount || 0);
    let childrenHtml = '';
    for (let i = 0; i < childrenCount; i++) {
      const child = (d.children || [])[i] || {};
      childrenHtml += `
        <div class="child-item" id="child-block-${i}">
          <div class="child-item-title">第${i + 1}子</div>
          <div class="form-grid-2">
            <div class="form-group mb-0">
              <label class="form-label">年齢</label>
              <div class="input-with-unit">
                <input type="number" class="form-control has-unit"
                  id="child-age-${i}" name="child-age-${i}"
                  min="0" max="25" value="${child.age || ''}"
                  placeholder="例：8" data-save-key="family.children.${i}.age">
                <span class="input-unit">歳</span>
              </div>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">最終学歴想定</label>
              <select class="form-control" id="child-edu-${i}" name="child-edu-${i}"
                data-save-key="family.children.${i}.education">
                <option value="">選択</option>
                <option value="high"       ${child.education === 'high'       ? 'selected' : ''}>高校卒業</option>
                <option value="vocational" ${child.education === 'vocational' ? 'selected' : ''}>専門学校卒業</option>
                <option value="junior"     ${child.education === 'junior'     ? 'selected' : ''}>短期大学卒業</option>
                <option value="university" ${child.education === 'university' ? 'selected' : ''}>大学卒業</option>
              </select>
            </div>
          </div>
        </div>`;
    }

    return `
      <div class="step-card">
        <h2 class="step-title">
          <span class="step-badge">STEP 1</span>
          <i class="fa-solid fa-users"></i> 家族構成
        </h2>
        <p class="step-desc">ご家族の基本情報を入力してください。正確でなくても、おおよその数値で構いません。</p>

        <div class="form-group">
          <label class="form-label">本人の年齢</label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="age-self" min="20" max="80" value="${d.ageSelf || ''}"
              placeholder="例：35" data-save-key="family.ageSelf">
            <span class="input-unit">歳</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">配偶者</label>
          <div class="radio-group horizontal">
            <label class="radio-item">
              <input type="radio" name="has-spouse" value="yes"
                ${d.hasSpouse === 'yes' ? 'checked' : ''}
                data-save-key="family.hasSpouse"> いる
            </label>
            <label class="radio-item">
              <input type="radio" name="has-spouse" value="no"
                ${d.hasSpouse === 'no' ? 'checked' : ''}
                data-save-key="family.hasSpouse"> いない / 未定
            </label>
          </div>
        </div>

        <div id="spouse-block" class="conditional-block" ${d.hasSpouse !== 'yes' ? 'style="display:none"' : ''}>
          <div class="form-group">
            <label class="form-label">配偶者の年齢</label>
            <div class="input-with-unit">
              <input type="number" class="form-control has-unit"
                id="age-spouse" min="20" max="80" value="${d.ageSpouse || ''}"
                placeholder="例：33" data-save-key="family.ageSpouse">
              <span class="input-unit">歳</span>
            </div>
          </div>
        </div>

        <hr class="form-divider">

        <div class="form-group">
          <label class="form-label">子どもの人数</label>
          <select class="form-control" id="children-count" data-save-key="family.childrenCount">
            ${[0,1,2,3,4,5].map(n =>
              `<option value="${n}" ${childrenCount === n ? 'selected' : ''}>${n === 0 ? 'なし' : n + '人'}</option>`
            ).join('')}
          </select>
        </div>

        <div id="children-area">${childrenHtml}</div>

      </div>`;
  },

  // ---------------------------------------------------------
  // STEP 2: 本人の仕事と収入
  // ---------------------------------------------------------
  income1(data) {
    const d = data.income1 || {};
    return `
      <div class="step-card">
        <h2 class="step-title">
          <span class="step-badge">STEP 2</span>
          <i class="fa-solid fa-briefcase"></i> 本人の仕事と収入
        </h2>
        <p class="step-desc">現在の収入や将来の見通しを入力してください。</p>

        <div class="form-group">
          <label class="form-label">働き方</label>
          <div class="card-radio-group">
            ${[
              {val:'employee_full',  icon:'fa-building',      label:'会社員（正規）'},
              {val:'employee_part',  icon:'fa-user-clock',    label:'会社員（非正規）'},
              {val:'self_employed',  icon:'fa-store',         label:'自営業・フリーランス'},
              {val:'officer',        icon:'fa-user-tie',      label:'役員・経営者'},
              {val:'not_working',    icon:'fa-house-chimney', label:'現在就労なし'},
              {val:'other',          icon:'fa-ellipsis',      label:'その他'},
            ].map(o => `
              <div class="card-radio-item">
                <input type="radio" name="income1-type" id="i1-type-${o.val}" value="${o.val}"
                  ${d.workType === o.val ? 'checked' : ''} data-save-key="income1.workType">
                <label class="card-radio-label" for="i1-type-${o.val}">
                  <i class="fa-solid ${o.icon}"></i> ${o.label}
                </label>
              </div>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">額面年収</label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="i1-gross" value="${d.grossIncome || ''}" placeholder="例：500"
              min="0" max="99999" data-save-key="income1.grossIncome">
            <span class="input-unit">万円</span>
          </div>
          <p class="form-hint">源泉徴収票の「支払金額」欄の金額</p>
        </div>

        <div class="form-group">
          <label class="form-label">手取り年収 <span class="label-opt">任意</span></label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="i1-net" value="${d.netIncome || ''}" placeholder="例：390"
              min="0" max="99999" data-save-key="income1.netIncome">
            <span class="input-unit">万円</span>
          </div>
          <p class="form-hint">未入力の場合、額面から自動推計（概算）します</p>
        </div>

        <div class="form-group">
          <label class="form-label">収入カーブ</label>
          <select class="form-control" id="i1-curve" data-save-key="income1.incomeCurve">
            <option value="flat"   ${d.incomeCurve === 'flat'   ? 'selected' : ''}>横ばい</option>
            <option value="up1"    ${d.incomeCurve === 'up1'    ? 'selected' : ''}>毎年1％上昇</option>
            <option value="up2"    ${d.incomeCurve === 'up2'    ? 'selected' : ''}>毎年2％上昇</option>
            <option value="down50" ${d.incomeCurve === 'down50' ? 'selected' : ''}>50歳から10％減少</option>
            <option value="down60" ${d.incomeCurve === 'down60' ? 'selected' : ''}>60歳から30％減少</option>
          </select>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">就業終了年齢</label>
            <div class="input-with-unit">
              <input type="number" class="form-control has-unit"
                id="i1-retire-age" value="${d.retireAge || 65}" min="50" max="80"
                data-save-key="income1.retireAge">
              <span class="input-unit">歳</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">年金受給開始年齢</label>
            <div class="input-with-unit">
              <input type="number" class="form-control has-unit"
                id="i1-pension-start" value="${d.pensionStartAge || 65}" min="60" max="75"
                data-save-key="income1.pensionStartAge">
              <span class="input-unit">歳</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">公的年金見込額（月額・65歳受給基準）<span class="label-opt">任意</span></label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="i1-pension-amount" value="${d.pensionAmount || ''}" placeholder="例：15"
              min="0" max="50" data-save-key="income1.pensionAmount">
            <span class="input-unit">万円/月</span>
          </div>
          <p class="form-hint">「ねんきんネット」または「ねんきん定期便」に記載の65歳時見込み額。繰上げ・繰下げは受給開始年齢から自動計算します（繰上げ−4.8%/年、繰下げ+8.4%/年）</p>
        </div>

        <hr class="form-divider">

        <div class="form-group">
          <label class="form-label">その他収入（年間）<span class="label-opt">任意</span></label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="i1-other-income" value="${d.otherIncome || ''}" placeholder="例：30"
              min="0" max="9999" data-save-key="income1.otherIncome">
            <span class="input-unit">万円</span>
          </div>
          <p class="form-hint">副業・不動産収入・仕送りなど</p>
        </div>

        <div class="form-group">
          <label class="form-label">退職金見込額 <span class="label-opt">任意</span></label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="i1-severance" value="${d.severancePay || ''}" placeholder="例：2000"
              min="0" max="99999" data-save-key="income1.severancePay">
            <span class="input-unit">万円</span>
          </div>
        </div>

      </div>`;
  },

  // ---------------------------------------------------------
  // STEP 3: 配偶者の仕事と収入
  // ---------------------------------------------------------
  income2(data) {
    const d = data.income2 || {};
    const hasSpouse = data.family?.hasSpouse === 'yes';

    if (!hasSpouse) {
      return `
        <div class="step-card">
          <h2 class="step-title">
            <span class="step-badge">STEP 3</span>
            <i class="fa-solid fa-briefcase"></i> 配偶者の仕事と収入
          </h2>
          <div class="alert alert-info">
            <i class="fa-solid fa-circle-info"></i>
            STEP1で配偶者「いない / 未定」を選択したため、このステップはスキップできます。
          </div>
          <p class="step-desc">配偶者がいる場合は「戻る」でSTEP1を修正してください。</p>
        </div>`;
    }

    return `
      <div class="step-card">
        <h2 class="step-title">
          <span class="step-badge">STEP 3</span>
          <i class="fa-solid fa-briefcase"></i> 配偶者の仕事と収入
        </h2>
        <p class="step-desc">配偶者の現在の収入と将来の見通しを入力してください。</p>

        <div class="form-group">
          <label class="form-label">働き方</label>
          <div class="card-radio-group">
            ${[
              {val:'employee_full',  icon:'fa-building',      label:'会社員（正規）'},
              {val:'employee_part',  icon:'fa-user-clock',    label:'会社員（非正規）'},
              {val:'self_employed',  icon:'fa-store',         label:'自営業・フリーランス'},
              {val:'officer',        icon:'fa-user-tie',      label:'役員・経営者'},
              {val:'not_working',    icon:'fa-house-chimney', label:'現在就労なし'},
              {val:'other',          icon:'fa-ellipsis',      label:'その他'},
            ].map(o => `
              <div class="card-radio-item">
                <input type="radio" name="income2-type" id="i2-type-${o.val}" value="${o.val}"
                  ${d.workType === o.val ? 'checked' : ''} data-save-key="income2.workType">
                <label class="card-radio-label" for="i2-type-${o.val}">
                  <i class="fa-solid ${o.icon}"></i> ${o.label}
                </label>
              </div>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">額面年収</label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="i2-gross" value="${d.grossIncome || ''}" placeholder="例：300"
              min="0" max="99999" data-save-key="income2.grossIncome">
            <span class="input-unit">万円</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">手取り年収 <span class="label-opt">任意</span></label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="i2-net" value="${d.netIncome || ''}" placeholder="例：230"
              min="0" max="99999" data-save-key="income2.netIncome">
            <span class="input-unit">万円</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">収入カーブ</label>
          <select class="form-control" id="i2-curve" data-save-key="income2.incomeCurve">
            <option value="flat"   ${d.incomeCurve === 'flat'   ? 'selected' : ''}>横ばい</option>
            <option value="up1"    ${d.incomeCurve === 'up1'    ? 'selected' : ''}>毎年1％上昇</option>
            <option value="up2"    ${d.incomeCurve === 'up2'    ? 'selected' : ''}>毎年2％上昇</option>
            <option value="down50" ${d.incomeCurve === 'down50' ? 'selected' : ''}>50歳から10％減少</option>
            <option value="down60" ${d.incomeCurve === 'down60' ? 'selected' : ''}>60歳から30％減少</option>
          </select>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">就業終了年齢</label>
            <div class="input-with-unit">
              <input type="number" class="form-control has-unit"
                id="i2-retire-age" value="${d.retireAge || 65}" min="50" max="80"
                data-save-key="income2.retireAge">
              <span class="input-unit">歳</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">年金受給開始年齢</label>
            <div class="input-with-unit">
              <input type="number" class="form-control has-unit"
                id="i2-pension-start" value="${d.pensionStartAge || 65}" min="60" max="75"
                data-save-key="income2.pensionStartAge">
              <span class="input-unit">歳</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">公的年金見込額（月額・65歳受給基準）<span class="label-opt">任意</span></label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="i2-pension-amount" value="${d.pensionAmount || ''}" placeholder="例：8"
              min="0" max="50" data-save-key="income2.pensionAmount">
            <span class="input-unit">万円/月</span>
          </div>
        </div>

        <hr class="form-divider">

        <div class="form-group">
          <label class="form-label">その他収入（年間）<span class="label-opt">任意</span></label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="i2-other-income" value="${d.otherIncome || ''}" placeholder="例：0"
              min="0" max="9999" data-save-key="income2.otherIncome">
            <span class="input-unit">万円</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">退職金見込額 <span class="label-opt">任意</span></label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="i2-severance" value="${d.severancePay || ''}" placeholder="例：500"
              min="0" max="99999" data-save-key="income2.severancePay">
            <span class="input-unit">万円</span>
          </div>
        </div>

      </div>`;
  },

  // ---------------------------------------------------------
  // STEP 7: 生活費と教育
  // ---------------------------------------------------------
  living(data) {
    const d  = data.living   || {};
    const i1 = data.income1  || {};
    const i2 = data.income2  || {};
    const as = data.assets   || {};
    const hw = data.housing  || {};
    const ins= data.insurance|| {};
    const hasSpouse = data.family?.hasSpouse === 'yes';

    // 手取り推計（app.js の estimateNetApp を呼ぶ、未定義なら簡易計算）
    const estNet = (gross) => {
      if (!gross || gross <= 0) return 0;
      if (gross <= 150)  return gross * 0.87;
      if (gross <= 250)  return gross * 0.84;
      if (gross <= 400)  return gross * 0.80;
      if (gross <= 600)  return gross * 0.77;
      if (gross <= 800)  return gross * 0.74;
      if (gross <= 1000) return gross * 0.72;
      return gross * 0.70;
    };

    // 本人手取り（実入力 優先）
    const selfNet   = parseFloat(i1.netIncome || 0) || estNet(parseFloat(i1.grossIncome || 0));
    // 配偶者手取り（実入力 優先）
    const spouseNet = hasSpouse
      ? (parseFloat(i2.netIncome || 0) || estNet(parseFloat(i2.grossIncome || 0)))
      : 0;
    const totalNet = selfNet + spouseNet;

    // 各支出の現在値（表示用）
    const housingM  = parseFloat(hw.monthlyCost   || 0);
    const housingY  = housingM * 12;
    const insY      = ins.monthlyPremium
      ? parseFloat(ins.monthlyPremium) / 10000 * 12
      : parseFloat(ins.annualPremium || 0);
    const savingY   = (parseFloat(as.monthlySaving || 0) + parseFloat(as.dcMonthly || 0)) * 12;
    // living側の入力値
    const currentEduY  = parseFloat(d.currentEduAnnual || 0);
    const otherAnnualY = parseFloat(d.otherAnnual      || 0);
    const extraSavingY = parseFloat(d.extraSaving       || 0);

    // 逆算
    const totalDeduct = housingY + insY + savingY + currentEduY + otherAnnualY + extraSavingY;
    const calcExpense = totalNet - totalDeduct;
    const calcMonthly = calcExpense / 12;
    const isNegative  = calcExpense < 0;

    // 手動上書きモード
    const isManual    = d.manualExpense === 'yes';
    // 診断に使う最終値（手動優先）
    const finalExpense = isManual && d.annualExpense
      ? parseFloat(d.annualExpense)
      : (isNegative ? 0 : Math.round(calcExpense));

    const fmtMan = (v) => v ? Math.round(v).toLocaleString('ja-JP') : '―';

    return `
      <div class="step-card">
        <h2 class="step-title">
          <span class="step-badge">STEP 7</span>
          <i class="fa-solid fa-house"></i> 生活費と教育
        </h2>
        <p class="step-desc">支出・貯蓄額の入力をもとに、現在の生活費を逆算します。</p>

        <!-- ===== 逆算インプット ===== -->
        <div class="lc-reverse-box">
          <div class="lc-reverse-title">
            <i class="fa-solid fa-calculator"></i> 現在の生活費を逆算する
          </div>

          <!-- 世帯手取り（参照表示） -->
          <div class="lc-rev-row lc-rev-income">
            <span class="lc-rev-label">
              <i class="fa-solid fa-circle-plus" style="color:var(--color-accent)"></i>
              世帯の年間手取り収入
            </span>
            <span class="lc-rev-val" id="lc-total-net">
              ${totalNet > 0 ? totalNet.toLocaleString('ja-JP', {maximumFractionDigits:1}) + ' 万円' : '（収入を入力してください）'}
            </span>
          </div>
          <p class="lc-rev-note">
            ${selfNet > 0 ? `本人：${selfNet.toLocaleString('ja-JP',{maximumFractionDigits:1})} 万円` : '本人収入未入力'}
            ${hasSpouse && spouseNet > 0 ? `　配偶者：${spouseNet.toLocaleString('ja-JP',{maximumFractionDigits:1})} 万円` : ''}
            　※手取り実入力がある場合は実入力を優先します
          </p>

          <div class="lc-rev-divider"></div>

          <!-- 住宅費 -->
          <div class="lc-rev-row">
            <span class="lc-rev-label">
              <i class="fa-solid fa-circle-minus" style="color:var(--color-warn-r)"></i>
              年間住宅費（家賃・ローン等）
            </span>
            <span class="lc-rev-val lc-rev-deduct">
              ${housingY > 0 ? '−' + housingY.toLocaleString('ja-JP',{maximumFractionDigits:1}) + ' 万円' : '未入力'}
            </span>
          </div>
          <p class="lc-rev-note">月額 ${housingM > 0 ? housingM + ' 万円' : '未入力'} × 12。住まい（STEP6）から自動取得。管理費等は住まいステップの月額に含めてください。</p>

          <!-- 現在の教育費 -->
          <div class="lc-rev-row">
            <span class="lc-rev-label">
              <i class="fa-solid fa-circle-minus" style="color:var(--color-warn-r)"></i>
              年間教育費（現在支払い中）
            </span>
            <div class="lc-rev-input-wrap">
              <input type="number" class="form-control lc-rev-input" id="lc-edu-annual"
                value="${d.currentEduAnnual || ''}" min="0" max="9999" step="1"
                placeholder="例：60" data-save-key="living.currentEduAnnual">
              <span class="lc-rev-unit">万円/年</span>
            </div>
          </div>
          <p class="lc-rev-note">学費・保育料・塾・習い事など現在実際に支払っている年間合計。将来の進学費用ではなく「今払っている額」を入力してください。</p>

          <!-- 保険料 -->
          <div class="lc-rev-row">
            <span class="lc-rev-label">
              <i class="fa-solid fa-circle-minus" style="color:var(--color-warn-r)"></i>
              年間保険料合計
            </span>
            <span class="lc-rev-val lc-rev-deduct">
              ${insY > 0 ? '−' + insY.toLocaleString('ja-JP',{maximumFractionDigits:1}) + ' 万円' : '未入力'}
            </span>
          </div>
          <p class="lc-rev-note">万一への備え（STEP7）の入力から自動取得。</p>

          <!-- 貯蓄・投資額 -->
          <div class="lc-rev-row">
            <span class="lc-rev-label">
              <i class="fa-solid fa-circle-minus" style="color:var(--color-warn-r)"></i>
              年間貯蓄・投資額
            </span>
            <span class="lc-rev-val lc-rev-deduct">
              ${savingY > 0 ? '−' + savingY.toLocaleString('ja-JP',{maximumFractionDigits:1}) + ' 万円' : '未入力'}
            </span>
          </div>
          <p class="lc-rev-note">
            NISA等積立 ${parseFloat(as.monthlySaving||0)} 万円/月 + DC/iDeCo ${parseFloat(as.dcMonthly||0)} 万円/月 × 12。資産（STEP5）から自動取得。
          </p>

          <!-- その他の年間貯蓄 -->
          <div class="lc-rev-row">
            <span class="lc-rev-label">
              <i class="fa-solid fa-circle-minus" style="color:var(--color-warn-r)"></i>
              その他年間貯蓄額 <span class="label-opt">任意</span>
            </span>
            <div class="lc-rev-input-wrap">
              <input type="number" class="form-control lc-rev-input" id="lc-extra-saving"
                value="${d.extraSaving || ''}" min="0" max="9999" step="1"
                placeholder="例：24" data-save-key="living.extraSaving">
              <span class="lc-rev-unit">万円/年</span>
            </div>
          </div>
          <p class="lc-rev-note">普通預金への定期的な貯蓄など、上記以外の年間貯蓄額</p>

          <!-- その他年間支出 -->
          <div class="lc-rev-row">
            <span class="lc-rev-label">
              <i class="fa-solid fa-circle-minus" style="color:var(--color-warn-r)"></i>
              その他年間支出 <span class="label-opt">任意</span>
            </span>
            <div class="lc-rev-input-wrap">
              <input type="number" class="form-control lc-rev-input" id="lc-other-annual"
                value="${d.otherAnnual || ''}" min="0" max="9999" step="1"
                placeholder="例：30" data-save-key="living.otherAnnual">
              <span class="lc-rev-unit">万円/年</span>
            </div>
          </div>
          <p class="lc-rev-note">旅行・帰省・車検・自動車税・家具家電・冠婚葬祭など、毎月の生活費に含めにくい臨時支出の年間合計</p>

          <div class="lc-rev-divider"></div>

          <!-- 逆算結果 -->
          <div id="lc-result-area">
            ${isNegative ? `
              <div class="alert alert-danger lc-warn-negative">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <div>
                  <strong>入力された支出・貯蓄額が手取り収入を上回っています。</strong><br>
                  入力内容をご確認ください。（差額：${Math.abs(Math.round(calcExpense)).toLocaleString('ja-JP')} 万円）
                </div>
              </div>` : `
              <div class="lc-result-card">
                <div class="lc-result-title">
                  <i class="fa-solid fa-house-chimney"></i> 現在の生活費（推定）
                </div>
                <div class="lc-result-grid">
                  <div class="lc-result-item">
                    <span class="lc-result-label">推定年間生活費</span>
                    <span class="lc-result-val" id="lc-annual-result">${Math.round(calcExpense).toLocaleString('ja-JP')} 万円</span>
                  </div>
                  <div class="lc-result-item">
                    <span class="lc-result-label">推定月平均生活費</span>
                    <span class="lc-result-val" id="lc-monthly-result">${Math.round(calcMonthly * 10) / 10} 万円</span>
                  </div>
                </div>
                <p class="lc-result-note">年収と、住宅費・教育費・保険料・貯蓄額・臨時支出から現在の生活費を逆算しています。</p>
              </div>`}
          </div>

          <!-- 手動修正トグル -->
          <div class="lc-manual-area">
            <!-- フラグ hidden input は常時ブロック外に1つだけ置く（重複ID防止） -->
            <input type="hidden" id="lc-manual-flag" value="${isManual ? 'yes' : 'no'}" data-save-key="living.manualExpense">
            <!-- 自動モード時の生活費保持（id重複しないよう liv-expense-auto を使用） -->
            ${!isManual ? `<input type="hidden" id="liv-expense-auto" value="${isNegative ? '' : Math.round(calcExpense)}" data-save-key="living.annualExpense">` : ''}

            <button type="button" class="btn btn-ghost btn-small lc-manual-toggle" id="btn-manual-toggle">
              ${isManual ? '<i class="fa-solid fa-chevron-up"></i> 閉じる' : '<i class="fa-solid fa-pen"></i> 生活費を自分で修正する'}
            </button>
            <div id="lc-manual-block" style="${isManual ? '' : 'display:none;'}">
              <div class="lc-manual-inner">
                <p class="lc-manual-note">自動計算が実感と異なる場合は、年間生活費を直接入力してください。直接入力した値を診断計算に使用します。</p>
                <div class="form-group mb-0">
                  <label class="form-label">年間生活費（直接入力）</label>
                  <div class="input-with-unit">
                    <input type="number" class="form-control has-unit"
                      id="liv-expense" value="${isManual ? (d.annualExpense || '') : ''}"
                      placeholder="例：${isNegative ? '300' : Math.round(calcExpense)}"
                      min="0" max="9999" ${isManual ? 'data-save-key="living.annualExpense"' : ''}>
                    <span class="input-unit">万円</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr class="form-divider">

        <!-- 教育方針 -->
        <div class="form-group">
          <label class="form-label">将来の教育方針</label>
          <div class="radio-group">
            ${[
              {val:'public',       label:'公立中心（幼〜高まで基本公立）'},
              {val:'univ_private', label:'大学から私立'},
              {val:'high_private', label:'高校から私立'},
              {val:'mid_private',  label:'中学から私立'},
              {val:'private',      label:'私立中心（小〜高まで私立も視野）'},
              {val:'undecided',    label:'まだ決めていない（高校から私立で試算）'},
            ].map(o => `
              <label class="radio-item">
                <input type="radio" name="edu-policy" value="${o.val}"
                  ${d.eduPolicy === o.val ? 'checked' : ''}
                  data-save-key="living.eduPolicy">
                ${o.label}
              </label>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">大学通学想定</label>
          <div class="radio-group">
            ${[
              {val:'local', label:'自宅通学（通学圏内の大学）'},
              {val:'away',  label:'自宅外（一人暮らし想定・年間+112.5万円）'},
              {val:'mix',   label:'子どもによる（半数が自宅外で試算）'},
              {val:'none',  label:'大学進学は想定しない'},
            ].map(o => `
              <label class="radio-item">
                <input type="radio" name="univ-style" value="${o.val}"
                  ${d.univStyle === o.val ? 'checked' : ''}
                  data-save-key="living.univStyle">
                ${o.label}
              </label>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">塾・習い事への考え方（将来）</label>
          <div class="radio-group">
            ${[
              {val:'standard', label:'標準的（教育費の1.0倍で計算）'},
              {val:'active',   label:'やや力を入れたい（教育費の1.1倍）'},
              {val:'heavy',    label:'受験・留学も検討（教育費の1.25倍）'},
            ].map(o => `
              <label class="radio-item">
                <input type="radio" name="extra-edu" value="${o.val}"
                  ${d.extraEdu === o.val ? 'checked' : ''}
                  data-save-key="living.extraEdu">
                ${o.label}
              </label>`).join('')}
          </div>
        </div>

      </div>`;
  },

  // ---------------------------------------------------------
  // STEP 4: 資産と積立
  // ---------------------------------------------------------
  assets(data) {
    const d = data.assets || {};
    return `
      <div class="step-card">
        <h2 class="step-title">
          <span class="step-badge">STEP 4</span>
          <i class="fa-solid fa-piggy-bank"></i> 資産と積立
        </h2>
        <p class="step-desc">現在の資産残高と積立状況を入力してください。概算で構いません。</p>

        <h3 class="section-title" style="font-size:0.9rem;margin-bottom:12px;">
          <i class="fa-solid fa-coins"></i> 現在の資産残高
        </h3>

        <div class="form-group">
          <label class="form-label">現預金（普通・定期預金など）</label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="ast-cash" value="${d.cash || ''}" placeholder="例：500"
              min="0" max="999999" data-save-key="assets.cash">
            <span class="input-unit">万円</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">NISA・特定口座などの投資資産 <span class="label-opt">任意</span></label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="ast-investment" value="${d.investment || ''}" placeholder="例：200"
              min="0" max="999999" data-save-key="assets.investment">
            <span class="input-unit">万円</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">DC・iDeCo残高 <span class="label-opt">任意</span></label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="ast-dc" value="${d.dc || ''}" placeholder="例：120"
              min="0" max="999999" data-save-key="assets.dc">
            <span class="input-unit">万円</span>
          </div>
        </div>

        <hr class="form-divider">

        <h3 class="section-title" style="font-size:0.9rem;margin-bottom:12px;">
          <i class="fa-solid fa-rotate"></i> 毎月の積立
        </h3>

        <div class="form-group">
          <label class="form-label">毎月の積立額（NISA・投資信託など）</label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="ast-monthly" value="${d.monthlySaving || ''}" placeholder="例：3"
              min="0" max="999" data-save-key="assets.monthlySaving">
            <span class="input-unit">万円/月</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">DC・iDeCo掛金（月額）<span class="label-opt">任意</span></label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="ast-dc-monthly" value="${d.dcMonthly || ''}" placeholder="例：2.3"
              min="0" max="99" step="0.1" data-save-key="assets.dcMonthly">
            <span class="input-unit">万円/月</span>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">DC・iDeCo掛金終了年齢</label>
            <div class="input-with-unit">
              <input type="number" class="form-control has-unit"
                id="ast-dc-end" value="${d.dcEndAge || 65}" min="50" max="75"
                data-save-key="assets.dcEndAge">
              <span class="input-unit">歳</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">DC・iDeCo受取開始年齢</label>
            <div class="input-with-unit">
              <input type="number" class="form-control has-unit"
                id="ast-dc-recv" value="${d.dcReceiveAge || 65}" min="60" max="75"
                data-save-key="assets.dcReceiveAge">
              <span class="input-unit">歳</span>
            </div>
          </div>
        </div>

        <hr class="form-divider">

        <div class="form-group">
          <label class="form-label">運用方針</label>
          <div class="radio-group">
            ${[
              {val:'conservative', label:'堅め（想定リターン 1.5%/年）'},
              {val:'moderate',     label:'通常（想定リターン 3.0%/年）'},
              {val:'aggressive',   label:'積極的（想定リターン 5.0%/年）'},
            ].map(o => `
              <label class="radio-item">
                <input type="radio" name="invest-policy" value="${o.val}"
                  ${(d.investPolicy === o.val || (!d.investPolicy && o.val === 'moderate')) ? 'checked' : ''}
                  data-save-key="assets.investPolicy">
                ${o.label}
              </label>`).join('')}
          </div>
          <p class="form-hint">※ 将来の運用成果を保証するものではありません</p>
        </div>

        <div class="alert alert-info">
          <i class="fa-solid fa-circle-info"></i>
          <div>
            <strong>取り崩しのルールについて</strong><br>
            現預金が生活防衛資金（年間消費支出の6か月分）を下回った場合、NISA等の運用資産を計画的に取り崩す前提で計算します。DC・iDeCoは受取年齢まで取り崩しません。
          </div>
        </div>

      </div>`;
  },

  // ---------------------------------------------------------
  // STEP 5: 住まい
  // ---------------------------------------------------------
  housing(data) {
    const d = data.housing || {};
    const isOwn   = d.currentType === 'own';
    const hasPlan = d.purchasePlan === 'yes';

    return `
      <div class="step-card">
        <h2 class="step-title">
          <span class="step-badge">STEP 5</span>
          <i class="fa-solid fa-building"></i> 住まい
        </h2>
        <p class="step-desc">現在の住まいと将来の住宅購入計画を入力してください。</p>

        <div class="form-group">
          <label class="form-label">現在の住まい</label>
          <div class="card-radio-group">
            ${[
              {val:'rent',  icon:'fa-door-open',          label:'賃貸'},
              {val:'own',   icon:'fa-house',               label:'持ち家（ローン中）'},
              {val:'paid',  icon:'fa-house-circle-check',  label:'持ち家（完済済み）'},
              {val:'other', icon:'fa-building-user',       label:'その他（社宅・実家等）'},
            ].map(o => `
              <div class="card-radio-item">
                <input type="radio" name="current-type" id="ct-${o.val}" value="${o.val}"
                  ${d.currentType === o.val ? 'checked' : o.val === 'rent' && !d.currentType ? 'checked' : ''}
                  data-save-key="housing.currentType">
                <label class="card-radio-label" for="ct-${o.val}">
                  <i class="fa-solid ${o.icon}"></i> ${o.label}
                </label>
              </div>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">現在の月額住居費（家賃 or ローン返済額）</label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="h-monthly-cost" value="${d.monthlyCost || ''}" placeholder="例：10"
              min="0" max="999" data-save-key="housing.monthlyCost">
            <span class="input-unit">万円/月</span>
          </div>
        </div>

        <div id="loan-block" class="conditional-block" ${!isOwn ? 'style="display:none"' : ''}>
          <div class="form-group">
            <label class="form-label">ローン完済予定年齢</label>
            <div class="input-with-unit">
              <input type="number" class="form-control has-unit"
                id="h-loan-end" value="${d.loanEndAge || ''}" placeholder="例：65"
                min="30" max="80" data-save-key="housing.loanEndAge">
              <span class="input-unit">歳</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">金利タイプ</label>
            <select class="form-control" id="h-rate-type" data-save-key="housing.rateType">
              <option value="fixed"    ${d.rateType === 'fixed'    ? 'selected' : ''}>全期間固定</option>
              <option value="variable" ${d.rateType === 'variable' ? 'selected' : ''}>変動金利</option>
              <option value="mixed"    ${d.rateType === 'mixed'    ? 'selected' : ''}>当初固定（ミックス）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">変動金利シナリオ（変動の場合）</label>
            <select class="form-control" id="h-rate-scenario" data-save-key="housing.rateScenario">
              <option value="base" ${d.rateScenario === 'base' ? 'selected' : ''}>現状維持（ベース）</option>
              <option value="up05" ${d.rateScenario === 'up05' ? 'selected' : ''}>+0.5%上昇シナリオ</option>
              <option value="up10" ${d.rateScenario === 'up10' ? 'selected' : ''}>+1.0%上昇シナリオ</option>
              <option value="up20" ${d.rateScenario === 'up20' ? 'selected' : ''}>+2.0%上昇シナリオ</option>
            </select>
          </div>
        </div>

        <hr class="form-divider">

        <div class="form-group">
          <label class="form-label">将来の住宅購入予定</label>
          <div class="radio-group horizontal">
            <label class="radio-item">
              <input type="radio" name="purchase-plan" value="yes"
                ${d.purchasePlan === 'yes' ? 'checked' : ''}
                data-save-key="housing.purchasePlan"> 購入予定あり
            </label>
            <label class="radio-item">
              <input type="radio" name="purchase-plan" value="no"
                ${d.purchasePlan === 'no' ? 'checked' : ''}
                data-save-key="housing.purchasePlan"> 予定なし / 未定
            </label>
          </div>
        </div>

        <div id="purchase-block" class="conditional-block" ${!hasPlan ? 'style="display:none"' : ''}>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">購入予定年齢</label>
              <div class="input-with-unit">
                <input type="number" class="form-control has-unit"
                  id="h-buy-age" value="${d.buyAge || ''}" placeholder="例：38"
                  min="20" max="70" data-save-key="housing.buyAge">
                <span class="input-unit">歳</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">物件価格</label>
              <div class="input-with-unit">
                <input type="number" class="form-control has-unit"
                  id="h-price" value="${d.price || ''}" placeholder="例：4500"
                  min="0" max="99999" data-save-key="housing.price">
                <span class="input-unit">万円</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">頭金</label>
              <div class="input-with-unit">
                <input type="number" class="form-control has-unit"
                  id="h-down" value="${d.downPayment || ''}" placeholder="例：500"
                  min="0" max="99999" data-save-key="housing.downPayment">
                <span class="input-unit">万円</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">諸費用率</label>
              <div class="input-with-unit">
                <input type="number" class="form-control has-unit"
                  id="h-misc" value="${d.miscRate || 6}" placeholder="例：6"
                  min="3" max="10" step="0.5" data-save-key="housing.miscRate">
                <span class="input-unit">%</span>
              </div>
              <p class="form-hint">新築：約3〜5%、中古：約6〜8%が目安</p>
            </div>
            <div class="form-group">
              <label class="form-label">返済期間</label>
              <div class="input-with-unit">
                <input type="number" class="form-control has-unit"
                  id="h-term" value="${d.loanTerm || 35}" placeholder="例：35"
                  min="5" max="40" data-save-key="housing.loanTerm">
                <span class="input-unit">年</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">想定金利</label>
              <div class="input-with-unit">
                <input type="number" class="form-control has-unit"
                  id="h-interest" value="${d.interestRate || 0.5}" placeholder="例：1.0"
                  min="0" max="10" step="0.1" data-save-key="housing.interestRate">
                <span class="input-unit">%</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">諸費用の扱い</label>
            <div class="radio-group horizontal">
              <label class="radio-item">
                <input type="radio" name="misc-in-loan" value="no"
                  ${d.miscInLoan !== 'yes' ? 'checked' : ''} data-save-key="housing.miscInLoan">
                諸費用は現金で支払う
              </label>
              <label class="radio-item">
                <input type="radio" name="misc-in-loan" value="yes"
                  ${d.miscInLoan === 'yes' ? 'checked' : ''} data-save-key="housing.miscInLoan">
                諸費用もローンに組み込む
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">月額返済額</label>
            <div class="radio-group horizontal">
              <label class="radio-item">
                <input type="radio" name="repay-mode" value="auto"
                  ${d.repayMode !== 'manual' ? 'checked' : ''} data-save-key="housing.repayMode">
                自動計算する
              </label>
              <label class="radio-item">
                <input type="radio" name="repay-mode" value="manual"
                  ${d.repayMode === 'manual' ? 'checked' : ''} data-save-key="housing.repayMode">
                直接入力する
              </label>
            </div>
          </div>
          <div id="repay-manual-block" ${d.repayMode !== 'manual' ? 'style="display:none"' : ''}>
            <div class="form-group">
              <label class="form-label">月額返済額（直接入力）</label>
              <div class="input-with-unit">
                <input type="number" class="form-control has-unit"
                  id="h-repay-manual" value="${d.repayManual || ''}" placeholder="例：12"
                  min="0" max="999" step="0.1" data-save-key="housing.repayManual">
                <span class="input-unit">万円/月</span>
              </div>
            </div>
          </div>
          <div id="repay-auto-result" class="alert alert-info" style="${d.repayMode === 'manual' ? 'display:none' : ''}">
            <i class="fa-solid fa-calculator"></i>
            <span id="repay-calc-text">物件価格・頭金・金利・期間を入力すると月額返済額を計算します</span>
          </div>
        </div>

      </div>`;
  },

  // ---------------------------------------------------------
  // STEP 6: 万一への備え（保険）
  // ---------------------------------------------------------
  insurance(data) {
    const d        = data.insurance || {};
    const selfAge  = parseInt(data.family?.ageSelf || 35);

    // 死亡保障の有無
    const hasLifeIns   = d.hasLifeIns   || '';   // 'yes'/'no'/'unsure'
    // 受取方法
    const receiveType  = d.receiveType  || '';   // 'lump'/'annuity'/'both'/'unsure'
    // 保障額
    const lumpSum      = d.lumpSumCoverage        || '';
    const annuityMonthly = d.incomeProtectMonthly || '';
    const annuityUntil = d.incomeProtectUntil     || '';

    // 保険料（月額）- 後方互換：annualPremium が入ってる場合は月額へ変換して初期値に
    const monthlyPremiumInit = d.monthlyPremium
      ? d.monthlyPremium
      : (d.annualPremium ? Math.round(parseFloat(d.annualPremium) * 10000 / 12) : '');

    // 保険料負担率の表示用計算
    const i1 = data.income1 || {};
    const i2 = data.income2 || {};
    const hasSpouse = data.family?.hasSpouse === 'yes';
    const estNet = (gross) => {
      if (!gross || gross <= 0) return 0;
      if (gross <= 150) return gross * 0.87;
      if (gross <= 250) return gross * 0.84;
      if (gross <= 400) return gross * 0.80;
      if (gross <= 600) return gross * 0.77;
      if (gross <= 800) return gross * 0.74;
      if (gross <= 1000) return gross * 0.72;
      return gross * 0.70;
    };
    const selfNet   = parseFloat(i1.netIncome || 0) || estNet(parseFloat(i1.grossIncome || 0));
    const spouseNet = hasSpouse ? (parseFloat(i2.netIncome || 0) || estNet(parseFloat(i2.grossIncome || 0))) : 0;
    const totalNetY = selfNet + spouseNet; // 万円/年

    // 月額保険料から負担率計算（表示用）
    const mpVal = parseFloat(monthlyPremiumInit) || 0;
    const annualPremiumFromMonthly = mpVal / 10000 * 12; // 万円/年に変換（円→万円）
    const premiumRatioText = (totalNetY > 0 && mpVal > 0)
      ? `（世帯手取りに対する保険料負担率：約 ${((annualPremiumFromMonthly / totalNetY) * 100).toFixed(1)}%）`
      : '';

    // 死亡保障の詳細ブロック表示判定
    const showDetail   = hasLifeIns === 'yes';
    const showLump     = showDetail && (receiveType === 'lump'  || receiveType === 'both');
    const showAnnuity  = showDetail && (receiveType === 'annuity' || receiveType === 'both');
    const showUnsureNote = showDetail && receiveType === 'unsure';

    // 現在保障総額の試算（表示用）
    let currentCovDisplay = '';
    if (showDetail && receiveType && receiveType !== 'unsure') {
      const lumpVal    = parseFloat(lumpSum || 0);
      const annuityMV  = parseFloat(annuityMonthly || 0);
      const annuityEnd = parseInt(annuityUntil || 65);
      const remainYrs  = Math.max(0, annuityEnd - selfAge);
      const annuityEq  = annuityMV * 12 * remainYrs;
      const totalCov   = lumpVal + annuityEq;
      if (totalCov > 0) {
        currentCovDisplay = `現在の死亡保障総額（試算）：<strong>${totalCov.toLocaleString('ja-JP')} 万円</strong>
          ${annuityEq > 0 ? `<span style="font-size:0.78rem;color:var(--color-text-mute);">（年金型保障の一時金換算：${annuityMV}万円/月 × 12 × ${remainYrs}年 ＝ ${annuityEq.toLocaleString('ja-JP')}万円）</span>` : ''}`;
      }
    }

    return `
      <div class="step-card">
        <h2 class="step-title">
          <span class="step-badge">STEP 6</span>
          <i class="fa-solid fa-shield-halved"></i> 万一への備え
        </h2>
        <p class="step-desc">現在の保険・保障の状況を確認します。分からない項目はそのまま次へ進んでも構いません。</p>

        <!-- ① 必要保障額の設定 -->
        <h3 class="section-title" style="font-size:0.9rem;margin-bottom:12px;">
          <i class="fa-solid fa-calculator"></i> 必要保障額の設定
        </h3>

        <div class="form-group">
          <label class="form-label">万一の場合、毎月いくら確保したいですか？（遺族の生活費）</label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="ins-need-monthly" value="${d.needMonthly || ''}" placeholder="例：20"
              min="0" max="999" data-save-key="insurance.needMonthly">
            <span class="input-unit">万円/月</span>
          </div>
          <p class="form-hint">住宅ローンや子どもの教育費なども考慮した金額を目安に設定してください。</p>
        </div>

        <div class="form-group">
          <label class="form-label">その保障が必要な年齢（末子独立・住宅ローン完済など）</label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="ins-need-until" value="${d.needUntilAge || 65}" min="40" max="80"
              data-save-key="insurance.needUntilAge">
            <span class="input-unit">歳まで</span>
          </div>
        </div>

        <hr class="form-divider">

        <!-- ② 死亡保障の有無 -->
        <h3 class="section-title" style="font-size:0.9rem;margin-bottom:12px;">
          <i class="fa-solid fa-file-contract"></i> 現在の死亡保障
        </h3>

        <div class="form-group">
          <label class="form-label">死亡した場合に受け取れる生命保険に加入していますか？</label>
          <div class="radio-group horizontal">
            ${[{val:'yes',label:'あり'},{val:'no',label:'なし'},{val:'unsure',label:'わからない'}]
              .map(o => `<label class="radio-item">
                <input type="radio" name="has-life-ins" value="${o.val}"
                  ${hasLifeIns === o.val ? 'checked' : ''} data-save-key="insurance.hasLifeIns">
                ${o.label}</label>`).join('')}
          </div>
        </div>

        <!-- 「なし」または「わからない」の場合の案内 -->
        <div id="ins-no-coverage-note" style="display:${(!hasLifeIns || hasLifeIns === 'no' || hasLifeIns === 'unsure') && hasLifeIns !== 'yes' ? '' : 'none'};">
          ${hasLifeIns === 'no' || hasLifeIns === 'unsure' ? `
          <div class="alert alert-warn">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div>死亡保障の内容を確認してください。診断上は保障額0円として計算します。</div>
          </div>` : ''}
        </div>

        <!-- ③ 受取方法（「あり」の場合のみ） -->
        <div id="ins-detail-block" style="display:${showDetail ? '' : 'none'};">

          <div class="form-group">
            <label class="form-label">死亡保障の受け取り方を教えてください</label>
            <p class="form-hint">複数の生命保険に加入している場合は、同じ受け取り方の保障額を合計して入力してください。</p>
            <div class="radio-group">
              ${[
                {val:'lump',    label:'一時金（死亡時にまとめて受け取る）'},
                {val:'annuity', label:'毎月受け取る年金型（収入保障保険など）'},
                {val:'both',    label:'一時金と年金型の両方'},
                {val:'unsure',  label:'わからない'},
              ].map(o => `<label class="radio-item">
                <input type="radio" name="ins-receive-type" value="${o.val}"
                  ${receiveType === o.val ? 'checked' : ''} data-save-key="insurance.receiveType">
                ${o.label}</label>`).join('')}
            </div>
          </div>

          <!-- 一時金入力 -->
          <div id="ins-lump-block" style="display:${showLump ? '' : 'none'};">
            <div class="form-group">
              <label class="form-label">死亡時にまとめて受け取る金額（一時金）</label>
              <div class="input-with-unit">
                <input type="number" class="form-control has-unit"
                  id="ins-lump" value="${lumpSum}" placeholder="例：1000"
                  min="0" max="99999" data-save-key="insurance.lumpSumCoverage">
                <span class="input-unit">万円</span>
              </div>
              <p class="form-hint">定期保険・終身保険・養老保険など一時金型の合計額</p>
            </div>
          </div>

          <!-- 年金型入力 -->
          <div id="ins-annuity-block" style="display:${showAnnuity ? '' : 'none'};">
            <div class="form-group">
              <label class="form-label">毎月受け取れる金額（年金型）</label>
              <div class="input-with-unit">
                <input type="number" class="form-control has-unit"
                  id="ins-income-monthly" value="${annuityMonthly}" placeholder="例：15"
                  min="0" max="999" data-save-key="insurance.incomeProtectMonthly">
                <span class="input-unit">万円/月</span>
              </div>
              <p class="form-hint">収入保障保険・定期金型保険など毎月受け取る保障の月額合計</p>
            </div>
            <div class="form-group">
              <label class="form-label">保障が続く年齢（保障終了年齢）</label>
              <div class="input-with-unit">
                <input type="number" class="form-control has-unit"
                  id="ins-income-until" value="${annuityUntil}" placeholder="例：65"
                  min="40" max="80" data-save-key="insurance.incomeProtectUntil">
                <span class="input-unit">歳まで</span>
              </div>
            </div>
          </div>

          <!-- わからない案内 -->
          <div id="ins-unsure-note" style="display:${showUnsureNote ? '' : 'none'};">
            <div class="alert alert-info">
              <i class="fa-solid fa-circle-info"></i>
              <div>受取方法が不明な場合は、保険証券を確認するか、保険会社に問い合わせてみましょう。このまま次へ進むこともできます。</div>
            </div>
          </div>

          <!-- 保障総額の試算表示 -->
          <div id="ins-coverage-summary" style="${currentCovDisplay ? '' : 'display:none;'}">
            <div class="alert alert-success" style="margin-top:8px;">
              <i class="fa-solid fa-circle-check"></i>
              <div id="ins-coverage-text">${currentCovDisplay}</div>
            </div>
          </div>

        </div>

        <hr class="form-divider">

        <!-- ④ 保険料 -->
        <h3 class="section-title" style="font-size:0.9rem;margin-bottom:12px;">
          <i class="fa-solid fa-yen-sign"></i> 保険料
        </h3>

        <div class="form-group">
          <label class="form-label">世帯全体の毎月の保険料合計</label>
          <div class="input-with-unit">
            <input type="number" class="form-control has-unit"
              id="ins-monthly-premium" value="${monthlyPremiumInit}" placeholder="例：25000"
              min="0" max="9999999" data-save-key="insurance.monthlyPremium">
            <span class="input-unit">円/月</span>
          </div>
          <p class="form-hint">生命保険・医療保険・がん保険・就業不能保険など、現在支払っている保険料の世帯合計を入力してください。</p>
          <div id="ins-premium-ratio" class="form-hint" style="color:var(--color-primary-l);font-weight:500;${premiumRatioText ? '' : 'display:none;'}">${premiumRatioText}</div>
        </div>

        <hr class="form-divider">

        <!-- ⑤ 医療・就業不能保障 -->
        <h3 class="section-title" style="font-size:0.9rem;margin-bottom:12px;">
          <i class="fa-solid fa-hospital"></i> その他の保障（参考）
        </h3>

        <div class="form-group">
          <label class="form-label">医療保険に加入していますか？</label>
          <div class="radio-group horizontal">
            ${[{val:'yes',label:'あり'},{val:'no',label:'なし'},{val:'unsure',label:'わからない'}]
              .map(o => `<label class="radio-item">
                <input type="radio" name="has-medical" value="${o.val}"
                  ${d.hasMedical === o.val ? 'checked' : ''} data-save-key="insurance.hasMedical">
                ${o.label}</label>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">病気・けがで長期間働けない場合の保険に加入していますか？</label>
          <p class="form-hint">就業不能保険・所得補償保険・収入保障保険（就労不能特約）など</p>
          <div class="radio-group horizontal">
            ${[{val:'yes',label:'あり'},{val:'no',label:'なし'},{val:'unsure',label:'わからない'}]
              .map(o => `<label class="radio-item">
                <input type="radio" name="has-disability" value="${o.val}"
                  ${d.hasDisability === o.val ? 'checked' : ''} data-save-key="insurance.hasDisability">
                ${o.label}</label>`).join('')}
          </div>
        </div>

      </div>`;
  },

  // ---------------------------------------------------------
  // STEP 8: 入力内容の確認
  // ---------------------------------------------------------
  confirm(data) {
    const workLabels = {
      employee_full:'会社員（正規）', employee_part:'会社員（非正規）',
      self_employed:'自営業・フリーランス', officer:'役員・経営者',
      not_working:'現在就労なし', other:'その他',
    };
    const eduLabels = {
      high:'高校卒業', vocational:'専門学校卒業', junior:'短期大学卒業', university:'大学卒業',
    };
    const curveLabels = {
      flat:'横ばい', up1:'毎年1%上昇', up2:'毎年2%上昇',
      down50:'50歳から10%減少', down60:'60歳から30%減少',
    };
    const investLabels = {conservative:'堅め（1.5%）', moderate:'通常（3.0%）', aggressive:'積極（5.0%）'};
    const eduPolicyLabels = {
      public:'公立中心', univ_private:'大学から私立', high_private:'高校から私立',
      mid_private:'中学から私立', private:'私立中心', undecided:'まだ決めていない',
    };
    const univLabels = {local:'自宅通学', away:'自宅外', mix:'子どもによる', none:'想定なし'};
    const homeLabels = {rent:'賃貸', own:'持ち家（ローン中）', paid:'持ち家（完済）', other:'その他'};
    const extraEduLabels = {standard:'標準的', active:'やや力を入れたい', heavy:'受験・留学も検討'};
    const yesNo = v => v === 'yes' ? 'あり' : v === 'no' ? 'なし' : v === 'unsure' ? '不明' : '―';
    const yen   = v => v ? `${Number(v).toLocaleString('ja-JP')} 万円` : '―';
    const age   = v => v ? `${v} 歳` : '―';

    const f   = data.family    || {};
    const i1  = data.income1   || {};
    const i2  = data.income2   || {};
    const lv  = data.living    || {};
    const as  = data.assets    || {};
    const hw  = data.housing   || {};
    const ins = data.insurance || {};
    const hasSpouse = f.hasSpouse === 'yes';
    const cc  = parseInt(f.childrenCount || 0);

    let childrenRows = '';
    for (let i = 0; i < cc; i++) {
      const child = (f.children || [])[i] || {};
      childrenRows += `<tr><td>第${i+1}子</td><td>${age(child.age)}　${eduLabels[child.education] || '―'}</td></tr>`;
    }

    return `
      <div class="step-card">
        <h2 class="step-title">
          <span class="step-badge">STEP 8</span>
          <i class="fa-solid fa-clipboard-check"></i> 入力内容の確認
        </h2>
        <p class="step-desc">以下の内容を確認して「診断を見る」を押してください。</p>

        <div class="confirm-section">
          <div class="confirm-section-title">
            <span><i class="fa-solid fa-users"></i> 家族構成</span>
            <button type="button" class="btn btn-ghost btn-xs confirm-edit-btn" data-goto-step="0">
              <i class="fa-solid fa-pen"></i> 修正する
            </button>
          </div>
          <table class="confirm-table">
            <tr><td>本人年齢</td><td>${age(f.ageSelf)}</td></tr>
            <tr><td>配偶者</td><td>${hasSpouse ? `あり（${age(f.ageSpouse)}）` : 'なし / 未定'}</td></tr>
            <tr><td>子どもの人数</td><td>${cc > 0 ? cc + '人' : 'なし'}</td></tr>
            ${childrenRows}
          </table>
        </div>

        <div class="confirm-section">
          <div class="confirm-section-title">
            <span><i class="fa-solid fa-briefcase"></i> 本人の収入</span>
            <button type="button" class="btn btn-ghost btn-xs confirm-edit-btn" data-goto-step="1">
              <i class="fa-solid fa-pen"></i> 修正する
            </button>
          </div>
          <table class="confirm-table">
            <tr><td>働き方</td><td>${workLabels[i1.workType] || '―'}</td></tr>
            <tr><td>額面年収</td><td>${yen(i1.grossIncome)}</td></tr>
            <tr><td>手取り年収</td><td>${yen(i1.netIncome)}</td></tr>
            <tr><td>収入カーブ</td><td>${curveLabels[i1.incomeCurve] || '―'}</td></tr>
            <tr><td>就業終了年齢</td><td>${age(i1.retireAge)}</td></tr>
            <tr><td>年金見込額（月・65歳基準）</td><td>${i1.pensionAmount ? i1.pensionAmount + ' 万円/月' : '―'}</td></tr>
            <tr><td>退職金</td><td>${yen(i1.severancePay)}</td></tr>
          </table>
        </div>

        ${hasSpouse ? `
        <div class="confirm-section">
          <div class="confirm-section-title">
            <span><i class="fa-solid fa-briefcase"></i> 配偶者の収入</span>
            <button type="button" class="btn btn-ghost btn-xs confirm-edit-btn" data-goto-step="2">
              <i class="fa-solid fa-pen"></i> 修正する
            </button>
          </div>
          <table class="confirm-table">
            <tr><td>働き方</td><td>${workLabels[i2.workType] || '―'}</td></tr>
            <tr><td>額面年収</td><td>${yen(i2.grossIncome)}</td></tr>
            <tr><td>収入カーブ</td><td>${curveLabels[i2.incomeCurve] || '―'}</td></tr>
            <tr><td>就業終了年齢</td><td>${age(i2.retireAge)}</td></tr>
          </table>
        </div>` : ''}

        <div class="confirm-section">
          <div class="confirm-section-title">
            <span><i class="fa-solid fa-piggy-bank"></i> 資産と積立</span>
            <button type="button" class="btn btn-ghost btn-xs confirm-edit-btn" data-goto-step="3">
              <i class="fa-solid fa-pen"></i> 修正する
            </button>
          </div>
          <table class="confirm-table">
            <tr><td>現預金</td><td>${yen(as.cash)}</td></tr>
            <tr><td>NISA・投資資産</td><td>${yen(as.investment)}</td></tr>
            <tr><td>DC・iDeCo残高</td><td>${yen(as.dc)}</td></tr>
            <tr><td>毎月積立</td><td>${as.monthlySaving ? as.monthlySaving + ' 万円/月' : '―'}</td></tr>
            <tr><td>運用方針</td><td>${investLabels[as.investPolicy] || '―'}</td></tr>
          </table>
        </div>

        <div class="confirm-section">
          <div class="confirm-section-title">
            <span><i class="fa-solid fa-building"></i> 住まい</span>
            <button type="button" class="btn btn-ghost btn-xs confirm-edit-btn" data-goto-step="4">
              <i class="fa-solid fa-pen"></i> 修正する
            </button>
          </div>
          <table class="confirm-table">
            <tr><td>現在の住まい</td><td>${homeLabels[hw.currentType] || '―'}</td></tr>
            <tr><td>月額住居費</td><td>${hw.monthlyCost ? hw.monthlyCost + ' 万円/月' : '―'}</td></tr>
            <tr><td>住宅購入予定</td><td>${yesNo(hw.purchasePlan)}</td></tr>
            ${hw.purchasePlan === 'yes' ? `
            <tr><td>購入予定年齢</td><td>${age(hw.buyAge)}</td></tr>
            <tr><td>物件価格</td><td>${yen(hw.price)}</td></tr>
            <tr><td>頭金</td><td>${yen(hw.downPayment)}</td></tr>
            ` : ''}
          </table>
        </div>

        <div class="confirm-section">
          <div class="confirm-section-title">
            <span><i class="fa-solid fa-shield-halved"></i> 万一への備え</span>
            <button type="button" class="btn btn-ghost btn-xs confirm-edit-btn" data-goto-step="5">
              <i class="fa-solid fa-pen"></i> 修正する
            </button>
          </div>
          <table class="confirm-table">
            <tr><td>必要保障額（月）</td><td>${ins.needMonthly ? ins.needMonthly + ' 万円/月' : '―'}</td></tr>
            <tr><td>死亡保障</td><td>${{yes:'あり',no:'なし',unsure:'わからない'}[ins.hasLifeIns] || '―'}</td></tr>
            ${ins.hasLifeIns === 'yes' && ins.receiveType ? `<tr><td>受取方法</td><td>${{lump:'一時金',annuity:'年金型',both:'一時金・年金型両方',unsure:'わからない'}[ins.receiveType] || '―'}</td></tr>` : ''}
            <tr><td>毎月の保険料</td><td>${ins.monthlyPremium ? Number(ins.monthlyPremium).toLocaleString('ja-JP') + ' 円/月' : '―'}</td></tr>
            <tr><td>医療保険</td><td>${yesNo(ins.hasMedical)}</td></tr>
            <tr><td>就業不能保険</td><td>${yesNo(ins.hasDisability)}</td></tr>
          </table>
        </div>

        <div class="confirm-section">
          <div class="confirm-section-title">
            <span><i class="fa-solid fa-house"></i> 生活費と教育</span>
            <button type="button" class="btn btn-ghost btn-xs confirm-edit-btn" data-goto-step="6">
              <i class="fa-solid fa-pen"></i> 修正する
            </button>
          </div>
          <table class="confirm-table">
            <tr><td>年間消費支出</td><td>${yen(lv.annualExpense)}</td></tr>
            <tr><td>教育方針</td><td>${eduPolicyLabels[lv.eduPolicy] || '―'}</td></tr>
            <tr><td>大学通学想定</td><td>${univLabels[lv.univStyle] || '―'}</td></tr>
            <tr><td>塾・習い事</td><td>${extraEduLabels[lv.extraEdu] || '―'}</td></tr>
          </table>
        </div>

        <div class="alert alert-info mt-16">
          <i class="fa-solid fa-circle-info"></i>
          内容を確認したら「診断を見る」を押してください。後から入力を修正することもできます。
        </div>
      </div>`;
  },
};

window.STEPS        = STEPS;
window.StepBuilders = StepBuilders;

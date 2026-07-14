/**
 * app.js
 * =========================================================
 * 家計コンパス β版 - メインアプリケーション
 *
 * 役割：
 *  - 画面遷移（トップ → 入力 → 結果）
 *  - localStorageへの自動保存・復元
 *  - 入力ステップのレンダリング
 *  - 進捗バーの更新
 *  - 条件付き表示の制御
 *  - モーダル（PDF選択・データ削除確認）
 *  - 月額返済額の自動計算
 *  - 生活費逆算ロジック（STEP4）
 * =========================================================
 */

'use strict';

// =========================================================
// 定数
// =========================================================
const STORAGE_KEY      = 'kakeibo_compass_v1'; // バージョン番号付きキー
const STORAGE_VERSION  = 1;

// =========================================================
// アプリケーション状態
// =========================================================
let currentStep = 0;   // 現在のステップインデックス (0-indexed)
let formData    = {};  // 入力データオブジェクト

// =========================================================
// localStorage ユーティリティ
// =========================================================
const Storage = {
  /**
   * データを保存する
   * @param {object} data - 保存するデータ
   * @param {number} step - 現在のステップ（省略時は currentStep を使用）
   */
  save(data, step) {
    try {
      const payload = {
        version: STORAGE_VERSION,
        savedAt: new Date().toISOString(),
        step:    (step !== undefined) ? step : currentStep,
        data:    data,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[家計コンパス] localStorage保存失敗:', e);
    }
  },

  /**
   * データを読み込む
   * @returns {object|null} 保存されたデータ or null
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (payload.version !== STORAGE_VERSION) {
        console.info('[家計コンパス] バージョン不一致のため無視');
        return null;
      }
      return payload;
    } catch (e) {
      console.warn('[家計コンパス] localStorage読込失敗:', e);
      return null;
    }
  },

  /** データを全削除する */
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },

  /** 保存データが存在するか確認する */
  hasData() {
    return !!localStorage.getItem(STORAGE_KEY);
  },

};

// =========================================================
// ユーティリティ
// =========================================================

/**
 * ネストしたオブジェクトのパスに値をセットする
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextIsIndex = !isNaN(parseInt(keys[i + 1]));
    if (current[key] === undefined || current[key] === null) {
      current[key] = nextIsIndex ? [] : {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * 数値を3桁区切りで表示する（万円表記）
 */
function formatYen(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '―';
  return n.toLocaleString('ja-JP') + ' 万円';
}

// =========================================================
// 月額返済額の自動計算（住宅ローン表示用）
// =========================================================
function calcMonthlyRepaymentApp(principal, annualRate, termYears) {
  const P = principal * 10000; // 円換算
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0 || n === 0) return P / Math.max(n, 1) / 10000;
  const monthly = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return monthly / 10000; // 万円で返す
}

// =========================================================
// 入力値の収集（現在のステップ）
// =========================================================
function collectCurrentStep() {
  const container = document.getElementById('step-content');
  if (!container) return;

  container.querySelectorAll('input[data-save-key]').forEach(el => {
    const key = el.getAttribute('data-save-key');
    if (el.type === 'radio') {
      if (el.checked) setNestedValue(formData, key, el.value);
    } else if (el.type === 'checkbox') {
      setNestedValue(formData, key, el.checked);
    } else {
      setNestedValue(formData, key, el.value);
    }
  });

  container.querySelectorAll('select[data-save-key]').forEach(el => {
    const key = el.getAttribute('data-save-key');
    setNestedValue(formData, key, el.value);
  });
}

// =========================================================
// 自動保存
// =========================================================
function autoSave() {
  collectCurrentStep();
  Storage.save(formData);
}

// =========================================================
// 進捗バーの更新
// =========================================================
function updateProgress() {
  const total   = STEPS.length;
  const percent = Math.round((currentStep / (total - 1)) * 100);

  const bar = document.getElementById('progress-bar');
  if (bar) bar.style.width = percent + '%';

  const text = document.getElementById('progress-text');
  if (text) text.textContent = `STEP ${currentStep + 1} / ${total}：${STEPS[currentStep].title}`;

  const labelsEl = document.getElementById('progress-labels');
  if (labelsEl) {
    labelsEl.innerHTML = STEPS.map((s, i) => {
      let cls = 'progress-dot';
      if (i < currentStep)      cls += ' done';
      else if (i === currentStep) cls += ' current';
      return `<div class="${cls}" title="${s.title}"></div>`;
    }).join('');
  }
}

// =========================================================
// ステップのレンダリング
// =========================================================
function renderStep(index) {
  const stepId  = STEPS[index].id;
  const builder = StepBuilders[stepId];
  if (!builder) return;

  const container = document.getElementById('step-content');
  container.innerHTML = builder(formData);

  // 「戻る」ボタン
  const prevBtn = document.getElementById('btn-prev');
  if (prevBtn) prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';

  // 「次へ」ボタン（最終ステップは「診断を見る」）
  const nextBtn = document.getElementById('btn-next');
  if (nextBtn) {
    if (index === STEPS.length - 1) {
      nextBtn.innerHTML = '<i class="fa-solid fa-chart-bar"></i> 診断を見る';
      nextBtn.classList.add('btn-accent');
    } else {
      nextBtn.innerHTML = '次へ <i class="fa-solid fa-chevron-right"></i>';
      nextBtn.classList.remove('btn-accent');
    }
  }

  updateProgress();
  attachStepEvents(stepId);

  // 上部へスクロール
  const inputMain = document.querySelector('.input-main');
  if (inputMain) inputMain.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =========================================================
// ステップごとのイベントアタッチ
// =========================================================
function attachStepEvents(stepId) {
  const container = document.getElementById('step-content');
  if (!container) return;

  // --- 全ステップ共通：入力変更で自動保存 ---
  container.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('change', () => autoSave());
    if (el.tagName === 'INPUT' && el.type !== 'radio' && el.type !== 'checkbox') {
      el.addEventListener('input', () => autoSave());
    }
  });

  // --- STEP 1: 家族構成 ---
  if (stepId === 'family') {
    container.querySelectorAll('input[name="has-spouse"]').forEach(el => {
      el.addEventListener('change', () => {
        const block = document.getElementById('spouse-block');
        if (block) block.style.display = el.value === 'yes' ? '' : 'none';
        autoSave();
      });
    });

    const ccEl = document.getElementById('children-count');
    if (ccEl) {
      ccEl.addEventListener('change', () => {
        autoSave();
        renderStep(currentStep);
      });
    }
  }

  // --- STEP 4: 生活費と教育（逆算パネル） ---
  if (stepId === 'living') {
    attachLivingReverseEvents();
  }

  // --- STEP 6: 万一への備え ---
  if (stepId === 'insurance') {
    attachInsuranceEvents();
  }

  // --- STEP 6: 住まい ---
  if (stepId === 'housing') {
    container.querySelectorAll('input[name="current-type"]').forEach(el => {
      el.addEventListener('change', () => {
        const block = document.getElementById('loan-block');
        if (block) block.style.display = el.value === 'own' ? '' : 'none';
        autoSave();
      });
    });

    container.querySelectorAll('input[name="purchase-plan"]').forEach(el => {
      el.addEventListener('change', () => {
        const block = document.getElementById('purchase-block');
        if (block) block.style.display = el.value === 'yes' ? '' : 'none';
        autoSave();
      });
    });

    container.querySelectorAll('input[name="repay-mode"]').forEach(el => {
      el.addEventListener('change', () => {
        const manualBlock = document.getElementById('repay-manual-block');
        const autoBlock   = document.getElementById('repay-auto-result');
        if (manualBlock) manualBlock.style.display = el.value === 'manual' ? '' : 'none';
        if (autoBlock)   autoBlock.style.display   = el.value === 'auto'   ? '' : 'none';
        autoSave();
      });
    });

    container.querySelectorAll('input[name="misc-in-loan"]').forEach(el => {
      el.addEventListener('change', () => {
        updateRepayCalc();
        autoSave();
      });
    });

    ['h-price', 'h-down', 'h-interest', 'h-term', 'h-misc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          updateRepayCalc();
          autoSave();
        });
      }
    });

    // 初期表示時に計算を実行
    updateRepayCalc();
  }

  // --- STEP 8: 確認画面（各セクションの「修正する」ボタン） ---
  if (stepId === 'confirm') {
    container.querySelectorAll('button[data-goto-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetStep = parseInt(btn.getAttribute('data-goto-step'));
        collectCurrentStep();
        autoSave();
        goToStep(targetStep);
      });
    });
  }
}

// =========================================================
// 月額返済額の自動計算表示（住宅ローン）
// =========================================================
function updateRepayCalc() {
  const price    = parseFloat(document.getElementById('h-price')?.value    || 0);
  const down     = parseFloat(document.getElementById('h-down')?.value     || 0);
  const rate     = parseFloat(document.getElementById('h-interest')?.value || 0);
  const term     = parseFloat(document.getElementById('h-term')?.value     || 0);
  const miscRate = parseFloat(document.getElementById('h-misc')?.value     || 6);

  const calcText = document.getElementById('repay-calc-text');
  if (!calcText) return;

  if (!price || !term) {
    calcText.textContent = '物件価格・頭金・金利・期間を入力すると月額返済額を計算します';
    return;
  }

  const misc       = price * (miscRate / 100);
  const miscInLoan = document.querySelector('input[name="misc-in-loan"]:checked')?.value === 'yes';
  const principal  = Math.max(0, price - down + (miscInLoan ? misc : 0));
  const monthly    = calcMonthlyRepaymentApp(principal, rate, term);
  const totalRepay = monthly * term * 12;

  calcText.innerHTML = `
    借入額：<strong>${principal.toLocaleString('ja-JP', {maximumFractionDigits:0})} 万円</strong>
    　月額返済：<strong>${monthly.toLocaleString('ja-JP', {minimumFractionDigits:1, maximumFractionDigits:1})} 万円/月</strong>
    　総返済額：<strong>${totalRepay.toLocaleString('ja-JP', {maximumFractionDigits:0})} 万円</strong>
    （利息含む・概算）`;
}

// =========================================================
// 画面切り替え
// =========================================================
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${name}`);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0 });
}

// =========================================================
// 特定のステップへジャンプ（入力値を保持したまま）
// =========================================================
function goToStep(targetIndex) {
  currentStep = Math.max(0, Math.min(targetIndex, STEPS.length - 1));
  showScreen('input');
  renderStep(currentStep);
}

// グローバル公開（steps.jsのconfirm画面から呼ぶ用）
window.goToStep = goToStep;

// =========================================================
// トップ画面の初期化
// =========================================================
function initTopScreen() {
  const resumeBtn = document.getElementById('btn-resume');
  if (resumeBtn) {
    resumeBtn.style.display = Storage.hasData() ? 'flex' : 'none';
  }
}

// =========================================================
// 入力画面の開始
// =========================================================
function startInput(fromResume = false) {
  if (fromResume) {
    // 「前回の続きから再開」: ステップも復元
    const saved = Storage.load();
    if (saved) {
      formData    = saved.data || {};
      currentStep = Math.min(saved.step || 0, STEPS.length - 1);
    }
  } else {
    // 「新規診断」: データをクリアしてSTEP0から
    formData    = {};
    currentStep = 0;
  }
  showScreen('input');
  renderStep(currentStep);
}

// =========================================================
// 「入力を修正する」から特定ステップへ（入力値は保持）
// =========================================================
function editFromResult(targetStep = 0) {
  // データは保持し、ステップだけを変更
  currentStep = Math.max(0, Math.min(targetStep, STEPS.length - 1));
  // localStorageのstepも更新（再開時に変な場所へ飛ばないよう）
  Storage.save(formData, currentStep);
  showScreen('input');
  renderStep(currentStep);
}

// グローバル公開
window.editFromResult = editFromResult;

// =========================================================
// 前のステップへ
// =========================================================
function prevStep() {
  collectCurrentStep();
  autoSave();
  if (currentStep > 0) {
    currentStep--;
    renderStep(currentStep);
  }
}

// =========================================================
// 次のステップへ（常に現在ステップ+1）
// =========================================================
function nextStep() {
  collectCurrentStep();
  autoSave();

  if (currentStep < STEPS.length - 1) {
    currentStep++;
    renderStep(currentStep);
  } else {
    // 最終ステップ（確認画面）→ 結果画面へ
    showScreen('result');
    ResultRenderer.render(formData);
  }
}

// =========================================================
// データ削除確認モーダル
// =========================================================
function openClearModal() {
  const modal = document.getElementById('modal-clear');
  if (modal) modal.style.display = 'flex';
}
function closeClearModal() {
  const modal = document.getElementById('modal-clear');
  if (modal) modal.style.display = 'none';
}
function confirmClearData() {
  Storage.clear();
  formData    = {};
  currentStep = 0;
  closeClearModal();
  initTopScreen();
  showScreen('top');
}

// =========================================================
// PDF選択モーダル
// =========================================================
function openPdfModal() {
  const modal = document.getElementById('modal-pdf');
  if (modal) modal.style.display = 'flex';
}
function closePdfModal() {
  const modal = document.getElementById('modal-pdf');
  if (modal) modal.style.display = 'none';
}

// =========================================================
// イベントリスナーの初期化
// =========================================================
function initEvents() {
  // --- トップ画面 ---
  document.getElementById('btn-start')?.addEventListener('click',  () => startInput(false));
  document.getElementById('btn-resume')?.addEventListener('click', () => startInput(true));
  document.getElementById('btn-clear-data-top')?.addEventListener('click', openClearModal);

  // --- 入力画面ナビ ---
  document.getElementById('btn-prev')?.addEventListener('click', prevStep);
  document.getElementById('btn-next')?.addEventListener('click', nextStep);
  document.getElementById('btn-input-back-top')?.addEventListener('click', () => {
    collectCurrentStep();
    autoSave();
    showScreen('top');
    initTopScreen();
  });

  // --- 結果画面 ---
  document.getElementById('btn-result-back')?.addEventListener('click', () => {
    // 結果画面から「戻る」→ 確認画面（最終ステップ）を表示
    currentStep = STEPS.length - 1;
    showScreen('input');
    renderStep(currentStep);
  });
  document.getElementById('btn-print')?.addEventListener('click', () => window.print());

  // --- PDF モーダル ---
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#btn-pdf-save');
    if (btn) openPdfModal();
  });
  document.getElementById('btn-pdf-detail')?.addEventListener('click', () => {
    closePdfModal();
    PdfExporter.export('detail', formData);
  });
  document.getElementById('btn-pdf-simple')?.addEventListener('click', () => {
    closePdfModal();
    PdfExporter.export('simple', formData);
  });
  document.getElementById('btn-pdf-cancel')?.addEventListener('click', closePdfModal);

  // --- 削除確認モーダル ---
  document.getElementById('btn-clear-confirm')?.addEventListener('click', confirmClearData);
  document.getElementById('btn-clear-cancel')?.addEventListener('click', closeClearModal);

  // モーダル外クリックで閉じる
  document.getElementById('modal-pdf')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closePdfModal();
  });
  document.getElementById('modal-clear')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeClearModal();
  });

  // --- 結果画面の動的ボタン（イベント委任） ---
  document.getElementById('result-main')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'btn-pdf-save')       openPdfModal();
    if (btn.id === 'btn-consult-email')  openConsultEmail();
    if (btn.id === 'btn-result-recalc') {
      // 「入力を修正する」→ STEP1（家族構成）から（入力値は保持）
      editFromResult(0);
    }
    // data-edit-step 属性付きボタンは対応するステップへ直接ジャンプ
    const editStep = btn.getAttribute('data-edit-step');
    if (editStep !== null) {
      editFromResult(parseInt(editStep));
    }
  });
}

// =========================================================
// メール相談を開く
// =========================================================
function openConsultEmail() {
  const to      = 'yukiya.fp1106@gmail.com';
  const subject = encodeURIComponent('家計コンパスの個別相談について');
  const body    = encodeURIComponent(
    '家計コンパスの診断結果について相談を希望します。\n診断結果のPDFを添付のうえ、お問い合わせください。'
  );
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}

// グローバル公開
window.openConsultEmail = openConsultEmail;
window.openPdfModal     = openPdfModal;

// =========================================================
// 万一への備えパネル - イベントハンドラ
// =========================================================
function attachInsuranceEvents() {
  const container = document.getElementById('step-content');
  if (!container) return;

  // ---- 死亡保障の有無ラジオ ----
  const lifeInsRadios = container.querySelectorAll('input[name="has-life-ins"]');
  lifeInsRadios.forEach(el => {
    el.addEventListener('change', () => {
      updateInsuranceBlocks();
      autoSave();
    });
  });

  // ---- 受取方法ラジオ ----
  const receiveRadios = container.querySelectorAll('input[name="ins-receive-type"]');
  receiveRadios.forEach(el => {
    el.addEventListener('change', () => {
      updateInsuranceBlocks();
      autoSave();
    });
  });

  // ---- 保障額・保険料の入力 → 試算表示更新 ----
  ['ins-lump', 'ins-income-monthly', 'ins-income-until', 'ins-monthly-premium'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        updateInsuranceSummary();
        updateInsurancePremiumRatio();
        autoSave();
      });
    }
  });

  // 初期描画
  updateInsuranceBlocks();
}

/**
 * 死亡保障の有無・受取方法に応じて各ブロックを表示/非表示切替
 */
function updateInsuranceBlocks() {
  const container = document.getElementById('step-content');
  if (!container) return;

  const hasLifeIns  = container.querySelector('input[name="has-life-ins"]:checked')?.value  || '';
  const receiveType = container.querySelector('input[name="ins-receive-type"]:checked')?.value || '';

  const detailBlock  = document.getElementById('ins-detail-block');
  const noCoverNote  = document.getElementById('ins-no-coverage-note');
  const lumpBlock    = document.getElementById('ins-lump-block');
  const annuityBlock = document.getElementById('ins-annuity-block');
  const unsureNote   = document.getElementById('ins-unsure-note');

  // 詳細ブロックの表示制御
  if (detailBlock)  detailBlock.style.display  = hasLifeIns === 'yes' ? '' : 'none';

  // 「なし/わからない」案内の表示制御
  if (noCoverNote) {
    if (hasLifeIns === 'no' || hasLifeIns === 'unsure') {
      noCoverNote.style.display = '';
      noCoverNote.innerHTML = `
        <div class="alert alert-warn">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <div>死亡保障の内容を確認してください。診断上は保障額0円として計算します。</div>
        </div>`;
    } else {
      noCoverNote.style.display = 'none';
      noCoverNote.innerHTML = '';
    }
  }

  // 受取方法に応じた入力ブロック
  const showLump    = (receiveType === 'lump'    || receiveType === 'both');
  const showAnnuity = (receiveType === 'annuity' || receiveType === 'both');

  if (lumpBlock)    lumpBlock.style.display    = showLump    ? '' : 'none';
  if (annuityBlock) annuityBlock.style.display = showAnnuity ? '' : 'none';
  if (unsureNote)   unsureNote.style.display   = receiveType === 'unsure' ? '' : 'none';

  // 保障額試算を更新
  updateInsuranceSummary();
}

/**
 * 死亡保障の試算表示を更新
 */
function updateInsuranceSummary() {
  const container = document.getElementById('step-content');
  if (!container) return;

  const selfAge     = parseInt(formData.family?.ageSelf || 35);
  const receiveType = container.querySelector('input[name="ins-receive-type"]:checked')?.value || '';
  const hasLifeIns  = container.querySelector('input[name="has-life-ins"]:checked')?.value  || '';

  const summaryDiv = document.getElementById('ins-coverage-summary');
  const textDiv    = document.getElementById('ins-coverage-text');
  if (!summaryDiv || !textDiv) return;

  if (hasLifeIns !== 'yes' || !receiveType || receiveType === 'unsure') {
    summaryDiv.style.display = 'none';
    return;
  }

  const lumpVal    = parseFloat(document.getElementById('ins-lump')?.value          || 0);
  const annuityMV  = parseFloat(document.getElementById('ins-income-monthly')?.value || 0);
  const annuityEnd = parseInt(document.getElementById('ins-income-until')?.value     || 65);
  const remainYrs  = Math.max(0, annuityEnd - selfAge);
  const annuityEq  = annuityMV * 12 * remainYrs;
  const totalCov   = lumpVal + annuityEq;

  if (totalCov <= 0) {
    summaryDiv.style.display = 'none';
    return;
  }

  summaryDiv.style.display = '';
  let html = `現在の死亡保障総額（試算）：<strong>${totalCov.toLocaleString('ja-JP')} 万円</strong>`;
  if (annuityEq > 0) {
    html += `<br><span style="font-size:0.78rem;color:var(--color-text-mute);">年金型換算：${annuityMV}万円/月 × 12 × ${remainYrs}年 ＝ ${annuityEq.toLocaleString('ja-JP')}万円</span>`;
  }
  textDiv.innerHTML = html;
}

/**
 * 保険料負担率の表示を更新
 */
function updateInsurancePremiumRatio() {
  const ratioDiv = document.getElementById('ins-premium-ratio');
  if (!ratioDiv) return;

  const mpVal = parseFloat(document.getElementById('ins-monthly-premium')?.value || 0);
  if (!mpVal) { ratioDiv.style.display = 'none'; return; }

  // 世帯手取りを formData から取得
  const i1 = formData.income1 || {};
  const i2 = formData.income2 || {};
  const hasSpouse = formData.family?.hasSpouse === 'yes';
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

  const annualFromMonthly = mpVal / 10000 * 12; // 円/月 → 万円/年
  if (totalNetY <= 0) { ratioDiv.style.display = 'none'; return; }

  const ratio = (annualFromMonthly / totalNetY * 100).toFixed(1);
  ratioDiv.style.display = '';
  ratioDiv.textContent = `世帯手取りに対する保険料負担率：約 ${ratio}%（年間 ${Math.round(annualFromMonthly * 10) / 10} 万円）`;
}

// =========================================================
// 生活費逆算パネル - イベントハンドラ
// =========================================================

/**
 * 生活費逆算パネルのイベントを設定する
 */
function attachLivingReverseEvents() {
  const container = document.getElementById('step-content');
  if (!container) return;

  // 逆算用入力フィールドの変更 → 逆算結果を更新 → formData保存
  ['lc-edu-annual', 'lc-other-annual', 'lc-extra-saving'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        collectCurrentStep();
        updateLivingReverse();
        Storage.save(formData);
      });
    }
  });

  // 「生活費を自分で修正する」トグルボタン
  const toggleBtn   = document.getElementById('btn-manual-toggle');
  const manualBlock = document.getElementById('lc-manual-block');
  const flagEl      = document.getElementById('lc-manual-flag'); // 常時1つだけ存在

  if (toggleBtn && manualBlock) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = manualBlock.style.display !== 'none';

      if (isOpen) {
        // ===== 手動モードを閉じる =====
        manualBlock.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fa-solid fa-pen"></i> 生活費を自分で修正する';

        // フラグを 'no' に
        if (flagEl) flagEl.value = 'no';

        // 手動入力欄の data-save-key を外す（collectCurrentStep で拾われないよう）
        const manualInput = manualBlock.querySelector('input#liv-expense');
        if (manualInput) manualInput.removeAttribute('data-save-key');

        // 自動計算値保持用 hidden input を追加（まだなければ）
        let autoHidden = container.querySelector('input#liv-expense-auto');
        if (!autoHidden) {
          autoHidden = document.createElement('input');
          autoHidden.type = 'hidden';
          autoHidden.id   = 'liv-expense-auto';
          autoHidden.setAttribute('data-save-key', 'living.annualExpense');
          manualBlock.parentNode.insertBefore(autoHidden, manualBlock);
        } else {
          autoHidden.setAttribute('data-save-key', 'living.annualExpense');
        }
        const rev = calcLivingReverse();
        autoHidden.value = rev >= 0 ? Math.round(rev) : '';

      } else {
        // ===== 手動モードを開く =====
        manualBlock.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> 閉じる';

        // フラグを 'yes' に
        if (flagEl) flagEl.value = 'yes';

        // 自動計算値保持 hidden input の data-save-key を外す（手動入力欄を優先）
        const autoHidden = container.querySelector('input#liv-expense-auto');
        if (autoHidden) autoHidden.removeAttribute('data-save-key');

        // 手動入力欄に data-save-key を再付与
        const manualInput = manualBlock.querySelector('input#liv-expense');
        if (manualInput) manualInput.setAttribute('data-save-key', 'living.annualExpense');
      }

      collectCurrentStep();
      Storage.save(formData);
      updateLivingReverse();
    });
  }

  // 手動入力欄の変更 → formData保存
  const manualInput = manualBlock ? manualBlock.querySelector('input#liv-expense') : null;
  if (manualInput) {
    manualInput.addEventListener('input', () => {
      collectCurrentStep();
      Storage.save(formData);
    });
  }
}

/**
 * 逆算値を数値で返す（マイナスもそのまま返す）
 */
function calcLivingReverse() {
  // formData から最新値を取得
  const i1  = formData.income1   || {};
  const i2  = formData.income2   || {};
  const as  = formData.assets    || {};
  const hw  = formData.housing   || {};
  const ins = formData.insurance || {};
  const lv  = formData.living    || {};
  const hasSpouse = formData.family?.hasSpouse === 'yes';

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

  const selfNet   = parseFloat(i1.netIncome || 0) || estNet(parseFloat(i1.grossIncome || 0));
  const spouseNet = hasSpouse
    ? (parseFloat(i2.netIncome || 0) || estNet(parseFloat(i2.grossIncome || 0)))
    : 0;
  const totalNet  = selfNet + spouseNet;

  const housingY  = parseFloat(hw.monthlyCost   || 0) * 12;
  const insY      = ins.monthlyPremium
    ? parseFloat(ins.monthlyPremium) / 10000 * 12
    : parseFloat(ins.annualPremium || 0);
  const savingY   = (parseFloat(as.monthlySaving || 0) + parseFloat(as.dcMonthly || 0)) * 12;
  const eduY      = parseFloat(lv.currentEduAnnual || 0);
  const otherY    = parseFloat(lv.otherAnnual       || 0);
  const extraSavY = parseFloat(lv.extraSaving        || 0);

  return totalNet - housingY - insY - savingY - eduY - otherY - extraSavY;
}

/**
 * 逆算結果の表示を更新する（リアルタイム更新）
 */
function updateLivingReverse() {
  const resultArea = document.getElementById('lc-result-area');
  if (!resultArea) return;

  const calcExpense = calcLivingReverse();
  const calcMonthly = calcExpense / 12;
  const isNegative  = calcExpense < 0;

  // 自動計算値保持 hidden input を更新（手動モードでない場合）
  const isManual = formData.living?.manualExpense === 'yes';
  if (!isManual) {
    const autoHidden = document.getElementById('liv-expense-auto');
    if (autoHidden) {
      autoHidden.value = isNegative ? '' : Math.round(calcExpense);
      setNestedValue(formData, 'living.annualExpense', autoHidden.value);
    }
  }

  if (isNegative) {
    resultArea.innerHTML = `
      <div class="alert alert-danger lc-warn-negative">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <strong>入力された支出・貯蓄額が手取り収入を上回っています。</strong><br>
          入力内容をご確認ください。（差額：${Math.abs(Math.round(calcExpense)).toLocaleString('ja-JP')} 万円）
        </div>
      </div>`;
  } else {
    resultArea.innerHTML = `
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
            <span class="lc-result-val" id="lc-monthly-result">${(Math.round(calcMonthly * 10) / 10).toLocaleString('ja-JP')} 万円</span>
          </div>
        </div>
        <p class="lc-result-note">年収と、住宅費・教育費・保険料・貯蓄額・臨時支出から現在の生活費を逆算しています。</p>
      </div>`;
  }
}

// =========================================================
// アプリケーション起動
// =========================================================
function init() {
  initTopScreen();
  initEvents();
  showScreen('top');
}

document.addEventListener('DOMContentLoaded', init);

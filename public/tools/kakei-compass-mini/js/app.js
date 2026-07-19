(function () {
  'use strict';

  const E = window.CompassEngine;
  const STORAGE_KEY = 'compass_plan_light_v1';
  const app = document.getElementById('app');
  const safeStorage = {
    get(key){ try { return window.localStorage.getItem(key); } catch (_) { return null; } },
    set(key,value){ try { window.localStorage.setItem(key,value); return true; } catch (_) { return false; } },
    remove(key){ try { window.localStorage.removeItem(key); } catch (_) {} }
  };
  const STEPS = [
    ['family', '家族'], ['income', '収入'], ['living', '生活費'], ['assets', '資産'],
    ['housing', '住まい'], ['other', '備え・予定'], ['review', '確認']
  ];

  let state = loadState() || E.defaultData();
  let currentStep = 0;
  let screen = 'landing';
  let lastResult = null;
  let resizeBound = false;

  function deepMerge(base, extra) {
    if (Array.isArray(extra)) return extra;
    if (!extra || typeof extra !== 'object') return extra === undefined ? base : extra;
    const out = Object.assign({}, base);
    Object.keys(extra).forEach((k) => {
      out[k] = extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k])
        ? deepMerge(base && base[k] || {}, extra[k])
        : extra[k];
    });
    return out;
  }

  function migrateState(raw) {
    if (!raw || typeof raw !== 'object') return raw;
    const copy = JSON.parse(JSON.stringify(raw));
    copy.living = copy.living || {};
    if ((copy.living.baseMonthly === undefined || copy.living.baseMonthly === '') && copy.living.baseAnnual !== undefined) {
      copy.living.baseMonthly = n(copy.living.baseAnnual) / 12;
    }
    delete copy.living.baseAnnual;
    copy.assets = copy.assets || {};
    const currentAge = n(copy.family && copy.family.selfAge, 35);
    if (copy.assets.investmentStartAge == null || copy.assets.investmentStartAge === '') copy.assets.investmentStartAge = currentAge;
    if (copy.assets.withdrawalStartAge == null || copy.assets.withdrawalStartAge === '') copy.assets.withdrawalStartAge = Math.max(n(copy.assets.investmentEndAge, 60) + 1, n(copy.income && copy.income.self && copy.income.self.retireAge, 65));
    if (!['lump','equal','annuity'].includes(copy.assets.withdrawalMethod)) copy.assets.withdrawalMethod = 'annuity';
    if (!copy.assets.withdrawalYears) copy.assets.withdrawalYears = 20;
    copy.assets.autoEmergencyWithdrawal = true;
    copy.meta = copy.meta || {};
    copy.meta.version = E.VERSION;
    return copy;
  }

  function loadState() {
    try {
      const raw = safeStorage.get(STORAGE_KEY);
      if (!raw) return null;
      return deepMerge(E.defaultData(), migrateState(JSON.parse(raw)));
    } catch (_) { return null; }
  }

  function saveState() {
    state.meta.version = E.VERSION;
    safeStorage.set(STORAGE_KEY, JSON.stringify(state));
  }

  function clearState() {
    safeStorage.remove(STORAGE_KEY);
    state = E.defaultData();
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function n(value, fallback = 0) {
    const x = Number(value);
    return Number.isFinite(x) ? x : fallback;
  }

  function setPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    parts.forEach((p, i) => {
      const key = /^\d+$/.test(p) ? Number(p) : p;
      if (i === parts.length - 1) cur[key] = value;
      else {
        const nextIsArray = /^\d+$/.test(parts[i + 1]);
        if (cur[key] == null) cur[key] = nextIsArray ? [] : {};
        cur = cur[key];
      }
    });
  }

  function formatWan(value, digits = 0) {
    const x = n(value);
    return `${x.toLocaleString('ja-JP', { maximumFractionDigits: digits })}万円`;
  }

  function formatPct(value) {
    return value == null ? '—' : `${n(value).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}%`;
  }

  function bool(value) { return value === true || value === 'yes'; }
  function checked(value) { return bool(value) ? 'checked' : ''; }
  function selected(value, target) { return String(value) === String(target) ? 'selected' : ''; }

  function field(path, label, value, unit, opts = {}) {
    const type = opts.type || 'number';
    const min = opts.min != null ? `min="${opts.min}"` : '';
    const max = opts.max != null ? `max="${opts.max}"` : '';
    const step = opts.step != null ? `step="${opts.step}"` : '';
    const placeholder = opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : '';
    return `<div class="form-group ${opts.full ? 'full' : ''}">
      <label for="${esc(path)}">${label}${opts.optional ? ' <span class="muted small">任意</span>' : ''}</label>
      <div class="field"><input id="${esc(path)}" type="${type}" data-path="${esc(path)}" value="${esc(value)}" ${min} ${max} ${step} ${placeholder}>${unit ? `<span class="unit">${unit}</span>` : ''}</div>
      ${opts.hint ? `<div class="hint">${opts.hint}</div>` : ''}
    </div>`;
  }

  function inlineField(path, value, unit, opts = {}) {
    const min = opts.min != null ? `min="${opts.min}"` : '';
    const max = opts.max != null ? `max="${opts.max}"` : '';
    const step = opts.step != null ? `step="${opts.step}"` : '';
    return `<span class="inline-field"><input aria-label="${esc(opts.label || path)}" type="number" data-path="${esc(path)}" value="${esc(value)}" ${min} ${max} ${step}><span>${esc(unit)}</span></span>`;
  }

  function selectField(path, label, value, options, opts = {}) {
    return `<div class="form-group ${opts.full ? 'full' : ''}">
      <label for="${esc(path)}">${label}</label>
      <div class="field"><select id="${esc(path)}" data-path="${esc(path)}">
        ${options.map(([v, t]) => `<option value="${esc(v)}" ${selected(value, v)}>${esc(t)}</option>`).join('')}
      </select></div>${opts.hint ? `<div class="hint">${opts.hint}</div>` : ''}
    </div>`;
  }

  function toggleField(path, label, value, hint = '') {
    return `<div class="form-group full"><label class="choice"><input type="checkbox" data-path="${esc(path)}" ${checked(value)}> ${label}</label>${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
  }

  function header() {
    return `<header class="app-header"><div class="container header-inner">
      <button class="brand" data-action="landing" aria-label="トップへ"><img src="assets/compass-logo.png" alt=""><span>COMPASS PLAN <small>light</small></span></button>
      <div class="header-actions">
        <button class="btn btn-ghost btn-small hide-mobile" data-action="save-json">入力データ保存</button>
        <button class="btn btn-ghost btn-small" data-action="reset">リセット</button>
      </div>
    </div></header>`;
  }

  function landing() {
    const hasSaved = !!safeStorage.get(STORAGE_KEY);
    return `<section class="hero"><div class="container hero-inner">
      <div>
        <div class="brand-kicker">LIFE COMPASS LAB</div>
        <h1>COMPASS PLAN<span>LIGHT</span></h1>
        <p class="hero-copy">家計の数字を並べるだけではなく、住宅・教育・働き方などの選択が、将来のお金にどう影響するかを確認するためのライト版ライフプランツールです。</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-action="new">新しく作成する →</button>
          ${hasSaved ? '<button class="btn btn-light" data-action="resume">前回の続きから</button>' : ''}
          <button class="btn btn-outline" style="color:white;border-color:rgba(255,255,255,.45)" data-action="sample">サンプルを見る</button>
        </div>
        <div class="hero-note">入力内容はこの端末内にのみ保存され、外部には送信されません。</div>
      </div>
      <div class="hero-mark"><img class="hero-logo" src="assets/compass-logo.png" alt="COMPASS PLANのコンパス"></div>
    </div></section>`;
  }

  function sidebar() {
    const pct = ((currentStep + 1) / STEPS.length) * 100;
    return `<aside class="sidebar">
      <div class="progress-wrap"><div class="progress-meta"><span>入力の進捗</span><strong>${currentStep + 1} / ${STEPS.length}</strong></div><div class="progress"><span style="width:${pct}%"></span></div></div>
      <nav class="step-nav">${STEPS.map(([id, label], i) => `<button data-action="goto" data-step="${i}" class="${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}"><span class="num">${i < currentStep ? '✓' : i + 1}</span><span class="text">${label}</span></button>`).join('')}</nav>
      <div class="sidebar-note">細かく分からない項目は概算で構いません。結果画面に、概算箇所と前提条件を明示します。</div>
    </aside>`;
  }

  function familyStep() {
    const f = state.family;
    const children = Array.isArray(f.children) ? f.children : [];
    return `<div class="page-head"><div class="eyebrow">Step 1</div><h2>家族とこれからの予定</h2><p>現在の家族だけでなく、将来予定しているお子さまも登録できます。</p></div>
      <section class="section"><h3>大人の年齢</h3><div class="form-grid">
        ${field('family.selfAge', '本人の年齢', f.selfAge, '歳', {min:18,max:85})}
        <div class="form-group"><label>配偶者</label><div class="choice-row">
          <label class="choice"><input type="radio" name="spouse" data-path="family.hasSpouse" value="yes" ${bool(f.hasSpouse) ? 'checked' : ''}> いる</label>
          <label class="choice"><input type="radio" name="spouse" data-path="family.hasSpouse" value="no" ${!bool(f.hasSpouse) ? 'checked' : ''}> いない</label>
        </div></div>
        ${bool(f.hasSpouse) ? field('family.spouseAge','配偶者の年齢',f.spouseAge,'歳',{min:18,max:85}) : ''}
      </div></section>
      <section class="section"><h3>お子さま</h3>
        <div class="info-box"><strong>計算上の扱い：</strong>現在いるお子さまの生活費は、入力する現在の基本生活費に含まれる前提です。将来は成長段階との差分だけを加減するため、初年度から二重計上しません。</div>
        <div class="repeat-list" style="margin-top:14px">${children.map((c,i)=>childCard(c,i)).join('')}</div>
        <button class="add-btn" data-action="add-child">＋ お子さまを追加</button>
      </section>`;
  }

  function childCard(c, i) {
    const planned = c.timing === 'planned';
    return `<div class="repeat-card">
      <div class="repeat-card-head"><div class="repeat-title">${esc(c.label || `第${i+1}子`)}</div><button class="icon-btn" data-action="remove-child" data-index="${i}" title="削除">×</button></div>
      <div class="form-grid three">
        <div class="form-group"><label>登録区分</label><div class="choice-row">
          <label class="choice"><input type="radio" name="child-timing-${i}" data-path="family.children.${i}.timing" value="existing" ${!planned?'checked':''}> 現在いる</label>
          <label class="choice"><input type="radio" name="child-timing-${i}" data-path="family.children.${i}.timing" value="planned" ${planned?'checked':''}> 将来予定</label>
        </div></div>
        ${planned ? field(`family.children.${i}.yearsUntilBirth`,'誕生まで',c.yearsUntilBirth||1,'年後',{min:1,max:20}) : field(`family.children.${i}.age`,'現在の年齢',c.age||0,'歳',{min:0,max:25})}
        ${field(`family.children.${i}.currentEducation`,'現在の教育費',c.currentEducation||0,'万円/年',{min:0,max:1000,optional:true,hint:'現在と同じ学校段階にいる間は、この実額を優先します。'})}
        ${selectField(`family.children.${i}.finalEdu`,'最終学歴',c.finalEdu||'university',[["high","高校"],["vocational","専門学校"],["junior","短期大学"],["university","4年制大学"]])}
        ${selectField(`family.children.${i}.route`,'進学ルート',c.route||'public',[["public","すべて公立・国公立"],["universityPrivate","大学から私立"],["highPrivate","高校から私立"],["middlePrivate","中学から私立"],["private","幼稚園からすべて私立"]])}
        ${selectField(`family.children.${i}.away`,'大学等の通学',bool(c.away)?'yes':'no',[["no","自宅通学"],["yes","自宅外を想定"]],{hint:'自宅外は年48万円を概算加算します。'})}
      </div>
    </div>`;
  }

  function incomeSummaryHtml(key, baseAge) {
    const p = E.normalizePerson(state.income[key], baseAge);
    const ages = [baseAge, p.growthUntilAge, ...p.changes.map(c=>c.age), Math.max(baseAge, p.retireAge - 1)];
    const unique = [...new Set(ages.filter(a=>a>=baseAge && a<p.retireAge))].sort((a,b)=>a-b).slice(0,7);
    return unique.map(age=>`<span><b>${age}歳</b>${formatWan(E.grossAtAge(p,baseAge,age))}</span>`).join('');
  }

  function personSection(key, title, baseAge) {
    const p = state.income[key];
    p.changes = Array.isArray(p.changes) ? p.changes.sort((a,b)=>n(a.age)-n(b.age)) : [];
    const changes = p.changes;
    return `<section class="section person-section"><h3>${title}</h3>
      <div class="subsection-card"><div class="subsection-head"><div><strong>現在の収入</strong><p>現在の額面と、分かる場合は実際の手取りを入力します。</p></div></div>
        <div class="form-grid three">
          ${field(`income.${key}.gross`,'現在の額面年収',p.gross,'万円',{min:0,max:10000})}
          ${field(`income.${key}.net`,'現在の手取り年収',p.net,'万円',{min:0,max:10000,optional:true,hint:'未入力の場合は連続性のある概算式で推計します。'})}
          ${field(`income.${key}.otherAnnual`,'その他の年収',p.otherAnnual||0,'万円/年',{min:0,max:10000,optional:true})}
          ${field(`income.${key}.otherIncomeEndAge`,'その他収入の終了年齢',p.otherIncomeEndAge||p.retireAge||65,'歳',{min:baseAge,max:110,optional:true,hint:'家賃収入など退職後も続く場合は終了年齢を延ばしてください。'})}
        </div>
      </div>
      <div class="income-curve-card">
        <div class="subsection-head"><div><strong>基本の年収カーブ</strong><p>現在の年収を基準に、指定年齢まで毎年同じ率で変化させます。</p></div></div>
        <div class="curve-sentence">現在の年収から、毎年 ${inlineField(`income.${key}.growthRate`,p.growthRate||0,'％',{min:-20,max:20,step:.1,label:'毎年の年収変化率'})} で ${inlineField(`income.${key}.growthUntilAge`,p.growthUntilAge||baseAge,'歳まで',{min:baseAge,max:85,label:'年収変化を続ける年齢'})} 変化</div>
        <div class="income-preview"><canvas id="income-chart-${key}"></canvas></div>
        <div class="income-summary" id="income-summary-${key}">${incomeSummaryHtml(key,baseAge)}</div>
      </div>
      <div class="subsection-card income-overrides">
        <div class="subsection-head"><div><strong>年齢別の上書き</strong><p>役職定年・転職・再雇用など、特定の年齢から年収額を切り替えます。</p></div><span class="count-badge">${changes.length}件</span></div>
        <div class="repeat-list">${changes.map((c,i)=>`<div class="income-change-row">
          <div class="change-sentence">${inlineField(`income.${key}.changes.${i}.age`,c.age,'歳から',{min:baseAge+1,max:85,label:'変更年齢'})} 年収を ${inlineField(`income.${key}.changes.${i}.gross`,c.gross,'万円',{min:0,max:10000,label:'変更後の額面年収'})} に変更</div>
          <button class="icon-btn" data-action="remove-income-change" data-person="${key}" data-index="${i}" title="削除">×</button>
        </div>`).join('')}</div>
        <button class="add-btn" data-action="add-income-change" data-person="${key}">＋ 年収の変更を追加</button>
        <div class="hint">上書き年齢では指定額を優先し、その後は「基本の年収カーブ」の終了年齢まで同じ変化率を適用します。</div>
      </div>
      <div class="subsection-card"><div class="subsection-head"><div><strong>退職・年金</strong><p>就業終了後は給与を0円とし、設定した年齢から年金を計上します。</p></div></div>
        <div class="form-grid three">
          ${field(`income.${key}.retireAge`,'就業終了年齢',p.retireAge||65,'歳',{min:baseAge+1,max:85})}
          ${field(`income.${key}.pensionStartAge`,'年金受給開始',p.pensionStartAge||65,'歳',{min:60,max:75})}
          ${field(`income.${key}.pensionMonthly65`,'65歳基準の年金月額',p.pensionMonthly65||0,'万円/月',{min:0,max:100,step:.1,optional:true})}
          ${field(`income.${key}.severance`,'退職金',p.severance||0,'万円',{min:0,max:50000,optional:true,hint:'税引前の概算。税金は本ライト版では未反映です。'})}
        </div>
      </div>
    </section>`;
  }

  function incomeStep() {
    return `<div class="page-head"><div class="eyebrow">Step 2</div><h2>働き方と収入の変化</h2><p>基本カーブを決めてから、役職定年・転職・再雇用などを年齢別に上書きします。</p></div>
      ${personSection('self','本人の収入',n(state.family.selfAge,35))}
      ${bool(state.family.hasSpouse) ? personSection('spouse','配偶者の収入',n(state.family.spouseAge,33)) : ''}
      <div class="info-box"><strong>手取り推計：</strong>額面年収帯の境界で手取りが逆転しないよう、複数の基準点を線形補間しています。実際の税・社会保険は家族構成等で異なるため、手取り実額の入力を推奨します。</div>`;
  }

  function livingStep() {
    const l = state.living, m = state.meta;
    const monthly = n(l.baseMonthly,0);
    return `<div class="page-head"><div class="eyebrow">Step 3</div><h2>生活費と物価上昇</h2><p>住宅費・教育費・保険料・積立を除いた、現在の基本生活費を月額で入力します。</p></div>
      <section class="section"><h3>現在の支出</h3><div class="form-grid">
        ${field('living.baseMonthly','毎月の基本生活費',monthly,'万円/月',{min:0,max:300,step:.1,hint:'食費・光熱費・通信費・日用品・小遣い等。現在いるお子さまの日常生活費を含めます。'})}
        ${field('living.otherAnnual','その他の年間支出',l.otherAnnual||0,'万円/年',{min:0,max:3000,hint:'旅行、車検、冠婚葬祭など、毎月の生活費に含めない支出。'})}
        ${field('meta.inflationRate','物価上昇率',m.inflationRate,'%/年',{min:-3,max:10,step:.1,hint:'基本生活費・教育費・住居維持費などに反映します。'})}
        ${field('meta.horizonAge','計算終了年齢',m.horizonAge||90,'歳',{min:n(state.family.selfAge,35)+1,max:110})}
        ${toggleField('living.inflateOther','その他の年間支出にも物価上昇を反映',l.inflateOther)}
        ${toggleField('living.childLivingAdjust','子どもの成長・独立による生活費変化を反映',l.childLivingAdjust,'現在いる子は現在との差分だけ、将来予定の子は誕生後の概算額を加算します。')}
      </div>
      <div class="conversion-strip"><span>月額</span><strong>${formatWan(monthly,1)}</strong><span>× 12か月 ＝ 年間</span><strong>${formatWan(monthly*12,1)}</strong></div></section>
      <section class="section"><h3>教育費の前提</h3><div class="info-box">幼稚園から高校までは文部科学省「令和5年度 子供の学習費調査（2026年訂正後）」の学習費総額を年額化。大学はJASSO調査を基に、国公立約60万円・私立約131万円、自宅外は年48万円を概算加算しています。実際の進学先や授業料支援制度は個別に異なります。</div></section>`;
  }

  function investmentPreviewMarkup() {
    const p = E.investmentPlanPreview(state.assets, n(state.family.selfAge, 35));
    const methodLabel = p.method === 'lump' ? '一括受取' : p.method === 'equal' ? '分割受取（運用なし）' : '分割受取（運用継続）';
    return `<div class="mortgage-preview-grid investment-preview-grid">
      <div><span>取崩し開始時の想定残高</span><strong>${formatWan(p.projectedBalance,1)}</strong></div>
      <div><span>受取方法</span><strong>${methodLabel}</strong></div>
      <div><span>想定年間受取額</span><strong>${formatWan(p.annualWithdrawal,1)}</strong></div>
      <div><span>想定月額</span><strong>${formatWan(p.monthlyWithdrawal,2)}</strong></div>
      <div><span>受取開始</span><strong>${p.withdrawalStartAge}歳</strong></div>
      <div><span>想定終了</span><strong>${p.endAge}歳ごろ</strong></div>
    </div><div class="source-note">現在残高・積立期間・想定利回りからの概算です。実際の運用成果は変動します。現預金が不足した場合は、設定時期より前でもNISA等から必要額だけ臨時に取り崩します。</div>`;
  }

  function assetsStep() {
    const a=state.assets;
    const currentAge=n(state.family.selfAge,35);
    const split=a.withdrawalMethod!=='lump';
    return `<div class="page-head"><div class="eyebrow">Step 4</div><h2>現在の資産と運用計画</h2><p>積み立てる期間だけでなく、いつ・どのように受け取るかまで設定します。</p></div>
      <section class="section"><h3>現在の残高</h3><div class="form-grid three">
        ${field('assets.cash','現預金',a.cash,'万円',{min:0,max:100000})}
        ${field('assets.investment','NISA等の運用資産',a.investment,'万円',{min:0,max:100000})}
        ${field('assets.retirement','DC・iDeCo等',a.retirement,'万円',{min:0,max:100000})}
      </div></section>
      <section class="section"><h3>積立・運用</h3><div class="form-grid three">
        ${field('assets.investReturn','運用資産の想定利回り',a.investReturn,'%/年',{min:-20,max:20,step:.1})}
        ${field('assets.monthlyInvestment','手取りからの積立',a.monthlyInvestment,'万円/月',{min:0,max:300,step:.1,hint:'NISA等。積立分は現預金から運用資産への移転として処理します。'})}
        ${field('assets.investmentStartAge','積立開始年齢',a.investmentStartAge,'歳',{min:currentAge,max:90})}
        ${field('assets.investmentEndAge','積立終了年齢',a.investmentEndAge,'歳',{min:currentAge,max:90})}
      </div></section>
      <section class="section"><h3>受取・取り崩し</h3><div class="form-grid three">
        ${field('assets.withdrawalStartAge','取り崩し開始年齢',a.withdrawalStartAge,'歳',{min:currentAge+1,max:110,hint:'積立終了後の年齢を設定してください。'})}
        ${selectField('assets.withdrawalMethod','受取方法',a.withdrawalMethod||'annuity',[["lump","一括で受け取る"],["equal","分割して受け取る（運用なし）"],["annuity","運用しながら分割して受け取る"]])}
        ${split?field('assets.withdrawalYears','受取期間',a.withdrawalYears||20,'年',{min:1,max:50,hint:'開始年を1年目として、指定年数で残高を取り崩します。'}):''}
      </div><div class="mortgage-preview" id="investment-preview">${investmentPreviewMarkup()}</div></section>
      <section class="section"><h3>DC・iDeCo等</h3><div class="form-grid three">
        ${field('assets.retirementReturn','DC等の想定利回り',a.retirementReturn,'%/年',{min:-20,max:20,step:.1})}
        ${field('assets.monthlyRetirement','DC・iDeCo等の積立',a.monthlyRetirement,'万円/月',{min:0,max:300,step:.1,hint:'入力する手取り年収が、この拠出前の金額であることを確認してください。'})}
        ${field('assets.retirementContributionEndAge','DC等の積立終了',a.retirementContributionEndAge,'歳',{min:currentAge,max:75})}
        ${field('assets.retirementReceiveAge','DC等の受取年齢',a.retirementReceiveAge,'歳',{min:55,max:75,hint:'受取年に全額を現預金へ移す簡易計算です。税金は未反映です。'})}
      </div></section>
      <div class="info-box"><strong>資金不足時の扱い：</strong>家計赤字で現預金が不足した場合は、NISA等の換金可能な運用資産から必要額だけ自動で補填します。NISA等も使い切った後に初めて、赤い「資金不足」として表示します。DC・iDeCo等は設定した受取年齢までは補填に使いません。</div>`;
  }

  function mortgagePreviewMarkup() {
    const h = state.housing;
    if (!bool(h.purchasePlan)) return '';
    const p = E.mortgagePreview(h, h.buyAge);
    return `<div class="mortgage-preview-grid">
      <div><span>借入額</span><strong>${formatWan(p.principal,1)}</strong></div>
      <div><span>毎月返済額</span><strong>${formatWan(p.monthlyPayment,2)}</strong></div>
      <div><span>年間返済額</span><strong>${formatWan(p.annualPayment,1)}</strong></div>
      <div><span>総返済額</span><strong>${formatWan(p.totalPayment,1)}</strong></div>
      <div><span>うち利息</span><strong>${formatWan(p.totalInterest,1)}</strong></div>
      <div><span>購入時の現金支出</span><strong>${formatWan(p.upfront,1)}</strong></div>
      <div><span>完済時期</span><strong>${p.completionAge}歳ごろ</strong></div>
    </div><div class="source-note">元利均等返済・ボーナス返済なしの概算。総返済額には購入後の維持費を含みません。</div>`;
  }

  function housingStep() {
    const h=state.housing;
    return `<div class="page-head"><div class="eyebrow">Step 5</div><h2>現在の住まいと購入計画</h2><p>購入前の住居費、購入時の初期費用、ローン、購入後の維持費を分けて計算します。</p></div>
      <section class="section"><h3>現在の住居費</h3><div class="form-grid three">
        ${selectField('housing.currentType','現在の住まい',h.currentType||'rent',[["rent","賃貸"],["owner","持ち家"],["family","実家・社宅等"]])}
        ${field('housing.monthlyCost','現在の月額住居費',h.monthlyCost,'万円/月',{min:0,max:300,step:.1,hint:'家賃または住宅ローン・管理費等の合計。'})}
        ${field('housing.currentCostEndAge','現在の住居費の終了年齢',h.currentCostEndAge||99,'歳',{min:n(state.family.selfAge,35),max:110,hint:'賃貸を継続する場合は99歳など。購入する場合は購入年から自動停止します。'})}
        ${field('housing.currentAnnualAfterEnd','終了後の年間維持費',h.currentAnnualAfterEnd||0,'万円/年',{min:0,max:1000,hint:'持ち家のローン完済後に残る固定資産税・管理費・修繕費等。賃貸は0で構いません。'})}
      </div></section>
      <section class="section"><h3>住宅購入</h3><div class="form-grid">
        ${toggleField('housing.purchasePlan','住宅購入を予定している',h.purchasePlan)}
      </div>
      ${bool(h.purchasePlan) ? `<div class="form-grid three" style="margin-top:16px">
        ${field('housing.buyAge','購入年齢',h.buyAge,'歳',{min:n(state.family.selfAge,35)+1,max:85})}
        ${field('housing.price','物件価格',h.price,'万円',{min:0,max:100000})}
        ${field('housing.downPayment','頭金',h.downPayment,'万円',{min:0,max:100000})}
        ${field('housing.miscRate','購入諸費用',h.miscRate,'%',{min:0,max:20,step:.1})}
        ${selectField('housing.miscInLoan','諸費用の扱い',bool(h.miscInLoan)?'yes':'no',[["no","現金で支払う"],["yes","ローンに含める"]])}
        ${field('housing.loanTerm','返済期間',h.loanTerm,'年',{min:1,max:50})}
        ${field('housing.interestRate','借入金利',h.interestRate,'%/年',{min:0,max:15,step:.01})}
        ${field('housing.annualMaintenance','固定資産税・維持費',h.annualMaintenance,'万円/年',{min:0,max:1000,hint:'管理費・修繕積立金・固定資産税・修繕費等の概算。物価上昇を反映します。'})}
      </div><div class="mortgage-preview" id="mortgage-preview">${mortgagePreviewMarkup()}</div>` : ''}</section>
      <div class="info-box"><strong>年次の扱い：</strong>「40歳で購入」は40歳になる年の年初に購入すると仮定します。その年は現在の家賃を計上せず、初期費用・ローン返済・維持費を計上します。住宅の資産価値は金融資産に含めません。</div>`;
  }

  function otherStep() {
    const ins=state.insurance, events=Array.isArray(state.events)?state.events:[];
    return `<div class="page-head"><div class="eyebrow">Step 6</div><h2>保険料とライフイベント</h2><p>自動的に「退職後30％」などとはせず、実際の払込終了年齢を設定します。</p></div>
      <section class="section"><h3>保険料</h3><div class="form-grid">
        ${field('insurance.annualPremium','年間保険料',ins.annualPremium,'万円/年',{min:0,max:2000})}
        ${field('insurance.premiumEndAge','払込終了年齢',ins.premiumEndAge,'歳',{min:n(state.family.selfAge,35),max:100,hint:'払込済みの場合は年間保険料を0にしてください。'})}
      </div></section>
      <section class="section"><h3>一時的な収入・支出</h3><div class="hint" style="margin-bottom:12px">車の購入、リフォーム、贈与、相続、旅行などを本人年齢で追加できます。</div>
        <div class="repeat-list">${events.map((ev,i)=>eventCard(ev,i)).join('')}</div>
        <button class="add-btn" data-action="add-event">＋ ライフイベントを追加</button>
      </section>`;
  }

  function eventCard(ev,i){
    return `<div class="repeat-card"><div class="repeat-card-head"><div class="repeat-title">${esc(ev.label||`イベント${i+1}`)}</div><button class="icon-btn" data-action="remove-event" data-index="${i}">×</button></div>
      <div class="form-grid three">
        ${field(`events.${i}.label`,'名称',ev.label||'', '', {type:'text',placeholder:'例：車の買い替え'})}
        ${field(`events.${i}.ageSelf`,'本人年齢',ev.ageSelf||n(state.family.selfAge,35)+5,'歳',{min:n(state.family.selfAge,35)+1,max:110})}
        ${selectField(`events.${i}.kind`,'区分',ev.kind||'expense',[["expense","支出"],["income","収入"]])}
        ${field(`events.${i}.amount`,'金額',ev.amount||0,'万円',{min:0,max:100000})}
        ${selectField(`events.${i}.inflate`,'物価上昇',bool(ev.inflate)?'yes':'no',[["no","現在価値のまま"],["yes","物価上昇を反映"]])}
      </div></div>`;
  }

  function reviewStep() {
    const f=state.family, l=state.living, a=state.assets, h=state.housing, i=state.insurance;
    const childCount=(f.children||[]).length;
    const incomeChanges=(state.income.self.changes||[]).length + (bool(f.hasSpouse)?(state.income.spouse.changes||[]).length:0);
    return `<div class="page-head"><div class="eyebrow">Step 7</div><h2>入力内容の確認</h2><p>この内容で、現在時点の資産を0年目として将来の年次キャッシュフローを計算します。</p></div>
      <div class="review-grid">
        ${reviewCard('家族',[['本人',`${f.selfAge}歳`],['配偶者',bool(f.hasSpouse)?`${f.spouseAge}歳`:'なし'],['子ども',`${childCount}人`]])}
        ${reviewCard('収入',[['本人年収',formatWan(state.income.self.gross)],['本人退職',`${state.income.self.retireAge}歳`],['収入変更点',`${incomeChanges}件`]])}
        ${reviewCard('生活費',[['毎月の基本生活費',`${formatWan(l.baseMonthly,1)}/月`],['年間換算',formatWan(n(l.baseMonthly)*12,1)],['その他支出',formatWan(l.otherAnnual)],['物価上昇率',`${state.meta.inflationRate}%`]])}
        ${reviewCard('資産',[['現預金',formatWan(a.cash)],['運用資産',formatWan(a.investment)],['積立期間',`${a.investmentStartAge}〜${a.investmentEndAge}歳`],['取崩し',`${a.withdrawalStartAge}歳から`],['DC等',formatWan(a.retirement)]])}
        ${reviewCard('住まい',[['現在住居費',`${h.monthlyCost}万円/月`],['購入予定',bool(h.purchasePlan)?`${h.buyAge}歳・${formatWan(h.price)}`:'なし'],['維持費',bool(h.purchasePlan)?formatWan(h.annualMaintenance):'—']])}
        ${reviewCard('備え・予定',[['年間保険料',formatWan(i.annualPremium)],['払込終了',`${i.premiumEndAge}歳`],['イベント',`${(state.events||[]).length}件`]])}
      </div>
      <div class="warning-box" style="margin-top:18px"><strong>本ツールの範囲：</strong>将来の方向性を確認するための概算です。所得税・社会保険料・退職所得税、住宅ローン控除、児童手当、教育無償化、住宅資産価値などは個別計算していません。結果画面では、資産移転と家計支出を分け、毎年の検算差額を表示します。</div>`;
  }

  function reviewCard(title, pairs){
    return `<div class="review-card"><h4>${title}</h4><dl class="review-list">${pairs.map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></div>`;
  }

  function stepContent() {
    switch (STEPS[currentStep][0]) {
      case 'family': return familyStep();
      case 'income': return incomeStep();
      case 'living': return livingStep();
      case 'assets': return assetsStep();
      case 'housing': return housingStep();
      case 'other': return otherStep();
      default: return reviewStep();
    }
  }

  function editor() {
    return `${header()}<main class="app-main"><div class="container shell">${sidebar()}<section class="panel">${stepContent()}
      <div id="form-error" class="warning-box hidden" style="margin-top:18px"></div>
      <div class="form-actions"><button class="btn btn-ghost" data-action="back" ${currentStep===0?'disabled':''}>← 戻る</button><div class="right">
        ${currentStep===STEPS.length-1?'<button class="btn btn-primary" data-action="calculate">結果を見る →</button>':'<button class="btn btn-primary" data-action="next">次へ →</button>'}
      </div></div>
    </section></div></main>`;
  }

  function resultStatus(r) {
    const m=r.metrics;
    if(m.firstLiquidShortfallAge!=null){
      const later=m.firstTotalShortfallAge!=null?` ／ ${m.firstTotalShortfallAge}歳で純資産マイナス`:'';
      return [`${m.firstLiquidShortfallAge}歳`,`利用可能資産が枯渇${later}`];
    }
    if(m.firstEmergencyWithdrawalAge!=null) return [`${m.firstEmergencyWithdrawalAge}歳`,'現預金不足による臨時取り崩し'];
    if(m.firstPlannedWithdrawalAge!=null) return [`${m.firstPlannedWithdrawalAge}歳`,'設定どおり計画的に取り崩し'];
    return ['なし',`${r.assumptions.horizonAge}歳まで取り崩しなし`];
  }

  function resultScreen() {
    const r = lastResult;
    const m = r.metrics;
    const [status,statusSub]=resultStatus(r);
    return `<section class="results-header"><div class="container">
      <div class="header-inner" style="height:auto"><div class="brand"><img src="assets/compass-logo.png" alt=""><span>COMPASS PLAN <small>light</small></span></div><div class="header-actions"><button class="btn btn-light btn-small" data-action="edit">入力を修正</button><button class="btn btn-primary btn-small" data-action="print">印刷・PDF</button></div></div>
      <div class="results-title"><div><div class="brand-kicker">YOUR FINANCIAL ROUTE</div><h1>将来のお金の見通し</h1><p>資産の増減だけでなく、積立から取り崩しまでの資金移動と、資産が不足する時期を確認します。</p></div></div>
    </div></section>
    <main class="results-main"><div class="container">
      <div class="metric-grid">
        ${metric('現在の家計収支',signedWan(r.current.annualBalance),`積立前 ／ 積立後の現金増減 ${signedWan(r.current.cashChange)}`)}
        ${metric('運用資産の出口',status,statusSub)}
        ${metric(`${state.income.self.retireAge}歳時の純金融資産`,formatWan(m.retirementAssets),'住宅資産価値は含まない')}
        ${metric(`${r.assumptions.horizonAge}歳時の純金融資産`,formatWan(m.finalAssets),m.finalCash<0?`未補填の資金不足 ${formatWan(m.finalCash)}`:'未補填の資金不足なし')}
      </div>
      <div class="result-layout"><div class="result-stack">
        <section class="result-panel"><div class="panel-title-row"><div><h2>金融資産の構成と推移</h2><p>積み上げ棒は資産の内訳、線は純金融資産の合計です。</p></div></div><div class="chart-wrap"><canvas id="asset-chart"></canvas></div><div class="legend"><span><i class="legend-block cash"></i>現預金</span><span><i class="legend-block investment"></i>NISA等</span><span><i class="legend-block retirement"></i>DC・iDeCo等</span><span><i class="legend-block negative-cash"></i>資金不足</span><span><i class="legend-line total"></i>純金融資産</span></div><div class="source-note">現預金が不足した場合はNISA等から必要額を補填します。0円より下の赤い棒は、現預金と換金可能な運用資産を使い切っても補えない資金不足です。DC・iDeCo等は受取年齢まで使えないため、受取前は灰色の残高と赤い不足が同時に表示される場合があります。</div></section>
        <section class="result-panel"><div class="panel-title-row"><div><h2>家計収支の推移</h2><p>収入－生活費・教育費・住宅費等。NISAやDCへの積立は資産移転のため含めません。</p></div></div><div class="chart-wrap" style="height:300px"><canvas id="balance-chart"></canvas></div><div class="legend"><span><i class="legend-block positive"></i>家計黒字</span><span><i class="legend-block negative-cash"></i>家計赤字</span></div></section>
        <section class="result-panel"><div class="table-tools"><div><h2 style="margin:0">年次キャッシュフロー</h2><p class="table-sub">期首から期末までの動きを追い、右端で毎年検算します。</p></div><div class="table-options"><label class="choice"><input type="checkbox" id="show-detail-rows"> 内訳を表示</label><label class="choice"><input type="checkbox" id="show-all-rows"> 全年表示</label></div></div>
          <div class="reconcile-formula"><strong>検算式</strong><span>期末純金融資産 ＝ 期首純金融資産 ＋ 収入 − 支出 ＋ 運用収益</span><span class="ok-badge">最大差額 ${formatWan(m.maxReconciliationGap,3)}</span></div>
          <div class="table-scroll" id="cf-table"></div><div class="source-note">金額単位：万円。現在年齢の行は資産スナップショットで、年間収支は翌年齢の行から反映します。</div></section>
      </div><aside class="result-stack">
        <section class="result-panel"><h2>確認ポイント</h2><div class="alert-list">${alertsHtml(r)}</div></section>
        <section class="result-panel"><h2>計算前提</h2><div class="assumption-list">
          <div>物価上昇率：<strong>${r.assumptions.inflationRatePct}%</strong></div>
          <div>運用利回り：<strong>${r.assumptions.investReturnPct}%</strong> ／ DC等：<strong>${r.assumptions.retirementReturnPct}%</strong></div>
          <div>${esc(r.assumptions.timing)}</div><div>${esc(r.assumptions.withdrawal)}</div><div>${esc(r.assumptions.assetScope)}</div><div>${esc(r.assumptions.reconciliation)}</div><div>${esc(r.assumptions.taxScope)}</div>
          ${m.housingBurdenPct!=null?`<div>購入年の住居費負担：<strong>${formatPct(m.housingBurdenPct)}</strong></div>`:''}
          ${m.mortgageTotalInterest?`<div>住宅ローン利息総額：<strong>${formatWan(m.mortgageTotalInterest)}</strong></div>`:''}
        </div></section>
        <section class="result-panel"><h2>資料の基準</h2><div class="small muted">教育費は文部科学省「令和5年度 子供の学習費調査」訂正後資料、大学等はJASSO「令和4年度 学生生活調査」を参考にした概算です。年金の繰上げは原則月0.4%、繰下げは月0.7%で調整しています。</div></section>
        <button class="btn btn-outline btn-wide no-print" data-action="edit">← 入力を修正する</button>
      </aside></div>
    </div></main>`;
  }

  function metric(name,value,sub){ return `<div class="metric"><div class="name">${name}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`; }
  function signedWan(v){ const x=n(v); return `${x>=0?'+':'−'}${formatWan(Math.abs(x))}`; }
  function alertsHtml(r){
    if (!r.warnings.length) return `<div class="alert good"><strong>大きな資金不足は見つかりませんでした</strong><p>前提を変えた場合の影響も比較し、余裕資金の使い方を検討してください。</p></div>`;
    return r.warnings.map(w=>`<div class="alert ${w.level}"><strong>${esc(w.title)}</strong><p>${esc(w.detail)}</p></div>`).join('');
  }

  function render() {
    app.innerHTML = screen === 'landing' ? landing() : screen === 'editor' ? editor() : resultScreen();
    bindEvents();
    requestAnimationFrame(() => {
      if (screen === 'results') {
        drawAssetChart(document.getElementById('asset-chart'), lastResult.rows);
        drawBalanceChart(document.getElementById('balance-chart'), lastResult.rows.filter(r=>!r.isSnapshot));
        renderTable(false,false);
      } else if (screen === 'editor' && STEPS[currentStep][0] === 'income') {
        updateIncomePreview('self');
        if(bool(state.family.hasSpouse)) updateIncomePreview('spouse');
      } else if (screen === 'editor' && STEPS[currentStep][0] === 'housing') {
        updateMortgagePreview();
      } else if (screen === 'editor' && STEPS[currentStep][0] === 'assets') {
        updateInvestmentPreview();
      }
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function bindEvents() {
    app.querySelectorAll('[data-path]').forEach((el) => {
      el.addEventListener('change', onFieldChange);
      if (el.tagName === 'INPUT' && !['checkbox','radio'].includes(el.type)) el.addEventListener('input', onFieldChange);
    });
    app.querySelectorAll('[data-action]').forEach((el) => el.addEventListener('click', onAction));
    const allRows = document.getElementById('show-all-rows');
    const detailRows = document.getElementById('show-detail-rows');
    const refreshTable=()=>renderTable(allRows&&allRows.checked,detailRows&&detailRows.checked);
    if (allRows) allRows.addEventListener('change',refreshTable);
    if (detailRows) detailRows.addEventListener('change',refreshTable);
    if(!resizeBound){window.addEventListener('resize',()=>requestAnimationFrame(redrawVisibleCharts));resizeBound=true;}
  }

  function onFieldChange(e) {
    const el = e.currentTarget;
    const path = el.dataset.path;
    let value;
    if (el.type === 'checkbox') value = el.checked;
    else if (el.type === 'radio') {
      if (!el.checked) return;
      value = el.value === 'yes' ? true : el.value === 'no' ? false : el.value;
    } else if (el.type === 'number') value = el.value === '' ? '' : Number(el.value);
    else if (el.tagName === 'SELECT' && (el.value === 'yes' || el.value === 'no')) value = el.value === 'yes';
    else value = el.value;
    setPath(state, path, value);
    if(path.includes('.changes.') && path.endsWith('.age') && e.type==='change'){
      const key=path.includes('income.spouse')?'spouse':'self';
      state.income[key].changes.sort((a,b)=>n(a.age)-n(b.age));
      saveState();render();return;
    }
    saveState();
    if (['family.hasSpouse','housing.purchasePlan','assets.withdrawalMethod'].includes(path) || path.includes('.timing')) { render(); return; }
    if(path.startsWith('income.self')) updateIncomePreview('self');
    if(path.startsWith('income.spouse')) updateIncomePreview('spouse');
    if(path.startsWith('housing.')) updateMortgagePreview();
    if(path.startsWith('assets.')) updateInvestmentPreview();
    if(path==='living.baseMonthly') updateLivingConversion();
  }

  function onAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    if (action === 'new') { state=E.defaultData(); saveState(); currentStep=0; screen='editor'; render(); }
    else if (action === 'resume') { state=loadState()||E.defaultData(); currentStep=0; screen='editor'; render(); }
    else if (action === 'sample') { state=sampleData(); saveState(); lastResult=E.project(state); screen='results'; render(); }
    else if (action === 'landing') { screen='landing'; render(); }
    else if (action === 'back') { if(currentStep>0){currentStep--;render();} }
    else if (action === 'next') { if(validateCurrent()){currentStep=Math.min(STEPS.length-1,currentStep+1);saveState();render();} }
    else if (action === 'goto') { currentStep=Number(btn.dataset.step); render(); }
    else if (action === 'calculate') { if(validateAll()){saveState();lastResult=E.project(state);screen='results';render();} }
    else if (action === 'edit') { screen='editor'; currentStep=0; render(); }
    else if (action === 'print') window.print();
    else if (action === 'reset') { if(confirm('入力内容をすべてリセットしますか？')){clearState();currentStep=0;screen='editor';render();} }
    else if (action === 'add-child') { state.family.children=state.family.children||[]; state.family.children.push({label:`第${state.family.children.length+1}子`,timing:'existing',age:0,yearsUntilBirth:1,currentEducation:0,finalEdu:'university',route:'public',away:false});saveState();render(); }
    else if (action === 'remove-child') { state.family.children.splice(Number(btn.dataset.index),1);saveState();render(); }
    else if (action === 'add-income-change') {
      const key=btn.dataset.person;const p=state.income[key];const base=key==='self'?n(state.family.selfAge):n(state.family.spouseAge);
      p.changes=p.changes||[];const last=p.changes.length?Math.max(...p.changes.map(c=>n(c.age))):base;const age=Math.min(n(p.retireAge,65)-1,Math.max(base+1,last+5));
      const normalized=E.normalizePerson(p,base);p.changes.push({age,gross:Math.round(E.grossAtAge(normalized,base,Math.max(base,age-1)))});p.changes.sort((a,b)=>n(a.age)-n(b.age));saveState();render();
    }
    else if (action === 'remove-income-change') { state.income[btn.dataset.person].changes.splice(Number(btn.dataset.index),1);saveState();render(); }
    else if (action === 'add-event') { state.events=state.events||[];state.events.push({label:'',ageSelf:n(state.family.selfAge)+5,kind:'expense',amount:0,inflate:false});saveState();render(); }
    else if (action === 'remove-event') { state.events.splice(Number(btn.dataset.index),1);saveState();render(); }
    else if (action === 'save-json') downloadJson();
  }

  function validateCurrent(){
    const errors=[];
    if(currentStep===0){
      if(n(state.family.selfAge)<18) errors.push('本人の年齢を入力してください。');
      if(bool(state.family.hasSpouse)&&n(state.family.spouseAge)<18) errors.push('配偶者の年齢を入力してください。');
      (state.family.children||[]).forEach((c,i)=>{if(c.timing==='planned'&&n(c.yearsUntilBirth)<1)errors.push(`第${i+1}子の誕生予定を入力してください。`);});
    }
    if(currentStep===1){
      validatePerson('self','本人',n(state.family.selfAge),errors);
      if(bool(state.family.hasSpouse))validatePerson('spouse','配偶者',n(state.family.spouseAge),errors);
    }
    if(currentStep===3){
      const a=state.assets, age=n(state.family.selfAge);
      if(n(a.investmentStartAge)<age) errors.push('積立開始年齢は現在年齢以降にしてください。');
      if(n(a.investmentEndAge)<n(a.investmentStartAge)) errors.push('積立終了年齢は積立開始年齢以降にしてください。');
      if(n(a.withdrawalStartAge)<=n(a.investmentEndAge)) errors.push('取り崩し開始年齢は積立終了年齢より後にしてください。');
      if(a.withdrawalMethod!=='lump'&&n(a.withdrawalYears)<1) errors.push('受取期間を入力してください。');
    }
    if(currentStep===4&&bool(state.housing.purchasePlan)){
      if(n(state.housing.price)<=0)errors.push('住宅の物件価格を入力してください。');
      if(n(state.housing.buyAge)<=n(state.family.selfAge))errors.push('購入年齢は現在年齢より後にしてください。');
      if(n(state.housing.downPayment)>n(state.housing.price))errors.push('頭金が物件価格を超えています。');
      if(n(E.mortgagePreview(state.housing,state.housing.buyAge).principal)<=0)errors.push('住宅ローンの借入額が0円です。頭金・諸費用の設定を確認してください。');
    }
    return showErrors(errors);
  }

  function validatePerson(key,label,baseAge,errors){
    const p=state.income[key];
    if(n(p.retireAge)<=baseAge)errors.push(`${label}の就業終了年齢は現在年齢より後にしてください。`);
    if(n(p.growthUntilAge)<baseAge)errors.push(`${label}の年収上昇終了年齢を確認してください。`);
    const ages=(p.changes||[]).map(c=>n(c.age));
    if(new Set(ages).size!==ages.length)errors.push(`${label}の年収変更年齢が重複しています。`);
    (p.changes||[]).forEach((c,i)=>{if(n(c.age)<=baseAge||n(c.age)>=n(p.retireAge))errors.push(`${label}の収入変更${i+1}は、現在年齢より後・就業終了年齢より前にしてください。`);});
  }

  function validateAll(){
    for(let i=0;i<STEPS.length-1;i++){const prev=currentStep;currentStep=i;if(!validateCurrent()){currentStep=prev;return false;}currentStep=prev;}
    return true;
  }

  function showErrors(errors){
    const box=document.getElementById('form-error');
    if(!errors.length){if(box)box.classList.add('hidden');return true;}
    if(box){box.innerHTML=`<strong>入力内容を確認してください</strong><br>${errors.map(esc).join('<br>')}`;box.classList.remove('hidden');box.scrollIntoView({behavior:'smooth',block:'center'});}
    return false;
  }

  function sampleData(){
    const d=E.defaultData();
    d.family.selfAge=38;d.family.spouseAge=35;d.family.children=[
      {label:'第1子',timing:'existing',age:5,currentEducation:18,finalEdu:'university',route:'highPrivate',away:false},
      {label:'第2子',timing:'planned',yearsUntilBirth:2,currentEducation:0,finalEdu:'university',route:'public',away:true}
    ];
    d.income.self.gross=700;d.income.self.net=530;d.income.self.growthRate=1;d.income.self.growthUntilAge=50;d.income.self.changes=[{age:55,gross:650},{age:60,gross:420}];d.income.self.retireAge=65;d.income.self.pensionMonthly65=16;d.income.self.severance=1500;
    d.income.spouse.gross=450;d.income.spouse.net=350;d.income.spouse.growthRate=1;d.income.spouse.growthUntilAge=48;d.income.spouse.changes=[{age:45,gross:520}];d.income.spouse.retireAge=65;d.income.spouse.pensionMonthly65=11;d.income.spouse.severance=700;
    d.living.baseMonthly=30;d.living.otherAnnual=50;d.meta.inflationRate=1.5;
    d.assets.cash=800;d.assets.investment=450;d.assets.retirement=250;d.assets.monthlyInvestment=10;d.assets.investmentStartAge=38;d.assets.investmentEndAge=60;d.assets.withdrawalStartAge=65;d.assets.withdrawalMethod='annuity';d.assets.withdrawalYears=20;d.assets.monthlyRetirement=3;d.assets.investReturn=3;d.assets.retirementReturn=3;
    d.housing.monthlyCost=13;d.housing.purchasePlan=true;d.housing.buyAge=42;d.housing.price=5200;d.housing.downPayment=700;d.housing.miscRate=7;d.housing.loanTerm=35;d.housing.interestRate=1.2;d.housing.annualMaintenance=38;
    d.insurance.annualPremium=36;d.insurance.premiumEndAge=60;d.events=[{label:'車の買い替え',ageSelf:48,kind:'expense',amount:350,inflate:true},{label:'住宅リフォーム',ageSelf:68,kind:'expense',amount:600,inflate:true}];
    return d;
  }

  function downloadJson(){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='compass-plan-light-data.json';a.click();URL.revokeObjectURL(a.href);
  }

  function eventLabelsByAge(){
    const map=new Map();
    (lastResult.events||[]).forEach(ev=>{const arr=map.get(ev.age)||[];arr.push(ev.label);map.set(ev.age,arr);});
    return map;
  }

  function renderTable(showAll,showDetail){
    const holder=document.getElementById('cf-table');if(!holder)return;
    const labels=eventLabelsByAge();
    const rows=lastResult.rows.filter((r,i)=>showAll||r.isSnapshot||i===lastResult.rows.length-1||r.selfAge%5===0||labels.has(r.selfAge)||r.cash<0||n(r.investmentWithdrawal)>0||Math.abs(r.reconciliationGap)>0.01);
    const detailHead=showDetail?'<th>給与</th><th>年金</th><th>退職金</th><th>他収入</th><th>生活費</th><th>教育費</th><th>住居費</th><th>保険</th><th>他支出</th><th>住宅初期費用</th><th>計画取崩</th><th>臨時取崩</th><th>DC受取</th><th>ローン残高</th>':'';
    holder.innerHTML=`<table class="cf-table ${showDetail?'detail':''}"><thead><tr><th>年齢</th><th>主なイベント</th><th>期首総資産</th><th>収入</th><th>支出</th><th>家計収支</th><th>積立移転</th><th>運用取崩</th><th>運用収益</th><th>現金増減</th><th>期末現預金</th><th>NISA等</th><th>DC等</th><th>期末総資産</th><th>検算</th>${detailHead}</tr></thead><tbody>${rows.map(r=>tableRow(r,labels,showDetail)).join('')}</tbody></table>`;
  }

  function tableRow(r,labels,showDetail){
    const event=(labels.get(r.selfAge)||[]).join('／');
    const classes=[r.annualBalance<0?'negative':'',r.cash<0?'cash-negative':'',r.totalFinancialAssets<0?'total-negative':'',event?'event-row':''].filter(Boolean).join(' ');
    const transfer=n(r.investmentContribution)+n(r.retirementContribution);
    const verify=Math.abs(n(r.reconciliationGap))<0.01?'<span class="verify-ok">OK</span>':`<span class="verify-ng">${numCell(r.reconciliationGap,3)}</span>`;
    const summary=`<td>${r.selfAge}歳${r.isSnapshot?'（現在）':''}</td><td class="event-cell">${event?esc(event):'—'}</td><td>${numCell(r.openingTotalFinancialAssets)}</td><td>${r.isSnapshot?'—':numCell(r.income)}</td><td>${r.isSnapshot?'—':numCell(r.expense)}</td><td>${r.isSnapshot?'—':signedCell(r.annualBalance)}</td><td>${r.isSnapshot?'—':numCell(transfer)}</td><td>${r.isSnapshot?'—':numCell(r.investmentWithdrawal)}</td><td>${r.isSnapshot?'—':signedCell(r.totalReturn)}</td><td>${r.isSnapshot?'—':signedCell(r.cashChange)}</td><td class="${r.cash<0?'strong-negative':''}">${numCell(r.cash)}</td><td>${numCell(r.investment)}</td><td>${numCell(r.retirement)}</td><td class="${r.totalFinancialAssets<0?'strong-negative':''}">${numCell(r.totalFinancialAssets)}</td><td>${verify}</td>`;
    const detail=showDetail?`<td>${r.isSnapshot?'—':numCell(r.employmentIncome)}</td><td>${r.isSnapshot?'—':numCell(r.pensionIncome)}</td><td>${r.isSnapshot?'—':numCell(r.severanceIncome)}</td><td>${r.isSnapshot?'—':numCell(r.otherIncome)}</td><td>${r.isSnapshot?'—':numCell(r.livingExpense)}</td><td>${r.isSnapshot?'—':numCell(r.educationExpense)}</td><td>${r.isSnapshot?'—':numCell(r.housingExpense)}</td><td>${r.isSnapshot?'—':numCell(r.insuranceExpense)}</td><td>${r.isSnapshot?'—':numCell(r.otherExpense)}</td><td>${r.isSnapshot?'—':numCell(r.homeUpfront)}</td><td>${r.isSnapshot?'—':numCell(r.plannedInvestmentWithdrawal)}</td><td>${r.isSnapshot?'—':numCell(r.emergencyInvestmentWithdrawal)}</td><td>${r.isSnapshot?'—':numCell(r.retirementRelease)}</td><td>${numCell(r.mortgageBalance)}</td>`:'';
    return `<tr class="${classes}">${summary}${detail}</tr>`;
  }

  function numCell(v,digits=0){return n(v).toLocaleString('ja-JP',{minimumFractionDigits:0,maximumFractionDigits:digits});}
  function signedCell(v){const x=n(v);return `<span class="${x<0?'num-negative':x>0?'num-positive':''}">${x>0?'+':''}${numCell(x)}</span>`;}

  function updateLivingConversion(){
    const strip=document.querySelector('.conversion-strip');if(!strip)return;const m=n(state.living.baseMonthly);strip.innerHTML=`<span>月額</span><strong>${formatWan(m,1)}</strong><span>× 12か月 ＝ 年間</span><strong>${formatWan(m*12,1)}</strong>`;
  }

  function updateMortgagePreview(){
    const holder=document.getElementById('mortgage-preview');if(holder)holder.innerHTML=mortgagePreviewMarkup();
  }

  function updateInvestmentPreview(){
    const holder=document.getElementById('investment-preview');if(holder)holder.innerHTML=investmentPreviewMarkup();
  }

  function updateIncomePreview(key){
    const baseAge=key==='self'?n(state.family.selfAge,35):n(state.family.spouseAge,33);
    const canvas=document.getElementById(`income-chart-${key}`);if(canvas)drawIncomeChart(canvas,state.income[key],baseAge);
    const summary=document.getElementById(`income-summary-${key}`);if(summary)summary.innerHTML=incomeSummaryHtml(key,baseAge);
  }

  function redrawVisibleCharts(){
    if(screen==='results'&&lastResult){drawAssetChart(document.getElementById('asset-chart'),lastResult.rows);drawBalanceChart(document.getElementById('balance-chart'),lastResult.rows.filter(r=>!r.isSnapshot));}
    if(screen==='editor'&&STEPS[currentStep][0]==='income'){updateIncomePreview('self');if(bool(state.family.hasSpouse))updateIncomePreview('spouse');}
  }

  function canvasSetup(canvas){
    if(!canvas)return null;const rect=canvas.getBoundingClientRect();if(rect.width<10||rect.height<10)return null;const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.max(300,Math.round(rect.width*dpr));canvas.height=Math.max(160,Math.round(rect.height*dpr));const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w:rect.width,h:rect.height};
  }

  function drawIncomeChart(canvas,rawPerson,baseAge){
    const setup=canvasSetup(canvas);if(!setup)return;const {ctx,w,h}=setup;const p=E.normalizePerson(rawPerson,baseAge);const end=Math.max(baseAge+1,p.retireAge);const ages=[];for(let age=baseAge;age<=end;age++)ages.push(age);const values=ages.map(age=>E.grossAtAge(p,baseAge,age));const max=Math.max(100,...values)*1.12;const pad={l:42,r:12,t:14,b:30};const pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;const x=i=>pad.l+i/(ages.length-1)*pw;const y=v=>pad.t+ph-(v/max)*ph;
    ctx.clearRect(0,0,w,h);ctx.font='10px sans-serif';ctx.strokeStyle='#e2e9f1';ctx.fillStyle='#718096';ctx.lineWidth=1;
    for(let i=0;i<=3;i++){const yy=pad.t+ph*i/3;ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();ctx.textAlign='right';ctx.fillText(Math.round(max*(1-i/3)).toLocaleString(),pad.l-6,yy+3);}
    ctx.beginPath();values.forEach((v,i)=>{const xx=x(i),yy=y(v);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.strokeStyle='#0a3474';ctx.lineWidth=2.5;ctx.stroke();
    const markerAges=new Set([baseAge,p.growthUntilAge,...p.changes.map(c=>c.age),p.retireAge]);
    ages.forEach((age,i)=>{if(!markerAges.has(age))return;const xx=x(i),yy=y(values[i]);ctx.beginPath();ctx.arc(xx,yy,3.5,0,Math.PI*2);ctx.fillStyle=age===p.retireAge?'#ae2f38':'#3788f6';ctx.fill();ctx.fillStyle='#66758a';ctx.textAlign='center';ctx.fillText(`${age}歳`,xx,h-9);});
  }

  function drawAssetChart(canvas,rows){
    const setup=canvasSetup(canvas);if(!setup)return;const {ctx,w,h}=setup;const pad={l:58,r:18,t:20,b:40};const pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
    const positiveTops=rows.map(r=>Math.max(0,n(r.cash))+Math.max(0,n(r.investment))+Math.max(0,n(r.retirement)));
    const totals=rows.map(r=>n(r.totalFinancialAssets));
    let max=Math.max(100,...positiveTops,...totals);let min=Math.min(0,...rows.map(r=>Math.min(0,n(r.cash))),...totals);if(max-min<100)max=min+100;const margin=(max-min)*.08;max+=margin;min-=margin;
    const y=v=>pad.t+(max-v)/(max-min)*ph;const zero=y(0);const slot=pw/rows.length;const bw=Math.max(1,Math.min(13,slot*.72));
    ctx.clearRect(0,0,w,h);ctx.font='11px sans-serif';ctx.fillStyle='#708096';ctx.strokeStyle='#e1e8f0';ctx.lineWidth=1;
    for(let i=0;i<=5;i++){const val=max-(max-min)*i/5;const yy=y(val);ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();ctx.textAlign='right';ctx.fillText(Math.round(val).toLocaleString(),pad.l-8,yy+4);}
    ctx.strokeStyle='#9aa9ba';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(pad.l,zero);ctx.lineTo(w-pad.r,zero);ctx.stroke();
    rows.forEach((r,i)=>{const xx=pad.l+(i+.5)*slot;let base=0;const parts=[[Math.max(0,n(r.cash)),'#6eb7ff'],[Math.max(0,n(r.investment)),'#0a3474'],[Math.max(0,n(r.retirement)),'#8aa0bb']];parts.forEach(([val,color])=>{if(val<=0)return;const yTop=y(base+val),yBottom=y(base);ctx.fillStyle=color;ctx.fillRect(xx-bw/2,yTop,bw,Math.max(1,yBottom-yTop));base+=val;});if(n(r.cash)<0){ctx.fillStyle='#ae2f38';ctx.fillRect(xx-bw/2,zero,bw,Math.max(1,y(n(r.cash))-zero));}});
    ctx.beginPath();rows.forEach((r,i)=>{const xx=pad.l+(i+.5)*slot,yy=y(n(r.totalFinancialAssets));i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.strokeStyle='#17263a';ctx.lineWidth=2.3;ctx.stroke();
    labelXAxis(ctx,rows,i=>pad.l+(i+.5)*slot,h,pad,w);
  }

  function drawBalanceChart(canvas,rows){
    const setup=canvasSetup(canvas);if(!setup)return;const {ctx,w,h}=setup;const pad={l:55,r:18,t:18,b:38};const pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
    const vals=rows.map(r=>n(r.annualBalance));const maxAbs=Math.max(100,...vals.map(Math.abs));ctx.clearRect(0,0,w,h);ctx.font='11px sans-serif';ctx.fillStyle='#708096';ctx.strokeStyle='#e1e8f0';
    const y=v=>pad.t+ph/2-(v/maxAbs)*(ph/2*.9);const zero=y(0);for(let i=0;i<=4;i++){const val=maxAbs-(maxAbs*2*i/4);const yy=y(val);ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();ctx.textAlign='right';ctx.fillText(Math.round(val).toLocaleString(),pad.l-8,yy+4);}
    const bw=Math.max(1,pw/rows.length*.7);rows.forEach((r,i)=>{const x=pad.l+(i+.5)/rows.length*pw;const yy=y(r.annualBalance);ctx.fillStyle=r.annualBalance>=0?'#157f5b':'#ae2f38';ctx.fillRect(x-bw/2,Math.min(zero,yy),bw,Math.abs(zero-yy));});
    labelXAxis(ctx,rows,i=>pad.l+(i+.5)/rows.length*pw,h,pad,w);
  }

  function labelXAxis(ctx,rows,x,h,pad,w){
    ctx.fillStyle='#708096';ctx.textAlign='center';const interval=w<650?10:5;rows.forEach((r,i)=>{if(i===0||i===rows.length-1||r.selfAge%interval===0)ctx.fillText(`${r.selfAge}歳`,x(i),h-12);});
  }

  render();
})();

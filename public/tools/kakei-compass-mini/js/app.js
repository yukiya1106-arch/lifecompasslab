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

  function loadState() {
    try {
      const raw = safeStorage.get(STORAGE_KEY);
      if (!raw) return null;
      return deepMerge(E.defaultData(), JSON.parse(raw));
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

  function getPath(obj, path) {
    return path.split('.').reduce((v, key) => v == null ? undefined : v[key], obj);
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

  function personSection(key, title, baseAge) {
    const p = state.income[key];
    const changes = Array.isArray(p.changes) ? p.changes : [];
    return `<section class="section"><h3>${title}</h3><div class="form-grid three">
      ${field(`income.${key}.gross`,'現在の額面年収',p.gross,'万円',{min:0,max:10000})}
      ${field(`income.${key}.net`,'現在の手取り年収',p.net,'万円',{min:0,max:10000,optional:true,hint:'未入力の場合は連続性のある概算式で推計します。'})}
      ${field(`income.${key}.otherAnnual`,'その他の年収',p.otherAnnual||0,'万円/年',{min:0,max:10000,optional:true})}
      ${field(`income.${key}.otherIncomeEndAge`,'その他収入の終了年齢',p.otherIncomeEndAge||p.retireAge||65,'歳',{min:baseAge,max:110,optional:true,hint:'家賃収入など退職後も続く場合は終了年齢を延ばしてください。'})}
      ${field(`income.${key}.growthRate`,'毎年の上昇率',p.growthRate||0,'%/年',{min:-20,max:20,step:.1})}
      ${field(`income.${key}.growthUntilAge`,'上昇を続ける年齢',p.growthUntilAge||baseAge,'歳まで',{min:baseAge,max:85,hint:'この年齢以降は、次の変更点まで横ばいです。'})}
      ${field(`income.${key}.retireAge`,'就業終了年齢',p.retireAge||65,'歳',{min:baseAge+1,max:85})}
      ${field(`income.${key}.pensionStartAge`,'年金受給開始',p.pensionStartAge||65,'歳',{min:60,max:75})}
      ${field(`income.${key}.pensionMonthly65`,'65歳基準の年金月額',p.pensionMonthly65||0,'万円/月',{min:0,max:100,step:.1,optional:true})}
      ${field(`income.${key}.severance`,'退職金',p.severance||0,'万円',{min:0,max:50000,optional:true,hint:'税引前の概算。税金は本ライト版では未反映です。'})}
    </div>
    <div style="margin-top:18px"><div class="label">年齢ごとの収入変更</div><div class="hint" style="margin-bottom:10px">例：55歳から年収600万円、60歳から年収350万円。変更後も、上の上昇率が「上昇を続ける年齢」まで適用されます。</div>
      <div class="repeat-list">${changes.map((c,i)=>`<div class="repeat-card"><div class="form-grid three">
        ${field(`income.${key}.changes.${i}.age`,'変更年齢',c.age,'歳',{min:baseAge,max:85})}
        ${field(`income.${key}.changes.${i}.gross`,'その年齢からの額面年収',c.gross,'万円',{min:0,max:10000})}
        <div class="form-group"><label>&nbsp;</label><button class="btn btn-danger btn-small" data-action="remove-income-change" data-person="${key}" data-index="${i}">この変更を削除</button></div>
      </div></div>`).join('')}</div>
      <button class="add-btn" data-action="add-income-change" data-person="${key}">＋ 収入変更点を追加</button>
    </div></section>`;
  }

  function incomeStep() {
    return `<div class="page-head"><div class="eyebrow">Step 2</div><h2>働き方と収入の変化</h2><p>「毎年○％」だけでなく、役職定年・再雇用・転職などの年収変更を年齢ごとに設定できます。</p></div>
      ${personSection('self','本人の収入',n(state.family.selfAge,35))}
      ${bool(state.family.hasSpouse) ? personSection('spouse','配偶者の収入',n(state.family.spouseAge,33)) : ''}
      <div class="info-box"><strong>手取り推計：</strong>額面年収帯の境界で手取りが逆転しないよう、複数の基準点を線形補間しています。実際の税・社会保険は家族構成等で異なるため、手取り実額の入力を推奨します。</div>`;
  }

  function livingStep() {
    const l = state.living, m = state.meta;
    return `<div class="page-head"><div class="eyebrow">Step 3</div><h2>生活費と物価上昇</h2><p>住宅費・教育費・保険料・積立を除いた、現在の基本生活費を入力します。</p></div>
      <section class="section"><h3>現在の支出</h3><div class="form-grid">
        ${field('living.baseAnnual','基本生活費',l.baseAnnual,'万円/年',{min:0,max:3000,hint:'食費・光熱費・通信費・日用品・小遣い等。現在いるお子さまの日常生活費を含めます。'})}
        ${field('living.otherAnnual','その他の年間支出',l.otherAnnual||0,'万円/年',{min:0,max:3000,hint:'旅行、車検、冠婚葬祭など。'})}
        ${field('meta.inflationRate','物価上昇率',m.inflationRate,'%/年',{min:-3,max:10,step:.1,hint:'基本生活費・教育費・住居維持費などに反映します。'})}
        ${field('meta.horizonAge','計算終了年齢',m.horizonAge||90,'歳',{min:n(state.family.selfAge,35)+1,max:110})}
        ${toggleField('living.inflateOther','その他の年間支出にも物価上昇を反映',l.inflateOther)}
        ${toggleField('living.childLivingAdjust','子どもの成長・独立による生活費変化を反映',l.childLivingAdjust,'現在いる子は現在との差分だけ、将来予定の子は誕生後の概算額を加算します。')}
      </div></section>
      <section class="section"><h3>教育費の前提</h3><div class="info-box">幼稚園から高校までは文部科学省「令和5年度 子供の学習費調査（2026年訂正後）」の学習費総額を年額化。大学はJASSO調査を基に、国公立約60万円・私立約131万円、自宅外は年48万円を概算加算しています。実際の進学先や授業料支援制度は個別に異なります。</div></section>`;
  }

  function assetsStep() {
    const a=state.assets;
    return `<div class="page-head"><div class="eyebrow">Step 4</div><h2>現在の資産と積立</h2><p>現預金・いつでも使える運用資産・受取時期が限られる退職資産を分けて計算します。</p></div>
      <section class="section"><h3>現在の残高</h3><div class="form-grid three">
        ${field('assets.cash','現預金',a.cash,'万円',{min:0,max:100000})}
        ${field('assets.investment','NISA等の運用資産',a.investment,'万円',{min:0,max:100000})}
        ${field('assets.retirement','DC・iDeCo等',a.retirement,'万円',{min:0,max:100000})}
      </div></section>
      <section class="section"><h3>運用と積立</h3><div class="form-grid three">
        ${field('assets.investReturn','運用資産の想定利回り',a.investReturn,'%/年',{min:-20,max:20,step:.1})}
        ${field('assets.monthlyInvestment','手取りからの積立',a.monthlyInvestment,'万円/月',{min:0,max:300,step:.1,hint:'NISA等。積立分は現金から運用資産への移動として処理します。'})}
        ${field('assets.investmentEndAge','積立終了年齢',a.investmentEndAge,'歳',{min:n(state.family.selfAge,35),max:90})}
        ${field('assets.retirementReturn','DC等の想定利回り',a.retirementReturn,'%/年',{min:-20,max:20,step:.1})}
        ${field('assets.monthlyRetirement','DC・iDeCo等の積立',a.monthlyRetirement,'万円/月',{min:0,max:300,step:.1,hint:'入力する手取り年収が、この拠出前の金額であることを確認してください。'})}
        ${field('assets.retirementContributionEndAge','DC等の積立終了',a.retirementContributionEndAge,'歳',{min:n(state.family.selfAge,35),max:75})}
        ${field('assets.retirementReceiveAge','DC等の受取年齢',a.retirementReceiveAge,'歳',{min:55,max:75,hint:'受取年の年初に全額を現金へ移す簡易計算です。税金は未反映です。'})}
      </div></section>
      <div class="warning-box"><strong>資産不足の扱い：</strong>現預金が不足した場合は、まずNISA等の流動資産を取り崩します。受取可能年齢以降はDC等も使用し、それでも不足する額は「累積不足額」として隠さず表示します。</div>`;
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
      </div>` : ''}</section>
      <div class="info-box"><strong>年次の扱い：</strong>「40歳で購入」は40歳になる年の年初に購入すると仮定します。その年は現在の家賃を計上せず、初期費用・ローン返済・維持費を計上します。住宅の資産価値は金融資産に含めません。</div>`;
  }

  function otherStep() {
    const ins=state.insurance, events=Array.isArray(state.events)?state.events:[];
    return `<div class="page-head"><div class="eyebrow">Step 6</div><h2>保険料とライフイベント</h2><p>自動的に「退職後30％」などとはせず、実際の払込終了年齢を設定します。</p></div>
      <section class="section"><h3>保険料</h3><div class="form-grid">
        ${field('insurance.annualPremium','年間保険料',ins.annualPremium,'万円/年',{min:0,max:2000})}
        ${field('insurance.premiumEndAge','払込終了年齢',ins.premiumEndAge,'歳',{min:n(state.family.selfAge,35),max:100,hint:'払込済みの場合は現在年齢未満ではなく、年間保険料を0にしてください。'})}
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
        ${reviewCard('生活費',[['基本生活費',formatWan(l.baseAnnual)],['その他支出',formatWan(l.otherAnnual)],['物価上昇率',`${state.meta.inflationRate}%`]])}
        ${reviewCard('資産',[['現預金',formatWan(a.cash)],['運用資産',formatWan(a.investment)],['DC等',formatWan(a.retirement)]])}
        ${reviewCard('住まい',[['現在住居費',`${h.monthlyCost}万円/月`],['購入予定',bool(h.purchasePlan)?`${h.buyAge}歳・${formatWan(h.price)}`:'なし'],['維持費',bool(h.purchasePlan)?formatWan(h.annualMaintenance):'—']])}
        ${reviewCard('備え・予定',[['年間保険料',formatWan(i.annualPremium)],['払込終了',`${i.premiumEndAge}歳`],['イベント',`${(state.events||[]).length}件`]])}
      </div>
      <div class="warning-box" style="margin-top:18px"><strong>本ツールの範囲：</strong>将来の方向性を確認するための概算です。所得税・社会保険料・退職所得税、住宅ローン控除、児童手当、教育無償化、住宅資産価値などは個別計算していません。結果画面では、金融資産と資金不足を分けて表示します。</div>`;
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

  function resultScreen() {
    const r = lastResult;
    const m = r.metrics;
    const status = m.firstTotalShortfallAge != null ? `${m.firstTotalShortfallAge}歳` : m.firstLiquidShortfallAge != null ? `${m.firstLiquidShortfallAge}歳` : 'なし';
    const statusSub = m.firstTotalShortfallAge != null ? '資金不足が発生' : m.firstLiquidShortfallAge != null ? '流動資産が枯渇' : `${r.assumptions.horizonAge}歳まで`;
    return `<section class="results-header"><div class="container">
      <div class="header-inner" style="height:auto"><div class="brand"><img src="assets/compass-logo.png" alt=""><span>COMPASS PLAN <small>light</small></span></div><div class="header-actions"><button class="btn btn-light btn-small" data-action="edit">入力を修正</button><button class="btn btn-primary btn-small" data-action="print">印刷・PDF</button></div></div>
      <div class="results-title"><div><div class="brand-kicker">YOUR FINANCIAL ROUTE</div><h1>将来のお金の見通し</h1><p>資産残高だけでなく、使えるお金・退職資産・累積不足額を分けて確認します。</p></div></div>
    </div></section>
    <main class="results-main"><div class="container">
      <div class="metric-grid">
        ${metric('現在の年間収支',signedWan(r.current.annualBalance),'積立を含む概算')}
        ${metric('資金不足の開始',status,statusSub)}
        ${metric(`${state.income.self.retireAge}歳時の金融資産`,formatWan(m.retirementAssets),'住宅資産価値は含まない')}
        ${metric(`${r.assumptions.horizonAge}歳時の金融資産`,formatWan(m.finalAssets),m.cumulativeShortfall>0?`累積不足 ${formatWan(m.cumulativeShortfall)}`:'累積不足なし')}
      </div>
      <div class="result-layout"><div class="result-stack">
        <section class="result-panel"><h2>金融資産の推移</h2><div class="chart-wrap"><canvas id="asset-chart"></canvas></div><div class="legend"><span><i style="background:#0a3474"></i>総金融資産</span><span><i style="background:#3788f6"></i>流動資産</span><span><i style="background:#8aa0bb"></i>DC・iDeCo等</span><span><i style="background:#ae2f38"></i>累積不足額</span></div></section>
        <section class="result-panel"><h2>年間収支の推移</h2><div class="chart-wrap" style="height:300px"><canvas id="balance-chart"></canvas></div><div class="legend"><span><i style="background:#157f5b"></i>黒字</span><span><i style="background:#ae2f38"></i>赤字</span></div></section>
        <section class="result-panel"><div class="table-tools"><h2 style="margin:0">年次キャッシュフロー</h2><label class="choice"><input type="checkbox" id="show-all-rows"> 全年表示</label></div><div class="table-scroll" id="cf-table"></div><div class="source-note">金額単位：万円。現在年齢の行は資産スナップショットで、年間収支は翌年齢の行から反映します。</div></section>
      </div><aside class="result-stack">
        <section class="result-panel"><h2>確認ポイント</h2><div class="alert-list">${alertsHtml(r)}</div></section>
        <section class="result-panel"><h2>計算前提</h2><div class="assumption-list">
          <div>物価上昇率：<strong>${r.assumptions.inflationRatePct}%</strong></div>
          <div>運用利回り：<strong>${r.assumptions.investReturnPct}%</strong> ／ DC等：<strong>${r.assumptions.retirementReturnPct}%</strong></div>
          <div>${esc(r.assumptions.timing)}</div><div>${esc(r.assumptions.assetScope)}</div><div>${esc(r.assumptions.taxScope)}</div>
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
    if (screen === 'results') {
      requestAnimationFrame(() => {
        drawAssetChart(document.getElementById('asset-chart'), lastResult.rows);
        drawBalanceChart(document.getElementById('balance-chart'), lastResult.rows.filter(r=>!r.isSnapshot));
        renderTable(false);
      });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function bindEvents() {
    app.querySelectorAll('[data-path]').forEach((el) => {
      el.addEventListener('change', onFieldChange);
      if (el.tagName === 'INPUT' && !['checkbox','radio'].includes(el.type)) el.addEventListener('input', onFieldChange);
    });
    app.querySelectorAll('[data-action]').forEach((el) => el.addEventListener('click', onAction));
    const allRows = document.getElementById('show-all-rows');
    if (allRows) allRows.addEventListener('change', () => renderTable(allRows.checked));
    window.addEventListener('resize', redrawCharts, { once: true });
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
    saveState();
    if (['family.hasSpouse','housing.purchasePlan'].includes(path) || path.includes('.timing')) render();
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
    else if (action === 'add-income-change') { const p=state.income[btn.dataset.person];p.changes=p.changes||[];p.changes.push({age:(btn.dataset.person==='self'?n(state.family.selfAge):n(state.family.spouseAge))+10,gross:p.gross});saveState();render(); }
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
      if(n(state.income.self.retireAge)<=n(state.family.selfAge))errors.push('本人の就業終了年齢は現在年齢より後にしてください。');
      if(bool(state.family.hasSpouse)&&n(state.income.spouse.retireAge)<=n(state.family.spouseAge))errors.push('配偶者の就業終了年齢は現在年齢より後にしてください。');
    }
    if(currentStep===4&&bool(state.housing.purchasePlan)){
      if(n(state.housing.price)<=0)errors.push('住宅の物件価格を入力してください。');
      if(n(state.housing.buyAge)<=n(state.family.selfAge))errors.push('購入年齢は現在年齢より後にしてください。');
      if(n(state.housing.downPayment)>n(state.housing.price))errors.push('頭金が物件価格を超えています。');
    }
    return showErrors(errors);
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
    d.living.baseAnnual=360;d.living.otherAnnual=50;d.meta.inflationRate=1.5;
    d.assets.cash=800;d.assets.investment=450;d.assets.retirement=250;d.assets.monthlyInvestment=10;d.assets.monthlyRetirement=3;d.assets.investReturn=3;d.assets.retirementReturn=3;
    d.housing.monthlyCost=13;d.housing.purchasePlan=true;d.housing.buyAge=42;d.housing.price=5200;d.housing.downPayment=700;d.housing.miscRate=7;d.housing.loanTerm=35;d.housing.interestRate=1.2;d.housing.annualMaintenance=38;
    d.insurance.annualPremium=36;d.insurance.premiumEndAge=60;d.events=[{label:'車の買い替え',ageSelf:48,kind:'expense',amount:350,inflate:true},{label:'住宅リフォーム',ageSelf:68,kind:'expense',amount:600,inflate:true}];
    return d;
  }

  function downloadJson(){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='compass-plan-light-data.json';a.click();URL.revokeObjectURL(a.href);
  }

  function renderTable(showAll){
    const holder=document.getElementById('cf-table');if(!holder)return;
    const eventAges=new Set(lastResult.events.map(e=>e.age));
    const rows=lastResult.rows.filter((r,i)=>showAll||r.isSnapshot||i===lastResult.rows.length-1||r.selfAge%5===0||eventAges.has(r.selfAge)||r.annualShortfall>0);
    holder.innerHTML=`<table><thead><tr><th>年齢</th><th>収入</th><th>支出</th><th>積立</th><th>年間収支</th><th>現預金</th><th>運用資産</th><th>DC等</th><th>総金融資産</th><th>不足累計</th><th>ローン残高</th></tr></thead><tbody>${rows.map(r=>{
      const ev=eventAges.has(r.selfAge);return `<tr class="${r.annualBalance<0?'negative':''} ${ev?'event-row':''}"><td>${r.selfAge}歳${r.isSnapshot?'（現在）':''}</td><td>${r.isSnapshot?'—':numCell(r.income)}</td><td>${r.isSnapshot?'—':numCell(r.expense)}</td><td>${r.isSnapshot?'—':numCell(r.investmentContribution+r.retirementContribution)}</td><td>${r.isSnapshot?'—':numCell(r.annualBalance)}</td><td>${numCell(r.cash)}</td><td>${numCell(r.investment)}</td><td>${numCell(r.retirement)}</td><td>${numCell(r.totalFinancialAssets)}</td><td>${numCell(r.cumulativeShortfall)}</td><td>${numCell(r.mortgageBalance)}</td></tr>`;}).join('')}</tbody></table>`;
  }

  function numCell(v){return n(v).toLocaleString('ja-JP',{maximumFractionDigits:0});}

  function redrawCharts(){if(screen==='results'&&lastResult){drawAssetChart(document.getElementById('asset-chart'),lastResult.rows);drawBalanceChart(document.getElementById('balance-chart'),lastResult.rows.filter(r=>!r.isSnapshot));}}

  function canvasSetup(canvas){
    if(!canvas)return null;const rect=canvas.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.max(300,rect.width*dpr);canvas.height=Math.max(200,rect.height*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w:rect.width,h:rect.height};
  }

  function drawAssetChart(canvas,rows){
    const setup=canvasSetup(canvas);if(!setup)return;const {ctx,w,h}=setup;const pad={l:55,r:18,t:18,b:38};const pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
    const series=[['totalFinancialAssets','#0a3474'],['liquidAssets','#3788f6'],['retirement','#8aa0bb'],['cumulativeShortfall','#ae2f38']];
    const max=Math.max(100,...rows.flatMap(r=>series.map(([k])=>n(r[k]))));const min=0;
    ctx.clearRect(0,0,w,h);ctx.font='11px sans-serif';ctx.fillStyle='#708096';ctx.strokeStyle='#e1e8f0';ctx.lineWidth=1;
    for(let i=0;i<=5;i++){const y=pad.t+ph*i/5;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();const val=max*(1-i/5);ctx.textAlign='right';ctx.fillText(Math.round(val).toLocaleString(),pad.l-8,y+4);}
    const x=i=>pad.l+(rows.length===1?0:i/(rows.length-1))*pw;const y=v=>pad.t+ph-(v-min)/(max-min)*ph;
    series.forEach(([key,color])=>{ctx.beginPath();rows.forEach((r,i)=>{const xx=x(i),yy=y(n(r[key]));i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.strokeStyle=color;ctx.lineWidth=key==='totalFinancialAssets'?3:2;ctx.stroke();});
    labelXAxis(ctx,rows,x,h,pad);
  }

  function drawBalanceChart(canvas,rows){
    const setup=canvasSetup(canvas);if(!setup)return;const {ctx,w,h}=setup;const pad={l:55,r:18,t:18,b:38};const pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
    const vals=rows.map(r=>n(r.annualBalance));const max=Math.max(100,...vals.map(Math.abs));ctx.clearRect(0,0,w,h);ctx.font='11px sans-serif';ctx.fillStyle='#708096';ctx.strokeStyle='#e1e8f0';
    const y=v=>pad.t+ph/2-(v/max)*(ph/2*.9);const zero=y(0);for(let i=0;i<=4;i++){const val=max-(max*2*i/4);const yy=y(val);ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();ctx.textAlign='right';ctx.fillText(Math.round(val).toLocaleString(),pad.l-8,yy+4);}
    const bw=Math.max(1,pw/rows.length*.7);rows.forEach((r,i)=>{const x=pad.l+(i+.5)/rows.length*pw;const yy=y(r.annualBalance);ctx.fillStyle=r.annualBalance>=0?'#157f5b':'#ae2f38';ctx.fillRect(x-bw/2,Math.min(zero,yy),bw,Math.abs(zero-yy));});
    labelXAxis(ctx,rows,i=>pad.l+(i+.5)/rows.length*pw,h,pad);
  }

  function labelXAxis(ctx,rows,x,h,pad){
    ctx.fillStyle='#708096';ctx.textAlign='center';const labels=[];rows.forEach((r,i)=>{if(i===0||i===rows.length-1||r.selfAge%10===0)labels.push([i,r.selfAge]);});labels.forEach(([i,a])=>ctx.fillText(`${a}歳`,x(i),h-12));
  }

  render();
})();

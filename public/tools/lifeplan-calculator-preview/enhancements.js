(()=>{
  'use strict';

  const ASSET_LABEL='資産運用';
  const LEGACY_URL='../lifeplan-calculator/?embedded=asset&v=4';
  const DETAIL_LABELS=['配偶者控除','扶養親族','住宅ローン控除額','iDeCo掛金','ふるさと納税額','社会保険料率'];
  let overlay=null;
  let assetFrame=null;
  let activeAssetButton=null;

  const normalize=value=>(value||'').replace(/[\s\u00a0]+/g,'').trim();
  const directText=element=>normalize([...element.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join(''));
  const isVisible=element=>{
    if(!element)return false;
    const style=element.ownerDocument.defaultView.getComputedStyle(element);
    const rect=element.getBoundingClientRect();
    return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0;
  };

  function addMainStyles(){
    if(document.getElementById('lc-preview-enhancement-styles'))return;
    const style=document.createElement('style');
    style.id='lc-preview-enhancement-styles';
    style.textContent=`
      .lc-detail-panel{
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        gap:10px!important;
        padding:14px!important;
        border:1px solid #d7e2ef!important;
        border-radius:14px!important;
        background:#f7faff!important;
      }
      .lc-detail-row{
        grid-column:1/-1!important;
        display:grid!important;
        grid-template-columns:minmax(150px,.9fr) minmax(190px,1.1fr)!important;
        align-items:center!important;
        gap:14px!important;
        min-width:0!important;
        padding:10px 12px!important;
        border:1px solid #e2eaf3!important;
        border-radius:12px!important;
        background:#fff!important;
      }
      .lc-detail-row input,.lc-detail-row select{
        width:100%!important;
        min-width:0!important;
        height:46px!important;
        box-sizing:border-box!important;
        border:1px solid #cbd8e8!important;
        border-radius:10px!important;
        background:#fff!important;
        font-size:16px!important;
        font-weight:700!important;
        color:#0a2247!important;
      }
      .lc-detail-row input:focus,.lc-detail-row select:focus{
        outline:3px solid rgba(47,124,229,.16)!important;
        border-color:#2f7ce5!important;
      }
      .lc-detail-row [class*="text-xs"],.lc-detail-row [class*="text-sm"]{
        line-height:1.5!important;
      }
      @media(max-width:760px){
        .lc-detail-row{grid-template-columns:1fr!important;gap:7px!important;padding:11px!important}
        .lc-detail-panel{padding:10px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function findLabelElement(root,label){
    const candidates=[...root.querySelectorAll('label,span,p,div')]
      .filter(element=>{
        const own=directText(element);
        const all=normalize(element.textContent);
        return own===normalize(label)||all===normalize(label)||all.startsWith(normalize(label));
      })
      .sort((a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length||a.textContent.length-b.textContent.length);
    return candidates[0]||null;
  }

  function findFieldWrapper(root,label,{allowRange=false}={}){
    const labelElement=findLabelElement(root,label);
    if(!labelElement)return null;
    let node=labelElement;
    while(node&&node!==root.body&&node!==root.documentElement){
      const controls=[...node.querySelectorAll('input,select')].filter(control=>allowRange||control.type!=='range');
      if(controls.length===1||(allowRange&&controls.length>=1))return node;
      node=node.parentElement;
    }
    return null;
  }

  function lowestCommonAncestor(elements){
    if(!elements.length)return null;
    let ancestor=elements[0];
    while(ancestor&&!elements.every(element=>ancestor.contains(element)))ancestor=ancestor.parentElement;
    return ancestor;
  }

  function improveLivingDetails(){
    const wrappers=DETAIL_LABELS.map(label=>findFieldWrapper(document,label)).filter(Boolean);
    if(wrappers.length<4)return;
    const panel=lowestCommonAncestor(wrappers);
    if(!panel||panel===document.body)return;
    panel.classList.add('lc-detail-panel');
    wrappers.forEach(wrapper=>{
      wrapper.classList.add('lc-detail-row');
      wrapper.style.gridColumn='1 / -1';
      [...wrapper.querySelectorAll('input,select')].forEach(control=>{
        control.setAttribute('autocomplete','off');
        if(control.tagName==='INPUT'&&control.type!=='range')control.setAttribute('inputmode','decimal');
      });
    });
  }

  function closeAssetOverlay(){
    if(overlay)overlay.style.display='none';
    activeAssetButton=null;
  }

  function updateOverlayPosition(){
    if(!overlay||overlay.style.display==='none'||!activeAssetButton)return;
    const rect=activeAssetButton.getBoundingClientRect();
    overlay.style.top=Math.max(108,Math.ceil(rect.bottom+10))+'px';
  }

  function injectAssetStyles(doc){
    if(doc.getElementById('lc-asset-enhancement-styles'))return;
    const style=doc.createElement('style');
    style.id='lc-asset-enhancement-styles';
    style.textContent=`
      :root{color-scheme:light}
      html{background:#fff!important}
      body{font-family:system-ui,-apple-system,"Segoe UI","Noto Sans JP",sans-serif!important;background:#fff!important;color:#0a2247!important}
      header,footer{display:none!important}
      main{max-width:1180px!important;padding:18px 22px 48px!important;margin:0 auto!important}
      .no-print{display:none!important}
      button,input,select{font-family:inherit!important}
      .lc-asset-tabs{
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr))!important;
        gap:8px!important;
        margin:2px 0 22px!important;
      }
      .lc-asset-mode{
        min-height:62px!important;
        border:1px solid #d8e3ef!important;
        border-radius:12px!important;
        background:#f2f5f9!important;
        color:#627086!important;
        font-size:14px!important;
        font-weight:800!important;
        line-height:1.35!important;
        padding:10px 12px!important;
        box-shadow:none!important;
      }
      .lc-asset-mode.lc-active{
        border-color:#2f7ce5!important;
        background:#2f7ce5!important;
        color:#fff!important;
      }
      .lc-asset-field-row{
        display:grid!important;
        grid-template-columns:minmax(120px,.7fr) minmax(0,1.3fr)!important;
        align-items:center!important;
        gap:16px!important;
        padding:12px 14px!important;
        margin:0 0 10px!important;
        border:1px solid #dce6f1!important;
        border-radius:13px!important;
        background:#f7faff!important;
      }
      .lc-asset-field-row input:not([type="range"]){
        min-height:44px!important;
        border:1px solid #cbd8e8!important;
        border-radius:10px!important;
        background:#fff!important;
        color:#0a2247!important;
        font-size:20px!important;
        font-weight:800!important;
      }
      .lc-asset-field-row input[type="range"]{accent-color:#2f7ce5!important}
      .lc-asset-answer-card{
        border:1px solid #cfe0f3!important;
        border-radius:15px!important;
        background:#f7faff!important;
        box-shadow:none!important;
        overflow:hidden!important;
      }
      .lc-asset-breakdown-card{
        border:1px solid #d7e2ef!important;
        border-radius:15px!important;
        background:#fff!important;
        box-shadow:0 10px 28px rgba(10,34,71,.08)!important;
        overflow:hidden!important;
      }
      #lc-stacked-chart{
        margin:20px 0 8px!important;
        padding:20px 20px 16px!important;
        border:1px solid #d7e2ef!important;
        border-radius:16px!important;
        background:#fff!important;
        box-shadow:0 10px 30px rgba(10,34,71,.07)!important;
      }
      .lc-chart-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
      .lc-chart-title{margin:0;color:#0a2247;font-size:18px;font-weight:900}
      .lc-chart-note{margin:5px 0 0;color:#66758a;font-size:13px;line-height:1.55}
      .lc-chart-legend{display:flex;flex-wrap:wrap;gap:12px 18px;color:#40516a;font-size:13px;font-weight:700}
      .lc-legend-item{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
      .lc-legend-swatch{width:13px;height:13px;border-radius:3px;display:inline-block}
      .lc-legend-principal{background:#b9dcfb}.lc-legend-gain{background:#276ec5}
      .lc-chart-scroll{overflow-x:auto;overflow-y:hidden;padding:8px 2px 2px;scrollbar-width:thin}
      .lc-chart-stage{position:relative;min-height:344px;padding:0 8px 38px;border-bottom:1px solid #dce6f1}
      .lc-chart-columns{height:300px;display:flex;align-items:stretch;gap:8px;min-width:100%}
      .lc-bar-column{flex:1 0 22px;min-width:22px;max-width:42px;position:relative;display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch}
      .lc-bar-button{height:300px;padding:0;border:0;background:transparent;display:flex;flex-direction:column;justify-content:flex-end;cursor:pointer;outline:none}
      .lc-bar-button:hover .lc-bar-stack,.lc-bar-button:focus-visible .lc-bar-stack,.lc-bar-button.lc-selected .lc-bar-stack{filter:brightness(.96);box-shadow:0 0 0 3px rgba(47,124,229,.14)}
      .lc-bar-stack{width:100%;min-height:2px;display:flex;flex-direction:column;justify-content:flex-end;border-radius:5px 5px 2px 2px;overflow:hidden;transition:box-shadow .15s,filter .15s}
      .lc-bar-gain{background:#276ec5;min-height:0}.lc-bar-principal{background:#b9dcfb;min-height:1px}
      .lc-bar-label{position:absolute;top:306px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:800;color:#55708f;white-space:nowrap}
      .lc-chart-tooltip{position:absolute;z-index:4;left:12px;top:8px;min-width:190px;padding:11px 13px;border:1px solid #cddbed;border-radius:12px;background:rgba(255,255,255,.98);box-shadow:0 12px 30px rgba(10,34,71,.14);pointer-events:none}
      .lc-tooltip-period{font-size:12px;font-weight:900;color:#2f7ce5;margin-bottom:6px}
      .lc-tooltip-row{display:flex;justify-content:space-between;gap:18px;font-size:12px;color:#52637b;line-height:1.75}.lc-tooltip-row strong{color:#0a2247;font-size:13px}
      .lc-chart-footer{display:flex;justify-content:flex-end;margin-top:12px;color:#718097;font-size:11px;line-height:1.55}
      @media(max-width:820px){
        main{padding:12px 12px 40px!important}
        .lc-asset-tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .lc-asset-field-row{grid-template-columns:1fr!important;gap:7px!important}
        .lc-chart-head{display:block}.lc-chart-legend{margin-top:10px}
        #lc-stacked-chart{padding:16px 12px 12px!important}
      }
    `;
    doc.head.appendChild(style);
  }

  function labelElementIn(doc,label){
    const target=normalize(label);
    return [...doc.querySelectorAll('label,span,p,div')]
      .filter(element=>isVisible(element)&&(directText(element)===target||normalize(element.textContent)===target))
      .sort((a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length)[0]||null;
  }

  function fieldRowIn(doc,label){
    const labelElement=labelElementIn(doc,label);
    if(!labelElement)return null;
    let node=labelElement;
    while(node&&node!==doc.body){
      const controls=[...node.querySelectorAll('input')].filter(isVisible);
      if(controls.some(control=>control.type==='range')&&controls.some(control=>control.type!=='range'))return node;
      node=node.parentElement;
    }
    return null;
  }

  function numericInputIn(doc,label){
    const row=fieldRowIn(doc,label);
    if(!row)return null;
    return [...row.querySelectorAll('input')].find(input=>input.type!=='range'&&isVisible(input))||null;
  }

  function parseNumber(value){
    const number=Number(String(value||'').replace(/[^0-9.-]/g,''));
    return Number.isFinite(number)?number:0;
  }

  function readValue(doc,label){
    const input=numericInputIn(doc,label);
    return input?parseNumber(input.value):0;
  }

  function numberNearExactLabel(doc,label,suffixPattern){
    const labelElement=labelElementIn(doc,label);
    if(!labelElement)return 0;
    let node=labelElement.parentElement;
    for(let depth=0;node&&depth<5;depth++,node=node.parentElement){
      const pattern=new RegExp('([0-9][0-9,]*(?:\\.[0-9]+)?)\\s*'+suffixPattern);
      const match=(node.innerText||'').match(pattern);
      if(match)return parseNumber(match[1]);
    }
    return 0;
  }

  function findAnswerCard(doc){
    const phrases=['入力条件で積立した場合','目標金額を達成するには'];
    const element=[...doc.querySelectorAll('div,p,span')]
      .filter(candidate=>isVisible(candidate)&&phrases.some(phrase=>normalize(candidate.textContent).includes(normalize(phrase))))
      .sort((a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length)[0];
    if(!element)return null;
    let node=element;
    while(node&&node!==doc.body){
      const text=node.innerText||'';
      if(/[0-9][0-9,]*(?:\.[0-9]+)?\s*(?:円|万円|%|年)/.test(text))return node;
      node=node.parentElement;
    }
    return element.parentElement;
  }

  function getMode(doc){
    const hasTarget=!!numericInputIn(doc,'目標額');
    const hasMonthly=!!numericInputIn(doc,'毎月積立額');
    const hasYears=!!numericInputIn(doc,'積立期間');
    const hasRate=!!numericInputIn(doc,'利回り（年率）')||!!numericInputIn(doc,'利回り');
    if(!hasTarget&&hasMonthly&&hasYears&&hasRate)return 0;
    if(hasTarget&&hasMonthly&&!hasYears&&hasRate)return 1;
    if(hasTarget&&!hasMonthly&&hasYears&&hasRate)return 2;
    if(hasTarget&&hasMonthly&&hasYears&&!hasRate)return 3;
    return 0;
  }

  function decorateAssetUi(doc){
    const modeMatchers=['将来いくらになるか','積立期間を計算する','毎月積立額を計算する','利回りを計算する'];
    const modeButtons=[...doc.querySelectorAll('button')].filter(button=>isVisible(button)&&modeMatchers.some(fragment=>normalize(button.textContent).includes(normalize(fragment))));
    if(modeButtons.length>=4){
      const container=lowestCommonAncestor(modeButtons);
      if(container)container.classList.add('lc-asset-tabs');
      const mode=getMode(doc);
      modeButtons.forEach((button,index)=>{
        button.classList.add('lc-asset-mode');
        button.classList.toggle('lc-active',index===mode);
      });
    }

    ['目標額','毎月積立額','積立期間','利回り（年率）','利回り'].forEach(label=>{
      const row=fieldRowIn(doc,label);
      if(row)row.classList.add('lc-asset-field-row');
    });

    const answer=findAnswerCard(doc);
    if(answer)answer.classList.add('lc-asset-answer-card');
    const breakdownLabel=labelElementIn(doc,'積立元本＋増えた額');
    if(breakdownLabel){
      let node=breakdownLabel;
      while(node&&node!==doc.body){
        const value=node.innerText||'';
        if(value.includes('積立元本')&&value.includes('増えた額')&&/[0-9,]+\s*円/.test(value)){
          node.classList.add('lc-asset-breakdown-card');
          break;
        }
        node=node.parentElement;
      }
    }
  }

  function readSimulationState(doc){
    const mode=getMode(doc);
    let months=Math.max(1,Math.round(readValue(doc,'積立期間')*12));
    let monthly=readValue(doc,'毎月積立額')*10000;
    let rate=readValue(doc,'利回り（年率）')||readValue(doc,'利回り');
    const answer=findAnswerCard(doc);
    const answerText=answer?answer.innerText:(doc.body.innerText||'');

    if(mode===1){
      const match=answerText.match(/(\d+)\s*年(?:\s*(\d+)\s*[ヶかケ]?月)?/);
      if(match)months=Math.max(1,Number(match[1])*12+Number(match[2]||0));
    }
    if(mode===3){
      const match=answerText.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
      if(match)rate=Number(match[1]);
    }

    let principal=numberNearExactLabel(doc,'積立元本','円');
    let gain=numberNearExactLabel(doc,'増えた額','円');
    let total=numberNearExactLabel(doc,'積立元本＋増えた額','円');

    if(mode===2&&principal>0&&months>0)monthly=principal/months;
    if(principal<=0)principal=Math.max(0,monthly*months);
    if(total<=0)total=principal+Math.max(0,gain);
    if(gain<=0&&total>=principal)gain=total-principal;

    return {mode,months,monthly,rate,principal,gain,total};
  }

  function futureValue(monthly,annualRate,months){
    if(monthly<=0||months<=0)return 0;
    const monthlyRate=Math.pow(1+Math.max(-.999,annualRate/100),1/12)-1;
    if(Math.abs(monthlyRate)<1e-10)return monthly*months;
    return monthly*(Math.pow(1+monthlyRate,months)-1)/monthlyRate;
  }

  function createPoints(state){
    const monthPoints=[];
    for(let month=12;month<=state.months;month+=12)monthPoints.push(month);
    if(!monthPoints.length||monthPoints[monthPoints.length-1]!==state.months)monthPoints.push(state.months);
    const approximateFinalGain=Math.max(0,futureValue(state.monthly,state.rate,state.months)-state.monthly*state.months);
    const gainScale=approximateFinalGain>0?state.gain/approximateFinalGain:0;
    return monthPoints.map(month=>{
      const principal=Math.min(state.principal,state.monthly*month);
      const approximateGain=Math.max(0,futureValue(state.monthly,state.rate,month)-state.monthly*month);
      let gain=approximateGain*gainScale;
      if(month===state.months){
        gain=state.gain;
        return {month,principal:state.principal,gain,total:state.total};
      }
      return {month,principal,gain,total:principal+gain};
    });
  }

  function formatYen(value){
    return Math.round(value||0).toLocaleString('ja-JP')+'円';
  }

  function periodLabel(month){
    const years=Math.floor(month/12);
    const remainder=month%12;
    if(years&&remainder)return `${years}年${remainder}か月`;
    if(years)return `${years}年目`;
    return `${remainder}か月`;
  }

  function findChartHost(doc){
    const candidates=[...doc.querySelectorAll('svg,canvas')]
      .filter(isVisible)
      .map(element=>({element,area:element.getBoundingClientRect().width*element.getBoundingClientRect().height}))
      .filter(item=>item.area>50000)
      .sort((a,b)=>b.area-a.area);
    if(!candidates.length)return null;
    const chart=candidates[0].element;
    return chart.closest('.recharts-responsive-container')||chart.parentElement;
  }

  function showTooltip(mount,point,button){
    const tooltip=mount.querySelector('.lc-chart-tooltip');
    if(!tooltip)return;
    tooltip.innerHTML=`
      <div class="lc-tooltip-period">${periodLabel(point.month)}</div>
      <div class="lc-tooltip-row"><span>積立元本</span><strong>${formatYen(point.principal)}</strong></div>
      <div class="lc-tooltip-row"><span>運用で増えた額</span><strong>${formatYen(point.gain)}</strong></div>
      <div class="lc-tooltip-row"><span>合計</span><strong>${formatYen(point.total)}</strong></div>`;
    mount.querySelectorAll('.lc-bar-button').forEach(item=>item.classList.remove('lc-selected'));
    button.classList.add('lc-selected');
  }

  function renderStackedChart(doc){
    const host=findChartHost(doc);
    if(!host)return;
    const state=readSimulationState(doc);
    if(!state.months||!state.total)return;
    const points=createPoints(state);
    if(!points.length)return;
    const maxTotal=Math.max(...points.map(point=>point.total),1);

    let mount=doc.getElementById('lc-stacked-chart');
    if(!mount){
      mount=doc.createElement('section');
      mount.id='lc-stacked-chart';
      host.parentElement.insertBefore(mount,host);
    }
    host.style.display='none';
    host.dataset.lcHiddenOriginalChart='true';

    const labels=new Set([0,Math.floor((points.length-1)/2),points.length-1]);
    const minWidth=Math.max(620,points.length*32);
    mount.innerHTML=`
      <div class="lc-chart-head">
        <div><h3 class="lc-chart-title">積立元本と運用成果の推移</h3><p class="lc-chart-note">棒全体が金融資産額です。元本と、運用で増えた金額を分けて表示します。</p></div>
        <div class="lc-chart-legend"><span class="lc-legend-item"><i class="lc-legend-swatch lc-legend-principal"></i>積立元本</span><span class="lc-legend-item"><i class="lc-legend-swatch lc-legend-gain"></i>運用で増えた額</span></div>
      </div>
      <div class="lc-chart-scroll">
        <div class="lc-chart-stage" style="min-width:${minWidth}px">
          <div class="lc-chart-tooltip"></div>
          <div class="lc-chart-columns"></div>
        </div>
      </div>
      <div class="lc-chart-footer">各棒を選択すると、その時点の内訳を確認できます。表示額はシミュレーション結果に合わせた概算推移です。</div>`;

    const columns=mount.querySelector('.lc-chart-columns');
    points.forEach((point,index)=>{
      const totalHeight=Math.max(2,Math.round(point.total/maxTotal*270));
      const principalHeight=Math.max(1,Math.round(point.principal/point.total*totalHeight));
      const gainHeight=Math.max(0,totalHeight-principalHeight);
      const column=doc.createElement('div');
      column.className='lc-bar-column';
      const button=doc.createElement('button');
      button.type='button';
      button.className='lc-bar-button'+(index===points.length-1?' lc-selected':'');
      button.setAttribute('aria-label',`${periodLabel(point.month)}、積立元本${formatYen(point.principal)}、運用で増えた額${formatYen(point.gain)}、合計${formatYen(point.total)}`);
      button.innerHTML=`<span class="lc-bar-stack" style="height:${totalHeight}px"><span class="lc-bar-gain" style="height:${gainHeight}px"></span><span class="lc-bar-principal" style="height:${principalHeight}px"></span></span>`;
      if(labels.has(index)){
        const label=doc.createElement('span');
        label.className='lc-bar-label';
        label.textContent=periodLabel(point.month);
        column.appendChild(label);
      }
      ['mouseenter','focus','click'].forEach(eventName=>button.addEventListener(eventName,()=>showTooltip(mount,point,button)));
      column.appendChild(button);
      columns.appendChild(column);
    });
    const lastButton=mount.querySelector('.lc-bar-button:last-of-type')||mount.querySelector('.lc-bar-button:last-child');
    const buttons=mount.querySelectorAll('.lc-bar-button');
    const actualLast=buttons[buttons.length-1];
    if(actualLast)showTooltip(mount,points[points.length-1],actualLast);
  }

  function prepareAssetFrame(frame){
    let attempts=0;
    let scheduled=null;
    let rendering=false;
    const schedule=delay=>{
      clearTimeout(scheduled);
      scheduled=setTimeout(()=>{
        if(rendering)return;
        rendering=true;
        try{
          const doc=frame.contentDocument;
          injectAssetStyles(doc);
          decorateAssetUi(doc);
          renderStackedChart(doc);
        }catch(error){console.error('asset enhancement',error)}
        finally{rendering=false}
      },delay||80);
    };
    const prepare=()=>{
      attempts++;
      try{
        const doc=frame.contentDocument;
        if(!doc)return;
        const assetButton=[...doc.querySelectorAll('button')].find(button=>normalize(button.textContent)===normalize(ASSET_LABEL));
        if(assetButton){
          assetButton.click();
          injectAssetStyles(doc);
          doc.documentElement.style.background='#fff';
          doc.addEventListener('input',()=>schedule(80),true);
          doc.addEventListener('change',()=>schedule(80),true);
          doc.addEventListener('click',()=>schedule(140),true);
          new MutationObserver(mutations=>{
            if(mutations.some(mutation=>[...mutation.addedNodes].some(node=>node.nodeType===1&&node.id!=='lc-stacked-chart')))schedule(100);
          }).observe(doc.body,{childList:true,subtree:true});
          schedule(250);
          return;
        }
      }catch(error){console.error('asset bridge',error)}
      if(attempts<60)setTimeout(prepare,150);
    };
    prepare();
  }

  function openAssetOverlay(button){
    activeAssetButton=button;
    if(!overlay){
      overlay=document.createElement('div');
      overlay.id='lc-original-asset-overlay';
      Object.assign(overlay.style,{position:'fixed',left:'0',right:'0',bottom:'0',zIndex:'45',background:'#f2f6fb',padding:'10px',boxSizing:'border-box',overflow:'hidden'});
      assetFrame=document.createElement('iframe');
      assetFrame.title='資産運用シミュレーション';
      assetFrame.src=LEGACY_URL;
      Object.assign(assetFrame.style,{width:'100%',height:'100%',border:'0',borderRadius:'16px',background:'#fff',boxShadow:'0 12px 36px rgba(10,34,71,.14)'});
      overlay.appendChild(assetFrame);
      document.body.appendChild(overlay);
      assetFrame.addEventListener('load',()=>prepareAssetFrame(assetFrame));
    }
    updateOverlayPosition();
    overlay.style.display='block';
  }

  function wireMainNavigation(){
    [...document.querySelectorAll('button')].forEach(button=>{
      if(button.dataset.lcAssetBridge)return;
      const label=normalize(button.textContent);
      if(label===normalize(ASSET_LABEL)){
        button.dataset.lcAssetBridge='asset';
        button.addEventListener('click',()=>setTimeout(()=>openAssetOverlay(button),30),true);
      }else if(['生活費逆算','住宅ローン','住宅ローン控除'].some(name=>label===normalize(name))){
        button.dataset.lcAssetBridge='other';
        button.addEventListener('click',closeAssetOverlay,true);
      }
    });
  }

  addMainStyles();
  const refreshMain=()=>{
    wireMainNavigation();
    improveLivingDetails();
  };
  new MutationObserver(refreshMain).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('resize',updateOverlayPosition);
  refreshMain();
})();

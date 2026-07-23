(()=>{
'use strict';
const DETAIL=['配偶者控除','扶養親族','住宅ローン控除額','iDeCo掛金','ふるさと納税額','社会保険料率'];
const ASSET_URL='__ASSET_URL__';
let overlay=null,suppressed=false,autoOpened=false;
const norm=v=>(v||'').replace(/[\s\u00a0]+/g,'').trim();
const own=e=>norm([...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(''));
function addCss(){if(document.getElementById('lc-v9-css'))return;const s=document.createElement('style');s.id='lc-v9-css';s.textContent=`
.lc-detail-panel{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;padding:14px!important;border:1px solid #d7e2ef!important;border-radius:14px!important;background:#f7faff!important}
.lc-detail-row{grid-column:1/-1!important;display:grid!important;grid-template-columns:minmax(145px,.8fr) minmax(190px,1.2fr)!important;align-items:center!important;gap:14px!important;padding:10px 12px!important;border:1px solid #e1eaf4!important;border-radius:12px!important;background:#fff!important;min-width:0!important}
.lc-detail-row input,.lc-detail-row select{width:100%!important;min-width:0!important;height:46px!important;box-sizing:border-box!important;border:1px solid #cbd8e8!important;border-radius:10px!important;background:#fff!important;color:#0a2247!important;font-size:16px!important;font-weight:700!important}
.lc-detail-row input:focus,.lc-detail-row select:focus{outline:3px solid rgba(47,124,229,.16)!important;border-color:#2f7ce5!important}
@media(max-width:760px){.lc-detail-panel{padding:10px!important}.lc-detail-row{grid-template-columns:1fr!important;gap:7px!important;padding:11px!important}}
`;document.head.appendChild(s)}
function exactAll(label){const t=norm(label);return [...document.querySelectorAll('label,span,p,div')].filter(e=>own(e)===t||norm(e.textContent)===t).sort((a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length)}
function wrapper(el){let n=el;while(n&&n!==document.body){const controls=[...n.querySelectorAll('input,select')].filter(c=>c.type!=='range');if(controls.length===1)return n;n=n.parentElement}return null}
function improveDetails(){const rows=[];DETAIL.forEach(label=>exactAll(label).forEach(el=>{const row=wrapper(el);if(row&&!rows.includes(row))rows.push(row)}));if(rows.length<4)return;const panels=new Set;rows.forEach(row=>{let n=row.parentElement;while(n&&n!==document.body){const labels=DETAIL.filter(label=>norm(n.textContent).includes(norm(label))).length,controls=n.querySelectorAll('input,select').length;if(labels>=4&&controls<=12){panels.add(n);break}n=n.parentElement}});panels.forEach(panel=>{panel.classList.add('lc-detail-panel');rows.filter(row=>panel.contains(row)).forEach(row=>{row.classList.add('lc-detail-row');row.style.gridColumn='1 / -1';row.querySelectorAll('input,select').forEach(c=>{c.autocomplete='off';if(c.tagName==='INPUT'&&c.type!=='range')c.inputMode='decimal'})})})}
function openAsset(){suppressed=false;if(!overlay){overlay=document.createElement('iframe');overlay.id='lc-asset-v9-overlay';overlay.title='資産運用4モード';overlay.src=ASSET_URL;Object.assign(overlay.style,{position:'fixed',inset:'0',width:'100%',height:'100%',border:'0',zIndex:'2147483647',background:'#f2f6fb'});document.body.appendChild(overlay)}overlay.style.display='block'}
function activate(label){const target=[...document.querySelectorAll('button,a,[role="button"]')].find(node=>norm(node.textContent).endsWith(norm(label)));if(target)target.click()}
function closeAsset(label=''){if(overlay)overlay.style.display='none';suppressed=true;if(label)setTimeout(()=>activate(label),0)}
function isAssetControl(node){if(!node)return false;const t=norm(node.textContent);return t==='資産運用'||t.endsWith('資産運用')}
document.addEventListener('click',event=>{const node=event.target.closest('button,a,[role="button"]');if(isAssetControl(node)){setTimeout(openAsset,0)}else if(node&&['生活費逆算','住宅ローン','住宅ローン控除'].some(x=>norm(node.textContent).endsWith(norm(x)))){closeAsset();suppressed=false;autoOpened=false}},true);
window.addEventListener('message',event=>{const routes={'lc-close-asset-v9':'生活費逆算','lc-nav-living':'生活費逆算','lc-nav-mortgage':'住宅ローン','lc-nav-deduction':'住宅ローン控除'};if(routes[event.data])closeAsset(routes[event.data])});
function refresh(){improveDetails();const body=norm(document.body.innerText);const onAsset=body.includes(norm('資産形成を試算する'));if(onAsset&&!suppressed&&!autoOpened){autoOpened=true;openAsset()}if(!onAsset){autoOpened=false}}
addCss();new MutationObserver(refresh).observe(document.documentElement,{childList:true,subtree:true});refresh();
})();
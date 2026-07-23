(()=>{
'use strict';
const DETAIL=['配偶者控除','扶養親族','住宅ローン控除額','iDeCo掛金','ふるさと納税額','社会保険料率'];
const ASSET_URL='__ASSET_URL__';
let assetHost=null,assetFrame=null,originalAssetRegion=null;
const norm=v=>(v||'').replace(/[\s\u00a0]+/g,'').trim();
const own=e=>norm([...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(''));
function renameProduct(){
  document.title=(document.title||'').replace(/ライフプラン電卓/g,'COMPASS Tools');
  if(!document.body)return;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
    if(node.nodeValue&&node.nodeValue.includes('ライフプラン電卓'))node.nodeValue=node.nodeValue.replaceAll('ライフプラン電卓','COMPASS Tools');
  }
  document.querySelectorAll('[aria-label],[title]').forEach(el=>{
    ['aria-label','title'].forEach(attr=>{
      const value=el.getAttribute(attr);
      if(value&&value.includes('ライフプラン電卓'))el.setAttribute(attr,value.replaceAll('ライフプラン電卓','COMPASS Tools'));
    });
  });
}
function addCss(){if(document.getElementById('lc-v15-css'))return;const s=document.createElement('style');s.id='lc-v15-css';s.textContent=`
.lc-detail-panel{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;padding:14px!important;border:1px solid #d7e2ef!important;border-radius:14px!important;background:#f7faff!important}
.lc-detail-row{grid-column:1/-1!important;display:grid!important;grid-template-columns:minmax(145px,.8fr) minmax(190px,1.2fr)!important;align-items:center!important;gap:14px!important;padding:10px 12px!important;border:1px solid #e1eaf4!important;border-radius:12px!important;background:#fff!important;min-width:0!important}
.lc-detail-row input,.lc-detail-row select{width:100%!important;min-width:0!important;height:46px!important;box-sizing:border-box!important;border:1px solid #cbd8e8!important;border-radius:10px!important;background:#fff!important;color:#0a2247!important;font-size:16px!important;font-weight:700!important}
.lc-detail-row input:focus,.lc-detail-row select:focus{outline:3px solid rgba(47,124,229,.16)!important;border-color:#2f7ce5!important}
.lc-original-asset-hidden{display:none!important}
#lc-asset-embedded-host{width:100%;min-width:0;margin:0;padding:0;background:transparent;overflow:hidden}
#lc-asset-embedded-frame{display:block;width:100%;height:900px;min-height:0;border:0;background:transparent;overflow:hidden}
@media(max-width:760px){.lc-detail-panel{padding:10px!important}.lc-detail-row{grid-template-columns:1fr!important;gap:7px!important;padding:11px!important}}
`;document.head.appendChild(s)}
function exactAll(label){const t=norm(label);return [...document.querySelectorAll('label,span,p,div,h1,h2,h3')].filter(e=>own(e)===t||norm(e.textContent)===t).sort((a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length)}
function wrapper(el){let n=el;while(n&&n!==document.body){const controls=[...n.querySelectorAll('input,select')].filter(c=>c.type!=='range');if(controls.length===1)return n;n=n.parentElement}return null}
function improveDetails(){const rows=[];DETAIL.forEach(label=>exactAll(label).forEach(el=>{const row=wrapper(el);if(row&&!rows.includes(row))rows.push(row)}));if(rows.length<4)return;const panels=new Set;rows.forEach(row=>{let n=row.parentElement;while(n&&n!==document.body){const labels=DETAIL.filter(label=>norm(n.textContent).includes(norm(label))).length,controls=n.querySelectorAll('input,select').length;if(labels>=4&&controls<=12){panels.add(n);break}n=n.parentElement}});panels.forEach(panel=>{panel.classList.add('lc-detail-panel');rows.filter(row=>panel.contains(row)).forEach(row=>{row.classList.add('lc-detail-row');row.style.gridColumn='1 / -1';row.querySelectorAll('input,select').forEach(c=>{c.autocomplete='off';if(c.tagName==='INPUT'&&c.type!=='range')c.inputMode='decimal'})})})}
function findAssetRegion(){const headings=exactAll('資産形成の条件');for(const heading of headings){let n=heading;while(n&&n!==document.body){const text=norm(n.innerText),inputs=n.querySelectorAll('input').length;const hasResult=text.includes(norm('将来資産の見通し'))||text.includes(norm('資産推移と購買力'))||text.includes(norm('継続資産の構成'));if(inputs>=3&&hasResult)return n;n=n.parentElement}}for(const heading of headings){let n=heading;while(n&&n!==document.body){if(n.querySelectorAll('input').length>=3&&n.getBoundingClientRect().height>500)return n;n=n.parentElement}}return null}
function resizeAsset(height){if(!assetFrame)return;let next=Number(height)||0;if(!next){try{const root=assetFrame.contentDocument.getElementById('assetRoot');next=root?root.getBoundingClientRect().height:0}catch(e){}}if(next>0)assetFrame.style.height=Math.ceil(next)+'px'}
function ensureAssetFrame(){if(assetHost&&assetFrame)return;assetHost=document.createElement('div');assetHost.id='lc-asset-embedded-host';assetFrame=document.createElement('iframe');assetFrame.id='lc-asset-embedded-frame';assetFrame.title='資産運用シミュレーター';assetFrame.scrolling='no';assetFrame.src=ASSET_URL;assetHost.appendChild(assetFrame);assetFrame.addEventListener('load',()=>requestAnimationFrame(()=>resizeAsset()))}
function mountAsset(){const region=findAssetRegion();if(!region)return false;ensureAssetFrame();if(originalAssetRegion&&originalAssetRegion!==region)originalAssetRegion.classList.remove('lc-original-asset-hidden');originalAssetRegion=region;const parent=region.parentElement;if(!parent)return false;if(assetHost.parentElement!==parent)parent.insertBefore(assetHost,region);region.classList.add('lc-original-asset-hidden');assetHost.style.display='block';return true}
function unmountAsset(){if(assetHost)assetHost.style.display='none';if(originalAssetRegion&&originalAssetRegion.isConnected)originalAssetRegion.classList.remove('lc-original-asset-hidden');originalAssetRegion=null}
function isAssetControl(node){if(!node)return false;const t=norm(node.textContent);return t==='資産運用'||t.endsWith('資産運用')}
document.addEventListener('click',event=>{const node=event.target.closest('button,a,[role="button"]');if(isAssetControl(node)){setTimeout(mountAsset,0)}else if(node&&['生活費逆算','住宅ローン','住宅ローン控除'].some(x=>norm(node.textContent).endsWith(norm(x)))){unmountAsset()}},true);
window.addEventListener('message',event=>{if(event.data&&event.data.type==='lc-asset-height')resizeAsset(event.data.height)});
function refresh(){renameProduct();improveDetails();const onAsset=norm(document.body.innerText).includes(norm('資産形成を試算する'));if(onAsset)mountAsset();else unmountAsset()}
addCss();new MutationObserver(refresh).observe(document.documentElement,{childList:true,subtree:true,characterData:true});refresh();
})();
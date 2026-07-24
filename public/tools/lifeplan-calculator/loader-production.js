(async()=>{
  const loading=document.getElementById('loading');
  try{
    const base='../lifeplan-calculator-preview/';
    const names=['part-0.txt','part-1.txt','part-2.txt','part-3.txt','part-4.txt'];
    const [encoded,rawEnhancement]=await Promise.all([
      Promise.all(names.map(async name=>{
        const response=await fetch(base+name+'?v=22',{cache:'no-store'});
        if(!response.ok)throw new Error(name);
        return response.text();
      })).then(parts=>parts.join('')),
      fetch(base+'enhancements-v9.js?v=22',{cache:'no-store'}).then(response=>{
        if(!response.ok)throw new Error('enhancements-v9.js');
        return response.text();
      })
    ]);
    const bytes=Uint8Array.from(atob(encoded),character=>character.charCodeAt(0));
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    let html=await new Response(stream).text();
    html=html.replace(
      '"react-dom/client": "https://esm.sh/react-dom@19.2.0/client"',
      '"react-dom": "https://esm.sh/react-dom@19.2.0",\n      "react-dom/client": "https://esm.sh/react-dom@19.2.0/client"'
    );
    const assetUrl=new URL(base+'asset-inline-v19.html?v=22',window.location.href).href;
    const enhancement=rawEnhancement.replace('__ASSET_URL__',assetUrl.replace(/'/g,'%27'));
    const frame=document.createElement('iframe');
    frame.title='COMPASS Tools';
    Object.assign(frame.style,{position:'fixed',inset:'0',width:'100%',height:'100%',border:'0',background:'#f2f6fb'});
    frame.srcdoc=html;
    frame.addEventListener('load',()=>{
      try{
        frame.contentWindow.eval(enhancement+'\n//# sourceURL=compass-tools-production-enhancements-v22.js');
        frame.contentDocument.documentElement.dataset.compassToolsRelease='v22';
        if(loading)loading.remove();
      }catch(error){
        console.error(error);
        document.body.innerHTML='<div class="error"><strong>画面の起動に失敗しました。</strong><small>'+String(error.message||error)+'</small></div>';
      }
    });
    document.body.appendChild(frame);
  }catch(error){
    document.body.innerHTML='<div class="error"><strong>読み込みに失敗しました。</strong><small>'+String(error.message||error)+'</small></div>';
    console.error(error);
  }
})();
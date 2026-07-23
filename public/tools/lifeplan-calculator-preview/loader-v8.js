(async()=>{
  const loading=document.getElementById('loading');
  try{
    const names=['part-0.txt','part-1.txt','part-2.txt','part-3.txt','part-4.txt'];
    const [encoded,enhancement]=await Promise.all([
      Promise.all(names.map(async name=>{
        const response=await fetch(name+'?v=8',{cache:'no-store'});
        if(!response.ok)throw new Error(name);
        return response.text();
      })).then(parts=>parts.join('')),
      fetch('./enhancements-v6.js?v=8',{cache:'no-store'}).then(response=>{
        if(!response.ok)throw new Error('enhancements-v6.js');
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

    const frame=document.createElement('iframe');
    frame.title='ライフプラン電卓プレビュー';
    frame.setAttribute('allow','clipboard-write');
    Object.assign(frame.style,{position:'fixed',inset:'0',width:'100%',height:'100%',border:'0',background:'#f2f6fb'});
    frame.srcdoc=html;
    frame.addEventListener('load',()=>{
      try{
        frame.contentWindow.eval(enhancement+'\n//# sourceURL=lifeplan-preview-enhancements-v8.js');
        frame.contentDocument.documentElement.dataset.lifeplanEnhancement='v8';
        if(loading)loading.remove();
      }catch(error){
        console.error(error);
        document.body.innerHTML='<div class="error"><strong>改善画面の起動に失敗しました。</strong><small>'+String(error.message||error)+'</small></div>';
      }
    });
    document.body.appendChild(frame);
  }catch(error){
    document.body.innerHTML='<div class="error"><strong>読み込みに失敗しました。</strong><small>'+String(error.message||error)+'</small></div>';
    console.error(error);
  }
})();

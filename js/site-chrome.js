/* © mitsulab. ほかのページに TOP と同じ見出しの帯・フッター・背景（参道の 3D とアクターの網）を入れる（2026-11-23）。 */
(function(){
  if(document.querySelector('.sx-head'))return;
  const en=document.documentElement.lang==='en';
  const h=document.createElement('div');h.className='sx-head';
  h.innerHTML='<a class="sx-brand" href="/" aria-label="mitsulab トップへ"><img src="/img/brand/qualium_glyph_96.webp" width="30" height="30" alt="">mitsulab</a><a class="sx-top" href="/">'+'← TOP'+'</a>';
  document.body.prepend(h);
  const f=document.createElement('footer');f.className='sx-foot';
  f.innerHTML='<b translate="no">mitsulab</b><p>認知と環境をつなぐ場、Qualium をつくる。</p><nav><a href="/">TOP</a><a href="/tabibito/">知覚旅人</a><a href="/museum-log/">巡り歴</a><a href="/privacy/">プライバシーポリシー</a><a href="/terms/">利用規約</a><a href="mailto:official@mitsulab.jp">official@mitsulab.jp</a></nav><small>© 2026 mitsulab / Mitsuaki Uehara. 無断の複製・転載・改変、AI の学習・生成への利用はお断りします（TDM の権利を留保）。他者の素材を除く。</small>';
  document.body.appendChild(f);
  const bg=document.createElement('div');bg.className='sx-bg sd-stick';bg.setAttribute('aria-hidden','true');
  const sp=innerWidth<761;bg.innerHTML='<img alt="" decoding="async" src="/img/hero/'+(sp?'sando_real_sp_600.webp':'sando_real_1440.webp')+'">';
  document.body.prepend(bg);
  const go=()=>import('/js/qualium-bg.js?v=8').then(m=>m.start({base:'/',theme:'network',nolabel:1,ko:'h1,h2,h3,p,dt,dd,li,a,button'})).catch(()=>{});
  addEventListener('load',()=>{(window.requestIdleCallback?requestIdleCallback(go,{timeout:1500}):setTimeout(go,400))});
})();

/* 前と後の一問：体験のあと、受けとり方がどう変わったかを一つだけ問う。
   答えはどこにも残さない。「地図に置く」を自分で押したときだけ、Qualia/map の置く画面へ下書きとして渡す（同じ端末の中・送信なし）。 */
(function(){
'use strict';
var done=false,el=null;
function css(){var s=document.createElement('style');s.textContent='#atsk{position:fixed;left:0;right:0;bottom:0;z-index:60;padding:18px 16px calc(18px + env(safe-area-inset-bottom));background:rgba(8,13,12,.94);border-top:1px solid rgba(127,196,180,.35);color:#e8f1ee;font-family:"Shippori Mincho","Hiragino Mincho ProN",serif;transform:translateY(105%);transition:transform .5s ease}#atsk.on{transform:none}#atsk p{margin:0 auto 12px;max-width:420px;font-size:15px;line-height:1.8;letter-spacing:.04em;text-align:center}#atsk div[hidden]{display:none}#atsk div{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:420px;margin:0 auto}#atsk button{min-height:44px;padding:0 16px;border-radius:22px;border:1px solid rgba(232,241,238,.4);background:transparent;color:inherit;font:inherit;font-size:14px;cursor:pointer}#atsk button[aria-pressed=true]{border-color:#7fc4b4;background:rgba(127,196,180,.18)}#atsk button.go{border-color:#7fc4b4;color:#0a1211;background:#7fc4b4}#atsk small{display:block;margin:10px auto 0;max-width:420px;text-align:center;font-family:sans-serif;font-size:11px;line-height:1.6;color:#9fb3ac}';document.head.appendChild(s)}
var after=null;
function close(){if(el){el.classList.remove('on');var e=el;el=null;setTimeout(function(){e.remove()},600);if(after){var f=after;after=null;setTimeout(f,700)}}}
window.atosaki=function(q,choices,href,then){
  if(done||!choices||!choices.length)return;done=true;css();after=typeof then==='function'?then:null;
  el=document.createElement('div');el.id='atsk';el.setAttribute('role','dialog');el.setAttribute('aria-label','前と後の一問');
  var p=document.createElement('p');p.textContent=q;el.appendChild(p);
  var row=document.createElement('div');el.appendChild(row);
  var act=document.createElement('div');act.style.marginTop='12px';act.hidden=true;el.appendChild(act);
  var note=document.createElement('small');note.textContent='答えは残りません。「地図に置く」を押したときだけ、この端末の地図に置けます。';el.appendChild(note);
  var pick=null;
  choices.forEach(function(c){var b=document.createElement('button');b.type='button';b.textContent=c.n;b.setAttribute('aria-pressed','false');
    b.onclick=function(){pick=c;[].forEach.call(row.children,function(x){x.setAttribute('aria-pressed',x===b)});act.hidden=false};row.appendChild(b)});
  var go=document.createElement('button');go.type='button';go.className='go';go.textContent='地図に置く';
  go.onclick=function(){if(!pick)return;try{sessionStorage.setItem('qmap.draft',JSON.stringify({s:pick.s,t:pick.t,b:(location.pathname.match(/\/(44|45)\//)||[])[1]||''}))}catch(e){}location.href=href||'../39/'};
  var no=document.createElement('button');no.type='button';no.textContent='置かずに閉じる';no.onclick=close;
  act.appendChild(go);act.appendChild(no);
  /* 触れないまま 25 秒たったら静かに下がる（操作をふさがない） */
  var tm=setTimeout(close,25000);el.addEventListener('pointerdown',function(){clearTimeout(tm)},{once:true});
  document.body.appendChild(el);requestAnimationFrame(function(){requestAnimationFrame(function(){el&&el.classList.add('on')})});
};
})();

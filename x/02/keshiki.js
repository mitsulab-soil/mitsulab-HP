/* 今の景色の窓 と 計算機を通した視点 ── 2026-11-20
   本人「sight の機能で、今見ている風景を、生き物の視点で見れるように」「機械自体の認知だけでなく、計算機を通すことでみえる新たな視点」
   ・窓＝端末のカメラ（か、えらんだ写真一枚）を、いま選んでいる体の受けとり方の模式で映す。映像は端末の中だけ（送らない・残さない）。
   ・計算機を通す＝カメラの体のときだけ出る三つ：動き（前のこまとの差）／色を数に（緑・空・明るさ）／ゆれ（わずかな変化を強める）。森の 3D にも、窓の景色にも掛かる。
   ・起動には関わらない（森が出てから読みこむ）。出典は 資料/今の景色と計算機の視点_2026-11-20.md と ⚙ の中。 */
const U = window.__um, S = window.SCRIPT, $ = id => document.getElementById(id);
const G = U.G, LENS = U.LENS;
const mob = () => innerWidth < 700;
const NAME = id => (S.lens.find(l => l.id === id) || {}).name || "";

/* ---------------- 言葉（短く。模式・推定は言い切らない） ---------------- */
const CAP = {
  hito: "カメラが写した、今の景色。上の並びで体をえらぶと、その受けとり方の模式に変わります。",
  inu: "犬の目の模式。色を受ける細胞は二種類で、赤と緑が近い色に。細かい所は人よりぼやけます。",
  hachi: "ミツバチの目の模式。紫外・青・緑で受け、赤は暗く沈みます。粒の粗さは模式。紫外はカメラに写らないので描けません。",
  chou: "アゲハの目の模式。紫外から赤まで受けるとされます。四つ目の色（紫外）はカメラに写らないので描けません。",
  tori: "小鳥の目の模式。四種類の細胞で色を受け、種によって紫外まで。紫外はカメラに写らないので描けません。",
  hebi: "マムシのピットは赤外（熱）を感じます。熱はこのカメラに写りません。熱の見え方は、まわりの森で確かめられます。",
  koumori: "コウモリは声の反響で形をとらえます。光を写すカメラからは作れません。反響の見え方は、まわりの森で確かめられます。",
  mimizu: "ミミズに目はなく、体で光の明るさだけを感じます。窓は、今の景色の明るさだけ。",
  camera: "カメラの受けとり方の模式。一画素が受けるのは赤・緑・青のどれか一色（格子は大きくして見せています）。",
  netsu: "熱カメラは赤外の量を温度の値にします。このカメラには写りません。熱の見え方は、まわりの森で確かめられます。",
};
const UP = {
  hito: "顔を上げて、同じ景色を自分の目で。画面と、どこが違いますか。",
  inu: "顔を上げて、赤い花や実を一つ探してみて。犬の目には、緑と近い色に見えているとされます。",
  hachi: "顔を上げて、近くの花を一つ。蜂には、人に見えない紫外の模様が見える花もあります。",
  chou: "顔を上げて、いちばん鮮やかな色を一つ。アゲハには、人に見えない色が重なって見えているかもしれません。",
  tori: "顔を上げて、いちばん鮮やかな色を一つ。小鳥には、人に見えない色が重なって見えているかもしれません。",
  hebi: "顔を上げて、日なたと日かげを見くらべて。温かさの違いは、目より先に肌が知っています。",
  koumori: "顔を上げて、目を閉じてみて。音だけで、壁や木までの遠さは分かりますか。",
  mimizu: "顔を上げて、目を閉じてみて。まぶたごしに、明るいほうは分かりますか。",
  camera: "顔を上げて、同じ景色を自分の目で。カメラが数にしたものを、あなたはどう感じていますか。",
  netsu: "顔を上げて、日なたと日かげを見くらべて。温かさの違いは、目より先に肌が知っています。",
  ugoki: "顔を上げて、十数えるあいだ、動いているものを一つ探してみて。葉か、人か、雲か。",
  kazu: "顔を上げて、緑がどれくらいあるか、自分の目で見積もってみて。数と、合っていましたか。",
  yure: "顔を上げて、いちばん静かに見えるものを見つめてみて。本当に、止まっていますか。",
};
const CALC = {
  ugoki: { name: "動き", legend: "<b>光る所</b>＝いま動いた所　<b>淡い跡</b>＝数秒前に動いた所<br>前のこまとの差を計算した結果",
    cap: "前のこまと今のこまの引き算。端末を止めて持つと、動いた所だけが残ります。淡い跡は数秒前の動き。計算した結果です。",
    say: ["計算機は、前のこまと今のこまを引き算できます。残るのは、動いたものだけ。", "立ち止まって、十数えてみて。風の通り道が、跡になって残ります。"] },
  kazu: { name: "色を数に", legend: "<b>緑</b>＝草木らしい色　<b>水色</b>＝青く明るい所（空の目安）<br>色からの推定。測った値ではありません",
    cap: "色を数に分けます。緑＝草木らしい色、水色＝青く明るい所（空の目安）。色からの推定で、測った値ではありません。",
    say: ["計算機は、景色を数に分けられます。緑の量、空の割合、明るさの分布。", "数は、色からの推定です。向きを変えると、数も変わります。"] },
  yure: { name: "ゆれ", legend: "<b>淡い青緑</b>＝わずかな明るさの変化を強めた所（計算結果）<br>立ち止まると、小さなゆれが大きく見える",
    cap: "少し前の平均との差を強めて、わずかなゆれを大きく見せます（淡い青緑＝強めた所）。計算した結果で、実際の動きの大きさではありません。",
    say: ["計算機は、人の目には小さすぎる変化を、何倍にも強められます。", "立ち止まってみて。止まって見えた葉や枝は、本当に止まっていますか。"] },
};

/* ---------------- 見た目 ---------------- */
const css = document.createElement("style"); css.id = "kes20";
css.textContent = `
#kesFull{position:fixed;inset:0;z-index:1;pointer-events:none}
#kesFull>canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#kesDock{position:fixed;left:24px;top:300px;z-index:6;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
#kesTile{position:relative;width:150px;height:98px;border:1px solid rgba(238,242,234,.62);border-radius:2px;background:rgba(8,14,11,.42);color:#f4f8f2;padding:0;display:grid;place-items:center;box-shadow:0 10px 30px rgba(0,0,0,.45);-webkit-tap-highlight-color:transparent;overflow:hidden}
#kesTile:before,#kesTile:after,#kesWin:before,#kesWin:after{content:"";position:absolute;width:12px;height:12px;border:solid #7fd6ca;pointer-events:none}
#kesTile:before,#kesWin:before{left:-1px;top:-1px;border-width:2px 0 0 2px}#kesTile:after,#kesWin:after{right:-1px;bottom:-1px;border-width:0 2px 2px 0}
#kesTile svg{position:absolute;inset:0;width:100%;height:100%;opacity:.55}
#kesTile b{position:relative;display:block;font-family:var(--mincho);font-size:17px;letter-spacing:.14em;font-weight:600;text-shadow:0 0 2px #071108,0 0 8px rgba(7,17,8,.95)}
#kesTile small{position:relative;display:block;font-size:12px;letter-spacing:.06em;margin-top:3px;color:#dfeae0;text-shadow:0 0 2px #071108,0 0 6px rgba(7,17,8,.95)}
#kesTile:hover,#kesTile:focus-visible{border-color:#7fd6ca;outline:none}#kesTile:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
#kesChips{display:flex;gap:6px;align-items:center;flex-wrap:nowrap}
#kesChips>span{font-family:var(--mincho);font-size:13px;letter-spacing:.08em;color:#f1f6ee;text-shadow:0 0 2px #071108,0 0 6px rgba(7,17,8,.95);white-space:nowrap;margin-right:2px}
#kesChips button{min-height:44px;min-width:56px;padding:0 13px;border-radius:2px;border:1px solid rgba(238,242,234,.5);background:rgba(8,14,11,.55);color:#f4f8f2;font-size:14px;white-space:nowrap;letter-spacing:.04em}
#kesChips button[aria-pressed=true]{background:#7fd6ca;border-color:#7fd6ca;color:#06201d;font-weight:600}
#kesChips button:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
#kesWin{position:fixed;left:28px;top:236px;width:min(42vw,560px);height:min(470px,calc(100vh - 372px));z-index:7;display:flex;flex-direction:column;border:1px solid rgba(238,242,234,.62);border-radius:2px;background:#0b100e;box-shadow:0 18px 50px rgba(0,0,0,.6);animation:kesIn .35s ease-out}
@keyframes kesIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
#kesHead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 0 0 12px;min-height:44px;border-bottom:1px solid rgba(238,242,234,.16)}
#kesHead b{font-family:var(--mincho);font-size:15px;letter-spacing:.08em;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#kesHead span{display:flex;align-items:center;flex:none}
#kesHead button,#kesHead label{min-width:44px;height:44px;display:grid;place-items:center;border:0;background:none;color:#eef2ea;font-size:13px;padding:0 10px;cursor:pointer;letter-spacing:.04em}
#kesHead label{border-left:1px solid rgba(238,242,234,.16)}#kesHead button{border-left:1px solid rgba(238,242,234,.16);font-size:16px}
#kesHead label:focus-within,#kesHead button:focus-visible{outline:3px solid var(--gold);outline-offset:-3px}
#kesBody{position:relative;flex:1;min-height:0;background:#060a08;overflow:hidden}
#kesBody>canvas{position:absolute;inset:0;width:100%;height:100%;display:block;transition:filter .6s}
#kesBody.rest>canvas{filter:brightness(.3)}
#kesMsg{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:18px;font-size:14px;line-height:1.8;color:#eef2ea}
#kesMsg label{display:inline-grid;place-items:center;min-height:44px;padding:0 20px;margin-top:10px;border-radius:2px;background:#7fd6ca;color:#06201d;font-weight:600;cursor:pointer}
#kesMsg small{display:block;margin-top:10px;font-size:12.5px;color:#cfdad0}
#kesRest{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:20px;border:0;background:none;color:#fff;font-family:var(--mincho);font-size:17px;line-height:1.9;letter-spacing:.04em;opacity:0;pointer-events:none;transition:opacity .6s}
#kesBody.rest #kesRest{opacity:1;pointer-events:auto}
#kesFoot{padding:8px 12px 9px;border-top:1px solid rgba(238,242,234,.16);font-size:13px;line-height:1.6;color:#eef2ea}
#kesFoot p{margin:0}#kesFoot small{display:block;font-size:11.5px;color:#b9c7bc;margin-top:2px}
#kesFoot #kesChips{margin-bottom:7px}
#kesNum{position:absolute;right:24px;top:84px;width:176px;font-size:13px;color:#fff;text-shadow:0 0 2px #050a07,0 0 6px rgba(5,10,7,.95),0 1px 10px rgba(5,10,7,.8);font-variant-numeric:tabular-nums;pointer-events:none}
#kesBody #kesNum{right:auto;left:12px;top:10px}
#kesNum div{display:grid;grid-template-columns:3.6em 1fr 3em;align-items:center;gap:6px;height:22px}
#kesNum i{display:block;height:3px;background:rgba(255,255,255,.22);position:relative}#kesNum i b{position:absolute;left:0;top:0;bottom:0;background:#8fdc9a;transition:width .3s}
#kesNum .sk i b{background:#a9def0}#kesNum div.mv{grid-template-columns:auto 1fr 3em}#kesNum .mv i b{background:#fff}
#kesNum em{font-style:normal;text-align:right;font-weight:600}
#kesNum canvas{display:block;width:100%;height:30px}#kesNum div.hs{height:36px;align-items:end}#kesNum div.hs span{padding-bottom:2px}
#kesNum small{display:block;font-size:11px;margin-top:2px;letter-spacing:.04em}
body.kur #kesDock,body.kur #kesWin{display:none}
@media (max-width:699px){
#kesDock{left:10px;top:auto;bottom:260px;gap:6px}
#kesTile{width:112px;height:72px}#kesTile b{font-size:15px}#kesTile small{font-size:11px;margin-top:1px}
#kesChips button{padding:0 10px;min-width:48px;font-size:13.5px}#kesChips>span{display:none}
#kesWin{left:8px;right:8px;width:auto;top:236px;height:auto;bottom:210px}
#kesHead b{font-size:14px}#kesFoot{font-size:12.5px;padding:7px 10px 8px}
#kesNum{right:auto;left:50%;top:252px;transform:translateX(-50%);width:200px}
#kesBody #kesNum{transform:none;left:10px;top:8px;width:170px}
body.kes-open #bodyControls,body.kes-open .icm,body.kes-open .tsg,body.kes-open #moveNote,body.kes-open #kesDock,body.kes-open #legend,body.kes-open #aoiWin,body.kes-open #worm{display:none!important}
}
@media (min-width:700px){body.kes-open #kesDock,body.kes-open #moveNote{display:none!important}}
@media (prefers-reduced-motion:reduce){#kesWin{animation:none}#kesBody>canvas,#kesRest{transition:none}}
`;
document.head.appendChild(css);

const el = (tag, attrs = {}, html = "") => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; };
const full = el("div", { id: "kesFull", hidden: "", "aria-hidden": "true" }); $("stage").after(full);
const dock = el("div", { id: "kesDock", hidden: "" });
const tile = el("button", { id: "kesTile", type: "button", "aria-label": "今の景色を、いま選んでいる体の受けとり方で見る（カメラをひらきます。映像は端末の中だけ）" },
  `<svg viewBox="0 0 150 98" preserveAspectRatio="none" aria-hidden="true"><path d="M0 66 L34 52 L58 60 L92 40 L122 54 L150 46 M0 78 L150 70" fill="none" stroke="#eef2ea" stroke-width="1" vector-effect="non-scaling-stroke"/></svg><span><b>今の景色</b><small>この目で見る</small></span>`);
const chips = el("div", { id: "kesChips", hidden: "", role: "group", "aria-label": "計算機を通して見る" },
  `<span>計算機を通す</span>` + Object.keys(CALC).map(k => `<button type="button" data-k="${k}" aria-pressed="false">${CALC[k].name}</button>`).join(""));
dock.append(tile, chips); document.body.appendChild(dock);
const win = el("section", { id: "kesWin", hidden: "", "aria-label": "今の景色の窓" },
  `<div id="kesHead"><b id="kesTitle"></b><span><label><input type="file" id="kesPick" accept="image/*" hidden>写真をえらぶ</label><button type="button" id="kesX" aria-label="窓を閉じて森へ戻る">✕</button></span></div>
<div id="kesBody"><div id="kesMsg" hidden></div><button type="button" id="kesRest" aria-live="polite"></button></div>
<div id="kesFoot"><p id="kesCap"></p><small>映像は端末の中だけで使い、送らず、残しません。歩きながらは見ず、立ち止まって。</small></div>`);
document.body.appendChild(win);
const body = win.querySelector("#kesBody"), foot = win.querySelector("#kesFoot");
const num = el("div", { id: "kesNum", hidden: "", "aria-hidden": "true" });
const video = el("video", { playsinline: "", muted: "" }); video.muted = true;

/* ---------------- 計算（WebGL。端末の中だけ） ---------------- */
const cv = el("canvas", { id: "kesCv" });
const GLA = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "high-performance" };
let gl = cv.getContext("webgl2", GLA); const gl2 = !!gl; if (!gl) gl = cv.getContext("webgl", GLA);
let ok = !!gl, HF = null, P = {}, T = {}, lowW = 0, lowH = 0, firstN = 2, flip = 0, lastStat = 0, stat = null;
const VS = "attribute vec2 p;varying vec2 u;void main(){u=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
const HEAD = `precision mediump float;varying vec2 u;uniform sampler2D src;uniform vec2 sres,dres;
vec2 cov(vec2 q){float a=dres.x/dres.y,b=sres.x/sres.y;vec2 s=a>b?vec2(1.,b/a):vec2(a/b,1.);return (q-.5)*s+.5;}
vec3 S(vec2 q){return texture2D(src,cov(q)).rgb;}
float veg(vec3 c){float s=c.r+c.g+c.b;vec3 n=c/max(s,.001);return step(.09,2.*n.g-n.r-n.b)*step(n.r+.012,n.g)*step(.12,s);}
float sky(vec3 c){float l=dot(c,vec3(.299,.587,.114));return step(.5,l)*step(c.r*1.06,c.b)*step(c.g*.97,c.b);}
`;
const FS = {
  // 小さく平均する（細かい葉のちらつきを、動きと取り違えない）
  down: HEAD + `uniform vec2 lres;void main(){vec3 c=vec3(0.);for(int i=0;i<4;i++)for(int j=0;j<4;j++)c+=S(u+(vec2(float(i),float(j))-1.5)*.25/lres);gl_FragColor=vec4(c/16.,1.);}`,
  // 状態：rgb＝少し前までの平均、a＝動いた跡
  state: `precision mediump float;varying vec2 u;uniform sampler2D cl,pl,st;uniform float alpha,decay,first;uniform vec2 thr;
void main(){vec3 c=texture2D(cl,u).rgb,p=texture2D(pl,u).rgb;vec4 s=texture2D(st,u);float m=smoothstep(thr.x,thr.y,length(c-p))*(1.-first);
gl_FragColor=vec4(mix(s.rgb,c,max(alpha,first)),max(s.a-decay,m)*(1.-first));}`,
  stat: HEAD + `uniform sampler2D cl,st;void main(){vec3 c=texture2D(cl,u).rgb;gl_FragColor=vec4(veg(c),sky(c),dot(c,vec3(.299,.587,.114)),step(.3,texture2D(st,u).a));}`,
  fin: HEAD + `uniform sampler2D cl,st;uniform int mode;uniform mat3 M;uniform float blurR,cells,cell,gain;
vec3 lin(vec3 c){return pow(c,vec3(2.2));}vec3 enc(vec3 c){return pow(clamp(c,0.,1.),vec3(.4545));}
vec3 blur(vec2 q,float r){vec3 c=vec3(0.);for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++)c+=S(q+vec2(float(i),float(j))*r/dres);return c/25.;}
void main(){vec3 c=S(u);float l=dot(c,vec3(.299,.587,.114));
if(mode==1){vec2 q=u,n=vec2(cells*dres.x/dres.y,cells);if(cells>0.)q=(floor(u*n)+.5)/n;c=blurR>0.?blur(q,blurR):S(q);c=enc(M*lin(c));
 if(cells>0.){vec2 f=fract(u*n)-.5;c*=1.-smoothstep(.36,.5,length(f))*.35;}}
else if(mode==2){vec3 a=vec3(0.);for(int i=0;i<5;i++)for(int j=0;j<5;j++)a+=texture2D(st,(vec2(float(i),float(j))+.5)/5.).rgb;c=vec3(dot(a/25.,vec3(.299,.587,.114)))*vec3(1.,.97,.9);}
else if(mode==3){c=mix(vec3(l),c,.25)*.32;}
else if(mode==4){vec2 bc=mod(floor(gl_FragCoord.xy/cell),2.);vec3 bf=bc.x<.5?(bc.y<.5?vec3(0.,1.,0.):vec3(2.,0.,0.)):(bc.y<.5?vec3(0.,0.,2.):vec3(0.,1.,0.));
 vec2 bi=fract(gl_FragCoord.xy/cell);float e=smoothstep(0.,.18,bi.x)*smoothstep(0.,.18,bi.y);c=c*mix(vec3(1.),bf*1.9,.72)*mix(.8,1.,e);}
else if(mode==5){float t=texture2D(st,u).a;vec3 k=mix(vec3(.08,.36,.40),vec3(.31,.70,.66),smoothstep(.05,.55,t));k=mix(k,vec3(.84,.96,.93),smoothstep(.6,1.,t));
 c=vec3(l)*vec3(.17,.2,.19)+k*smoothstep(.02,.22,t)*(.26+.56*t);}
else if(mode==6){float v=veg(c),s=sky(c)*(1.-v);c=vec3(l)*.5;c=mix(c,vec3(.36,.86,.47)*(.3+l*.95),v);c=mix(c,vec3(.62,.86,.95)*(.35+l*.65),s);}
else if(mode==7){vec3 d=texture2D(cl,u).rgb-texture2D(st,u).rgb;float dl=dot(d,vec3(.299,.587,.114));dl*=1.-smoothstep(.025,.08,abs(dl));c=c+gain*dl;c=mix(c,vec3(.5,.84,.79),clamp(abs(dl)*gain*.7-.05,0.,.4));}
gl_FragColor=vec4(clamp(c,0.,1.),1.);}`,
};
function glInit() {
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const vs = sh(gl.VERTEX_SHADER, VS);
  for (const k in FS) { const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS[k])); gl.bindAttribLocation(pr, 0, "p"); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    const u = {}, n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(pr, i); u[a.name] = gl.getUniformLocation(pr, a.name); } P[k] = { pr, u }; }
  const bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  if (gl2) { if (gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float")) HF = { i: gl.RGBA16F, t: gl.HALF_FLOAT }; }
  else { const e = gl.getExtension("OES_texture_half_float"); gl.getExtension("OES_texture_half_float_linear"); if (e && gl.getExtension("EXT_color_buffer_half_float")) HF = { i: gl.RGBA, t: e.HALF_FLOAT_OES }; }
  T.src = tex(); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
}
function tex() { const x = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, x); for (const [k, w] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, w); return x; }
function target(w, h, hf) {
  const mk = f => { const t = tex(); gl.texImage2D(gl.TEXTURE_2D, 0, f ? f.i : gl.RGBA, w, h, 0, gl.RGBA, f ? f.t : gl.UNSIGNED_BYTE, null); const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    const good = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; if (good) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); } return { t, fb, good, w, h }; };
  let r = mk(hf && HF); if (!r.good) { gl.deleteTexture(r.t); gl.deleteFramebuffer(r.fb); if (hf) HF = null; r = mk(null); } return r;
}
function fit(w, h) {   // 画面の大きさと、小さな計算用の面をそろえる
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; lowW = 0; }
  if (!lowW) { for (const k of ["c0", "c1", "s0", "s1", "q"]) if (T[k]) { gl.deleteTexture(T[k].t); gl.deleteFramebuffer(T[k].fb); }
    const L = open ? 192 : mob() ? 256 : 352, a = w / h; lowW = a >= 1 ? L : Math.max(64, Math.round(L * a)); lowH = a >= 1 ? Math.max(64, Math.round(L / a)) : L;
    T.c0 = target(lowW, lowH); T.c1 = target(lowW, lowH); T.s0 = target(lowW, lowH, true); T.s1 = target(lowW, lowH, true); T.q = target(32, 18); firstN = 2; flip = 0; }
}
const use = (k, fb, w, h) => { const p = P[k]; gl.useProgram(p.pr); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h); return p.u; };
const bind = (i, t) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); };
const tr3 = m => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];   // 行ならび → GLSL の列ならび
const px = new Uint8Array(32 * 18 * 4);
/* 一こま：src（映像・写真・森の画面）→ 小さく平均 → 状態 → 画面 */
function step(srcEl, sw, sh, w, h, mode, upload = true) {
  if (!ok || !sw || !sh) return;
  try {
    fit(w, h);
    bind(0, T.src); if (upload) { gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcEl); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); }
    const cl = flip ? T.c1 : T.c0, pl = flip ? T.c0 : T.c1, sN = flip ? T.s1 : T.s0, sO = flip ? T.s0 : T.s1; flip ^= 1;
    let u = use("down", cl.fb, lowW, lowH); gl.uniform1i(u.src, 0); gl.uniform2f(u.sres, sw, sh); gl.uniform2f(u.dres, w, h); gl.uniform2f(u.lres, lowW, lowH); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    u = use("state", sN.fb, lowW, lowH); bind(1, cl.t); bind(2, pl.t); bind(3, sO.t); gl.uniform1i(u.cl, 1); gl.uniform1i(u.pl, 2); gl.uniform1i(u.st, 3);
    gl.uniform1f(u.alpha, .07); gl.uniform2f(u.thr, open ? .085 : .035, open ? .26 : .16);   // 手で持ったカメラは細かくゆれるので、窓では差の下限を上げる
     gl.uniform1f(u.decay, HF ? .006 : .012); gl.uniform1f(u.first, firstN > 0 ? 1 : 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); if (firstN > 0) firstN--;
    const now = performance.now();
    if ((mode === 5 || mode === 6) && now - lastStat > 280) { lastStat = now; u = use("stat", T.q.fb, 32, 18); bind(1, cl.t); bind(3, sN.t); gl.uniform1i(u.cl, 1); gl.uniform1i(u.st, 3); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.readPixels(0, 0, 32, 18, gl.RGBA, gl.UNSIGNED_BYTE, px); let v = 0, s = 0, m = 0; const hist = new Array(12).fill(0); for (let i = 0; i < px.length; i += 4) { v += px[i]; s += px[i + 1] * (px[i] < 128 ? 1 : 0); hist[Math.min(11, px[i + 2] * 12 >> 8)]++; m += px[i + 3]; }
      const n = 576 * 255; stat = { veg: v / n, sky: s / n, move: m / n, hist }; showNum(mode); }
    u = use("fin", null, w, h); bind(0, T.src); bind(1, cl.t); bind(3, sN.t); gl.uniform1i(u.src, 0); gl.uniform1i(u.cl, 1); gl.uniform1i(u.st, 3); gl.uniform2f(u.sres, sw, sh); gl.uniform2f(u.dres, w, h);
    const L = LENS[lens] || LENS.hito; gl.uniform1i(u.mode, mode); gl.uniformMatrix3fv(u.M, false, new Float32Array(tr3(L.m)));
    gl.uniform1f(u.blurR, lens === "inu" ? 2.4 * (h / 520) : 0); gl.uniform1f(u.cells, lens === "hachi" ? 48 : 0); gl.uniform1f(u.cell, Math.max(3, Math.round(h / 150))); gl.uniform1f(u.gain, HF ? 9 : 5);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  } catch (e) { ok = false; console.warn("keshiki", e); calcOff(); }
}
function showNum(mode) {
  if (!stat) return; const pc = x => Math.round(x * 100) + "%";
  if (mode === 5) num.innerHTML = `<div class="mv"><span>動いた所</span><i><b style="width:${pc(Math.min(1, stat.move * 2.5))}"></b></i><em>${pc(stat.move)}</em></div><small>ここ数秒で動いた所の割合（計算）</small>`;
  else { if (!num.querySelector("canvas")) num.innerHTML = `<div class="vg"><span>緑</span><i><b></b></i><em></em></div><div class="sk"><span>空</span><i><b></b></i><em></em></div><div class="hs" style="grid-template-columns:3.6em 1fr"><span>明るさ</span><canvas width="96" height="30"></canvas></div><small>色からの推定（暗い ← 明るさの分布 → 明るい）</small>`;
    num.querySelector(".vg b").style.width = pc(stat.veg); num.querySelector(".vg em").textContent = pc(stat.veg); num.querySelector(".sk b").style.width = pc(stat.sky); num.querySelector(".sk em").textContent = pc(stat.sky);
    const c = num.querySelector("canvas"), g = c.getContext("2d"), mx = Math.max(...stat.hist, 1); g.clearRect(0, 0, 96, 30); g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, 29, 96, 1); g.fillStyle = "#fff"; stat.hist.forEach((n, i) => { const hh = Math.max(1, Math.round(n / mx * 28)); g.fillRect(i * 8 + 1, 29 - hh, 6, hh); }); }
  num.hidden = false;
}

/* ---------------- 状態と切りかえ ---------------- */
let lens = U.lens, open = false, calc = null, stream = null, photo = null, photoNew = false, lastV = 0, restT = 0, restOff = 0, said = false;
const MODE = { hito: 0, hachi: 1, chou: 1, tori: 1, inu: 1, mimizu: 2, hebi: 3, koumori: 3, netsu: 3, camera: 4 }, CM = { ugoki: 5, kazu: 6, yure: 7 };
const modeNow = () => lens === "camera" && calc ? CM[calc] : MODE[lens] || 0;
function place() {   // 計算の画面を置く場所：窓がひらいていれば窓の中、とじていて計算機を通していれば森の全面
  const forest = !open && !!calc;
  if (open) { if (cv.parentNode !== body) body.prepend(cv); body.append(num); } else if (forest) { full.append(cv, num); }
  full.hidden = !forest; lowW = 0; num.hidden = true; num.innerHTML = ""; stat = null; lastStat = 0;
  if (open) { foot.prepend(chips); } else dock.append(chips);
}
function refresh() {
  const cam = lens === "camera", um = U.chapter === "umwelt";
  chips.hidden = !cam || !um; chips.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === calc)));
  dock.hidden = !um || !ok || !$("boot").hidden;
  if (open) { $("kesTitle").textContent = "今の景色 ── " + (lens === "hito" ? "カメラの画" : NAME(lens) + (cam && calc ? "・" + CALC[calc].name : MODE[lens] === 3 ? (lens === "koumori" ? "（反響は写りません）" : "（熱は写りません）") : "の模式"));
    $("kesCap").textContent = cam && calc ? CALC[calc].cap : CAP[lens] || ""; }
  if (!open && cam && calc && um) { const lg = $("legend"); lg.innerHTML = CALC[calc].legend; lg.hidden = false; }
  lay();
}
function calcOff() { if (!calc) return; calc = null; place(); if (lens === "camera") { G.uMode.value = LENS.camera.mode; const lg = $("legend"); lg.innerHTML = LENS.camera.legend; } refresh(); }
function setCalc(k) {
  if (!ok) return;
  if (calc === k) { calcOff(); return; }
  calc = k; place(); refresh(); firstN = 2;
  U.talk?.(CALC[k].say, []); if (open) rest(k, 15000); else setTimeout(() => { if (calc === k && !open) toastUp(UP[k]); }, 16000);
}
function toastUp(t) { U.talk?.([t], []); try { navigator.vibrate?.(40); } catch (e) {} }
chips.addEventListener("click", e => { const b = e.target.closest("button"); if (b) setCalc(b.dataset.k); });

function rest(key, ms) {   // 見たあとは画面を静め、自分の目で確かめる間（体験の芯）
  clearTimeout(restT); clearTimeout(restOff); body.classList.remove("rest");
  restT = setTimeout(() => { if (!open || document.hidden) return; $("kesRest").textContent = "碧：" + (UP[key] || UP.hito); body.classList.add("rest"); try { navigator.vibrate?.(40); } catch (e) {} restOff = setTimeout(() => body.classList.remove("rest"), 12000); }, ms);
}
$("kesRest").onclick = () => { clearTimeout(restOff); body.classList.remove("rest"); };

function msg(html) { const m = $("kesMsg"); m.hidden = !html; m.innerHTML = html || ""; if (html) { const i = m.querySelector("input"); if (i) i.onchange = pick; } }
async function openWin() {
  if (open || !ok) return; open = true; document.body.classList.add("kes-open"); win.hidden = false; place(); refresh(); $("kesX").focus({ preventScroll: true });
  msg(`<div>カメラをひらいています。<br><label><input type="file" accept="image/*" hidden>写真をえらぶ</label><small>カメラを使わないときは、写真を一枚。えらばなくても、森の中で体験できます。</small></div>`);
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera api");
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    if (!open || photo) { stopCam(); return; }   // 待つあいだに写真をえらんだら、写真のまま
    video.srcObject = stream; await video.play().catch(() => {}); msg(""); photo = null;
    if (!said) { said = true; U.talk?.(["窓に、今いる場所の景色が映ります。上の並びで体をえらぶと、同じ景色がその受けとり方の模式に変わります。"], []); }
    rest(calc && lens === "camera" ? calc : lens, 16000);
  } catch (e) {
    stream = null; if (!open) return;
    msg(`<div>カメラをひらけませんでした。<br>写真を一枚えらぶと、同じ目で見られます。<br><label><input type="file" accept="image/*" hidden>写真をえらぶ</label><small>えらばなくても、森の中で体験できます。写真は端末の中だけで使います。</small></div>`);
  }
  requestAnimationFrame(vloop);
}
function stopCam() { if (stream) { for (const t of stream.getTracks()) t.stop(); stream = null; } video.srcObject = null; }
function closeWin() {
  if (!open) return; open = false; stopCam(); photo = null; clearTimeout(restT); clearTimeout(restOff); body.classList.remove("rest"); win.hidden = true; document.body.classList.remove("kes-open"); msg("");
  place(); refresh(); tile.focus({ preventScroll: true });
}
async function pick(e) {
  const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; let im;
  try { im = await createImageBitmap(f); } catch (_) { try { im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(f); }); } catch (e2) { return; } }
  const k = Math.min(1, 1280 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
  if (im.close) im.close(); else URL.revokeObjectURL(im.src);
  stopCam(); photo = c; photoNew = true; firstN = 2; msg(""); rest(calc && lens === "camera" ? calc : lens, 14000);
}
$("kesPick").onchange = pick;
tile.onclick = openWin; $("kesX").onclick = closeWin;
addEventListener("keydown", e => { if (e.key === "Escape" && open) closeWin(); });
addEventListener("pagehide", stopCam);
document.addEventListener("visibilitychange", () => { if (document.hidden && open && stream) closeWin(); });   // 画面を離れたらカメラを止める

function vloop(now) {
  if (!open) return; requestAnimationFrame(vloop);
  if (document.hidden || now - lastV < 30) return; lastV = now;
  const live = stream && video.readyState >= 2 && video.videoWidth, src = live ? video : photo; if (!src) return;
  const d = Math.min(devicePixelRatio || 1, 1.5), w = Math.max(2, Math.round(body.clientWidth * d)), h = Math.max(2, Math.round(body.clientHeight * d));
  step(src, live ? video.videoWidth : photo.width, live ? video.videoHeight : photo.height, w, h, modeNow(), live || photoNew || cv.width !== w || cv.height !== h); photoNew = false;
}
/* 置き場所：スマホは凡例と字幕の上、PC は左 */
function lay() {
  if (!mob()) { dock.style.bottom = ""; win.style.top = win.style.bottom = ""; win.style.height = open ? Math.round(Math.max(260, Math.min(470, $("guide").getBoundingClientRect().top - 236 - 12))) + "px" : ""; return; }
  win.style.height = "";
  const gt = $("guide").getBoundingClientRect().top, lg = $("legend"), lt0 = !lg.hidden && lg.offsetHeight ? lg.getBoundingClientRect().top : gt, lt = lt0 > innerHeight * .5 ? lt0 : gt;   // 凡例が上に出る体（ミツバチ）では、字幕の上に置く
  dock.style.bottom = Math.round(innerHeight - Math.min(gt, lt) + 8) + "px";
  if (open) { const wb = $("where").getBoundingClientRect().bottom; win.style.top = Math.round(Math.max(170, Math.min(wb + 8, innerHeight * .34))) + "px"; win.style.bottom = Math.round(innerHeight - gt + 8) + "px"; }
}
setInterval(() => { if ((U.chapter !== "umwelt" || document.body.classList.contains("kur")) && (open || calc)) { closeWin(); calcOff(); } refresh(); }, 500);
addEventListener("resize", () => { lowW = 0; lay(); });

/* 森の側から呼ばれる */
window.__kes = {
  after() {   // 森を一こま描いたすぐあと：計算機を通す画面を、その画から作る
    if (open || !calc || lens !== "camera" || !ok) return;
    if (G.uMode.value !== 0) G.uMode.value = 0;   // 格子の模式でなく、写った画そのものを計算に渡す
    const c = U.renderer.domElement, cmp = $("cmpBtn").getAttribute("aria-pressed") === "true"; full.style.visibility = cmp ? "hidden" : "";
    step(c, c.width, c.height, c.width, c.height, CM[calc]);
  },
  lens(id) {
    const was = lens; lens = id;
    if (id !== "camera" && calc) { calc = null; place(); }
    if (open && was !== id) { firstN = 2; rest(id, 15000); }
    refresh();
  },
  get state() { return { open, calc, lens, ok, hf: !!HF, live: !!stream, photo: !!photo, stat }; }, openWin, closeWin, setCalc,
};
try { if (ok) glInit(); } catch (e) { ok = false; console.warn("keshiki", e); }
place(); refresh();

/* Qualia/AI v1（2026-11-11）。知識は出典つきの模式。数値は出典の範囲だけを使う。
   頁の典拠は原本で確かめたものだけを書く（未確認は「頁未確認」と残す＝捏造しない）。 */
import * as THREE from "./vendor/three.module.min.js";

const BIB={
 peitsch:"Peitsch ほか 1992, J Comp Physiol A 170:23–40",
 frisch:"von Frisch『The Dance Language and Orientation of Bees』1967",
 srini:"Srinivasan & Lehrer 1984, J Comp Physiol A 155:297–312",
 dreller:"Dreller & Kirchner 1993, J Comp Physiol A 173:275–279",
 griffin:"Griffin『Listening in the Dark』1958",
 jones:"Jones & Holderied 2007, Proc R Soc B 274:905–912",
 uex:"ユクスキュル・クリサート『生物から見た世界』1934（岩波文庫 日高・羽田訳 2005）",
 sonen:"Sonenshine & Roe 編『Biology of Ticks』第2版 2014",
 neitz:"Neitz・Geist・Jacobs 1989, Visual Neuroscience 3:119–125",
 heffner:"Heffner 1983, Behav Neurosci 97:310–318",
 quignon:"Quignon ほか 2005, Genome Biology 6(10):R83",
 darwin:"ダーウィン『The Formation of Vegetable Mould through the Action of Worms』1881",
 bayer:"Bayer 1976, 米国特許 3,971,065",
 butler:"Butler ほか 1959, PNAS 45:1703–1708",
 christie:"Christie 2007, Annu Rev Plant Biol 58:21–45",
 braam:"Braam 2005, New Phytologist 165:373–389",
 mcclung:"McClung 2006, Plant Cell 18:792–803",
 bowmaker:"Bowmaker & Dartnall 1980, J Physiol 298:501–511",
 
 vollmer:"Vollmer & Möllmann『Infrared Thermal Imaging』第2版 2017"
};
// light/sound は [下,上]（nm／Hz）。0 は受けない。
const M={
 bee:{n:"ミツバチ",col:[0xb4a2ff,0x78d6ec,0x7fe0b4],light:[300,650],sound:[0,0],light_t:"紫外〜緑",sound_t:"近くの空気のふるえ",time:"速い動きも見分ける",
  intro:"ミツバチの受けとり方に切りかえました。花には、人に見えない紫外の模様があります。",
  a:{see:["紫外・青・緑の三つの手がかりで色を分けます（感度の山は約344・436・544nm）。花の紫外の模様（多くの黄色い花の例をもとにした模式）は、目立つ手がかりです。","peitsch"],
     nosee:["赤は、この受けとり方では暗く沈みます。人の言う「赤」の手がかりは、ここにはありません。","peitsch"],
     time:["人の時計は持ちませんが、体の中に約一日の周期があります。太陽の動きを時刻で補いながら、太陽の位置と空の偏光で方角をとる、と記録されています。","frisch"],
     hear:["空気の音を人の耳のようには受けとりません。触角の付け根の器官で、近くの空気のふるえを受ける記録があります。","dreller"],
     smell:["触角でにおいを受けとります。花のにおいと、仲間のにおいが主な手がかりです。","frisch"],
     you:["たとえばあなたが赤い服なら、この模式では暗く見えているかもしれません。","peitsch"],
     away:["小さな目の集まりで、形の細かさは人より粗い、とこの模式では置いています。",""],
     move:["速いちらつきや動きを人より細かく分ける、という測定があります。","srini"]}},
 bat:{n:"コウモリ",col:[0x3a4360,0x78d6ec,0xa8f2f6],light:[0,0],dim:"明暗は受ける（色は扱わない）",sound:[10000,200000],light_t:"目で明暗",sound_t:"人の耳より高い声（種による）",time:"声とこだまの間のわずかな差",
  intro:"コウモリ（超音波で探る種）に切りかえました。自分の声のこだまで、暗い中の形をつかみます。",
  a:{see:["自分の出した声のこだまで、前の物の形と距離をつかみます。声の高さは種によって幅があり、多くは約10kHz より高く、100kHz を超える種もあります。","jones"],
     nosee:["人に聞こえる高さの音の多くは、この模式の狩りの手がかりではありません。目も使いますが、この模式の中心は色ではありません。",""],
     time:["声を出してこだまが返るまでの短い間が、距離の手がかりです。","griffin"],
     hear:["多くの種は、人の耳の上限（約20kHz）より高い声を出し、そのこだまを受けとります。","griffin"],
     smell:["においも使いますが、この模式の中心はこだまです。","griffin"],
     you:["あなたは、こだまの返り方で、大きくて動く面として現れる、と考えられます（模式）。","griffin"],
     away:["こだまの届く距離は種や獲物の大きさで大きく変わり、遠くはまだ手がかりになりません。","jones"],
     move:["近づく獲物ほど声の間を詰めて、細かく追います。","griffin"]}},
 tick:{n:"マダニ",col:[0xf4aa96,0xf2cf8c,0x8f9bb4],light:[0,0],sound:[0,0],light_t:"目の無い種も多い",sound_t:"受けない",time:"獲物を待つ、とても長い時間",
  intro:"マダニの受けとり方の模式です。目の無い種も多いので、画面は暗いまま。手がかりは、におい・あたたかさ・触れた感じです。",
  a:{see:["目の無い種も多く、目がある種も明暗を受ける程度です。","sonen"],
     nosee:["色も形も、この受けとり方にはありません。あるのは、におい・あたたかさ・触れた感じの三つ。","uex"],
     time:["時刻はありません。手がかりが来るまで、とても長く待ちます。研究室で18年生きた例をユクスキュルが書いています。","uex"],
     hear:["音の手がかりは、この受けとり方にはありません。","uex"],
     smell:["哺乳類の皮膚から出る酪酸のにおいが、落ちる合図になる、とユクスキュルは書きました。（いまの研究では、前脚のハラー器官で二酸化炭素や熱などを受けることが重視されています。）","sonen"],
     you:["あなたは、におい・あたたかさ・毛の感触の三つだけの存在として現れます。","uex"],
     away:["遠くという手がかりは、ほとんどありません。","uex"],
     move:["動きそのものより、におい・あたたかさの変化が合図です。","uex"]}},
 dog:{n:"犬",col:[0x5cc8e0,0xf2cf8c,0x8f9bb4],light:[400,680],sound:[67,45000],light_t:"青と黄の二つ",sound_t:"約67Hz〜45kHz",time:"においの濃さに残る、少し前の出来事",
  intro:"犬に切りかえました。この世界は、姿より先に、においでできています。",
  a:{see:["色の手がかりは青と黄の二つの系統（感度の山は約429・555nm）。人が赤と緑と呼ぶものの区別は付きにくい。","neitz"],
     nosee:["赤と緑の違いは、この受けとり方には薄い。","neitz"],
     time:["時計の時刻は持ちません。この模式では、においの濃い・薄いを、時間の手がかりとして仮に置いています。",""],
     hear:["人より高い音まで受けとります（約45kHz まで）。","heffner"],
     smell:["においを受けとる壊れていない（はたらきうる）遺伝子が 800 個以上あると報告されています。この模式の世界は、においの道でできています。","quignon"],
     you:["あなたは、姿より先に、においとして現れるのかもしれません。",""],
     away:["遠くの見え方の細かさは、この模式ではまだ扱いません。色の系統が二つであることだけを置いています。","neitz"],
     move:["色より、明暗と動きが手がかりになります。","neitz"]}},
 worm:{n:"ミミズ",col:[0x6c8d71,0xd6c09b,0x864e4c],light:[0,0],sound:[0,0],light_t:"皮膚で明暗だけ",sound_t:"土を伝わる振動",time:"昼と夜、湿りと乾き",
  intro:"ミミズに切りかえました。目は無く、土のふるえと湿りが世界の大部分です。",
  a:{see:["目はありません。皮膚で光の強さを受け、明るいと土へ戻る、とダーウィンは観察しました。","darwin"],
     nosee:["形や色は、この受けとり方にはありません。","darwin"],
     time:["時刻ではなく、暗さと湿り。夜に地表へ出ることが多いと観察されています。","darwin"],
     hear:["空気の音にはほとんど反応せず、土を伝わる振動には強く反応した、とダーウィンは書いています。","darwin"],
     smell:["葉のにおいや味の違いを選び分けた観察があります。","darwin"],
     you:["あなたは、足音の振動として現れます。","darwin"],
     away:["遠くは無く、触れている土の湿りと固さが世界の大部分です。","darwin"],
     move:["土のふるえが、近づくものの合図です。","darwin"]}},
 plant:{n:"植物",col:[0x7fe0b4,0xf4aa96,0x6c8d71],light:[400,750],sound:[0,0],light_t:"青と、赤・遠赤の比",sound_t:"受けない（触れる刺激は受ける）",time:"約一日の内部の周期",
  intro:"植物に切りかえました。主体かどうかは決めずに、光や接触への応じ方を研究の記録から組み立てた模式として話します。",
  a:{see:["見るのではなく、光の色に応じます。赤い光と、それより長い光の割合、そして青い光が手がかりです（赤 約660nm・遠赤 約730nm＝フィトクロム、青＝フォトトロピン）。","butler"],
     nosee:["形や遠くの姿という手がかりは、この模式にはありません。赤や遠赤、青の光には応じますが、音の手がかりは記録に乏しい。","christie"],
     time:["約一日の周期の内部の時計を持ち、夜明け前から準備を始める、と記録されています。","mcclung"],
     hear:["音を聴く器官はありません。触れられる・揺らされる刺激で、育ち方が変わる記録はあります。","braam"],
     smell:["におい物質への応答の研究はありますが、この模式ではまだ扱いません。",""],
     you:["あなたは、光をさえぎる影や、触れる刺激として現れるかもしれません。","braam"],
     away:["遠くという手がかりは、この模式では扱いません。光の色の割合に応じることだけを置いています。","butler"],
     move:["動くのではなく、光の向きへ伸びます（青い光が手がかり）。","christie"]}},
 human:{n:"人",col:[0xeef5fb,0x9bdcf0,0xf2cf8c],light:[380,780],sound:[20,20000],light_t:"約380〜780nm",sound_t:"約20Hz〜20kHz",time:"時計と記憶と予定",
  intro:"人の受けとり方も、ほかと並べた一つの模式として話します。",
  a:{see:["三種の錐体（感度の山は約420・534・564nm）で色を分けます。","bowmaker"],
     nosee:["紫外・赤外・超音波は、この受けとり方にはありません。",""],
     time:["時計という道具で時刻を共有し、記憶と予定で前後へ広げます。",""],
     hear:["低い音から高い音まで、およそ一定の範囲を聴きます（範囲は人によって違います）。",""],
     smell:["においも受けとりますが、多くの場面で見えるものが先に立ちます。",""],
     you:["あなた自身の受けとり方です。ほかと並べると、一つの範囲だと分かります。",""],
     away:["遠くの細かい形を分けるのが得意な受けとり方です。",""],
     move:["速すぎるちらつきは、つながって見えます。",""]}},
 cam:{n:"カメラ",col:[0xb4a2ff,0xeef5fb,0x5cc8e0],light:[400,700],sound:[0,0],light_t:"赤・緑・青のフィルター",sound_t:"記録しない",time:"一秒を数十の静止画に切る",
  intro:"カメラは感じません。光を数として記録する受けとり方として話します。",
  a:{see:["素子の上に赤・緑・青のフィルターが格子に並び、光の量を数として記録します。","bayer"],
     nosee:["シリコンの素子は、目に見えない近赤外の一部にも反応しますが、ふつうはフィルターで切っています。におい・あたたかさは記録しない。",""],
     time:["時間を、一秒に何十枚かの静止画に切って記録します。こまとこまの間のことは残りません。",""],
     hear:["この機械は音を記録しません（マイクは別の機械です）。",""],
     smell:["においを記録する仕組みはありません。",""],
     you:["あなたは、画素の数の並びとして記録されています。意味づけは、この機械の外で行われます。",""],
     away:["遠くはレンズで決まります。暗いところは数が粗く、ざらつきになります。",""],
     move:["こまとこまの間の動きは記録されず、速い動きはぶれになります。",""]}},
 sensor:{n:"熱センサー",col:[0xf4aa96,0xf2cf8c,0x3a4360],light:[0,0],sound:[0,0],light_t:"帯の外：約8〜14µm の赤外",sound_t:"記録しない",time:"温度の値を一定の間隔で記録",
  intro:"熱センサーは感じません。ものの出す赤外線を温度の値として記録する受けとり方として話します。",
  a:{see:["約8〜14µm の赤外線の量を受け、放射率を仮に置いて温度に換算して記録します。暗くても記録できます。","vollmer"],
     nosee:["色も、ガラスの向こうも記録しません（ガラスはこの赤外線をほとんど通さない）。","vollmer"],
     time:["一定の間隔で温度の値を記録します。いつ温まり、いつ冷めたかが残ります。","vollmer"],
     hear:["音は記録しません。",""],
     smell:["においは記録しません。",""],
     you:["あなたは、まわりよりあたたかい形として記録されています。","vollmer"],
     away:["遠いほど一つの画素が広い面を含み、温度がならされます。","vollmer"],
     move:["温度の形が動くことで、動きが記録されます。",""]}}
};
const RED={bee:["赤い花は、色としては分けにくいけれど、明暗の差や紫外の模様で見つけられます。","peitsch"],bat:["色の問いは、この模式の中心ではありません。こだまで形と距離をとります。",""],tick:["色の手がかりは、この受けとり方にはありません。",""],dog:["赤と緑は見分けにくく、青と黄の違いが手がかりです。","neitz"],worm:["色の手がかりは無く、明るいか暗いかを皮膚で受けます。","darwin"],plant:["赤と遠赤の光の割合に応じます（フィトクロム）。","butler"],human:["赤・緑・青の三つの錐体の組み合わせで、たくさんの色を分けます。","bowmaker"],cam:["赤・緑・青のフィルターの数の組み合わせとして、色を記録します。","bayer"],sensor:["色は記録しません。温度の違いだけを記録します。","vollmer"]};
const ORDER=["bee","bat","tick","dog","worm","plant","human","cam","sensor"];
const QS=[["see","何が見える？"],["nosee","受けとれないものは？"],["time","この模式の時間は？"],["hear","音は？"],["smell","においは？"],["you","わたしはどう見える？"],["away","遠くは？"],["move","動きは？"]];
// 意味の近さ：問いの型ごとの同義語（ひらがなに寄せてから照らす）
const SYN={
 nosee:["聞こえない","きこえない","嗅げない","みえない","見えない","わからない","分からない","できない","にがて","苦手","無いもの","ないもの","とどかない","届かない","うけとれない","受けとれない","補集合","範囲外","知らない","見えません","気づかない","無理","足りない","欠けて","見落と","外側"],
 see:["みえ","見え","見る","みる","光","ひかり","形","かたち","景色","けしき","ながめ","眺め","紫外","赤外","まぶし","暗い","くらい","明るい","あかるい","見えて","見れる","見られ","どう映","映って","うつって","目には","目で","視界","姿","光って","明暗","どう見え","何が見え","なにが見え","見せて"],
 time:["何時","なんじ","時間","じかん","いつ","朝","あさ","昼","夜","よる","季節","待つ","時計","周期","とけい","一日","いちにち","寿命","まって","長生き","早い時間","時の流れ"],
 hear:["音","おと","聞","聴","きこ","声","こえ","こだま","反響","超音波","うるさ","しずか","静か","振動","しんどう","ふるえ","揺れ","聞こえ","きこえ","聴こえ","耳","みみ","響"],
 smell:["鼻","嗅覚","におい","におう","におっ","匂","臭","くさい","嗅","かぐ","かおり","香","香り","フェロモン","酪酸","花の香","しっぽの","足跡","あしあと","においの道"],
 red:["色","いろ","赤","あか","紫","むらさき","黄色","きいろ","緑","みどり","花の色","はなのいろ"],
 you:["わたし","私","ぼく","僕","おれ","俺","自分","じぶん","あなたから","人間は","こっち","あたし","私たち","わたしたち","僕ら","君から見て","わたしの姿","私の姿","わたしを"],
 away:["遠く","とおく","距離","きょり","どこまで","向こう","むこう","はるか","地平","空の上","離れた","はなれた","奥","届く範囲","視力","細か","くっきり","ぼんやり","ぼやけ","解像"],
 move:["動き","うごき","動く","うごく","速い","速く","はやい","はやく","飛","とぶ","ちらつき","ぶれ","追う","追え","おいかけ","飛ぶ","飛んで","走る","はしる","止まって","じっと","すばや"],
 who:["だれ","誰","何者","なにもの","心がある","意識","感じるの","あなたは","きみは","君は","名前","なまえ","AI"],
 out:["味","あじ","痛","いた","夢","ゆめ","好き","すき","嫌い","きらい","うれし","嬉し","悲し","かなし","考え","心","こころ","気持ち","感情","寂し","さびし","天気","明日","大きすぎ","小さすぎ","宇宙","あした","ニュース","計算","おいし","まず","あまい","からい","食べ","たべ"]
};
const kata2hira=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
function classify(t){
  const h=kata2hira(t.normalize("NFKC"));const sc={};
  for(const [k,ws] of Object.entries(SYN))for(const w of ws){const ww=kata2hira(w);if(h.includes(ww))sc[k]=(sc[k]||0)+Math.max(2,ww.length)}
  // 否定（見えない等）は see より先に立てる
  if(sc.nosee&&sc.see)sc.nosee+=sc.see;
  if(sc.out)sc.out+=4;
  if(sc.you&&sc.see)sc.you+=sc.see+2;
  if(sc.red&&sc.see)sc.red+=sc.see;
  if(sc.away&&sc.see)sc.away+=sc.see;
  if(sc.who&&Object.keys(sc).length>1)delete sc.who;
  let best=null,b=0;for(const [k,v] of Object.entries(sc))if(v>b){b=v;best=k}
  return b>=2?best:null;
}
// 模式の名を言われたら切りかえる
function modeIn(t){const h=kata2hira(t);for(const k of ORDER){if(h.includes(kata2hira(M[k].n)))return k}
  if(/はち|蜂/.test(h))return"bee";if(/こうもり|蝙蝠/.test(h))return"bat";if(/だに|ダニ/.test(t))return"tick";if(/いぬ|わん|dog/.test(h))return"dog";if(/みみず/.test(h))return"worm";if(/草|木|しょくぶつ/.test(h))return"plant";if(/サーモ|温度センサー/.test(t))return"sensor";return null}

let cur="bee",outN=0;
const $=s=>document.querySelector(s);
const say=(t,k)=>{const e=$("#say");e.style.opacity=.25;const det=[];t=t.replace(/（[^）]*）/g,m=>{det.push(m.slice(1,-1));return""});e.innerHTML=t+(det.length?`<details><summary>＋</summary>${det.join("／")}</details>`:"")+(k&&BIB[k]?`<small>出典：${BIB[k].split(/[,，]/)[0].replace(/『.*』/,' ')}</small>`:"");requestAnimationFrame(()=>requestAnimationFrame(()=>e.style.opacity=1))};
let lastK=null;
const WHY={peitsch:"ミツバチの目の細胞が、どの色の光に応じるかを電気で測った研究があるからです。",frisch:"巣の中の踊りと、太陽や空の向きとの関係を、長く観察した記録があるからです。",srini:"ちらつく光をミツバチが見分けられるかを、行動で試した実験があるからです。",dreller:"触角の付け根の器官が、空気のふるえに応じるかを測った研究があるからです。",griffin:"コウモリの声を、人に聞こえる高さに変えて録った実験の記録があるからです。",jones:"多くの種のコウモリの声を比べてまとめた研究があるからです。",uex:"ユクスキュルがマダニの行動を観察して書いた記録があるからです。",sonen:"マダニの体のつくりと感覚をまとめた研究書があるからです。",neitz:"犬の目の細胞が、どの色の光に応じるかを測った研究があるからです。",heffner:"犬が聞き分けられる音の高さを、行動で試した実験があるからです。",quignon:"犬の遺伝子を読み、においを受けとる遺伝子を数えた研究があるからです。",darwin:"ダーウィンが、光や振動にミミズがどう応じるかを長く観察した記録があるからです。",butler:"植物が赤と遠赤の光で切りかわる色素を見つけた研究があるからです。",christie:"青い光を受けとる植物の色素をまとめた研究があるからです。",braam:"触れられた植物の育ち方の変化をまとめた研究があるからです。",mcclung:"植物の一日の周期の仕組みをまとめた研究があるからです。",bowmaker:"人の目の細胞が、どの色の光に応じるかを測った研究があるからです。",bayer:"色のフィルターを格子に並べる仕組みの特許があるからです。",vollmer:"赤外線で温度を記録する仕組みをまとめた教科書があるからです。"};
function answer(k){lastK=k;const [t,s]=M[cur].a[k];say(t,s)}
const GO=k=>`<button class="go" data-k="${k}">${M[k].n}に切りかえる</button>`;
const NEAR=[[/蝶|ちょう|虫|むし|ハエ|トンボ/,"bee"],[/猫|ねこ|ネコ|狐|たぬき|タヌキ/,"dog"],[/土の中|地面の下|もぐら|モグラ/,"worm"]];
const ANIMAL=/鳥|蝶|猫|ねこ|魚|蛇|へび|ヘビ|ネコ|サカナ|カラス|スズメ|ハト|トンボ|モグラ|土の中|^とり|^虫|虫の|^むし/;
let fbN=0;
const TRY=[["smell","においは？"],["see","何が見える？"],["away","遠くは？"],["move","動きは？"]];
function outside(){const cs=CH[cur],k=cs[(fbN++)%cs.length],l=QL[k];say(`そのことは、${M[cur].n}の模式では分かりません。代わりに、こちらはどうですか。<button class="go" data-a="${k}">${l}</button>`)}
function free(t){
  const mk=modeIn(t),k=classify(t);
  if(/今何時|いま何時|何時\?|何時？|なんじ/.test(t)){const d=new Date();say(`いまは ${d.getHours()} 時 ${d.getMinutes()} 分（この端末の時計）。${M[cur].n}の模式では──${M[cur].a.time[0]}`,M[cur].a.time[1]);return}
  if(/機械は感じ|AIは感じ|ＡＩは感じ/.test(t)){say("この AI も、カメラや熱センサーも感じません。光や温度を数として記録し、その記録から組み立てた模式で話します。");return}
  if(/寂し|さびし|こわい|怖い|かなし|悲し|つらい/.test(t)){say("そう感じることもありますね。この AI は気持ちを持たないので、受けとり方の話でお返しします。下の問いからどうぞ。");return}
  if(/違い|違う|ちがい|ちがう|比べ|くらべ|との差/.test(t)){const two=ORDER.filter(x=>t.includes(M[x].n)).sort((x,y)=>t.indexOf(M[x].n)-t.indexOf(M[y].n));let a0=cur,o=mk&&mk!==cur?mk:(cur==="human"?"bee":"human");if(two.length>=2){a0=two[0];o=two[1]}if(o==="human"||a0==="human"){compare(a0==="human"?o:a0,"human");return}const A=M[a0],B=M[o];
    say(`${A.n}：光は${A.light_t}、音は${A.sound_t}。<br>${B.n}：光は${B.light_t}、音は${B.sound_t}。${GO(o)}`);return}
  if(mk&&mk!==cur&&!/違い|違う|比べ/.test(t)){setMode(mk);if(!k){const[a,b]=M[mk].a.see;say(M[mk].intro+"<br>"+a,b);return}}
  if(/心がある|心はある|意識/.test(t)){say("この AI は、感じる心を持つとは言えません。生き物や機械の受けとり方を、研究の記録から組み立てた模式に切りかえて話します。");return}
  if(/痛|眠|好き|きらい|嫌い|考えて|楽し|うれし|嬉し|心は/.test(t)){say(`${M[cur].n}の模式は、感じる心を持つとは言えません。言えるのは、何を手がかりとして受けとるかです。<button class="go" data-a="see">何が見える？</button>`);return}
  if(/夜|よる|暗い|くらい/.test(t)&&/見え|みえ/.test(t)&&!(typeof ANIMAL!=="undefined"&&ANIMAL.test(t)&&!modeIn(t))){const L={bee:"暗いと色の手がかりは弱まります。この模式の多くは昼に動きます。",bat:"暗くても、声のこだまで形をつかみます。",tick:"もともと明暗くらいしか受けないので、夜も同じ手がかり（におい・熱）で待ちます。",dog:"人より暗いところに強い目だとされますが、この模式ではにおいが先です。",worm:"夜の暗さが、地表へ出る合図になると観察されています。",plant:"夜は光が無く、内部の周期で次の朝に備えます。",human:"暗いと色が分かりにくくなり、明暗が主になります。",cam:"暗いと光の数が少なく、ざらつきになります。",sensor:"暗さに関係なく、温度を記録します。"};say(L[cur]);return}
  if(mk&&mk!==cur){setMode(mk);if(!k){const[a,b]=M[mk].a.see;say(M[mk].intro+"<br>"+a,b);return}}
  if(/もっと|詳しく|くわしく|続き/.test(t)&&lastK){const d=document.querySelector("#say details");if(d){d.open=true;return}const n=CH[cur].find(x=>x!==lastK)||"see";return answer(n)}
  if(/^(なぜ|なんで|どうして)/.test(t)&&lastK){const s_=M[cur].a[lastK][1];say(s_&&WHY[s_]?WHY[s_]:`これは、この模式の仮の置き方で、研究の記録で確かめた言い方ではありません。`,s_);return}
  if(/わから|分から|わかんな|^[?？]+$|どうすれば|使い方/.test(t)&&!/見え|聞こ|におい/.test(t)){const q=CH[cur][0];say(`まずはここから。下の札を押すと、${M[cur].n}の受けとり方を話します。<button class="go" data-a="${q}">${QL[q]}</button>`);return}
  if(/ありがと|サンキュー/.test(t)){say("どういたしまして。ほかの生き物にも切りかえてみてください。");return}
  if(/さよなら|さようなら|またね|バイバイ/.test(t)){say("また来てください。");return}
  if(/こんにちは|はじめまして|こんばんは|おはよう/.test(t)&&!k){say(`こんにちは。いまは${M[cur].n}の模式です。「何が見える？」と聞いてみてください。`);return}
  if(!mk&&ANIMAL.test(t)){const nn=NEAR.find(([r])=>r.test(t));
    if(nn&&nn[1]!==cur){say(`その生き物の模式は、まだありません。${/蛇|へび|ヘビ/.test(t)?"熱を受けとる点では、熱センサーと比べられます。仕組みは違います。":/鳥|とり|カラス|スズメ|ハト/.test(t)?"紫外も見る点だけは、ミツバチと比べられます。仕組みは違います。":`いまある中では${M[nn[1]].n}から比べてみてください。`}${GO(nn[1])}`);return}
    say("その生き物の模式は、まだありません。上の生き物から選んでみてください。");return}
  if(k==="who"){say("ひとつの AI です。いろいろな生き物や機械の受けとり方を、研究の記録から組み立てた模式に切りかえて話します。本当にその感じ方を持つわけではありません。");return}
  if(k==="out")return outside();
  if(/紫外/.test(t)){if(cur==="bee")return answer("see");if(cur==="plant"){say("紫外の光にも応じる受容体があります（この模式ではまだ詳しく扱いません）。");return}if(cur==="worm"){say("ミミズは皮膚で光の強さを受けます。紫外だけを分けて受けとるかは、この模式では扱いません。","darwin");return}say(`紫外の手がかりは、${M[cur].n}のこの受けとり方にはありません。`);return}
  if(/赤外/.test(t)){if(cur==="sensor")return answer("see");if(cur==="tick")return answer("smell");say(cur==="cam"?"素子は近赤外にも反応しますが、ふつうはフィルターで切っています。":`赤外の手がかりは、${M[cur].n}のこの受けとり方にはありません。`);return}
  if(/聞こえない|きこえない|聴こえない/.test(t)){const N={bee:"空気を伝わる遠くの音は、この受けとり方にはほとんどありません。",bat:"人に聞こえる高さの多くは、狩りの手がかりではありません。",tick:"音の手がかりは、この受けとり方にはありません。",dog:"とても低い音は人と同じく受けとりにくい、という模式です。",worm:"空気の音にはほとんど応じません。土のふるえは受けとります。",plant:"音を聴く器官はありません。",human:"超音波や、とても低い音は聞こえません。",cam:"音は記録しません。",sensor:"音は記録しません。"};say(N[cur]);return}
  if(/超音波/.test(t)){if(cur==="bat"||cur==="dog")return answer("hear");say(`超音波（人の耳の上限 約20kHz より高い音）の手がかりは、${M[cur].n}のこの受けとり方にはありません。`);return}
  if(k==="red"){say(RED[cur][0],RED[cur][1]);return}
  if(k)return answer(k);
  outside();
}
document.addEventListener("click",e=>{const b=e.target.closest(".go");if(!b)return;if(b.dataset.a)answer(b.dataset.a);else setMode(b.dataset.k)});
// 画面
const modes=$("#modes");
ORDER.forEach(k=>{const b=document.createElement("button");b.textContent=M[k].n;b.onclick=()=>setMode(k);b.dataset.k=k;modes.appendChild(b)});
const CH={bee:["see","nosee","move"],bat:["hear","see","away"],tick:["smell","time","nosee"],dog:["smell","see","hear"],worm:["hear","see","you"],plant:["see","time","nosee"],human:["see","nosee","hear","time"],cam:["see","time","nosee"],sensor:["see","nosee","you"]};
const QL=Object.fromEntries(QS);
function chips(k){const c=$("#chips");c.innerHTML="";CH[k].forEach(q=>{const b=document.createElement("button");b.textContent=QL[q];b.onclick=()=>answer(q);c.appendChild(b)});
 if(k==="human"){const b=document.createElement("button");b.textContent="ミツバチと比べる";b.className="cmp";b.onclick=()=>compare("bee","human");c.appendChild(b)}
 if(k!=="human"){const b=document.createElement("button");b.textContent="人と比べる";b.className="cmp";b.onclick=()=>compare(k,"human");c.appendChild(b)}}
const COMP={bee:"人に見えない紫外まで見え、赤は暗く沈む。",bat:"人に聞こえない高い声のこだまで、形をつかむ。",tick:"光も音もほぼ無く、におい・熱・触れる感じだけ。",dog:"色は二つの系統だけ。そのかわり、においの世界が広い。",worm:"目も耳も無く、皮膚で明暗を、体で土のふるえを受ける。",plant:"光の色の割合と、一日の周期に応じる。",cam:"光を数として記録する。感じてはいない。",sensor:"人に見えない長い赤外を、温度として記録する。"};
function compare(a,b){const A=M[a],B=M[b];const nx=CH[a].find(q=>q!=="see")||"see";say(`${A.n}は、${COMP[a]||""}<button class="go" data-a="${nx}">${QL[nx]}</button>（人：光 ${B.light_t.replace(/[（）]/g," ")}・音 ${B.sound_t.replace(/[（）]/g," ")}　${A.n}：光 ${A.light_t.replace(/[（）]/g," ")}・音 ${A.sound_t.replace(/[（）]/g," ")}）`)}
$("#f").onsubmit=e=>{e.preventDefault();const t=$("#q").value.trim();if(t)free(t);$("#q").value=""};
const lp=nm=>Math.max(0,Math.min(100,(nm-300)/8)),sp=hz=>hz<=0?0:Math.max(0,Math.min(100,(Math.log10(hz)-1)/(Math.log10(200000)-1)*100));
function bands(m0){const m=m0===M.human?M.bee:m0;
  const c="#"+m.col[1].toString(16).padStart(6,"0");
  const bar=(l,w,col,nt)=>w?`<span class="bar"><i style="left:${l}%;width:${w}%;background:${col}"></i></span>`:`<span class="bar" style="background:none;border-top:1px dashed rgba(195,204,224,.25);height:0"></span><em style="width:auto;max-width:none;font-size:11px">${nt||"この帯では受けない"}</em>`;
  const L=m.light[1]?[lp(m.light[0]),lp(m.light[1])-lp(m.light[0])]:[0,0],S=m.sound[1]?[sp(m.sound[0]),sp(m.sound[1])-sp(m.sound[0])]:[0,0];
  const hl=[lp(380),lp(780)-lp(380)],hs=[sp(20),sp(20000)-sp(20)],hc="rgba(238,245,251,.45)";
  $("#band").innerHTML=
  `<div class="row"><span class="k">光</span><span class="who">人</span>${bar(...hl,hc)}</div>`+
  `<div class="row"><span class="k"></span><span class="who">${m.n}</span>${bar(...L,c,m.dim)}</div>`+
  `<div class="row lab"><span class="k"></span><span class="who"></span><span class="scale"><b style="left:${lp(335)}%">紫外</b><b style="left:${lp(580)}%">見える光</b><b style="left:${lp(940)}%">赤外</b></span></div>`+
  (false?"":`<div class="row"><span class="k">音</span><span class="who">人</span>${bar(...hs,hc)}</div><div class="row"><span class="k"></span><span class="who">${m.n}</span>${bar(...S,c)}</div><div class="row lab"><span class="k"></span><span class="who"></span><span class="scale"><b style="left:${sp(12)}%">低い</b><b style="left:${sp(630)}%">人の耳</b><b style="left:${sp(63000)}%">超音波</b></span></div>`)+
  `<div class="row lab"><span class="k"></span><span class="who"></span><span class="scale"><b style="left:50%">帯の端は模式の目安</b></span></div>`+
  `<div class="row"><span class="k">時間</span><em style="width:auto;max-width:none;text-align:left">${m0.time}<b id="wait"></b></em></div>`;
}
function setMode(k){look(k);chips(k);cur=k;setTimeout(()=>{const b=document.querySelector(`#modes button[data-k="${k}"]`);b&&b.scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"})},0);const m=M[k];
  modes.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.k===k));
  bands(m);say(m.intro);$("#now").textContent=m.n+"の模式";mode=k;waitT=0;}

// 3D：軽い点の空間。模式ごとに見え方の型を変える。
const cv=$("#cv"),R=new THREE.WebGLRenderer({canvas:cv,antialias:false,powerPreference:"low-power"});
R.setPixelRatio(Math.min(devicePixelRatio,1.5));
const S=new THREE.Scene(),BG=new THREE.Color(0x03060f);S.background=BG.clone();S.fog=new THREE.FogExp2(0x03060f,.05);
const C=new THREE.PerspectiveCamera(50,1,.1,80);C.position.set(0,1.5,6.5);C.lookAt(0,1.1,0);
const N=1400,g=new THREE.BufferGeometry(),pos=new Float32Array(N*3),sph=new Float32Array(N*3),col_=new Float32Array(N*3),col=col_;
const stem=new Float32Array(N*3);
// 模式ごとの輪郭（点の集まりのまま、体の形の手がかりだけを示す。碧には似せない）
const R_=Math.random;function inE(cx,cy,cz,rx,ry,rz){const u=R_()*2-1,a=R_()*6.283,r=Math.cbrt(R_()),s=Math.sqrt(1-u*u);return[cx+rx*r*s*Math.cos(a),cy+ry*r*u,cz+rz*r*s*Math.sin(a)]}
function mk(parts){const f=new Float32Array(N*3),tot=parts.reduce((a,p)=>a+p[0],0);for(let i=0;i<N;i++){let q=R_()*tot,p=parts[0];for(const pp of parts){if((q-=pp[0])<=0){p=pp;break}}f.set(inE(...p.slice(1)),i*3)}return f}
const SH={
 bee:mk([[4,0,1.25,0,.36,.34,.34],[6,0,1.12,-.9,.44,.4,.66],[2,0,1.3,.58,.28,.28,.25],[2,.55,1.85,-.15,.55,.42,.05],[2,-.55,1.85,-.15,.55,.42,.05],[1,.12,1.55,.85,.03,.25,.03],[1,-.12,1.55,.85,.03,.25,.03]]),
 bat:mk([[3,0,1.2,0,.22,.38,.2],[5,1.15,1.35,0,1.0,.28,.03],[5,-1.15,1.35,0,1.0,.28,.03],[2,1.6,1.1,0,.5,.3,.03],[2,-1.6,1.1,0,.5,.3,.03],[1,.1,1.72,0,.05,.14,.04],[1,-.1,1.72,0,.05,.14,.04]]),
 tick:mk([[6,0,.55,0,.75,.25,.95],[1,0,.6,.95,.18,.1,.2],[1,.85,.35,.3,.45,.04,.04],[1,-.85,.35,.3,.45,.04,.04],[1,.85,.35,-.3,.45,.04,.04],[1,-.85,.35,-.3,.45,.04,.04]]),
 dog:mk([[5,0,1.1,0,.35,.35,.85],[2,0,1.5,.95,.25,.25,.28],[1,0,1.4,1.3,.12,.1,.2],[1,.2,.45,.5,.08,.45,.08],[1,-.2,.45,.5,.08,.45,.08],[1,.2,.45,-.55,.08,.45,.08],[1,-.2,.45,-.55,.08,.45,.08]]),
 worm:mk([[1,-1.6,.2,0,.35,.14,.14],[1,-.8,.22,.15,.35,.15,.15],[1,0,.24,0,.35,.16,.16],[1,.8,.22,-.15,.35,.15,.15],[1,1.6,.2,0,.35,.14,.14]]),
 plant:mk([[3,0,1.2,0,.05,1.25,.05],[2,.35,.7,0,.35,.04,.14],[2,-.35,1.1,0,.35,.04,.14],[2,.32,1.55,0,.32,.04,.13],[2,-.3,1.95,0,.3,.04,.12],[3,0,2.5,0,.3,.22,.3],[2,0,.02,0,.6,.03,.6]]),
 human:mk([[3,0,1.95,0,.17,.2,.17],[5,0,1.35,0,.27,.4,.16],[2,.36,1.3,0,.07,.36,.07],[2,-.36,1.3,0,.07,.36,.07],[2,.12,.48,0,.09,.48,.09],[2,-.12,.48,0,.09,.48,.09]]),
 cam:mk([[6,0,1.2,0,.8,.55,.45],[3,0,1.2,.6,.35,.35,.25]]),
 sensor:mk([[6,0,1.2,0,.9,.7,.08]])
};
const form=new Float32Array(N*3);
for(let i=0;i<N;i++){const u=Math.random()*2-1,a=Math.random()*Math.PI*2,r=.9*Math.cbrt(Math.random()),s=Math.sqrt(1-u*u);
 sph.set([r*s*Math.cos(a),1.2+r*u*1.15,r*s*Math.sin(a)],i*3);
 const y=Math.random()*2.6,br=Math.random()<.35,ang=Math.random()*6.28,rr=br?(y/2.6)*.9*Math.random():.06;stem.set([Math.cos(ang)*rr,y,Math.sin(ang)*rr],i*3)}
pos.set(sph);form.set(sph);g.setAttribute("position",new THREE.BufferAttribute(pos,3));g.setAttribute("color",new THREE.BufferAttribute(col,3));
const pm=new THREE.PointsMaterial({size:.035,vertexColors:true,transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending});
const body=new THREE.Points(g,pm);S.add(body);
// 地面（点の格子を少し乱す）
const GW=70,G=GW*GW,gg=new THREE.BufferGeometry(),gp=new Float32Array(G*3),g0=new Float32Array(G*3),gc=new Float32Array(G*3);
for(let i=0;i<G;i++){const x=(i%GW)/GW*28-14+(Math.random()-.5)*.3,z=Math.floor(i/GW)/GW*28-18+(Math.random()-.5)*.3;g0.set([x,0,z],i*3)}
gp.set(g0);gg.setAttribute("position",new THREE.BufferAttribute(gp,3));gg.setAttribute("color",new THREE.BufferAttribute(gc,3));
const gm=new THREE.PointsMaterial({size:.04,vertexColors:true,transparent:true,opacity:.7,depthWrite:false});S.add(new THREE.Points(gg,gm));
// 反響の殻（コウモリ）
const shells=[];for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),new THREE.MeshBasicMaterial({color:0xa8f2f6,wireframe:true,transparent:true,opacity:0,depthWrite:false}));m.position.y=1.2;S.add(m);shells.push(m)}
// 紫外の帯（ミツバチ）
const ribbon=new THREE.Mesh(new THREE.PlaneGeometry(30,.12,60,1),new THREE.MeshBasicMaterial({color:0xb4a2ff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));ribbon.position.set(0,3.4,-4);S.add(ribbon);
// においの道（犬）
const trails=[];for(let j=0;j<5;j++){const pts=[];let x=(Math.random()-.5)*10,z=-14;for(let k=0;k<40;k++){x+=(Math.random()-.5)*.9;z+=.4;pts.push(new THREE.Vector3(x,.03,z))}
 const gl=new THREE.BufferGeometry().setFromPoints(pts),c=new Float32Array(40*3);gl.setAttribute("color",new THREE.BufferAttribute(c,3));
 const ln=new THREE.Line(gl,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0}));S.add(ln);trails.push({ln,c,ph:Math.random()})}
// 画素の格子（カメラ）

// ── 景色そのものの変化（どれも出典の範囲の模式） ──
// 花：人の目には黄一色、ミツバチの模式では紫外の吸収で中心が暗い「的」の模様（Peitsch 1992 の紫外受容に基づく模式。花ごとの実測ではない）
const FN=36,FP=70,fg=new THREE.BufferGeometry(),fpos=new Float32Array(FN*FP*3),fcol=new Float32Array(FN*FP*3),fH=new Float32Array(FN*FP*3),fB=new Float32Array(FN*FP*3);
for(let f=0;f<FN;f++){const cx=(Math.random()-.5)*14,cz=-1-Math.random()*12,ry=.05+Math.random()*.25;
 for(let p=0;p<FP;p++){const r=Math.sqrt(Math.random())*.42,a=Math.random()*6.283,i=(f*FP+p)*3,c=r/.42;
  fpos.set([cx+Math.cos(a)*r,ry+.35+Math.sin(a)*r,cz+.01*Math.random()],i);
  fH.set([.98,.82,.25],i);                                  // 人：黄
  const uv=c<.45?.08:.9;fB.set([.62*uv,.5*uv,1*uv],i)}}       // ミツバチ：中心は紫外を吸って暗く、外は紫外を返して明るい
fg.setAttribute("position",new THREE.BufferAttribute(fpos,3));fg.setAttribute("color",new THREE.BufferAttribute(fcol,3));
const flowers=new THREE.Points(fg,new THREE.PointsMaterial({size:.06,vertexColors:true,transparent:true,depthWrite:false}));S.add(flowers);
// 土の粒（ミミズ）
const SN=2400,sg=new THREE.BufferGeometry(),spos=new Float32Array(SN*3),s0=new Float32Array(SN*3);
for(let i=0;i<SN;i++)s0.set([(Math.random()-.5)*10,-Math.random()*2.4+.2,(Math.random()-.5)*8+2],i*3);spos.set(s0);
sg.setAttribute("position",new THREE.BufferAttribute(spos,3));
const soil=new THREE.Points(sg,new THREE.PointsMaterial({size:.05,color:0x8a6a48,transparent:true,opacity:0,depthWrite:false}));S.add(soil);
const camT={y:1.5,ly:1.1};
function look(m){cv.style.filter=m==="dog"?"url(#dichro)":m==="sensor"?"saturate(1.3)":"none";
 cv.style.imageRendering=m==="cam"?"pixelated":"auto";R.setPixelRatio(m==="cam"?.22:Math.min(devicePixelRatio,1.5));resize();
 camT.y=m==="worm"?-.35:m==="tick"?.5:1.5;camT.ly=m==="worm"?-.2:m==="tick"?.4:1.1}
const grid=new THREE.GridHelper(40,80,0xeef5fb,0xeef5fb);grid.material.transparent=true;grid.material.opacity=0;grid.rotation.x=Math.PI/2;grid.position.set(0,1.2,2.6);S.add(grid);

const V={ // jit=揺れ, spd=時間の流れ, fog, bg, ground 色, quant=画素, shape=0 球/1 茎
 bee:{jit:.05,spd:3.2,fog:.04,bg:0x05061a,q:0,shape:0,size:.035},
 bat:{jit:.01,spd:1.2,fog:.08,bg:0x010206,q:0,shape:0,size:.03},
 tick:{jit:.004,spd:.05,fog:.18,bg:0x0a0605,q:0,shape:0,size:.03},
 dog:{jit:.02,spd:.8,fog:.06,bg:0x070a14,q:0,shape:0,size:.035},
 worm:{jit:.015,spd:.3,fog:.12,bg:0x0b0805,q:0,shape:0,size:.04},
 plant:{jit:.006,spd:.15,fog:.05,bg:0x040a08,q:0,shape:1,size:.035},
 human:{jit:.015,spd:1,fog:.05,bg:0x03060f,q:0,shape:0,size:.035},
 cam:{jit:0,spd:1,fog:.04,bg:0x03060f,q:.12,shape:0,size:.06},
 sensor:{jit:.01,spd:.6,fog:.03,bg:0x020208,q:.09,shape:0,size:.05}
};
let mode="bee",waitT=0,shape=0,t=0,last=performance.now(),camAcc=0;
const cc=[new THREE.Color(),new THREE.Color(),new THREE.Color()],tmp=new THREE.Color();
function resize(){const w=innerWidth,h=innerHeight;R.setSize(w,h,false);C.aspect=w/h;C.position.z=w<600?8:6.5;C.updateProjectionMatrix()}
addEventListener("resize",resize);resize();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;const m=M[mode],v=V[mode];
 // カメラは一秒を 30 こまに切る（それより細かく描かない）
 if(mode==="cam"){camAcc+=dt;if(camAcc<1/30){requestAnimationFrame(frame);return}camAcc=0}
 t+=dt*v.spd;waitT+=dt;
 m.col.forEach((c,i)=>cc[i].lerp(tmp.set(c),.06));S.background.lerp(tmp.set(v.bg),.05);S.fog.color.copy(S.background);S.fog.density+=(v.fog-S.fog.density)*.05;
 shape+=(v.shape-shape)*.04;pm.size+=(v.size-pm.size)*.1;
 for(let i=0;i<N;i++){const k=i*3,b=i%3;const T=SH[mode];form[k]+=(T[k]-form[k])*.05;form[k+1]+=(T[k+1]-form[k+1])*.05;form[k+2]+=(T[k+2]-form[k+2])*.05;let x=form[k],y=form[k+1],z=form[k+2];
  const w=Math.sin(t*3+i*.37)*v.jit;x*=1+w;z*=1+w;y+=Math.sin(t+i)*v.jit*.5;
  if(v.q){x=Math.round(x/v.q)*v.q;y=Math.round(y/v.q)*v.q;z=Math.round(z/v.q)*v.q}
  pos[k]=x;pos[k+1]=y;pos[k+2]=z;
  let c=cc[b];if(mode==="bee"&&T===SH.bee&&z<-.35){const st=Math.sin(z*14)>0;tmp.setRGB(st?.95:.15,st?.8:.12,st?.35:.1);c=tmp}if(mode==="tick"){const h=.35+.35*Math.sin(waitT*.8+i*.01);tmp.setRGB(.95*h,.55*h,.4*h);c=tmp}if(mode==="sensor"){const h=1-Math.min(1,Math.hypot(x,y-1.2,z)/1);tmp.setHSL(.66-.62*h,.9,.35+.3*h);c=tmp}
  col[k]=c.r;col[k+1]=c.g;col[k+2]=c.b}
 g.attributes.position.needsUpdate=true;g.attributes.color.needsUpdate=true;if(mode==="bee"||mode==="plant"||mode==="dog"){body.rotation.y+=(((mode==="bee"?-1.35:mode==="dog"?-1.2:0)+Math.sin(t*.3)*.25)-body.rotation.y)*.05}else body.rotation.y+=dt*.12*Math.min(2,v.spd);
 // 地面
 const gcol=mode==="worm"?tmp.set(0x6b4f36):mode==="sensor"?tmp.set(0x1a2a60):cc[2];
 for(let i=0;i<G;i++){const k=i*3,x=g0[k],z=g0[k+2];let y=0,br=.5;
  if(mode==="worm"){const d=Math.hypot(x,z+1);y=Math.sin(d*2.2-t*9)*.06*Math.exp(-d*.12);br=.55+y*4}
  else if(mode==="bat"){const d=Math.hypot(x,z);const f=(t*.6)%1*10;br=Math.max(0,1-Math.abs(d-f)*1.2)*.9}
  else if(mode==="tick")br=.14+.1*Math.sin(t*20+x);
  gp[k+1]=y;gc[k]=gcol.r*br;gc[k+1]=gcol.g*br;gc[k+2]=gcol.b*br}
 gg.attributes.position.needsUpdate=true;gg.attributes.color.needsUpdate=true;
 shells.forEach((s,i)=>{const p=(t*.6+i/4)%1;s.scale.setScalar(1+p*9);s.material.opacity=mode==="bat"?(1-p)*.1:0});
 ribbon.material.opacity+=((0)-ribbon.material.opacity)*.05;ribbon.position.y=3.4+Math.sin(t*.5)*.1;
 trails.forEach(o=>{const on=mode==="dog";o.ln.material.opacity+=((on?.9:0)-o.ln.material.opacity)*.05;
  if(on)for(let k=0;k<40;k++){const a=Math.max(0,1-((k/40-o.ph-t*.05)%1+1)%1*1.4);o.c[k*3]=.95*a;o.c[k*3+1]=.81*a;o.c[k*3+2]=.55*a}o.ln.geometry.attributes.color.needsUpdate=true});
 grid.material.opacity+=((mode==="cam"?.12:0)-grid.material.opacity)*.08;
 const wt=document.getElementById("wait");if(wt)wt.textContent=mode==="tick"?`（この画面を開いてから待った ${Math.floor(waitT)} 秒）`:"";
 {const fb_=mode==="bee"?1:0,show=["bee","human","dog","cam","plant"].includes(mode)?1:mode==="sensor"?.5:0;
  for(let i=0;i<fcol.length;i++){let v=fH[i]*(1-fb_)+fB[i]*fb_;if(mode==="sensor")v=i%3===2?.6:.15;fcol[i]+=(v*show-fcol[i])*.08}fg.attributes.color.needsUpdate=true;
  soil.material.opacity+=((mode==="worm"?.55:0)-soil.material.opacity)*.06;
  if(mode==="worm"){for(let i=0;i<SN;i++){const k=i*3,d=Math.hypot(s0[k],s0[k+2]-2);spos[k+1]=s0[k+1]+Math.sin(d*3-t*10)*.03*Math.exp(-d*.3)}sg.attributes.position.needsUpdate=true}
  C.position.y+=(camT.y-C.position.y)*.05;C.lookAt(0,camT.ly+(C.position.y-camT.y),0);}
 R.render(S,C);requestAnimationFrame(frame)}
function ofl(){document.querySelectorAll(".sc").forEach(w=>{const e=w.firstElementChild;w.classList.toggle("of",e.scrollWidth>e.clientWidth+2&&e.scrollLeft+e.clientWidth<e.scrollWidth-4)})}
document.querySelectorAll(".sc>div").forEach(e=>e.addEventListener("scroll",ofl,{passive:true}));addEventListener("resize",ofl);setTimeout(ofl,50);
setMode("bee");say("ミツバチや犬には、世界がどう届いている？　生き物や機械を選ぶと、この AI がその受けとり方の模式に切りかわって話します。");
requestAnimationFrame(frame);

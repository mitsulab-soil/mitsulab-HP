/* 現在地で歩く（GPS）── Qualium 氷川・川越の共通の小さな部品（2026-10-24）
   位置はこの端末の中だけで使い、どこへも送らず、残さない（保存も記録もしない）。
   o = {
     toXZ(lat, lon) -> [x, z]      緯度経度を、この 3D の座標（x＝東 m・z＝南 m）へ
     place(x, z) -> { ok, dist, x, z }   この 3D の歩ける所か。ok=false なら dist（道まで m）を返す。x,z は道の上へ寄せた位置
     first(x, z, fix)              はじめの位置が届いたとき（上空からそこへ降りる）
     move(x, z, fix)               つづけて位置が届いたとき（その位置へ歩く）
     toast(text)                   知らせ
     sync(on)                      ボタンの見た目
     name                          場所の名前（「氷川参道」など）
   } */
export function makeHereWalk(o) {
  const H = { on: false, watch: null, fix: null, got: false, warnedAcc: false, last: null };
  const fmtKm = m => m >= 1000 ? `約 ${(m / 1000).toFixed(1)} km` : `約 ${Math.round(m)} m`;
  function err(e) {
    const t = e && e.code === 1 ? "位置の使用が許可されませんでした。端末の設定（iPhone は 設定 › プライバシーとセキュリティ › 位置情報サービス › Safari Web サイト）と、ブラウザの「このサイトの位置情報」を「許可」にして、もう一度。"
      : e && e.code === 3 ? "位置を取れませんでした（時間切れ）。空の見える所で、もう一度。" : "位置を取れませんでした。少し待って、もう一度。";
    o.toast(t); if (!H.got) stop();
  }
  function onPos(pos) {
    const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
    const [x0, z0] = o.toXZ(lat, lon), p = o.place(x0, z0);
    H.fix = { acc, t: pos.timestamp, ...p };
    if (!p.ok) {
      if (!H.got) { o.toast(`いまの位置は、Qualium の範囲の外です（${o.name}まで ${fmtKm(p.dist)}）。${o.name}の近くで、もう一度。`); stop(); }
      return;
    }
    if (acc > 60 && !H.warnedAcc) { H.warnedAcc = true; o.toast(`位置の確かさは ±${Math.round(acc)} m です。空の見える所では、もっと確かになります。`); }
    if (!H.got) { H.got = true; H.last = [p.x, p.z]; o.first(p.x, p.z, H.fix); return; }
    if (H.last && Math.hypot(p.x - H.last[0], p.z - H.last[1]) < Math.max(1.2, Math.min(6, acc * .25))) return;   // 位置のゆらぎでは動かない
    H.last = [p.x, p.z]; o.move(p.x, p.z, H.fix);
  }
  function start() {
    if (H.on) return true;
    if (!("geolocation" in navigator) || !window.isSecureContext) { o.toast("この画面では位置を使えません。"); return false; }
    H.on = true; H.got = false; H.warnedAcc = false; H.last = null; o.sync(true);
    o.toast("位置を探しています。許可を求められたら「許可」を。位置はこの端末の中だけで使い、送らず、残しません。");
    try { H.watch = navigator.geolocation.watchPosition(onPos, err, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }); }
    catch (e) { err(e); }
    return true;
  }
  function stop() {
    if (H.watch != null) try { navigator.geolocation.clearWatch(H.watch); } catch { }
    H.watch = null; H.on = false; H.got = false; H.fix = null; o.sync(false);
  }
  H.start = start; H.stop = stop; H.toggle = () => H.on ? (stop(), false) : start();
  return H;
}

/* © mitsulab. 太陽の位置（2026-11-02 本人決定「空の太陽の位置を、実際の日時と場所から計算して入れる」）。Qualium 3 版共通。
   NOAA の太陽の位置の近似式（赤緯・均時差・時角から高度と方位）。誤差はおよそ 1 度以内。外への通信はしない（端末の時計と、その場所の緯度経度だけ）。
   座標：x＝東・y＝上・z＝南。夜や日の出前後は、景色が見えなくならないよう、光の高さだけ下限（minEl 度）で止め、方位は実際のまま。 */
export function sunAzEl(lat, lon, d = new Date()) {
  const rad = Math.PI / 180, jd = d.getTime() / 864e5 + 2440587.5, n = jd - 2451545.0;
  const L = (280.46 + .9856474 * n) % 360, g = ((357.528 + .9856003 * n) % 360) * rad, lam = (L + 1.915 * Math.sin(g) + .02 * Math.sin(2 * g)) * rad, eps = (23.439 - 4e-7 * n) * rad;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)), dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24, lst = (gmst * 15 + lon) * rad, H = lst - ra, phi = lat * rad;
  const el = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(H));   // 北から東まわり
  return { az: (az / rad + 360) % 360, el: el / rad };
}
export function sunDir(lat, lon, d = new Date(), minEl = 12) {
  const { az, el } = sunAzEl(lat, lon, d), rad = Math.PI / 180, e = Math.max(minEl, el) * rad, a = az * rad;
  return { x: Math.sin(a) * Math.cos(e), y: Math.sin(e), z: -Math.cos(a) * Math.cos(e), az, el };
}

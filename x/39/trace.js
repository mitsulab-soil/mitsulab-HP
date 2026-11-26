/* trace.js ── 痕跡（スティグマジー）の共通部品。2026-11-26
   痕跡を「置く」・時間で「薄れる」（負の帰還）・同じ升目に「重なると濃くなる」（正の帰還）・景色に「淡く重ねる」の 4 つ。
   端末の中だけ（localStorage）。送信しない。時刻は 1 時間に丸め、位置は呼び出し側が升目（cell）に丸めて渡す。
   使い方：
     var T = Trace.create({ key:'qmap.trace', halfLife: 3*864e5, cap: 4 });
     T.put('cell-id', 1, {la:.., lo:.., k:'see'});   // 置く（同じ cell は濃くなる）
     T.all()        // [{id, w(いまの濃さ 0..cap), n(重なった回数), m(メタ)}]（薄れきったものは消える）
     T.strength(id) // いまの濃さ
     Trace.paint(ctx, T.all(), function(e){return {x,y,r,c}})  // canvas に淡く重ねる
*/
(function (g) {
  'use strict';
  var H = 36e5;                       // 時刻は 1 時間に丸める（細かい時刻を残さない）
  function now() { return Math.floor(Date.now() / H) * H; }
  function read(key) { try { var a = JSON.parse(localStorage.getItem(key) || '{}'); return a && typeof a === 'object' ? a : {}; } catch (e) { return {}; } }
  function write(key, o) { try { localStorage.setItem(key, JSON.stringify(o)); return true; } catch (e) { return false; } }

  function create(o) {
    o = o || {};
    var key = o.key || 'trace.v1', half = o.halfLife || 3 * 864e5, cap = o.cap || 4, eps = o.eps || 0.03, max = o.max || 400;
    var db = read(key);
    function decay(e, t) { return e.w * Math.pow(0.5, Math.max(0, t - e.t) / half); }
    function prune(t) {
      var ids = Object.keys(db), keep = [];
      ids.forEach(function (id) { var w = decay(db[id], t); if (w < eps) delete db[id]; else keep.push([id, w]); });
      if (keep.length > max) { keep.sort(function (a, b) { return a[1] - b[1]; }); keep.slice(0, keep.length - max).forEach(function (k) { delete db[k[0]]; }); }
    }
    var api = {
      /* 置く：前の濃さを今まで薄めてから足す。上限 cap で頭打ち（濃くなりすぎない＝釣り合い） */
      put: function (id, amount, meta) {
        var t = now(), e = db[id], w = e ? decay(e, t) : 0;
        db[id] = { w: Math.min(cap, w + (amount == null ? 1 : amount)), t: t, n: (e ? e.n : 0) + 1, m: meta || (e && e.m) || null };
        prune(t); write(key, db); return db[id].w;
      },
      strength: function (id) { var e = db[id]; return e ? decay(e, now()) : 0; },
      all: function () {
        var t = now(); prune(t);
        return Object.keys(db).map(function (id) { var e = db[id]; return { id: id, w: decay(e, t), n: e.n, m: e.m }; });
      },
      /* あと何日で薄れきるか（目安） */
      daysLeft: function (id) { var w = api.strength(id); return w <= eps ? 0 : Math.ceil(Math.log(w / eps) / Math.LN2 * half / 864e5); },
      clear: function () { db = {}; write(key, db); },
      cap: cap, halfLife: half
    };
    prune(now()); write(key, db);
    return api;
  }

  /* 淡く重ねる：濃さに応じた透けるにじみ。map(e) は {x,y,r,c} を返す（c は #rrggbb） */
  function paint(ctx, list, map, alpha) {
    var A = alpha == null ? 0.42 : alpha;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    list.forEach(function (e) {
      var p = map(e); if (!p) return;
      var k = Math.min(1, e.w / (p.cap || 4)), r = p.r * (0.6 + 0.6 * k);
      var gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r), c = p.c || '#9bdcf0';
      var rgb = [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16); }).join(',');
      gr.addColorStop(0, 'rgba(' + rgb + ',' + (A * (0.25 + 0.75 * k)).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  g.Trace = { create: create, paint: paint };
})(typeof window !== 'undefined' ? window : this);

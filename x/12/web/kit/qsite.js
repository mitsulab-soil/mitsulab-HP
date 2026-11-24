/* Qualia/omiya・kawagoe・shibuya 共通の GUI の小さな手当て（qsite.css と組）。メニューのボタンに「メニュー」の字を添える（すでにあれば何もしない） */
(() => { let n = 0; const iv = setInterval(() => { const m = document.getElementById("menuBtn"); if (m && !m.querySelector(".q7t")) { const t = document.createElement("span"); t.className = "q7t"; t.textContent = "メニュー"; t.setAttribute("aria-hidden", "true"); m.append(t); } if (m || ++n > 60) clearInterval(iv); }, 250); })();
/* スマホは「足もとの高さ」を短く（shibuya と同じ）＝下の一列に写真の札と並べる */
(() => { if (!matchMedia("(max-width:640px)").matches) return; let n = 0; const iv = setInterval(() => { const b = document.querySelector(".qck"); if (b) { b.textContent = "足もとの高さ"; b.setAttribute("aria-label", "足もとの高さ"); } if (b || ++n > 80) clearInterval(iv); }, 250); })();

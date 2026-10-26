/* ₹ per-PDF payment (manual UPI check) and unlock codes.
 *
 * Flow: preview is watermarked → user pays to the UPI QR → sends application code + UTR on WhatsApp
 * → operator checks the bank app and replies with an unlock code from Vihir_Admin.html
 * → user pastes it here → that application prints without watermark.
 *
 * An application code is derived from village + gat + owner, so a code unlocks only that application.
 * Unlock codes are ECDSA P-256 signatures of "vihir1:<application code>"; this file holds only the
 * public key (PAY_PUBLIC_KEY, injected by build_app.py), so codes can be checked here but not made.
 * "vihir1:ADMIN" is a master code that unlocks every application in that browser (operator's own use).
 */
(function (root) {
  "use strict";

  const ALPHA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32: no I L O U
  const enc = new TextEncoder();
  let ctx = null;        // {db, save, toast}
  let pubKey = null;

  const norm = (s) => String(s || "").trim().replace(/\s+/g, " ");

  async function requestId(d) {
    const msg = [norm(d.gav), norm(d.gat), norm(d.owner)].join("|");
    const h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(msg)));
    let bits = 0, val = 0, out = "";
    for (const b of h.slice(0, 5)) {
      val = (val << 8) | b; bits += 8;
      while (bits >= 5) { out += ALPHA[(val >> (bits - 5)) & 31]; bits -= 5; }
    }
    return `VH-${out.slice(0, 4)}-${out.slice(4, 8)}`;
  }

  function b64uDecode(s) {
    s = String(s || "").replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = atob(s);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }

  async function verify(code, subject) {
    try {
      if (!pubKey) pubKey = await crypto.subtle.importKey("jwk", PAY_PUBLIC_KEY, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
      const sig = b64uDecode(code);
      if (sig.length !== 64) return false;
      return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pubKey, sig, enc.encode("vihir1:" + subject));
    } catch (e) {
      return false;
    }
  }

  const lic = () => (ctx.db().settings.licences = ctx.db().settings.licences || {});

  async function isUnlocked(d) {
    if (!PAY_CONFIG.enabled) return true;
    const L = lic();
    if (L.ADMIN && await verify(L.ADMIN, "ADMIN")) return true;
    const id = await requestId(d);
    return !!(L[id] && await verify(L[id], id));
  }

  async function tryCode(code, id) {
    code = String(code || "").trim();
    if (await verify(code, id)) { lic()[id] = code; ctx.save(); return "one"; }
    if (await verify(code, "ADMIN")) { lic().ADMIN = code; ctx.save(); return "admin"; }
    return null;
  }

  // ------------------------------------------------------------ dialog
  const $ = (s) => document.querySelector(s);
  const h = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function upiLink(id) {
    const q = new URLSearchParams({ pa: PAY_CONFIG.upiId, pn: PAY_CONFIG.payeeName,
      am: PAY_CONFIG.amount.toFixed(2), cu: "INR", tn: id });
    return "upi://pay?" + q.toString().replace(/\+/g, "%20").replace(/%40/g, "@");
  }

  function qrSvg(text) {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  }

  function copy(text, what) {
    const done = () => ctx.toast(`✔ ${what} कॉपी केला`);
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => prompt(what + ":", text));
    else prompt(what + ":", text);
  }

  async function open(d, onUnlocked) {
    const id = await requestId(d);
    const link = upiLink(id);
    const box = $("#pay");
    box.innerHTML = `
      <div class="paycard" role="dialog" aria-modal="true" aria-labelledby="payTitle">
        <div class="payhead"><h3 id="payTitle">PDF साठी ₹${PAY_CONFIG.amount} शुल्क</h3><button id="payClose" aria-label="बंद">✕</button></div>
        <p class="muted">${h(d.owner || "")} — मौजे ${h(d.gav || "")} — गट क्र. ${h(d.gat || "")}</p>
        <div class="paygrid">
          <div class="qrbox">
            <div class="qr">${qrSvg(link)}</div>
            <div class="amt">₹${PAY_CONFIG.amount}</div>
            <div class="upi">${h(PAY_CONFIG.upiId)} <button class="mini2" id="copyUpi">कॉपी</button></div>
            <a class="button primary mobileonly" href="${h(link)}">UPI ॲपने भरा</a>
            <p class="muted sm">GPay / PhonePe / Paytm / BHIM ने स्कॅन करा</p>
          </div>
          <ol class="steps">
            <li><b>QR स्कॅन करून ₹${PAY_CONFIG.amount} भरा.</b> पेमेंट नोटमध्ये अर्ज कोड आपोआप येतो.</li>
            <li>आपला अर्ज कोड: <span class="code">${id}</span> <button class="mini2" id="copyId">कॉपी</button></li>
            <li><label>UTR / Transaction ID (१२ अंकी)<input id="utr" inputmode="numeric" maxlength="22" placeholder="उदा. 412345678901"></label>
                <label>आपला मोबाईल क्रमांक<input id="mob" inputmode="tel" maxlength="13" placeholder="10 अंकी"></label>
                <button id="sendWa" class="primary">WhatsApp वर पाठवा</button></li>
            <li><label>मिळालेला अनलॉक कोड येथे पेस्ट करा<textarea id="code" rows="3" spellcheck="false"></textarea></label>
                <button id="unlock" class="primary">अनलॉक करा</button> <span id="codeMsg"></span></li>
          </ol>
        </div>
        <p class="disclaimer">ही खाजगी कागदपत्र तयार करण्याची सेवा आहे — शासकीय संकेतस्थळ / शासकीय शुल्क नाही.
          पेमेंट तपासून अनलॉक कोड WhatsApp वर पाठवला जाईल. PDF तयार न झाल्यास पैसे परत.</p>
      </div>`;
    box.hidden = false;

    const close = () => { box.hidden = true; box.innerHTML = ""; };
    $("#payClose").onclick = close;
    box.onclick = (e) => { if (e.target === box) close(); };
    $("#copyUpi").onclick = () => copy(PAY_CONFIG.upiId, "UPI ID");
    $("#copyId").onclick = () => copy(id, "अर्ज कोड");
    $("#sendWa").onclick = () => {
      const utr = $("#utr").value.replace(/\s+/g, "");
      const mob = $("#mob").value.replace(/\D+/g, "");
      if (!/^\d{12}$/.test(utr) && !/^[A-Za-z0-9]{10,22}$/.test(utr)) return ctx.toast("कृपया योग्य UTR / Transaction ID भरा", true);
      if (!/^(91)?\d{10}$/.test(mob)) return ctx.toast("कृपया १० अंकी मोबाईल क्रमांक भरा", true);
      const text = `नमस्कार, ${PAY_CONFIG.serviceName} — PDF अनलॉक कोड हवा आहे.\n` +
        `अर्ज कोड: ${id}\nUTR: ${utr}\nरक्कम: ₹${PAY_CONFIG.amount}\nमालक: ${d.owner || ""}\nगाव: ${d.gav || ""}, गट क्र. ${d.gat || ""}\nमोबाईल: ${mob}`;
      window.open(`https://wa.me/${PAY_CONFIG.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    };
    $("#unlock").onclick = async () => {
      const msg = $("#codeMsg");
      const res = await tryCode($("#code").value, id);
      if (!res) { msg.textContent = "✕ हा कोड या अर्जासाठी नाही. पूर्ण कोड कॉपी-पेस्ट केला आहे का तपासा."; msg.className = "bad"; return; }
      close();
      ctx.toast(res === "admin" ? "✔ मास्टर कोड — या ब्राउझरमध्ये सर्व PDF खुल्या" : "✔ अनलॉक झाले — आता PDF छापा / जतन करा");
      onUnlocked();
    };
  }

  function init(c) { ctx = c; }

  root.VihirPay = { init, isUnlocked, open, requestId, tryCode };
})(window);

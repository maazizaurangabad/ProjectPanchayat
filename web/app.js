/* विहीर अधिग्रहण — data-entry app.
 *
 * A small in-browser database:
 *   masters   : जिल्हा → तालुका → ग्रामपंचायत → गाव (→ वाड्या), each level keeps its own default details
 *   proposals : one record per well owner; printing renders the 25-page form via VihirForm
 *
 * Everything is stored in this browser (localStorage) with JSON backup / restore.
 * FONT_CSS and FORM_CSS are injected by build_app.py.
 */
(function () {
  "use strict";

  const STORE_KEY = "vihir_db_v1";
  const LEVELS = ["district", "taluka", "gp", "village"];
  const LEVEL_NAME = { district: "जिल्हा", taluka: "तालुका", gp: "ग्रामपंचायत", village: "गाव" };

  // ------------------------------------------------------------ fields
  // level: where the value is remembered (taluka / gp / village) or "proposal" (per owner)
  const SUGGEST = {
    upay: ["खाजगी विहीर अधिग्रहण", "टँकरद्वारे पाणी पुरवठा"],
    officer_pad: ["विस्तार अधिकारी", "कनिष्ठ अभियंता", "शाखा अभियंता", "उप अभियंता"],
    sv_status: ["कोरडी", "अपुरे पाणी", "गाळ साचलेली"],
    vp_status: ["पाण्याअभावी बंद", "चालू", "नादुरुस्त"],
    nal_status: ["उद्भव कोरडा", "अपुरा पाणी पुरवठा", "बंद"],
    jalyukt: ["निरंक"],
    ar_jm_upay: ["निरंक", "विहिर अधिग्रहण करणे", "टँकरद्वारे पाणी पुरवठा"],
    ar_aj_upay: ["निरंक", "विहिर अधिग्रहण करणे", "टँकरद्वारे पाणी पुरवठा"],
  };

  const GROUPS = [
    { title: "विहीर मालक व विहीर", level: "proposal", fields: [
      ["owner", "विहीर मालकाचे नाव (श्री. लिहू नका)", "text", true],
      ["owner_ra", "मालक राहणार", "text", true],
      ["gat", "गट क्र.", "text", true],
      ["antar", "विहिरीचे गावापर्यंत अंतर (कि.मी.)", "dec"],
      ["upay", "उपाय योजना", "text"],
      ["mobadla", "मोबदला कोणाच्या नावे (रिकामे = मालक)", "text"],
    ]},
    { title: "समाईक विहीर — सहहिस्सेदार", level: "proposal", fold: true, fields: [
      ["sah1", "सहहिस्सेदार 1", "text"], ["sah2", "सहहिस्सेदार 2", "text"], ["sah3", "सहहिस्सेदार 3", "text"],
      ["sah4", "सहहिस्सेदार 4", "text"], ["sah5", "सहहिस्सेदार 5", "text"],
    ]},
    { title: "दिनांक व ग्रामसभा ठराव", level: "proposal", fields: [
      ["dinank", "प्रस्ताव दिनांक", "date", true],
      ["tharav_no", "ग्रामसभा ठराव क्र.", "text"],
      ["tharav_dinank", "ठराव दिनांक (रिकामे = प्रस्ताव दिनांक)", "date"],
      ["sabha_san", "ग्रामसभा सन", "text"],
      ["pahani_dinank", "पाहणी दिनांक (रिकामे = प्रस्ताव दिनांक)", "date"],
      ["karar_dinank", "करारनामा दिनांक (रिकामे = प्रस्ताव दिनांक)", "date"],
    ]},
    { title: "तालुका स्तरावरील अधिकारी", level: "taluka", fields: [
      ["officer_name", "संयुक्त पाहणी अधिकारी नाव", "text"],
      ["officer_pad", "संयुक्त पाहणी अधिकारी पदनाम", "text"],
      ["kshetriya", "क्षेत्रीय अधिकारी (पा.टंचाई) नाव", "text"],
      ["upvibhag", "जि.प. उप विभाग (रिकामे = तालुका)", "text"],
    ]},
    { title: "ग्रामपंचायत पदाधिकारी", level: "gp", fields: [
      ["sarpanch", "सरपंच नाव", "text"],
      ["gramsevak", "ग्रामसेवक/ग्रा.वि.अ. नाव", "text"],
      ["police_patil", "पोलीस पाटील", "text"],
      ["chairman", "सहकारी संस्था चेअरमन", "text"],
      ["mahila", "ग्रा.पं. महिला सदस्य", "text"],
      ["anganwadi", "अंगणवाडी सेविका", "text"],
      ["mukhyadhyapak", "शाळेचे मुख्याध्यापक", "text"],
    ]},
    { title: "पंच व ठराव सूचक / अनुमोदक", level: "gp", fields: [
      ["panch1", "पंच 1", "text"], ["panch2", "पंच 2", "text"], ["panch3", "पंच 3", "text"],
      ["panch4", "पंच 4", "text"], ["panch5", "पंच 5", "text"],
      ["suchak", "ठराव सूचक", "text"], ["anumodak", "ठराव अनुमोदक", "text"],
    ]},
    { title: "गावाची माहिती", level: "village", fields: [
      ["sajja", "तलाठी सज्जा (रिकामे = गाव)", "text"],
      ["talathi", "मंडळ अधिकारी / तलाठी नाव", "text"],
      ["pop_2011", "लोकसंख्या सन 2011", "int"],
      ["pop_today", "आजची लोकसंख्या", "int"],
      ["tanchai_mahe", "टंचाई माहे ... पासून (उदा. जानेवारी 2027)", "text"],
      ["jalyukt", "जलयुक्त शिवार कामे", "text"],
    ]},
    { title: "पाणी पुरवठ्याची साधने", level: "village", fields: [
      ["sv_count", "सार्व. विहीर/बोअर संख्या", "int"],
      ["sv_status", "सार्व. विहीर सद्यस्थिती", "text"],
      ["hp_total", "एकूण हातपंप", "int"],
      ["hp_chalu", "चालू हातपंप", "int"],
      ["hp_thambun", "थांबून चालणारे हातपंप", "int"],
      ["hp_band", "पाण्याअभावी बंद हातपंप", "int"],
      ["hp_kayam", "कायम बंद हातपंप", "int"],
      ["vp_count", "विद्युत पंप संख्या", "int"],
      ["vp_status", "विद्युत पंप सद्यस्थिती", "text"],
      ["nal_count", "नळ योजना संख्या", "int"],
      ["nal_status", "नळ योजना सद्यस्थिती", "text"],
    ]},
    { title: "टंचाई कृती आराखडा", level: "village", fields: [
      ["ar_kal", "आराखडा कालावधी (उदा. जानेवारी 2027 ते जून 2027)", "text"],
      ["ar_samavisht", "आराखड्यात समाविष्ट", "select", false, ["", "आहे", "नाही"]],
      ["ar_jm_upay", "जाने-मार्च प्रस्तावित उपाय", "text"],
      ["ar_jm_kharch", "जाने-मार्च खर्च (लाखात)", "money"],
      ["ar_aj_upay", "एप्रिल-जून प्रस्तावित उपाय", "text"],
      ["ar_aj_kharch", "एप्रिल-जून खर्च (लाखात)", "money"],
    ]},
  ];
  const FIELDS = GROUPS.flatMap((g) => g.fields.map(([key, label, type, req, options]) =>
    ({ key, label, type, req: !!req, options, level: g.level })));
  const FIELD = Object.fromEntries(FIELDS.map((f) => [f.key, f]));
  const LEVEL_KEYS = (lvl) => FIELDS.filter((f) => f.level === lvl).map((f) => f.key);

  // ------------------------------------------------------------ database
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const node = (name, extra) => Object.assign({ id: uid(), name, info: {}, children: [] }, extra || {});

  function seed() {
    const talukas = ["जालना", "बदनापूर", "भोकरदन", "जाफ्राबाद", "अंबड", "घनसावंगी", "परतूर", "मंठा"]
      .map((n) => node(n));
    const jalna = talukas[0];
    const nidhona = node("निधोना", { wadis: ["आंबेडकर नगर"] });
    nidhona.info = { pop_2011: "464", pop_today: "520", sv_count: "1", sv_status: "कोरडी", hp_total: "2", hp_chalu: "0",
      hp_thambun: "1", hp_band: "1", hp_kayam: "0", vp_count: "1", vp_status: "पाण्याअभावी बंद", nal_count: "1",
      nal_status: "उद्भव कोरडा", jalyukt: "निरंक", tanchai_mahe: "जानेवारी 2027", ar_kal: "जानेवारी 2027 ते जून 2027",
      ar_samavisht: "आहे", ar_jm_upay: "निरंक", ar_jm_kharch: "0.00", ar_aj_upay: "विहिर अधिग्रहण करणे", ar_aj_kharch: "0.54" };
    const gp = node("निधोना");
    gp.info = { panch1: "सुभाष रामा जाधव", panch2: "शेख अहमद शेख रशीद", panch3: "गणेश बाबुराव काळे",
      suchak: "सुभाष रामा जाधव", anumodak: "गणेश बाबुराव काळे" };
    gp.children.push(nidhona);
    jalna.children.push(gp);
    const district = node("जालना");
    district.children = talukas;
    return { version: 1, settings: { mrDigits: false }, masters: [district], proposals: [] };
  }

  let db;
  function load() {
    try {
      const s = localStorage.getItem(STORE_KEY);
      if (s) { db = JSON.parse(s); return; }
    } catch (e) { /* storage blocked or corrupt — start fresh */ }
    db = seed();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
    catch (e) { toast("⚠ माहिती जतन होऊ शकली नाही: " + e.message, true); }
  }

  // path = [districtId, talukaId, gpId, villageId] (shorter is fine)
  function nodesOf(path) {
    const out = [];
    let list = db.masters;
    for (const id of path) {
      const n = list.find((x) => x.id === id);
      if (!n) break;
      out.push(n);
      list = n.children;
    }
    return out;
  }
  const childrenAt = (path) => (path.length === 0 ? db.masters : (nodesOf(path)[path.length - 1] || { children: [] }).children);
  const byName = (a, b) => a.name.localeCompare(b.name, "mr");

  // ------------------------------------------------------------ dom helpers
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function toast(msg, bad) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "show" + (bad ? " bad" : "");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (t.className = ""), 3200);
  }

  function fillSelect(sel, items, value, placeholder) {
    sel.innerHTML = `<option value="">${h(placeholder)}</option>` +
      items.slice().sort(byName).map((n) => `<option value="${n.id}">${h(n.name)}</option>`).join("");
    sel.value = items.some((n) => n.id === value) ? value : "";
  }

  // A row of cascading selects: जिल्हा → तालुका → ग्रा.पं. → गाव
  function cascade(container, depth, onChange, withAdd) {
    container.innerHTML = LEVELS.slice(0, depth).map((lvl, i) => `
      <label class="fld"><span>${LEVEL_NAME[lvl]}${withAdd ? ' <b class="req">*</b>' : ""}</span>
        <div class="selrow"><select data-i="${i}"></select>${withAdd ? `<button type="button" class="mini" data-add="${i}" title="नवीन ${LEVEL_NAME[lvl]} जोडा">+</button>` : ""}</div>
      </label>`).join("");
    const sels = $$("select", container);
    const api = {
      path() {
        const p = [];
        for (const s of sels) { if (!s.value) break; p.push(s.value); }
        return p;
      },
      set(path) {
        sels.forEach((s, i) => {
          const parent = path.slice(0, i);
          const ok = parent.length === i && parent.every(Boolean);
          fillSelect(s, ok ? childrenAt(parent) : [], path[i], ok ? `— ${LEVEL_NAME[LEVELS[i]]} निवडा —` : "—");
          s.disabled = !ok;
        });
        // auto-pick when there is exactly one choice (e.g. a single district)
        for (let i = 0; i < sels.length; i++) {
          if (!sels[i].value && !sels[i].disabled && sels[i].options.length === 2) {
            path = path.slice(0, i).concat(sels[i].options[1].value);
            return api.set(path);
          }
          if (!sels[i].value) break;
        }
      },
    };
    sels.forEach((s, i) => s.addEventListener("change", () => {
      api.set(sels.slice(0, i + 1).map((x) => x.value));
      onChange(api.path());
    }));
    $$("[data-add]", container).forEach((b) => b.addEventListener("click", () => {
      const i = +b.dataset.add;
      const parent = api.path().slice(0, i);
      if (parent.length < i) return toast(`आधी ${LEVEL_NAME[LEVELS[i - 1]]} निवडा`, true);
      const name = (prompt(`नवीन ${LEVEL_NAME[LEVELS[i]]} चे नाव:`) || "").trim();
      if (!name) return;
      const list = childrenAt(parent);
      let n = list.find((x) => x.name === name);
      if (!n) {
        n = node(name, LEVELS[i] === "village" ? { wadis: [] } : null);
        list.push(n);
        // a new ग्रामपंचायत usually has a village of the same name
        if (LEVELS[i] === "gp") n.children.push(node(name, { wadis: [] }));
        save();
      }
      const path = parent.concat(n.id);
      api.set(path);
      onChange(api.path());
    }));
    api.set([]);
    return api;
  }

  // ------------------------------------------------------------ form
  function inputFor(f) {
    const common = `data-key="${f.key}" id="f_${f.key}"`;
    if (f.type === "select") return `<select ${common}>${f.options.map((o) => `<option>${h(o)}</option>`).join("")}</select>`;
    const list = SUGGEST[f.key] ? ` list="dl_${f.key}"` : "";
    const dl = SUGGEST[f.key] ? `<datalist id="dl_${f.key}">${SUGGEST[f.key].map((o) => `<option value="${h(o)}">`).join("")}</datalist>` : "";
    if (f.type === "date") return `<input type="date" ${common}>`;
    if (f.type === "int") return `<input type="number" min="0" step="1" inputmode="numeric" ${common}>`;
    if (f.type === "dec") return `<input type="number" min="0" step="0.1" inputmode="decimal" ${common}>`;
    if (f.type === "money") return `<input type="number" min="0" step="0.01" inputmode="decimal" ${common}>`;
    return `<input type="text" autocomplete="off" ${common}${list}>${dl}`;
  }

  const BADGE = {
    proposal: ["या प्रस्तावापुरते", "b-prop"],
    taluka: ["तालुका निवडताच भरते", "b-tal"],
    gp: ["ग्रा.पं. निवडताच भरते", "b-gp"],
    village: ["गाव निवडताच भरते", "b-vil"],
  };

  function buildForm() {
    $("#groups").innerHTML = GROUPS.map((g) => `
      <details class="card" ${g.fold ? "" : "open"}>
        <summary><span>${g.title}</span><em class="badge ${BADGE[g.level][1]}">${BADGE[g.level][0]}</em></summary>
        <div class="grid">${g.fields.map(([key]) => {
          const f = FIELD[key];
          return `<label class="fld"><span>${h(f.label)}${f.req ? ' <b class="req">*</b>' : ""}</span>${inputFor(f)}</label>`;
        }).join("")}</div>
      </details>`).join("");
  }

  let editing = null;   // proposal id being edited, or null for a new one
  let formCascade;
  let lastPath = [];

  function wadiList(path) {
    const v = nodesOf(path)[3];
    return v ? (v.wadis || []) : [];
  }

  function onPlaceChange(path) {
    lastPath = path;
    const nodes = nodesOf(path);
    // fill remembered details level by level
    nodes.forEach((n, i) => {
      const lvl = LEVELS[i];
      if (lvl === "district") return;
      for (const k of LEVEL_KEYS(lvl)) setVal(k, (n.info || {})[k] || "");
    });
    // clear levels that are no longer selected
    for (let i = nodes.length; i < LEVELS.length; i++) {
      if (LEVELS[i] !== "district") for (const k of LEVEL_KEYS(LEVELS[i])) setVal(k, "");
    }
    const wl = wadiList(path);
    $("#dl_wadi").innerHTML = wl.map((w) => `<option value="${h(w)}">`).join("");
    const w = $("#f_wadi");
    if (w.value && nodes.length < 4) w.value = "";
    if (!w.value && wl.length === 1) w.value = wl[0];
    placeNote(nodes);
    validate();
  }

  function placeNote(nodes) {
    $("#placeNote").textContent = nodes.length === 4
      ? `${nodes[3].name} — मागील माहिती भरली आहे. बदल केल्यास "पुढील वेळेसाठी लक्षात ठेवा" ने जतन होईल.`
      : "गाव निवडल्यावर ग्रामपंचायत व गावाची साठवलेली माहिती आपोआप भरेल.";
  }

  function setVal(k, v) { const el = $("#f_" + k); if (el) el.value = v == null ? "" : v; }
  function getVal(k) { const el = $("#f_" + k); return el ? el.value.trim() : ""; }

  function formData() {
    const nodes = nodesOf(lastPath);
    const d = {};
    for (const f of FIELDS) d[f.key] = getVal(f.key);
    d.district = nodes[0] ? nodes[0].name : "";
    d.taluka = nodes[1] ? nodes[1].name : "";
    d.gp = nodes[2] ? nodes[2].name : "";
    d.gav = nodes[3] ? nodes[3].name : "";
    d.wadi = getVal("wadi");
    return d;
  }

  function problems(d, path) {
    const p = [];
    if ((path || []).length < 4) p.push("ठिकाण (जिल्हा / तालुका / ग्रामपंचायत / गाव) पूर्ण निवडा");
    for (const f of FIELDS) if (f.req && !d[f.key]) p.push(f.label.replace(/ \(.*\)$/, "") + " आवश्यक आहे");
    const parts = ["hp_chalu", "hp_thambun", "hp_band", "hp_kayam"].map((k) => d[k]);
    if (d.hp_total && parts.some(Boolean)) {
      const sum = parts.reduce((a, x) => a + (+x || 0), 0);
      if (sum !== +d.hp_total) p.push(`हातपंप: चालू+थांबून+बंद+कायम बंद = ${sum}, पण एकूण ${d.hp_total}`);
    }
    for (const k of ["dinank", "tharav_dinank", "pahani_dinank", "karar_dinank"]) {
      if (d[k] && !/^\d{4}-\d{2}-\d{2}$/.test(d[k])) p.push(FIELD[k].label + " चुकीचा आहे");
    }
    return p;
  }

  function validate() {
    const d = formData();
    const p = problems(d, lastPath);
    for (const f of FIELDS) if (f.req) $("#f_" + f.key).classList.toggle("missing", !d[f.key]);
    $("#issues").innerHTML = p.length
      ? `<b>⚠ अपूर्ण :</b><ul>${p.map((x) => `<li>${h(x)}</li>`).join("")}</ul>`
      : "✔ सर्व आवश्यक माहिती भरली आहे.";
    $("#issues").className = p.length ? "issues warn" : "issues ok";
    return p;
  }

  function newProposal(keepPlace) {
    editing = null;
    for (const f of FIELDS) if (f.level === "proposal") setVal(f.key, "");
    $("#formTitle").textContent = "नवीन प्रस्ताव";
    if (keepPlace) onPlaceChange(lastPath);
    else { formCascade.set([]); setVal("wadi", ""); onPlaceChange(formCascade.path()); }
    showTab("form");
  }

  function openProposal(id, asCopy) {
    const p = db.proposals.find((x) => x.id === id);
    if (!p) return;
    showTab("form");
    formCascade.set(p.path || []);
    lastPath = formCascade.path();
    const nodes = nodesOf(lastPath);
    $("#dl_wadi").innerHTML = wadiList(lastPath).map((w) => `<option value="${h(w)}">`).join("");
    for (const f of FIELDS) setVal(f.key, p.data[f.key] || "");
    setVal("wadi", p.data.wadi || "");
    placeNote(nodes);
    if (nodes.length < (p.path || []).length) toast("⚠ या प्रस्तावाचे गाव माहितीतून काढले गेले आहे — पुन्हा निवडा", true);
    if (asCopy) {
      editing = null;
      for (const k of ["owner", "owner_ra", "gat", "antar", "mobadla", "sah1", "sah2", "sah3", "sah4", "sah5"]) setVal(k, "");
      $("#formTitle").textContent = "नवीन प्रस्ताव (त्याच गावासाठी नक्कल)";
    } else {
      editing = id;
      $("#formTitle").textContent = "प्रस्ताव संपादन — " + (p.data.owner || "");
    }
    validate();
    window.scrollTo(0, 0);
  }

  function rememberDefaults(path, d) {
    const nodes = nodesOf(path);
    nodes.forEach((n, i) => {
      const lvl = LEVELS[i];
      if (lvl === "district") return;
      n.info = n.info || {};
      for (const k of LEVEL_KEYS(lvl)) n.info[k] = d[k];
    });
    const v = nodes[3];
    if (v && d.wadi) {
      v.wadis = v.wadis || [];
      if (!v.wadis.includes(d.wadi) && d.wadi !== v.name) v.wadis.push(d.wadi);
    }
  }

  function saveProposal() {
    const d = formData();
    const path = lastPath.slice();
    if (path.length < 4) { toast("आधी ठिकाण (गावापर्यंत) निवडा", true); return null; }
    if ($("#remember").checked) rememberDefaults(path, d);
    const now = new Date().toISOString();
    let p = editing && db.proposals.find((x) => x.id === editing);
    // Changing only the applicant's name and saving again usually means "next applicant",
    // not "rename the one just saved" — ask instead of silently overwriting.
    if (p && p.data.owner && d.owner && p.data.owner !== d.owner &&
        confirm(`अर्जदाराचे नाव बदलले आहे ("${p.data.owner}" → "${d.owner}").\n\nOK = नवीन प्रस्ताव म्हणून जतन करा\nCancel = "${p.data.owner}" चाच प्रस्ताव बदला`)) {
      p = null;
      editing = null;
    }
    if (p) Object.assign(p, { path, data: d, updated: now });
    else {
      p = { id: uid(), path, data: d, created: now, updated: now };
      db.proposals.push(p);
      editing = p.id;
    }
    save();
    $("#formTitle").textContent = "प्रस्ताव संपादन — " + (d.owner || "");
    const n = validate().length;
    toast(n ? `जतन केले (⚠ ${n} बाबी अपूर्ण)` : "✔ प्रस्ताव जतन केला");
    return p;
  }

  // ------------------------------------------------------------ form file (save / load)
  const FILE_TYPE = "vihir-form";

  function saveFormFile() {
    const d = formData();
    if (lastPath.length < 4) return toast("आधी ठिकाण (गावापर्यंत) निवडा", true);
    const file = { type: FILE_TYPE, version: 1, saved: new Date().toISOString(),
      place: { district: d.district, taluka: d.taluka, gp: d.gp, gav: d.gav }, data: d };
    const safe = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "").trim().replace(/\s+/g, "_");
    download(`Vihir_${safe(d.gav)}_${safe(d.owner) || "माहिती"}.json`, JSON.stringify(file, null, 1), "application/json");
    toast("✔ फाईल डाउनलोड झाली — पुढील अर्जासाठी ती \"📂 फाईल उघडा\" ने उघडा");
  }

  // Find the place by names; create whatever is missing (file may come from another computer).
  function resolvePlace(place) {
    const names = [place.district, place.taluka, place.gp, place.gav];
    const path = [];
    let list = db.masters, created = 0;
    names.forEach((name, i) => {
      if (!name) return;
      let n = list.find((x) => x.name === name);
      if (!n) { n = node(name, LEVELS[i] === "village" ? { wadis: [] } : null); list.push(n); created++; }
      path.push(n.id);
      list = n.children;
    });
    if (created) save();
    return { path, created };
  }

  function loadFormFile(file) {
    const r = new FileReader();
    r.onload = () => {
      let x;
      try { x = JSON.parse(r.result); } catch (e) { return toast("ही फाईल वाचता आली नाही", true); }
      if (!x || x.type !== FILE_TYPE || !x.data) {
        return toast(x && Array.isArray(x.proposals) ? "ही पूर्ण बॅकअप फाईल आहे — ती \"बॅकअप व सेटिंग\" मधून परत आणा" : "ही विहीर अधिग्रहण माहिती फाईल नाही", true);
      }
      const { path, created } = resolvePlace(x.place || x.data);
      showTab("form");
      editing = null;
      formCascade.set(path);
      lastPath = formCascade.path();
      $("#dl_wadi").innerHTML = wadiList(lastPath).map((w) => `<option value="${h(w)}">`).join("");
      for (const f of FIELDS) setVal(f.key, x.data[f.key] || "");
      setVal("wadi", x.data.wadi || "");
      $("#formTitle").textContent = "नवीन प्रस्ताव (फाईलमधून)";
      placeNote(nodesOf(lastPath));
      validate();
      window.scrollTo(0, 0);
      const owner = $("#f_owner");
      owner.focus();
      owner.select();
      toast(`✔ "${file.name}" मधील माहिती भरली — अर्जदाराचे नाव बदला व जतन करा` + (created ? ` (${created} नवीन ठिकाणे जोडली)` : ""));
    };
    r.readAsText(file);
  }

  // ------------------------------------------------------------ print
  function docHtml(data) {
    const screen = "@media screen{html{background:#525659}body{padding:12px 0}" +
      ".page{background:#fff;margin:0 auto 12px;box-shadow:0 2px 10px rgba(0,0,0,.4)}}";
    return VihirForm.renderDocument(data, { fontCss: FONT_CSS, css: FORM_CSS + screen, mrDigits: !!db.settings.mrDigits });
  }

  function preview(data, title) {
    const fr = $("#pvFrame");
    $("#pvTitle").textContent = title || "पूर्वावलोकन";
    $("#preview").hidden = false;
    document.body.classList.add("noscroll");
    fr.srcdoc = docHtml(data);
  }

  function printPreview() {
    const w = $("#pvFrame").contentWindow;
    const go = () => { w.focus(); w.print(); };
    (w.document.fonts ? w.document.fonts.ready : Promise.resolve()).then(go, go);
  }

  function closePreview() {
    $("#preview").hidden = true;
    document.body.classList.remove("noscroll");
    $("#pvFrame").srcdoc = "";
  }

  // ------------------------------------------------------------ list
  let listCascade;
  function renderList() {
    const path = listCascade.path();
    const q = $("#search").value.trim().toLowerCase();
    const rows = db.proposals.filter((p) =>
      path.every((id, i) => (p.path || [])[i] === id) &&
      (!q || [p.data.owner, p.data.gav, p.data.wadi, p.data.gat, p.data.gp].join(" ").toLowerCase().includes(q)))
      .sort((a, b) => (b.data.dinank || "").localeCompare(a.data.dinank || "") || b.updated.localeCompare(a.updated));
    $("#count").textContent = `${rows.length} / ${db.proposals.length} प्रस्ताव`;
    $("#listBody").innerHTML = rows.length ? rows.map((p, i) => {
      const bad = problems(p.data, p.path).length;
      return `<tr>
        <td>${i + 1}</td>
        <td>${h(VihirForm.fmtDate(p.data.dinank) || "—")}</td>
        <td><b>${h(p.data.owner || "—")}</b><div class="sub">गट ${h(p.data.gat || "—")}</div></td>
        <td>${h(p.data.gav)}<div class="sub">${h(p.data.wadi && p.data.wadi !== p.data.gav ? p.data.wadi : "")}</div></td>
        <td>${h(p.data.taluka)}</td>
        <td>${bad ? `<span class="tag warn">⚠ अपूर्ण (${bad})</span>` : '<span class="tag ok">पूर्ण</span>'}</td>
        <td class="act">
          <button data-open="${p.id}">उघडा</button>
          <button data-pdf="${p.id}" class="primary">PDF</button>
          <button data-copy="${p.id}" title="त्याच गावासाठी नवीन प्रस्ताव">नक्कल</button>
          <button data-del="${p.id}" class="danger" title="हटवा">✕</button>
        </td></tr>`;
    }).join("") : `<tr><td colspan="7" class="empty">एकही प्रस्ताव नाही. "नवीन प्रस्ताव" वर क्लिक करा.</td></tr>`;
  }

  function onListClick(e) {
    const b = e.target.closest("button");
    if (!b) return;
    const id = b.dataset.open || b.dataset.pdf || b.dataset.copy || b.dataset.del;
    const p = db.proposals.find((x) => x.id === id);
    if (!p) return;
    if (b.dataset.open) openProposal(id);
    else if (b.dataset.copy) openProposal(id, true);
    else if (b.dataset.pdf) preview(p.data, `${p.data.gav} — ${p.data.owner}`);
    else if (b.dataset.del && confirm(`"${p.data.owner || "हा"}" प्रस्ताव कायमचा हटवायचा?`)) {
      db.proposals = db.proposals.filter((x) => x.id !== id);
      if (editing === id) editing = null;
      save(); renderList(); toast("प्रस्ताव हटवला");
    }
  }

  // ------------------------------------------------------------ masters
  let mCascade;
  function renderMaster() {
    const path = mCascade.path();
    const nodes = nodesOf(path);
    const n = nodes[nodes.length - 1];
    const box = $("#mEditor");
    if (!n) { box.innerHTML = '<p class="muted">वरून जिल्हा / तालुका / ग्रामपंचायत / गाव निवडा.</p>'; return; }
    const lvl = LEVELS[nodes.length - 1];
    const keys = LEVEL_KEYS(lvl);
    const childLvl = LEVELS[nodes.length];
    const used = db.proposals.filter((p) => path.every((id, i) => (p.path || [])[i] === id)).length;
    box.innerHTML = `
      <div class="mhead"><h3>${LEVEL_NAME[lvl]} : ${h(n.name)}</h3>
        <div><button id="mRename">नाव बदला</button> <button id="mDelete" class="danger">हटवा</button></div></div>
      <p class="muted">${used} प्रस्ताव या ${LEVEL_NAME[lvl]} अंतर्गत आहेत.</p>
      ${keys.length ? `<div class="grid">${keys.map((k) => {
        const f = FIELD[k];
        return `<label class="fld"><span>${h(f.label)}</span>${inputFor(f).replace(/id="f_/g, 'id="m_').replace(/data-key=/g, "data-mkey=").replace(/list="dl_/g, 'list="mdl_').replace(/id="dl_/g, 'id="mdl_')}</label>`;
      }).join("")}</div>` : '<p class="muted">जिल्हा स्तरावर वेगळी माहिती नाही.</p>'}
      ${lvl === "village" ? `<label class="fld wide"><span>वाड्या / तांडे / वस्त्या (एका ओळीत एक)</span><textarea id="mWadis" rows="4">${h((n.wadis || []).join("\n"))}</textarea></label>` : ""}
      ${keys.length || lvl === "village" ? '<p><button id="mSave" class="primary">माहिती जतन करा</button></p>' : ""}
      ${childLvl ? `<hr><h4>एकदम अनेक ${LEVEL_NAME[childLvl]} जोडा</h4>
        <p class="muted">एका ओळीत एक नाव. आधी असलेली नावे पुन्हा जोडली जाणार नाहीत.${childLvl === "gp" ? " प्रत्येक ग्रामपंचायतीसाठी त्याच नावाचे गाव आपोआप तयार होईल." : ""}</p>
        <textarea id="mBulk" rows="5" placeholder="${childLvl === "village" ? "उदा.\nनिधोना\nवाघ्रुळ" : ""}"></textarea>
        <p><button id="mBulkAdd">जोडा</button> <span class="muted">सध्या ${n.children.length} ${LEVEL_NAME[childLvl]}</span></p>` : ""}`;
    keys.forEach((k) => { const el = $("#m_" + k); if (el) el.value = (n.info || {})[k] || ""; });

    const on = (id, fn) => { const el = $("#" + id); if (el) el.addEventListener("click", fn); };
    on("mSave", () => {
      n.info = n.info || {};
      keys.forEach((k) => (n.info[k] = $("#m_" + k).value.trim()));
      if (lvl === "village") n.wadis = $("#mWadis").value.split("\n").map((s) => s.trim()).filter(Boolean);
      save(); toast("✔ " + n.name + " ची माहिती जतन केली");
    });
    on("mRename", () => {
      const name = (prompt("नवीन नाव:", n.name) || "").trim();
      if (!name || name === n.name) return;
      n.name = name; save(); mCascade.set(path); renderMaster();
      toast("नाव बदलले. जुन्या प्रस्तावांमध्ये पुन्हा जतन केल्यावर नवीन नाव येईल.");
    });
    on("mDelete", () => {
      if (used) return toast(`हटवता येणार नाही — ${used} प्रस्ताव याच्या अंतर्गत आहेत`, true);
      if (n.children.length && !confirm(`${n.name} व त्याखालील ${n.children.length} नोंदी हटवायच्या?`)) return;
      if (!n.children.length && !confirm(`${n.name} हटवायचे?`)) return;
      const list = childrenAt(path.slice(0, -1));
      list.splice(list.indexOf(n), 1);
      save(); mCascade.set(path.slice(0, -1)); renderMaster(); toast("हटवले");
    });
    on("mBulkAdd", () => {
      const names = $("#mBulk").value.split("\n").map((s) => s.trim()).filter(Boolean);
      let added = 0;
      for (const name of names) {
        if (n.children.some((c) => c.name === name)) continue;
        const c = node(name, childLvl === "village" ? { wadis: [] } : null);
        if (childLvl === "gp") c.children.push(node(name, { wadis: [] }));
        n.children.push(c); added++;
      }
      save(); mCascade.set(path); renderMaster();
      toast(`${added} नवीन ${LEVEL_NAME[childLvl]} जोडले`);
    });
  }

  // ------------------------------------------------------------ backup
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function exportBackup() {
    const d = new Date().toISOString().slice(0, 10);
    download(`Vihir_Backup_${d}.json`, JSON.stringify(db, null, 1), "application/json");
    db.settings.lastBackup = new Date().toISOString();
    save(); renderBackupInfo();
  }

  function importBackup(file) {
    const r = new FileReader();
    r.onload = () => {
      let x;
      try { x = JSON.parse(r.result); } catch (e) { return toast("ही बॅकअप फाईल वाचता आली नाही", true); }
      if (!x || !Array.isArray(x.masters) || !Array.isArray(x.proposals)) return toast("ही विहीर अधिग्रहण बॅकअप फाईल नाही", true);
      if (!confirm(`बॅकअप मध्ये ${x.proposals.length} प्रस्ताव आहेत. सध्याची सर्व माहिती बदलून ही माहिती घ्यायची?`)) return;
      db = x; db.settings = db.settings || {};
      save(); refreshAll(); toast("✔ बॅकअप परत आणला");
    };
    r.readAsText(file);
  }

  // CSV in the same columns generate.py reads, for bulk printing with Python
  function exportCsv() {
    const cols = ["district", "taluka", "gav", "gp", "wadi"].concat(FIELDS.map((f) => f.key));
    const cell = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const lines = [cols.join(",")].concat(db.proposals.map((p) =>
      cols.map((k) => cell(FIELD[k] && FIELD[k].type === "date" ? VihirForm.fmtDate(p.data[k]) : p.data[k])).join(",")));
    download("Vihir_Proposals.csv", "﻿" + lines.join("\r\n"), "text/csv");
  }

  function renderBackupInfo() {
    const lb = db.settings.lastBackup;
    $("#backupInfo").textContent = `एकूण ${db.proposals.length} प्रस्ताव. ` +
      (lb ? `शेवटचा बॅकअप: ${new Date(lb).toLocaleString("en-IN")}` : "अजून बॅकअप घेतलेला नाही.");
    $("#mrDigits").checked = !!db.settings.mrDigits;
  }

  // ------------------------------------------------------------ tabs
  function showTab(name) {
    $$(".tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
    $$(".pane").forEach((p) => (p.hidden = p.id !== "pane-" + name));
    if (name === "list") { listCascade.set(listCascade.path()); renderList(); }
    if (name === "masters") { mCascade.set(mCascade.path()); renderMaster(); }
    if (name === "backup") renderBackupInfo();
    try { localStorage.setItem("vihir_tab", name); } catch (e) { /* ignore */ }
  }

  function refreshAll() {
    formCascade.set(formCascade.path());
    onPlaceChange(formCascade.path());
    listCascade.set([]); mCascade.set([]);
    renderList(); renderMaster(); renderBackupInfo();
  }

  // ------------------------------------------------------------ init
  function init() {
    const st = document.createElement("style");
    st.textContent = FONT_CSS;
    document.head.appendChild(st);
    load();
    buildForm();

    formCascade = cascade($("#place"), 4, onPlaceChange, true);
    listCascade = cascade($("#listPlace"), 4, renderList, false);
    mCascade = cascade($("#mPlace"), 4, renderMaster, false);

    $("#pane-form").addEventListener("input", validate);
    $("#btnSave").addEventListener("click", saveProposal);
    $("#btnPdf").addEventListener("click", () => {
      const p = saveProposal();
      if (p) preview(p.data, `${p.data.gav} — ${p.data.owner}`);
    });
    $("#btnNext").addEventListener("click", () => { if (saveProposal()) { newProposal(true); toast("✔ जतन केले — त्याच गावासाठी पुढील प्रस्ताव"); } });
    $("#btnNew").addEventListener("click", () => newProposal(false));
    $("#btnSaveFile").addEventListener("click", saveFormFile);
    $("#fileLoad").addEventListener("change", (e) => { if (e.target.files[0]) loadFormFile(e.target.files[0]); e.target.value = ""; });
    $$(".tab").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
    $("#listBody").addEventListener("click", onListClick);
    $("#search").addEventListener("input", renderList);
    $("#pvPrint").addEventListener("click", printPreview);
    $("#pvClose").addEventListener("click", closePreview);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#preview").hidden) closePreview(); });
    $("#btnExport").addEventListener("click", exportBackup);
    $("#btnCsv").addEventListener("click", exportCsv);
    $("#fileImport").addEventListener("change", (e) => { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ""; });
    $("#btnBlank").addEventListener("click", () => preview({}, "रिकामा फॉर्म"));
    $("#mrDigits").addEventListener("change", (e) => { db.settings.mrDigits = e.target.checked; save(); });

    onPlaceChange(formCascade.path());
    let tab = "form";
    try { tab = localStorage.getItem("vihir_tab") || "form"; } catch (e) { /* ignore */ }
    showTab(["form", "list", "masters", "backup"].includes(tab) ? tab : "form");
  }

  document.addEventListener("DOMContentLoaded", init);
})();

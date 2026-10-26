/* खाजगी विहीर अधिग्रहण प्रस्ताव — page templates (25 pages).
 *
 * Shared by the browser app (Vihir_Adhigrahan_App.html) and generate.py
 * (which runs this file inside Chromium through Playwright).
 *
 *   VihirForm.renderDocument(data, {fontCss, css, mrDigits}) -> full HTML string
 *
 * `data` is a flat object of field keys (gav, owner, gat, dinank ...).
 * Empty values print as dotted lines to be filled by hand.
 */
(function (root) {
  "use strict";

  const FALLBACK = {
    wadi: "gav", gp: "gav", sajja: "gav",
    tharav_dinank: "dinank", pahani_dinank: "dinank", karar_dinank: "dinank",
    mobadla: "owner", upvibhag: "taluka",
  };

  const MR = "०१२३४५६७८९";
  const mrDigits = (s) => String(s).replace(/[0-9]/g, (c) => MR[+c]);

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
  }

  // ISO date (2027-01-15) -> 15/01/2027; anything else is kept as typed.
  function fmtDate(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
  }

  const DATE_KEYS = new Set(["dinank", "tharav_dinank", "pahani_dinank", "karar_dinank"]);

  function makeRow(raw, opts) {
    const vals = {};
    for (const [k, v] of Object.entries(raw || {})) {
      let s = v == null ? "" : String(v).trim();
      if (DATE_KEYS.has(k)) s = fmtDate(s);
      vals[k] = s;
    }
    const conv = opts && opts.mrDigits ? mrDigits : (s) => s;
    return {
      raw: vals,
      get: (k) => vals[k] || "",
      // value with fallback, as printed (digits converted if asked)
      g(k) {
        let v = vals[k] || "";
        if (!v && FALLBACK[k]) v = vals[FALLBACK[k]] || "";
        return conv(v);
      },
      conv,
    };
  }

  // ------------------------------------------------------------ blanks
  const F = (d, key, w = 40, cls = "") =>
    `<span class="f ${cls}" style="min-width:${w}mm">${esc(d.g(key)) || "&nbsp;"}</span>`;
  const V = (text, w = 40) =>
    `<span class="f" style="min-width:${w}mm">${esc(text) || "&nbsp;"}</span>`;
  const D = (d, key, w = 30) => {
    const v = d.g(key);
    if (v) return `<span class="f" style="min-width:${w}mm">${esc(v)}</span>`;
    return `<span class="f date" style="min-width:${w}mm">&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/20&nbsp;&nbsp;&nbsp;&nbsp;</span>`;
  };

  // taluka / district / sub-division names (blank line if not set)
  const TAL = (d) => (d.g("taluka") ? esc(d.g("taluka")) : V("", 24));
  const DIST = (d) => (d.g("district") ? esc(d.g("district")) : V("", 24));
  const UPV = (d) => (d.g("upvibhag") ? esc(d.g("upvibhag")) : V("", 24));
  // "ता. जि. जालना" when taluka and district share a name, else "ता. X जि. Y"
  const TJ = (d) => (d.g("taluka") && d.g("taluka") === d.g("district")
    ? `ता. जि. ${TAL(d)}` : `ता. ${TAL(d)} जि. ${DIST(d)}`);

  // ------------------------------------------------------------ blocks
  const sigGp = (d, top = 22) => {
    const gp = F(d, "gp", 38);
    return `<div class="sig" style="margin-top:${top}mm">
  <div><b>सरपंच</b><br><span class="nm">${esc(d.g("sarpanch"))}</span><br>ग्रामपंचायत ${gp}</div>
  <div class="r"><b>ग्रामसेवक/ग्रा.वि.अ.</b><br><span class="nm">${esc(d.g("gramsevak"))}</span><br>ग्रामपंचायत ${gp}</div>
</div>`;
  };

  const sigThree = (d, top = 22) => {
    const gp = F(d, "gp", 32);
    return `<div class="sig three" style="margin-top:${top}mm">
  <div><b>तलाठी</b><br><span class="nm">${esc(d.g("talathi"))}</span><br>सज्जा ${F(d, "sajja", 28)}</div>
  <div class="c"><b>सरपंच</b><br><span class="nm">${esc(d.g("sarpanch"))}</span><br>ग्रामपंचायत ${gp}</div>
  <div class="r"><b>ग्रामसेवक/ग्रा.वि.अ.</b><br><span class="nm">${esc(d.g("gramsevak"))}</span><br>ग्रामपंचायत ${gp}</div>
</div>`;
  };

  const sigOfficers = (left, right, top = 24) => `<div class="sig" style="margin-top:${top}mm">
  <div><b>${left[0]}</b><br>${left[1]}</div>
  <div class="r"><b>${right[0]}</b><br>${right[1]}</div>
</div>`;

  function table(headers, rows, widths, cls = "") {
    const th = headers.map((h, i) => (widths ? `<th style="width:${widths[i]}">${h}</th>` : `<th>${h}</th>`)).join("");
    const tr = rows.map((r) => "<tr>" + r.map((c) => `<td>${c}</td>`).join("") + "</tr>").join("");
    return `<table class="grid ${cls}"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
  }

  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const upayOf = (d) => d.g("upay") || (d.get("gav") ? "खाजगी विहीर अधिग्रहण" : "");

  // ------------------------------------------------------------ pages
  // Each function returns a list of pages; a page is an HTML string or ["land", html].

  function pPanchanama(d) {
    const panch = range(1, 5).map((i) =>
      `<tr><td class="n">${i}.</td><td class="nm2">${esc(d.g("panch" + i))}</td><td class="sg">स्वाक्षरी</td></tr>`).join("");
    return [`
<h1>पंचनामा</h1>
<p class="rt">दिनांक ${D(d, "pahani_dinank")}</p>
<p class="j">आज दिनांक ${D(d, "pahani_dinank")} रोजी आम्ही खालील स्वाक्षरी करणारे पंच मंडळी मौजे ${F(d, "gav")}
अंतर्गत तालुका ${TAL(d)} येथील नळ पाणी पुरवठा योजनेच्या विहीरीची/हातपंपाची/बोअरची व इतर सर्व स्त्रोतांमधून
मिळणाऱ्या पिण्याच्या पाण्याची पाहणी केली असता दर दिवशी दरडोई २० लिटर पेक्षा कमी पाणी मिळत असल्यामुळे
सदर गावाला पाणी पुरवठा करण्यासाठी गट क्र. ${F(d, "gat", 22)} मधील विहीर मालक श्री. ${F(d, "owner", 62)}
रा. ${F(d, "owner_ra", 34)} तालुका ${TAL(d)} यांच्या विहीरीला/बोअरला पाणी चांगले असल्यामुळे संबंधिताची विहीर/बोअर
अधिग्रहण करून मौजे ${F(d, "wadi")} या गावासाठी पिण्याच्या पाण्याचा पुरवठा करण्यात यावा असे ठरले.</p>
<p><b>गावातील पंच मंडळीचे नाव व स्वाक्षरी</b></p>
<table class="sigtab">${panch}</table>
<p style="margin-top:6mm"><b>समक्ष</b></p>
${sigGp(d, 14)}`];
  }

  function pLetter(d) {
    const items = ["विहीरीचा पंचनामा", "ग्रामसभेचा ठराव", "दरडोई पाणी उपलब्ध प्रमाणपत्र", "लोकसंख्या प्रमाणपत्र",
      "ग्रामसेवकाचे प्रमाणपत्र", "तलाठी यांचे प्रमाणपत्र", "ना हरकत प्रमाणपत्र", "जलयुक्त शिवार प्रमाणपत्र",
      "सिंचन विहीर योजना प्रमाणपत्र", "विहीर मालकाचे संमतीपत्र",
      "विहीर मालकाकडून रु. १००/- चे स्टॅम्प पेपरवर हमीपत्र/करारनामा", "विहीर मालकाचा ७/१२ डिजीटल प्रत"];
    const li = items.map((x) => `<li>${x}</li>`).join("");
    return [`
<p class="rt">दिनांक ${D(d, "dinank")}</p>
<p class="addr">प्रति,<br>मा. गटविकास अधिकारी वर्ग-१,<br>पंचायत समिती ${TAL(d)}</p>
<p class="subj"><b>विषय :-</b> ग्राम पंचायत कार्यालय ${F(d, "gp")} ${TJ(d)} अंतर्गत (गाव/वाडी/तांडा/वस्ती)
${F(d, "wadi")} येथे पाणी टंचाई निवारणार्थ खाजगी विहीर/बोअर अधिग्रहण करून पाणी पुरवठा करणे बाबत.</p>
<p>मा. महोदय,</p>
<p class="j">वरील विषयास अनुसरून सविनय सादर करण्यात येते की, ग्रामपंचायत ${F(d, "gp")} ${TJ(d)} अंतर्गत
${F(d, "wadi")} या (गाव/वाडी/तांडा/वस्ती) येथे अतिशय तीव्र पाणी टंचाई निर्माण झाली आहे. पाणी टंचाई
निवारणार्थ विहीर/बोअर अधिग्रहण करणे बाबतचा ठराव पारीत केला आहे.</p>
<p class="j">तरी मा. साहेबांना विनंती की, पाणी टंचाई निवारणार्थ श्री. ${F(d, "owner", 62)} यांची खाजगी विहीर/बोअर
गट क्र. ${F(d, "gat", 22)} मधील खाजगी विहीर अधिग्रहण करून पाणी पुरवठा करणेसाठी प्रस्ताव सादर करण्यात येत आहे.
तरी स्वीकार व्हावा ही विनंती.</p>
<p><b>सोबत :-</b></p><ol class="att">${li}</ol>
${sigGp(d, 10)}`];
  }

  function attachPage(title, note, boxes = 1, labels = [""]) {
    const bx = labels.map((l) =>
      `<div class="photo" style="height:${Math.floor(200 / boxes) - 8}mm"><span>${l}</span></div>`).join("");
    return `<h2>${title}</h2><p class="ctr sm">${note}</p>${bx}`;
  }

  const pProceeding = () => [attachPage("ग्रामपंचायत प्रोसिडींग बुक प्रत",
    "ग्रामसभा / मासिक सभेच्या प्रोसिडींग बुकची साक्षांकित प्रत येथे जोडावी.")];

  function pGsTalathi(d) {
    const body = `प्रमाणित करण्यात येते की, मौजे ${F(d, "gav")} ता. ${TAL(d)} अंतर्गत ${F(d, "wadi")} येथे १.५ कि.मी. ` +
      "परिसरात पाणी पुरवठ्याचे सर्व स्त्रोत कोरडे असून विहीर/बोअर अधिग्रहण करून पाणी पुरवठा करण्याची आवश्यकता आहे.";
    return [`
<h2>ग्रामसेवकाचे प्रमाणपत्र</h2>
<p class="rt">दिनांक ${D(d, "dinank")}</p>
<p class="j">${body}</p>
${sigGp(d, 16)}
<hr class="cut">
<h2>तलाठ्याचे प्रमाणपत्र</h2>
<p class="rt">दिनांक ${D(d, "dinank")}</p>
<p class="j">${body}</p>
<p class="j">करिता नाहरकत प्रमाणपत्र देण्यात येते.</p>
<div class="sig" style="margin-top:16mm"><div></div>
<div class="r"><b>तलाठी</b><br><span class="nm">${esc(d.g("talathi"))}</span><br>सज्जा ${F(d, "sajja", 30)}</div></div>`];
  }

  function pTharav(d) {
    const upay = esc(upayOf(d));
    const t3 = table(["अ.क्र.", "योजनेचे नाव", "स्थळ"],
      [[upay ? "१" : "", upay, esc(d.g("wadi"))], ["", "", ""]], ["12%", "50%", "38%"]);
    const t4 = table(["अ.क्र.", "कामाचा प्रकार व संख्या", "स्थळ"], [["", "", ""], ["", "", ""]], ["12%", "50%", "38%"]);
    const page1 = `
<h2>पिण्याच्या पाणी टंचाई घोषित करण्याबाबत ग्रामसभेचा ठराव</h2>
<p class="ctr">ग्रा.पं. कार्यालय ${F(d, "gp")} ${d.g("taluka") && d.g("taluka") === d.g("district")
    ? `तालुका जिल्हा ${TAL(d)}` : `तालुका ${TAL(d)} जिल्हा ${DIST(d)}`}</p>
<div class="row2"><span>ठराव क्र. ${F(d, "tharav_no", 22)}</span><span>दिनांक : ${D(d, "tharav_dinank")}</span></div>
<p class="j sm">आज दिनांक ${D(d, "tharav_dinank")} रोजी झालेल्या ग्रामसभेत सन ${F(d, "sabha_san", 26)} मध्ये पिण्याच्या पाण्याची
टंचाई घोषित करणे व टंचाई निवारणार्थ उपाययोजना राबविणे व टंचाई प्रतिबंधात्मक आराखडा तयार करणे या सर्व
प्रक्रियेस सहमती देण्यासाठी बहुमताने ठराव करण्यात आला असून त्याचा तपशील पुढील प्रमाणे आहे.</p>
<ol class="sm j">
<li>भूजल सर्वेक्षण आणि विकास यंत्रणेचा तांत्रिक अहवाल / तालुक्यातील कमी पर्जन्यमान / आपल्या गावात टँकरने
करावा लागणारा पाणी पुरवठा / पिण्याच्या पाण्याच्या स्त्रोत परिसरातील प्रतिकूल भूपृष्ठीय व भूशास्त्रीय स्थिती /
इतर प्रतिकूल स्थानिक परिस्थिती या कारणास्तव या ग्रामपंचायतीअंतर्गत ${F(d, "wadi")} गावामध्ये येत्या ऑक्टोबर ते
डिसेंबर / जानेवारी ते मार्च / एप्रिल ते जून पर्यंत पिण्याच्या पाण्याची टंचाई भासण्याची शक्यता आहे. सबब या
ठिकाणी महाराष्ट्र भूजल (पिण्याच्या पाण्यासाठी विनियमन) अधिनियम १९९३ अंतर्गत कलम ४ अन्वये पिण्याच्या
पाण्याची टंचाई घोषित करण्यात यावी असे मा. जिल्हाधिकारी यांना विनंती करण्यात येत आहे.</li>
<li>महाराष्ट्र भूजल (पिण्याच्या पाण्यासाठी विनियमन) अधिनियम १९९३ नुसार खालील बाबींचे पालन ग्रामपंचायतीमार्फत करण्यात येईल.
<ul>
<li>कलम ३ नुसार अशा घोषित स्त्रोतांच्या ठिकाणांपासून ५०० मीटर अंतरात पिण्याच्या पाण्याच्या प्रयोजनाव्यतिरिक्त
इतर प्रयोजनासाठी जिल्हाधिकाऱ्यांच्या पूर्व परवानगीशिवाय विहीर खोदली जाणार नाही.</li>
<li>कलम ५ नुसार सार्वजनिक पिण्याच्या पाण्याच्या उद्भवापासून १ कि.मी. परिसरात असणाऱ्या स्त्रोतांच्या उपशावर
निर्बंध आणण्यास सहमती आहे.</li>
<li>कलम ७ नुसार अति उपशाचे पाणलोट क्षेत्र असेल तर त्या क्षेत्रात पिण्याच्या प्रयोजनाव्यतिरिक्त इतर प्रयोजनासाठी,
जिल्हाधिकाऱ्यांच्या पूर्व परवानगीशिवाय विहीर खोदली जाणार नाही.</li>
<li>कलम ८ नुसार अति उपशाच्या पाणलोट क्षेत्रातील सार्वजनिक पिण्याच्या पाण्याच्या उद्भवावर प्रतिकूल परिणाम
करणाऱ्या विहीरींमधील पाण्याचा उपसा दिनांक १ फेब्रुवारी ते ३१ जुलै पर्यंत बंद करण्यात येईल.</li>
<li>कलम १६ नुसार कायद्यातील विविध तरतुदींचा भंग झाल्यास, दंड व शिक्षेकरिता तहसिलदारांना अशा
प्रकरणाबाबत अहवाल / रिपोर्ट करण्यात येईल.</li>
</ul></li>
<li>पुढील वर्षाच्या पिण्याच्या पाण्याची टंचाई निर्मुलनासाठी खालील उपाय योजना प्रशासनामार्फत मंजूर करण्यात
याव्यात अशी विनंती करण्यात येत आहे.${t3}</li>
<li>पुढील वर्षी आपल्या गावात पिण्याच्या पाण्याची टंचाई निर्माण होऊ नये म्हणून टंचाई प्रतिबंधक आराखडा तयार
करण्यास आमची सहमती असून या ठरावासोबत तो तहसिलदारांना सादर करण्यात येत आहे. त्याची अंमलबजावणी त्वरीत
सुरू करून पुढील पावसाळ्यापूर्वी शक्यतो ती पूर्ण करण्यात येईल. टंचाई प्रतिबंधक आराखड्याअंतर्गत पेयजल स्त्रोत
बळकटीकरण आराखडा (भाग-१) शिवकालीन पाणी साठवण योजनेअंतर्गत व भूजल संपत्तीच्या उपलब्धतेत सातत्यतेचा
आराखडा (भाग-२) हा जलसंधारण योजना व मग्रारोहयो अंतर्गत राबविण्यात येईल.</li>
</ol>`;
    const page2 = `
<ol class="j" start="5">
<li>टंचाई प्रतिबंधक प्रारूप आराखड्यात खालील बाबी अंतर्भूत करण्यासाठी ठराव घेण्यात येत आहे.
<p class="ctr" style="margin:3mm 0 1mm"><b>शिवकालीन पाणी साठवण योजने अंतर्गत पेयजल स्त्रोत बळकटीकरण आराखडा (भाग-१)</b></p>${t4}
<p class="ctr" style="margin:4mm 0 1mm"><b>भूजल संपत्तीच्या उपलब्धतेत सातत्यतेचा आराखडा (भाग-२)</b></p>${t4}
<p>भाग-२ मधील कामांचा समावेश ग्रामपंचायतीच्या मग्रारोहयोच्या आराखड्यात करण्यात येत आहे / आलेला आहे.</p></li>
<li>टंचाई प्रतिबंधक आराखड्यातील पेयजल स्त्रोत बळकटीकरण आराखडा भाग-१ मधील कामे शिवकालीन पाणी साठवण
योजनेमध्ये उपलब्ध होणाऱ्या निधीतून व भूजल संपत्तीच्या उपलब्धतेत सातत्यतेचा आराखडा भाग-२ मधील कामे
मग्रारोहयो अंतर्गत उपलब्ध होणाऱ्या निधीतून करावयाची आहेत याची आम्हाला जाणीव आहे.</li>
</ol>
<div class="row2" style="margin-top:12mm"><span>ठराव सूचक ${F(d, "suchak", 55)}</span><span>अनुमोदक ${F(d, "anumodak", 55)}</span></div>
${sigGp(d, 22)}`;
    return [page1, page2];
  }

  function num(x) {
    const s = String(x || "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function pAarakhada(d) {
    const a = num(d.get("ar_jm_kharch")), b = num(d.get("ar_aj_kharch"));
    let total = "";
    if (Number.isNaN(a) || Number.isNaN(b)) total = "";          // bad number: leave for hand entry
    else if (a !== null || b !== null) total = d.conv(((a || 0) + (b || 0)).toFixed(2));
    const rows = [
      ["गावाचे नाव", F(d, "gav", 70)],
      ["गाव/वाडीचे नाव", F(d, "wadi", 70)],
      ["सध्याची लोकसंख्या", F(d, "pop_today", 40)],
      ["अस्तित्वातील साधने — नळ पाणी पुरवठा योजना", F(d, "nal_count", 20) + " &nbsp; सद्यस्थिती " + F(d, "nal_status", 45)],
      ["अस्तित्वातील साधने — सार्वजनिक विहीर", F(d, "sv_count", 20)],
      ["अस्तित्वातील साधने — हातपंप (चालू / बंद)", F(d, "hp_chalu", 18) + " / " + F(d, "hp_band", 18)],
      ["जानेवारी ते मार्च — टंचाई आराखड्यात प्रस्तावित उपाययोजना", F(d, "ar_jm_upay", 70)],
      ["जानेवारी ते मार्च — अपेक्षित अंदाजित खर्च (लाखात)", F(d, "ar_jm_kharch", 30)],
      ["एप्रिल ते जून — टंचाई आराखड्यात प्रस्तावित उपाययोजना", F(d, "ar_aj_upay", 70)],
      ["एप्रिल ते जून — अपेक्षित अंदाजित खर्च (लाखात)", F(d, "ar_aj_kharch", 30)],
      ["एकूण अपेक्षित अंदाजित खर्च (लाखात)", V(total, 30)],
    ];
    const tr = rows.map(([l, v]) => `<tr><th class='lbl'>${l}</th><td>${v}</td></tr>`).join("");
    return [`
<h2>प्रपत्र अ — टंचाई कृती आराखडा उतारा</h2>
<p class="ctr sm">संभाव्य पाणी टंचाई भासणाऱ्या गावे/वाड्या पाणी टंचाई निवारणार्थ घ्यावयाच्या उपाययोजना कृती आराखडा</p>
<p class="ctr">माहे ${F(d, "ar_kal", 70)} &nbsp; ता. ${TAL(d)}</p>
<table class="kv">${tr}</table>
<p class="j" style="margin-top:6mm">सदरील गाव टंचाई आराखडा ऑक्टोबर ते डिसेंबर / जानेवारी ते मार्च / एप्रिल ते जून मध्ये
समाविष्ट ${F(d, "ar_samavisht", 22)} . (समाविष्ट नसल्यास तसे नमूद करावे.)</p>
<div class="sig three" style="margin-top:26mm">
<div><b>उपविभागीय अभियंता</b><br>ग्रा.पा.पु. व जि.प. विभाग ${UPV(d)}</div>
<div class="c"><b>गटविकास अधिकारी वर्ग-१</b><br>पंचायत समिती ${TAL(d)}</div>
<div class="r"><b>तहसिलदार</b><br>तहसिल ${TAL(d)}</div></div>`];
  }

  function pSthal(d) {
    const hp = [["पैकी चालु हातपंप", "hp_chalu"], ["थांबुन थांबुन चालणारे हातपंप संख्या", "hp_thambun"],
      ["पाण्या अभावी बंद हातपंप", "hp_band"], ["कायम बंद हातपंप संख्या", "hp_kayam"]];
    const hpHtml = hp.map(([l, k]) => `<tr><td class="ind">• ${l}</td><td>: ${F(d, k, 26)}</td></tr>`).join("");
    const page1 = `
<h2 class="ul">स्थळ पंचनामा / संयुक्त पाहणी अहवाल</h2>
<table class="lines">
<tr><td>संयुक्त पाहणी करावयाचे गावांचे/वाड्यांचे/तांड्याचे नांव</td><td>: ${F(d, "wadi", 60)}</td></tr>
<tr><td>संयुक्त पाहणी केल्याचा दिनांक</td><td>: ${D(d, "pahani_dinank")}</td></tr>
<tr><td>संयुक्त पाहणी करणाऱ्या अधिकाऱ्याचे नांव व पदनाम</td><td>: ${F(d, "officer_name", 45)} ${F(d, "officer_pad", 30)}</td></tr>
</table>
<p class="j">ग्रामपंचायत ${F(d, "gp")} यांचे ठराव क्र. ${F(d, "tharav_no", 18)} नुसार ग्रा.पं. अंतर्गत मौजे ${F(d, "gav")}
येथील सा. विहिर/हातपंप/विजपंप/नळ योजनांचे पाणी कमी झालेले असुन ते गावास अपुरे पडत असुन तेथे पाणी टंचाई
भासत आहे. करिता ग्रा. पंचायतीने उपाय योजना म्हणून १) खाजगी विहिर अधिग्रहण २) टँकरद्वारे पाणी पुरवठा करणे बाबत.</p>
<p class="j">उपरोक्त ठरावानुसार कळविले आहे त्या अनुषंगाने आज दिनांक ${D(d, "pahani_dinank")} रोजी ग्रा.पं. ${F(d, "gp")}
अंतर्गत ${F(d, "wadi")} गांव/वाडी/तांड्यातील पाणी पुरवठा करण्याची स्थिती खालील प्रमाणे आहे.</p>
<table class="lines">
<tr><td>१. टंचाई भासत असलेल्या गावांचे/वाड्यांचे/तांड्याचे नांव</td><td>: ${F(d, "wadi", 50)}</td></tr>
<tr><td>२. तेथे असलेल्या सा. विहिर/बोअर ची संख्या (${F(d, "sv_count", 10)}) व सध्यास्थिती</td><td>: ${F(d, "sv_status", 50)}</td></tr>
<tr><td>३. तेथे असलेले एकुण हातपंप संख्या</td><td>: ${F(d, "hp_total", 26)}</td></tr>
${hpHtml}
<tr><td>४. तेथे असलेले विद्युत पंप (${F(d, "vp_count", 10)}) व सध्यास्थिती</td><td>: ${F(d, "vp_status", 50)}</td></tr>
<tr><td>५. तेथे असलेल्या नळ पाणी पुरवठा योजनेची स्थिती</td><td>: ${F(d, "nal_status", 50)}</td></tr>
</table>
<p class="j">उपरोक्त स्थळ पंचनामा / संयुक्त पाहणी अहवालानुसार अशी शिफारस करण्यात येते की, सदर गावास पिण्याच्या
पाण्याच्या साधनाचे पाणी कमी पडत असल्यामुळे तेथे ग्रा.पं. ठरावानुसार खरोखर पाणी टंचाई भासत असल्यामुळे सदर
गावी टंचाई निवारणार्थ खालील उपाय योजना करणे योग्य वाटते.</p>`;
    const members = [["सरपंच", "sarpanch"], ["पोलीस पाटील", "police_patil"], ["ग्रा.वि.अ./ग्रा.से.", "gramsevak"],
      ["सहकारी संस्थेचे चेअरमन", "chairman"], ["ग्रा.पं. महिला सदस्य", "mahila"],
      ["अंगणवाडी सेविका", "anganwadi"], ["शाळेचे मुख्याध्यापक", "mukhyadhyapak"],
      ["मंडळ अधिकारी / तलाठी", "talathi"]];
    const mt = table(["अ.क्र.", "पदनाम", "नाव", "स्वाक्षरी"],
      members.map(([p, k], i) => [String(i + 1), p, esc(d.g(k)), ""]),
      ["10%", "32%", "34%", "24%"], "tall");
    const page2 = `
<p><b>१. खाजगी विहिर अधिग्रहण</b><br>श्री. ${F(d, "owner", 62)} रा. ${F(d, "owner_ra", 32)} गट क्र. ${F(d, "gat", 20)}
येथील विहिर खाजगी विहिर टँकरसाठी अधिग्रहण करणे.</p>
<p><b>२. टँकरद्वारे पाणी पुरवठा करणे</b> ${V("", 70)}</p>
<p style="margin-top:5mm"><b>संयुक्त पाहणी समिती</b></p>
${mt}
${sigGp(d, 16)}
${sigOfficers(["तहसिलदार", TAL(d)], ["गट विकास अधिकारी वर्ग-१", "पंचायत समिती " + TAL(d)], 18)}`;
    return [page1, page2];
  }

  function hpStatus(d) {
    const parts = [["चालू", "hp_chalu"], ["थांबून", "hp_thambun"], ["पाण्याअभावी बंद", "hp_band"], ["कायम बंद", "hp_kayam"]];
    return parts.filter(([, k]) => d.g(k)).map(([l, k]) => `${l} ${d.g(k)}`).join(", ");
  }

  function pKshetriya(d) {
    const items = [["गावातील हातपंप संख्या", F(d, "hp_total", 30)], ["सद्यस्थिती", V(hpStatus(d), 70)],
      ["गावातील विजपंप संख्या", F(d, "vp_count", 30)], ["सद्यस्थिती", F(d, "vp_status", 70)],
      ["गावातील सर्व सार्व. विहिर/आड/बारव संख्या", F(d, "sv_count", 30)], ["सद्यस्थिती", F(d, "sv_status", 70)],
      ["गावातील नळ योजना संख्या", F(d, "nal_count", 30)], ["सद्यस्थिती", F(d, "nal_status", 70)]];
    const li = items.map(([l, v], i) => `<tr><td>${i + 1}. ${l}</td><td>- ${v}</td></tr>`).join("");
    const pn = range(1, 5).map((i) => `<li>श्री. ${F(d, "panch" + i, 80)}</li>`).join("");
    const upay = upayOf(d);
    return [`
<div class="tight"><h2 class="ul">क्षेत्रीय अधिकारी यांनी करावयाचा पंचनामा</h2>
<p class="j">आज दिनांक ${D(d, "pahani_dinank")} रोजी पंचायत समिती ${TAL(d)} कार्यालयातील पाणी टंचाई क्षेत्रीय अधिकारी
श्री. ${F(d, "kshetriya", 55)} यांनी बोलावल्यावरुन आम्ही सर्व गावकरी मंडळी मौ. ${F(d, "gav")} येथील सर्व
जायमौक्यावर हजर झालोत. क्षेत्रीय अधिकारी यांनी पाणी टंचाई संदर्भात आम्हा सर्वांसोबत गावातील हातपंप/ विजपंप/
सार्वजनिक विहीर व बोअर/ आड/ नळ योजना प्रत्यक्ष पाहणी केली असता, खालील प्रमाणे उपाययोजना स्थिती आढळून आली.</p>
<table class="lines">${li}</table>
<p class="j">उपरोक्त उपाय योजनेतून गाव/वाडी/तांड्यातील लोकांना मानसी २० लिटर पेक्षा कमी पाणी पुरवठा होत असल्याने
पाणीटंचाई निवारणार्थ ${V(upay, 55)} ही उपाय योजना घेण्याकरिता आम्हा सर्व गावकऱ्यांचे एकमत झाले. सदर पंचनामा
आम्हा सर्वांसमक्ष करण्यात आलेला आहे.</p>
<ol class="pn">${pn}</ol>
<p class="j">उपरोक्त गांव/वाडी/तांडा/वस्तीतील पिण्याच्या पाण्याच्या स्त्रोताची प्रत्यक्ष पाहणी करण्यात आलेली असून सदर
योजनेतून तेथील जनतेला मिळणारे पाणी टंचाई निकषापेक्षाही कमी पाणी मिळत आहे. तेथे खरोखरच पाणी टंचाई भासत आहे.</p>
<p class="j">प्रत्यक्ष पाहणी नुसार / गावकऱ्यांच्या चर्चांअंती व ग्रामपंचायतीच्या मागणीनुसार ग्रामपंचायत ${F(d, "gp")}
अंतर्गत गाव/वस्ती/तांडा ${F(d, "wadi")} येथे ${V(upay, 50)} करण्यात यावी याकरिता शिफारस करण्यात येत आहे.</p>
<div class="sig" style="margin-top:4mm"><div></div><div class="r"><b>क्षेत्रीय अधिकारी (पा.टंचाई)</b><br>श्री. ${F(d, "kshetriya", 45)}</div></div>
<p style="margin-top:3mm">याची एक प्रत मा. तहसिलदार ${TAL(d)} यांना माहितीस्तव सादर.</p></div>`];
  }

  function pCerts(d) {
    return [`
<h2>प्रमाणपत्र</h2>
<p class="rt">दिनांक ${D(d, "dinank")}</p>
<p class="j">प्रमाणित करण्यात येते की, श्री. ${F(d, "owner", 62)} रा. ${F(d, "owner_ra", 32)} यांच्या अधिग्रहीत
करावयाच्या विहिरीचे अंतर हे गावातील इतर विहिरीपेक्षा सर्वात जवळचे आहे.</p>
<p class="j">करिता प्रमाणपत्र देण्यात येत आहे.</p>
<div class="sig" style="margin-top:16mm"><div></div>
<div class="r"><b>सरपंच / ग्रामपंचायत विकास अधिकारी</b><br>ग्रामपंचायत ${F(d, "gp", 38)}</div></div>
<hr class="cut">
<h2>प्रमाणपत्र</h2>
<p class="rt">दिनांक ${D(d, "dinank")}</p>
<p class="j">प्रमाणित करण्यात येते की, श्री. ${F(d, "owner", 62)} रा. ${F(d, "owner_ra", 32)} यांच्या अधिग्रहीत
करावयाच्या विहिरीचे पाणी हे पिण्यासाठी शुद्ध आहे. तसेच सदरील विहिरीमध्ये नियमित ब्लिचिंग पावडरचा वापर करण्यात येतो.</p>
<p class="j">करिता प्रमाणपत्र देण्यात येत आहे.</p>
<div class="sig" style="margin-top:18mm">
<div><b>सरपंच / ग्रामपंचायत विकास अधिकारी</b><br>ग्रामपंचायत ${F(d, "gp", 38)}</div>
<div class="r"><b>आरोग्य विस्तार अधिकारी</b><br>पंचायत समिती ${TAL(d)}</div></div>`];
  }

  function pPrapatraA(d) {
    const src = ["न.पा.पु. यो. (स्था. स्तर)", "न.पा.पु. यो. (रा. स्तर)", "विंधन विहिर", "सार्व. विहिर"];
    const cnt = { "न.पा.पु. यो. (स्था. स्तर)": d.g("nal_count"), "विंधन विहिर": d.g("hp_total"), "सार्व. विहिर": d.g("sv_count") };
    const has = !!d.get("gav");
    let rows = "";
    src.forEach((s, i) => {
      const lead = i === 0
        ? `<td rowspan="4" class="c">१</td><td rowspan="4" class="c"><b>${esc(d.g("gav"))}</b><br>${d.g("wadi") !== d.g("gav") ? esc(d.g("wadi")) : ""}</td>`
        : "";
      rows += `<tr>${lead}<td>${s}</td><td class='c'>${esc(cnt[s] || "")}</td><td></td><td></td><td></td></tr>`;
    });
    const kal = d.g("tanchai_mahe");
    return [["land", `
<h2>प्रपत्र अ</h2>
<table class="grid land">
<thead>
<tr><th rowspan="2" style="width:5%">अ.क्र.</th><th rowspan="2" style="width:14%">गाव / वाडीचे नाव</th>
<th colspan="5">गावाच्या/वाडीच्या १.५ कि.मी. च्या परिसरातील अस्तित्वात असलेली पाणी पुरवठ्याची साधने</th></tr>
<tr><th style="width:16%">प्रकार</th><th style="width:7%">संख्या</th><th style="width:17%">उद्भवातून सद्यस्थितीतील दरडोई / प्रतिदिनी पाण्याची उपलब्धता</th>
<th style="width:17%">सर्व सार्वजनिक उद्भवातून दरडोई दरदिवशी पाण्याची प्रत्यक्ष उपलब्धता</th>
<th>योजना बंद असल्यास वा अपुरे पाणी पुरवठा करीत असल्यास विशेष दुरुस्ती करून पुरेसा पाणी पुरवठा करता येईल का (असल्यास त्याचा तपशील द्यावा)</th></tr>
</thead><tbody>${rows}</tbody></table>
<table class="grid land" style="margin-top:4mm">
<thead>
<tr><th colspan="4">खाजगी उद्भव — गाव/वाडीच्या १.५ कि.मी. परिसरात खाजगी पाणी पुरवठ्याची साधने नसल्यास सर्वात जवळ असलेल्या खाजगी उद्भवाचा तपशील</th>
<th rowspan="2" style="width:22%">संबंधित गाव/वाड्यात पाणी टंचाई भासण्याची शक्यता असल्यास केव्हापासून व किती कालावधीसाठी पाणी टंचाई भासेल याचा अंदाज</th>
<th rowspan="2" style="width:16%">टंचाई निवारणार्थ प्रस्तावित उपाय योजना</th></tr>
<tr><th style="width:14%">प्रकार</th><th style="width:8%">संख्या</th><th style="width:22%">पाण्याच्या उपलब्धतेबाबत अभिप्राय</th><th style="width:18%">संबंधित गाव/वाडीपासून उद्भवाचे अंतर (कि.मी.)</th></tr>
</thead><tbody>
<tr class="tall"><td>${has ? "खाजगी विहिर" : "विहिर"}</td><td class="c">${has ? "१" : ""}</td>
<td>${has ? "मुबलक पाणी उपलब्ध" : ""}</td><td class="c">${esc(d.g("antar"))}</td>
<td>${kal ? "माहे " + esc(kal) + " पासून" : ""}</td><td>${esc(upayOf(d))}</td></tr>
</tbody></table>
<p class="sm">प्रत्येक गाव/वाडीची माहिती स्वतंत्र देण्यात यावी.</p>
<div class="sig three" style="margin-top:10mm">
<div><b>तलाठी स्वाक्षरी</b><br>सज्जा ${F(d, "sajja", 28)}</div>
<div class="c"><b>सरपंच</b><br>ग्रामपंचायत ${F(d, "gp", 30)}</div>
<div class="r"><b>ग्रामसेवक/ग्रा.वि.अ.</b><br>ग्रामपंचायत ${F(d, "gp", 30)}</div></div>`]];
  }

  function pBhujal(d) {
    return [`
<h1>भूजल अधिनियम १९९३</h1>
<p class="j big" style="margin-top:14mm">मौजे ${F(d, "gav")} ${TJ(d)} येथे माहे ${F(d, "tanchai_mahe", 40)} पासुन पाणी टंचाई
निर्माण होण्याची शक्यता असल्याने सर्व परिसरात भूजल अधिनियम लागु करण्यात आलेला असुन उद्भवाच्या ५०० मीटर
परिसरात तसेच सर्व प्रकारचे सिंचन विहीरीपासुन पाणी उपसा करण्यास मनाई आलेली आहे.</p>
<p class="j big">करिता प्रमाणित करण्यात येत आहे.</p>
${sigGp(d, 40)}`];
  }

  function pUpalabdhata(d) {
    return [`
<h1>प्रमाणपत्र</h1>
<p class="rt">दिनांक :- ${D(d, "pahani_dinank")}</p>
<p class="j big">प्रमाणित करण्यात येते की, मौजे ${F(d, "gav")} ${TJ(d)} शिवारातील विहीरीचा गट क्रमांक
${F(d, "gat", 22)} श्री/श्रीमती ${F(d, "owner", 62)} यांची खाजगी विहीर दिनांक ${D(d, "pahani_dinank")} रोजी पाहणी केली असता
विहीरीला मुबलक पाणी असल्याचे दिसुन आले. तसेच सदर विहीरी वरुन पाणी पुरवठा केल्यास टंचाई कालावधीत पाणी
पुरवठा होऊ शकतो, अशी आमची धारणा आहे.</p>
<p class="j big">करिता प्रमाणित करण्यात येते.</p>
${sigOfficers(["गटविकास अधिकारी वर्ग-१", "पंचायत समिती " + TAL(d)], ["तहसीलदार", TAL(d)], 40)}`];
  }

  function pKarar(d) {
    return [`
<div class="stamp">रु. १००/- स्टॅम्प पेपर</div>
<h1 class="ul" style="margin-top:2mm">करारनामा</h1>
<h3 class="ul ctr">विहिर अधिग्रहण करण्याबाबत</h3>
<p class="j">मी करारनामा लिहून देणार श्री. ${F(d, "owner", 62)} रा. ${F(d, "owner_ra", 32)} ${TJ(d)} करारनामा
लिहून देतो की, माझ्या मालकीची ${F(d, "gav")} येथील <b>विहिर/बोअर</b> गट क्र. ${F(d, "gat", 20)} ही ग्रामपंचायत
${F(d, "gp")} अंतर्गत ${F(d, "wadi")} गावातील जनतेस पिण्याचे पाणी पुरवठा करणेसाठी अधिग्रहण करुन देण्यास तयार आहे.</p>
<p class="j">सदरील विहिर/बोअर चा मोबदला ज्या तारखेपासून विहिर/बोअर अधिग्रहण आदेश पारीत होतील व ज्या तारखेला
संपेल त्या तारखेपर्यंत (पाणी टंचाई कालावधी) मी स्वखुशीने मोबदला घेण्यास तयार असून त्याबाबत माझी काहीही
हरकत / तक्रार राहणार नाही.</p>
<p class="j">तसेच सदर विहिर/बोअर ही ग्रामपंचायतीच्या ताब्यात (अधिग्रहित) राहून लोकांना पुरेपूर पाणीपुरवठा माझ्या
स्वतःच्या इलेक्ट्रीक पंपाने मी स्वतः करुन देईल व माझ्या स्वतःच्या शेतातील पिकास/फळबागास मी पाणी देणार नाही.
सदरच्या विहिरीवरुन पाणी वापरण्यास सर्वांची संमती आहे.</p>
<p class="j">तरी मी माझी विहिर/बोअर मोटार स्टार्टर ग्रामपंचायतीच्या ताब्यात स्वखुशीने देत असून विहिर/बोअर वरील मोटर
सुरु करण्यास माझी काही हरकत नाही. तसेच <u>शासनाची माझ्याकडे जास्तीची रक्कम आल्यास मी परत करण्यास तयार आहे.
शासनाची जास्तीची रक्कम परत न केल्यास मी शासन नियमानुसार कार्यवाहीसाठी पात्र राहील.</u></p>
<p class="j">करिता करारनामा करुन देण्यात येत आहे.</p>
<div class="sig" style="margin-top:8mm">
<div><br><br>दिनांक ${D(d, "karar_dinank")}</div>
<div class="r"><b>विहिर/बोअर मालकाची स्वाक्षरी</b><br><br>श्री. ${F(d, "owner", 55)}<br>रा. ${F(d, "owner_ra", 40)}<br><b>ता. ${TAL(d)} जि. ${DIST(d)}</b></div></div>`];
  }

  function pSrot(d) {
    const rows = [["हातपंप", d.g("hp_total")], ["नळयोजना", d.g("nal_count")], ["विंधन विहीरीवरील हातपंप", ""],
      ["जलस्वराज", ""], ["भारत निर्माण", ""], ["सार्वजनिक विहीर", d.g("sv_count")], ["इतर", ""]];
    const t = table(["अ.क्र.", "पाणी पुरवठ्याचे साधन", "संख्या", "पाणी पुरवठ्याच्या साधनाचे स्थळ", "चालु / बंद", "दररोज उपलब्ध पाणी", "शेरा"],
      rows.map(([s, c], i) => [String(i + 1), s, esc(c), "", "", "", ""]),
      ["7%", "21%", "9%", "19%", "12%", "16%", "16%"], "tall");
    return [`
<h2>पाणी पुरवठा स्त्रोतांबाबतची माहिती</h2>
<div class="row2" style="margin-top:6mm"><span>गावाचे नाव :- ${F(d, "gav", 55)}</span><span>दिनांक ${D(d, "pahani_dinank")}</span></div>
<p>आजची लोकसंख्या :- ${F(d, "pop_today", 40)}</p>
${t}
${sigGp(d, 30)}`];
  }

  function pAntar(d) {
    return [`
<h1 class="ul">प्रमाणपत्र</h1>
<p class="rt">दिनांक ${D(d, "dinank")}</p>
<p class="j big">प्रमाणित करण्यात येते की, मौजे ${F(d, "gav")} ता. ${TAL(d)} येथे खाजगी विहीर अधिग्रहण करून पाणी पुरवठा
करण्यासाठी अधिग्रहण केलेल्या विहीरीचे गावापर्यंत अंतर येणे जाणे एका खेपेचे ${F(d, "antar", 24)} कि.मी. आहे.</p>
<p class="j big">करीता प्रमाणपत्र देण्यात येते.</p>
${sigGp(d, 40)}`];
  }

  const pSatbara = (d) => [attachPage("सातबारा (७/१२) उतारा",
    `विहीर मालक श्री. ${esc(d.g("owner")) || ".................."} — गट क्र. ${esc(d.g("gat")) || "......."} चा डिजीटल ७/१२ येथे जोडावा.`)];

  const pPhoto = () => [attachPage("विहीरीचे फोटो", "पाणी असलेल्या खाजगी विहीरीचा फोटो तसेच सार्वजनिक विहीरीचा फोटो", 2,
    ["पाणी असलेल्या खाजगी विहीरीचा फोटो", "सार्वजनिक विहीरीचा फोटो"])];

  function pSamaik(d) {
    const names = range(1, 5).map((i) => d.g("sah" + i)).filter(Boolean).join(", ");
    const sg = range(1, 5).map((i) =>
      `<tr><td class="n">${i}.</td><td class="nm2">${esc(d.g("sah" + i))}</td><td class="sg">स्वाक्षरी</td></tr>`).join("");
    return [`
<h2>खाजगी विहिर / बोअर समाईक असल्याबाबतचे संबंधिताचे संमतीपत्र / ना-हरकत प्रमाणपत्र</h2>
<p class="j">आम्ही, संमतीपत्र लिहून देणार श्री. ${names ? '<span class="fi">' + esc(names) + "</span>" : V("", 75)} राहणार ${F(d, "owner_ra", 32)} तालुका ${TAL(d)} जि. ${DIST(d)}
येथील रहिवाशी असून आमची मौ. ${F(d, "gav")} येथील गट नं. ${F(d, "gat", 20)} मधील खाजगी विहिर/बोअर टँकरद्वारे /
विहिरी अधिग्रहणाद्वारे ग्रामपंचायत ${F(d, "gp")} अंतर्गत ${F(d, "wadi")} या गाव/वाडी/तांडा/वस्तीस पाणी पुरवठा
करण्यासाठी खाजगी विहिर / बोअर अधिग्रहित करण्यात येत आहे.</p>
<p class="j">सदर विहिर अधिग्रहणास आमची सर्वांची संमती आहे. करिता संमतीपत्र / ना-हरकत प्रमाणपत्र देण्यात येत आहे.
तसेच सदर विहिरीचा मोबदला श्री. ${F(d, "mobadla", 62)} यांच्या नावे देण्यास देखील आमची सर्वांची संमती /
ना-हरकत आहे.</p>
<p>दिनांक : ${D(d, "dinank")}</p>
<div class="sig" style="margin-top:8mm">
<div><b>संमतीपत्र / नाहरकत घेणारांची सही</b><br><br><br>श्री. ${F(d, "mobadla", 50)}</div>
<div class="r"><b>संमतीपत्र / नाहरकत देणारांची सही</b></div></div>
<table class="sigtab" style="margin-left:auto;width:62%">${sg}</table>
<p class="sm" style="margin-top:6mm">(टीप : विहीर समाईक नसल्यास हे पान "लागू नाही" म्हणून नमूद करावे.)</p>`];
  }

  function p10Years(d) {
    const sch = ["विंधन विहीर घेणे", "विंधन विहीर विशेष दुरुस्ती", "नळ योजना विशेष दुरुस्ती", "तात्पुरती नळ पाणी पुरवठा योजना",
      "जलभंजन करणे", "सार्वजनिक आड दुरुस्ती", "खाजगी विहिर अधिग्रहण करणे", "बुडकी घेणे",
      "टँकरद्वारे पाणी पुरवठा करणे", "जलयुक्त शिवार योजना"];
    const t = table(["अ.क्र.", "योजनेचे नाव", "मागील १० वर्षात राबविण्यात आलेल्या उपाय योजना"],
      sch.map((s, i) => [String(i + 1), s, ""]), ["10%", "42%", "48%"], "tall");
    return [`
<h2>पाणी टंचाई निवारणार्थ मागील १० वर्षात राबविण्यात आलेल्या उपाय योजना</h2>
<p class="ctr">मौजे ${F(d, "gav")} तालुका ${TAL(d)} जि. ${DIST(d)}</p>
${t}
<div class="sig" style="margin-top:20mm">
<div><b>ग्रामसेवक/ग्रा.वि.अ.</b><br>ग्रामपंचायत ${F(d, "gp", 38)}</div>
<div class="r"><b>उप अभियंता (ग्रा.पा.पु.)</b><br>जि.प. उप विभाग ${UPV(d)}</div></div>`];
  }

  function pUpabhiyanta(d) {
    return [`
<h2>उप अभियंता (ग्रा.पा.पु.) जि.प. उप विभाग ${UPV(d)}<br>यांचा पाणी टंचाई पाहणी अहवाल</h2>
<p class="j big" style="margin-top:10mm">आज दिनांक ${D(d, "pahani_dinank")} रोजी ग्राम पंचायत कार्यालय ${F(d, "gp")} ${TJ(d)}
अंतर्गत (गाव / वाडी / तांडा / वस्ती) ${F(d, "wadi")} येथील पाणी टंचाई संदर्भात गावातील हातपंप / विजपंप /
सार्वजनिक विहिर / बोअर / आड / नळ योजना विहिरीची प्रत्यक्ष पाहणी केली असता उपरोक्त उपाय योजनेतून
गाव/वाडी/तांड्यातील लोकांना मानसी २० लिटर पेक्षा कमी पाणी पुरवठा होत असल्यामुळे येथे पाणी टंचाई निवारणार्थ
खाजगी विहिर अधिग्रहण द्वारे पाणी पुरवठा करणे ही उपाय योजना करून गावाला पाणी पुरवठा करण्याची आवश्यकता आहे.</p>
<p style="margin-top:8mm">दिनांक ${D(d, "pahani_dinank")}</p>
<div class="sig" style="margin-top:24mm"><div></div><div class="r"><b>उपअभियंता (ग्रा.पा.पु.)</b><br>जि.प. उप विभाग ${UPV(d)}</div></div>`];
  }

  function pDardoi(d) {
    return [`
<h2>दरडोई प्रमाणपत्र</h2>
<p class="rt">दिनांक ${D(d, "dinank")}</p>
<p class="j">प्रमाणित करण्यात येते की, मौजे ${F(d, "gav")} ता. ${TAL(d)} अंतर्गत ${F(d, "wadi")} येथे पाणी पुरवठा करणाऱ्या सर्व
हातपंप/नळ पाणी पुरवठा योजना व इतर सर्व स्त्रोतांमधुन दरडोई २० लिटर पेक्षा कमी पाणी मिळत आहे.</p>
<p class="j">करीता प्रमाणपत्र देण्यात येते.</p>
${sigThree(d, 16)}
<hr class="cut">
<h2>लोकसंख्या प्रमाणपत्र</h2>
<p class="rt">दिनांक ${D(d, "dinank")}</p>
<p class="j">प्रमाणित करण्यात येते की, मौजे ${F(d, "gav")} ता. ${TAL(d)} येथील सन २०११ नुसार लोकसंख्या ${F(d, "pop_2011", 30)}
ऐवढी असून आजची लोकसंख्या ${F(d, "pop_today", 30)} आहे.</p>
<p class="j">करीता प्रमाणपत्र देण्यात येते.</p>
${sigThree(d, 16)}`];
  }

  function pJalyukt(d) {
    const j = d.g("jalyukt") || (d.get("gav") ? "निरंक" : "");
    const t = table(["अ.क्र.", "जलयुक्त शिवार योजना अंतर्गत कामाचा प्रकार", "शेरा"],
      [[j ? "१" : "", esc(j), ""], ["", "", ""], ["", "", ""]], ["12%", "58%", "30%"], "tall");
    return [`
<h2>जलयुक्त शिवार योजना प्रमाणपत्र</h2>
<p class="rt">दिनांक ${D(d, "dinank")}</p>
<p class="j">प्रमाणित करण्यात येते की, ग्रामपंचायत ${F(d, "gp")} ता. ${TAL(d)} जि. ${DIST(d)} अंतर्गत (गाव/वाडी/तांडा)
${F(d, "wadi")} येथे जलयुक्त शिवार योजने अंतर्गत खालील प्रमाणे कामे झालेली आहेत.<br>
<span class="sm">(जलयुक्त शिवार योजना झाली नसल्यास निरंक लिहावे.)</span></p>
${t}
<p style="margin-top:6mm">जलयुक्त शिवार योजनेअंतर्गत (गाव/वाडी/तांडा) येथे फायदा झाल्या बाबतचा अभिप्राय</p>
<div class="wline"></div><div class="wline"></div>
${sigThree(d, 22)}`];
  }

  // Order follows the सूची (index) of the original file.
  const SECTIONS = [
    ["संयुक्त स्थळ पाहणी पंचनामा", [pPanchanama]],
    ["ग्रामपंचायत कार्यालय यांचे शिफारसपत्र व प्रोसिडींग बुक", [pLetter, pProceeding]],
    ["ग्रामसेवक, सरपंच, तलाठी सज्जा यांचे संयुक्त स्वाक्षरीचे प्रमाणपत्र व संमती पत्र", [pGsTalathi]],
    ["पिण्याच्या पाण्याची टंचाई घोषित करण्यासाठी ग्रामसभेच्या ठरावाचा नमुना व प्रमाणपत्र", [pTharav]],
    ["सदरील गाव टंचाई आराखडा (ऑक्टोबर ते डिसेंबर / जानेवारी ते मार्च / एप्रिल ते जून) मध्ये समाविष्ट आहे किंवा नाही", [pAarakhada]],
    ["स्थळ पंचनामा / संयुक्त पाहणी अहवाल", [pSthal, pKshetriya, pCerts]],
    ["पाणी पुरवठ्याची साधने प्रपत्र अ", [pPrapatraA]],
    ["भूजल अधिनियम १९९३ अंमलबजावणीबाबत प्रमाणपत्र", [pBhujal]],
    ["पाणी उपलब्धतेचा गोषवारा प्रमाणपत्र", [pUpalabdhata]],
    ["विहीर अधिग्रहणाबाबत करारनामा", [pKarar]],
    ["विंधन विहीरीबाबत प्रमाणपत्र (हातपंप) / पाणी पुरवठा स्त्रोतांबाबतची माहिती", [pSrot]],
    ["गावापासून उद्भवापर्यंत अंतराचे प्रमाणपत्र", [pAntar]],
    ["सातबारा", [pSatbara]],
    ["विहीरीचा फोटो (पाणी असलेल्या विहीरीचा) तसेच सार्वजनिक विहीरीचा फोटो", [pPhoto]],
    ["सामाईक विहीर असेल तर संबंधित विहीर मालकाचे संमतीपत्र", [pSamaik]],
    ["मागील वर्षी पाणी टंचाई निवारणार्थ केलेल्या उपाययोजना (मागील १० वर्ष, उप अभियंता अहवाल, दरडोई व लोकसंख्या प्रमाणपत्र, जलयुक्त शिवार)",
      [p10Years, pUpabhiyanta, pDardoi, pJalyukt]],
  ];

  function buildPages(d) {
    const pages = [], idx = [];
    let pno = 2; // page 1 = सूची
    for (const [title, funcs] of SECTIONS) {
      const start = pno;
      for (const fn of funcs) {
        for (const pg of fn(d)) {
          const [kind, body] = Array.isArray(pg) ? pg : ["port", pg];
          pages.push([kind, body, pno++]);
        }
      }
      const end = pno - 1;
      idx.push([title, start === end ? String(start) : `${start} ते ${end}`]);
    }
    const rows = idx.map(([t, p], i) =>
      `<tr><td class="c">${i + 1}</td><td>${t}</td><td class="c">${mrDigits(p)}</td></tr>`).join("");
    const indexPage = `
<div class="boxtitle">खाजगी विहीर अधिग्रहण प्रस्ताव</div>
<p class="ctr big" style="margin-top:6mm">गावाचे नाव ( ${F(d, "gav", 70)} )</p>
<table class="lines" style="width:auto;margin:0 auto 2mm"><tr><td>ग्रामपंचायत : ${F(d, "gp", 50)}</td>
<td>&nbsp;&nbsp;विहीर मालक : श्री. ${F(d, "owner", 60)}</td></tr></table>
<h2>सूची</h2>
<table class="grid idx"><thead><tr><th style="width:9%">अ.क्र.</th><th>आवश्यक कागदपत्रे</th><th style="width:14%">पृ. क्रमांक</th></tr></thead>
<tbody>${rows}</tbody></table>`;
    return [["port", indexPage, 1], ...pages];
  }

  function renderBody(raw, opts) {
    const d = makeRow(raw, opts);
    let foot = "";
    if (d.get("gav")) {
      foot = `<div class="foot">खाजगी विहीर अधिग्रहण प्रस्ताव — मौजे ${esc(d.g("gav"))} — श्री. ${esc(d.g("owner"))} — गट क्र. ${esc(d.g("gat"))}</div>`;
    }
    return buildPages(d).map(([kind, content, pno]) =>
      `<section class="${kind === "land" ? "page land" : "page"}"><div class="pno">${mrDigits(pno)}</div>${content}${foot}</section>`).join("");
  }

  function renderDocument(raw, opts) {
    opts = opts || {};
    const land = "@page land{size:A4 landscape;margin:0}.page.land{page:land}";
    return `<!doctype html><html lang="mr"><head><meta charset="utf-8"><title>${esc((raw && raw.owner) || "विहीर अधिग्रहण प्रस्ताव")}</title>` +
      `<style>${opts.fontCss || ""}${opts.css || ""}${land}</style></head><body>${renderBody(raw, opts)}</body></html>`;
  }

  root.VihirForm = { renderDocument, renderBody, SECTIONS, fmtDate, mrDigits };
})(typeof window !== "undefined" ? window : globalThis);

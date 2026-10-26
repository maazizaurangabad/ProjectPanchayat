# -*- coding: utf-8 -*-
"""
web/ मधील फाईल्स + Mukta फॉन्ट एकत्र करून एकेक फाईल तयार करते:
    Vihir_Adhigrahan_App.html     लोकांना द्यायचे ॲप (इंटरनेटशिवाय चालते)
    private/Vihir_Admin.html      अनलॉक कोड तयार करण्यासाठी — फक्त आपल्यासाठी, कोणालाही देऊ नका

आधी एकदा:  python make_keys.py     (private/keys.json तयार होते)
पेमेंट माहिती (UPI ID, WhatsApp) web/config.js मध्ये भरा.

Usage:
    python build_app.py
"""
import json
import re
from pathlib import Path

from generate import font_face, BASE

WEB = BASE / "web"
KEYS = BASE / "private" / "keys.json"
OUT = BASE / "Vihir_Adhigrahan_App.html"
ADMIN_OUT = BASE / "private" / "Vihir_Admin.html"


def script(js, name="inline"):
    if "</script" in js.lower():
        raise SystemExit(f"{name} मध्ये '</script' आहे — inline करता येणार नाही")
    return f"<script>\n{js}\n</script>"


def file_script(rel):
    return script((WEB / rel).read_text(encoding="utf-8"), rel)


def inline(html, parts):
    for tag, repl in parts.items():
        if tag not in html:
            raise SystemExit(f"{tag} सापडला नाही")
        html = html.replace(tag, repl)
    return html


def main():
    if not KEYS.exists():
        raise SystemExit("private/keys.json नाही — आधी `python make_keys.py` चालवा.")
    keys = json.loads(KEYS.read_text(encoding="utf-8"))
    config = (WEB / "config.js").read_text(encoding="utf-8")
    if re.search(r'"yourname@upi"|"919999999999"', config):
        print("⚠ web/config.js मध्ये अजून नमुना UPI ID / WhatsApp क्रमांक आहे — आपली माहिती भरा.")

    consts = (f"const FONT_CSS = {json.dumps(font_face())};\n"
              f"const FORM_CSS = {json.dumps((WEB / 'form.css').read_text(encoding='utf-8'))};\n"
              f"const PAY_PUBLIC_KEY = {json.dumps(keys['public'])};")
    app = inline((WEB / "app.html").read_text(encoding="utf-8"), {
        '<link rel="stylesheet" href="app.css">': f"<style>\n{(WEB / 'app.css').read_text(encoding='utf-8')}</style>",
        '<script src="config.js"></script>': script(config + "\n" + consts, "config.js"),
        '<script src="vendor/qrcode.js"></script>': file_script("vendor/qrcode.js"),
        '<script src="masters_data.js"></script>': file_script("masters_data.js"),
        '<script src="form.js"></script>': file_script("form.js"),
        '<script src="pay.js"></script>': file_script("pay.js"),
        '<script src="app.js"></script>': file_script("app.js"),
    })
    if keys["private"]["d"] in app:
        raise SystemExit("गुप्त की ॲपमध्ये गेली — build थांबवला")
    OUT.write_text(app, encoding="utf-8")
    print(f"✔ {OUT.name} ({OUT.stat().st_size // 1024} KB)")

    admin = inline((WEB / "admin.html").read_text(encoding="utf-8"), {
        '<script src="config.js"></script>': script(config + f"\nconst PAY_PRIVATE_KEY = {json.dumps(keys['private'])};", "config.js"),
    })
    ADMIN_OUT.write_text(admin, encoding="utf-8")
    print(f"✔ private/{ADMIN_OUT.name} — फक्त आपल्यासाठी")


if __name__ == "__main__":
    main()

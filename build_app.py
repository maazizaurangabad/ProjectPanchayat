# -*- coding: utf-8 -*-
"""
web/ मधील फाईल्स + Mukta फॉन्ट एकत्र करून एकच फाईल तयार करते:
    Vihir_Adhigrahan_App.html   (इंटरनेटशिवाय चालते; फक्त ही फाईल वापरकर्त्यांना द्या)

Usage:
    python build_app.py
"""
import json
from pathlib import Path

from generate import font_face, BASE

WEB = BASE / "web"
OUT = BASE / "Vihir_Adhigrahan_App.html"


def inline_script(path):
    js = path.read_text(encoding="utf-8")
    if "</script" in js.lower():
        raise SystemExit(f"{path.name} मध्ये '</script' आहे — inline करता येणार नाही")
    return f"<script>\n{js}\n</script>"


def main():
    html = (WEB / "app.html").read_text(encoding="utf-8")
    css = (WEB / "app.css").read_text(encoding="utf-8")
    consts = (f"const FONT_CSS = {json.dumps(font_face())};\n"
              f"const FORM_CSS = {json.dumps((WEB / 'form.css').read_text(encoding='utf-8'))};")
    parts = {
        '<link rel="stylesheet" href="app.css">': f"<style>\n{css}</style>",
        '<script src="form.js"></script>': f"<script>\n{consts}\n</script>\n" + inline_script(WEB / "form.js"),
        '<script src="app.js"></script>': inline_script(WEB / "app.js"),
    }
    for tag, repl in parts.items():
        if tag not in html:
            raise SystemExit(f"app.html मध्ये {tag} सापडला नाही")
        html = html.replace(tag, repl)
    OUT.write_text(html, encoding="utf-8")
    print(f"✔ {OUT.name} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()

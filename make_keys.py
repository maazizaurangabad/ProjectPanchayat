# -*- coding: utf-8 -*-
"""
अनलॉक कोडसाठी की जोडी (key pair) एकदाच तयार करते:
    private/keys.json   — गुप्त! कोणालाही देऊ नका, git मध्ये टाकू नका.

सार्वजनिक की (public key) build_app.py ॲपमध्ये टाकते; त्यामुळे ॲप कोड तपासू शकते
पण नवीन कोड तयार करू शकत नाही. कोड फक्त private/Vihir_Admin.html मधून तयार होतात.

Usage:
    pip install cryptography
    python make_keys.py
"""
import base64
import json
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric import ec

BASE = Path(__file__).resolve().parent
KEYS = BASE / "private" / "keys.json"


def b64u(n):
    return base64.urlsafe_b64encode(n.to_bytes(32, "big")).rstrip(b"=").decode()


def main():
    if KEYS.exists():
        raise SystemExit(f"{KEYS} आधीच आहे. नवीन की बनवल्यास आधी दिलेले सर्व अनलॉक कोड बंद होतील — "
                         "तसे हवे असल्यास ती फाईल आधी काढा.")
    key = ec.generate_private_key(ec.SECP256R1())
    pub = key.public_key().public_numbers()
    public = {"kty": "EC", "crv": "P-256", "x": b64u(pub.x), "y": b64u(pub.y)}
    private = dict(public, d=b64u(key.private_numbers().private_value))
    KEYS.parent.mkdir(exist_ok=True)
    KEYS.write_text(json.dumps({"public": public, "private": private}, indent=1), encoding="utf-8")
    print(f"✔ {KEYS} तयार. आता: python build_app.py")


if __name__ == "__main__":
    main()

खाजगी विहीर अधिग्रहण प्रस्ताव — Excel → प्रत्येक व्यक्तीसाठी PDF
=====================================================================

फोल्डरमधील फाईल्स
  generate.py        मुख्य स्क्रिप्ट
  Vihir_Data.xlsx    माहिती भरण्याचे Excel (Data शीट; सूचना शीट वाचा)
  fonts/             Mukta मराठी फॉन्ट (हा फोल्डर generate.py सोबतच ठेवा)
  Blank_Form.pdf     स्वच्छ रिकामा फॉर्म (25 पाने)
  output/            तयार झालेल्या PDF येथे येतात

एकदाच सेटअप (Windows / Linux / Mac)
  pip install openpyxl playwright
  python -m playwright install chromium

वापर
  python generate.py                 → Vihir_Data.xlsx मधील प्रत्येक ओळीची PDF
  python generate.py "Badnapur.xlsx" → दुसरी Excel फाईल
  python generate.py --blank         → रिकामा फॉर्म पुन्हा तयार करणे

PDF चे नाव:  001_गाव_मालकाचेनाव.pdf

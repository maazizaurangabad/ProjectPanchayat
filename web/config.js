/* पेमेंट सेटिंग — आपली माहिती भरा, नंतर `python build_app.py` चालवा. */
const PAY_CONFIG = {
  enabled: true,                 // false = पेमेंटशिवाय PDF (स्वतःच्या वापरासाठी)
  amount: 100,                   // प्रति PDF रुपये
  upiId: "mrk29k@axl",           // आपला UPI ID (PhonePe QR मधील)
  payeeName: "Saba Firdos Shaikh Khaleeque Hussain", // UPI मध्ये दिसणारे नाव
  whatsapp: "919175359999",      // कोड मागवण्यासाठी WhatsApp क्रमांक, 91 सह
  serviceName: "विहीर अधिग्रहण प्रस्ताव सेवा",
};

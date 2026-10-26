/* पेमेंट सेटिंग — आपली माहिती भरा, नंतर `python build_app.py` चालवा. */
const PAY_CONFIG = {
  enabled: true,                 // false = पेमेंटशिवाय PDF (स्वतःच्या वापरासाठी)
  amount: 100,                   // प्रति PDF रुपये
  upiId: "yourname@upi",         // आपला UPI ID (उदा. 98xxxxxx10@ybl)
  payeeName: "Your Name",        // UPI मध्ये दिसणारे नाव (इंग्रजीत)
  whatsapp: "919999999999",      // कोड मागवण्यासाठी WhatsApp क्रमांक, 91 सह
  serviceName: "विहीर अधिग्रहण प्रस्ताव सेवा",
};

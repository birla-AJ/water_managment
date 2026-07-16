// ── Server-message localization ─────────────────────────────────────────────
// Tiny translator for the handful of user-facing strings the backend generates
// (OTP text, notification titles/bodies). UI strings live in the frontends'
// i18next catalogs; this only covers messages sent from the server so they can
// be delivered in each recipient's chosen language.
//
// Usage: t(customer.language, 'notify.billGenerated.body', { invoiceNumber, amount })
// Falls back to English for unknown languages/keys, and leaves {vars} that have
// no matching value untouched.

export type Lang = 'en' | 'hi';

type Dict = Record<string, string>;

// Flat dot-keyed catalogs — simplest to read and interpolate.
const en: Dict = {
  'auth.otp': 'Your WaterFlow OTP is {code}. Valid for {mins} minutes. Do not share it with anyone.',

  'notify.billGenerated.title': 'New bill generated',
  'notify.billGenerated.body': 'Invoice {invoiceNumber} for ₹{amount} is ready.',

  'notify.billReadyToPay.title': 'New bill generated',
  'notify.billReadyToPay.body': 'Invoice {invoiceNumber} for ₹{amount} is ready to pay.',

  'notify.dueReminder.title': 'Payment overdue',
  'notify.dueReminder.body':
    'Invoice {invoiceNumber} of ₹{amount} is overdue. Please pay at your earliest convenience.',

  'notify.paid.title': 'Bill fully paid',
  'notify.paid.body': 'Invoice {invoiceNumber} is now fully paid. Thank you!',

  'notify.partialPaid.title': 'Partial payment received',
  'notify.partialPaid.body': 'Invoice {invoiceNumber}: ₹{amount} still due.',

  'notify.newCustomer.title': 'New customer registered',
  'notify.newCustomer.body': '{name} ({mobile}) signed up.',
};

const hi: Dict = {
  'auth.otp': 'आपका WaterFlow OTP है {code}। यह {mins} मिनट के लिए मान्य है। इसे किसी के साथ साझा न करें।',

  'notify.billGenerated.title': 'नया बिल तैयार हुआ',
  'notify.billGenerated.body': 'इनवॉइस {invoiceNumber}, ₹{amount} का बिल तैयार है।',

  'notify.billReadyToPay.title': 'नया बिल तैयार हुआ',
  'notify.billReadyToPay.body': 'इनवॉइस {invoiceNumber}, ₹{amount} का बिल भुगतान के लिए तैयार है।',

  'notify.dueReminder.title': 'भुगतान बकाया है',
  'notify.dueReminder.body':
    'इनवॉइस {invoiceNumber}, ₹{amount} का भुगतान बकाया है। कृपया जल्द से जल्द भुगतान करें।',

  'notify.paid.title': 'बिल का पूरा भुगतान हुआ',
  'notify.paid.body': 'इनवॉइस {invoiceNumber} का पूरा भुगतान हो गया है। धन्यवाद!',

  'notify.partialPaid.title': 'आंशिक भुगतान प्राप्त हुआ',
  'notify.partialPaid.body': 'इनवॉइस {invoiceNumber}: ₹{amount} अभी भी बकाया है।',

  'notify.newCustomer.title': 'नया ग्राहक पंजीकृत हुआ',
  'notify.newCustomer.body': '{name} ({mobile}) ने साइन अप किया।',
};

const catalogs: Record<Lang, Dict> = { en, hi };

/** Translate a key into `lang`, interpolating `{var}` placeholders. */
export function t(lang: Lang | string | null | undefined, key: string, vars?: Record<string, string | number>): string {
  const dict = catalogs[(lang as Lang) in catalogs ? (lang as Lang) : 'en'];
  let str = dict[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

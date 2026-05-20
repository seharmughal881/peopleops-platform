import type { Dictionary } from './en'

const ur: Dictionary = {
  locale: {
    english: 'English',
    urdu: 'اردو',
    switchTo: 'زبان تبدیل کریں',
  },
  login: {
    title: 'ایچ آر سسٹم میں سائن ان کریں',
    subtitle: 'خوش آمدید — جاری رکھنے کے لیے اپنی تفصیلات درج کریں۔',
    emailLabel: 'ای میل',
    passwordLabel: 'پاس ورڈ',
    submit: 'سائن ان',
    submitting: 'سائن ان ہو رہا ہے…',
    mfaLabel: '6 ہندسوں کا کوڈ',
    mfaHint: 'اپنی توثیق ایپ سے',
    mfaSubmit: 'کوڈ کی تصدیق کریں',
    or: 'یا',
    continueWithGoogle: 'گوگل سے جاری رکھیں',
    continueWithMicrosoft: 'مائیکروسافٹ سے جاری رکھیں',
    continueWithSaml: 'SSO سے جاری رکھیں',
    ssoErrors: {
      missing_flow_state: 'سائن ان سیشن ختم ہو گیا۔ دوبارہ کوشش کریں۔',
      bad_flow_state: 'سائن ان سیشن خراب تھا۔ دوبارہ کوشش کریں۔',
      token_exchange_failed: 'سنگل سائن آن مکمل نہیں ہو سکا۔ دوبارہ کوشش کریں۔',
      no_claims: 'شناختی فراہم کنندہ نے پروفائل کی معلومات نہیں دیں۔',
      email_not_verified: 'آپ کا SSO ای میل تصدیق شدہ نہیں ہے — پاس ورڈ سے سائن ان کریں۔',
      no_account_for_email: 'اس ای میل کے لیے کوئی ایچ آر اکاؤنٹ موجود نہیں۔ ایڈمن سے رابطہ کریں۔',
      account_inactive: 'یہ اکاؤنٹ غیر فعال ہے۔ ایڈمن سے رابطہ کریں۔',
      missing_saml_response: 'SAML جواب موصول نہیں ہوا۔ اپنے IdP سے دوبارہ کوشش کریں۔',
      saml_validation_failed: 'SAML جواب کی تصدیق نہیں ہو سکی۔ ایڈمن سے رابطہ کریں۔',
      generic: 'سائن ان ناکام۔',
    },
  },
}

export default ur

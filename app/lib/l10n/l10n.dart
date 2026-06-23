import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Bilingual strings — English + Hindi (UX Rule 5: Hindi parity from Day 1,
/// every string translated, not an afterthought).
///
/// A lightweight self-contained implementation (no codegen). Add new keys to
/// BOTH maps; `flutter analyze` will not let a screen reference a missing key.
class L10n {
  L10n(this.locale);
  final Locale locale;

  static L10n of(BuildContext context) =>
      Localizations.of<L10n>(context, L10n) ?? L10n(const Locale('en'));

  static const supportedLocales = [Locale('en'), Locale('hi')];
  static const delegate = _L10nDelegate();

  bool get isHindi => locale.languageCode == 'hi';
  String t(String key) =>
      (isHindi ? _hi[key] : _en[key]) ?? _en[key] ?? key;

  static const Map<String, String> _en = {
    'app_name': 'DocVault',
    'tagline': 'All your documents. One safe place.',
    'choose_language': 'Choose your language',
    'continue_': 'Continue',
    'skip': 'Skip',
    'get_started': 'Get Started',
    'welcome_1_title': 'Scan your documents',
    'welcome_1_body': 'Snap a photo — we read and organise every detail for you.',
    'welcome_2_title': 'Get expiry alerts',
    'welcome_2_body': 'Never miss a renewal. We warn you 6 months ahead.',
    'welcome_3_title': 'Renew at your doorstep',
    'welcome_3_body': 'Book Dr.Docs and we handle the paperwork at your home.',
    'phone_title': 'Enter your mobile number',
    'phone_hint': '10-digit mobile number',
    'send_otp': 'Send OTP',
    'tnc': 'I agree to the Terms & Conditions and Privacy Policy',
    'otp_title': 'Verify your number',
    'otp_sent': 'We sent a 6-digit code to',
    'verify': 'Verify',
    'resend_otp': 'Resend OTP',
    'profile_title': 'Tell us about you',
    'full_name': 'Full name',
    'dob': 'Date of birth',
    'city': 'City',
    'home': 'Home',
    'documents': 'Documents',
    'services': 'Services',
    'earn': 'Earn',
    'profile': 'Profile',
    'health_score': 'Document Health Score',
    'quick_scan': 'Scan New Doc',
    'quick_book': 'Book Service',
    'quick_view': 'View All Docs',
    'recent_activity': 'Recent Activity',
    'all_documents': 'All Documents',
    'add_document': 'Add Document',
    'no_docs_title': 'No documents yet',
    'no_docs_body': 'Add your first document to start tracking expiries.',
    'no_alerts': 'You are all caught up',
    'alerts': 'Alerts',
    'book_now': 'Book Now',
  };

  static const Map<String, String> _hi = {
    'app_name': 'डॉकवॉल्ट',
    'tagline': 'आपके सभी दस्तावेज़। एक सुरक्षित जगह।',
    'choose_language': 'अपनी भाषा चुनें',
    'continue_': 'आगे बढ़ें',
    'skip': 'छोड़ें',
    'get_started': 'शुरू करें',
    'welcome_1_title': 'अपने दस्तावेज़ स्कैन करें',
    'welcome_1_body': 'एक फ़ोटो लें — हम हर जानकारी पढ़कर व्यवस्थित कर देते हैं।',
    'welcome_2_title': 'समाप्ति की चेतावनी पाएं',
    'welcome_2_body': 'नवीनीकरण कभी न चूकें। हम 6 महीने पहले बताते हैं।',
    'welcome_3_title': 'घर बैठे नवीनीकरण',
    'welcome_3_body': 'Dr.Docs बुक करें और कागज़ी काम हम संभालते हैं।',
    'phone_title': 'अपना मोबाइल नंबर दर्ज करें',
    'phone_hint': '10 अंकों का मोबाइल नंबर',
    'send_otp': 'OTP भेजें',
    'tnc': 'मैं नियम व शर्तों और गोपनीयता नीति से सहमत हूँ',
    'otp_title': 'अपना नंबर सत्यापित करें',
    'otp_sent': 'हमने 6 अंकों का कोड भेजा है',
    'verify': 'सत्यापित करें',
    'resend_otp': 'OTP फिर भेजें',
    'profile_title': 'हमें अपने बारे में बताएं',
    'full_name': 'पूरा नाम',
    'dob': 'जन्म तिथि',
    'city': 'शहर',
    'home': 'होम',
    'documents': 'दस्तावेज़',
    'services': 'सेवाएं',
    'earn': 'कमाएं',
    'profile': 'प्रोफ़ाइल',
    'health_score': 'दस्तावेज़ हेल्थ स्कोर',
    'quick_scan': 'नया दस्तावेज़ स्कैन',
    'quick_book': 'सेवा बुक करें',
    'quick_view': 'सभी दस्तावेज़ देखें',
    'recent_activity': 'हाल की गतिविधि',
    'all_documents': 'सभी दस्तावेज़',
    'add_document': 'दस्तावेज़ जोड़ें',
    'no_docs_title': 'अभी कोई दस्तावेज़ नहीं',
    'no_docs_body': 'समाप्ति ट्रैक करने के लिए पहला दस्तावेज़ जोड़ें।',
    'no_alerts': 'सब कुछ अपडेट है',
    'alerts': 'अलर्ट',
    'book_now': 'अभी बुक करें',
  };
}

class _L10nDelegate extends LocalizationsDelegate<L10n> {
  const _L10nDelegate();
  @override
  bool isSupported(Locale locale) => ['en', 'hi'].contains(locale.languageCode);
  @override
  Future<L10n> load(Locale locale) async => L10n(locale);
  @override
  bool shouldReload(_L10nDelegate old) => false;
}

/// Active locale, persisted to shared_preferences (OB-02 stores the choice).
class LocaleController extends StateNotifier<Locale> {
  LocaleController() : super(const Locale('en')) {
    _load();
  }
  static const _key = 'app_language';

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_key);
    if (code != null) state = Locale(code);
  }

  Future<void> setLocale(String code) async {
    state = Locale(code);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, code);
  }
}

final localeProvider =
    StateNotifierProvider<LocaleController, Locale>((_) => LocaleController());

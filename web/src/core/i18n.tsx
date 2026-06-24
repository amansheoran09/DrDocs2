import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

// Bilingual strings — English + Hindi (UX Rule 5: Hindi parity from Day 1).
// Add new keys to BOTH maps; the Lang type keeps them in sync at compile time.
const en = {
  app_name: "DrDocs",
  tagline: "All your documents. One safe place.",
  choose_language: "Choose your language",
  continue: "Continue",
  skip: "Skip",
  get_started: "Get Started",
  welcome_1_title: "Scan your documents",
  welcome_1_body: "Snap a photo — we read and organise every detail for you.",
  welcome_2_title: "Get expiry alerts",
  welcome_2_body: "Never miss a renewal. We warn you 6 months ahead.",
  welcome_3_title: "Renew at your doorstep",
  welcome_3_body: "Book Dr.Docs and we handle the paperwork at your home.",
  phone_title: "Enter your mobile number",
  phone_hint: "10-digit mobile number",
  send_otp: "Send OTP",
  tnc: "I agree to the Terms & Conditions and Privacy Policy",
  otp_title: "Verify your number",
  otp_sent: "We sent a 6-digit code to",
  verify: "Verify",
  resend_otp: "Resend OTP",
  profile_title: "Tell us about you",
  full_name: "Full name",
  dob: "Date of birth",
  city: "City",
  home: "Home",
  documents: "Documents",
  services: "Services",
  earn: "Earn",
  profile: "Profile",
  health_score: "Document Health Score",
  quick_scan: "Scan New Doc",
  quick_book: "Book Service",
  quick_view: "View All Docs",
  alerts: "Alerts",
  all_documents: "All Documents",
  add_document: "Add Document",
  no_docs_title: "No documents yet",
  no_docs_body: "Add your first document to start tracking expiries.",
  no_alerts: "You are all caught up",
  book_now: "Book Now",
  logout: "Logout",
  email: "Email address",
  password: "Password",
  sign_in: "Sign In",
  create_account: "Create Account",
  toggle_to_signup: "New here? Create an account",
  toggle_to_signin: "Already have an account? Sign in",
  auth_title: "Sign in to DrDocs",
};

type Strings = typeof en;
const hi: Strings = {
  app_name: "DrDocs",
  tagline: "आपके सभी दस्तावेज़। एक सुरक्षित जगह।",
  choose_language: "अपनी भाषा चुनें",
  continue: "आगे बढ़ें",
  skip: "छोड़ें",
  get_started: "शुरू करें",
  welcome_1_title: "अपने दस्तावेज़ स्कैन करें",
  welcome_1_body: "एक फ़ोटो लें — हम हर जानकारी पढ़कर व्यवस्थित कर देते हैं।",
  welcome_2_title: "समाप्ति की चेतावनी पाएं",
  welcome_2_body: "नवीनीकरण कभी न चूकें। हम 6 महीने पहले बताते हैं।",
  welcome_3_title: "घर बैठे नवीनीकरण",
  welcome_3_body: "Dr.Docs बुक करें और कागज़ी काम हम संभालते हैं।",
  phone_title: "अपना मोबाइल नंबर दर्ज करें",
  phone_hint: "10 अंकों का मोबाइल नंबर",
  send_otp: "OTP भेजें",
  tnc: "मैं नियम व शर्तों और गोपनीयता नीति से सहमत हूँ",
  otp_title: "अपना नंबर सत्यापित करें",
  otp_sent: "हमने 6 अंकों का कोड भेजा है",
  verify: "सत्यापित करें",
  resend_otp: "OTP फिर भेजें",
  profile_title: "हमें अपने बारे में बताएं",
  full_name: "पूरा नाम",
  dob: "जन्म तिथि",
  city: "शहर",
  home: "होम",
  documents: "दस्तावेज़",
  services: "सेवाएं",
  earn: "कमाएं",
  profile: "प्रोफ़ाइल",
  health_score: "दस्तावेज़ हेल्थ स्कोर",
  quick_scan: "नया दस्तावेज़ स्कैन",
  quick_book: "सेवा बुक करें",
  quick_view: "सभी दस्तावेज़ देखें",
  alerts: "अलर्ट",
  all_documents: "सभी दस्तावेज़",
  add_document: "दस्तावेज़ जोड़ें",
  no_docs_title: "अभी कोई दस्तावेज़ नहीं",
  no_docs_body: "समाप्ति ट्रैक करने के लिए पहला दस्तावेज़ जोड़ें।",
  no_alerts: "सब कुछ अपडेट है",
  book_now: "अभी बुक करें",
  logout: "लॉग आउट",
  email: "ईमेल पता",
  password: "पासवर्ड",
  sign_in: "साइन इन",
  create_account: "खाता बनाएं",
  toggle_to_signup: "नए हैं? खाता बनाएं",
  toggle_to_signin: "पहले से खाता है? साइन इन करें",
  auth_title: "DrDocs में साइन इन करें",
};

export type Lang = "en" | "hi";
const dict: Record<Lang, Strings> = { en, hi };

interface I18nContextValue {
  lang: Lang;
  t: (key: keyof Strings) => string;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  t: (k) => en[k],
  setLang: () => {},
});

const STORAGE_KEY = "app_language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem(STORAGE_KEY) as Lang) || "en",
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);

  const t = useCallback((key: keyof Strings) => dict[lang][key] ?? en[key], [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
export const hasChosenLanguage = () => localStorage.getItem(STORAGE_KEY) != null;

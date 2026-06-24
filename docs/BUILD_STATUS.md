# Build Status — Screen Coverage Matrix

Status legend: ✅ implemented · 🟡 scaffolded (route + placeholder) · ⬜ planned

The full navigation graph is wired (every screen ID has a route). "Scaffolded"
screens render a labelled placeholder and are the next implementation targets.

## Onboarding (Section 3.1)
| ID | Screen | Status |
|----|--------|--------|
| OB-01 | Splash | ✅ |
| OB-02 | Language Select | ✅ |
| OB-03 | Welcome Carousel | ✅ |
| OB-04 | Phone Number Entry | ✅ |
| OB-05 | OTP Verification | ✅ |
| OB-06 | Profile Setup | ✅ |

## Home (Section 3.2)
| ID | Screen | Status |
|----|--------|--------|
| HM-01 | Home Dashboard | ✅ |

## Document Wallet (Section 3.3)
| ID | Screen | Status |
|----|--------|--------|
| DW-01 | All Documents | ✅ |
| DW-02 | Document Detail | ✅ |
| DW-03 | Add Document — Method Select | ✅ |
| DW-04 | Camera Scan | ✅ (capture + on-device OCR + image to Storage) |
| DW-05 | Scan Result — Review | ✅ (confirm details before save) |
| DW-06 | DigiLocker Connect | 🟡 |
| DW-07 | Manual Entry | ✅ |
| DW-08 | Family Member Docs | 🟡 |

## Family Manager (Section 3.4)
| ID | Screen | Status |
|----|--------|--------|
| FM-01 | Family Home | 🟡 |
| FM-02 | Add Family Member | 🟡 |
| FM-03 | Family Member Detail | 🟡 |

## Intelligence & Alerts (Section 3.5)
| ID | Screen | Status |
|----|--------|--------|
| AL-01 | Alerts Centre | ✅ |
| AL-02 | Alert Detail | ✅ |
| AL-03 | Health Score Detail | ✅ |
| AL-04 | Cross-Link Status | 🟡 |

## Service Marketplace (Section 3.6)
| ID | Screen | Status |
|----|--------|--------|
| SV-01 | Services Home | ✅ |
| SV-02 | Service Category | 🟡 |
| SV-03 | Service Detail | ✅ |
| SV-04 | Document Checklist | ✅ |
| SV-05 | Booking Slot Select | ✅ |
| SV-06 | Booking Confirm & Pay | ✅ (demo payment) |
| SV-07 | Order Tracking | ✅ (live Realtime timeline) |
| SV-08 | Order History | ✅ (track + rate) |

## Earn & Referral (Section 3.7)
| ID | Screen | Status |
|----|--------|--------|
| ER-01 | Earn Home | ✅ |
| ER-02 | Refer a Friend | ✅ (code, share, tracker) |
| ER-03 | Become an Agent | ✅ (register + calculator) |
| ER-04 | Agent Certification | ✅ (modules + certify) |
| ER-05 | DocCash Wallet | ✅ (balance, history, redeem) |

## Profile & Settings (Section 3.8)
| ID | Screen | Status |
|----|--------|--------|
| PR-01 | Profile Home | ✅ |
| PR-02 | Personal Details | ✅ |
| PR-03 | Notification Settings | ✅ |
| PR-04 | Privacy & Data | ✅ (export + delete) |
| PR-05 | Security Settings | ✅ (PIN + lock) |
| PR-06 | Subscription | ✅ (Razorpay upgrade) |
| PR-07 | Help & Support | ✅ (FAQ + WhatsApp) |

## Agent-Only (Section 3.9)
| ID | Screen | Status |
|----|--------|--------|
| AG-01 | Agent Dashboard | 🟡 |
| AG-02 | Order Detail (Agent) | 🟡 |
| AG-03 | Agent Earnings | 🟡 |
| AG-04 | Agent Profile | 🟡 |
| AG-05 | Agent Map View | 🟡 |

## Backend & cross-cutting
| Item | Section | Status |
|------|---------|--------|
| Full DB schema + constraints + indexes | 4 | ✅ |
| Row Level Security on all tables | 5.1, 10 | ✅ |
| Document Health Score algorithm | 6.1 | ✅ (tested) |
| Document status auto-derivation | 7.2 | ✅ (tested) |
| Family-member cap (6) | 2 | ✅ (tested) |
| DocCash ledger + overdraw guard | 6.5 | ✅ (tested) |
| Alert generation CRON | 6.2 | ✅ (Edge Function) |
| Razorpay webhook (pay → confirm → reward) | 5.3, 6.4 | ✅ (Edge Function) |
| OneSignal push (NTF-01…14) | 8 | ✅ (sender + templates) |
| Service catalogue seed | 9.1 | ✅ (18 services across 7 categories) |
| Design system (colours/type/components) | 7.1 | ✅ |
| English + Hindi parity | UX Rule 5 | ✅ (for shipped strings) |
| OCR extraction | 6.3 | ✅ (Tesseract.js, on-device, free; replaces Vision) |
| DigiLocker OAuth import | 5.5 | ⬜ |
| Biometric lock | 10 | ⬜ (WebAuthn planned) |

import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { BottomNav } from "./components/BottomNav";
import { SideNav } from "./components/SideNav";
import { Placeholder } from "./components/ui";
import { useAuth } from "./data/useAuth";
import { AlertDetail, AlertsCentre, HealthScoreDetail } from "./features/Alerts";
import {
  AddDocument,
  AllDocuments,
  DocumentDetail,
  ManualEntry,
} from "./features/Documents";
import { Earn } from "./features/Earn";
import { Home } from "./features/Home";
import { Auth } from "./features/Auth";
import { Language, ProfileSetup, Splash, Welcome } from "./features/Onboarding";
import { Profile } from "./features/Profile";
import { BecomeAgent } from "./features/BecomeAgent";
import { BookingFlow } from "./features/BookingFlow";
import { DocCashWallet } from "./features/DocCashWallet";
import { OrderHistory } from "./features/OrderHistory";
import { ReferFriend } from "./features/ReferFriend";
import { ScanDocument } from "./features/ScanDocument";
import { OrderTracking, ServiceDetail, ServicesHome } from "./features/Services";

// Authenticated shell: sidebar nav on desktop, bottom-tab nav on mobile
// (Section 7.1). Content is centred and width-capped, responsive on all sizes.
function AppLayout() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return (
    <div className="app-shell">
      <SideNav />
      <div className="app-main">
        <div className="content">
          <Outlet />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

// Onboarding / auth screens render in a phone-width column on every device.
function AuthFrame() {
  return (
    <div className="phone-pane">
      <Outlet />
    </div>
  );
}

// Remaining Section 3 screen IDs — routes wired to labelled scaffolds.
const PLACEHOLDERS: [string, string, string][] = [
  ["/documents/digilocker", "DW-06", "DigiLocker Connect"],
  ["/family", "FM-01", "Family Home"],
  ["/alerts/links", "AL-04", "Cross-Link Status"],
  ["/profile/personal", "PR-02", "Personal Details"],
  ["/profile/settings/notifications", "PR-03", "Notification Settings"],
  ["/profile/settings/privacy", "PR-04", "Privacy & Data"],
  ["/profile/settings/security", "PR-05", "Security Settings"],
  ["/profile/subscription", "PR-06", "Subscription"],
  ["/profile/help", "PR-07", "Help & Support"],
  ["/agent", "AG-01", "Agent Dashboard"],
];

export function App() {
  return (
    <div className="app-frame">
      <Routes>
        {/* Onboarding (phone-width column, no nav) */}
        <Route element={<AuthFrame />}>
          <Route path="/" element={<Splash />} />
          <Route path="/language" element={<Language />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
        </Route>

        {/* Authenticated app */}
        <Route element={<AppLayout />}>
          <Route path="/home" element={<Home />} />

          <Route path="/documents" element={<AllDocuments />} />
          <Route path="/documents/add" element={<AddDocument />} />
          <Route path="/documents/manual" element={<ManualEntry />} />
          <Route path="/documents/scan" element={<ScanDocument />} />
          <Route path="/documents/:id" element={<DocumentDetail />} />

          <Route path="/services" element={<ServicesHome />} />
          <Route path="/services/:id" element={<ServiceDetail />} />
          <Route path="/services/:id/book" element={<BookingFlow />} />
          <Route path="/orders" element={<OrderHistory />} />

          <Route path="/earn" element={<Earn />} />
          <Route path="/earn/refer" element={<ReferFriend />} />
          <Route path="/earn/agent" element={<BecomeAgent />} />
          <Route path="/earn/wallet" element={<DocCashWallet />} />
          <Route path="/profile" element={<Profile />} />

          <Route path="/alerts" element={<AlertsCentre />} />
          <Route path="/alerts/health" element={<HealthScoreDetail />} />
          <Route path="/alerts/detail/:id" element={<AlertDetail />} />
          <Route path="/orders/:id" element={<OrderTracking />} />

          {PLACEHOLDERS.map(([path, id, title]) => (
            <Route key={path} path={path} element={<Placeholder id={id} title={title} />} />
          ))}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { BottomNav } from "./components/BottomNav";
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
import { ScanDocument } from "./features/ScanDocument";
import { OrderTracking, ServiceDetail, ServicesHome } from "./features/Services";

// Authenticated shell: persistent 5-tab bottom navigation (Section 7.1).
function AppLayout() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}

// Remaining Section 3 screen IDs — routes wired to labelled scaffolds.
const PLACEHOLDERS: [string, string, string][] = [
  ["/documents/digilocker", "DW-06", "DigiLocker Connect"],
  ["/family", "FM-01", "Family Home"],
  ["/alerts/links", "AL-04", "Cross-Link Status"],
  ["/orders", "SV-08", "Order History"],
  ["/profile/personal", "PR-02", "Personal Details"],
  ["/profile/settings/notifications", "PR-03", "Notification Settings"],
  ["/profile/settings/privacy", "PR-04", "Privacy & Data"],
  ["/profile/settings/security", "PR-05", "Security Settings"],
  ["/profile/subscription", "PR-06", "Subscription"],
  ["/profile/help", "PR-07", "Help & Support"],
  ["/earn/refer", "ER-02", "Refer a Friend"],
  ["/earn/agent", "ER-03", "Become an Agent"],
  ["/earn/wallet", "ER-05", "DocCash Wallet"],
  ["/agent", "AG-01", "Agent Dashboard"],
];

export function App() {
  return (
    <div className="app-frame">
      <Routes>
        {/* Onboarding (no bottom nav) */}
        <Route path="/" element={<Splash />} />
        <Route path="/language" element={<Language />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />

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

          <Route path="/earn" element={<Earn />} />
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

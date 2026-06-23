import { NavLink } from "react-router-dom";

import { useI18n } from "../core/i18n";

// 5-tab bottom navigation (Section 7.1): Home, Documents, Services, Earn, Profile.
export function BottomNav() {
  const { t } = useI18n();
  const tabs = [
    { to: "/home", icon: "🏠", label: t("home") },
    { to: "/documents", icon: "📁", label: t("documents") },
    { to: "/services", icon: "🛠️", label: t("services") },
    { to: "/earn", icon: "🎁", label: t("earn") },
    { to: "/profile", icon: "👤", label: t("profile") },
  ];
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="nav-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

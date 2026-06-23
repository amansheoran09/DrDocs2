import { NavLink } from "react-router-dom";

import { useI18n } from "../core/i18n";

// Desktop / tablet left sidebar (md breakpoint and up). Mirrors the mobile
// bottom-nav tabs; only one is visible at a time via CSS.
export function SideNav() {
  const { t } = useI18n();
  const tabs = [
    { to: "/home", icon: "🏠", label: t("home") },
    { to: "/documents", icon: "📁", label: t("documents") },
    { to: "/services", icon: "🛠️", label: t("services") },
    { to: "/earn", icon: "🎁", label: t("earn") },
    { to: "/profile", icon: "👤", label: t("profile") },
  ];
  return (
    <aside className="side-nav">
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 22,
          color: "var(--navy)",
          padding: "8px 12px 20px",
        }}
      >
        🛡️ DocVault
      </div>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `side-link${isActive ? " active" : ""}`}
        >
          <span style={{ fontSize: 20 }}>{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </aside>
  );
}

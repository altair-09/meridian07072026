import { NavLink } from "react-router-dom";
import {
  IconLayoutDashboard, IconChartCandle,
  IconBulb, IconSettings, IconRobot,
} from "@tabler/icons-react";

const ITEMS = [
  { to: "/", label: "Dashboard", icon: IconLayoutDashboard },
  { to: "/bot-manager", label: "Bots", icon: IconRobot },
  { to: "/trade", label: "Trade", icon: IconChartCandle },
  { to: "/insights", label: "Insights", icon: IconBulb },
  { to: "/settings", label: "Settings", icon: IconSettings },
];

export default function BottomNav() {
  return (
    <nav
      className="bottom-nav"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "var(--surface-card)", borderTop: "1px solid var(--hairline)", zIndex: 30,
      }}
    >
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          style={({ isActive }) => ({
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 2, minHeight: 56, textDecoration: "none",
            color: isActive ? "var(--text-primary)" : "var(--text-muted)", fontSize: 11,
          })}
        >
          <Icon size={20} stroke={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

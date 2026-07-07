import { useState, useRef } from "react";
import { NavLink } from "react-router-dom";
import {
  IconLayoutDashboard, IconRobot, IconChartCandle,
  IconBulb, IconWallet, IconSettings,
  IconPinned, IconPinnedOff, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import { lessonApprovalQueue } from "../mock/mockData";

const ITEMS = [
  { to: "/", label: "Dashboard", icon: IconLayoutDashboard },
  { to: "/bot-manager", label: "Bot manager", icon: IconRobot },
  { to: "/trade", label: "Trade", icon: IconChartCandle },
  { to: "/insights", label: "Insights & lessons", icon: IconBulb, badgeKey: "pending_lessons" },
  { to: "/wallet-monitor", label: "Wallet monitor", icon: IconWallet },
  { to: "/settings", label: "Settings", icon: IconSettings },
];

const COLLAPSED_WIDTH = 56;
const EXPANDED_WIDTH = 220;
const LS_PINNED = "meridian.sidebar.pinned";
const LS_COLLAPSED = "meridian.sidebar.collapsed";

function loadBool(key, def) {
  try { const v = localStorage.getItem(key); return v === null ? def : v === "true"; }
  catch { return def; }
}

export default function Sidebar() {
  const pendingCount = lessonApprovalQueue.filter((l) => l.status === "pending").length;

  const [pinned, setPinned] = useState(() => loadBool(LS_PINNED, true));
  const [collapsed, setCollapsed] = useState(() => loadBool(LS_COLLAPSED, false));
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef(null);

  // When pinned=true, expanded state is driven by `collapsed`.
  // When pinned=false (auto-hide mode), expanded only while hovering.
  const expanded = pinned ? !collapsed : hovered;

  const width = expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem(LS_PINNED, next);
    if (!next) setCollapsed(false); // reset collapsed when unpinning
  }

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(LS_COLLAPSED, next);
  }

  function onMouseEnter() {
    if (pinned) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(true), 80);
  }

  function onMouseLeave() {
    if (pinned) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(false), 200);
  }

  return (
    <nav
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width,
        flexShrink: 0,
        background: "var(--canvas)",
        borderRight: "1px solid var(--hairline)",
        padding: "var(--space-4) 0",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        position: "sticky",
        top: 0,
        transition: "width 0.2s ease",
        zIndex: 20,
      }}
    >
      {/* Logo row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: expanded ? "space-between" : "center",
        padding: expanded ? "0 12px" : "0",
        marginBottom: 12,
        minHeight: 28,
        overflow: "hidden",
      }}>
        {expanded && (
          <span className="t-title-md" style={{ whiteSpace: "nowrap", overflow: "hidden" }}>
            Meridian ops
          </span>
        )}
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          {/* Pin toggle — only show when expanded */}
          {expanded && (
            <button
              onClick={togglePin}
              title={pinned ? "Unpin sidebar (auto-hide)" : "Pin sidebar"}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6,
                color: pinned ? "var(--primary-glow)" : "var(--text-muted)",
                display: "flex", alignItems: "center",
              }}
            >
              {pinned ? <IconPinned size={15} stroke={2} /> : <IconPinnedOff size={15} stroke={2} />}
            </button>
          )}

          {/* Collapse toggle — only shown when pinned */}
          {pinned && (
            <button
              onClick={toggleCollapse}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6,
                color: "var(--text-muted)", display: "flex", alignItems: "center",
              }}
            >
              {collapsed
                ? <IconLayoutSidebarLeftExpand size={16} stroke={1.75} />
                : <IconLayoutSidebarLeftCollapse size={16} stroke={1.75} />
              }
            </button>
          )}
        </div>
      </div>

      {/* Nav items */}
      {ITEMS.map(({ to, label, icon: Icon, badgeKey }) => {
        const badge = badgeKey === "pending_lessons" && pendingCount > 0 ? pendingCount : null;
        return (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            title={!expanded ? label : undefined}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: expanded ? "10px 12px" : "10px 0",
              justifyContent: expanded ? "flex-start" : "center",
              marginInline: expanded ? 8 : 4,
              borderRadius: "var(--radius-control)",
              textDecoration: "none",
              color: isActive ? "var(--text-primary)" : "var(--text-body)",
              background: isActive ? "rgba(0, 7, 205, 0.1)" : "transparent",
              fontSize: 14,
              overflow: "hidden",
              whiteSpace: "nowrap",
              position: "relative",
              flexShrink: 0,
            })}
          >
            <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
              <Icon size={18} stroke={1.75} />
            </span>

            {expanded && (
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
            )}

            {badge && expanded && (
              <span style={{
                minWidth: 18, height: 18, borderRadius: 9, background: "var(--primary-glow)",
                color: "#fff", fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
                flexShrink: 0,
              }}>{badge}</span>
            )}

            {/* Collapsed badge dot */}
            {badge && !expanded && (
              <span style={{
                position: "absolute", top: 6, right: 6,
                width: 7, height: 7, borderRadius: "50%",
                background: "var(--primary-glow)",
                border: "1px solid var(--canvas)",
              }} />
            )}
          </NavLink>
        );
      })}

      {/* Bottom spacer + collapsed expand hint */}
      {!expanded && pinned && (
        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <button
            onClick={toggleCollapse}
            title="Expand sidebar"
            style={{
              width: "100%", background: "none", border: "none", cursor: "pointer",
              padding: "8px 0", display: "flex", justifyContent: "center",
              color: "var(--text-muted)",
            }}
          >
            <IconLayoutSidebarLeftExpand size={16} stroke={1.75} />
          </button>
        </div>
      )}
    </nav>
  );
}

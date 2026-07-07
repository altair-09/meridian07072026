import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ChatProvider } from "./context/ChatContext";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import RightChatSidebar from "./components/RightChatSidebar";
import Dashboard from "./pages/Dashboard";
import BotManager from "./pages/BotManager";
import Trade from "./pages/Trade";
import PoolDetail from "./pages/PoolDetail";
import InsightsLessons from "./pages/InsightsLessons";
import WalletMonitor from "./pages/WalletMonitor";
import Settings from "./pages/Settings";

const CHAT_SIDEBAR_ROUTES = ["/", "/insights", "/trade"];
function useShowChatSidebar() {
  const location = useLocation();
  return CHAT_SIDEBAR_ROUTES.some((r) => location.pathname === r || location.pathname.startsWith(r + "/")) && !location.pathname.startsWith("/trade/pool/");
}

export default function App() {
  const location = useLocation();
  const showChatSidebar = useShowChatSidebar();

  return (
    <ChatProvider>
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main
        className="page-content"
        style={{ flex: 1, overflow: "hidden", minWidth: 0, display: "flex", flexDirection: "column" }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bot-manager" element={<BotManager />} />
          <Route path="/trade" element={<Trade />} />
          <Route path="/trade/pool/:rank" element={<PoolDetail />} />
          <Route path="/insights" element={<InsightsLessons />} />
          <Route path="/wallet-monitor" element={<WalletMonitor />} />
          <Route path="/settings" element={<Settings />} />
          {/* legacy redirects */}
          <Route path="/screener" element={<Navigate to="/trade" replace />} />
          <Route path="/manual-trading" element={<Navigate to="/trade" replace />} />
        </Routes>
      </main>
      {showChatSidebar && <RightChatSidebar />}
      <BottomNav />
    </div>
    </ChatProvider>
  );
}

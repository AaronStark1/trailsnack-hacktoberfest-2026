import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Welcome from "./pages/Welcome.tsx";
import Scan from "./pages/Scan.tsx";
import Assess from "./pages/Assess.tsx";
import FieldLog from "./pages/FieldLog.tsx";
import FieldLogDetail from "./pages/FieldLogDetail.tsx";
import Models from "./pages/Models.tsx";
import Settings from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppShell from "./components/layout/AppShell.tsx";
import { useSettingsStore } from "./stores/settingsStore.ts";

function FirstRunGate({ children }: { children: React.ReactNode }) {
  const acceptedAt = useSettingsStore((s) => s.disclaimerAcceptedAt);
  const location = useLocation();
  if (!acceptedAt && location.pathname !== "/welcome") {
    return <Navigate to="/welcome" replace />;
  }
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <FirstRunGate>
            <AppShell />
          </FirstRunGate>
        }
      >
        <Route path="/" element={<Navigate to="/scan" replace />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/assess/:id" element={<Assess />} />
        <Route path="/log" element={<FieldLog />} />
        <Route path="/log/:id" element={<FieldLogDetail />} />
        <Route path="/models" element={<Models />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

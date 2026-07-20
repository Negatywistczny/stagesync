import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TransportProvider } from "./transport/TransportProvider.js";
import { AdminShell } from "./shells/AdminShell.js";
import { ClientShell } from "./shells/ClientShell.js";
import { TimelineShell } from "./shells/TimelineShell.js";

export default function App() {
  return (
    <TransportProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ClientShell />} />
          <Route path="/admin" element={<AdminShell />} />
          <Route path="/timeline/:projectId" element={<TimelineShell />} />
          <Route path="/timeline" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TransportProvider>
  );
}

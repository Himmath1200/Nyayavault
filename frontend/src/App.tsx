import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoadingState } from "@/components/ui/States";
import Login from "@/pages/Login";
import PublicVerify from "@/pages/PublicVerify";

const CommandCenter = lazy(() => import("@/pages/CommandCenter"));
const CaseList = lazy(() => import("@/pages/cases/CaseList"));
const CaseDetail = lazy(() => import("@/pages/cases/CaseDetail"));
const DocumentVault = lazy(() => import("@/pages/DocumentVault"));
const EvidenceDNA = lazy(() => import("@/pages/EvidenceDNA"));
const CaseIntelligence = lazy(() => import("@/pages/CaseIntelligence"));
const Timeline = lazy(() => import("@/pages/Timeline"));
const ChainOfCustody = lazy(() => import("@/pages/ChainOfCustody"));
const AIInsights = lazy(() => import("@/pages/AIInsights"));
const Security = lazy(() => import("@/pages/Security"));
const AuditTrail = lazy(() => import("@/pages/AuditTrail"));
const CourtVerification = lazy(() => import("@/pages/CourtVerification"));
const Certificate = lazy(() => import("@/pages/Certificate"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const Settings = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function Suspended({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify/:verificationId" element={<PublicVerify />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Suspended><CommandCenter /></Suspended>} />
        <Route path="cases" element={<Suspended><CaseList /></Suspended>} />
        <Route path="cases/:caseId" element={<Suspended><CaseDetail /></Suspended>} />
        <Route path="vault" element={<Suspended><DocumentVault /></Suspended>} />
        <Route path="evidence" element={<Suspended><EvidenceDNA /></Suspended>} />
        <Route path="intelligence" element={<Suspended><CaseIntelligence /></Suspended>} />
        <Route path="timeline" element={<Suspended><Timeline /></Suspended>} />
        <Route path="custody" element={<Suspended><ChainOfCustody /></Suspended>} />
        <Route path="ai-insights" element={<Suspended><AIInsights /></Suspended>} />
        <Route path="security" element={<Suspended><Security /></Suspended>} />
        <Route path="audit" element={<Suspended><AuditTrail /></Suspended>} />
        <Route path="court-verification" element={<Suspended><CourtVerification /></Suspended>} />
        <Route path="certificates/:certificateId" element={<Suspended><Certificate /></Suspended>} />
        <Route path="users" element={<Suspended><UserManagement /></Suspended>} />
        <Route path="settings" element={<Suspended><Settings /></Suspended>} />
        <Route path="*" element={<Suspended><NotFound /></Suspended>} />
      </Route>
    </Routes>
  );
}

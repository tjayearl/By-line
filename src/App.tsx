import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/Dashboard";
import RegisterCorrespondent from "./pages/editor/RegisterCorrespondent";
import CreateAssignment from "./pages/editor/CreateAssignment";
import ReviewSubmissions from "./pages/editor/ReviewSubmissions";
import CorrespondentDashboard from "./pages/correspondent/Dashboard";
import SubmitFiling from "./pages/correspondent/SubmitFiling";
import StoriesReport from "./pages/correspondent/StoriesReport";
import RateCard from "./pages/admin/RateCard";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-offwhite flex flex-col font-sans text-slate-900">
      <Navbar />
      <main className="flex-1 pb-12">
        {children}
      </main>
      <footer className="bg-brand-navy text-white text-xs py-4 px-6 border-t-2 border-brand-gold text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Byline Contributor Portal v1.0 &bull; Kenya Broadcasting Corporation (KBC Digital)</span>
          <span className="text-brand-gold font-semibold">Tech Stack: React JS | Firebase Auth & Firestore | jsPDF</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <ProtectedRoute>
                <Layout><ReviewSubmissions /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operations"
            element={
              <ProtectedRoute>
                <Layout><CorrespondentDashboard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments"
            element={
              <ProtectedRoute allowedRoles={["correspondent", "editor", "managing_editor", "super_admin"]}>
                <Layout><CorrespondentDashboard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/submit"
            element={
              <ProtectedRoute allowedRoles={["correspondent", "editor", "managing_editor", "super_admin"]}>
                <Layout><SubmitFiling /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute allowedRoles={["correspondent", "editor", "managing_editor", "super_admin"]}>
                <Layout><StoriesReport /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/editor/register"
            element={
              <ProtectedRoute allowedRoles={["editor", "managing_editor", "super_admin"]}>
                <Layout><RegisterCorrespondent /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/assign"
            element={
              <ProtectedRoute allowedRoles={["editor", "managing_editor", "super_admin"]}>
                <Layout><CreateAssignment /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/review"
            element={
              <ProtectedRoute allowedRoles={["editor", "managing_editor", "super_admin"]}>
                <Layout><ReviewSubmissions /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/rates"
            element={
              <ProtectedRoute allowedRoles={["managing_editor", "super_admin"]}>
                <Layout><RateCard /></Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

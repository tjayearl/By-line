import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/auth/Login";
import RegisterCorrespondent from "./pages/editor/RegisterCorrespondent";
import CreateAssignment from "./pages/editor/CreateAssignment";
import ReviewSubmissions from "./pages/editor/ReviewSubmissions";
import CorrespondentDashboard from "./pages/correspondent/Dashboard";
import SubmitFiling from "./pages/correspondent/SubmitFiling";
import StoriesReport from "./pages/correspondent/StoriesReport";
import RateCard from "./pages/admin/RateCard";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Navbar />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout><CorrespondentDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/submit" element={
            <ProtectedRoute allowedRoles={["correspondent"]}>
              <Layout><SubmitFiling /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/report" element={
            <ProtectedRoute allowedRoles={["correspondent"]}>
              <Layout><StoriesReport /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/editor/register" element={
            <ProtectedRoute allowedRoles={["editor", "managing_editor", "super_admin"]}>
              <Layout><RegisterCorrespondent /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/editor/assign" element={
            <ProtectedRoute allowedRoles={["editor", "managing_editor", "super_admin"]}>
              <Layout><CreateAssignment /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/editor/review" element={
            <ProtectedRoute allowedRoles={["editor", "managing_editor", "super_admin"]}>
              <Layout><ReviewSubmissions /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/rates" element={
            <ProtectedRoute allowedRoles={["managing_editor", "super_admin"]}>
              <Layout><RateCard /></Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

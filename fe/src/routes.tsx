import { Navigate, Route, Routes } from "react-router";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminHomePage } from "@/pages/admin/AdminHomePage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHomePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

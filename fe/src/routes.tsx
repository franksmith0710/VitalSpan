import { Navigate, Route, Routes } from "react-router";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminHomePage } from "@/pages/admin/AdminHomePage";
import { SyncJobsPage } from "@/pages/admin/ingestion/SyncJobsPage";
import { SyncJobFormPage } from "@/pages/admin/ingestion/SyncJobFormPage";
import { SyncJobHistoryPage } from "@/pages/admin/ingestion/SyncJobHistoryPage";
import { EtlRulesPage } from "@/pages/admin/ingestion/EtlRulesPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHomePage />} />
        <Route path="ingestion/sync-jobs" element={<SyncJobsPage />} />
        <Route path="ingestion/sync-jobs/new" element={<SyncJobFormPage />} />
        <Route path="ingestion/sync-jobs/:id/edit" element={<SyncJobFormPage />} />
        <Route path="ingestion/sync-jobs/:id/history" element={<SyncJobHistoryPage />} />
        <Route path="ingestion/sync-jobs/:id/etl-rules" element={<EtlRulesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

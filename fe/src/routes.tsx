import { Navigate, Route, Routes } from "react-router";
import { RequireAuth } from "@/components/auth/require-auth";
import { AdminLayout } from "@/layouts/AdminLayout";
import { EmbedLayout } from "@/layouts/EmbedLayout";
import { EmbedChartPage } from "@/embed/EmbedChartPage";
import { EmbedSharePanel } from "@/embed/EmbedSharePanel";
import { AdminHomePage } from "@/pages/admin/AdminHomePage";
import { SyncJobsPage } from "@/pages/admin/ingestion/SyncJobsPage";
import { SyncJobFormPage } from "@/pages/admin/ingestion/SyncJobFormPage";
import { SyncJobHistoryPage } from "@/pages/admin/ingestion/SyncJobHistoryPage";
import { EtlRulesPage } from "@/pages/admin/ingestion/EtlRulesPage";
import { AccountProfilePage } from "@/pages/admin/account/AccountProfilePage";
import { AccountSettingsPage } from "@/pages/admin/account/AccountSettingsPage";
import { DashboardListPage } from "@/pages/admin/dashboard/DashboardListPage";
import { DashboardEditPage } from "@/pages/admin/dashboard/DashboardEditPage";
import { LoginPage } from "@/pages/login/LoginPage";
import { ConnectorsPage } from "@/pages/admin/connectors/ConnectorsPage";
import { DatasourceListPage } from "@/pages/admin/datasources/DatasourceListPage";
import { DatasourceFormPage } from "@/pages/admin/datasources/DatasourceFormPage";
import { DatasourceDetailPage } from "@/pages/admin/datasources/DatasourceDetailPage";
import { RoleListPage } from "@/pages/admin/system/roles/RoleListPage";
import { UserListPage } from "@/pages/admin/system/users/UserListPage";
import { EntityOverviewPage } from "@/pages/admin/entities/EntityOverviewPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="datasources" element={<DatasourceListPage />} />
          <Route path="datasources/new" element={<DatasourceFormPage mode="create" />} />
          <Route path="datasources/:id/edit" element={<DatasourceFormPage mode="edit" />} />
          <Route path="datasources/:id" element={<DatasourceDetailPage />} />
          <Route path="connectors" element={<ConnectorsPage />} />
          <Route path="ingestion/sync-jobs" element={<SyncJobsPage />} />
          <Route path="ingestion/sync-jobs/new" element={<SyncJobFormPage />} />
          <Route path="ingestion/sync-jobs/:id/edit" element={<SyncJobFormPage />} />
          <Route path="ingestion/sync-jobs/:id/history" element={<SyncJobHistoryPage />} />
          <Route path="ingestion/sync-jobs/:id/etl-rules" element={<EtlRulesPage />} />
          <Route path="account/profile" element={<AccountProfilePage />} />
          <Route path="account/settings" element={<AccountSettingsPage />} />
          <Route path="dashboards" element={<DashboardListPage />} />
          <Route path="dashboards/:id/edit" element={<DashboardEditPage mode="edit" />} />
          <Route path="dashboards/:id" element={<DashboardEditPage mode="view" />} />
          <Route path="entities/overview" element={<EntityOverviewPage />} />
          <Route path="system/roles" element={<RoleListPage />} />
          <Route path="system/users" element={<UserListPage />} />
        </Route>
      </Route>
      <Route path="/embed" element={<EmbedLayout />}>
        <Route path="chart/:chartId" element={<EmbedChartPage />} />
        <Route path="share" element={<EmbedSharePanel />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

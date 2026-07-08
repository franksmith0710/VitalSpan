import { Navigate, Route, Routes } from "react-router";
import { RequireAuth } from "@/components/auth/require-auth";
import { RequirePlatformAdmin } from "@/components/auth/require-capability";
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
import { PrefabReportsPage } from "@/pages/admin/reports/PrefabReportsPage";
import { ReportTemplatesPage } from "@/pages/admin/reports/ReportTemplatesPage";
import { ThemeAnalysisPage } from "@/pages/admin/themes/ThemeAnalysisPage";
import { EmbedSdkDemoPage } from "@/pages/embed/EmbedSdkDemoPage";
import { OrgTreePage } from "@/pages/admin/system/orgs/OrgTreePage";
import { RlsAdminPage } from "@/pages/admin/system/rls/RlsAdminPage";
import { AuditLogPage } from "@/pages/admin/system/audit/AuditLogPage";
import { GrantsPage } from "@/pages/admin/system/grants/GrantsPage";
import { GovernanceCatalogPage } from "@/pages/admin/governance/GovernanceCatalogPage";
import { GovernanceWorkflowPage } from "@/pages/admin/governance/GovernanceWorkflowPage";
import { GovernancePublishPage } from "@/pages/admin/governance/GovernancePublishPage";
import { MetadataHubPage } from "@/pages/admin/metadata/MetadataHubPage";
import { DatasetListPage } from "@/pages/admin/datasets/DatasetListPage";
import { DesignerPage } from "@/pages/admin/designer/DesignerPage";
import { ChartExplorePage } from "@/pages/admin/charts/ChartExplorePage";
import { ReportSchedulesPage } from "@/pages/admin/reports/ReportSchedulesPage";
import { ACCOUNT_SETTINGS_PATH } from "@/lib/workspace";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="datasources" element={<RequirePlatformAdmin><DatasourceListPage /></RequirePlatformAdmin>} />
          <Route path="datasources/new" element={<RequirePlatformAdmin><DatasourceFormPage mode="create" /></RequirePlatformAdmin>} />
          <Route path="datasources/:id/edit" element={<RequirePlatformAdmin><DatasourceFormPage mode="edit" /></RequirePlatformAdmin>} />
          <Route path="datasources/:id" element={<RequirePlatformAdmin><DatasourceDetailPage /></RequirePlatformAdmin>} />
          <Route path="connectors" element={<RequirePlatformAdmin><ConnectorsPage /></RequirePlatformAdmin>} />
          <Route path="ingestion/sync-jobs" element={<RequirePlatformAdmin><SyncJobsPage /></RequirePlatformAdmin>} />
          <Route path="ingestion/sync-jobs/new" element={<RequirePlatformAdmin><SyncJobFormPage /></RequirePlatformAdmin>} />
          <Route path="ingestion/sync-jobs/:id/edit" element={<RequirePlatformAdmin><SyncJobFormPage /></RequirePlatformAdmin>} />
          <Route path="ingestion/sync-jobs/:id/history" element={<RequirePlatformAdmin><SyncJobHistoryPage /></RequirePlatformAdmin>} />
          <Route path="ingestion/sync-jobs/:id/etl-rules" element={<RequirePlatformAdmin><EtlRulesPage /></RequirePlatformAdmin>} />
          <Route path="account/profile" element={<AccountProfilePage />} />
          <Route path="account/settings" element={<AccountSettingsPage />} />
          <Route path="dashboards" element={<DashboardListPage />} />
          <Route path="dashboards/:id/edit" element={<DashboardEditPage mode="edit" />} />
          <Route path="dashboards/:id" element={<DashboardEditPage mode="view" />} />
          <Route path="entities/overview" element={<EntityOverviewPage />} />
          <Route path="reports" element={<PrefabReportsPage />} />
          <Route path="reports/templates" element={<ReportTemplatesPage />} />
          <Route path="reports/templates/:nodeId" element={<ReportTemplatesPage />} />
          <Route path="reports/schedules" element={<ReportSchedulesPage />} />
          <Route path="charts/explore" element={<ChartExplorePage />} />
          <Route path="designer" element={<DesignerPage />} />
          <Route path="governance/catalog" element={<RequirePlatformAdmin><GovernanceCatalogPage /></RequirePlatformAdmin>} />
          <Route path="governance/tickets" element={<RequirePlatformAdmin><GovernanceWorkflowPage /></RequirePlatformAdmin>} />
          <Route path="governance/publish" element={<RequirePlatformAdmin><GovernancePublishPage /></RequirePlatformAdmin>} />
          <Route path="metadata" element={<RequirePlatformAdmin><MetadataHubPage /></RequirePlatformAdmin>} />
          <Route path="metadata/glossary" element={<RequirePlatformAdmin><MetadataHubPage /></RequirePlatformAdmin>} />
          <Route path="datasets" element={<RequirePlatformAdmin><DatasetListPage /></RequirePlatformAdmin>} />
          <Route path="me/views" element={<Navigate to={ACCOUNT_SETTINGS_PATH} replace />} />
          <Route path="themes/:dashboardId" element={<ThemeAnalysisPage />} />
          <Route path="system/roles" element={<RequirePlatformAdmin><RoleListPage /></RequirePlatformAdmin>} />
          <Route path="system/users" element={<RequirePlatformAdmin><UserListPage /></RequirePlatformAdmin>} />
          <Route path="system/orgs" element={<RequirePlatformAdmin><OrgTreePage /></RequirePlatformAdmin>} />
          <Route path="system/rls" element={<RequirePlatformAdmin><RlsAdminPage /></RequirePlatformAdmin>} />
          <Route path="system/audit" element={<RequirePlatformAdmin><AuditLogPage /></RequirePlatformAdmin>} />
          <Route
            path="system/grants"
            element={
              <RequirePlatformAdmin>
                <GrantsPage />
              </RequirePlatformAdmin>
            }
          />
        </Route>
      </Route>
      <Route path="/embed" element={<EmbedLayout />}>
        <Route path="chart/:chartId" element={<EmbedChartPage />} />
        <Route path="share" element={<EmbedSharePanel />} />
        <Route path="sdk-demo" element={<EmbedSdkDemoPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

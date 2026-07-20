import { Navigate, Route, Routes } from "react-router";
import { RequireAuth } from "@/components/auth/require-auth";
import { RequireCapabilityName } from "@/components/auth/require-capability";
import { AdminLayout } from "@/layouts/AdminLayout";
import { EmbedLayout } from "@/layouts/EmbedLayout";
import { EmbedChartPage } from "@/embed/EmbedChartPage";
import { EmbedScreenPage } from "@/embed/EmbedScreenPage";
import { EmbedSharePanel } from "@/embed/EmbedSharePanel";
import { AdminHomePage } from "@/pages/admin/AdminHomePage";
import { SyncJobsPage } from "@/pages/admin/ingestion/SyncJobsPage";
import { SyncJobFormPage } from "@/pages/admin/ingestion/SyncJobFormPage";
import { SyncJobHistoryPage } from "@/pages/admin/ingestion/SyncJobHistoryPage";
import { EtlRulesPage } from "@/pages/admin/ingestion/EtlRulesPage";
import { AccountProfilePage } from "@/pages/admin/account/AccountProfilePage";
import { AccountPreferencesPage } from "@/pages/admin/account/AccountPreferencesPage";
import { AccountSecurityPage } from "@/pages/admin/account/AccountSecurityPage";
import { DashboardListPage } from "@/pages/admin/dashboard/DashboardListPage";
import { DashboardEditPage } from "@/pages/admin/dashboard/DashboardEditPage";
import { DashboardSharePage } from "@/pages/admin/dashboard/DashboardSharePage";
import { LoginPage } from "@/pages/login/LoginPage";
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
import { withGovernanceHonesty } from "@/pages/admin/governance/GovernanceHonestyBanner";
import { QueryServicesPage } from "@/pages/admin/services/QueryServicesPage";
import { MetadataHubPage } from "@/pages/admin/metadata/MetadataHubPage";
import { DatasetListPage } from "@/pages/admin/datasets/DatasetListPage";
import { DatasetFormPage } from "@/pages/admin/datasets/DatasetFormPage";
import { DesignerPage } from "@/pages/admin/designer/DesignerPage";
import { ChartExplorePage } from "@/pages/admin/charts/ChartExplorePage";
import { CHART_TYPES_CATALOG_PATH } from "@/lib/chartPaths";
import { ReportSchedulesPage } from "@/pages/admin/reports/ReportSchedulesPage";
import { ReportCenterPage } from "@/pages/admin/reports/ReportCenterPage";
import { ReportViewPage } from "@/pages/admin/reports/ReportViewPage";
import { DataScreenListPage } from "@/pages/admin/data-screens/DataScreenListPage";
import { DataScreenPreviewPage } from "@/pages/admin/data-screens/DataScreenPreviewPage";
import { DataScreenViewRedirect } from "@/pages/admin/data-screens/DataScreenViewRedirect";
import { ACCOUNT_PREFERENCES_PATH } from "@/lib/workspace";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="datasources" element={<RequireCapabilityName capability="datasource:*"><DatasourceListPage /></RequireCapabilityName>} />
          <Route path="datasources/new" element={<RequireCapabilityName capability="datasource:*"><DatasourceFormPage mode="create" /></RequireCapabilityName>} />
          <Route path="datasources/:id/edit" element={<RequireCapabilityName capability="datasource:*"><DatasourceFormPage mode="edit" /></RequireCapabilityName>} />
          <Route path="datasources/:id" element={<RequireCapabilityName capability="datasource:*"><DatasourceDetailPage /></RequireCapabilityName>} />
          <Route path="connectors" element={<Navigate to="/admin/datasources" replace />} />
          <Route path="ingestion/sync-jobs" element={<RequireCapabilityName capability="datasource:*"><SyncJobsPage /></RequireCapabilityName>} />
          <Route path="ingestion/sync-jobs/new" element={<RequireCapabilityName capability="datasource:*"><SyncJobFormPage /></RequireCapabilityName>} />
          <Route path="ingestion/sync-jobs/:id/edit" element={<RequireCapabilityName capability="datasource:*"><SyncJobFormPage /></RequireCapabilityName>} />
          <Route path="ingestion/sync-jobs/:id/history" element={<RequireCapabilityName capability="datasource:*"><SyncJobHistoryPage /></RequireCapabilityName>} />
          <Route path="ingestion/sync-jobs/:id/etl-rules" element={<RequireCapabilityName capability="datasource:*"><EtlRulesPage /></RequireCapabilityName>} />
          <Route path="account/profile" element={<AccountProfilePage />} />
          <Route path="account/preferences" element={<AccountPreferencesPage />} />
          <Route path="account/security" element={<AccountSecurityPage />} />
          <Route path="account/settings" element={<Navigate to={ACCOUNT_PREFERENCES_PATH} replace />} />
          <Route path="account" element={<Navigate to="/admin/account/profile" replace />} />
          <Route path="dashboards" element={<DashboardListPage />} />
          <Route path="dashboards/:id/edit" element={<DashboardEditPage mode="edit" />} />
          <Route path="dashboards/:id/share" element={<DashboardSharePage />} />
          <Route path="dashboards/:id" element={<DashboardEditPage mode="view" />} />
          <Route path="data-screens/:id/share" element={<DashboardSharePage />} />
          <Route path="data-screens" element={<DataScreenListPage />} />
          <Route path="data-screens/:id/edit" element={<DashboardEditPage mode="edit" />} />
          <Route path="data-screens/:id/preview" element={<DataScreenPreviewPage />} />
          <Route path="data-screens/:id" element={<DataScreenViewRedirect />} />
          <Route path="entities/overview" element={<RequireCapabilityName capability="theme:*"><EntityOverviewPage /></RequireCapabilityName>} />
          <Route path="reports" element={<RequireCapabilityName capability="report:read"><PrefabReportsPage /></RequireCapabilityName>} />
          <Route path="reports/center" element={<RequireCapabilityName capability="report:read"><ReportCenterPage /></RequireCapabilityName>} />
          <Route path="reports/view/:nodeId" element={<RequireCapabilityName capability="report:read"><ReportViewPage /></RequireCapabilityName>} />
          <Route path="reports/templates" element={<RequireCapabilityName capability="report:manage"><ReportTemplatesPage /></RequireCapabilityName>} />
          <Route path="reports/templates/:nodeId" element={<RequireCapabilityName capability="report:manage"><ReportTemplatesPage /></RequireCapabilityName>} />
          <Route path="reports/schedules" element={<RequireCapabilityName capability="report:manage"><ReportSchedulesPage /></RequireCapabilityName>} />
          <Route path="charts/types" element={<RequireCapabilityName capability="governance:*">{withGovernanceHonesty(<ChartExplorePage />)}</RequireCapabilityName>} />
          <Route
            path="charts/explore"
            element={<Navigate to={CHART_TYPES_CATALOG_PATH} replace />}
          />
          <Route path="designer" element={<RequireCapabilityName capability="governance:*">{withGovernanceHonesty(<DesignerPage />)}</RequireCapabilityName>} />
          <Route path="governance/catalog" element={<RequireCapabilityName capability="governance:*">{withGovernanceHonesty(<GovernanceCatalogPage />)}</RequireCapabilityName>} />
          <Route path="governance/tickets" element={<RequireCapabilityName capability="governance:*">{withGovernanceHonesty(<GovernanceWorkflowPage />)}</RequireCapabilityName>} />
          <Route path="governance/publish" element={<RequireCapabilityName capability="governance:*">{withGovernanceHonesty(<GovernancePublishPage />)}</RequireCapabilityName>} />
          <Route path="services" element={<RequireCapabilityName capability="governance:*">{withGovernanceHonesty(<QueryServicesPage />)}</RequireCapabilityName>} />
          <Route path="metadata" element={<RequireCapabilityName capability="metadata:*"><MetadataHubPage /></RequireCapabilityName>} />
          <Route path="metadata/glossary" element={<RequireCapabilityName capability="metadata:*"><MetadataHubPage /></RequireCapabilityName>} />
          <Route path="datasets" element={<RequireCapabilityName capability="dataset:*"><DatasetListPage /></RequireCapabilityName>} />
          <Route path="datasets/new" element={<RequireCapabilityName capability="dataset:*"><DatasetFormPage mode="create" /></RequireCapabilityName>} />
          <Route path="datasets/:id/edit" element={<RequireCapabilityName capability="dataset:*"><DatasetFormPage mode="edit" /></RequireCapabilityName>} />
          <Route path="me/views" element={<Navigate to={ACCOUNT_PREFERENCES_PATH} replace />} />
          <Route path="themes/:dashboardId" element={<RequireCapabilityName capability="theme:*"><ThemeAnalysisPage /></RequireCapabilityName>} />
          <Route path="system/roles" element={<RequireCapabilityName capability="system:*"><RoleListPage /></RequireCapabilityName>} />
          <Route path="system/users" element={<RequireCapabilityName capability="system:*"><UserListPage /></RequireCapabilityName>} />
          <Route path="system/orgs" element={<RequireCapabilityName capability="system:*"><OrgTreePage /></RequireCapabilityName>} />
          <Route path="system/rls" element={<RequireCapabilityName capability="system:*"><RlsAdminPage /></RequireCapabilityName>} />
          <Route path="system/audit" element={<RequireCapabilityName capability="system:*"><AuditLogPage /></RequireCapabilityName>} />
          <Route
            path="system/grants"
            element={
              <RequireCapabilityName capability="system:*">
                <GrantsPage />
              </RequireCapabilityName>
            }
          />
        </Route>
      </Route>
      <Route path="/embed" element={<EmbedLayout />}>
        <Route path="chart/:chartId" element={<EmbedChartPage />} />
        <Route path="screen/:dashboardId" element={<EmbedScreenPage />} />
        <Route path="share" element={<EmbedSharePanel />} />
        {import.meta.env.DEV ? (
          <Route path="sdk-demo" element={<EmbedSdkDemoPage />} />
        ) : null}
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

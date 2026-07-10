import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isGovNavEnabledFromEnv } from "@/lib/gov-nav";

/** FAKE-06 / H1：治理深链诚实提示（侧栏隐藏时仍可达） */
export function GovernanceHonestyBanner() {
  const govNavOn = isGovNavEnabledFromEnv();
  return (
    <Alert severity="warning" appearance="subtle" className="mb-4" data-testid="gov-honesty-banner">
      <AlertTitle>未对接真实总线 / 差异化能力</AlertTitle>
      <AlertDescription>
        {govNavOn
          ? "当前治理能力为工程预览，未对接生产级数据总线；请勿作为客户主路径验收依据。"
          : "治理侧栏默认隐藏（VITE_GOV_NAV 未开启）。本页为深链入口，能力未对接真实总线，仅供工程探查。"}
      </AlertDescription>
    </Alert>
  );
}

export function withGovernanceHonesty(page: ReactNode) {
  return (
    <>
      <GovernanceHonestyBanner />
      {page}
    </>
  );
}

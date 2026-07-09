import { Outlet } from "react-router";

export function EmbedLayout() {
  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-950">
      <Outlet />
    </div>
  );
}

import { Outlet } from "react-router";

export function EmbedLayout() {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900">
      <Outlet />
    </div>
  );
}

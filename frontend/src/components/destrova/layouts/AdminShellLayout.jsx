import { Outlet } from "react-router-dom";
import AdminWorkspace from "../admin/components/AdminWorkspace";

/**
 * Admin production shell: `AdminWorkspace` (includes `AppShell` + section views). `Outlet` matches child paths.
 */
export default function AdminShellLayout() {
  return (
    <>
      <AdminWorkspace />
      <Outlet />
    </>
  );
}

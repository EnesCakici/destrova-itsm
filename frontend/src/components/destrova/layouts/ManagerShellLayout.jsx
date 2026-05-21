import { Outlet } from "react-router-dom";
import ManagerWorkspace from "../manager/components/ManagerWorkspace";

/**
 * Manager production shell: `ManagerWorkspace` (includes `AppShell` + section UI). `Outlet` matches child route paths for the router.
 */
export default function ManagerShellLayout() {
  return (
    <>
      <ManagerWorkspace />
      <Outlet />
    </>
  );
}

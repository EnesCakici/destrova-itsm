import ManagerWorkspace from "../components/ManagerWorkspace";

/** Preview route (`/preview/manager`) — same `ManagerWorkspace` + `AppShell` as production; no local color overrides. */
export default function ManagerPreviewPage() {
  return <ManagerWorkspace />;
}

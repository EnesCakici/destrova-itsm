import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AppShell from "../shell/AppShell";
import { SHELL_ROLES } from "../shell/roleConfig";

function pathToNavId(pathname) {
  if (pathname.includes("/knowledge-base")) return "knowledgeBase";
  if (pathname.includes("/worklog")) return "worklogSummary";
  return "inbox";
}

/**
 * Destrova agent production shell: `AppShell` (Topbar + Sidebar) + router `Outlet`.
 */
export default function AgentShellLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeNavId = pathToNavId(location.pathname);

  const handleNav = (id) => {
    if (id === "inbox") navigate("/agent/inbox");
    else if (id === "worklogSummary") navigate("/agent/worklog");
    else if (id === "knowledgeBase") navigate("/agent/knowledge-base");
  };

  return (
    <AppShell role={SHELL_ROLES.AGENT} activeNavId={activeNavId} onNavChange={handleNav}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-[#F4F6FB] px-3 py-3 md:px-4 md:py-4">
        <Outlet />
      </div>
    </AppShell>
  );
}

//Tüm route’ları burada tanımlanır.
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ROLES } from "../constants/roles";
import ProtectedRoute from "../guards/ProtectedRoute";
import RoleGuard from "../guards/RoleGuard";
import LoginPage from "../pages/auth/LoginPage";
import HomeRedirectPage from "../pages/common/HomeRedirectPage";
import NotFoundPage from "../pages/common/NotFoundPage";
import UnauthorizedPage from "../pages/common/UnauthorizedPage";
import CustomerShellLayout from "../layouts/CustomerShellLayout";
import CustomerTicketsPage from "../components/destrova/customer/pages/CustomerTicketsPage";
import CustomerNewTicketPage from "../components/destrova/customer/pages/CustomerNewTicketPage";
import CustomerTicketDetailPage from "../components/destrova/customer/pages/CustomerTicketDetailPage";
import AppShell from "../components/destrova/shell/AppShell";
import CustomerPreviewPage from "../components/destrova/customer/preview/CustomerPreviewPage";
import AgentShellLayout from "../components/destrova/layouts/AgentShellLayout";
import ManagerShellLayout from "../components/destrova/layouts/ManagerShellLayout";
import AdminShellLayout from "../components/destrova/layouts/AdminShellLayout";
import AgentInboxPage from "../components/destrova/agent/pages/AgentInboxPage";
import AgentWorklogSummaryPage from "../components/destrova/agent/pages/AgentWorklogSummaryPage";
import AgentKnowledgeBasePage from "../components/destrova/agent/pages/AgentKnowledgeBasePage";
import ManagerRouteMatch from "../components/destrova/manager/pages/ManagerRouteMatch";
import AdminRouteMatch from "../components/destrova/admin/pages/AdminRouteMatch";
import AgentWorkspaceSplit from "../components/destrova/agent/preview/AgentWorkspaceSplit";
import ManagerPreviewPage from "../components/destrova/manager/preview/ManagerPreviewPage";
import AdminWorkspace from "../components/destrova/admin/components/AdminWorkspace";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/unauthorized", element: <UnauthorizedPage /> },

  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <HomeRedirectPage /> },

      {
        path: "app",
        element: <AppShell />,
        children: [{ index: true, element: <CustomerPreviewPage /> }],
      },

      {
        path: "preview",
        children: [
          { path: "customer", element: <CustomerPreviewPage /> },
          { path: "agent", element: <AgentWorkspaceSplit /> },
          { path: "manager", element: <ManagerPreviewPage /> },
          { path: "admin", element: <AdminWorkspace /> },
        ],
      },

      {
        path: "customer",
        element: <RoleGuard allowedRoles={[ROLES.CUSTOMER]} />,
        children: [
          {
            element: <CustomerShellLayout />,
            children: [
              { path: "tickets", element: <CustomerTicketsPage /> },
              { path: "tickets/:ticketId", element: <CustomerTicketDetailPage /> },
              { path: "new", element: <CustomerNewTicketPage /> },
            ],
          },
        ],
      },

      {
        path: "agent",
        element: <RoleGuard allowedRoles={[ROLES.AGENT]} />,
        children: [
          {
            element: <AgentShellLayout />,
            children: [
              { index: true, element: <Navigate to="inbox" replace /> },
              { path: "inbox", element: <AgentInboxPage /> },
              { path: "worklog", element: <AgentWorklogSummaryPage /> },
              { path: "knowledge-base", element: <AgentKnowledgeBasePage /> },
            ],
          },
        ],
      },

      {
        path: "manager",
        element: <RoleGuard allowedRoles={[ROLES.MANAGER]} />,
        children: [
          {
            element: <ManagerShellLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: "dashboard", element: <ManagerRouteMatch /> },
              { path: "tickets/:ticketId", element: <ManagerRouteMatch /> },
              { path: "tickets", element: <ManagerRouteMatch /> },
              { path: "sla-monitor", element: <ManagerRouteMatch /> },
              { path: "team-workload", element: <ManagerRouteMatch /> },
              { path: "reports", element: <ManagerRouteMatch /> },
            ],
          },
        ],
      },

      {
        path: "admin",
        element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
        children: [
          {
            element: <AdminShellLayout />,
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              { path: "overview", element: <AdminRouteMatch /> },
              { path: "users", element: <AdminRouteMatch /> },
              { path: "products", element: <AdminRouteMatch /> },
            ],
          },
        ],
      },
    ],
  },

  { path: "*", element: <NotFoundPage /> },
]);

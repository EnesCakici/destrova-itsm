# Destrova Preview Migration Map

## Preview to future frontend mapping

- Agent workspace preview (`agent/preview/AgentWorkspaceSplit.jsx`) -> future replacement targets: old `pages/agent/AgentQueuePage.jsx` + `pages/agent/AgentTicketDetailPage.jsx`.
- Agent queue preview (`agent/preview/AgentQueuePreview.jsx`) -> future replacement target: old `pages/agent/AgentQueuePage.jsx`.
- Customer preview shell (`customer/preview/CustomerPreviewPage.jsx`) -> future replacement targets: old `pages/customer/CustomerMyTicketsPage.jsx` + `pages/customer/CustomerNewTicketPage.jsx`.
- Customer My Tickets view (`customer/components/CustomerMyTicketsView.jsx`) -> future replacement target: old `pages/customer/CustomerMyTicketsPage.jsx`.
- Customer New Ticket view (`customer/components/CustomerNewTicketView.jsx`) -> future replacement target: old `pages/customer/CustomerNewTicketPage.jsx`.
- Manager preview (`manager/preview/ManagerPreviewPage.jsx`) -> future replacement targets: old `pages/manager/ManagerDashboardPage.jsx` + `pages/manager/ManagerTicketsPage.jsx`.
- Admin preview (`admin/preview/AdminPreviewPage.jsx`) -> future replacement target: TBD (no dedicated old admin page yet).

## Shell vs role-specific boundaries

- Shared shell files:
  - `shell/AppShell.jsx`
  - `shell/roleConfig.js`
  - `shell/RoleSidebar.jsx`
  - `shell/RoleTopbar.jsx`
- Shared UI primitives:
  - `shared/DestrovaIcons.jsx`
  - `shared/EmptyState.jsx`
  - `shared/SectionCard.jsx`
  - `shared/StatusBadge.jsx`
  - `shared/PriorityBadge.jsx`
  - `shared/SearchField.jsx`
- Role-specific files:
  - `agent/**`
  - `customer/**`
  - `manager/**`
  - `admin/**`

## Logic status

- Preview-native logic already present:
  - Agent mock queue/list/detail behavior inside `agent/data` + `agent/components`.
  - Customer preview wiring for ticket listing, filtering, sorting, ticket creation, and attachment upload in `customer/preview/CustomerPreviewPage.jsx`.
- Mock-only logic that still needs real-data migration later:
  - All files under `agent/data/*` are mock-only preview data/model helpers.
  - Manager and admin preview pages are shell placeholders and intentionally lightweight.
- Customer logic migration state:
  - Existing production hooks/API usage is preserved and now orchestrated by `customer/preview/CustomerPreviewPage.jsx`.
  - `customer/components/*` are UI-only presentational layers intended to receive data/handlers from preview/page containers.

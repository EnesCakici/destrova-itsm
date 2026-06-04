import {
  IconBell,
  IconBook,
  IconCatalog,
  IconChart,
  IconClipboardList,
  IconClock,
  IconCog,
  IconCube,
  IconDocumentPlus,
  IconInbox,
  IconDashboard,
  IconOverview,
  IconPlus,
  IconQueue,
  IconReport,
  IconShield,
  IconShieldCheck,
  IconTicket,
  IconUserGroup,
  IconUsers,
  IconWorkflow,
  IconBolt,
} from "../shared/DestrovaIcons";

/** Semantic stroke icons for shell navigation (all roles) */
export const SHELL_ICON_MAP = {
  inbox: IconInbox,
  ticket: IconTicket,
  dashboard: IconDashboard,
  overview: IconOverview,
  /** @deprecated use dashboard */
  layoutDashboard: IconDashboard,
  clipboardList: IconClipboardList,
  clock: IconClock,
  shieldCheck: IconShieldCheck,
  userGroup: IconUserGroup,
  cube: IconCube,
  documentPlus: IconDocumentPlus,
  users: IconUsers,
  report: IconReport,
  chart: IconChart,
  catalog: IconCatalog,
  book: IconBook,
  cog: IconCog,
  plus: IconPlus,
  bell: IconBell,
  shield: IconShield,
  /** @deprecated use ticket */
  queue: IconTicket,
  /** @deprecated use userGroup */
  workflow: IconUserGroup,
  /** @deprecated use shieldCheck */
  bolt: IconShieldCheck,
  /** @deprecated use dashboard */
  chartDashboard: IconDashboard,
};

/**
 * Demo report payload — used only when GET /api/manager/reports fails (Faz 4).
 * Kept separate from managerMock so live reports code never imports preview data by accident.
 */

const DEMO_VOLUME = {
  created: 504,
  resolved: 488,
  deltaCreated: { dir: "up", text: "+12% vs prev. period" },
  deltaResolved: { dir: "up", text: "+9% vs prev. period" },
  series: [
    { week: "W14", created: 78, resolved: 71 },
    { week: "W15", created: 82, resolved: 79 },
    { week: "W16", created: 76, resolved: 78 },
    { week: "W17", created: 88, resolved: 84 },
    { week: "W18", created: 92, resolved: 90 },
    { week: "W19", created: 88, resolved: 86 },
  ],
};

const DEMO_PRODUCTS = [
  { name: "Network", tickets: 132, avgResolution: "5h 48m", slaMet: 91, deltaPct: 6 },
  { name: "Identity", tickets: 102, avgResolution: "4h 12m", slaMet: 95, deltaPct: 3 },
  { name: "Endpoint", tickets: 84, avgResolution: "7h 02m", slaMet: 84, deltaPct: -2 },
  { name: "Microsoft 365", tickets: 67, avgResolution: "3h 50m", slaMet: 96, deltaPct: 9 },
  { name: "Print", tickets: 41, avgResolution: "9h 15m", slaMet: 78, deltaPct: -11 },
  { name: "Other", tickets: 38, avgResolution: "6h 30m", slaMet: 88, deltaPct: 0 },
];

const DEMO_AGENTS = [
  { name: "Alex Mercer", role: "Senior agent", resolved: 87, avgResolution: "5h 12m", slaMet: 94, csat: 4.7 },
  { name: "Jordan Okonkwo", role: "Agent", resolved: 79, avgResolution: "6h 04m", slaMet: 88, csat: 4.5 },
  { name: "Samira Haddad", role: "Agent", resolved: 71, avgResolution: "5h 48m", slaMet: 92, csat: 4.6 },
  { name: "Sarah Park", role: "Senior agent", resolved: 64, avgResolution: "4h 56m", slaMet: 96, csat: 4.8 },
  { name: "Chris Nguyen", role: "Agent", resolved: 58, avgResolution: "7h 11m", slaMet: 86, csat: 4.4 },
  { name: "Priya Shah", role: "Agent · L1", resolved: 42, avgResolution: "8h 22m", slaMet: 82, csat: 4.3 },
  { name: "Morgan Ellis", role: "Agent · L1", resolved: 31, avgResolution: "9h 04m", slaMet: 79, csat: 4.2 },
  { name: "Elena Volkov", role: "Specialist", resolved: 25, avgResolution: "6h 40m", slaMet: 90, csat: 4.6 },
];

const DEMO_TREND = [
  { week: "W14", value: 7.2 },
  { week: "W15", value: 6.8 },
  { week: "W16", value: 6.4 },
  { week: "W17", value: 6.5 },
  { week: "W18", value: 6.1 },
  { week: "W19", value: 5.9 },
];

/** Normalized view shape — matches useManagerReportsData live payload. */
export function buildReportsMockFallback() {
  return {
    volume: {
      created: DEMO_VOLUME.created,
      resolved: DEMO_VOLUME.resolved,
      deltaCreated: DEMO_VOLUME.deltaCreated,
      deltaResolved: DEMO_VOLUME.deltaResolved,
      series: [...DEMO_VOLUME.series],
    },
    products: DEMO_PRODUCTS.map((p) => ({ ...p })),
    agents: DEMO_AGENTS.map((a) => ({ ...a })),
    resolutionTrend: DEMO_TREND.map((p) => ({ ...p })),
    highlights: [
      {
        id: "avgResolution",
        value: "6.1h",
        noteKey: "demoFallback",
      },
      {
        id: "slaCompliance",
        value: "91%",
        noteKey: "demoFallback",
      },
    ],
    isPeriodEmpty: false,
  };
}

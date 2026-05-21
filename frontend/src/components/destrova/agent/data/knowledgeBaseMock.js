/** Knowledge Base preview content (no API). */

export const KB_CATEGORIES = [
  {
    id: "it-support",
    title: "IT Support",
    description: "General help desk topics, outages, and service requests.",
  },
  {
    id: "access-permissions",
    title: "Access & Permissions",
    description: "Accounts, groups, SSO, MFA, and role changes.",
  },
  {
    id: "devices-infra",
    title: "Devices & Infrastructure",
    description: "Laptops, VPN, Wi‑Fi, printers, and connectivity.",
  },
  {
    id: "internal-tools",
    title: "Internal Tools",
    description: "Destrova workspace, integrations, and internal apps.",
  },
  {
    id: "requests-approvals",
    title: "Requests & Approvals",
    description: "Software access, hardware, and workflow approvals.",
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    description: "Diagnostics, error codes, and known issues.",
  },
];

export const KB_ARTICLES = [
  {
    id: "kb-101",
    categoryId: "access-permissions",
    title: "Reset your Destrova password",
    excerpt: "Use self-service reset or contact the help desk if SSO is enabled.",
    intro:
      "If you cannot sign in to Destrova, use the steps below. If your organization uses SSO, you may need to reset through your identity provider instead.",
    steps: [
      "Open the Destrova login page and select Forgot password.",
      "Enter your work email and submit the form. Check spam folders for the reset link.",
      "Choose a new password that meets your org policy (length and complexity).",
      "Sign in again. If MFA is required, complete the prompt on your authenticator app.",
    ],
    relatedIds: ["kb-102", "kb-201"],
  },
  {
    id: "kb-102",
    categoryId: "access-permissions",
    title: "Request access to an application",
    excerpt: "Submit a catalog request and track approval in your ticket.",
    intro:
      "Application access is granted through approved requests. This keeps access auditable and aligned with least privilege.",
    steps: [
      "In Destrova, open New request and pick the Application access template.",
      "Select the application, business reason, and manager if required by policy.",
      "Submit the request. You will receive ticket updates by email.",
      "When approved, access is provisioned automatically within the SLA shown on the ticket.",
    ],
    relatedIds: ["kb-101", "kb-501"],
  },
  {
    id: "kb-201",
    categoryId: "devices-infra",
    title: "Connect to VPN on Windows",
    excerpt: "Install the client, import your profile, and verify split tunnel settings.",
    intro:
      "Corporate VPN allows secure access to internal systems. Follow your IT pack if names differ slightly from this guide.",
    steps: [
      "Install the approved VPN client from the software portal.",
      "Import the profile file or sign in with your corporate credentials when prompted.",
      "Connect and wait until status shows Connected.",
      "If internal sites fail to load, disconnect, wait 30 seconds, and reconnect.",
    ],
    relatedIds: ["kb-202", "kb-301"],
  },
  {
    id: "kb-202",
    categoryId: "devices-infra",
    title: "Wi‑Fi drops on corporate network",
    excerpt: "Quick checks before opening a connectivity ticket.",
    intro:
      "Intermittent Wi‑Fi is often environmental or driver-related. Run through these checks to save time.",
    steps: [
      "Confirm other devices on the same SSID lose connection. If only yours fails, update wireless drivers.",
      "Forget the network, rejoin with current credentials, and disable any third-party VPN temporarily.",
      "Run a short ping test to an internal host; capture results if you need to escalate.",
      "If the issue persists across locations, open a ticket with building and approximate times.",
    ],
    relatedIds: ["kb-201", "kb-601"],
  },
  {
    id: "kb-301",
    categoryId: "internal-tools",
    title: "Use global search in the agent workspace",
    excerpt: "Search tickets across views without leaving your current page.",
    intro:
      "Global search helps agents find tickets quickly when only partial information is known.",
    steps: [
      "Click the search field in the top bar or use the keyboard shortcut your admin configured.",
      "Type a ticket ID, customer name, or keyword from the subject.",
      "Select a result to open the ticket in context.",
      "Clear the field or press Escape to dismiss results.",
    ],
    relatedIds: ["kb-302", "kb-401"],
  },
  {
    id: "kb-302",
    categoryId: "internal-tools",
    title: "Internal notes vs customer-visible replies",
    excerpt: "When to use each channel and how visibility is enforced.",
    intro:
      "Destrova separates internal collaboration from customer-facing communication. Using the right mode avoids accidental disclosure.",
    steps: [
      "Use Reply for anything the requester should see on the portal and email thread.",
      "Use Internal note for team coordination, handoffs, and sensitive context.",
      "Use Worklog for time and activity that should appear in reporting.",
      "Review the preview panel before sending if attachments are included.",
    ],
    relatedIds: ["kb-301", "kb-501"],
  },
  {
    id: "kb-401",
    categoryId: "requests-approvals",
    title: "Hardware refresh approval flow",
    excerpt: "Who approves, what to attach, and expected timelines.",
    intro:
      "Hardware requests route to finance and your line manager depending on cost thresholds.",
    steps: [
      "Open New request → Hardware and choose the device class.",
      "Attach a quote or standard catalog line item if required.",
      "Submit; approvers are notified in order. You can comment on the ticket while waiting.",
      "After approval, procurement creates a fulfillment task and updates the ticket.",
    ],
    relatedIds: ["kb-102", "kb-501"],
  },
  {
    id: "kb-501",
    categoryId: "troubleshooting",
    title: "Ticket shows “Waiting for Customer” but they replied",
    excerpt: "Sync delays, wrong email thread, and how to verify.",
    intro:
      "Status mismatches usually come from email ingestion or merged threads. Verify before changing status manually.",
    steps: [
      "Open the Audit log on the ticket and confirm the inbound event timestamp.",
      "Check whether the reply came from the same email as the requester on the ticket.",
      "If the message landed on a duplicate ticket, link tickets and close or merge per policy.",
      "If ingestion is delayed, wait one SLA check cycle or reprocess from the mail admin tool if you have access.",
    ],
    relatedIds: ["kb-302", "kb-601"],
  },
  {
    id: "kb-601",
    categoryId: "it-support",
    title: "Report a service outage",
    excerpt: "When to open a P1 incident vs a standard ticket.",
    intro:
      "Widespread impact should be escalated quickly so communications and resolver groups align.",
    steps: [
      "Confirm scope: multiple users or a critical business function affected?",
      "Open an Incident (or use the outage quick path) with start time and blast radius.",
      "Subscribe stakeholders to the incident ticket and post updates on a regular cadence.",
      "When service is restored, record root cause and link problem records if applicable.",
    ],
    relatedIds: ["kb-501", "kb-202"],
  },
];

export function kbCategoryById(id) {
  return KB_CATEGORIES.find((c) => c.id === id);
}

export function kbArticleById(id) {
  return KB_ARTICLES.find((a) => a.id === id);
}

export function kbRelatedArticles(article) {
  if (!article?.relatedIds?.length) return [];
  return article.relatedIds.map((rid) => kbArticleById(rid)).filter(Boolean);
}

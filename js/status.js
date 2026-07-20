// js/status.js
//
// All possible statuses, their colors, and their sort priority.
// Single source of truth for status logic in the app.

export const STATUS = {
  REPLIED: "Replied",                   // purple — highest priority
  NEED_REEDIT: "Need Re-edit",          // bright cyan — blocks outreach until the edit is ready
  NEED_FIRST_EMAIL: "Need First Email", // red
  NEED_SOCIAL_DM: "Need Social DM",     // blue
  FOLLOW_UP_DUE: "Follow-up Due",       // orange
  WAITING: "Waiting",                   // orange (waiting for next follow-up)
  CLIENT: "Client",                     // green
  CLOSED: "Closed",                     // gray
};

// Statuses that stop the workflow entirely — the app will not
// silently overwrite them just because a date passed.
export const TERMINAL_STATUSES = [STATUS.REPLIED, STATUS.CLIENT, STATUS.CLOSED];

export const STATUS_COLORS = {
  [STATUS.REPLIED]: "#a855f7",          // purple
  [STATUS.NEED_REEDIT]: "#22e5ee",      // bright cyan
  [STATUS.NEED_FIRST_EMAIL]: "#ef4444", // red
  [STATUS.NEED_SOCIAL_DM]: "#3b82f6",   // blue
  [STATUS.FOLLOW_UP_DUE]: "#f97316",    // orange
  [STATUS.WAITING]: "#f97316",          // orange
  [STATUS.CLIENT]: "#22c55e",           // green
  [STATUS.CLOSED]: "#6b7280",           // gray
};

// Priority order: Replies > Need Re-edit > Need First Email > Need Social DM >
// Follow-up Due > Waiting > Client > Closed.
export const SORT_PRIORITY = [
  STATUS.REPLIED,
  STATUS.NEED_REEDIT,
  STATUS.NEED_FIRST_EMAIL,
  STATUS.NEED_SOCIAL_DM,
  STATUS.FOLLOW_UP_DUE,
  STATUS.WAITING,
  STATUS.CLIENT,
  STATUS.CLOSED,
];

export function sortRank(status) {
  const idx = SORT_PRIORITY.indexOf(status);
  return idx === -1 ? SORT_PRIORITY.length : idx;
}

/**
 * Computes the *display* status for a creator row based on the current time.
 * Only terminal states (Replied / Client / Closed) are ever persisted as
 * "final" — everything else is derived live from current_step / dates /
 * need_reedit so the table is always correct without a daily cron job.
 */
export function computeDisplayStatus(row, nowMs) {
  if (TERMINAL_STATUSES.includes(row.status)) return row.status;

  if (row.need_reedit) {
    return STATUS.NEED_REEDIT;
  }

  if (row.current_step === "social_dm" && !row.social_dm_sent_at) {
    // Follow-up #1 schedules this step immediately, but the creator should
    // sit in "Waiting" until that delay actually elapses — Need Social DM
    // must never appear the instant Follow-up #1 is sent.
    if (row.next_action_at && new Date(row.next_action_at).getTime() > nowMs) {
      return STATUS.WAITING;
    }
    return STATUS.NEED_SOCIAL_DM;
  }

  if (!row.first_email_at) {
    return STATUS.NEED_FIRST_EMAIL;
  }

  if (row.next_action_at && new Date(row.next_action_at).getTime() <= nowMs) {
    return STATUS.FOLLOW_UP_DUE;
  }

  return STATUS.WAITING;
}

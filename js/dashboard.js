// js/dashboard.js
import { fetchAllCreators, fetchRecentEvents, fetchNotifications } from "./supabase-client.js";
import { computeDisplayStatus, STATUS, STATUS_COLORS } from "./status.js";
import { isToday, formatDateTime, relativeLabel } from "./dates.js";
import { mountNav } from "./nav.js";
import { mountNotificationBell } from "./notifications.js";
import { showToast, escapeHtml } from "./ui.js";
import { stepDef } from "./sequence.js";

mountNav();
mountNotificationBell();

async function init() {
  const statGrid = document.getElementById("stat-grid");
  const previewWrap = document.getElementById("preview-wrap");

  let creators = [];
  try {
    creators = await fetchAllCreators();
  } catch (err) {
    console.error(err);
    showToast("Failed to load creators: " + err.message, { isError: true });
    previewWrap.innerHTML = `<div class="empty-state"><div class="big">Couldn't load data</div>${escapeHtml(
      err.message
    )}</div>`;
    return;
  }

  const now = Date.now();
  const withStatus = creators.map((c) => ({ ...c, displayStatus: computeDisplayStatus(c, now) }));

  renderStats(statGrid, withStatus);
  renderProgress(withStatus);
  renderUpcoming(withStatus);
  renderNeedsAction(previewWrap, withStatus);
  renderNotifCard();
  renderActivity();
}

function renderStats(statGrid, withStatus) {
  const count = (status) => withStatus.filter((c) => c.displayStatus === status).length;

  const stats = [
    { label: "Total Creators", value: withStatus.length },
    { label: "Need Re-edit", value: count(STATUS.NEED_REEDIT) },
    { label: "Need First Email", value: count(STATUS.NEED_FIRST_EMAIL) },
    { label: "Need Social DM", value: count(STATUS.NEED_SOCIAL_DM) },
    { label: "Follow-up Due", value: count(STATUS.FOLLOW_UP_DUE) },
    { label: "Waiting", value: count(STATUS.WAITING) },
    { label: "Replies", value: count(STATUS.REPLIED) },
    { label: "Clients", value: count(STATUS.CLIENT) },
    { label: "Closed", value: count(STATUS.CLOSED) },
  ];

  statGrid.innerHTML = stats
    .map(
      (s) => `
      <div class="stat-card">
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>`
    )
    .join("");
}

function renderProgress(withStatus) {
  const el = document.getElementById("progress-block");

  const dueToday = withStatus.filter((c) =>
    [STATUS.NEED_FIRST_EMAIL, STATUS.NEED_SOCIAL_DM, STATUS.FOLLOW_UP_DUE].includes(c.displayStatus)
  );
  const completedToday = withStatus.filter(
    (c) => isToday(c.last_contact_at) || isToday(c.social_dm_sent_at) || isToday(c.first_email_at)
  );
  const total = dueToday.length + completedToday.length;
  const pct = total === 0 ? 100 : Math.round((completedToday.length / total) * 100);

  el.innerHTML = `
    <div class="progress-line">
      <strong>${completedToday.length} / ${total}</strong>
      <span class="text-muted">Tasks Completed Today</span>
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
  `;
}

function renderUpcoming(withStatus) {
  const el = document.getElementById("upcoming-block");
  const upcoming = withStatus
    .filter((c) => c.next_action_at && c.displayStatus === STATUS.WAITING)
    .sort((a, b) => a.next_action_at.localeCompare(b.next_action_at))
    .slice(0, 6);

  if (upcoming.length === 0) {
    el.innerHTML = `<div class="text-muted" style="font-size:12.5px">Nothing scheduled.</div>`;
    return;
  }

  el.innerHTML = upcoming
    .map(
      (c) => `
    <div class="mini-row">
      <span>${escapeHtml(c.creator_name)}</span>
      <span class="text-muted">${escapeHtml(stepDef(c.current_step).label)} · ${relativeLabel(c.next_action_at)}</span>
    </div>`
    )
    .join("");
}

function renderNeedsAction(previewWrap, withStatus) {
  const rows = withStatus
    .filter((c) =>
      [
        STATUS.REPLIED,
        STATUS.NEED_REEDIT,
        STATUS.NEED_FIRST_EMAIL,
        STATUS.NEED_SOCIAL_DM,
        STATUS.FOLLOW_UP_DUE,
      ].includes(c.displayStatus)
    )
    .slice(0, 10);

  if (rows.length === 0) {
    previewWrap.innerHTML = `
      <div class="empty-state">
        <div class="big">Nothing needs action right now 🎉</div>
        <a class="btn btn-primary" style="margin-top:12px" href="research.html">Start a research session</a>
      </div>`;
    return;
  }

  previewWrap.innerHTML = `
    <table>
      <thead>
        <tr><th>Creator</th><th>Platform</th><th>Current Step</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (c) => `
          <tr>
            <td><a href="outreach.html?creator=${c.id}">${escapeHtml(c.creator_name)}</a></td>
            <td>${escapeHtml(c.platform || "—")}</td>
            <td>${escapeHtml(stepDef(c.current_step).label)}</td>
            <td><span class="badge" style="background:${STATUS_COLORS[c.displayStatus]}">${c.displayStatus}</span></td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

async function renderNotifCard() {
  const el = document.getElementById("notif-card-block");
  try {
    const notifs = (await fetchNotifications()).slice(0, 5);
    if (notifs.length === 0) {
      el.innerHTML = `<div class="text-muted" style="font-size:12.5px">No notifications yet.</div>`;
      return;
    }
    el.innerHTML = notifs
      .map(
        (n) => `
      <div class="mini-row">
        <span>${escapeHtml(n.message)}</span>
        <span class="text-muted">${formatDateTime(n.created_at)}</span>
      </div>`
      )
      .join("");
  } catch (err) {
    el.innerHTML = `<div class="text-muted" style="font-size:12.5px">Couldn't load notifications.</div>`;
  }
}

async function renderActivity() {
  const el = document.getElementById("activity-block");
  try {
    const events = await fetchRecentEvents(8);
    if (events.length === 0) {
      el.innerHTML = `<div class="text-muted" style="font-size:12.5px">No activity yet.</div>`;
      return;
    }
    el.innerHTML = events
      .map(
        (e) => `
      <div class="mini-row">
        <span>${escapeHtml(e.creators?.creator_name || "Unknown")} — ${escapeHtml(e.label)}</span>
        <span class="text-muted">${formatDateTime(e.created_at)}</span>
      </div>`
      )
      .join("");
  } catch (err) {
    el.innerHTML = `<div class="text-muted" style="font-size:12.5px">Couldn't load activity.</div>`;
  }
}

init();

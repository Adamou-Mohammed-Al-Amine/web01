// js/outreach.js
import {
  fetchAllCreators,
  updateCreator,
  deleteCreator,
  addEvent,
  fetchEvents,
  createNotification,
  fetchSettings,
} from "./supabase-client.js";
import { nextStepKey, isLastStep, delayForStep, stepDef } from "./sequence.js";
import { STATUS, STATUS_COLORS, sortRank, computeDisplayStatus } from "./status.js";
import { nowIso, addHours, formatDateTime, relativeLabel } from "./dates.js";
import { mountNav } from "./nav.js";
import { mountNotificationBell } from "./notifications.js";
import { showToast, escapeHtml, openModal, closeModal, openDrawer, closeDrawer } from "./ui.js";
import { loadFollowupLibrary, pickRandomFollowup, renderFollowupBody } from "./followups.js";
import { openGmailCompose, replySubject } from "./gmail.js";
import { avatarHtml } from "./avatar.js";

mountNav();
mountNotificationBell();

const tbody = document.getElementById("outreach-body");
const emptyState = document.getElementById("outreach-empty");
const searchCreatorInput = document.getElementById("search-creator");
const filterPlatformSelect = document.getElementById("filter-platform");
const filterPrioritySelect = document.getElementById("filter-priority");
const filterChips = document.querySelectorAll(".filter-chip");

let creators = [];
let activeFilter = "all";
let settings = null;
let followupLibrary = [];
// Transient client-side state: creatorId -> { kind: 'first_email'|'followup', followup }
// Tracks "compose opened, waiting for I Sent It" without persisting to the DB.
const pendingSend = new Map();

async function boot() {
  try {
    [settings, followupLibrary] = await Promise.all([
      fetchSettings().catch(() => null),
      loadFollowupLibrary().catch(() => []),
    ]);
  } catch (err) {
    console.error(err);
  }
  await loadCreators();

  const params = new URLSearchParams(window.location.search);
  const focusId = params.get("creator");
  if (focusId) {
    const row = creators.find((c) => c.id === focusId);
    if (row) openDetailPanel(row);
  }
}

async function loadCreators() {
  try {
    creators = await fetchAllCreators();
  } catch (err) {
    console.error(err);
    showToast("Failed to load creators: " + err.message, { isError: true });
    creators = [];
  }
  populatePlatformFilter();
  render();
}

function populatePlatformFilter() {
  const current = filterPlatformSelect.value;
  const platforms = [...new Set(creators.map((c) => c.platform).filter(Boolean))].sort();
  filterPlatformSelect.innerHTML =
    `<option value="">All platforms</option>` +
    platforms.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
  filterPlatformSelect.value = current;
}

function withDisplayStatus(rows) {
  const now = Date.now();
  return rows.map((c) => ({ ...c, displayStatus: computeDisplayStatus(c, now) }));
}

function applyFilters(rows) {
  const creatorQuery = searchCreatorInput.value.trim().toLowerCase();
  const platform = filterPlatformSelect.value;
  const priority = filterPrioritySelect.value;

  return rows.filter((c) => {
    if (creatorQuery && !(c.creator_name || "").toLowerCase().includes(creatorQuery)) return false;
    if (platform && c.platform !== platform) return false;
    if (priority && c.priority !== priority) return false;

    switch (activeFilter) {
      case "replied":
        return c.displayStatus === STATUS.REPLIED;
      case "need-reedit":
        return c.displayStatus === STATUS.NEED_REEDIT;
      case "need-first":
        return c.displayStatus === STATUS.NEED_FIRST_EMAIL;
      case "need-social":
        return c.displayStatus === STATUS.NEED_SOCIAL_DM;
      case "due":
        return c.displayStatus === STATUS.FOLLOW_UP_DUE;
      case "waiting":
        return c.displayStatus === STATUS.WAITING;
      case "client":
        return c.displayStatus === STATUS.CLIENT;
      case "closed":
        return c.displayStatus === STATUS.CLOSED;
      default:
        return true;
    }
  });
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const rankDiff = sortRank(a.displayStatus) - sortRank(b.displayStatus);
    if (rankDiff !== 0) return rankDiff;
    const aDate = a.next_action_at || "9999";
    const bDate = b.next_action_at || "9999";
    return aDate.localeCompare(bDate);
  });
}

function priorityBadge(priority) {
  const cls = { High: "priority-high", Medium: "priority-medium", Low: "priority-low" }[priority] || "priority-medium";
  return `<span class="priority-pill ${cls}">${escapeHtml(priority || "Medium")}</span>`;
}

function actionButtonsHtml(row) {
  const pending = pendingSend.get(row.id);
  const step = stepDef(row.current_step);

  if (row.displayStatus === STATUS.NEED_REEDIT) {
    return `<span class="text-muted" style="font-size:12.5px">Open creator → Re-edit Ready</span>`;
  }

  if (row.displayStatus === STATUS.NEED_SOCIAL_DM) {
    return `<button class="btn btn-primary btn-sm act-social-dm">Social DM Sent</button>`;
  }

  if (pending) {
    const label = pending.kind === "first_email" ? "Send First Email" : "Send Follow-up";
    return `
      <div class="btn-row">
        <button class="btn btn-sm act-resend" disabled>${label} (opened)</button>
        <button class="btn btn-primary btn-sm act-confirm-sent">I Sent It</button>
      </div>`;
  }

  if (row.displayStatus === STATUS.NEED_FIRST_EMAIL) {
    return `<button class="btn btn-primary btn-sm act-send-first">Send First Email</button>`;
  }

  if (row.displayStatus === STATUS.FOLLOW_UP_DUE) {
    return `<button class="btn btn-primary btn-sm act-send-followup">Send Follow-up</button>`;
  }

  if (row.displayStatus === STATUS.WAITING) {
    return `<span class="text-muted" style="font-size:12.5px">Waiting — ${escapeHtml(step.label)}</span>`;
  }

  return `<span class="text-muted" style="font-size:12.5px">—</span>`;
}

function render() {
  const rows = sortRows(applyFilters(withDisplayStatus(creators)));

  if (rows.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  tbody.innerHTML = rows
    .map((row) => {
      const color = STATUS_COLORS[row.displayStatus];
      return `
    <tr data-id="${row.id}" class="status-row" style="--row-color:${color}">
      <td class="creator-name-cell" data-action="open">
        <span class="creator-name-flex">
          ${avatarHtml(row.creator_name, row.channel_link, "avatar-sm")}
          <span class="creator-name-text">${escapeHtml(row.creator_name)}</span>
        </span>
      </td>
      <td>${escapeHtml(row.platform || "—")}</td>
      <td>${priorityBadge(row.priority)}</td>
      <td>${escapeHtml(stepDef(row.current_step).label)}</td>
      <td><span class="badge" style="background:${color}"><span class="dot${row.displayStatus === STATUS.NEED_REEDIT ? " blink-dot" : ""}"></span>${row.displayStatus}</span></td>
      <td>${row.next_action_at ? `${relativeLabel(row.next_action_at)}` : "—"}</td>
      <td class="actions-cell">${actionButtonsHtml(row)}</td>
    </tr>`;
    })
    .join("");

  rows.forEach((row) => {
    const tr = tbody.querySelector(`tr[data-id="${row.id}"]`);
    tr.querySelector('[data-action="open"]').addEventListener("click", () => openDetailPanel(row));
    tr.querySelector(".act-social-dm")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleSocialDmSent(row);
    });
    tr.querySelector(".act-send-first")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleSendFirstEmail(row);
    });
    tr.querySelector(".act-send-followup")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleSendFollowupPreview(row);
    });
    tr.querySelector(".act-confirm-sent")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleConfirmSent(row);
    });
  });
}

async function applyUpdate(row, updates) {
  const updated = await updateCreator(row.id, updates);
  creators = creators.map((c) => (c.id === row.id ? updated : c));
  return updated;
}

// ---- First email --------------------------------------------------------

function handleSendFirstEmail(row) {
  if (!row.email) {
    showToast("No email on file — use Social DM instead.", { isError: true });
    return;
  }
  openGmailCompose({
    to: row.email,
    subject: row.subject || `Quick note about your latest video`,
    body: row.custom_first_email || "",
  });
  pendingSend.set(row.id, { kind: "first_email" });
  render();
}

// ---- Follow-ups ----------------------------------------------------------

function handleSendFollowupPreview(row) {
  if (followupLibrary.length === 0) {
    showToast("No follow-up messages found in data/followups.json", { isError: true });
    return;
  }
  showFollowupModal(row, pickRandomFollowup(followupLibrary, row.used_followups || []));
}

function showFollowupModal(row, followup) {
  const body = renderFollowupBody(followup.body, {
    name: row.creator_name,
    signature: settings?.email_signature || "",
  });

  openModal(
    `
    <h3 style="margin-top:0">Follow-up preview</h3>
    <p class="text-muted" style="font-size:12.5px">To: ${escapeHtml(row.email || "—")}</p>
    <textarea class="cell-textarea" id="followup-preview-body" style="width:100%;min-height:180px">${escapeHtml(body)}</textarea>
    <div class="btn-row" style="margin-top:16px;justify-content:flex-end">
      <button class="btn" id="modal-choose-another">Choose Another</button>
      <button class="btn btn-primary" id="modal-send">Send</button>
    </div>`,
    { className: "followup-modal" }
  );

  document.getElementById("modal-choose-another").addEventListener("click", () => {
    showFollowupModal(row, pickRandomFollowup(followupLibrary, [...(row.used_followups || []), followup.id]));
  });

  document.getElementById("modal-send").addEventListener("click", () => {
    const finalBody = document.getElementById("followup-preview-body").value;
    openGmailCompose({
      to: row.email,
      subject: replySubject(row.subject || row.creator_name),
      body: finalBody,
    });
    pendingSend.set(row.id, { kind: "followup", followupId: followup.id });
    closeModal();
    render();
  });
}

// ---- Confirm sent (shared by first email + follow-ups) -------------------

async function handleConfirmSent(row) {
  const pending = pendingSend.get(row.id);
  if (!pending) return;

  const currentStep = row.current_step;
  const done = isLastStep(currentStep);
  const delayHours = delayForStep(currentStep, settings?.followup_delays);
  const now = nowIso();

  const updates = {
    current_step: done ? currentStep : nextStepKey(currentStep),
    last_contact_at: now,
    next_action_at: done ? null : addHours(now, delayHours),
    follow_up_count: (row.follow_up_count || 0) + 1,
  };

  if (pending.kind === "first_email") {
    updates.first_email_at = now;
  }
  if (pending.kind === "followup" && pending.followupId) {
    updates.used_followups = [...(row.used_followups || []), pending.followupId];
  }

  try {
    await applyUpdate(row, updates);
    await addEvent(
      row.id,
      pending.kind === "first_email" ? "first_email_sent" : "followup_sent",
      pending.kind === "first_email" ? "First email sent" : `Follow-up sent (${stepDef(currentStep).label})`
    );
    pendingSend.delete(row.id);
    showToast(done ? "Final follow-up logged." : "Marked as sent — next action scheduled.");
    render();
  } catch (err) {
    console.error(err);
    showToast("Update failed: " + err.message, { isError: true });
  }
}

// ---- Social DM -------------------------------------------------------------

async function handleSocialDmSent(row) {
  const now = nowIso();
  const nextStep = nextStepKey(row.current_step);
  const delayHours = delayForStep(row.current_step, settings?.followup_delays);

  try {
    await applyUpdate(row, {
      social_dm_sent_at: now,
      current_step: nextStep,
      last_contact_at: now,
      next_action_at: addHours(now, delayHours),
      follow_up_count: (row.follow_up_count || 0) + 1,
    });
    await addEvent(row.id, "social_dm_sent", "Social DM sent");
    showToast("Social DM logged.");
    render();
  } catch (err) {
    console.error(err);
    showToast("Update failed: " + err.message, { isError: true });
  }
}

// ---- Re-edit ready ---------------------------------------------------------

async function handleReeditReady(row) {
  try {
    await applyUpdate(row, { need_reedit: false });
    await addEvent(row.id, "reedit_completed", "Re-edit completed");
    showToast("Re-edit marked ready — moved to Need First Email.");
    render();
    closeDrawer();
  } catch (err) {
    console.error(err);
    showToast("Update failed: " + err.message, { isError: true });
  }
}

// ---- Terminal actions (replied / client / closed) -------------------------

async function handleMarkReplied(row) {
  try {
    await applyUpdate(row, { status: STATUS.REPLIED, replied_at: nowIso(), next_action_at: null });
    await addEvent(row.id, "replied", "Client replied");
    await createNotification(row.id, "reply", `${row.creator_name} replied!`);
    showToast("Marked as replied.");
    render();
    closeDrawer();
  } catch (err) {
    showToast("Update failed: " + err.message, { isError: true });
  }
}

async function handleConvertClient(row) {
  try {
    await applyUpdate(row, { status: STATUS.CLIENT, client_at: nowIso() });
    await addEvent(row.id, "client", "Converted to client");
    showToast("Converted to client 🎉");
    render();
    closeDrawer();
  } catch (err) {
    showToast("Update failed: " + err.message, { isError: true });
  }
}

async function handleClose(row) {
  try {
    await applyUpdate(row, { status: STATUS.CLOSED, closed_at: nowIso() });
    await addEvent(row.id, "closed", "Conversation closed");
    showToast("Closed.");
    render();
    closeDrawer();
  } catch (err) {
    showToast("Update failed: " + err.message, { isError: true });
  }
}

async function handleDelete(row) {
  if (!confirm(`Delete ${row.creator_name}? This cannot be undone.`)) return;
  try {
    await deleteCreator(row.id);
    creators = creators.filter((c) => c.id !== row.id);
    showToast("Deleted.");
    render();
    closeDrawer();
  } catch (err) {
    showToast("Delete failed: " + err.message, { isError: true });
  }
}

// ---- Side panel -------------------------------------------------------------

function linkRow(label, url) {
  if (!url) return "";
  return `<div class="detail-row"><span>${label}</span><a href="${escapeHtml(url)}" target="_blank" rel="noopener">Open ↗</a></div>`;
}

async function openDetailPanel(row) {
  let events = [];
  try {
    events = await fetchEvents(row.id);
  } catch (err) {
    console.error(err);
  }

  const timelineHtml = events.length
    ? events
        .map((e) => `<div class="timeline-item"><span>${escapeHtml(e.label)}</span><small>${formatDateTime(e.created_at)}</small></div>`)
        .join("")
    : `<div class="text-muted" style="font-size:12.5px">No events yet.</div>`;

  const displayStatus = computeDisplayStatus(row, Date.now());
  const needsReedit = displayStatus === STATUS.NEED_REEDIT;

  openDrawer(`
    <div class="drawer-header">
      <div class="drawer-header-info">
        ${avatarHtml(row.creator_name, row.channel_link, "avatar-lg")}
        <div>
          <h2 style="margin:0">${escapeHtml(row.creator_name)}</h2>
          ${priorityBadge(row.priority)}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" id="drawer-close">✕</button>
    </div>

    <div class="drawer-section">
      <span class="badge" style="background:${STATUS_COLORS[displayStatus]}"><span class="dot${needsReedit ? " blink-dot" : ""}"></span>${displayStatus}</span>
      <span class="text-muted" style="margin-left:8px;font-size:12.5px">Step: ${escapeHtml(stepDef(row.current_step).label)} · Follow-ups sent: ${row.follow_up_count || 0}</span>
      ${needsReedit ? `<div style="margin-top:12px"><button class="btn btn-primary btn-sm" id="drawer-reedit-ready">Re-edit Ready</button></div>` : ""}
    </div>

    <div class="drawer-section">
      <h4>Links</h4>
      ${linkRow("Channel", row.channel_link)}
      ${linkRow("Instagram", row.instagram)}
      ${linkRow("X", row.x_handle)}
      ${linkRow("Original video", row.original_video)}
      ${linkRow("My re-edit", row.my_reedit_link)}
      <div class="detail-row"><span>Email</span><span>${escapeHtml(row.email || "—")}</span></div>
      <div class="detail-row"><span>Platform</span><span>${escapeHtml(row.platform || "—")}</span></div>
    </div>

    <div class="drawer-section">
      <h4>Problem found</h4>
      <p class="text-muted">${escapeHtml(row.problem_found || "—")}</p>
      <h4>Notes</h4>
      <p class="text-muted">${escapeHtml(row.notes || "—")}</p>
    </div>

    <div class="drawer-section">
      <h4>Timeline</h4>
      <div class="timeline">${timelineHtml}</div>
    </div>

    <div class="drawer-section btn-row" style="flex-wrap:wrap">
      <button class="btn btn-sm" id="drawer-replied">Mark Replied</button>
      <button class="btn btn-sm" id="drawer-client">Convert To Client</button>
      <button class="btn btn-sm" id="drawer-close-convo">Close Conversation</button>
      <button class="btn btn-danger btn-sm" id="drawer-delete">Delete</button>
    </div>
  `);

  document.getElementById("drawer-close").addEventListener("click", closeDrawer);
  document.getElementById("drawer-replied").addEventListener("click", () => handleMarkReplied(row));
  document.getElementById("drawer-client").addEventListener("click", () => handleConvertClient(row));
  document.getElementById("drawer-close-convo").addEventListener("click", () => handleClose(row));
  document.getElementById("drawer-delete").addEventListener("click", () => handleDelete(row));
  document.getElementById("drawer-reedit-ready")?.addEventListener("click", () => handleReeditReady(row));
}

// ---- Filters & search ---------------------------------------------------

filterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    filterChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.dataset.filter;
    render();
  });
});

searchCreatorInput.addEventListener("input", render);
filterPlatformSelect.addEventListener("change", render);
filterPrioritySelect.addEventListener("change", render);

boot();

// js/notifications.js
//
// Top-right notification bell + dropdown, mounted on every page. Replies
// always create a notification (highest priority in this app). Clicking a
// notification opens that creator on the Outreach page.

import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./supabase-client.js";
import { formatDateTime } from "./dates.js";
import { escapeHtml } from "./ui.js";

let root = null;
let notifications = [];

export async function mountNotificationBell() {
  root = document.createElement("div");
  root.className = "notif-root";
  root.innerHTML = `
    <button class="notif-bell" id="notif-bell-btn" aria-label="Notifications">
      🔔
      <span class="notif-count" id="notif-count" hidden>0</span>
    </button>
    <div class="notif-panel" id="notif-panel" hidden>
      <div class="notif-panel-header">
        <span>Notifications</span>
        <button class="btn btn-ghost btn-sm" id="notif-mark-all">Mark all read</button>
      </div>
      <div class="notif-list" id="notif-list"></div>
    </div>`;
  document.body.appendChild(root);

  const bellBtn = root.querySelector("#notif-bell-btn");
  const panel = root.querySelector("#notif-panel");
  const markAllBtn = root.querySelector("#notif-mark-all");

  bellBtn.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
  });

  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) panel.hidden = true;
  });

  markAllBtn.addEventListener("click", async () => {
    await markAllNotificationsRead();
    await refresh();
  });

  await refresh();
  // Light polling so replies surface without a manual page reload.
  setInterval(refresh, 30000);
}

async function refresh() {
  try {
    notifications = await fetchNotifications();
  } catch (err) {
    console.error("Failed to load notifications", err);
    return;
  }
  render();
}

function render() {
  if (!root) return;
  const unread = notifications.filter((n) => !n.read);
  const countEl = root.querySelector("#notif-count");
  const bellBtn = root.querySelector("#notif-bell-btn");
  const list = root.querySelector("#notif-list");

  if (unread.length > 0) {
    countEl.hidden = false;
    countEl.textContent = String(unread.length);
    bellBtn.classList.add("has-unread");
  } else {
    countEl.hidden = true;
    bellBtn.classList.remove("has-unread");
  }

  if (notifications.length === 0) {
    list.innerHTML = `<div class="notif-empty">Nothing yet — replies will show up here.</div>`;
    return;
  }

  list.innerHTML = notifications
    .map(
      (n) => `
      <button class="notif-item ${n.read ? "" : "unread"}" data-id="${n.id}" data-creator="${
        n.creator_id || ""
      }">
        <div class="notif-item-msg">${escapeHtml(n.message)}</div>
        <div class="notif-item-date">${formatDateTime(n.created_at)}</div>
      </button>`
    )
    .join("");

  list.querySelectorAll(".notif-item").forEach((item) => {
    item.addEventListener("click", async () => {
      const id = item.dataset.id;
      const creatorId = item.dataset.creator;
      await markNotificationRead(id);
      if (creatorId) {
        window.location.href = `outreach.html?creator=${creatorId}`;
      } else {
        await refresh();
      }
    });
  });
}

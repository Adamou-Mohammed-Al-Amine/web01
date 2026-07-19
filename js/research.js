// js/research.js
import { insertCreators, fetchCreatorNames, addEvent } from "./supabase-client.js";
import { mountNav } from "./nav.js";
import { mountNotificationBell } from "./notifications.js";
import { showToast } from "./ui.js";

mountNav();
mountNotificationBell();

const container = document.getElementById("research-body");
const btnAddRow = document.getElementById("btn-add-row");
const btnAddRowBottom = document.getElementById("btn-add-row-bottom");
const btnFinish = document.getElementById("btn-finish");

// Link fields get an icon + a placeholder that shows the expected format.
// `conditional: true` fields are only shown when Need Re-edit = Yes, but
// their values are never cleared when hidden (see toggleConditionalFields).
const LINK_FIELDS = [
  { key: "channel_link", icon: "📺", label: "Channel", placeholder: "https://youtube.com/@creator" },
  { key: "instagram", icon: "📷", label: "Instagram", placeholder: "@username" },
  { key: "x_handle", icon: "❌", label: "X", placeholder: "@username" },
  { key: "email", icon: "📧", label: "Email", placeholder: "name@email.com" },
  { key: "original_video", icon: "🎥", label: "Original Video", placeholder: "https://...", conditional: true },
  { key: "my_reedit_link", icon: "✂️", label: "My Re-edit", placeholder: "https://...", conditional: true },
];

const TEXT_FIELDS = ["creator_name", "platform", "problem_found", "notes"];

let rowCount = 0;
let existingNamesLower = [];

async function init() {
  try {
    existingNamesLower = await fetchCreatorNames();
  } catch (err) {
    console.error(err);
  }
  addCard();
  addCard();
}

function addCard() {
  rowCount += 1;
  const card = document.createElement("div");
  card.className = "research-card";
  card.dataset.rowId = String(rowCount);

  const linkFieldsHtml = LINK_FIELDS.map(
    (f) => `
      <label class="link-field${f.conditional ? " conditional-field is-hidden" : ""}" ${
        f.conditional ? 'data-conditional="reedit"' : ""
      }>
        <span class="link-field-label"><span class="link-field-icon">${f.icon}</span><span class="link-field-text">${f.label}</span></span>
        <input class="cell-input" data-field="${f.key}" placeholder="${f.placeholder}" />
      </label>`
  ).join("");

  card.innerHTML = `
    <div class="research-card-header">
      <input class="cell-input research-name-input" data-field="creator_name" placeholder="Creator name" />
      <button class="btn btn-ghost btn-sm btn-delete-row" title="Delete card">✕</button>
    </div>

    <div class="research-card-row">
      <label class="mini-field">
        <span>Platform</span>
        <input class="cell-input" data-field="platform" placeholder="YouTube, TikTok…" />
      </label>
      <label class="mini-field">
        <span>Priority</span>
        <select class="cell-input" data-field="priority">
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Low">Low</option>
        </select>
      </label>
      <label class="mini-field">
        <span>Need Re-edit</span>
        <select class="cell-input" data-field="need_reedit">
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </label>
    </div>

    <div class="research-section-title">Links</div>
    <div class="research-links-grid">
      ${linkFieldsHtml}
    </div>

    <div class="research-section-title">Notes</div>
    <div class="research-notes-grid">
      <label class="mini-field">
        <span>Problem Found</span>
        <textarea class="cell-textarea" data-field="problem_found" placeholder="Pacing, thumbnails…"></textarea>
      </label>
      <label class="mini-field">
        <span>Notes</span>
        <textarea class="cell-textarea" data-field="notes" placeholder="Anything worth remembering"></textarea>
      </label>
    </div>
  `;

  container.appendChild(card);
  card.querySelector(".btn-delete-row").addEventListener("click", () => card.remove());

  const needReeditSelect = card.querySelector('[data-field="need_reedit"]');
  const conditionalFields = card.querySelectorAll('[data-conditional="reedit"]');
  const syncConditionalFields = () => {
    const show = needReeditSelect.value === "true";
    conditionalFields.forEach((el) => {
      el.classList.toggle("is-hidden", !show);
      // Inputs stay in the DOM (never removed) so their values are preserved
      // when toggling back and forth — only visibility/interactivity changes.
      el.querySelectorAll("input, textarea").forEach((input) => {
        input.tabIndex = show ? 0 : -1;
      });
    });
  };
  needReeditSelect.addEventListener("change", syncConditionalFields);
  syncConditionalFields();
}

btnAddRow.addEventListener("click", () => addCard());
btnAddRowBottom.addEventListener("click", () => addCard());

function readCards() {
  return Array.from(container.querySelectorAll(".research-card")).map((card) => {
    const row = { _el: card };
    [...TEXT_FIELDS, ...LINK_FIELDS.map((f) => f.key)].forEach((key) => {
      const input = card.querySelector(`[data-field="${key}"]`);
      row[key] = input.value.trim();
    });
    row.priority = card.querySelector('[data-field="priority"]').value;
    row.need_reedit = card.querySelector('[data-field="need_reedit"]').value === "true";
    return row;
  });
}

function isRowTouched(row) {
  const touchedText = [...TEXT_FIELDS, ...LINK_FIELDS.map((f) => f.key)].some((k) => row[k]);
  return touchedText || row.priority !== "Medium" || row.need_reedit;
}

function validateRows(rows) {
  let valid = true;
  const touchedRows = [];
  const seenInBatch = new Set();

  rows.forEach((row) => {
    if (!isRowTouched(row)) return; // ignore fully empty cards silently

    const nameInput = row._el.querySelector('[data-field="creator_name"]');
    const nameLower = row.creator_name.toLowerCase();

    let rowValid = true;
    if (!row.creator_name) {
      nameInput.classList.add("invalid");
      rowValid = false;
    } else if (existingNamesLower.includes(nameLower) || seenInBatch.has(nameLower)) {
      nameInput.classList.add("invalid");
      showToast(`"${row.creator_name}" already exists in Outreach. Skipping duplicate.`, {
        isError: true,
      });
      rowValid = false;
    } else {
      nameInput.classList.remove("invalid");
      seenInBatch.add(nameLower);
    }

    if (!rowValid) {
      valid = false;
      return;
    }
    touchedRows.push(row);
  });

  return { valid, touchedRows };
}

btnFinish.addEventListener("click", async () => {
  const rows = readCards();
  const { valid, touchedRows } = validateRows(rows);

  if (!valid) {
    showToast("Fix the highlighted cards — missing names or duplicate creators.", { isError: true });
    return;
  }

  if (touchedRows.length === 0) {
    showToast("Add at least one creator before finishing.", { isError: true });
    return;
  }

  btnFinish.disabled = true;
  btnFinish.textContent = "Saving…";

  const payload = touchedRows.map((row) => {
    const hasEmail = Boolean(row.email);
    return {
      creator_name: row.creator_name,
      platform: row.platform || null,
      priority: row.priority || "Medium",
      channel_link: row.channel_link || null,
      instagram: row.instagram || null,
      x_handle: row.x_handle || null,
      email: row.email || null,
      original_video: row.original_video || null,
      problem_found: row.problem_found || null,
      my_reedit_link: row.my_reedit_link || null,
      notes: row.notes || null,
      need_reedit: row.need_reedit,
      status: hasEmail ? "Need First Email" : "Need Social DM",
      current_step: hasEmail ? "first_email" : "social_dm",
      email_only: false,
      social_only: !hasEmail,
      follow_up_count: 0,
    };
  });

  try {
    const inserted = await insertCreators(payload);
    await Promise.all(
      inserted.map((c) => addEvent(c.id, "research_added", "Added during Research Session"))
    );
    showToast(`Saved ${payload.length} creator(s). Redirecting to Outreach…`);
    container.innerHTML = "";
    setTimeout(() => {
      window.location.href = "outreach.html";
    }, 700);
  } catch (err) {
    console.error(err);
    showToast("Failed to save: " + err.message, { isError: true });
    btnFinish.disabled = false;
    btnFinish.textContent = "Finish Research Session";
  }
});

init();

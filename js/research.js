// js/research.js
import { insertCreators, fetchCreatorNames, addEvent } from "./supabase-client.js";
import { mountNav } from "./nav.js";
import { mountNotificationBell } from "./notifications.js";
import { showToast } from "./ui.js";
import { avatarHtml } from "./avatar.js";

mountNav();
mountNotificationBell();

const container = document.getElementById("research-body");
const btnAddRow = document.getElementById("btn-add-row");
const btnAddRowBottom = document.getElementById("btn-add-row-bottom");
const btnFinish = document.getElementById("btn-finish");

// The four core platform fields get the full "modern card" treatment:
// image, title, short description, and a color per platform so each is
// instantly distinguishable. Image paths assume an `assets/` folder at
// the project root (assets/yt.png, assets/insta.png, assets/x.png,
// assets/email.png) — adjust PLATFORM_FIELDS[].image below if yours live
// somewhere else. If an image is missing/fails to load, it gracefully
// falls back to the emoji in `fallback` (native <img onerror>, no JS work
// needed) so the UI never breaks.
const PLATFORM_FIELDS = [
  {
    key: "channel_link",
    modifier: "youtube",
    image: "assets/yt.png",
    fallback: "📺",
    title: "YouTube",
    desc: "Paste the channel link",
    placeholder: "https://youtube.com/@creator",
  },
  {
    key: "instagram",
    modifier: "instagram",
    image: "assets/insta.png",
    fallback: "📷",
    title: "Instagram",
    desc: "Their handle",
    placeholder: "@username",
  },
  {
    key: "x_handle",
    modifier: "x",
    image: "assets/x.png",
    fallback: "❌",
    title: "X",
    desc: "Their handle",
    placeholder: "@username",
  },
  {
    key: "email",
    modifier: "email",
    image: "assets/email.png",
    fallback: "📧",
    title: "Email",
    desc: "Direct contact email",
    placeholder: "name@email.com",
  },
];

// These two stay simple icon+label fields (no dedicated art) and are only
// shown when Need Re-edit = Yes. Their values are never cleared when
// hidden — see syncConditionalFields.
const REEDIT_LINK_FIELDS = [
  { key: "original_video", icon: "🎥", label: "Original Video", placeholder: "https://..." },
  { key: "my_reedit_link", icon: "✂️", label: "My Re-edit", placeholder: "https://..." },
];

const ALL_LINK_KEYS = [...PLATFORM_FIELDS.map((f) => f.key), ...REEDIT_LINK_FIELDS.map((f) => f.key)];
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

  const platformCardsHtml = PLATFORM_FIELDS.map(
    (f) => `
      <div class="platform-card platform-card--${f.modifier}">
        <div class="platform-card-icon">
          <img src="${f.image}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <span class="icon-fallback-emoji" style="display:none">${f.fallback}</span>
        </div>
        <div class="platform-card-body">
          <div class="platform-card-title">${f.title}</div>
          <div class="platform-card-desc">${f.desc}</div>
          <input class="cell-input" data-field="${f.key}" placeholder="${f.placeholder}" />
        </div>
      </div>`
  ).join("");

  const reeditFieldsHtml = REEDIT_LINK_FIELDS.map(
    (f) => `
      <label class="link-field conditional-field is-hidden" data-conditional="reedit">
        <span class="link-field-label"><span class="link-field-icon">${f.icon}</span><span class="link-field-text">${f.label}</span></span>
        <input class="cell-input" data-field="${f.key}" placeholder="${f.placeholder}" />
      </label>`
  ).join("");

  card.innerHTML = `
    <div class="research-card-header">
      <span class="research-avatar-slot"></span>
      <input class="cell-input research-name-input" data-field="creator_name" placeholder="Creator name" />
      <button class="btn btn-ghost btn-sm btn-delete-row" title="Delete card">✕</button>
    </div>

    <div class="research-section-title">Basic Information</div>
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
    <div class="platform-cards-grid">
      ${platformCardsHtml}
    </div>
    <div class="research-links-grid">
      ${reeditFieldsHtml}
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

  // Need Re-edit toggles the two secondary re-edit link fields (fade/slide,
  // values preserved — see CSS .conditional-field / .is-hidden).
  const needReeditSelect = card.querySelector('[data-field="need_reedit"]');
  const conditionalFields = card.querySelectorAll('[data-conditional="reedit"]');
  const syncConditionalFields = () => {
    const show = needReeditSelect.value === "true";
    conditionalFields.forEach((el) => {
      el.classList.toggle("is-hidden", !show);
      el.querySelectorAll("input, textarea").forEach((input) => {
        input.tabIndex = show ? 0 : -1;
      });
    });
  };
  needReeditSelect.addEventListener("change", syncConditionalFields);
  syncConditionalFields();

  // Live channel avatar preview — recomputed from the name + channel link
  // inputs on every keystroke. Nothing is persisted; it's derived on the
  // fly the same way the Outreach table does it.
  const nameInput = card.querySelector('[data-field="creator_name"]');
  const channelInput = card.querySelector('[data-field="channel_link"]');
  const avatarSlot = card.querySelector(".research-avatar-slot");
  const syncAvatar = () => {
    avatarSlot.innerHTML = avatarHtml(nameInput.value, channelInput.value, "avatar-md");
  };
  nameInput.addEventListener("input", syncAvatar);
  channelInput.addEventListener("input", syncAvatar);
  syncAvatar();
}

btnAddRow.addEventListener("click", () => addCard());
btnAddRowBottom.addEventListener("click", () => addCard());

function readCards() {
  return Array.from(container.querySelectorAll(".research-card")).map((card) => {
    const row = { _el: card };
    [...TEXT_FIELDS, ...ALL_LINK_KEYS].forEach((key) => {
      const input = card.querySelector(`[data-field="${key}"]`);
      row[key] = input.value.trim();
    });
    row.priority = card.querySelector('[data-field="priority"]').value;
    row.need_reedit = card.querySelector('[data-field="need_reedit"]').value === "true";
    return row;
  });
}

function isRowTouched(row) {
  const touchedText = [...TEXT_FIELDS, ...ALL_LINK_KEYS].some((k) => row[k]);
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

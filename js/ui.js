// js/ui.js — small shared UI helpers used across pages.

export function showToast(message, { isError = false, duration = 3200 } = {}) {
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Centered modal overlay. Returns the modal element; call closeModal() to remove it. */
export function openModal(innerHtml, { className = "" } = {}) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "active-modal-overlay";
  overlay.innerHTML = `<div class="modal-box ${className}">${innerHtml}</div>`;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.body.appendChild(overlay);
  return overlay;
}

export function closeModal() {
  document.getElementById("active-modal-overlay")?.remove();
}

/** Right-side sliding drawer (used for the creator detail panel). */
export function openDrawer(innerHtml) {
  closeDrawer();
  const overlay = document.createElement("div");
  overlay.className = "drawer-overlay";
  overlay.id = "active-drawer-overlay";
  overlay.innerHTML = `<div class="drawer-box">${innerHtml}</div>`;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeDrawer();
  });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("open"));
  return overlay;
}

export function closeDrawer() {
  const el = document.getElementById("active-drawer-overlay");
  if (!el) return;
  el.classList.remove("open");
  setTimeout(() => el.remove(), 200);
}

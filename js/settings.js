// js/settings.js
import { fetchSettings, updateSettings } from "./supabase-client.js";
import { STEP_DEFS } from "./sequence.js";
import { mountNav } from "./nav.js";
import { mountNotificationBell } from "./notifications.js";
import { showToast } from "./ui.js";

mountNav();
mountNotificationBell();

const userNameInput = document.getElementById("set-user-name");
const businessNameInput = document.getElementById("set-business-name");
const timezoneInput = document.getElementById("set-timezone");
const signatureInput = document.getElementById("set-signature");
const delaysGrid = document.getElementById("delays-grid");
const saveBtn = document.getElementById("btn-save-settings");

let currentSettings = null;

async function init() {
  try {
    currentSettings = await fetchSettings();
  } catch (err) {
    console.error(err);
    showToast("Failed to load settings: " + err.message, { isError: true });
    currentSettings = { followup_delays: STEP_DEFS.map((s) => s.defaultDelayHours ?? 24) };
  }

  userNameInput.value = currentSettings.user_name || "";
  businessNameInput.value = currentSettings.business_name || "";
  timezoneInput.value = currentSettings.timezone || "";
  signatureInput.value = currentSettings.email_signature || "";

  const delays = currentSettings.followup_delays || STEP_DEFS.map((s) => s.defaultDelayHours ?? 24);
  delaysGrid.innerHTML = STEP_DEFS.map(
    (step, i) => `
    <label>${step.label}${step.kind === "social" ? " (reminder)" : ""}
      <input class="cell-input delay-input" type="number" min="1" data-index="${i}"
        value="${delays[i] ?? step.defaultDelayHours ?? 24}" ${step.defaultDelayHours == null ? "disabled placeholder=\"final step\"" : ""} />
    </label>`
  ).join("");
}

saveBtn.addEventListener("click", async () => {
  const delays = Array.from(delaysGrid.querySelectorAll(".delay-input")).map((input) =>
    input.disabled ? null : Number(input.value) || 24
  );

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  try {
    await updateSettings({
      user_name: userNameInput.value.trim() || null,
      business_name: businessNameInput.value.trim() || null,
      timezone: timezoneInput.value.trim() || null,
      email_signature: signatureInput.value,
      followup_delays: delays,
    });
    showToast("Settings saved.");
  } catch (err) {
    console.error(err);
    showToast("Failed to save: " + err.message, { isError: true });
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Settings";
  }
});

init();

// js/sequence.js
//
// The outreach timeline, in order. This is the single source of truth for
// "what step comes next" and "how many hours until the next action".
// Edit STEPS to change the workflow — nothing else in the app needs to change.
//
// Delays live in Settings (js/settings-store.js) so they can be tuned from
// the Settings page without touching code; STEP_DEFS below just defines the
// shape/labels/kind of each step and falls back to these defaults.

export const STEP_DEFS = [
  { key: "first_email",     label: "First Email",      kind: "email",      defaultDelayHours: 24 },
  { key: "followup_1",      label: "Follow-up #1",     kind: "email",      defaultDelayHours: 24 },
  { key: "social_dm",       label: "Need Social DM",   kind: "social",     defaultDelayHours: 48 },
  { key: "followup_2",      label: "Follow-up",        kind: "email",      defaultDelayHours: 72 },
  { key: "followup_3",      label: "Follow-up",        kind: "email",      defaultDelayHours: 96 },
  { key: "followup_4",      label: "Follow-up",        kind: "email",      defaultDelayHours: 96 },
  { key: "followup_5",      label: "Follow-up",        kind: "email",      defaultDelayHours: 96 },
  { key: "followup_6",      label: "Follow-up",        kind: "email",      defaultDelayHours: 96 },
  { key: "followup_7",      label: "Follow-up",        kind: "email",      defaultDelayHours: 120 },
  { key: "final_followup",  label: "Final Follow-up",  kind: "email",      defaultDelayHours: null },
];

export function stepIndex(key) {
  const idx = STEP_DEFS.findIndex((s) => s.key === key);
  return idx === -1 ? 0 : idx;
}

export function stepDef(key) {
  return STEP_DEFS[stepIndex(key)] || STEP_DEFS[0];
}

export function nextStepKey(key) {
  const idx = stepIndex(key);
  if (idx === -1 || idx === STEP_DEFS.length - 1) return key;
  return STEP_DEFS[idx + 1].key;
}

export function isLastStep(key) {
  return stepIndex(key) === STEP_DEFS.length - 1;
}

/** Delay (in hours) before the CURRENT step's action becomes due again / before the next step unlocks. */
export function delayForStep(key, followupDelays) {
  const idx = stepIndex(key);
  if (Array.isArray(followupDelays) && followupDelays[idx] != null) {
    return followupDelays[idx];
  }
  return STEP_DEFS[idx]?.defaultDelayHours ?? 24;
}

export function stepLabel(key) {
  return stepDef(key).label;
}

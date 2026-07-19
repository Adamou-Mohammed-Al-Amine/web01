// js/followups.js
//
// Loads data/followups.json (the follow-up message library) and picks a
// random message a given creator hasn't already received. Nothing here is
// hardcoded — edit data/followups.json to change the wording, add more
// messages, or remove some.

let cachedLibrary = null;

export async function loadFollowupLibrary() {
  if (cachedLibrary) return cachedLibrary;
  const res = await fetch("data/followups.json");
  if (!res.ok) throw new Error("Could not load data/followups.json");
  const json = await res.json();
  cachedLibrary = json.followups || [];
  return cachedLibrary;
}

/**
 * Picks a random followup not in `usedIds`. If every message has been used,
 * the pool resets (so a creator on a very long sequence can still get a
 * message rather than nothing) but this should rarely trigger given the
 * library size vs. the sequence length.
 */
export function pickRandomFollowup(library, usedIds = []) {
  const unused = library.filter((f) => !usedIds.includes(f.id));
  const pool = unused.length > 0 ? unused : library;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function renderFollowupBody(template, { name, signature }) {
  return (template || "")
    .replaceAll("{{name}}", name || "there")
    .replaceAll("{{signature}}", signature || "");
}

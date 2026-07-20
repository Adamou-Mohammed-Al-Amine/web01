// js/avatar.js
//
// Best-effort circular avatar for a creator, used in the Research Session
// card, the Outreach table, and the creator detail side panel.
//
// This never touches Supabase and adds no new columns — the avatar is
// derived on the fly from the existing `channel_link` field every time it's
// rendered. If a channel link isn't a recognizable YouTube URL, or the
// image fails to load for any reason, it falls back to a clean initials
// avatar automatically (via the <img> tag's native onerror handling).
//
// Sizing is applied INLINE (not just via CSS classes) so the avatar always
// renders at the correct small circular size even if the stylesheet is
// stale, cached, or only partially deployed — it can never balloon to the
// photo's native resolution.

import { escapeHtml } from "./ui.js";

const SIZES = {
  "avatar-sm": { box: 28, font: 11 },
  "avatar-md": { box: 40, font: 15 },
  "avatar-lg": { box: 56, font: 20 },
};

/**
 * Extracts a best-guess avatar URL for a YouTube channel link using
 * unavatar.io (a public avatar-lookup proxy — no API key required, no
 * server-side code needed). Returns null if the link isn't a parseable
 * YouTube URL; the caller should treat null the same as "avatar failed".
 */
export function extractYoutubeAvatarUrl(channelLink) {
  if (!channelLink) return null;
  let url;
  try {
    url = new URL(channelLink.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host !== "youtube.com" && host !== "youtu.be" && host !== "m.youtube.com") return null;

  const path = url.pathname.replace(/\/+$/, "");
  let identifier = null;
  let m;
  if ((m = path.match(/^\/(@[^/]+)/))) identifier = m[1];
  else if ((m = path.match(/^\/channel\/([^/]+)/))) identifier = m[1];
  else if ((m = path.match(/^\/c\/([^/]+)/))) identifier = m[1];
  else if ((m = path.match(/^\/user\/([^/]+)/))) identifier = m[1];

  if (!identifier) return null;
  return `https://unavatar.io/youtube/${encodeURIComponent(identifier)}`;
}

/** Deterministic color from a name, so the same creator always gets the same fallback color. */
function colorForName(name) {
  let hash = 0;
  const str = name || "?";
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 55%, 40%)`;
}

/**
 * Renders a circular avatar: tries the YouTube avatar image if the channel
 * link parses, falls back to an initials badge (native <img onerror>, no JS
 * probing needed). sizeClass: "avatar-sm" | "avatar-md" | "avatar-lg".
 * Sizing is inline so it's guaranteed correct regardless of CSS state.
 */
export function avatarHtml(name, channelLink, sizeClass = "avatar-md") {
  const { box, font } = SIZES[sizeClass] || SIZES["avatar-md"];
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const color = colorForName(name);
  const url = extractYoutubeAvatarUrl(channelLink);

  const containerStyle =
    `display:inline-flex;align-items:center;justify-content:center;` +
    `width:${box}px;height:${box}px;min-width:${box}px;max-width:${box}px;` +
    `border-radius:50%;overflow:hidden;background:var(--bg-elevated-2,#1a1d22);` +
    `border:1px solid var(--border-soft,#1c1f25);flex-shrink:0;`;

  const imgStyle = `width:${box}px;height:${box}px;object-fit:cover;display:block;`;

  const fallbackStyle =
    `width:${box}px;height:${box}px;display:flex;align-items:center;justify-content:center;` +
    `color:#fff;font-weight:700;font-size:${font}px;`;

  const imgTag = url
    ? `<img class="avatar-img" style="${imgStyle}" width="${box}" height="${box}" src="${escapeHtml(
        url
      )}" alt="" loading="lazy"
         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
    : "";

  return `
    <span class="avatar ${sizeClass}" style="${containerStyle}">
      ${imgTag}
      <span class="avatar-fallback" style="${fallbackStyle}${url ? "display:none;" : ""}background:${color}">${escapeHtml(
    initial
  )}</span>
    </span>`;
}

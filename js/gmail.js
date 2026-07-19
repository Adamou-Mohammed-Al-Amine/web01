// js/gmail.js
//
// Builds a Gmail "compose" deep link and opens it in a new tab, prefilled
// with recipient / subject / body. The user always clicks Send themselves
// inside Gmail — this app never sends email automatically.

export function openGmailCompose({ to, subject, body }) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: to || "",
    su: subject || "",
    body: body || "",
  });
  const url = `https://mail.google.com/mail/?${params.toString()}`;
  window.open(url, "_blank", "noopener");
}

/** "Re: X" — dedupes an existing "Re: " prefix rather than stacking it. */
export function replySubject(subject) {
  const base = (subject || "").trim();
  if (/^re:/i.test(base)) return base;
  return `Re: ${base}`;
}

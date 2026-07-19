// js/nav.js — injects the shared sidebar so it only has to be edited once.

const NAV_HTML = `
  <div class="brand">Outreach <span>Studio</span></div>
  <a class="nav-link" href="index.html">Dashboard</a>
  <a class="nav-link" href="research.html">Research Session</a>
  <a class="nav-link" href="outreach.html">Outreach</a>
  <a class="nav-link" href="settings.html">Settings</a>
`;

export function mountNav() {
  const target = document.getElementById("sidebar");
  if (!target) return;
  target.innerHTML = NAV_HTML;
  const path = window.location.pathname.split("/").pop() || "index.html";
  target.querySelectorAll(".nav-link").forEach((link) => {
    if (link.getAttribute("href") === path) link.classList.add("active");
  });
}

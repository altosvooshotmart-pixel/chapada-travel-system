// Keep JS minimal for speed (speed = conversions).

/**
 * 1) Footer year
 */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/**
 * 2) UTM + CTA tracking (no dependencies)
 * - Adds different utm_content for each CTA (including sticky).
 * - Preserves incoming utm_* params from the current page.
 * - Keeps your Kiwify link editable in one place.
 */
const BASE_KIWIFY_URL = "https://pay.kiwify.com/deSmRIe";

// Default campaign params (feel free to rename)
const DEFAULT_UTM = {
  utm_source: "landing_page",
  utm_medium: "site",
  utm_campaign: "chapada_travel_system"
};

// Map each CTA id to a unique utm_content
const CTA_CONTENT = {
  ctaTop: "cta_top",
  ctaMid: "cta_mid",
  ctaBottom: "cta_bottom",
  ctaSticky: "cta_sticky"
};

// Read current page query params (preserve incoming UTMs if they exist)
const pageParams = new URLSearchParams(window.location.search);

function buildKiwifyUrl(utmContentValue) {
  const url = new URL(BASE_KIWIFY_URL);

  // Start with defaults
  const merged = new URLSearchParams(DEFAULT_UTM);

  // Preserve any UTM-like params the user arrived with
  for (const [k, v] of pageParams.entries()) {
    if (k.toLowerCase().startsWith("utm_") && v) merged.set(k, v);
  }

  // Set the CTA-specific utm_content
  merged.set("utm_content", utmContentValue);

  // Apply merged params
  url.search = merged.toString();
  return url.toString();
}

// Apply URLs + click logs
Object.keys(CTA_CONTENT).forEach((id) => {
  const btn = document.getElementById(id);
  if (!btn) return;

  btn.href = buildKiwifyUrl(CTA_CONTENT[id]);

  btn.addEventListener("click", () => {
    console.log("CTA_CLICK:", id, new Date().toISOString(), btn.href);
  });
});

/**
 * 3) Smooth scroll (only for internal anchors)
 */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const targetId = a.getAttribute("href");
    const target = document.querySelector(targetId);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

/**
 * 4) Sticky CTA behavior (premium)
 * - Mobile-only behavior (keeps desktop clean)
 * - Shows after small scroll (feels intentional)
 * - Dismisses after click for a while (less annoying)
 * - Injects minimal CSS for animation (no need to touch your CSS)
 */
(function stickyCtaController() {
  const sticky = document.querySelector(".stickyCta");
  if (!sticky) return;

  // Mobile breakpoint aligned with your CSS
  const mq = window.matchMedia("(max-width: 900px)");

  // Respect reduced motion
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Dismiss memory (hours)
  const DISMISS_KEY = "chapada_sticky_dismissed_until";
  const DISMISS_HOURS = 12;

  function nowMs() { return Date.now(); }

  function isDismissed() {
    const until = Number(localStorage.getItem(DISMISS_KEY) || "0");
    return until > nowMs();
  }

  function dismissForHours(hours) {
    const until = nowMs() + hours * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
  }

  // Inject tiny CSS to animate without editing styles.css
  const style = document.createElement("style");
  style.textContent = `
    .stickyCta{
      opacity: 0;
      transform: translateY(110%);
      transition: transform 180ms ease, opacity 180ms ease;
      will-change: transform, opacity;
    }
    .stickyCta.is-visible{
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  // Start hidden (animation-ready)
  sticky.classList.remove("is-visible");

  // If already dismissed, keep hidden
  if (isDismissed()) return;

  // Show rules
  const SHOW_AFTER_PX = 220;   // scroll threshold (feel free to tweak)
  const SHOW_AFTER_MS = 900;   // fallback delay (in case no scroll)

  let shown = false;
  function showSticky() {
    if (shown) return;
    if (!mq.matches) return;          // mobile only
    if (isDismissed()) return;
    shown = true;

    if (reduceMotion) {
      sticky.style.transition = "none";
    }
    sticky.classList.add("is-visible");
  }

  // Hide (when dismissed)
  function hideSticky() {
    sticky.classList.remove("is-visible");
  }

  // Auto-show after scroll
  function onScroll() {
    if (!mq.matches) return;
    if (window.scrollY >= SHOW_AFTER_PX) showSticky();
  }

  // Fallback: show after delay (only if user is still on page)
  const timer = setTimeout(() => {
    // Only show if user is on mobile and hasn't dismissed and hasn't already scrolled enough
    if (mq.matches && !shown && !isDismissed()) showSticky();
  }, SHOW_AFTER_MS);

  window.addEventListener("scroll", onScroll, { passive: true });

  // If viewport changes (rotate / resize), respect the breakpoint
  mq.addEventListener?.("change", () => {
    if (!mq.matches) {
      // leaving mobile: hide
      hideSticky();
      shown = false;
    } else {
      // entering mobile: decide based on current scroll
      if (!isDismissed() && window.scrollY >= SHOW_AFTER_PX) showSticky();
    }
  });

  // Dismiss sticky after click (any click on sticky CTA button)
  const stickyBtn = document.getElementById("ctaSticky") || sticky.querySelector("a.btn");
  if (stickyBtn) {
    stickyBtn.addEventListener("click", () => {
      dismissForHours(DISMISS_HOURS);
      hideSticky();
      clearTimeout(timer);
      console.log("STICKY_DISMISSED_FOR_HOURS:", DISMISS_HOURS);
    });
  }
})();

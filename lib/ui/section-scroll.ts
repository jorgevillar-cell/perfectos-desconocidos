export function smoothScrollToHash(hash: string, offset = 86) {
  if (typeof window === "undefined") return;

  const targetId = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!targetId) return;

  const target = document.getElementById(targetId);
  if (!target) return;

  const targetTop = target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });

  target.classList.remove("section-focus-ring");
  // Restart animation if user clicks repeatedly.
  void target.offsetWidth;
  target.classList.add("section-focus-ring");

  window.setTimeout(() => {
    target.classList.remove("section-focus-ring");
  }, 1200);
}

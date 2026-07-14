"use strict";

const header = document.querySelector("#site-header");
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#primary-navigation");
const navigationLinks = [...document.querySelectorAll(".primary-nav a")];
const sections = [...document.querySelectorAll("main section[id]")];
const backToTop = document.querySelector(".back-to-top");
const year = document.querySelector("#current-year");

if (year) {
  year.textContent = new Date().getFullYear();
}

function closeMenu({ returnFocus = false } = {}) {
  if (!menuButton || !navigation) return;

  navigation.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");

  if (returnFocus) {
    menuButton.focus();
  }
}

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    navigation.classList.toggle("open", !isOpen);
    document.body.classList.toggle("menu-open", !isOpen);
  });

  navigationLinks.forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navigation.classList.contains("open")) {
      closeMenu({ returnFocus: true });
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760 && navigation.classList.contains("open")) {
      closeMenu();
    }
  });
}

function updateScrollState() {
  const hasScrolled = window.scrollY > 12;
  const showBackToTop = window.scrollY > 600;

  header?.classList.toggle("scrolled", hasScrolled);
  backToTop?.classList.toggle("visible", showBackToTop);
}

updateScrollState();
window.addEventListener("scroll", updateScrollState, { passive: true });

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visibleSections = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (!visibleSections.length) return;

      const activeId = visibleSections[0].target.id;
      navigationLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${activeId}`;
        link.classList.toggle("active", isActive);

        if (isActive) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    },
    {
      rootMargin: "-20% 0px -60% 0px",
      threshold: [0.05, 0.2, 0.5],
    }
  );

  sections.forEach((section) => observer.observe(section));
}

const body = document.body;
const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const pointerField = document.querySelector("[data-pointer-field]");
const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const setContent = (key, value) => {
  if (typeof value !== "string") {
    return;
  }

  document.querySelectorAll(`[data-content="${key}"]`).forEach((element) => {
    element.textContent = value;
  });
};

const safeUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "#";
  }

  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
};

const makeElement = (tagName, className, text) => {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (typeof text === "string") {
    element.textContent = text;
  }

  return element;
};

const renderHighlights = (highlights) => {
  const container = document.querySelector("[data-highlights]");

  if (!container || !Array.isArray(highlights) || !highlights.length) {
    return;
  }

  const fragment = document.createDocumentFragment();

  highlights.forEach((highlight, index) => {
    if (typeof highlight !== "string" || !highlight.trim()) {
      return;
    }

    const item = document.createElement("div");
    item.append(makeElement("span", "", String(index + 1).padStart(2, "0")));
    item.append(makeElement("p", "", highlight));
    fragment.append(item);
  });

  if (fragment.childNodes.length) {
    container.replaceChildren(fragment);
  }
};

const renderParagraphs = (paragraphs) => {
  const container = document.querySelector("[data-about-copy]");

  if (!container || !Array.isArray(paragraphs) || !paragraphs.length) {
    return;
  }

  const fragment = document.createDocumentFragment();
  paragraphs.forEach((paragraph) => {
    if (typeof paragraph === "string" && paragraph.trim()) {
      fragment.append(makeElement("p", "", paragraph));
    }
  });

  if (fragment.childNodes.length) {
    container.replaceChildren(fragment);
  }
};

const renderTracks = (tracks) => {
  const container = document.querySelector("[data-tracks]");

  if (!container || !Array.isArray(tracks) || !tracks.length) {
    return;
  }

  const fragment = document.createDocumentFragment();

  tracks.forEach((track) => {
    if (!track || typeof track.title !== "string" || !track.title.trim()) {
      return;
    }

    const article = makeElement("article", "track");
    const copy = document.createElement("div");
    copy.append(makeElement("p", "track-meta", track.meta || "Video"));
    copy.append(makeElement("h3", "", track.title));
    copy.append(makeElement("p", "track-note", track.note || ""));

    const link = makeElement("a", "track-action", "Watch");
    link.href = safeUrl(track.url);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.setAttribute("aria-label", `Watch ${track.title}`);

    article.append(copy, link);
    fragment.append(article);
  });

  if (fragment.childNodes.length) {
    container.replaceChildren(fragment);
  }
};

const renderProjects = (projects) => {
  const container = document.querySelector("[data-projects]");
  const items = projects?.items;

  if (!container || !Array.isArray(items) || !items.length) {
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((project) => {
    if (!project || typeof project.title !== "string" || !project.title.trim()) {
      return;
    }

    const article = makeElement("article", "event");
    const time = makeElement("time", "", project.year || "");
    if (project.year) {
      time.dateTime = project.year;
    }
    const copy = document.createElement("div");
    copy.append(makeElement("h3", "", project.title));
    copy.append(makeElement("p", "", project.description || ""));
    article.append(time, copy);
    fragment.append(article);
  });

  if (fragment.childNodes.length) {
    container.replaceChildren(fragment);
  }
};

const renderContact = (contact) => {
  const container = document.querySelector("[data-contact-panel]");

  if (!container || !contact) {
    return;
  }

  const fragment = document.createDocumentFragment();
  if (contact.availability) {
    fragment.append(makeElement("p", "", contact.availability));
  }

  if (typeof contact.email === "string" && contact.email.trim()) {
    const email = contact.email.trim();
    const link = makeElement("a", "", email);
    link.href = `mailto:${email}`;
    fragment.append(link);
  } else if (contact.notice) {
    fragment.append(makeElement("p", "", contact.notice));
  }

  if (Array.isArray(contact.links) && contact.links.length) {
    const links = makeElement("div", "socials");

    contact.links.forEach((item) => {
      if (!item || typeof item.label !== "string" || !item.label.trim()) {
        return;
      }

      const link = makeElement("a", "", item.label);
      link.href = safeUrl(item.url);
      link.target = "_blank";
      link.rel = "noreferrer";
      links.append(link);
    });

    if (links.childNodes.length) {
      fragment.append(links);
    }
  }

  if (fragment.childNodes.length) {
    container.replaceChildren(fragment);
  }
};

const hydrateSiteContent = (site) => {
  if (!site || typeof site !== "object") {
    return;
  }

  if (site.seo?.title) {
    document.title = site.seo.title;
  }
  const description = document.querySelector("[data-seo-description]");
  if (description && site.seo?.description) {
    description.content = site.seo.description;
  }

  setContent("artist-name", site.artist?.name);
  setContent("artist-role", site.artist?.role);
  setContent("hero-eyebrow", site.hero?.eyebrow);
  setContent("hero-tagline", site.hero?.tagline);
  setContent("hero-primary-cta", site.hero?.primary_cta);
  setContent("hero-secondary-cta", site.hero?.secondary_cta);
  setContent("about-heading", site.about?.heading);
  setContent("projects-kicker", site.projects?.kicker);
  setContent("projects-heading", site.projects?.heading);
  setContent("statement", site.statement?.text);
  setContent("statement-credit", site.statement?.credit);
  setContent("contact-heading", site.contact?.heading);

  if (site.artist?.name) {
    const brand = document.querySelector("[data-brand-home]");
    const initials = site.artist.name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();

    if (brand) {
      brand.setAttribute("aria-label", `${site.artist.name} home`);
    }
    document.querySelectorAll("[data-artist-initials]").forEach((element) => {
      element.textContent = initials;
    });
  }

  const heroImage = document.querySelector("[data-hero-image]");
  if (heroImage && site.hero?.image) {
    heroImage.src = site.hero.image;
    heroImage.alt = site.hero.image_alt || "Artist performance image";
  }

  renderHighlights(site.highlights);
  renderParagraphs(site.about?.paragraphs);
  renderTracks(site.tracks);
  renderProjects(site.projects);
  renderContact(site.contact);
};

fetch("content/site.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) {
      throw new Error("Unable to load site content.");
    }
    return response.json();
  })
  .then(hydrateSiteContent)
  .catch(() => {
    // The static markup remains available if the editable content file cannot load.
  });

if (!prefersReducedMotion) {
  body.classList.add("is-intro-running");
  window.setTimeout(() => body.classList.remove("is-intro-running"), 4650);
}

const updateHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 18);
};

navToggle.addEventListener("click", () => {
  const isOpen = body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    body.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) {
        return;
      }

      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`);
      });
    },
    {
      rootMargin: "-30% 0px -55% 0px",
      threshold: [0.08, 0.2, 0.4],
    }
  );

  sections.forEach((section) => observer.observe(section));

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.16,
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

if (pointerField && !prefersReducedMotion) {
  pointerField.addEventListener("pointermove", (event) => {
    const rect = pointerField.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    pointerField.style.setProperty("--pointer-x", `${x.toFixed(2)}%`);
    pointerField.style.setProperty("--pointer-y", `${y.toFixed(2)}%`);
    pointerField.classList.add("is-pointer-active");
  });

  pointerField.addEventListener("pointerleave", () => {
    pointerField.classList.remove("is-pointer-active");
  });
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

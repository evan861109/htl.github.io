const body = document.body;
const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const pointerField = document.querySelector("[data-pointer-field]");
const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const languageButtons = Array.from(document.querySelectorAll("[data-language]"));
const languageStorageKey = "tzuling-language";
const isMediaPage = body.classList.contains("media-page");
const isBioPage = body.classList.contains("bio-page");
const isProjectsPage = body.classList.contains("projects-page");
const isProjectPage = body.classList.contains("project-page");
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
let siteContent;
let heroSequenceStarted = false;

const getPreferredLanguage = () => {
  const languageFromUrl = new URLSearchParams(window.location.search).get("lang");
  if (languageFromUrl === "zh_hant" || languageFromUrl === "en") {
    return languageFromUrl;
  }

  try {
    return localStorage.getItem(languageStorageKey) === "zh_hant" ? "zh_hant" : "en";
  } catch {
    return "en";
  }
};

const updateLanguageControls = (language) => {
  languageButtons.forEach((button) => {
    const isActive = button.dataset.language === language;
    button.classList.toggle("is-active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });
};

const updateLanguageLinks = (language) => {
  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');

    if (!href || !/^(?:index|media|bio|projects|project)\.html(?:[?#]|$)/.test(href)) {
      return;
    }

    const url = new URL(href, window.location.href);
    if (url.pathname.endsWith("/project.html")) {
      const slug = new URLSearchParams(window.location.search).get("slug");
      if (slug) {
        url.searchParams.set("slug", slug);
      }
    }
    url.searchParams.set('lang', link.dataset.language || language);
    link.href = url.href;
  });
};

const updateTitleTypography = (element, value) => {
  if (!element.matches("h1, h2, h3") || typeof value !== "string") {
    return;
  }

  const isLatinTitle = document.documentElement.lang === "zh-Hant"
    && /[A-Za-z]/.test(value)
    && !/[\u3400-\u9fff\uf900-\ufaff]/u.test(value);
  element.classList.toggle("is-latin-title", isLatinTitle);

  if (isLatinTitle) {
    element.lang = "en";
  } else {
    element.removeAttribute("lang");
  }
};

const setContent = (key, value) => {
  if (typeof value !== "string") {
    return;
  }

  document.querySelectorAll(`[data-content="${key}"]`).forEach((element) => {
    element.textContent = value;
    updateTitleTypography(element, value);
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

const setLinkHref = (selector, value) => {
  const link = document.querySelector(selector);

  if (!link || typeof value !== "string" || !value.trim()) {
    return;
  }

  const href = safeUrl(value);
  if (href !== "#" || value.trim() === "#") {
    link.href = href;
  }
};

const makeElement = (tagName, className, text) => {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (typeof text === "string") {
    element.textContent = text;
    updateTitleTypography(element, text);
  }

  return element;
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

const renderBioParagraphs = (paragraphs) => {
  const container = document.querySelector("[data-bio-copy]");

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

const hydrateBioContent = (site) => {
  if (!isBioPage || !site.bio) {
    return;
  }

  if (site.bio.seo?.title) {
    document.title = site.bio.seo.title;
  }

  const description = document.querySelector("[data-bio-seo-description]");
  if (description && site.bio.seo?.description) {
    description.content = site.bio.seo.description;
  }

  document.querySelectorAll("[data-bio-content]").forEach((element) => {
    const value = site.bio[element.dataset.bioContent];
    if (typeof value === "string") {
      element.textContent = value;
      updateTitleTypography(element, value);
    }
  });

  renderBioParagraphs(site.about?.paragraphs);
};

const renderTracks = (tracks, actionLabel = "Watch") => {
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

    const link = makeElement("a", "track-action", actionLabel);
    link.href = safeUrl(track.url);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.setAttribute("aria-label", `${actionLabel} ${track.title}`);

    article.append(copy, link);
    fragment.append(article);
  });

  if (fragment.childNodes.length) {
    container.replaceChildren(fragment);
  }
};

const getProjectUrl = (slug) => {
  if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) {
    return "#";
  }

  const url = new URL("project.html", document.baseURI);
  url.searchParams.set("slug", slug);
  url.searchParams.set("lang", window.siteLanguage || getPreferredLanguage());
  return url.href;
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

    const article = makeElement("a", "project-index-card");
    article.href = getProjectUrl(project.slug);
    const time = makeElement("time", "", project.year || "");
    if (project.year) {
      time.dateTime = project.year;
    }
    const copy = document.createElement("div");
    copy.append(makeElement("h2", "", project.title));
    copy.append(makeElement("p", "", project.description || ""));
    article.append(time, copy, makeElement("span", "project-index-arrow", "↗"));
    fragment.append(article);
  });

  if (fragment.childNodes.length) {
    container.replaceChildren(fragment);
  }
};

const hydrateProjectContent = (site) => {
  if (!isProjectPage) {
    return;
  }

  const slug = body.dataset.projectSlug || new URLSearchParams(window.location.search).get("slug");
  const project = site.projects?.items?.find((item) => item?.slug === slug);
  if (!project) {
    const artistName = site.artist?.name || site.artist?.display_name || "Tzu-Ling Hung";
    document.title = `Project not found | ${artistName}`;
    document.querySelectorAll("[data-project-content=\"year\"]").forEach((element) => {
      element.textContent = "";
    });
    document.querySelectorAll("[data-project-content=\"title\"]").forEach((element) => {
      element.textContent = "Project not found";
    });
    document.querySelectorAll("[data-project-content=\"description\"]").forEach((element) => {
      element.textContent = "This project is unavailable or its address has changed.";
    });
    const bodyCopy = document.querySelector("[data-project-body]");
    if (bodyCopy) {
      bodyCopy.replaceChildren(makeElement("p", "", "Return to the projects page to see the current work."));
    }
    return;
  }

  const artistName = site.artist?.name || site.artist?.display_name || "Tzu-Ling Hung";
  document.title = `${project.title} | ${artistName}`;

  const description = document.querySelector("[data-project-seo-description]");
  if (description && project.description) {
    description.content = project.description;
  }

  document.querySelectorAll("[data-project-content]").forEach((element) => {
    const value = project[element.dataset.projectContent];
    if (typeof value === "string") {
      element.textContent = value;
      updateTitleTypography(element, value);
    }
  });

  const bodyCopy = document.querySelector("[data-project-body]");
  if (bodyCopy && Array.isArray(project.body) && project.body.length) {
    const fragment = document.createDocumentFragment();
    project.body.forEach((paragraph) => {
      if (typeof paragraph === "string" && paragraph.trim()) {
        const blocks = paragraph
          .trim()
          .split(/\r?\n\s*\r?\n/)
          .map((block) => block.trim())
          .filter(Boolean);

        const lines = blocks.flatMap((block) => block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));

        if (lines.length === 1) {
          fragment.append(makeElement("p", "", lines[0]));
          return;
        }

        const groups = blocks.length > 1
          ? blocks.reduce((result, block, index) => {
              if (index % 2 === 0) {
                result.push({ heading: block, items: [] });
              } else {
                result.at(-1).items = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
              }
              return result;
            }, [])
          : [{ heading: lines[0], items: lines.slice(1) }];

        groups.forEach((group) => {
          const section = makeElement("section", "project-copy-group");
          section.append(makeElement("h2", "", group.heading));
          const list = document.createElement("ul");
          group.items.forEach((line) => list.append(makeElement("li", "", line)));
          if (list.childNodes.length) {
            section.append(list);
          }

          fragment.append(section);
        });
      }
    });
    if (fragment.childNodes.length) {
      bodyCopy.replaceChildren(fragment);
    }
  }
};

const hydrateProjectsPageContent = (site) => {
  if (!isProjectsPage || !site.projects) {
    return;
  }

  const artistName = site.artist?.name || site.artist?.display_name || "Tzu-Ling Hung";
  document.title = `${site.projects.heading || "Projects"} | ${artistName}`;

  const description = document.querySelector("[data-projects-seo-description]");
  if (description && site.projects.intro) {
    description.content = site.projects.intro;
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

const hydrateSiteContent = (site, language) => {
  if (!site || typeof site !== "object") {
    return;
  }

  document.documentElement.lang = language === "zh_hant" ? "zh-Hant" : "en";

  if (!isMediaPage && !isBioPage && !isProjectsPage && !isProjectPage && site.seo?.title) {
    document.title = site.seo.title;
  }
  const description = document.querySelector("[data-seo-description]");
  if (!isMediaPage && !isBioPage && description && site.seo?.description) {
    description.content = site.seo.description;
  }

  setContent("artist-name", site.artist?.display_name || site.artist?.name);
  setContent("artist-localized-name", site.artist?.localized_name);
  setContent("artist-role", site.artist?.role);
  setContent("hero-eyebrow", site.hero?.eyebrow);
  setContent("hero-tagline", site.hero?.tagline);
  setContent("hero-primary-cta", site.hero?.primary_cta);
  setContent("hero-secondary-cta", site.hero?.secondary_cta);
  setLinkHref("[data-content=\"hero-primary-cta\"]", site.hero?.primary_cta_url);
  setLinkHref("[data-content=\"hero-secondary-cta\"]", site.hero?.secondary_cta_url);
  setContent("about-heading", site.about?.heading);
  setContent("projects-kicker", site.projects?.kicker);
  setContent("projects-heading", site.projects?.heading);
  setContent("projects-intro", site.projects?.intro);
  setContent("back-to-projects", site.ui?.["back-to-projects"]);
  setContent("statement", site.statement?.text);
  setContent("statement-credit", site.statement?.credit);
  setContent("contact-heading", site.contact?.heading);
  setContent("practice-kicker", site.practice?.kicker);
  setContent("practice-statement", site.practice?.statement);
  setContent("practice-detail", site.practice?.detail);
  Object.entries(site.ui || {}).forEach(([key, value]) => setContent(key, value));

  if (site.artist?.display_name || site.artist?.name) {
    const artistName = site.artist.display_name || site.artist.name;
    const brand = document.querySelector("[data-brand-home]");
    const initials = site.artist.mark || artistName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();

    if (brand) {
      brand.setAttribute("aria-label", `${artistName} home`);
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

  const heroVideos = Array.from(document.querySelectorAll("[data-hero-video]"));
  const heroClips = Array.isArray(site.hero?.video_clips) ? site.hero.video_clips : [];
  heroVideos.forEach((heroVideo, index) => {
    const clip = heroClips[index];

    if (!clip) {
      heroVideo.hidden = true;
      return;
    }

    const clipUrl = new URL(clip, window.location.href).href;
    heroVideo.hidden = false;
    heroVideo.preload = "auto";
    heroVideo.poster = site.hero?.image || heroVideo.poster;
    if (heroVideo.src !== clipUrl) {
      heroVideo.src = clip;
      heroVideo.load();
    }
  });

  if (!heroSequenceStarted && !prefersReducedMotion && heroVideos.length) {
    heroSequenceStarted = true;
    const fadeDurationMs = 280;
    const clipDwellMs = 5800;
    let activeClipIndex = 0;

    const activateHeroClip = (nextIndex) => {
      const previousVideo = heroVideos[activeClipIndex];
      const nextVideo = heroVideos[nextIndex];

      if (previousVideo && previousVideo !== nextVideo) {
        previousVideo.classList.remove("is-active");
        window.setTimeout(() => previousVideo.pause(), fadeDurationMs);
      }

      nextVideo.currentTime = 0;
      nextVideo.play().catch(() => {});
      nextVideo.classList.add("is-active");
      activeClipIndex = nextIndex;
    };

    window.setTimeout(() => {
      activateHeroClip(0);
      window.setInterval(() => {
        activateHeroClip((activeClipIndex + 1) % heroVideos.length);
      }, clipDwellMs);
    }, 4700);
  }

  renderParagraphs(site.about?.paragraphs?.slice(0, 2));
  hydrateBioContent(site);
  renderTracks(site.tracks, site.ui?.watch || "Watch");
  renderProjects(site.projects);
  hydrateProjectsPageContent(site);
  hydrateProjectContent(site);
  renderContact(site.contact);
};

const activateLanguage = (language, shouldPersist = true) => {
  const selectedLanguage = language === "zh_hant" ? "zh_hant" : "en";

  if (shouldPersist) {
    try {
      localStorage.setItem(languageStorageKey, selectedLanguage);
    } catch {
      // Language selection still works if storage is unavailable.
    }
  }

  updateLanguageControls(selectedLanguage);
  updateLanguageLinks(selectedLanguage);
  window.siteLanguage = selectedLanguage;

  try {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", selectedLanguage);
    window.history.replaceState({}, "", url);
  } catch {
    // Content can still hydrate when the page is opened outside a web server.
  }

  if (siteContent) {
    hydrateSiteContent(siteContent[selectedLanguage] || siteContent.en, selectedLanguage);
  }

  window.dispatchEvent(new CustomEvent("site-language-change", { detail: { language: selectedLanguage } }));
};

fetch("content/site.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) {
      throw new Error("Unable to load site content.");
    }
    return response.json();
  })
  .then((content) => {
    siteContent = content;
    activateLanguage(getPreferredLanguage(), false);
  })
  .catch((error) => {
    body.classList.add("content-load-failed");
    console.error("Site content failed to load.", error);
  });

if (!prefersReducedMotion && document.querySelector(".page-intro")) {
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

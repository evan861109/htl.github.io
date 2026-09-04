const body = document.body;
body.classList.add("js-enabled");
const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const pointerField = document.querySelector("[data-pointer-field]");
const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let skipIntro = Boolean(window.location.hash) || prefersReducedMotion;
try {
  skipIntro ||= sessionStorage.getItem("tzuling-intro-seen") === "true";
  if (document.querySelector(".page-intro")) sessionStorage.setItem("tzuling-intro-seen", "true");
} catch {
  // Direct links still skip the intro when storage is unavailable.
}
body.classList.toggle("intro-skipped", skipIntro);
const languageButtons = Array.from(document.querySelectorAll("[data-language]"));
const languageStorageKey = "tzuling-language";
const isMediaPage = body.classList.contains("media-page");
const isBioPage = body.classList.contains("bio-page");
const isProjectsPage = body.classList.contains("projects-page");
const isProjectPage = body.classList.contains("project-page");
const sectionNavItems = navLinks.flatMap((link) => {
  const href = link.getAttribute("href");
  if (!href?.startsWith("#")) {
    return [];
  }

  const section = document.querySelector(href);
  return section ? [{ link, section }] : [];
});
let siteContent;
let heroSequenceStarted = false;
let heroSequenceStartTimer;
let heroSequenceInterval;

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
    if (!href || href.startsWith('#')) {
      return;
    }
    const url = new URL(href, document.baseURI);
    const siteRoot = new URL('.', document.baseURI);
    if (url.origin !== siteRoot.origin || !url.pathname.startsWith(siteRoot.pathname)) return;
    if (!url.pathname.endsWith('.html') && url.pathname !== siteRoot.pathname) return;
    if (link.dataset.language && url.pathname.endsWith("/project.html")) {
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
    const url = new URL(value, document.baseURI);
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

const getImageFocus = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 50;
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

  const portrait = document.querySelector("[data-bio-portrait]");
  const portraitImage = document.querySelector("[data-bio-image]");
  const copyLayout = document.querySelector("[data-bio-copy-layout]");
  const copySection = copyLayout?.closest(".bio-copy-section");
  const hasPortrait = typeof site.bio.image === "string" && site.bio.image.trim();

  if (portrait && portraitImage && copyLayout) {
    portrait.hidden = !hasPortrait;
    copyLayout.classList.toggle("has-bio-image", Boolean(hasPortrait));
    copySection?.classList.toggle("has-bio-image", Boolean(hasPortrait));
    if (hasPortrait) {
      portraitImage.src = site.bio.image;
      portraitImage.alt = typeof site.bio.image_alt === "string" && site.bio.image_alt.trim()
        ? site.bio.image_alt
        : site.bio.title || site.artist?.display_name || "Artist portrait";
      portraitImage.style.objectPosition = `${getImageFocus(site.bio.image_position_x)}% ${getImageFocus(site.bio.image_position_y)}%`;
    } else {
      portraitImage.removeAttribute("src");
      portraitImage.alt = "";
      portraitImage.style.removeProperty("object-position");
    }
  }

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
    const arrow = makeElement("span", "project-index-arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    article.append(time, copy, arrow);
    fragment.append(article);
  });

  if (fragment.childNodes.length) {
    container.replaceChildren(fragment);
  }
};

const getCanonicalProjectSlug = (slug) => ({ hss: "pas-ensemble", treaal: "treeal" })[slug] || slug;

const hydrateProjectContent = (site) => {
  if (!isProjectPage) {
    return;
  }

  const slug = body.dataset.projectSlug || new URLSearchParams(window.location.search).get("slug");
  const project = site.projects?.items?.find((item) => item?.slug === getCanonicalProjectSlug(slug));
  if (!project) {
    const artistName = site.artist?.name || site.artist?.display_name || "Tzu-Ling Hung";
    const chinese = document.documentElement.lang === "zh-Hant";
    const missingTitle = chinese ? "找不到此計畫" : "Project not found";
    document.title = `${missingTitle} | ${artistName}`;
    document.querySelectorAll("[data-project-content=\"year\"]").forEach((element) => {
      element.textContent = "";
    });
    document.querySelectorAll("[data-project-content=\"title\"]").forEach((element) => {
      element.textContent = missingTitle;
    });
    document.querySelectorAll("[data-project-content=\"description\"]").forEach((element) => {
      element.textContent = chinese ? "此計畫目前無法顯示，或網址已變更。" : "This project is unavailable or its address has changed.";
    });
    const bodyCopy = document.querySelector("[data-project-body]");
    if (bodyCopy) {
      bodyCopy.replaceChildren(makeElement("p", "", chinese ? "請返回計畫列表瀏覽目前的作品。" : "Return to the projects page to see the current work."));
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
    fragment.append(makeElement("p", "contact-availability", contact.availability));
  }

  const labels = {
    firstName: contact.form_first_name || "First name",
    lastName: contact.form_last_name || "Last name",
    email: contact.form_email || "Email",
    message: contact.form_message || "Message"
  };
  const recipient = typeof contact.email === "string" ? contact.email.trim() : "";
  const form = makeElement("form", "contact-form");
  form.setAttribute("aria-label", document.documentElement.lang === "zh-Hant" ? "聯絡表單" : "Contact form");
  const nameFields = makeElement("div", "contact-form-grid");

  const makeContactField = (labelText, name, options = {}) => {
    const label = makeElement("label", "contact-field", labelText);
    const field = document.createElement(options.multiline ? "textarea" : "input");
    field.name = name;
    field.required = true;
    if (options.type) field.type = options.type;
    if (options.autocomplete) field.autocomplete = options.autocomplete;
    if (options.multiline) field.rows = 7;
    label.append(field);
    return label;
  };

  nameFields.append(
    makeContactField(labels.firstName, "first_name", { autocomplete: "given-name" }),
    makeContactField(labels.lastName, "last_name", { autocomplete: "family-name" })
  );
  form.append(
    nameFields,
    makeContactField(labels.email, "email", { type: "email", autocomplete: "email" }),
    makeContactField(labels.message, "message", { multiline: true })
  );

  const submit = makeElement("button", "contact-submit", contact.form_submit || "Send message");
  submit.type = "submit";
  submit.disabled = !recipient;
  form.append(submit);

  const deliveryNote = recipient ? contact.form_note : contact.notice;
  if (deliveryNote) {
    const note = makeElement("p", "contact-form-note", recipient ? deliveryNote :
      (document.documentElement.lang === "zh-Hant" ? "目前暫時無法透過此表單聯絡，請稍後再試。" : "This contact form is temporarily unavailable. Please check back soon."));
    note.id = "contact-delivery-note";
    form.prepend(note);
    form.setAttribute("aria-describedby", note.id);
  }
  if (!recipient) form.querySelectorAll("input, textarea").forEach((field) => { field.disabled = true; });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!recipient || !form.reportValidity()) {
      return;
    }

    const values = new FormData(form);
    const firstName = String(values.get("first_name") || "").trim();
    const lastName = String(values.get("last_name") || "").trim();
    const senderEmail = String(values.get("email") || "").trim();
    const message = String(values.get("message") || "").trim();
    const senderName = [firstName, lastName].filter(Boolean).join(" ");
    const subject = `${contact.form_subject || "Website inquiry"} — ${senderName}`;
    const body = `${labels.firstName}: ${firstName}\n${labels.lastName}: ${lastName}\n${labels.email}: ${senderEmail}\n\n${labels.message}:\n${message}`;

    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  fragment.append(form);

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

    if (!clip || prefersReducedMotion) {
      heroVideo.hidden = true;
      return;
    }

    const clipUrl = new URL(clip, document.baseURI).href;
    heroVideo.hidden = false;
    heroVideo.preload = prefersReducedMotion ? "none" : "metadata";
    heroVideo.poster = site.hero?.image || heroVideo.poster;
    if (heroVideo.src !== clipUrl) {
      heroVideo.src = clip;
      heroVideo.load();
    }
  });

  window.clearTimeout(heroSequenceStartTimer);
  window.clearInterval(heroSequenceInterval);
  heroVideos.forEach((video) => {
    video.classList.remove("is-active");
    video.pause();
  });

  const activeHeroVideos = heroVideos.filter((_, index) => Boolean(heroClips[index]));
  const motionToggle = document.querySelector("[data-motion-toggle]");
  if (motionToggle) motionToggle.hidden = prefersReducedMotion || !activeHeroVideos.length;
  if (!prefersReducedMotion && activeHeroVideos.length) {
    const fadeDurationMs = 280;
    const clipDwellMs = 5800;
    let activeClipIndex = 0;
    let paused = false;
    const updateMotionLabel = () => {
      if (!motionToggle) return;
      motionToggle.textContent = language === "zh_hant"
        ? (paused ? "播放背景影片" : "暫停背景影片")
        : (paused ? "Play background video" : "Pause background video");
      motionToggle.setAttribute("aria-pressed", String(paused));
    };

    const activateHeroClip = (nextIndex) => {
      if (paused || document.hidden) return;
      const previousVideo = activeHeroVideos[activeClipIndex];
      const nextVideo = activeHeroVideos[nextIndex];

      if (previousVideo && previousVideo !== nextVideo) {
        previousVideo.classList.remove("is-active");
        window.setTimeout(() => {
          if (previousVideo !== activeHeroVideos[activeClipIndex]) previousVideo.pause();
        }, fadeDurationMs);
      }

      nextVideo.currentTime = 0;
      nextVideo.play().then(() => {
        if (!paused && !document.hidden) nextVideo.classList.add("is-active");
        else nextVideo.pause();
      }).catch(() => nextVideo.classList.remove("is-active"));
      activeClipIndex = nextIndex;
    };

    const startDelayMs = heroSequenceStarted || skipIntro ? 0 : 1200;
    heroSequenceStarted = true;
    heroSequenceStartTimer = window.setTimeout(() => {
      activateHeroClip(0);
      heroSequenceInterval = window.setInterval(() => {
        if (!paused && !document.hidden) activateHeroClip((activeClipIndex + 1) % activeHeroVideos.length);
      }, clipDwellMs);
    }, startDelayMs);
    if (motionToggle) motionToggle.onclick = () => {
      paused = !paused;
      if (paused) activeHeroVideos.forEach((video) => video.pause());
      else activateHeroClip(activeClipIndex);
      updateMotionLabel();
    };
    document.onvisibilitychange = () => {
      if (document.hidden) activeHeroVideos.forEach((video) => video.pause());
      else if (!paused) activateHeroClip(activeClipIndex);
    };
    updateMotionLabel();
  }

  renderParagraphs(site.about?.paragraphs?.slice(0, 2));
  hydrateBioContent(site);
  renderTracks(site.tracks, site.ui?.watch || "Watch");
  renderProjects(site.projects);
  hydrateProjectsPageContent(site);
  hydrateProjectContent(site);
  renderContact(site.contact);
  updateLanguageLinks(language);
  updateAccessibleLabels(language);
};

const updateAccessibleLabels = (language) => {
  const chinese = language === "zh_hant";
  navToggle.setAttribute("aria-label", chinese ? "切換導覽選單" : "Toggle navigation");
  nav.setAttribute("aria-label", chinese ? "主要導覽" : "Main navigation");
  const skip = document.querySelector(".skip-link");
  if (skip) {
    skip.textContent = chinese ? "跳至主要內容" : "Skip to content";
    skip.href = `${window.location.pathname}${window.location.search}#main-content`;
  }
  navLinks.forEach((link) => {
    if (link.classList.contains("is-active")) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
};

const showContentError = () => {
  if (document.querySelector(".content-notice")) return;
  const chinese = getPreferredLanguage() === "zh_hant";
  const notice = makeElement("div", "content-notice");
  notice.setAttribute("role", "status");
  notice.append(makeElement("p", "", chinese ? "部分內容無法載入，請重新整理頁面再試一次。" : "Some content could not load. Please reload the page to try again."));
  const retry = makeElement("button", "button", chinese ? "重新載入" : "Reload page");
  retry.type = "button";
  retry.addEventListener("click", () => window.location.reload());
  notice.append(retry);
  document.querySelector("main").prepend(notice);
};
window.addEventListener("site-content-error", showContentError);

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
    showContentError();
    console.error("Site content failed to load.", error);
  });

if (!skipIntro && document.querySelector(".page-intro")) {
  body.classList.add("is-intro-running");
  window.setTimeout(() => body.classList.remove("is-intro-running"), 1100);
}

const updateHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 18);
};

const updateActiveNavigation = () => {
  if (!sectionNavItems.length) {
    return;
  }

  const activationLine = Math.min(window.innerHeight * 0.32, 280);
  let activeLink = null;

  sectionNavItems.forEach(({ link, section }) => {
    const bounds = section.getBoundingClientRect();
    if (bounds.top <= activationLine && bounds.bottom > activationLine) {
      activeLink = link;
    }
  });

  const documentBottom = document.documentElement.scrollHeight - 2;
  if (!activeLink && window.scrollY + window.innerHeight >= documentBottom) {
    activeLink = sectionNavItems.at(-1)?.link || null;
  }

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link === activeLink);
    if (link === activeLink) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
};

const setMenuOpen = (isOpen) => {
  body.classList.toggle("nav-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
};
navToggle.addEventListener("click", () => setMenuOpen(!body.classList.contains("nav-open")));

nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenuOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && body.classList.contains("nav-open")) {
    setMenuOpen(false);
    navToggle.focus();
  }
});
document.addEventListener("click", (event) => {
  if (!header.contains(event.target)) setMenuOpen(false);
});
document.addEventListener("focusin", (event) => {
  if (!header.contains(event.target)) setMenuOpen(false);
});
window.matchMedia("(min-width: 861px)").addEventListener("change", () => setMenuOpen(false));
updateAccessibleLabels(getPreferredLanguage());

if ("IntersectionObserver" in window) {
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

const updateScrollState = () => {
  updateHeader();
  updateActiveNavigation();
};

updateScrollState();
window.addEventListener("scroll", updateScrollState, { passive: true });

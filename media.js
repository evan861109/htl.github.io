const mediaGrid = document.querySelector("[data-media-grid]");
const mediaFeature = document.querySelector("[data-media-feature]");
let mediaContent;

const getMediaLanguage = () => {
  try {
    return localStorage.getItem("tzuling-language") === "zh_hant" ? "zh_hant" : "en";
  } catch {
    return "en";
  }
};

const mediaSafeUrl = (value) => {
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

const getYoutubeThumbnail = (value) => {
  try {
    const url = new URL(value);
    let id = "";

    if (url.hostname === "youtu.be") {
      id = url.pathname.slice(1);
    } else if (url.hostname.endsWith("youtube.com")) {
      id = url.searchParams.get("v") || "";
    }

    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
  } catch {
    return "";
  }
};

const mediaElement = (tagName, className, text) => {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (typeof text === "string") {
    element.textContent = text;
  }
  return element;
};

const setMediaContent = (key, value) => {
  if (typeof value !== "string") {
    return;
  }

  document.querySelectorAll(`[data-media-content="${key}"]`).forEach((element) => {
    element.textContent = value;
  });
};

const renderMedia = (entries, actionLabel = "Watch") => {
  if (!mediaGrid || !Array.isArray(entries)) {
    return;
  }

  const fragment = document.createDocumentFragment();

  entries.forEach((entry) => {
    if (!entry || typeof entry.title !== "string" || !entry.title.trim()) {
      return;
    }

    const url = mediaSafeUrl(entry.url);
    const thumbnail = entry.thumbnail || getYoutubeThumbnail(entry.url);
    const card = mediaElement("article", "media-card");
    const link = mediaElement("a", "media-thumbnail");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.setAttribute("aria-label", `${actionLabel} ${entry.title}`);

    if (thumbnail) {
      const image = document.createElement("img");
      image.src = thumbnail;
      image.alt = `Video still for ${entry.title}`;
      image.loading = "lazy";
      link.append(image);
    }

    const body = mediaElement("div", "media-card-body");
    body.append(mediaElement("p", "track-meta", entry.category || "Performance video"));
    body.append(mediaElement("h2", "", entry.title));
    body.append(mediaElement("p", "media-credit", entry.credit || ""));
    body.append(mediaElement("p", "media-description", entry.description || ""));

    const action = mediaElement("a", "media-watch", actionLabel);
    action.href = url;
    action.target = "_blank";
    action.rel = "noreferrer";
    action.setAttribute("aria-label", `${actionLabel} ${entry.title}`);
    body.append(action);

    card.append(link, body);
    fragment.append(card);
  });

  mediaGrid.replaceChildren(fragment);
};

const renderFeaturedMedia = (entry, actionLabel = "Watch") => {
  if (!mediaFeature || !entry || typeof entry.title !== "string" || !entry.title.trim()) {
    return;
  }

  const url = mediaSafeUrl(entry.url);
  const thumbnail = entry.thumbnail || getYoutubeThumbnail(entry.url);
  const article = mediaElement("article", "media-feature-card");
  const link = mediaElement("a", "media-feature-image");
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.setAttribute("aria-label", `${actionLabel} ${entry.title}`);

  if (thumbnail) {
    const image = document.createElement("img");
    image.src = thumbnail;
    image.alt = `Video still for ${entry.title}`;
    link.append(image);
  }

  const copy = mediaElement("div", "media-feature-copy");
  copy.append(mediaElement("p", "track-meta", entry.category || "Performance video"));
  copy.append(mediaElement("h3", "", entry.title));
  copy.append(mediaElement("p", "media-credit", entry.credit || ""));
  copy.append(mediaElement("p", "media-description", entry.description || ""));

  const action = mediaElement("a", "media-watch", actionLabel);
  action.href = url;
  action.target = "_blank";
  action.rel = "noreferrer";
  action.setAttribute("aria-label", `${actionLabel} ${entry.title}`);
  copy.append(action);

  article.append(link, copy);
  mediaFeature.replaceChildren(article);
};

const hydrateMediaContent = (content, language) => {
  const media = content[language] || content.en;

  if (!media) {
    return;
  }

  document.documentElement.lang = language === "zh_hant" ? "zh-Hant" : "en";

  if (media.seo?.title) {
    document.title = media.seo.title;
  }
  const description = document.querySelector("[data-media-seo-description]");
  if (description && media.seo?.description) {
    description.content = media.seo.description;
  }

  setMediaContent("hero-eyebrow", media.hero?.eyebrow);
  setMediaContent("hero-title", media.hero?.title);
  setMediaContent("hero-description", media.hero?.description);
  Object.entries(media.ui || {}).forEach(([key, value]) => setMediaContent(key, value));

  const heroImage = document.querySelector("[data-media-hero-image]");
  if (heroImage && media.hero?.image) {
    heroImage.src = media.hero.image;
    heroImage.alt = media.hero.image_alt || "Percussion detail";
  }

  const actionLabel = media.ui?.watch || "Watch";
  renderFeaturedMedia(media.featured, actionLabel);
  renderMedia(media.entries, actionLabel);
};

window.addEventListener("site-language-change", (event) => {
  if (mediaContent) {
    hydrateMediaContent(mediaContent, event.detail.language);
  }
});

fetch("content/media.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) {
      throw new Error("Unable to load media.");
    }
    return response.json();
  })
  .then((content) => {
    mediaContent = content;
    hydrateMediaContent(content, window.siteLanguage || getMediaLanguage());
  })
  .catch((error) => {
    document.body.classList.add("content-load-failed");
    console.error("Media content failed to load.", error);
  });

import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const fail = (message) => errors.push(message);
const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const valueAt = (object, keyPath) => keyPath.split(".").reduce((value, key) => value?.[key], object);

const requireString = (object, keyPath, label = keyPath) => {
  const value = valueAt(object, keyPath);
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} must be a non-empty string`);
  }
};

const requireUrl = (value, label, { internal = false } = {}) => {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} must be a non-empty URL`);
    return;
  }

  if (internal && (/^(?:#|(?:index|bio|media|projects|project)\.html(?:[?#]|$))/.test(value))) {
    return;
  }

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      fail(`${label} uses unsupported protocol ${url.protocol}`);
    }
  } catch {
    fail(`${label} must be an HTTP(S) URL${internal ? " or a valid site-relative link" : ""}`);
  }
};

const requireAsset = async (value, label) => {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} must reference an asset`);
    return;
  }

  if (/^https?:\/\//.test(value)) {
    return;
  }

  const assetPath = path.resolve(root, value);
  if (!assetPath.startsWith(`${root}${path.sep}`)) {
    fail(`${label} points outside the repository`);
    return;
  }

  try {
    await access(assetPath);
  } catch {
    fail(`${label} references missing file ${value}`);
  }
};

const readJson = async (relativePath) => {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
    return {};
  }
};

const validateLanguages = (content, label) => {
  for (const language of ["en", "zh_hant"]) {
    if (!isObject(content[language])) {
      fail(`${label}.${language} must be an object`);
    }
  }
};

const validateSite = async (site) => {
  validateLanguages(site, "site");
  const slugSets = {};

  for (const language of ["en", "zh_hant"]) {
    const content = site[language] || {};
    const prefix = `site.${language}`;
    for (const keyPath of [
      "seo.title", "seo.description", "artist.name", "artist.display_name", "artist.mark", "artist.role",
      "hero.image", "hero.image_alt", "hero.eyebrow", "hero.tagline", "hero.primary_cta", "hero.primary_cta_url",
      "hero.secondary_cta", "hero.secondary_cta_url", "practice.kicker", "practice.statement", "practice.detail",
      "about.heading", "bio.seo.title", "bio.seo.description", "bio.kicker", "bio.title", "bio.intro",
      "projects.kicker", "projects.heading", "projects.intro", "statement.text", "statement.credit",
      "contact.heading", "contact.availability"
    ]) {
      requireString(content, keyPath, `${prefix}.${keyPath}`);
    }

    await requireAsset(content.hero?.image, `${prefix}.hero.image`);
    const clips = content.hero?.video_clips;
    if (clips !== undefined && (!Array.isArray(clips) || clips.length > 3)) {
      fail(`${prefix}.hero.video_clips must contain at most 3 items`);
    } else {
      for (const [index, clip] of (clips || []).entries()) {
        await requireAsset(clip, `${prefix}.hero.video_clips[${index}]`);
      }
    }

    requireUrl(content.hero?.primary_cta_url, `${prefix}.hero.primary_cta_url`, { internal: true });
    requireUrl(content.hero?.secondary_cta_url, `${prefix}.hero.secondary_cta_url`, { internal: true });

    if (!Array.isArray(content.about?.paragraphs) || !content.about.paragraphs.length) {
      fail(`${prefix}.about.paragraphs must contain at least one paragraph`);
    }

    if (!Array.isArray(content.tracks) || !content.tracks.length) {
      fail(`${prefix}.tracks must contain at least one entry`);
    } else {
      content.tracks.forEach((track, index) => {
        for (const key of ["meta", "title", "note"]) {
          if (typeof track?.[key] !== "string" || !track[key].trim()) fail(`${prefix}.tracks[${index}].${key} is required`);
        }
        requireUrl(track?.url, `${prefix}.tracks[${index}].url`);
      });
    }

    const projects = content.projects?.items;
    if (!Array.isArray(projects) || !projects.length) {
      fail(`${prefix}.projects.items must contain at least one project`);
      slugSets[language] = [];
    } else {
      const slugs = [];
      projects.forEach((project, index) => {
        const projectPrefix = `${prefix}.projects.items[${index}]`;
        if (typeof project?.slug !== "string" || !/^[a-z0-9-]+$/.test(project.slug)) {
          fail(`${projectPrefix}.slug must use lowercase letters, numbers, and hyphens only`);
        } else if (slugs.includes(project.slug)) {
          fail(`${projectPrefix}.slug duplicates ${project.slug}`);
        } else {
          slugs.push(project.slug);
        }
        for (const key of ["year", "title", "description"]) {
          if (typeof project?.[key] !== "string" || !project[key].trim()) fail(`${projectPrefix}.${key} is required`);
        }
        if (!Array.isArray(project?.body) || !project.body.length || project.body.some((item) => typeof item !== "string" || !item.trim())) {
          fail(`${projectPrefix}.body must contain non-empty text entries`);
        }
      });
      slugSets[language] = slugs.sort();
    }
  }

  if (JSON.stringify(slugSets.en) !== JSON.stringify(slugSets.zh_hant)) {
    fail("English and Traditional Chinese project slugs must match");
  }
};

const validateMedia = async (media) => {
  validateLanguages(media, "media");
  for (const language of ["en", "zh_hant"]) {
    const content = media[language] || {};
    const prefix = `media.${language}`;
    for (const keyPath of ["seo.title", "seo.description", "hero.image", "hero.image_alt", "hero.eyebrow", "hero.title", "hero.description", "featured.title", "featured.url"]) {
      if (typeof valueAt(content, keyPath) !== "string" || !valueAt(content, keyPath).trim()) fail(`${prefix}.${keyPath} is required`);
    }
    await requireAsset(content.hero?.image, `${prefix}.hero.image`);
    if (content.featured?.thumbnail) await requireAsset(content.featured.thumbnail, `${prefix}.featured.thumbnail`);
    requireUrl(content.featured?.url, `${prefix}.featured.url`);
    if (!Array.isArray(content.entries) || !content.entries.length) {
      fail(`${prefix}.entries must contain at least one entry`);
    } else {
      for (const [index, entry] of content.entries.entries()) {
        if (typeof entry?.title !== "string" || !entry.title.trim()) fail(`${prefix}.entries[${index}].title is required`);
        requireUrl(entry?.url, `${prefix}.entries[${index}].url`);
        if (entry?.thumbnail) await requireAsset(entry.thumbnail, `${prefix}.entries[${index}].thumbnail`);
      }
    }
  }
};

const validateHtmlReferences = async () => {
  const projectFiles = (await readdir(path.join(root, "projects"))).filter((name) => name.endsWith(".html")).map((name) => `projects/${name}`);
  const htmlFiles = ["index.html", "bio.html", "media.html", "projects.html", "project.html", ...projectFiles];

  for (const relativePath of htmlFiles) {
    const html = await readFile(path.join(root, relativePath), "utf8");
    const base = html.match(/<base\s+href="([^"]+)"/)?.[1] || "";
    const htmlWithoutBase = html.replace(/<base\s+href="[^"]+"\s*>/g, "");
    const references = [...htmlWithoutBase.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
    for (const reference of references) {
      if (/^(?:https?:|mailto:|data:|#|\?)/.test(reference)) continue;
      const clean = reference.split(/[?#]/)[0];
      const resolved = path.resolve(root, path.dirname(relativePath), base, clean);
      if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
        fail(`${relativePath} references a path outside the repository: ${reference}`);
        continue;
      }
      try {
        await access(resolved);
      } catch {
        fail(`${relativePath} references missing file ${reference}`);
      }
    }
  }
};

const validateLanguageControls = async () => {
  const script = await readFile(path.join(root, "script.js"), "utf8");
  if (!script.includes("link.dataset.language || language")) {
    fail("Language link hydration must preserve each switch control's target language");
  }
  const projectTemplate = await readFile(path.join(root, "project.html"), "utf8");
  if (!projectTemplate.includes("data-language=\"en\"") || !projectTemplate.includes("data-language=\"zh_hant\"")) {
    fail("project.html must expose both language controls");
  }
};

const site = await readJson("content/site.json");
const media = await readJson("content/media.json");
await validateSite(site);
await validateMedia(media);
await validateHtmlReferences();
await validateLanguageControls();

if (errors.length) {
  console.error(`Content validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log("Content, assets, project routes, and HTML references are valid.");
}

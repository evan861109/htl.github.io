# Tzu-Ling Hung

Static GitHub Pages website for percussionist, chamber musician, and composer Tzu-Ling Hung.

## Editing the site

Artist-facing content lives in `content/site.json` and `content/media.json`. Each file holds separate English and Traditional Chinese content. The pages read these files at runtime, so the visual design and animation code stay separate from the editable biography, featured videos, media archive, projects, links, and contact details.

The included `.pages.yml` file configures Pages CMS as a form-based editor for that content.

### One-time owner setup

1. Open [Pages CMS](https://app.pagescms.org/) and sign in with the GitHub account that owns this repository.
2. Install the Pages CMS GitHub App and grant it access to this repository only.
3. Open this repository in Pages CMS. It will detect `.pages.yml` and show **Homepage content** and **Media library** editors, each with English and Traditional Chinese sections.
4. Invite Tzu-Ling as a collaborator from Pages CMS. She can edit content and media without GitHub or coding access.

Every save creates a Git commit, and GitHub Pages publishes the update automatically. Do not edit `.pages.yml`, `index.html`, `styles.css`, or `script.js` from the CMS.

The biography portrait is optional and can be uploaded under **Homepage content → Biography page**. Use the horizontal and vertical focus percentages there to choose which part remains visible in the portrait frame. The contact form uses the **Booking email** under **Homepage content → Contact** to open a pre-addressed email draft. The address is not rendered as visible page text.

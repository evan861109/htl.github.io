# Website usability and visual review

Reviewed September 4, 2026. This records the review and verification performed before publishing.

## Adjustments

- Adjusted the homepage intro to roughly four seconds, with the name and role fully readable for about 2.4 seconds, with no intro for direct section links or subsequent homepage visits in the same session.
- Added background-video pause/resume, paused playback in hidden tabs, and avoided loading clips for reduced-motion visitors.
- Fixed the mobile stylesheet displaying a different video from the one actually playing.
- Added named navigation controls, Escape-to-close, focus restoration, automatic menu closure when focus leaves the header, and menu reset at the desktop breakpoint. Closed mobile navigation is hidden from keyboard navigation.
- Added skip links, visible keyboard focus, current-page announcements, larger language targets, and basic navigation when JavaScript is disabled.
- Preserved the selected language on CMS-populated buttons and nested project routes; language changes keep the current project slug.
- Reduced oversized page-introduction spacing and contact-heading size. Aligned the biography link with its text column, increased media-header label contrast, added video play indicators, and removed the shifting project-card hover layout.
- Added a matching TLH favicon and corrected the project-list heading font token.
- Moved email-delivery guidance ahead of contact inputs. Unconfigured forms disable editing and show visitor-facing availability text.
- Added content-load recovery messages, localized missing-project messages, and thumbnail support for YouTube Shorts, embed, and live URLs.
- Documented the hosted CMS image-upload size workaround and the distinction between uploading an image and selecting/saving it in a page.

## Verification

- JavaScript syntax checks: passed.
- Existing content, assets, route references, localization, typography, CMS-managed features, and build-contract checks: passed.
- Fifteen Node behavior regression tests: passed; included in `npm test` for future CI runs.
- Fingerprinted production build: passed.
- Browser checks of the built artifact: 48 combinations across eight routes, English/Traditional Chinese, and widths of 320, 768, and 1280 pixels. No horizontal overflow, content-load notice, or multiple/missing primary headings detected.
- Desktop and mobile visual inspection of the homepage, biography, projects, project details, and media. Biography image decoded successfully; media thumbnails and play indicators rendered.
- Browser interaction checks: menu opening and Escape closure, video pause, project language switching, contact-link positioning, and native required-field validation. Email-draft formatting tested without sending mail.

## Limits and remaining considerations

- Ruby is not installed in this environment, so the unchanged Ruby CMS schema validator could not be run locally. It remains a required step in the existing GitHub workflow.
- These checks cover the available Chromium browser; they do not guarantee identical behavior on every browser or device. Reduced-motion and missing-recipient behavior are covered by behavior tests, rather than a physical device accessibility-settings test.
- The hosted CMS large-file upload issue remains external to this website. Compress image uploads below 3 MB; 1–2 MB is preferable.
- Before publishing, the latest artist CMS updates were incorporated, including the new biography portrait.
- Contact delivery requires the visitor's configured email application. The website opens a draft rather than sending email itself.
- Before publishing, two mismatched Traditional Chinese project slugs were aligned with their English counterparts. Alternate `hss` and `treaal` addresses remain supported. Artist copy, uploaded images, and `.pages.yml` were preserved.

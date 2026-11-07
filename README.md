# GujPsychSurvey (ગુજસાયકસર્વે)

> **Moderated, Public Directory of Psychiatry & Mental Health Research Surveys and Validated Scales across Gujarat and India**

GujPsychSurvey is a static, lightweight, academic discovery repository modeled in the spirit of platforms like *PsyToolkit*. It bridges institutional investigators, resident researchers, and voluntary study participants without ever collecting or hosting participant responses. Every survey links out to an external platform (e.g. Google Forms, REDCap, Qualtrics, MS Forms, KoboToolbox) and requires certified Institutional Ethics Committee (IEC) clearance.

---

## 1. Project Purpose & Architecture

- **Zero Backend, Zero Database, Zero Build Step:** Built with standard vanilla HTML5, Tailwind CSS (via CDN), and modern JavaScript (ES2020).
- **GitHub Pages Ready:** Operates seamlessly on both default GitHub Pages subpaths (`https://username.github.io/repo-name/`) and apex/subdomain custom domains (`https://surveys.gujpsych.org/`).
- **Strictly Light Theme:** Clean, clinical, and accessible palette (#FFFFFF, #F8FAFC, #EEF2FF, #1E3A8A, #0F172A) compliant with WCAG AA contrast standards.
- **Trilingual (i18n):** Complete UI chrome, navigation, disclaimers, and form labels in **English**, **Gujarati (ગુજરાતી)**, and **Hindi (हिन्दी)**.
- **Privacy First (DPDP Aware):** No tracking cookies, no surveillance pixels, zero data harvesting. `localStorage` is used solely for language selection and local unsubmitted draft persistence.

---

## 2. Social Sharing & Link Previews (Rich Share Cards)

Every page includes static, pre-configured OpenGraph and Twitter card meta tags in its `<head>` for rich previews when shared on **WhatsApp**, **Telegram**, **LinkedIn**, **X (Twitter)**, **Facebook**, **Slack**, **Gmail**, and **iMessage**.

### Why Static Meta Tags in `<head>` Matter
Social media bots, chat crawlers, and link preview scrapers (WhatsApp, LinkedIn, TwitterBot, FacebookExternalHit) **do not run client-side JavaScript**. If meta tags are injected dynamically via JavaScript, crawlers see an empty card or fall back to generic domain snippets. For this reason, all canonical URLs, OpenGraph properties, Twitter cards, and Schema.org JSON-LD scripts are written literally inside each HTML file's `<head>`.

### The Central Replacement Token
All `<head>` meta tags and `sitemap.xml` / `robots.txt` use a single central token:

```
https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO-NAME/
```

*(Note: Ensure the URL ends with a trailing slash `/`).*

Before pushing to production, perform **one single find-and-replace** across the project:
1. Search for: `https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO-NAME/`
2. Replace with your actual GitHub Pages URL (e.g., `https://dr-patel.github.io/gujpsych-survey/`) OR your custom domain (e.g., `https://surveys.gujpsych.org/`).
3. Update `"siteUrl"` in `data/config.json`.

Files affected by this single find-and-replace:
- `index.html`, `active.html`, `archived.html`, `scales.html`, `submit.html`, `awareness.html`, `gethelp.html`, `maintainer.html`, `404.html`
- `sitemap.xml`, `robots.txt`, `data/config.json`

### Visual Assets & Generating Real PNGs
The repository includes:
- `assets/og-image.svg`: Master 1200x630 vector graphic styled in the light theme palette with IEC verification badge, brain emblem, typography, and Gujarati tagline.
- `assets/favicon.svg`: Vector icon for modern high-DPI displays.
- `assets/og-image.png`: 1200x630 PNG card for scrapers that do not parse SVG.
- `assets/favicon-32.png`: 32x32 raster favicon.
- `assets/apple-touch-icon.png`: 180x180 iOS home screen icon.
- `manifest.webmanifest`: Progressive web application manifest.

#### Re-rendering PNGs with the Client-Side Exporter
If you modify `assets/og-image.svg` (for instance, to update your institution's logo or colors):
1. Open `dev/export-og-image.html` in any web browser.
2. Click **"🚀 Export All PNG Assets"**.
3. Save the downloaded `og-image.png`, `apple-touch-icon.png`, and `favicon-32.png` into the `assets/` folder.
4. Commit and push to GitHub.

### Direct Survey Deep-Linking (`?ref=`)
Participants and researchers can share links to specific active studies using the `?ref=` query parameter:
```
https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO-NAME/active.html?ref=GUJ-PSY-2026-001
```
When opened, the page automatically:
1. Clears conflicting filters so the survey is visible.
2. Smoothly scrolls the target survey into view.
3. Applies an animated indigo highlight focus ring.
4. Alerts the user with a notification toast.

Clicking the **"Share"** button on any survey card or table row automatically copies this exact URL to the clipboard.

### Testing Social Link Previews
Before distributing publicly, verify how your link looks across platforms:
- **LinkedIn:** [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) (enter URL and click Inspect).
- **Facebook & WhatsApp:** [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) (enter URL and click Scrape Again).
- **Twitter / X:** Share in a private DM or test via [Card Validator](https://cards-dev.twitter.com/validator).
- **Telegram:** Send the link to `@WebpageBot` on Telegram to purge any cached preview.

---

## 3. GitHub Pages Deployment Guide

### Option A: Standard GitHub Pages (`username.github.io/repo-name/`)
1. Create a public repository on GitHub (e.g. `gujpsych-survey`).
2. Push all project files to the `main` branch.
   *(Note: The `/.nojekyll` file included in this repository prevents GitHub Pages from ignoring folders or files).*
3. On GitHub, open your repository &rarr; **Settings** &rarr; **Pages**.
4. Under **Build and deployment**:
   - **Source:** Deploy from a branch.
   - **Branch:** `main` / `root`.
5. Check **Enforce HTTPS**.
6. Within 60 seconds, your site will be live at:
   `https://<your-username>.github.io/<your-repo-name>/`

### Option B: Custom Domain (e.g., `surveys.gujpsych.org`)
1. Add a `CNAME` file in the repository root containing your domain:
   ```
   surveys.gujpsych.org
   ```
2. Configure DNS records with your registrar/DNS provider (Cloudflare, Namecheap, GoDaddy):
   - For subdomain (`surveys.gujpsych.org`): Add a `CNAME` record pointing to `<your-username>.github.io`.
   - For apex domain (`gujpsych.org`): Add `A` records pointing to GitHub Pages IPs:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```
3. In GitHub repository &rarr; **Settings** &rarr; **Pages** &rarr; **Custom domain**, enter your domain and check **Enforce HTTPS**.

---

## 4. Local Development

Because header and footer partials (`nav.html`, `footer.html`) and data files are fetched asynchronously, run a local web server:

```bash
# Python 3 (built into macOS and Linux)
python3 -m http.server 8000

# or Node.js npx
npx serve .
```

Open `http://localhost:8000/` in your browser.

---

## 5. Moderator Guide & Publishing Studies

A human moderator reviews every protocol submission before publication.

### Step 1: Receiving a Protocol Submission
Submissions arrive via email (or directly into your Google Sheet if Google Form mode is enabled in `data/config.json`). The email contains the study synopsis, IEC details, and a JSON block.

### Step 2: 4-Pillar Ethics Verification Checklist
Before listing any study:
1. **Institutional Affiliation:** Verify PI's departmental credentials and institutional email address.
2. **Valid IEC Clearance:** Confirm the Institutional Ethics Committee certificate has an active registration number (`ECR/...`), matching study title, authorized signatures, and unexpired validity.
3. **Questionnaire Safety Audit:** Open the external survey URL:
   - Screen 1 must present Informed Consent & Participant Information Sheet.
   - No financial requests, passwords, OTPs, or commercial solicitations.
4. **Vernacular Fidelity:** Ensure Gujarati and Hindi translations are grammatically sound and culturally appropriate.

### Step 3: Publishing to `data/surveys.json`
1. Open `data/surveys.json`.
2. Add the verified protocol record into the JSON array.
3. Set `"status": "active"`.
4. Commit and push. GitHub Pages redeploys automatically within ~60 seconds.

### Step 4: Archiving Concluded Studies
When data collection is completed:
- Set `"status": "archived"` in `data/surveys.json`.
- The survey automatically relocates to `archived.html` and the direct link button is replaced with the closed date.

### Step 5: Updating Scales Reference
To add psychological instruments or link Gujarati/Hindi validation papers:
- Edit `data/scales.json` and push to repository.

---

## 6. Pre-Launch Checklist

Before sharing publicly, verify:
- [ ] Replace `https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO-NAME/` with your live URL in `<head>` tags, `sitemap.xml`, and `robots.txt`.
- [ ] Set `"siteUrl"` in `data/config.json`.
- [ ] In `data/config.json`, update maintainer name, department, and contact email.
- [ ] Set `"isSampleData": false` once you replace seed records with real institutional protocols.
- [ ] Test the link in the [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) and WhatsApp to confirm the card renders properly.

---

## 7. License & Credits

Licensed under the Apache-2.0 License. Designed to advance psychiatric residency training, clinical psychology investigations, and ethical public health science across Gujarat and India.

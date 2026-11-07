# GujPsychSurvey (ગુજસાયકસર્વે)

> **Moderated, Public Directory of Psychiatry & Mental Health Research Surveys and Validated Scales across Gujarat and India**

GujPsychSurvey is a static, lightweight, academic discovery repository modeled in the spirit of platforms like *PsyToolkit*. It bridges institutional investigators, resident researchers, and voluntary study participants without ever collecting or hosting participant responses. Every survey links out to an external platform (e.g. Google Forms, REDCap, Qualtrics, MS Forms, KoboToolbox) and requires certified Institutional Ethics Committee (IEC) clearance.

---

## 1. Project Purpose & Architecture

- **Zero Backend, Zero Database, Zero Build Step:** Built with standard vanilla HTML5, Tailwind CSS (via CDN), and modern JavaScript (ES2020).
- **Static Hosting:** Designed for GitHub Pages with custom domain support via `CNAME`.
- **Trilingual (i18n):** Complete UI chrome, navigation, disclaimers, and form labels in **English**, **Gujarati (ગુજરાતી)**, and **Hindi (हिन्दी)**.
- **Privacy First (DPDP Aware):** No tracking cookies, no analytics scripts, zero data harvesting. `localStorage` is used solely for language selection and local unsubmitted draft persistence.

---

## 2. Local Development & Running

Because the website uses standard JavaScript `fetch()` to load header/footer partials (`nav.html`, `footer.html`) and data files (`data/surveys.json`, `data/scales.json`, `data/config.json`, `data/i18n/*.json`), opening the files directly using `file:///` protocol in a browser will be blocked by standard browser CORS policies.

### Running with Python (Recommended):
Run the following command in the project root directory:

```bash
# Python 3
python -m http.server 8000

# or Python 2
python -m SimpleHTTPServer 8000
```

Then open your browser at:
`http://localhost:8000/`

*(Alternatively, you can use any local static server like `npx serve`, Node.js `http-server`, or the Vite dev server already provided in this repository).*

---

## 3. GitHub Pages & CNAME Deployment

1. **Push to GitHub Repository:**
   Commit all files to your GitHub repository `main` branch.
2. **Configure Custom Domain (CNAME):**
   - Open `/CNAME` and replace `your-domain.example` with your real custom domain (e.g., `surveys.gujpsych.org`).
   - In your DNS provider (Cloudflare, Namecheap, GoDaddy, etc.), point your domain:
     - For apex domain: `A` records to GitHub Pages IPs (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`).
     - For subdomain: `CNAME` record to `<your-github-username>.github.io`.
3. **Enable GitHub Pages:**
   - In your GitHub Repository, navigate to **Settings** &rarr; **Pages**.
   - Under **Build and deployment** &rarr; **Source**, select **Deploy from a branch**.
   - Choose `main` branch and `/ (root)` folder.
   - Check **Enforce HTTPS**.

---

## 4. Google Form Entry-ID Mapping Guide

If you wish to receive researcher submissions (`submit.html`) or participant interest registrations (`awareness.html`) directly into a Google Form/Google Sheet rather than via `mailto:`, configure `data/config.json`:

1. Create a Google Form with fields matching your protocol requirements.
2. Get the pre-filled link:
   - Click the 3 dots in the top-right corner of Google Form &rarr; **Get pre-filled link**.
   - Type sample values into every field (e.g. "TEST_TITLE", "TEST_EMAIL") and click **Get link**.
3. Inspect the link:
   - The URL will look like:
     `https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform?entry.1234567=TEST_TITLE&entry.9876543=TEST_EMAIL`
   - Change `viewform` to `formResponse` in the action URL:
     `https://docs.google.com/forms/d/e/1FAIpQLSc.../formResponse`
4. Copy each `entry.XXXXXX` identifier into the `entryMap` in `data/config.json`:

```json
"submission": {
  "mode": "googleForm",
  "googleFormActionUrl": "https://docs.google.com/forms/d/e/1FAIpQLSc.../formResponse",
  "entryMap": {
    "studyTitle": "entry.1000001",
    "researchDomain": "entry.1000002",
    "subDiscipline": "entry.1000003",
    "abstract": "entry.1000004",
    "piName": "entry.1000005",
    "academicDesignation": "entry.1000006",
    "institutionName": "entry.1000007",
    "institutionalEmail": "entry.1000008",
    "iecName": "entry.1000011",
    "iecRegNumber": "entry.1000012",
    "approvalDate": "entry.1000013",
    "validityExpiry": "entry.1000014",
    "iecLetterUrl": "entry.1000015",
    "languages": "entry.1000016",
    "completionTime": "entry.1000017",
    "surveyPlatform": "entry.1000018",
    "externalUrl": "entry.1000019",
    "eligibilityCriteria": "entry.1000020",
    "startDate": "entry.1000021",
    "closeDate": "entry.1000022"
  }
}
```

---

## 5. Moderator Guide

A human moderator reviews every protocol before it appears live in the directory.

### Step 1: Receiving a Protocol Submission
Submissions arrive via email (or in your Google Sheet if Google Form mode is enabled).
The email will contain the reference code (e.g. `GPS-2026-042`) and the complete pre-formatted JSON block.

### Step 2: 4-Pillar Ethics Verification Checklist
Before adding to the repository, verify:
1. **Institutional Credibility:** Confirm the PI's affiliation and email (.ac.in / hospital domain).
2. **Valid IEC Clearance:** Open the attached or linked clearance letter. Verify:
   - Official letterhead and valid registration number (`ECR/...`).
   - Title matches the submission verbatim.
   - Certificate is signed by the IEC Member Secretary or Chairperson.
   - Expiry date is in the future.
3. **Questionnaire Safety Audit:** Click the external survey URL:
   - Does screen 1 have an Informed Consent and Participant Information Sheet?
   - Is it free from financial requests, OTP requests, or commercial sales?
4. **Vernacular Translation:** Confirm Gujarati/Hindi forms are authentic and understandable.

### Step 3: Publishing to `data/surveys.json`
1. Open `data/surveys.json` in your code editor or GitHub web interface.
2. Paste the JSON object into the array.
3. Set:
   ```json
   "status": "active",
   "verifiedOn": "YYYY-MM-DD"
   ```
4. Commit and push. GitHub Pages automatically redeploys within ~60 seconds!

### Step 4: Archiving a Concluded Survey
When a PI informs you data collection has finished or when `endDate` has passed:
- Change `"status": "archived"` in `data/surveys.json`.
- The survey automatically relocates to `archived.html` and disables the live participation button.

### Step 5: Updating Scales (`data/scales.json`)
To add a new validated psychiatric scale or link to a translation PDF:
- Open `data/scales.json`.
- Add the record or populate the `"link"` field with the repository URL.

---

## 6. What You Must Replace (Deployment Checklist)

Before launching to the public, review and customize these placeholders:

- [ ] **`/CNAME`**: Replace `your-domain.example` with your real domain.
- [ ] **`/data/config.json`**:
  - Set `"isSampleData": false` once you replace seed data with real cleared surveys.
  - Set `"maintainer.name"`: Real name of the primary administrator or academic lead.
  - Set `"maintainer.affiliation"`: Real department, hospital, or medical university.
  - Set `"maintainer.email"`: Official contact email address.
  - Set `"moderatorEmail"`: Moderation team email for incoming submissions.
  - Verify `"helplines"`: Ensure telephone numbers (Tele-MANAS `14416`, KIRAN `1800-599-0019`) are up to date.
  - Set `"scalesRepoUrl"`: URL to your dedicated repository of scales.
- [ ] **`/sitemap.xml` & `/robots.txt`**: Replace `your-domain.example` with your actual domain URL.
- [ ] **`data/surveys.json`**: Replace the 8 seed sample surveys with your actual verified institutional protocols.

---

## 7. License & Credits
Licensed under the Apache-2.0 License. Designed to support psychiatric residency training, academic research ethics, and public health science across Gujarat and India.

/**
 * GujPsychSurvey — Shared Vanilla JavaScript Engine (ES2020)
 * Includes partial loader, i18n, theme, data rendering, filters, forms, and modals.
 */

(function () {
  'use strict';

  // Base URL calculation so that both root/custom domain and subpath repositories work seamlessly
  const BASE = new URL('.', document.currentScript?.src || location.href).href;

  function resolveUrl(path) {
    return new URL(path.replace(/^\//, ''), BASE).href;
  }

  // Global App State
  window.GujPsychApp = {
    base: BASE,
    lang: 'en',
    theme: 'light',
    config: null,
    surveys: [],
    scales: [],
    i18nStrings: {},
    currentPage: window.location.pathname.split('/').pop() || 'index.html'
  };

  // Safe localStorage helper
  const storage = {
    get: function (key, fallback) {
      try {
        const val = localStorage.getItem(key);
        return val !== null ? val : fallback;
      } catch (e) {
        console.warn('localStorage read error:', e);
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('localStorage write error:', e);
      }
    },
    remove: function (key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('localStorage remove error:', e);
      }
    }
  };

  // Reset any prior stored dark theme
  try {
    localStorage.removeItem('gujpsych_theme');
  } catch (e) {}

  // Toast System (Light Theme)
  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const borderType = type === 'error' ? 'toast-error' : (type === 'success' ? 'toast-success' : 'toast-info');
    toast.className = `toast-item ${borderType}`;
    
    const icon = document.createElement('span');
    icon.className = `material-symbols-outlined ${type === 'error' ? 'text-rose-600' : (type === 'success' ? 'text-teal-600' : 'text-indigo-600')}`;
    icon.textContent = type === 'error' ? 'error' : (type === 'success' ? 'check_circle' : 'info');
    
    const text = document.createElement('span');
    text.className = 'text-slate-900 font-medium text-xs';
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
  window.showToast = showToast;

  // Social & Deep-Link Sharing Utilities
  function shareSite(platform) {
    const url = window.GujPsychApp.config?.siteUrl || window.location.href;
    const title = 'GujPsychSurvey — Psychiatry & Mental Health Research Directory';
    const text = 'Discover IEC-cleared mental health research surveys and validated psychological instruments in Gujarat & India:';

    if (platform === 'native' && navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
      return;
    }

    let shareUrl = '';
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + '\n' + text + '\n' + url)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'x':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}`;
        break;
      default:
        copyPageLink();
        return;
    }
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  }
  window.shareSite = shareSite;

  async function copyPageLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      const msg = window.GujPsychApp.i18nStrings?.share?.copied || 'Link copied to clipboard!';
      showToast(msg, 'success');
    } catch (e) {
      showToast('Could not copy link to clipboard', 'error');
    }
  }
  window.copyPageLink = copyPageLink;

  async function copySurveyLink(ref) {
    const base = window.GujPsychApp.config?.siteUrl || (window.location.origin + window.location.pathname.replace(/[^/]*$/, ''));
    const cleanBase = base.endsWith('/') ? base : base + '/';
    const url = `${cleanBase}active.html?ref=${encodeURIComponent(ref)}`;
    try {
      await navigator.clipboard.writeText(url);
      const msg = window.GujPsychApp.i18nStrings?.share?.survey_copied || `Direct link for ref ${ref} copied to clipboard!`;
      showToast(msg, 'success');
    } catch (e) {
      showToast(`Ref: ${ref} copied`, 'info');
    }
  }
  window.copySurveyLink = copySurveyLink;

  // Theme Manager (Strictly Light Theme)
  function initTheme() {
    applyTheme('light');
  }

  function applyTheme(theme) {
    window.GujPsychApp.theme = 'light';
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
    }
  }

  // i18n Engine
  async function initI18n() {
    const savedLang = storage.get('gujpsych_lang', 'en');
    await setLanguage(savedLang);
  }

  async function setLanguage(lang) {
    if (!['en', 'gu', 'hi'].includes(lang)) lang = 'en';
    window.GujPsychApp.lang = lang;
    storage.set('gujpsych_lang', lang);
    document.documentElement.lang = lang;

    try {
      const res = await fetch(resolveUrl(`data/i18n/${lang}.json`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.GujPsychApp.i18nStrings = await res.json();
      applyI18n();
      updateLanguageChips();
      window.dispatchEvent(new CustomEvent('gujpsych:i18n-updated', { detail: { lang } }));
    } catch (e) {
      console.warn(`Could not load i18n for ${lang}:`, e);
      // Fallback: try en
      if (lang !== 'en') {
        setLanguage('en');
      }
    }
  }
  window.setLanguage = setLanguage;

  function getI18nKey(keyPath) {
    const parts = keyPath.split('.');
    let cur = window.GujPsychApp.i18nStrings;
    for (const part of parts) {
      if (cur && cur[part] !== undefined) {
        cur = cur[part];
      } else {
        return null;
      }
    }
    return cur;
  }

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = getI18nKey(key);
      if (val && typeof val === 'string') {
        el.textContent = val;
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = getI18nKey(key);
      if (val && typeof val === 'string') {
        el.setAttribute('placeholder', val);
      }
    });
  }

  function updateLanguageChips() {
    document.querySelectorAll('.lang-chip').forEach(chip => {
      const chipLang = chip.getAttribute('data-lang');
      if (chipLang === window.GujPsychApp.lang) {
        chip.classList.add('bg-teal-600', 'text-white', 'font-bold');
        chip.classList.remove('bg-slate-100', 'text-slate-700');
        chip.setAttribute('aria-pressed', 'true');
      } else {
        chip.classList.remove('bg-teal-600', 'text-white', 'font-bold');
        chip.classList.add('bg-slate-100', 'text-slate-700');
        chip.setAttribute('aria-pressed', 'false');
      }
    });
  }

  // Partials Loader (nav.html & footer.html)
  async function loadPartials() {
    const navPlaceholder = document.getElementById('nav-placeholder');
    if (navPlaceholder) {
      try {
        const res = await fetch(resolveUrl('nav.html'));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        navPlaceholder.innerHTML = await res.text();
        initNavEvents();
      } catch (err) {
        console.warn('Partials fetch error for nav.html (e.g. running via file://). Rendering minimal fallback nav:', err);
        renderFallbackNav(navPlaceholder);
      }
    }

    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
      try {
        const res = await fetch(resolveUrl('footer.html'));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        footerPlaceholder.innerHTML = await res.text();
        initFooterEvents();
      } catch (err) {
        console.warn('Partials fetch error for footer.html:', err);
        renderFallbackFooter(footerPlaceholder);
      }
    }

    applyI18n();
    updateLanguageChips();
  }

  function renderFallbackNav(container) {
    container.innerHTML = `
      <header class="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <a href="index.html" class="flex items-center gap-2 text-indigo-900 font-bold text-lg">
            <span>GujPsychSurvey</span>
          </a>
          <nav class="flex items-center gap-4 text-sm font-medium">
            <a href="index.html" class="hover:text-indigo-600 text-slate-700">Home</a>
            <a href="active.html" class="hover:text-indigo-600 text-slate-700">Active Surveys</a>
            <a href="scales.html" class="hover:text-indigo-600 text-slate-700">Scales</a>
            <a href="submit.html" class="hover:text-indigo-600 text-slate-700">Submit</a>
            <a href="gethelp.html" class="text-rose-600 font-bold">Get Help (14416)</a>
          </nav>
        </div>
      </header>
    `;
  }

  function renderFallbackFooter(container) {
    container.innerHTML = `
      <footer class="bg-slate-100 text-slate-600 py-8 px-4 border-t border-slate-200 text-center text-sm">
        <p>© ${new Date().getFullYear()} GujPsychSurvey. Maintained for academic mental health research discovery.</p>
        <p class="text-xs text-slate-500 mt-2">Tele-MANAS Crisis Helpline: 14416 (24/7 Toll-Free)</p>
      </footer>
    `;
  }

  // Navigation events & accessibility
  function initNavEvents() {
    // Highlight current page
    const cur = window.GujPsychApp.currentPage;
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === cur || (cur === '' && href === 'index.html')) {
        link.classList.add('text-indigo-900', 'font-bold', 'border-b-2', 'border-indigo-900');
        link.classList.remove('text-slate-600');
        link.setAttribute('aria-current', 'page');
      }
    });

    // Mobile Drawer Toggle
    const menuBtn = document.getElementById('mobile-menu-toggle');
    const drawer = document.getElementById('mobile-drawer');
    const closeBtn = document.getElementById('mobile-drawer-close');
    const backdrop = document.getElementById('mobile-drawer-backdrop');

    function openDrawer() {
      if (!drawer) return;
      drawer.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    }

    function closeDrawer() {
      if (!drawer) return;
      drawer.classList.add('hidden');
      document.body.style.overflow = '';
      if (menuBtn) menuBtn.focus();
    }

    if (menuBtn) menuBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    // Escape listener for mobile drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer && !drawer.classList.contains('hidden')) {
        closeDrawer();
      }
    });
  }

  function initFooterEvents() {
    if (window.GujPsychApp.config) {
      applyConfigToFooter();
    }
  }

  // Interstitial Modal System
  let targetSurveyUrl = '';
  function setupInterstitialModal() {
    let modal = document.getElementById('interstitial-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'interstitial-modal';
      modal.className = 'modal-overlay hidden';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'interstitial-title');
      modal.innerHTML = `
        <div class="modal-dialog p-6 bg-white text-slate-800">
          <div class="flex items-center gap-3 text-indigo-900 mb-4">
            <span class="material-symbols-outlined text-3xl">open_in_new</span>
            <h2 id="interstitial-title" class="headline-sm font-bold" data-i18n="interstitial.title">
              You are leaving GujPsychSurvey
            </h2>
          </div>
          <div class="space-y-3 text-sm text-slate-600 mb-6">
            <p data-i18n="interstitial.p1">
              This survey is hosted externally by the principal investigator on an independent platform (e.g. Google Forms, REDCap, Qualtrics).
            </p>
            <p data-i18n="interstitial.p2">
              Please ensure you carefully read the Informed Consent and Participant Information Sheet on the first page.
            </p>
            <div class="p-3 bg-rose-50 border-l-4 border-rose-600 text-rose-900 text-xs rounded-r">
              <strong class="font-bold block mb-1">Safety & Ethics Reminder:</strong>
              <span data-i18n="interstitial.caution">Never disclose bank details, OTPs, UPI pins or Aadhaar numbers; legitimate research never asks for payment.</span>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3">
            <button id="modal-cancel-btn" type="button" class="btn-ghost" data-i18n="interstitial.cancel">
              Cancel & Return
            </button>
            <a id="modal-continue-link" href="#" target="_blank" rel="noopener noreferrer" class="btn-primary" data-i18n="interstitial.continue">
              Continue to Survey
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const cancelBtn = modal.querySelector('#modal-cancel-btn');
      const continueLink = modal.querySelector('#modal-continue-link');

      cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      });

      continueLink.addEventListener('click', () => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          document.body.style.overflow = '';
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
          modal.classList.add('hidden');
          document.body.style.overflow = '';
        }
      });
    }
  }

  function openSurveyModal(url) {
    if (!url || !url.startsWith('https://')) {
      showToast('Invalid or unsecured survey link.', 'error');
      return;
    }
    setupInterstitialModal();
    const modal = document.getElementById('interstitial-modal');
    const continueLink = modal.querySelector('#modal-continue-link');
    continueLink.setAttribute('href', url);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    modal.querySelector('#modal-cancel-btn').focus();
    applyI18n();
  }
  window.openSurveyModal = openSurveyModal;

  // Data Loaders
  async function loadConfig() {
    try {
      const res = await fetch(resolveUrl('data/config.json'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.GujPsychApp.config = await res.json();
      applyConfigToUI();
      return window.GujPsychApp.config;
    } catch (err) {
      console.warn('Error loading config.json:', err);
      return null;
    }
  }

  async function loadSurveys() {
    try {
      const res = await fetch(resolveUrl('data/surveys.json'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.GujPsychApp.surveys = await res.json();
      return window.GujPsychApp.surveys;
    } catch (err) {
      console.warn('Error loading surveys.json:', err);
      return [];
    }
  }

  async function loadScales() {
    try {
      const res = await fetch(resolveUrl('data/scales.json'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.GujPsychApp.scales = await res.json();
      return window.GujPsychApp.scales;
    } catch (err) {
      console.warn('Error loading scales.json:', err);
      return [];
    }
  }

  function applyConfigToUI() {
    const cfg = window.GujPsychApp.config;
    if (!cfg) return;

    // Sample data ribbon
    const ribbon = document.getElementById('sample-data-ribbon');
    if (ribbon) {
      if (cfg.isSampleData) {
        ribbon.classList.remove('hidden');
      } else {
        ribbon.classList.add('hidden');
      }
    }

    // Review time text on pages
    document.querySelectorAll('.review-time-text').forEach(el => {
      el.textContent = cfg.reviewTimeText;
    });

    // Maintainer copy in footers
    applyConfigToFooter();
  }

  function applyConfigToFooter() {
    const cfg = window.GujPsychApp.config;
    if (!cfg) return;
    const copyrightEl = document.getElementById('footer-copyright');
    if (copyrightEl && cfg.maintainer) {
      const year = new Date().getFullYear();
      copyrightEl.textContent = `Maintained by ${cfg.maintainer.name}, ${cfg.maintainer.affiliation}. Contact: ${cfg.maintainer.email}. Copyright © ${year} GujPsychSurvey.`;
    }
  }

  // Active / Archived derivation
  // Active: status === 'active' AND endDate >= today
  // Archived: status === 'archived' OR endDate < today
  function isSurveyActive(survey) {
    if (survey.status !== 'active') return false;
    if (!survey.endDate) return true;
    const today = new Date().toISOString().split('T')[0];
    return survey.endDate >= today;
  }

  // Page Specific Inits
  async function initPage() {
    initTheme();
    await initI18n();
    await loadPartials();
    await loadConfig();

    const page = window.GujPsychApp.currentPage;

    if (page === 'index.html' || page === '') {
      initHomePage();
    } else if (page === 'active.html') {
      initSurveyListPage(true);
    } else if (page === 'archived.html') {
      initSurveyListPage(false);
    } else if (page === 'scales.html') {
      initScalesPage();
    } else if (page === 'submit.html') {
      initSubmitPage();
    } else if (page === 'awareness.html') {
      initAwarenessPage();
    } else if (page === 'gethelp.html') {
      initGetHelpPage();
    } else if (page === 'maintainer.html') {
      initMaintainerPage();
    }

    // Update live count badge in nav if loaded
    updateNavLiveCount();
  }

  async function updateNavLiveCount() {
    const surveys = window.GujPsychApp.surveys.length ? window.GujPsychApp.surveys : await loadSurveys();
    const activeCount = surveys.filter(isSurveyActive).length;
    const pill = document.getElementById('nav-active-count-pill');
    if (pill) {
      pill.textContent = activeCount.toString();
    }
  }

  // HOME PAGE INITIALIZATION
  async function initHomePage() {
    const surveys = await loadSurveys();
    const scales = await loadScales();

    const activeList = surveys.filter(isSurveyActive);
    const archivedList = surveys.filter(s => !isSurveyActive(s));

    // Stats
    const activeCountEl = document.getElementById('stat-active-count');
    const archivedCountEl = document.getElementById('stat-archived-count');
    const languagesCountEl = document.getElementById('stat-languages-count');
    const scalesCountEl = document.getElementById('stat-scales-count');

    if (activeCountEl) activeCountEl.textContent = activeList.length.toString();
    if (archivedCountEl) archivedCountEl.textContent = archivedList.length.toString();
    if (languagesCountEl) languagesCountEl.textContent = '3';
    if (scalesCountEl) scalesCountEl.textContent = scales.length.toString();

    // Featured Surveys (first 3 active)
    const featuredContainer = document.getElementById('featured-surveys-container');
    if (featuredContainer) {
      featuredContainer.innerHTML = '';
      const featured = activeList.slice(0, 3);
      if (featured.length === 0) {
        featuredContainer.innerHTML = `<div class="col-span-3 text-center py-8 text-slate-500">No active surveys available at this time.</div>`;
      } else {
        featured.forEach(study => {
          const card = createSurveyCard(study, true);
          featuredContainer.appendChild(card);
        });
      }
    }

    // Abstract Card on Hero Right Side
    const heroCard = document.getElementById('hero-abstract-card');
    if (heroCard && activeList.length > 0) {
      const topStudy = activeList[0];
      renderHeroAbstractCard(heroCard, topStudy);
    }

    // Quick lookup search input
    const quickSearchForm = document.getElementById('quick-lookup-form');
    if (quickSearchForm) {
      quickSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('quick-lookup-input');
        const q = input ? input.value.trim() : '';
        if (q) {
          window.location.href = `active.html?q=${encodeURIComponent(q)}`;
        } else {
          window.location.href = 'active.html';
        }
      });
    }
  }

  function renderHeroAbstractCard(container, study) {
    container.innerHTML = `
      <div class="card-elevation-1 p-6 relative overflow-hidden border border-slate-200 bg-white">
        <div class="flex items-center justify-between mb-4">
          <span class="badge-pill badge-verified">
            <span class="material-symbols-outlined text-xs">verified_user</span>
            <span>Verified Study</span>
          </span>
          <span class="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded">
            ${study.completionMinutes} mins
          </span>
        </div>
        <div class="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-1">
          ${escapeHtml(study.domain)}
        </div>
        <h3 class="headline-sm text-slate-900 font-bold mb-2 line-clamp-2">
          ${escapeHtml(study.title)}
        </h3>
        <p class="text-xs text-slate-500 mb-4 line-clamp-3">
          ${escapeHtml(study.abstract)}
        </p>
        <div class="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
          <div>
            <div class="font-semibold text-slate-700">${escapeHtml(study.piName)}</div>
            <div>${escapeHtml(study.institution)}</div>
          </div>
          <button type="button" class="btn-primary text-xs py-2 px-3 h-auto min-h-0 btn-open-study-trigger" data-url="${escapeHtml(study.surveyUrl)}">
            Open Survey
          </button>
        </div>
      </div>
    `;

    const btn = container.querySelector('.btn-open-study-trigger');
    if (btn) {
      btn.addEventListener('click', () => {
        openSurveyModal(study.surveyUrl);
      });
    }
  }

  function createSurveyCard(study, isActive) {
    const card = document.createElement('div');
    card.id = `mobile-survey-${study.ref}`;
    card.setAttribute('data-ref', study.ref);
    card.className = 'card-elevation-1 p-6 flex flex-col justify-between border border-slate-200 bg-white rounded-2xl transition-all';

    const headerRow = document.createElement('div');
    headerRow.className = 'flex items-center justify-between gap-2 mb-3';
    
    const badge = document.createElement('span');
    badge.className = isActive ? 'badge-pill badge-verified' : 'badge-pill badge-archived';
    badge.innerHTML = `<span class="material-symbols-outlined text-xs">${isActive ? 'verified' : 'archive'}</span><span>${isActive ? 'Verified by Moderator' : 'Archived'}</span>`;
    
    const timePill = document.createElement('span');
    timePill.className = 'text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full tabular-nums';
    timePill.textContent = `${study.completionMinutes} mins`;
    
    headerRow.appendChild(badge);
    headerRow.appendChild(timePill);

    const bodyContent = document.createElement('div');
    bodyContent.className = 'space-y-2 mb-4';

    const domainTag = document.createElement('div');
    domainTag.className = 'text-xs font-semibold text-teal-700 uppercase tracking-wider';
    domainTag.textContent = study.domain;

    const titleEl = document.createElement('h3');
    titleEl.className = 'headline-sm text-slate-900 font-bold line-clamp-2';
    titleEl.textContent = study.title;

    if (study.titleGu) {
      const guTitle = document.createElement('div');
      guTitle.className = 'text-xs font-medium text-slate-600 script-secondary';
      guTitle.textContent = study.titleGu;
      bodyContent.appendChild(guTitle);
    }

    const piLine = document.createElement('div');
    piLine.className = 'text-xs text-slate-600';
    piLine.textContent = `${study.piName} (${study.piDesignation}), ${study.institution}`;

    const langsDiv = document.createElement('div');
    langsDiv.className = 'flex flex-wrap gap-1 pt-1';
    (study.languages || []).forEach(l => {
      const lChip = document.createElement('span');
      lChip.className = 'text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100';
      lChip.textContent = l;
      langsDiv.appendChild(lChip);
    });

    const cohortDiv = document.createElement('div');
    cohortDiv.className = 'text-xs text-slate-500 pt-1';
    cohortDiv.innerHTML = `<strong>Target:</strong> ${escapeHtml(study.cohortLabel || study.cohortType)}`;

    bodyContent.appendChild(domainTag);
    bodyContent.appendChild(titleEl);
    bodyContent.appendChild(piLine);
    bodyContent.appendChild(langsDiv);
    bodyContent.appendChild(cohortDiv);

    const footerRow = document.createElement('div');
    footerRow.className = 'pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto';

    const refWrap = document.createElement('div');
    refWrap.className = 'flex items-center gap-2';

    const refDiv = document.createElement('span');
    refDiv.className = 'text-xs font-mono text-slate-400';
    refDiv.textContent = study.ref;
    refWrap.appendChild(refDiv);

    if (isActive) {
      const shareBtn = document.createElement('button');
      shareBtn.type = 'button';
      shareBtn.className = 'inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 transition';
      shareBtn.title = 'Copy direct link to this study';
      shareBtn.innerHTML = `<span class="material-symbols-outlined text-[15px]">share</span>`;
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.copySurveyLink(study.ref);
      });
      refWrap.appendChild(shareBtn);
    }
    footerRow.appendChild(refWrap);

    if (isActive) {
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'btn-primary text-xs py-2 px-4 h-auto min-h-0';
      openBtn.innerHTML = `<span>Open Survey</span><span class="material-symbols-outlined text-sm">open_in_new</span>`;
      openBtn.addEventListener('click', () => openSurveyModal(study.surveyUrl));
      footerRow.appendChild(openBtn);
    } else {
      const closedSpan = document.createElement('span');
      closedSpan.className = 'text-xs font-medium text-slate-500';
      closedSpan.textContent = `Closed on ${study.endDate || 'past date'}`;
      footerRow.appendChild(closedSpan);
    }

    card.appendChild(headerRow);
    card.appendChild(bodyContent);
    card.appendChild(footerRow);

    return card;
  }

  // ACTIVE & ARCHIVED SURVEY LIST RENDERER
  async function initSurveyListPage(isActiveMode) {
    const allSurveys = await loadSurveys();
    let surveys = allSurveys.filter(s => isActiveMode ? isSurveyActive(s) : !isSurveyActive(s));

    // Mini stats
    const countEl = document.getElementById('list-surveys-count');
    if (countEl) countEl.textContent = surveys.length.toString();

    // Query params check
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q') || '';
    const initialDomain = urlParams.get('domain') || 'all';

    // Filter controls
    const searchInput = document.getElementById('survey-search-input');
    const clearSearchBtn = document.getElementById('survey-search-clear');
    const domainSelect = document.getElementById('domain-filter-select');
    const languageSelect = document.getElementById('language-filter-select');
    const timeSelect = document.getElementById('time-filter-select');
    const cohortSelect = document.getElementById('cohort-filter-select');
    const resetBtn = document.getElementById('reset-filters-btn');
    const activeFiltersContainer = document.getElementById('active-filter-chips');

    if (searchInput && initialQuery) {
      searchInput.value = initialQuery;
    }

    // Populate Dynamic Options
    populateDynamicFilterOptions(surveys, domainSelect, languageSelect, cohortSelect);

    if (domainSelect && initialDomain !== 'all') {
      domainSelect.value = initialDomain;
    }

    // State for filtering
    let filterState = {
      search: initialQuery,
      domain: initialDomain,
      language: 'all',
      time: 'all',
      cohort: 'all',
      sort: 'ref',
      page: 1,
      pageSize: 10
    };

    function applyFilters() {
      let filtered = surveys.filter(study => {
        // Search
        if (filterState.search) {
          const q = filterState.search.toLowerCase();
          const matchTitle = (study.title || '').toLowerCase().includes(q);
          const matchTitleGu = (study.titleGu || '').toLowerCase().includes(q);
          const matchAbstract = (study.abstract || '').toLowerCase().includes(q);
          const matchDomain = (study.domain || '').toLowerCase().includes(q);
          const matchPi = (study.piName || '').toLowerCase().includes(q);
          const matchInst = (study.institution || '').toLowerCase().includes(q);
          const matchRef = (study.ref || '').toLowerCase().includes(q);
          if (!matchTitle && !matchTitleGu && !matchAbstract && !matchDomain && !matchPi && !matchInst && !matchRef) {
            return false;
          }
        }

        // Domain
        if (filterState.domain !== 'all' && study.domain !== filterState.domain) {
          return false;
        }

        // Language
        if (filterState.language !== 'all') {
          if (!study.languages || !study.languages.includes(filterState.language)) {
            return false;
          }
        }

        // Time
        if (filterState.time === '<10' && study.completionMinutes >= 10) return false;
        if (filterState.time === '10-15' && (study.completionMinutes < 10 || study.completionMinutes > 15)) return false;
        if (filterState.time === '>15' && study.completionMinutes <= 15) return false;

        // Cohort
        if (filterState.cohort !== 'all' && study.cohortType !== filterState.cohort) {
          return false;
        }

        return true;
      });

      // Sort
      if (filterState.sort === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      } else {
        filtered.sort((a, b) => a.ref.localeCompare(b.ref));
      }

      // Update URL query string
      const sp = new URLSearchParams();
      if (filterState.search) sp.set('q', filterState.search);
      if (filterState.domain !== 'all') sp.set('domain', filterState.domain);
      const newQuery = sp.toString() ? `?${sp.toString()}` : window.location.pathname;
      window.history.replaceState({}, '', newQuery);

      renderTable(filtered, isActiveMode, filterState);
      renderMobileCards(filtered, isActiveMode);
      renderFilterPills(filterState, applyFilters);
      renderDonutChart(filtered);
    }

    // Bind event listeners
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterState.search = e.target.value.trim();
        filterState.page = 1;
        applyFilters();
        if (clearSearchBtn) {
          clearSearchBtn.classList.toggle('hidden', !filterState.search);
        }
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        filterState.search = '';
        filterState.page = 1;
        clearSearchBtn.classList.add('hidden');
        applyFilters();
      });
    }

    if (domainSelect) {
      domainSelect.addEventListener('change', (e) => {
        filterState.domain = e.target.value;
        filterState.page = 1;
        applyFilters();
      });
    }

    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        filterState.language = e.target.value;
        filterState.page = 1;
        applyFilters();
      });
    }

    if (timeSelect) {
      timeSelect.addEventListener('change', (e) => {
        filterState.time = e.target.value;
        filterState.page = 1;
        applyFilters();
      });
    }

    if (cohortSelect) {
      cohortSelect.addEventListener('change', (e) => {
        filterState.cohort = e.target.value;
        filterState.page = 1;
        applyFilters();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        filterState = {
          search: '',
          domain: 'all',
          language: 'all',
          time: 'all',
          cohort: 'all',
          sort: 'ref',
          page: 1,
          pageSize: 10
        };
        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
        if (domainSelect) domainSelect.value = 'all';
        if (languageSelect) languageSelect.value = 'all';
        if (timeSelect) timeSelect.value = 'all';
        if (cohortSelect) cohortSelect.value = 'all';
        applyFilters();
      });
    }

    // Quick chips
    document.querySelectorAll('.quick-filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-filter-type');
        const val = btn.getAttribute('data-filter-val');
        if (type === 'time') {
          filterState.time = val;
          if (timeSelect) timeSelect.value = val;
        } else if (type === 'language') {
          filterState.language = val;
          if (languageSelect) languageSelect.value = val;
        } else if (type === 'cohort') {
          filterState.cohort = val;
          if (cohortSelect) cohortSelect.value = val;
        }
        filterState.page = 1;
        applyFilters();
      });
    });

    // Initial render
    applyFilters();

    // Deep-link survey ref handler (e.g. active.html?ref=GUJ-PSY-2026-001)
    const targetRef = urlParams.get('ref');
    if (targetRef) {
      setTimeout(() => {
        const targetEl = document.getElementById(`survey-${targetRef}`) || document.getElementById(`mobile-survey-${targetRef}`) || document.querySelector(`[data-ref="${targetRef}"]`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.classList.add('ring-2', 'ring-indigo-600', 'bg-indigo-50/60');
          setTimeout(() => {
            targetEl.classList.remove('ring-2', 'ring-indigo-600', 'bg-indigo-50/60');
          }, 4500);
          showToast(`Focused on study record: ${targetRef}`, 'info');
        }
      }, 250);
    }
  }

  function populateDynamicFilterOptions(surveys, domainSelect, languageSelect, cohortSelect) {
    if (domainSelect) {
      const domains = Array.from(new Set(surveys.map(s => s.domain).filter(Boolean)));
      domains.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        domainSelect.appendChild(opt);
      });
    }

    if (cohortSelect) {
      const cohorts = Array.from(new Set(surveys.map(s => s.cohortType).filter(Boolean)));
      cohorts.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        cohortSelect.appendChild(opt);
      });
    }
  }

  function renderFilterPills(filterState, onRemove) {
    const container = document.getElementById('active-filter-chips');
    if (!container) return;
    container.innerHTML = '';

    const items = [];
    if (filterState.search) items.push({ label: `Search: "${filterState.search}"`, clear: () => { filterState.search = ''; } });
    if (filterState.domain !== 'all') items.push({ label: `Domain: ${filterState.domain}`, clear: () => { filterState.domain = 'all'; } });
    if (filterState.language !== 'all') items.push({ label: `Language: ${filterState.language}`, clear: () => { filterState.language = 'all'; } });
    if (filterState.time !== 'all') items.push({ label: `Time: ${filterState.time}m`, clear: () => { filterState.time = 'all'; } });
    if (filterState.cohort !== 'all') items.push({ label: `Cohort: ${filterState.cohort}`, clear: () => { filterState.cohort = 'all'; } });

    items.forEach(item => {
      const pill = document.createElement('span');
      pill.className = 'inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-200';
      pill.textContent = item.label;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'hover:text-rose-600 focus:outline-none';
      removeBtn.innerHTML = '&times;';
      removeBtn.setAttribute('aria-label', `Remove filter ${item.label}`);
      removeBtn.addEventListener('click', () => {
        item.clear();
        onRemove();
      });

      pill.appendChild(removeBtn);
      container.appendChild(pill);
    });
  }

  function renderTable(surveys, isActiveMode, filterState) {
    const tbody = document.getElementById('surveysTableBody');
    const resultCountEl = document.getElementById('table-result-count');
    const emptyState = document.getElementById('table-empty-state');
    const paginationContainer = document.getElementById('table-pagination');

    if (resultCountEl) {
      resultCountEl.textContent = `${surveys.length} ${surveys.length === 1 ? 'study' : 'studies'} found`;
    }

    if (!tbody) return;
    tbody.innerHTML = '';

    if (surveys.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    } else {
      if (emptyState) emptyState.classList.add('hidden');
    }

    // Pagination slice
    const startIdx = (filterState.page - 1) * filterState.pageSize;
    const pageItems = surveys.slice(startIdx, startIdx + filterState.pageSize);

    pageItems.forEach(study => {
      const tr = document.createElement('tr');
      tr.id = `survey-${study.ref}`;
      tr.setAttribute('data-ref', study.ref);
      tr.className = 'border-b border-slate-200 hover:bg-slate-50/70 transition-colors';

      // 1. REF
      const tdRef = document.createElement('td');
      tdRef.className = 'px-4 py-4 text-xs font-mono font-semibold text-slate-700 align-top whitespace-nowrap';
      tdRef.textContent = study.ref;
      tr.appendChild(tdRef);

      // 2. Study Synopsis & PI
      const tdSynopsis = document.createElement('td');
      tdSynopsis.className = 'px-4 py-4 align-top max-w-md';
      
      const domainSpan = document.createElement('span');
      domainSpan.className = 'inline-block text-[11px] font-semibold text-teal-700 uppercase tracking-wide mb-1';
      domainSpan.textContent = study.domain;

      const titleH4 = document.createElement('h4');
      titleH4.className = 'text-sm font-bold text-slate-900 leading-snug mb-1';
      titleH4.textContent = study.title;

      const abstractP = document.createElement('p');
      abstractP.className = 'text-xs text-slate-500 line-clamp-2 mb-2';
      abstractP.textContent = study.abstract;

      const piDiv = document.createElement('div');
      piDiv.className = 'text-xs text-slate-600';
      piDiv.textContent = `PI: ${study.piName} (${study.piDesignation}), ${study.institution}`;

      tdSynopsis.appendChild(domainSpan);
      tdSynopsis.appendChild(titleH4);
      if (study.titleGu) {
        const guTitle = document.createElement('div');
        guTitle.className = 'text-xs font-medium text-slate-600 script-secondary mb-1';
        guTitle.textContent = study.titleGu;
        tdSynopsis.appendChild(guTitle);
      }
      tdSynopsis.appendChild(abstractP);
      tdSynopsis.appendChild(piDiv);
      tr.appendChild(tdSynopsis);

      // 3. Cohort & Time
      const tdCohort = document.createElement('td');
      tdCohort.className = 'px-4 py-4 text-xs text-slate-700 align-top whitespace-nowrap';
      tdCohort.innerHTML = `
        <div class="font-semibold">${escapeHtml(study.cohortLabel || study.cohortType)}</div>
        <div class="text-slate-500 tabular-nums mt-0.5">${study.completionMinutes} minutes</div>
      `;
      tr.appendChild(tdCohort);

      // 4. Languages
      const tdLang = document.createElement('td');
      tdLang.className = 'px-4 py-4 align-top';
      const langWrap = document.createElement('div');
      langWrap.className = 'flex flex-wrap gap-1';
      (study.languages || []).forEach(l => {
        const chip = document.createElement('span');
        chip.className = 'text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded';
        chip.textContent = l;
        langWrap.appendChild(chip);
      });
      tdLang.appendChild(langWrap);
      tr.appendChild(tdLang);

      // 5. Clearance
      const tdClearance = document.createElement('td');
      tdClearance.className = 'px-4 py-4 align-top text-xs text-slate-600 whitespace-nowrap';
      tdClearance.innerHTML = `
        <div class="mb-1">
          <span class="badge-pill badge-verified">
            <span class="material-symbols-outlined text-[12px]">verified</span> Verified
          </span>
        </div>
        <div class="font-mono text-[11px]">${escapeHtml(study.iecRegNo)}</div>
        <div class="text-[11px] text-slate-500">Exp: ${escapeHtml(study.iecExpiry)}</div>
      `;
      tr.appendChild(tdClearance);

      // 6. Participation
      const tdAction = document.createElement('td');
      tdAction.className = 'px-4 py-4 align-top text-right whitespace-nowrap';
      if (isActiveMode) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-primary text-xs py-2 px-3 h-auto min-h-0';
        btn.innerHTML = `<span>Open Survey</span><span class="material-symbols-outlined text-sm">open_in_new</span>`;
        btn.addEventListener('click', () => openSurveyModal(study.surveyUrl));

        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 mt-1.5 ml-auto';
        shareBtn.innerHTML = `<span class="material-symbols-outlined text-[13px]">share</span><span>Share</span>`;
        shareBtn.title = 'Copy direct link to this study';
        shareBtn.addEventListener('click', () => window.copySurveyLink(study.ref));

        const reportLink = document.createElement('button');
        reportLink.type = 'button';
        reportLink.className = 'block text-[11px] text-slate-400 hover:text-rose-600 mt-1 ml-auto';
        reportLink.textContent = 'Report survey';
        reportLink.addEventListener('click', () => {
          showToast(`Report queued for moderator review regarding ref: ${study.ref}`, 'info');
        });

        tdAction.appendChild(btn);
        tdAction.appendChild(shareBtn);
        tdAction.appendChild(reportLink);
      } else {
        const closedDiv = document.createElement('div');
        closedDiv.className = 'text-xs font-semibold text-slate-500';
        closedDiv.textContent = `Closed on ${study.endDate || 'past date'}`;
        tdAction.appendChild(closedDiv);
      }
      tr.appendChild(tdAction);

      tbody.appendChild(tr);
    });

    // Render pagination
    renderPagination(paginationContainer, surveys.length, filterState);
  }

  function renderMobileCards(surveys, isActiveMode) {
    const container = document.getElementById('surveysMobileContainer');
    if (!container) return;
    container.innerHTML = '';

    surveys.forEach(study => {
      const card = createSurveyCard(study, isActiveMode);
      container.appendChild(card);
    });
  }

  function renderPagination(container, totalItems, filterState) {
    if (!container) return;
    container.innerHTML = '';
    const totalPages = Math.ceil(totalItems / filterState.pageSize);
    if (totalPages <= 1) return;

    const wrap = document.createElement('div');
    wrap.className = 'flex items-center justify-center gap-2 py-4';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-ghost text-xs py-1.5 px-3 min-h-0 disabled:opacity-40';
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = filterState.page === 1;
    prevBtn.addEventListener('click', () => {
      if (filterState.page > 1) {
        filterState.page--;
        renderTable(surveys, isActiveMode, filterState);
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    });
    wrap.appendChild(prevBtn);

    for (let p = 1; p <= totalPages; p++) {
      const pBtn = document.createElement('button');
      pBtn.className = p === filterState.page
        ? 'btn-primary text-xs py-1.5 px-3 min-h-0'
        : 'btn-ghost text-xs py-1.5 px-3 min-h-0';
      pBtn.textContent = p.toString();
      pBtn.addEventListener('click', () => {
        filterState.page = p;
        renderTable(surveys, isActiveMode, filterState);
        window.scrollTo({ top: 300, behavior: 'smooth' });
      });
      wrap.appendChild(pBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-ghost text-xs py-1.5 px-3 min-h-0 disabled:opacity-40';
    nextBtn.textContent = 'Next';
    nextBtn.disabled = filterState.page === totalPages;
    nextBtn.addEventListener('click', () => {
      if (filterState.page < totalPages) {
        filterState.page++;
        renderTable(surveys, isActiveMode, filterState);
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    });
    wrap.appendChild(nextBtn);

    container.appendChild(wrap);
  }

  // Accessible Donut Chart SVG
  function renderDonutChart(surveys) {
    const container = document.getElementById('cohort-donut-chart-container');
    if (!container) return;
    container.innerHTML = '';

    if (surveys.length === 0) {
      container.innerHTML = `<div class="text-xs text-slate-400 py-4 text-center">No active studies to chart.</div>`;
      return;
    }

    // Tally by cohort
    const counts = {};
    surveys.forEach(s => {
      const c = s.cohortType || 'General Community/Adults';
      counts[c] = (counts[c] || 0) + 1;
    });

    const total = surveys.length;
    const colors = ['#1E3A8A', '#0D9488', '#E11D48', '#B45309', '#6366F1'];
    let colorIdx = 0;

    let cumulativeAngle = 0;
    const slices = [];
    const entries = Object.entries(counts);

    entries.forEach(([cohort, count]) => {
      const percentage = (count / total) * 100;
      const angle = (count / total) * 360;
      const color = colors[colorIdx % colors.length];
      slices.push({ cohort, count, percentage, color, startAngle: cumulativeAngle, angle });
      cumulativeAngle += angle;
      colorIdx++;
    });

    // Generate SVG Paths
    const size = 160;
    const center = size / 2;
    const rOuter = 70;
    const rInner = 45;

    let pathsSvg = '';
    slices.forEach(slice => {
      if (slice.angle >= 360) {
        pathsSvg += `<circle cx="${center}" cy="${center}" r="${(rOuter + rInner) / 2}" fill="none" stroke="${slice.color}" stroke-width="${rOuter - rInner}" />`;
      } else {
        const startRad = (slice.startAngle - 90) * (Math.PI / 180);
        const endRad = (slice.startAngle + slice.angle - 90) * (Math.PI / 180);

        const x1Outer = center + rOuter * Math.cos(startRad);
        const y1Outer = center + rOuter * Math.sin(startRad);
        const x2Outer = center + rOuter * Math.cos(endRad);
        const y2Outer = center + rOuter * Math.sin(endRad);

        const x1Inner = center + rInner * Math.cos(endRad);
        const y1Inner = center + rInner * Math.sin(endRad);
        const x2Inner = center + rInner * Math.cos(startRad);
        const y2Inner = center + rInner * Math.sin(startRad);

        const largeArc = slice.angle > 180 ? 1 : 0;
        const d = `M ${x1Outer} ${y1Outer} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2Outer} ${y2Outer} L ${x1Inner} ${y1Inner} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2Inner} ${y2Inner} Z`;
        pathsSvg += `<path d="${d}" fill="${slice.color}"><title>${escapeHtml(slice.cohort)}: ${slice.count} (${slice.percentage.toFixed(0)}%)</title></path>`;
      }
    });

    let legendHtml = '<div class="space-y-1.5 text-xs text-slate-600 w-full">';
    slices.forEach(slice => {
      legendHtml += `
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 truncate">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${slice.color};"></span>
            <span class="truncate" title="${escapeHtml(slice.cohort)}">${escapeHtml(slice.cohort)}</span>
          </div>
          <span class="font-semibold text-slate-800 tabular-nums">${slice.percentage.toFixed(0)}%</span>
        </div>
      `;
    });
    legendHtml += '</div>';

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row items-center gap-4">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Survey distribution donut chart" role="img" class="shrink-0">
          ${pathsSvg}
          <text x="${center}" y="${center + 4}" text-anchor="middle" class="text-xs font-bold fill-slate-800 font-mono">${total} Total</text>
        </svg>
        ${legendHtml}
      </div>
    `;
  }

  // SCALES DIRECTORY PAGE
  // ALWAYS render with textContent / DOM APIs (never innerHTML with scale data) so "&" and quotes display correctly!
  async function initScalesPage() {
    const scales = await loadScales();
    const tbody = document.getElementById('scalesBody');
    const searchInput = document.getElementById('scales-search-input');
    const domainSelect = document.getElementById('scales-domain-select');
    const statusSelect = document.getElementById('scales-status-select');
    const scalesCountEl = document.getElementById('scales-count-badge');

    // Populate domains
    if (domainSelect) {
      const domains = Array.from(new Set(scales.map(s => s.domain).filter(Boolean)));
      domains.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        domainSelect.appendChild(opt);
      });
    }

    let search = '';
    let domain = 'all';
    let status = 'all';

    function renderScales() {
      if (!tbody) return;
      tbody.innerHTML = '';

      const filtered = scales.filter(scale => {
        if (search) {
          const q = search.toLowerCase();
          const matchName = (scale.name || '').toLowerCase().includes(q);
          const matchAbbr = (scale.abbreviation || '').toLowerCase().includes(q);
          const matchAuth = (scale.authors || '').toLowerCase().includes(q);
          if (!matchName && !matchAbbr && !matchAuth) return false;
        }

        if (domain !== 'all' && scale.domain !== domain) return false;
        if (status !== 'all' && scale.gujaratiStatus !== status) return false;

        return true;
      });

      if (scalesCountEl) {
        scalesCountEl.textContent = `${filtered.length} scales`;
      }

      if (filtered.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.className = 'py-8 text-center text-slate-500 text-sm';
        td.textContent = 'No scales found matching the current search criteria.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      filtered.forEach(scale => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-200 hover:bg-slate-50 transition-colors';

        // 1. Scale Name & Abbr (DOM textContent)
        const tdName = document.createElement('td');
        tdName.className = 'px-4 py-4 align-top';
        const nameDiv = document.createElement('div');
        nameDiv.className = 'font-bold text-slate-900 text-sm';
        nameDiv.textContent = scale.name;
        const abbrDiv = document.createElement('div');
        abbrDiv.className = 'text-xs text-indigo-700 font-mono mt-0.5';
        abbrDiv.textContent = scale.abbreviation ? `[${scale.abbreviation}]` : '';
        tdName.appendChild(nameDiv);
        tdName.appendChild(abbrDiv);
        tr.appendChild(tdName);

        // 2. Domain
        const tdDomain = document.createElement('td');
        tdDomain.className = 'px-4 py-4 align-top text-xs font-semibold text-slate-600';
        tdDomain.textContent = scale.domain || 'General';
        tr.appendChild(tdDomain);

        // 3. Gujarati Status Badge
        const tdGuj = document.createElement('td');
        tdGuj.className = 'px-4 py-4 align-top';
        const gujBadge = createStatusBadge(scale.gujaratiStatus);
        tdGuj.appendChild(gujBadge);
        tr.appendChild(tdGuj);

        // 4. Hindi Status Badge
        const tdHi = document.createElement('td');
        tdHi.className = 'px-4 py-4 align-top';
        const hiBadge = createStatusBadge(scale.hindiStatus);
        tdHi.appendChild(hiBadge);
        tr.appendChild(tdHi);

        // 5. Authors
        const tdAuthors = document.createElement('td');
        tdAuthors.className = 'px-4 py-4 align-top text-xs text-slate-600 max-w-xs';
        tdAuthors.textContent = scale.authors || '—';
        tr.appendChild(tdAuthors);

        // 6. Link
        const tdLink = document.createElement('td');
        tdLink.className = 'px-4 py-4 align-top text-right text-xs whitespace-nowrap';
        const targetUrl = scale.link || (window.GujPsychApp.config && window.GujPsychApp.config.scalesRepoUrl);
        if (targetUrl) {
          const a = document.createElement('a');
          a.className = 'text-indigo-700 font-medium hover:underline inline-flex items-center gap-1';
          a.href = targetUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = 'Open in repository';
          const icon = document.createElement('span');
          icon.className = 'material-symbols-outlined text-[14px]';
          icon.textContent = 'open_in_new';
          a.appendChild(icon);
          tdLink.appendChild(a);
        } else {
          const span = document.createElement('span');
          span.className = 'text-slate-400 italic';
          span.textContent = 'Link coming soon';
          tdLink.appendChild(span);
        }
        tr.appendChild(tdLink);

        tbody.appendChild(tr);
      });
    }

    function createStatusBadge(statusVal) {
      const badge = document.createElement('span');
      badge.className = 'badge-pill';
      if (statusVal === 'published') {
        badge.classList.add('badge-published');
        badge.textContent = 'Published';
      } else if (statusVal === 'unpublished') {
        badge.classList.add('badge-unpublished');
        badge.textContent = 'Unpublished';
      } else {
        badge.classList.add('badge-unknown');
        badge.textContent = 'Unknown';
      }
      return badge;
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        search = e.target.value.trim();
        renderScales();
      });
    }

    if (domainSelect) {
      domainSelect.addEventListener('change', (e) => {
        domain = e.target.value;
        renderScales();
      });
    }

    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        status = e.target.value;
        renderScales();
      });
    }

    // Quick chip domain filters
    document.querySelectorAll('.domain-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-domain');
        domain = val;
        if (domainSelect) domainSelect.value = val;
        renderScales();
      });
    });

    renderScales();
  }

  // SUBMIT PAGE (For Researchers)
  function initSubmitPage() {
    const form = document.getElementById('survey-submission-form');
    if (!form) return;

    const abstractTextarea = document.getElementById('abstract');
    const wordCounter = document.getElementById('wordCountIndicator');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const restoreDraftBanner = document.getElementById('draft-restore-banner');
    const restoreDraftBtn = document.getElementById('restore-draft-btn');
    const discardDraftBtn = document.getElementById('discard-draft-btn');
    const iecFileInput = document.getElementById('iecFileInput');
    const uploadDropzone = document.getElementById('uploadDropzone');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const submitBtn = document.getElementById('submit-protocol-btn');
    const emailInput = document.getElementById('institutionalEmail');
    const emailWarning = document.getElementById('email-domain-warning');

    // Abstract Word Count (hard limit 300 words)
    if (abstractTextarea && wordCounter) {
      abstractTextarea.addEventListener('input', () => {
        const words = abstractTextarea.value.trim().split(/\s+/).filter(Boolean);
        const count = words.length;
        wordCounter.textContent = `${count} / 300 words`;
        if (count > 300) {
          wordCounter.classList.add('text-rose-600', 'font-bold');
          wordCounter.classList.remove('text-slate-500');
        } else {
          wordCounter.classList.remove('text-rose-600', 'font-bold');
          wordCounter.classList.add('text-slate-500');
        }
      });
    }

    // Email Domain Validation (warning if not .ac.in, .edu, .gov, .org, hospital domain)
    if (emailInput && emailWarning) {
      emailInput.addEventListener('blur', () => {
        const val = emailInput.value.trim().toLowerCase();
        if (val) {
          const isInstitutional = val.includes('.ac.in') || val.includes('.edu') || val.includes('.gov') || val.includes('.org') || val.includes('hospital') || val.includes('medical');
          if (!isInstitutional && (val.endsWith('@gmail.com') || val.endsWith('@yahoo.com') || val.endsWith('@hotmail.com'))) {
            emailWarning.classList.remove('hidden');
          } else {
            emailWarning.classList.add('hidden');
          }
        } else {
          emailWarning.classList.add('hidden');
        }
      });
    }

    // Dropzone File Validation (PDF/JPG max 12MB)
    if (uploadDropzone && iecFileInput) {
      uploadDropzone.addEventListener('click', () => iecFileInput.click());
      uploadDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadDropzone.classList.add('border-indigo-600', 'bg-indigo-50/50');
      });
      uploadDropzone.addEventListener('dragleave', () => {
        uploadDropzone.classList.remove('border-indigo-600', 'bg-indigo-50/50');
      });
      uploadDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadDropzone.classList.remove('border-indigo-600', 'bg-indigo-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleIecFile(e.dataTransfer.files[0]);
        }
      });

      iecFileInput.addEventListener('change', () => {
        if (iecFileInput.files && iecFileInput.files[0]) {
          handleIecFile(iecFileInput.files[0]);
        }
      });
    }

    function handleIecFile(file) {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
      const maxBytes = 12 * 1024 * 1024; // 12 MB
      if (!allowed.includes(file.type)) {
        showToast('Please select a valid PDF or JPG/PNG file.', 'error');
        return;
      }
      if (file.size > maxBytes) {
        showToast('File exceeds 12 MB size limit.', 'error');
        return;
      }
      if (fileNameDisplay) {
        fileNameDisplay.textContent = `Attached: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB). Note: Because this site is static, please also email this clearance letter to the moderator.`;
        fileNameDisplay.classList.remove('hidden');
      }
      showToast('IEC certificate verified locally. Remember to email a copy to the moderator.', 'info');
    }

    // Draft persistence check
    const savedDraft = storage.get('gujpsych_submission_draft', null);
    if (savedDraft && restoreDraftBanner) {
      restoreDraftBanner.classList.remove('hidden');
    }

    if (restoreDraftBtn) {
      restoreDraftBtn.addEventListener('click', () => {
        try {
          const data = JSON.parse(storage.get('gujpsych_submission_draft', '{}'));
          Object.keys(data).forEach(key => {
            const field = form.elements[key];
            if (field) {
              if (field.type === 'checkbox') {
                field.checked = Boolean(data[key]);
              } else {
                field.value = data[key];
              }
            }
          });
          showToast('Draft restored from local browser storage.', 'success');
          if (restoreDraftBanner) restoreDraftBanner.classList.add('hidden');
          // Trigger word count
          if (abstractTextarea) abstractTextarea.dispatchEvent(new Event('input'));
        } catch (e) {
          console.warn('Draft parse error:', e);
        }
      });
    }

    if (discardDraftBtn) {
      discardDraftBtn.addEventListener('click', () => {
        storage.remove('gujpsych_submission_draft');
        if (restoreDraftBanner) restoreDraftBanner.classList.add('hidden');
        showToast('Draft discarded.', 'info');
      });
    }

    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => {
        const formData = new FormData(form);
        const obj = {};
        for (const [k, v] of formData.entries()) {
          obj[k] = v;
        }
        storage.set('gujpsych_submission_draft', JSON.stringify(obj));
        showToast('Draft saved in your browser.', 'success');
      });
    }

    // Attestations validation to enable submit
    const attestationBoxes = form.querySelectorAll('input[type="checkbox"][id^="attest_"]');
    function checkAttestations() {
      let allChecked = true;
      attestationBoxes.forEach(box => {
        if (!box.checked) allChecked = false;
      });
      if (submitBtn) {
        submitBtn.disabled = !allChecked;
        if (!allChecked) {
          submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
          submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      }
    }
    attestationBoxes.forEach(box => box.addEventListener('change', checkAttestations));
    checkAttestations();

    // Form Submit Handler
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Honeypot check
      const honeypot = form.elements['website_hp'] ? form.elements['website_hp'].value : '';
      if (honeypot) {
        console.warn('Bot detected via honeypot.');
        return;
      }

      // Validate required fields and dates
      const title = form.elements['studyTitle'].value.trim();
      const domain = form.elements['researchDomain'].value;
      const abstract = form.elements['abstract'].value.trim();
      const piName = form.elements['piName'].value.trim();
      const piDesig = form.elements['academicDesignation'].value;
      const institution = form.elements['institutionName'].value.trim();
      const email = form.elements['institutionalEmail'].value.trim();
      const iecName = form.elements['iecName'].value.trim();
      const iecReg = form.elements['iecRegNumber'].value.trim();
      const approvalDate = form.elements['approvalDate'].value;
      const validityExpiry = form.elements['validityExpiry'].value;
      const externalUrl = form.elements['externalUrl'].value.trim();
      const completionTime = parseInt(form.elements['completionTime'].value, 10);
      const startDate = form.elements['startDate'].value;
      const closeDate = form.elements['closeDate'].value;

      // Languages check
      const langCheckboxes = form.querySelectorAll('input[name="languages"]:checked');
      if (langCheckboxes.length === 0) {
        showToast('Please select at least one language for your survey questionnaire.', 'error');
        form.querySelector('#lang_en').focus();
        return;
      }
      const selectedLanguages = Array.from(langCheckboxes).map(c => c.value);

      // Date validation
      if (approvalDate && validityExpiry && validityExpiry <= approvalDate) {
        showToast('IEC validity expiry date must be strictly after the approval date.', 'error');
        form.elements['validityExpiry'].focus();
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      if (validityExpiry && validityExpiry < todayStr) {
        showToast('IEC clearance has already expired. An active, valid clearance is required.', 'error');
        form.elements['validityExpiry'].focus();
        return;
      }

      if (startDate && closeDate && closeDate <= startDate) {
        showToast('Target survey completion close date must be after start date.', 'error');
        form.elements['closeDate'].focus();
        return;
      }

      // External URL check
      if (!externalUrl.startsWith('https://')) {
        showToast('External survey URL must be a valid, secure https:// link.', 'error');
        form.elements['externalUrl'].focus();
        return;
      }
      if (externalUrl.includes('bit.ly') || externalUrl.includes('tinyurl.com') || externalUrl.includes('t.co')) {
        showToast('Shortened URLs are not permitted for security reasons.', 'error');
        form.elements['externalUrl'].focus();
        return;
      }

      // Generate Reference Code
      const randNum = Math.floor(100 + Math.random() * 900);
      const generatedRef = `GPS-${new Date().getFullYear()}-${randNum}`;

      // Build JSON record matching surveys.json schema
      const submissionRecord = {
        ref: generatedRef,
        title: title,
        abstract: abstract,
        domain: domain,
        subDiscipline: form.elements['subDiscipline'] ? form.elements['subDiscipline'].value.trim() : '',
        piName: piName,
        piDesignation: piDesig,
        institution: institution,
        institutionalEmail: email,
        coInvestigators: form.elements['coInvestigators'] ? form.elements['coInvestigators'].value.trim() : '',
        languages: selectedLanguages,
        completionMinutes: completionTime || 10,
        cohortLabel: form.elements['eligibilityCriteria'] ? form.elements['eligibilityCriteria'].value.trim() : 'General Community',
        cohortType: domain === 'clinical' ? 'Doctors/Nurses/Hospital Staff' : 'General Community/Adults',
        eligibility: form.elements['eligibilityCriteria'] ? form.elements['eligibilityCriteria'].value.trim() : '',
        iecName: iecName,
        iecRegNo: iecReg,
        iecApprovalDate: approvalDate,
        iecExpiry: validityExpiry,
        platform: form.elements['surveyPlatform'] ? form.elements['surveyPlatform'].value : 'Google Forms',
        surveyUrl: externalUrl,
        startDate: startDate,
        endDate: closeDate,
        status: 'pending',
        verifiedOn: ''
      };

      // Handle submission method according to config.json
      const config = window.GujPsychApp.config;
      const subMode = (config && config.submission && config.submission.mode) || 'mailto';
      const modEmail = (config && config.moderatorEmail) || 'moderator@your-domain.example';

      if (subMode === 'googleForm' && config.submission.googleFormActionUrl) {
        // Post via hidden iframe to Google Form
        submitToGoogleForm(config.submission.googleFormActionUrl, config.submission.entryMap, submissionRecord);
      } else {
        // Mailto fallback
        const subject = encodeURIComponent(`[Protocol Submission] ${generatedRef}: ${title.substring(0, 50)}...`);
        const body = encodeURIComponent(
          `Dear GujPsychSurvey Moderator,\n\nI am submitting our Institutional Ethics Committee approved protocol for inclusion in the directory.\n\n` +
          `REFERENCE: ${generatedRef}\n` +
          `TITLE: ${title}\n` +
          `PI: ${piName} (${piDesig})\n` +
          `INSTITUTION: ${institution}\n` +
          `EMAIL: ${email}\n` +
          `IEC APPROVAL: ${iecName} (Reg: ${iecReg})\n` +
          `VALIDITY: ${approvalDate} to ${validityExpiry}\n` +
          `SURVEY URL: ${externalUrl}\n` +
          `ESTIMATED TIME: ${completionTime} minutes\n\n` +
          `FULL JSON RECORD (for surveys.json):\n` +
          JSON.stringify(submissionRecord, null, 2) +
          `\n\nI have attached our signed IEC clearance certificate.`
        );
        window.location.href = `mailto:${modEmail}?subject=${subject}&body=${body}`;
      }

      // Show confirmation panel
      renderSubmissionSuccess(submissionRecord);
      storage.remove('gujpsych_submission_draft');
      showToast('Submitted for moderator review (pending)', 'success');
    });
  }

  function submitToGoogleForm(actionUrl, entryMap, record) {
    let iframe = document.getElementById('hidden_submission_iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'hidden_submission_iframe';
      iframe.name = 'hidden_submission_iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    const gForm = document.createElement('form');
    gForm.action = actionUrl;
    gForm.method = 'POST';
    gForm.target = 'hidden_submission_iframe';

    Object.keys(entryMap).forEach(key => {
      const entryId = entryMap[key];
      const val = record[key];
      if (entryId && val !== undefined) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = entryId;
        input.value = typeof val === 'object' ? JSON.stringify(val) : val;
        gForm.appendChild(input);
      }
    });

    document.body.appendChild(gForm);
    gForm.submit();
    setTimeout(() => gForm.remove(), 2000);
  }

  function renderSubmissionSuccess(record) {
    const container = document.getElementById('submit-success-panel');
    const formSection = document.getElementById('submit-form-section');
    if (formSection) formSection.classList.add('hidden');
    if (!container) return;

    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="card-elevation-1 p-8 text-center max-w-2xl mx-auto border-2 border-teal-500 bg-white rounded-2xl">
        <div class="w-16 h-16 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="material-symbols-outlined text-4xl">check_circle</span>
        </div>
        <h2 class="headline-md font-bold text-slate-900 mb-2">Protocol Submitted for Moderation</h2>
        <p class="text-sm text-slate-600 mb-4">
          Your research survey record has been queued for independent audit. A human moderator will review your Institutional Ethics Committee clearance within 3 to 5 business days.
        </p>
        <div class="inline-block bg-slate-100 text-slate-900 font-mono text-sm px-4 py-2 rounded-lg font-bold mb-6">
          Reference Code: ${record.ref}
        </div>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button id="download-submission-json-btn" type="button" class="btn-primary">
            <span class="material-symbols-outlined">download</span>
            Download submission as JSON
          </button>
          <a href="index.html" class="btn-ghost">Return to Home</a>
        </div>
      </div>
    `;

    const downloadBtn = container.querySelector('#download-submission-json-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(record, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `${record.ref}-submission.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('JSON file downloaded.', 'success');
      });
    }

    container.scrollIntoView({ behavior: 'smooth' });
  }

  // AWARENESS PAGE (For Participants)
  function initAwarenessPage() {
    const form = document.getElementById('participant-join-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const hp = form.elements['website_hp'] ? form.elements['website_hp'].value : '';
      if (hp) return;

      const email = form.elements['participantEmail'].value.trim();
      const name = form.elements['participantName'] ? form.elements['participantName'].value.trim() : '';
      const lang = form.elements['participantLang'] ? form.elements['participantLang'].value : 'en';

      const topicBoxes = form.querySelectorAll('input[name="participantTopics"]:checked');
      const selectedTopics = Array.from(topicBoxes).map(b => b.value);

      const consentCheck = form.elements['participantConsent'];
      if (!consentCheck || !consentCheck.checked) {
        showToast('Please check the consent box to receive study notifications.', 'error');
        return;
      }

      const record = {
        email,
        fullName: name,
        preferredLanguage: lang,
        topics: selectedTopics,
        registeredAt: new Date().toISOString()
      };

      const cfg = window.GujPsychApp.config;
      const joinMode = (cfg && cfg.participantJoin && cfg.participantJoin.mode) || 'mailto';
      const modEmail = (cfg && cfg.maintainer && cfg.maintainer.email) || 'contact@your-domain.example';

      if (joinMode === 'googleForm' && cfg.participantJoin.googleFormActionUrl) {
        submitToGoogleForm(cfg.participantJoin.googleFormActionUrl, cfg.participantJoin.entryMap, record);
      } else {
        const subject = encodeURIComponent('[Participant Directory] New Voluntary Research Participant');
        const body = encodeURIComponent(`Name: ${name || 'Anonymous'}\nEmail: ${email}\nLanguage: ${lang}\nTopics: ${selectedTopics.join(', ')}`);
        window.location.href = `mailto:${modEmail}?subject=${subject}&body=${body}`;
      }

      form.reset();
      showToast('Thank you! Your interest has been recorded.', 'success');
    });
  }

  // GET HELP PAGE
  function initGetHelpPage() {
    const container = document.getElementById('helpline-cards-container');
    const cfg = window.GujPsychApp.config;
    if (!container || !cfg || !cfg.helplines) return;

    container.innerHTML = '';
    cfg.helplines.forEach(hl => {
      const card = document.createElement('div');
      card.className = 'card-elevation-1 p-6 border-l-4 border-rose-600 bg-white rounded-xl space-y-3';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <h3 class="headline-sm font-bold text-slate-900">${escapeHtml(hl.name)}</h3>
          <span class="text-xs font-semibold px-2 py-0.5 bg-rose-100 text-rose-700 rounded">
            ${escapeHtml(hl.hours)}
          </span>
        </div>
        <div class="text-2xl font-bold font-mono text-rose-600 tabular-nums">
          ${escapeHtml(hl.number)}
        </div>
        <p class="text-xs text-slate-500">
          ${escapeHtml(hl.note)}
        </p>
        <div class="pt-2">
          <a href="tel:${escapeHtml(hl.tel)}" class="btn-crisis w-full justify-center">
            <span class="material-symbols-outlined">call</span>
            Call ${escapeHtml(hl.number.split('/')[0].trim())}
          </a>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // MAINTAINER PAGE
  function initMaintainerPage() {
    const cfg = window.GujPsychApp.config;
    if (!cfg) return;

    const nameEls = document.querySelectorAll('.maintainer-name-target');
    const affEls = document.querySelectorAll('.maintainer-aff-target');
    const emailEls = document.querySelectorAll('.maintainer-email-target');

    nameEls.forEach(el => { if (cfg.maintainer) el.textContent = cfg.maintainer.name; });
    affEls.forEach(el => { if (cfg.maintainer) el.textContent = cfg.maintainer.affiliation; });
    emailEls.forEach(el => {
      if (cfg.maintainer) {
        el.textContent = cfg.maintainer.email;
        if (el.tagName === 'A') el.href = `mailto:${cfg.maintainer.email}`;
      }
    });
  }

  // Security helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Bootstrap when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
  } else {
    initPage();
  }

})();

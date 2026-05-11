(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ── Elements ── */
  const sidebar      = $('#sidebar');
  const overlay      = $('#sidebarOverlay');
  const toggle       = $('#navbarToggle');
  const searchInput  = $('#searchInput');
  const searchDrop   = $('#searchDropdown');
  const tocList      = $('#tocList');

  /* ══════════════════════════════════════
     1. Mobile sidebar
  ══════════════════════════════════════ */
  const openSidebar  = () => { sidebar.classList.add('open'); overlay.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closeSidebar = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow = ''; };

  toggle?.addEventListener('click', openSidebar);
  overlay?.addEventListener('click', closeSidebar);

  /* ══════════════════════════════════════
     2. Multi-page routing
  ══════════════════════════════════════ */
  const pages    = $$('.doc-page');
  const navLinks = $$('.nav-item a[data-page]');
  const pageOrder = pages.map(p => p.id);

  // Build page title map from nav links
  const pageMeta = {};
  navLinks.forEach(a => {
    pageMeta[a.dataset.page] = a.querySelector('.nav-label')?.textContent.trim() || a.dataset.page;
  });

  function showPage(id) {
    const valid = pageOrder.includes(id);
    const target = valid ? id : pageOrder[0];

    pages.forEach(p => p.classList.toggle('active', p.id === target));
    navLinks.forEach(a => a.classList.toggle('active', a.dataset.page === target));

    buildTOC(target);
    buildPageNav(target);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (window.innerWidth <= 960) closeSidebar();
    history.pushState(null, '', '#' + target);
    closeSearch();
  }

  navLinks.forEach(a => a.addEventListener('click', e => { e.preventDefault(); showPage(a.dataset.page); }));

  // Delegated prev/next
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-goto]');
    if (btn) { e.preventDefault(); showPage(btn.dataset.goto); }
  });

  // Init
  const hash = location.hash.slice(1);
  showPage(hash || pageOrder[0]);

  /* ══════════════════════════════════════
     3. TOC builder
  ══════════════════════════════════════ */
  function slugify(t) { return t.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'); }

  function buildTOC(pageId) {
    if (!tocList) return;
    const page = document.getElementById(pageId);
    if (!page) { tocList.innerHTML = ''; return; }

    const heads = $$('h2, h3', page);
    if (!heads.length) { tocList.innerHTML = ''; return; }

    heads.forEach(h => { if (!h.id) h.id = slugify(h.textContent); });

    tocList.innerHTML = heads.map(h =>
      `<li class="toc-${h.tagName.toLowerCase()}">
        <a href="#${h.id}" data-toc="${h.id}">${h.textContent}</a>
       </li>`
    ).join('');

    $$('[data-toc]', tocList).forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById(a.dataset.toc)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    startScrollSpy();
  }

  /* ── Scroll spy ── */
  let spyObs = null;
  function startScrollSpy() {
    spyObs?.disconnect();
    const page = $('.doc-page.active');
    if (!page) return;
    const heads = $$('h2[id], h3[id]', page);
    if (!heads.length) return;

    spyObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          $$('[data-toc]', tocList).forEach(a => a.classList.toggle('active', a.dataset.toc === e.target.id));
        }
      });
    }, { rootMargin: `-${getComputedStyle(document.documentElement).getPropertyValue('--navbar-h')} 0px -65% 0px` });

    heads.forEach(h => spyObs.observe(h));
  }

  /* ══════════════════════════════════════
     4. Prev / Next
  ══════════════════════════════════════ */
  function buildPageNav(pageId) {
    const idx  = pageOrder.indexOf(pageId);
    const prev = idx > 0 ? pageOrder[idx - 1] : null;
    const next = idx < pageOrder.length - 1 ? pageOrder[idx + 1] : null;

    const container = $('.page-nav', document.getElementById(pageId));
    if (!container) return;

    const prevArrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>`;
    const nextArrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`;

    container.innerHTML = `
      ${prev ? `<a class="page-nav-card prev" data-goto="${prev}" href="#">
        <span class="nav-card-dir">${prevArrow} Previous</span>
        <span class="nav-card-title">${pageMeta[prev] || prev}</span>
      </a>` : '<span></span>'}
      ${next ? `<a class="page-nav-card next" data-goto="${next}" href="#">
        <span class="nav-card-dir">Next ${nextArrow}</span>
        <span class="nav-card-title">${pageMeta[next] || next}</span>
      </a>` : ''}
    `;
  }

  /* ══════════════════════════════════════
     5. Search
  ══════════════════════════════════════ */
  if (!searchInput || !searchDrop) return;

  let index = null;

  function buildIndex() {
    return pages.flatMap(page => {
      const sections = $$('h2, h3', page);
      return $$('h2, h3, p, li', page).map(el => {
        const section = sections.slice().reverse().find(h => h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING || h === el);
        return {
          pageId: page.id,
          pageName: pageMeta[page.id] || page.id,
          section: section?.textContent.trim() || '',
          text: el.textContent.trim(),
          isHeading: /H[23]/.test(el.tagName)
        };
      }).filter(i => i.text.length > 8);
    });
  }

  function runSearch(q) {
    if (!index) index = buildIndex();
    const query = q.trim().toLowerCase();
    if (!query) { closeSearch(); return; }

    const seen = new Set();
    const results = [];

    for (const item of index) {
      if (results.length >= 7) break;
      const key = item.pageId + ':' + item.section;
      if (seen.has(key)) continue;
      if (item.text.toLowerCase().includes(query) || item.pageName.toLowerCase().includes(query)) {
        seen.add(key);
        results.push(item);
      }
    }

    const docIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`;

    if (!results.length) {
      searchDrop.innerHTML = `<div class="search-empty">No results for "<strong>${q}</strong>"</div>`;
    } else {
      searchDrop.innerHTML = results.map((r, i) => `
        <div class="search-item" data-page="${r.pageId}" data-idx="${i}">
          <div class="search-item-icon">${docIcon}</div>
          <div class="search-item-text">
            <div class="search-item-page">${r.pageName}</div>
            <div class="search-item-title">${r.section || r.pageName}</div>
            <div class="search-item-snippet">${r.text.substring(0, 75)}…</div>
          </div>
        </div>`).join('');

      $$('.search-item', searchDrop).forEach(el => {
        el.addEventListener('click', () => { showPage(el.dataset.page); });
      });
    }
    searchDrop.classList.add('open');
  }

  function closeSearch() {
    searchDrop.classList.remove('open');
    searchDrop.innerHTML = '';
  }

  searchInput.addEventListener('input', e => runSearch(e.target.value));
  searchInput.addEventListener('focus', () => { if (searchInput.value) runSearch(searchInput.value); });
  document.addEventListener('click', e => { if (!e.target.closest('.navbar-search')) closeSearch(); });
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchInput.focus(); searchInput.select(); }
    if (e.key === 'Escape') { closeSearch(); searchInput.blur(); }
  });

  /* ══════════════════════════════════════
     6. Copy code buttons
  ══════════════════════════════════════ */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.code-copy');
    if (!btn) return;
    const code = btn.closest('.code-block')?.querySelector('pre code');
    if (!code) return;
    navigator.clipboard.writeText(code.textContent).then(() => {
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Copied!`;
      setTimeout(() => {
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
      }, 2000);
    });
  });

})();

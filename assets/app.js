/*
  Main client script for the KJ5IRQ dashboard.  This file contains
  no external dependencies and stays well under the 100KB budget.
  It handles theme and density switching, navigation, link dock
  management, clock updates, module loading, a minimal command
  palette and basic Markdown rendering for About/Project pages.
*/
(function() {
  const state = { config: null, layout: null, mock: false, theme: 'system' };

  async function init() {
    // Set year in footer
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Kiosk mode hides nav/hero/dock
    if (new URLSearchParams(window.location.search).get('kiosk') === '1') {
      document.body.classList.add('kiosk');
    }
    // Density
    const density = localStorage.getItem('density') || 'comfortable';
    document.body.dataset.density = density;

    // Load site configuration
    const config = await fetchJSON('config/site.json');
    state.config = config || {};
    // Populate static text fields
    const callsignEl = document.getElementById('callsign');
    if (callsignEl) callsignEl.textContent = state.config.callsign || '';
    const taglineEl = document.getElementById('tagline');
    if (taglineEl) taglineEl.textContent = state.config.tagline || '';
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = state.config.status || '';
    // Navigation and link dock
    populateNav(state.config.navLinks || []);
    const qthEl = document.getElementById('qth');
    if (qthEl) qthEl.textContent = state.config.qth || '';
    populateLinkDock(state.config.linkDock || []);
    // Theme setup
    setupTheme(state.config.themeDefault || 'system');
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
    // Density toggle
    const densityBtn = document.getElementById('density-toggle');
    if (densityBtn) densityBtn.addEventListener('click', toggleDensity);
    // Clock
    startClock(state.config.timezone);
    // Load layout and modules
    state.layout = await fetchJSON('config/layout.json') || {};
    populateGrid(state.layout);
    // Command palette
    setupCommandPalette(state.config);
    // Markdown pages (About/Projects)
    setupMarkdownPages();
    setupProjectsPage(state.config);
  }

  async function fetchJSON(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch (err) {
      console.warn('Failed to load', path, err);
      return null;
    }
  }

  // Build the main navigation from config
  function populateNav(links) {
    const ul = document.getElementById('nav-links');
    if (!ul) return;
    ul.innerHTML = '';
    links.forEach(item => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      li.appendChild(a);
      ul.appendChild(li);
    });
  }

  // Build the link dock and overflow popover
  function populateLinkDock(items) {
    const list = document.getElementById('link-items');
    const overflow = document.getElementById('link-overflow');
    const moreBtn = document.getElementById('link-more');
    if (!list || !overflow || !moreBtn) return;
    list.innerHTML = '';
    overflow.innerHTML = '';
    items.forEach((it, idx) => {
      const li = document.createElement('li');
      li.tabIndex = 0;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '16');
      svg.setAttribute('height', '16');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', 'assets/icons.svg#' + it.icon);
      svg.appendChild(use);
      const span = document.createElement('span');
      span.textContent = it.label;
      li.appendChild(svg);
      li.appendChild(span);
      li.addEventListener('click', () => { window.open(it.url, '_blank'); });
      if (idx < 6) list.appendChild(li); else overflow.appendChild(li);
    });
    if (overflow.children.length === 0) {
      moreBtn.style.display = 'none';
    } else {
      moreBtn.style.display = '';
      moreBtn.addEventListener('click', e => {
        e.stopPropagation();
        const pop = document.getElementById('link-popover');
        pop.hidden = !pop.hidden;
      });
      document.addEventListener('click', e => {
        const pop = document.getElementById('link-popover');
        if (!moreBtn.contains(e.target) && !pop.contains(e.target)) pop.hidden = true;
      });
    }
  }

  // Theme management: read from localStorage, system preference or default
  function setupTheme(defaultTheme) {
    const stored = localStorage.getItem('theme');
    state.theme = stored || defaultTheme || 'system';
    applyTheme(state.theme);
  }
  function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === 'system') {
      html.setAttribute('data-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', theme);
    }
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      const use = btn.querySelector('use');
      if (html.getAttribute('data-theme') === 'dark') use.setAttribute('href','assets/icons.svg#sun'); else use.setAttribute('href','assets/icons.svg#moon');
    }
  }
  function toggleTheme() {
    const cycle = { 'dark': 'light', 'light': 'system', 'system': 'dark' };
    state.theme = cycle[state.theme] || 'dark';
    localStorage.setItem('theme', state.theme);
    applyTheme(state.theme);
  }

  // Density toggle: comfortable vs compact spacing
  function toggleDensity() {
    const current = document.body.dataset.density || 'comfortable';
    const next = current === 'comfortable' ? 'compact' : 'comfortable';
    document.body.dataset.density = next;
    localStorage.setItem('density', next);
  }

  // Live clock using Intl with optional timezone
  function startClock(tz) {
    function update() {
      const now = new Date();
      const opts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      if (tz) opts.timeZone = tz;
      const str = new Intl.DateTimeFormat('en-US', opts).format(now);
      const clock = document.getElementById('clock');
      if (clock) clock.textContent = str;
    }
    update();
    setInterval(update, 1000);
  }

  // Build the card grid from layout.json
  function populateGrid(layout) {
    const grid = document.getElementById('dashboard-grid');
    if (!grid || !layout || !layout.modules) return;
    grid.innerHTML = '';
    layout.modules.forEach(mod => {
      if (mod.visible === false) return;
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.id = mod.id;
      card.dataset.size = mod.size || 'md';
      // header
      const h2 = document.createElement('h2');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '18');
      svg.setAttribute('height', '18');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', 'assets/icons.svg#' + (mod.icon || 'alert'));
      svg.appendChild(use);
      const span = document.createElement('span');
      span.textContent = mod.title || mod.id;
      h2.appendChild(svg);
      h2.appendChild(span);
      card.appendChild(h2);
      // content skeleton
      const content = document.createElement('div');
      content.className = 'content';
      for (let i = 0; i < 3; i++) {
        const sk = document.createElement('div');
        sk.className = 'skeleton';
        content.appendChild(sk);
      }
      card.appendChild(content);
      grid.appendChild(card);
      // load module data
      loadModule(mod.id, card);
    });
  }

  // Fetch and render module JSON; fall back to mock via query param or state.mock
  async function loadModule(id, card) {
    const params = new URLSearchParams(window.location.search);
    const useMock = state.mock || params.get('mock') === '1';
    const base = useMock ? 'data/mock/' : 'data/';
    const data = await fetchJSON(base + id + '.json');
    const container = card.querySelector('.content');
    if (!data || !data.payload) {
      container.innerHTML = '<p>No data available.</p>';
      return;
    }
    const updated = data.updated ? new Date(data.updated) : null;
    const ttl = data.ttlMin || 60;
    if (updated && (Date.now() - updated.getTime() > ttl * 60000)) {
      const chip = document.createElement('span');
      chip.className = 'stale';
      chip.textContent = 'Stale';
      card.appendChild(chip);
    }
    const handler = moduleHandlers[id] || defaultHandler;
    handler(container, data.payload);
  }

  // Handlers for each module type
  const moduleHandlers = {
    weather(container, payload) {
      container.innerHTML = '';
      const tempDiv = document.createElement('div');
      tempDiv.textContent = payload.current.temp + '°C, ' + payload.current.condition;
      container.appendChild(tempDiv);
      if (payload.forecast) {
        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.gap = '6px';
        payload.forecast.slice(0, 6).forEach(pt => {
          const item = document.createElement('div');
          item.style.flex = '1';
          item.style.textAlign = 'center';
          item.innerHTML = '<strong>' + pt.time + '</strong><br>' + pt.temp + '°';
          list.appendChild(item);
        });
        container.appendChild(list);
      }
    },
    propagation(container, payload) {
      container.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = 'SFI ' + payload.sfi + ', A ' + payload.a + ', K ' + payload.k + ', MUF ' + payload.muf + ' MHz';
      container.appendChild(p);
      if (payload.bands) {
        const badges = document.createElement('div');
        badges.style.display = 'flex';
        badges.style.flexWrap = 'wrap';
        badges.style.gap = '4px';
        payload.bands.forEach(b => {
          const badge = document.createElement('span');
          badge.textContent = b;
          badge.style.background = 'var(--primary)';
          badge.style.padding = '2px 4px';
          badge.style.borderRadius = '4px';
          badge.style.fontSize = '0.7rem';
          badges.appendChild(badge);
        });
        container.appendChild(badges);
      }
    },
    allstar(container, payload) {
      container.innerHTML = '';
      const ul = document.createElement('ul');
      ul.style.paddingLeft = '1em';
      payload.nodes.forEach(n => {
        const li = document.createElement('li');
        li.textContent = n.name + ': ' + n.status;
        ul.appendChild(li);
      });
      container.appendChild(ul);
    },
    streams(container, payload) {
      container.innerHTML = '';
      if (payload.embed) {
        const iframe = document.createElement('iframe');
        iframe.src = payload.embed;
        iframe.width = '100%';
        iframe.height = '140';
        iframe.allow = 'autoplay; encrypted-media';
        iframe.setAttribute('loading', 'lazy');
        container.appendChild(iframe);
      } else if (payload.thumbnail) {
        const a = document.createElement('a');
        a.href = payload.url || '#';
        a.target = '_blank';
        const img = document.createElement('img');
        img.src = payload.thumbnail;
        img.alt = 'Stream thumbnail';
        img.style.width = '100%';
        img.style.borderRadius = 'var(--radius)';
        a.appendChild(img);
        container.appendChild(a);
      } else {
        container.textContent = 'No stream.';
      }
    },
    news(container, payload) {
      container.innerHTML = '';
      const ul = document.createElement('ul');
      ul.style.paddingLeft = '1em';
      payload.items.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.url;
        a.textContent = item.title;
        a.target = '_blank';
        li.appendChild(a);
        ul.appendChild(li);
      });
      container.appendChild(ul);
    },
    nets(container, payload) {
      container.innerHTML = '';
      const ul = document.createElement('ul');
      ul.style.paddingLeft = '1em';
      payload.nets.forEach(n => {
        const li = document.createElement('li');
        li.textContent = n.name + ' – ' + n.time;
        ul.appendChild(li);
      });
      container.appendChild(ul);
    },
    discord(container, payload) {
      container.innerHTML = '';
      const ul = document.createElement('ul');
      ul.style.paddingLeft = '1em';
      payload.messages.forEach(m => {
        const li = document.createElement('li');
        li.innerHTML = '<strong>' + m.user + '</strong>: ' + m.text;
        ul.appendChild(li);
      });
      container.appendChild(ul);
    },
    system(container, payload) {
      container.innerHTML = '';
      const items = [
        { label: 'Uptime', value: payload.uptime },
        { label: 'CPU', value: payload.cpu },
        { label: 'Disk', value: payload.disk },
        { label: 'Containers', value: payload.containers }
      ];
      items.forEach(it => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.innerHTML = '<span>' + it.label + '</span><span>' + it.value + '</span>';
        container.appendChild(row);
      });
    }
  };

  // Default handler prints JSON
  function defaultHandler(container, payload) {
    container.textContent = JSON.stringify(payload);
  }

  // Escape HTML to prevent injection in Markdown rendering
  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch] || ch));
  }

  // Simple Markdown renderer supporting headings, paragraphs and unordered lists
  function renderMarkdown(md) {
    const lines = md.replace(/\r/g, '').split(/\n/);
    let html = '';
    let inList = false;
    lines.forEach(line => {
      if (/^###\s+/.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<h3>' + escapeHTML(line.replace(/^###\s+/, '')) + '</h3>';
      } else if (/^##\s+/.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<h2>' + escapeHTML(line.replace(/^##\s+/, '')) + '</h2>';
      } else if (/^#\s+/.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<h1>' + escapeHTML(line.replace(/^#\s+/, '')) + '</h1>';
      } else if (/^\s*\*\s+/.test(line)) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + escapeHTML(line.replace(/^\s*\*\s+/, '')) + '</li>';
      } else if (line.trim() === '') {
        if (inList) { html += '</ul>'; inList = false; }
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<p>' + escapeHTML(line) + '</p>';
      }
    });
    if (inList) html += '</ul>';
    return html;
  }

  async function loadMarkdown(element) {
    const src = element.dataset.src;
    if (!src) return;
    try {
      const res = await fetch(src);
      const text = await res.text();
      element.innerHTML = renderMarkdown(text);
    } catch (err) {
      element.textContent = 'Failed to load content.';
    }
  }
  function setupMarkdownPages() {
    const article = document.getElementById('markdown');
    if (article) loadMarkdown(article);
  }
  function setupProjectsPage(config) {
    const list = document.getElementById('projects-list');
    const article = document.getElementById('markdown');
    if (!list) return;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('p');
    if (slug) {
      list.style.display = 'none';
      const project = (config.projects || []).find(p => p.slug === slug);
      if (project) {
        article.dataset.src = project.file;
        loadMarkdown(article);
      } else {
        article.textContent = 'Project not found.';
      }
      return;
    }
    article.style.display = 'none';
    list.innerHTML = '';
    (config.projects || []).forEach(p => {
      const div = document.createElement('div');
      const a = document.createElement('a');
      a.href = 'projects.html?p=' + p.slug;
      a.textContent = p.title;
      div.appendChild(a);
      list.appendChild(div);
    });
  }

  // Command palette implementation
  function setupCommandPalette(config) {
    const palette = document.getElementById('palette');
    const searchInput = document.getElementById('palette-search');
    const results = document.getElementById('palette-results');
    if (!palette || !searchInput || !results) return;
    // Build command list from nav links, dock links and card modules
    const items = [];
    (config.navLinks || []).forEach(link => items.push({ label: link.label, action: () => { window.location.href = link.href; } }));
    (config.linkDock || []).forEach(link => items.push({ label: link.label, action: () => { window.open(link.url, '_blank'); } }));
    if (state.layout && state.layout.modules) {
      state.layout.modules.forEach(mod => {
        items.push({ label: mod.title || mod.id, action: () => {
          const el = document.querySelector('[data-id="' + mod.id + '"]');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } });
      });
    }
    function openPalette() {
      palette.hidden = false;
      searchInput.value = '';
      updateResults('');
      setTimeout(() => { searchInput.focus(); }, 50);
    }
    function closePalette() { palette.hidden = true; }
    function updateResults(term) {
      results.innerHTML = '';
      const needle = term.toLowerCase();
      items.filter(it => it.label.toLowerCase().includes(needle)).slice(0, 10).forEach((it, idx) => {
        const li = document.createElement('li');
        li.textContent = it.label;
        if (idx === 0) li.classList.add('active');
        li.addEventListener('click', () => { it.action(); closePalette(); });
        results.appendChild(li);
      });
    }
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openPalette();
      } else if (e.key === 'Escape' && !palette.hidden) {
        closePalette();
      }
    });
    searchInput.addEventListener('input', () => updateResults(searchInput.value));
    searchInput.addEventListener('keydown', e => {
      const active = results.querySelector('.active');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = active ? active.nextElementSibling || results.firstElementChild : results.firstElementChild;
        if (active) active.classList.remove('active');
        if (next) next.classList.add('active');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = active ? active.previousElementSibling || results.lastElementChild : results.lastElementChild;
        if (active) active.classList.remove('active');
        if (prev) prev.classList.add('active');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (active) active.click();
      }
    });
    palette.addEventListener('click', e => {
      if (e.target === palette || e.target.id === 'palette-overlay') closePalette();
    });
  }

  window.addEventListener('DOMContentLoaded', init);
})();
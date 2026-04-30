// VerTab Sidebar Logic
(function() {
  'use strict';

  let tabs = [];
  let tabGroups = [];
  let recentlyClosed = [];
  let settings = { theme: 'dark', position: 'left', sidebarWidth: 200 };
  let contextMenuTabId = null;
  let dragTabId = null;
  let searchQuery = '';

  // DOM elements
  const searchInput = document.getElementById('search-input');
  const pinnedSection = document.getElementById('pinned-section');
  const pinnedTabs = document.getElementById('pinned-tabs');
  const allTabsList = document.getElementById('all-tabs');
  const recentlyClosedSection = document.getElementById('recently-closed-section');
  const recentlyClosedTabs = document.getElementById('recently-closed-tabs');
  const contextMenu = document.getElementById('context-menu');
  const groupDialog = document.getElementById('group-dialog');
  const settingsPanel = document.getElementById('settings-panel');

  // Initialize
  async function init() {
    await loadSettings();
    await loadUIState();
    await refreshTabs();
    await loadRecentlyClosed();
    bindEvents();
  }

  async function loadSettings() {
    settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    applyTheme(settings.theme);
    document.getElementById('setting-position').value = settings.position;
    document.getElementById('setting-theme').value = settings.theme;
  }

  async function loadUIState() {
    const { uiState } = await chrome.storage.local.get({ uiState: {} });
    if (uiState && Object.keys(uiState).length > 0) {
      applyUIState(uiState);
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Fetch and render tabs
  async function refreshTabs() {
    tabs = await chrome.runtime.sendMessage({ type: 'GET_TABS' });
    tabGroups = await chrome.runtime.sendMessage({ type: 'GET_TAB_GROUPS' });
    renderTabs();
  }

  async function loadRecentlyClosed() {
    try {
      recentlyClosed = await chrome.runtime.sendMessage({ type: 'GET_RECENTLY_CLOSED' });
      renderRecentlyClosed();
    } catch (e) {
      // sessions permission might not be available
    }
  }

  function filterTabs(tabList) {
    if (!searchQuery) return tabList;
    const q = searchQuery.toLowerCase();
    return tabList.filter(t =>
      t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)
    );
  }

  function renderTabs() {
    const pinned = tabs.filter(t => t.pinned);
    const unpinned = tabs.filter(t => !t.pinned);
    const filteredPinned = filterTabs(pinned);
    const filteredUnpinned = filterTabs(unpinned);

    // Render pinned tabs
    if (filteredPinned.length > 0) {
      pinnedSection.style.display = 'block';
      pinnedTabs.innerHTML = filteredPinned.map(t => renderTabItem(t)).join('');
    } else {
      pinnedSection.style.display = 'none';
    }

    // Render unpinned tabs (grouped and ungrouped)
    const grouped = {};
    const ungrouped = [];

    filteredUnpinned.forEach(tab => {
      if (tab.groupId && tab.groupId !== -1) {
        if (!grouped[tab.groupId]) grouped[tab.groupId] = [];
        grouped[tab.groupId].push(tab);
      } else {
        ungrouped.push(tab);
      }
    });

    let html = '';

    // Render groups
    for (const [groupId, groupTabs] of Object.entries(grouped)) {
      const group = tabGroups.find(g => g.id === parseInt(groupId));
      if (group) {
        html += renderTabGroup(group, groupTabs);
      }
    }

    // Render ungrouped tabs
    html += ungrouped.map(t => renderTabItem(t)).join('');

    allTabsList.innerHTML = html;

    // Show empty state if no tabs match search
    if (filteredPinned.length === 0 && filteredUnpinned.length === 0 && searchQuery) {
      allTabsList.innerHTML = '<div class="empty-state">没有匹配的标签页</div>';
    }
  }

  function getFaviconUrl(tab) {
    // 使用 Chrome 内置的 _favicon API，避免 Mixed Content 问题
    if (tab.url) {
      return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(tab.url)}&size=32`;
    }
    return '';
  }

  function renderTabItem(tab) {
    const faviconSrc = getFaviconUrl(tab);
    const faviconHtml = faviconSrc
      ? `<img class="tab-favicon" src="${faviconSrc}" onerror="this.outerHTML='<div class=\\'tab-favicon-placeholder\\'><svg viewBox=\\'0 0 24 24\\'><path fill=\\'currentColor\\' d=\\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z\\'/></svg></div>'"/>`
      : `<div class="tab-favicon-placeholder"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg></div>`;

    return `
      <div class="tab-item${tab.active ? ' active' : ''}"
           data-tab-id="${tab.id}"
           draggable="true">
        ${faviconHtml}
        <span class="tab-title" title="${escapeHtml(tab.title)}">${escapeHtml(tab.title)}</span>
        <button class="tab-close" data-tab-id="${tab.id}" title="关闭">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>`;
  }

  function renderTabGroup(group, groupTabs) {
    const colorMap = {
      blue: '#8ab4f8', red: '#f28b82', yellow: '#fdd663',
      green: '#81c995', pink: '#ff8bcb', purple: '#c58af9',
      cyan: '#78d9ec', orange: '#fcad70', grey: '#9aa0a6'
    };
    const color = colorMap[group.color] || colorMap.blue;

    return `
      <div class="tab-group" data-group-id="${group.id}">
        <div class="tab-group-header${group.collapsed ? ' collapsed' : ''}" data-group-id="${group.id}">
          <div class="tab-group-dot" style="background:${color}"></div>
          <span>${escapeHtml(group.title || '未命名分组')}</span>
          <svg class="tab-group-chevron" viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </div>
        <div class="tab-group-tabs${group.collapsed ? ' collapsed' : ''}">
          ${groupTabs.map(t => renderTabItem(t)).join('')}
        </div>
      </div>`;
  }

  function renderRecentlyClosed() {
    if (recentlyClosed.length > 0) {
      recentlyClosedSection.style.display = 'block';
      recentlyClosedTabs.innerHTML = recentlyClosed.map(tab => {
        const favSrc = tab.url ? `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(tab.url)}&size=32` : '';
        return `
        <div class="tab-item" data-session-id="${tab.sessionId}">
          ${favSrc
            ? `<img class="tab-favicon" src="${favSrc}" onerror="this.style.display='none'"/>`
            : `<div class="tab-favicon-placeholder"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8z"/></svg></div>`
          }
          <span class="tab-title" title="${escapeHtml(tab.title || '')}">${escapeHtml(tab.title || '未知页面')}</span>
        </div>`;
      }).join('');
    } else {
      recentlyClosedSection.style.display = 'none';
    }
  }

  // 广播 UI 状态到其他标签页
  function broadcastUIState(state) {
    chrome.runtime.sendMessage({ type: 'SYNC_UI_STATE', state });
    // 同时保存到 storage，让新打开的标签页也能同步
    chrome.storage.local.set({ uiState: state });
  }

  // 应用从其他标签页同步来的 UI 状态
  function applyUIState(state) {
    if (state.settingsOpen !== undefined) {
      settingsPanel.style.display = state.settingsOpen ? 'flex' : 'none';
    }
    if (state.recentlyClosedOpen !== undefined) {
      const list = document.getElementById('recently-closed-tabs');
      const header = document.getElementById('toggle-recently-closed');
      list.style.display = state.recentlyClosedOpen ? 'block' : 'none';
      header.classList.toggle('expanded', state.recentlyClosedOpen);
    }
  }

  // Event bindings
  function bindEvents() {
    // Search
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderTabs();
    });

    // Tab click (switch)
    document.addEventListener('click', (e) => {
      // Hide context menu
      contextMenu.style.display = 'none';

      const tabItem = e.target.closest('.tab-item');
      const closeBtn = e.target.closest('.tab-close');
      const groupHeader = e.target.closest('.tab-group-header');

      if (closeBtn) {
        e.stopPropagation();
        const tabId = parseInt(closeBtn.dataset.tabId);
        chrome.runtime.sendMessage({ type: 'CLOSE_TAB', tabId });
        return;
      }

      if (groupHeader) {
        const groupId = parseInt(groupHeader.dataset.groupId);
        const group = tabGroups.find(g => g.id === groupId);
        if (group) {
          chrome.runtime.sendMessage({
            type: 'TOGGLE_GROUP_COLLAPSE',
            groupId,
            collapsed: !group.collapsed
          });
        }
        return;
      }

      if (tabItem) {
        const tabId = parseInt(tabItem.dataset.tabId);
        const sessionId = tabItem.dataset.sessionId;

        if (sessionId) {
          chrome.runtime.sendMessage({ type: 'RESTORE_TAB', sessionId });
        } else if (tabId) {
          chrome.runtime.sendMessage({ type: 'SWITCH_TAB', tabId });
        }
      }
    });

    // Right-click context menu
    document.addEventListener('contextmenu', (e) => {
      const tabItem = e.target.closest('.tab-item');
      if (tabItem && tabItem.dataset.tabId) {
        e.preventDefault();
        contextMenuTabId = parseInt(tabItem.dataset.tabId);
        showContextMenu(e.clientX, e.clientY);
      }
    });

    // Context menu actions
    contextMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.context-menu-item');
      if (!item) return;

      const action = item.dataset.action;
      const tab = tabs.find(t => t.id === contextMenuTabId);

      switch (action) {
        case 'pin':
          chrome.runtime.sendMessage({ type: 'PIN_TAB', tabId: contextMenuTabId, pinned: true });
          break;
        case 'unpin':
          chrome.runtime.sendMessage({ type: 'PIN_TAB', tabId: contextMenuTabId, pinned: false });
          break;
        case 'duplicate':
          chrome.runtime.sendMessage({ type: 'DUPLICATE_TAB', tabId: contextMenuTabId });
          break;
        case 'reload':
          chrome.runtime.sendMessage({ type: 'RELOAD_TAB', tabId: contextMenuTabId });
          break;
        case 'mute':
          chrome.runtime.sendMessage({ type: 'MUTE_TAB', tabId: contextMenuTabId, muted: true });
          break;
        case 'unmute':
          chrome.runtime.sendMessage({ type: 'MUTE_TAB', tabId: contextMenuTabId, muted: false });
          break;
        case 'add-to-group':
          showGroupDialog();
          break;
        case 'remove-from-group':
          chrome.runtime.sendMessage({ type: 'REMOVE_FROM_GROUP', tabId: contextMenuTabId });
          break;
        case 'copy-url':
          if (tab) navigator.clipboard.writeText(tab.url);
          break;
        case 'close':
          chrome.runtime.sendMessage({ type: 'CLOSE_TAB', tabId: contextMenuTabId });
          break;
      }

      contextMenu.style.display = 'none';
    });

    // Context menu - show/hide relevant items
    function showContextMenu(x, y) {
      const tab = tabs.find(t => t.id === contextMenuTabId);
      if (!tab) return;

      // Toggle pin/unpin visibility
      contextMenu.querySelector('[data-action="pin"]').style.display = tab.pinned ? 'none' : '';
      contextMenu.querySelector('[data-action="unpin"]').style.display = tab.pinned ? '' : 'none';
      contextMenu.querySelector('[data-action="mute"]').style.display = 'block';
      contextMenu.querySelector('[data-action="unmute"]').style.display = 'none';
      contextMenu.querySelector('[data-action="remove-from-group"]').style.display =
        (tab.groupId && tab.groupId !== -1) ? '' : 'none';

      contextMenu.style.display = 'block';
      contextMenu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
      contextMenu.style.top = Math.min(y, window.innerHeight - 250) + 'px';
    }

    // New tab button
    document.getElementById('btn-new-tab').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'CREATE_TAB' });
    });

    // Theme toggle
    document.getElementById('btn-theme').addEventListener('click', () => {
      settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
      applyTheme(settings.theme);
      chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: { theme: settings.theme } });
      document.getElementById('setting-theme').value = settings.theme;
    });

    // Settings panel
    document.getElementById('btn-settings').addEventListener('click', () => {
      settingsPanel.style.display = 'flex';
      broadcastUIState({ settingsOpen: true });
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      settingsPanel.style.display = 'none';
      broadcastUIState({ settingsOpen: false });
    });

    document.getElementById('setting-position').addEventListener('change', (e) => {
      settings.position = e.target.value;
      chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: { position: settings.position } });
    });

    document.getElementById('setting-theme').addEventListener('change', (e) => {
      settings.theme = e.target.value;
      applyTheme(settings.theme);
      chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: { theme: settings.theme } });
    });

    // Recently closed toggle
    document.getElementById('toggle-recently-closed').addEventListener('click', () => {
      const list = document.getElementById('recently-closed-tabs');
      const header = document.getElementById('toggle-recently-closed');
      const visible = list.style.display !== 'none';
      list.style.display = visible ? 'none' : 'block';
      header.classList.toggle('expanded', !visible);
      broadcastUIState({ recentlyClosedOpen: !visible });
    });

    // Group dialog
    let selectedColor = 'blue';

    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
        selectedColor = dot.dataset.color;
      });
    });

    document.getElementById('group-cancel').addEventListener('click', () => {
      groupDialog.style.display = 'none';
    });

    document.getElementById('group-confirm').addEventListener('click', () => {
      const name = document.getElementById('group-name-input').value.trim();
      if (contextMenuTabId) {
        // Check if there are existing groups to add to
        chrome.runtime.sendMessage({
          type: 'CREATE_GROUP',
          tabIds: [contextMenuTabId],
          title: name || '新分组',
          color: selectedColor
        });
      }
      groupDialog.style.display = 'none';
      document.getElementById('group-name-input').value = '';
    });

    function showGroupDialog() {
      groupDialog.style.display = 'flex';
      document.getElementById('group-name-input').focus();
    }

    // Drag and drop
    document.addEventListener('dragstart', (e) => {
      const tabItem = e.target.closest('.tab-item');
      if (tabItem) {
        dragTabId = parseInt(tabItem.dataset.tabId);
        tabItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    document.addEventListener('dragend', (e) => {
      const tabItem = e.target.closest('.tab-item');
      if (tabItem) {
        tabItem.classList.remove('dragging');
      }
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      dragTabId = null;
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      const tabItem = e.target.closest('.tab-item');
      if (tabItem && parseInt(tabItem.dataset.tabId) !== dragTabId) {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        tabItem.classList.add('drag-over');
      }
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      const tabItem = e.target.closest('.tab-item');
      if (tabItem && dragTabId) {
        const targetTabId = parseInt(tabItem.dataset.tabId);
        const targetTab = tabs.find(t => t.id === targetTabId);
        if (targetTab) {
          chrome.runtime.sendMessage({
            type: 'MOVE_TAB',
            tabId: dragTabId,
            index: targetTab.index
          });
        }
      }
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    // Listen for updates from content script / background
    window.addEventListener('message', (event) => {
      if (event.data.type === 'TABS_UPDATED') {
        refreshTabs();
        loadRecentlyClosed();
      }
      if (event.data.type === 'THEME_CHANGED') {
        settings.theme = event.data.theme;
        applyTheme(settings.theme);
        document.getElementById('setting-theme').value = settings.theme;
      }
      if (event.data.type === 'SYNC_UI_STATE') {
        applyUIState(event.data.state);
      }
    });

    // Keyboard shortcut: Escape to close search
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchQuery = '';
        renderTabs();
        searchInput.blur();
      }
    });

    // Click outside to hide context menu
    document.addEventListener('mousedown', (e) => {
      if (!contextMenu.contains(e.target)) {
        contextMenu.style.display = 'none';
      }
    });
  }

  // Utility
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Start
  init();
})();

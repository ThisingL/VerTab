// VerTab Content Script - 注入侧边栏到页面

(function() {
  'use strict';

  let sidebar = null;
  let resizeHandle = null;
  let isVisible = false;
  let settings = { position: 'left', sidebarWidth: 200, theme: 'dark' };

  // 初始化
  async function init() {
    // 加载设置
    const stored = await chrome.storage.sync.get({
      theme: 'dark',
      position: 'left',
      sidebarWidth: 200
    });
    settings = stored;

    // 加载上次的显隐状态
    const state = await chrome.storage.local.get({ sidebarVisible: false });

    createSidebar();
    createResizeHandle();

    if (state.sidebarVisible) {
      showSidebar();
    }
  }

  function createSidebar() {
    sidebar = document.createElement('div');
    sidebar.id = 'vertab-sidebar-container';
    sidebar.className = `vertab-${settings.position} vertab-hidden`;
    sidebar.style.width = settings.sidebarWidth + 'px';

    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('sidebar/sidebar.html');
    iframe.setAttribute('allowtransparency', 'true');
    sidebar.appendChild(iframe);

    document.documentElement.appendChild(sidebar);
  }

  function createResizeHandle() {
    resizeHandle = document.createElement('div');
    resizeHandle.id = 'vertab-resize-handle';
    resizeHandle.className = `vertab-${settings.position} vertab-hidden`;
    document.documentElement.appendChild(resizeHandle);

    let startX, startWidth;

    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = settings.sidebarWidth;

      // 拖拽时禁用 iframe 的鼠标事件，防止鼠标进入 iframe 后丢失事件
      const iframe = sidebar.querySelector('iframe');
      iframe.style.pointerEvents = 'none';

      const onMouseMove = (e) => {
        let diff = e.clientX - startX;
        if (settings.position === 'right') diff = -diff;
        const newWidth = Math.max(200, Math.min(500, startWidth + diff));
        updateWidth(newWidth);
        // 实时同步宽度到其他标签页
        chrome.runtime.sendMessage({ type: 'SYNC_WIDTH', width: newWidth });
      };

      const onMouseUp = () => {
        iframe.style.pointerEvents = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        // 保存宽度
        chrome.storage.sync.set({ sidebarWidth: settings.sidebarWidth });
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  function updateWidth(width) {
    settings.sidebarWidth = width;
    sidebar.style.width = width + 'px';
    resizeHandle.style[settings.position] = width + 'px';
    document.documentElement.style.setProperty(
      settings.position === 'left' ? 'margin-left' : 'margin-right',
      width + 'px',
      'important'
    );
  }

  function showSidebar() {
    isVisible = true;
    sidebar.classList.remove('vertab-hidden');
    resizeHandle.classList.remove('vertab-hidden');
    resizeHandle.style[settings.position] = settings.sidebarWidth + 'px';

    // 压缩页面内容
    document.documentElement.classList.remove('vertab-no-push', 'vertab-push-left', 'vertab-push-right');
    document.documentElement.classList.add(`vertab-push-${settings.position}`);
    document.documentElement.style.setProperty(
      settings.position === 'left' ? 'margin-left' : 'margin-right',
      settings.sidebarWidth + 'px',
      'important'
    );

    chrome.storage.local.set({ sidebarVisible: true });
  }

  function hideSidebar() {
    isVisible = false;
    sidebar.classList.add('vertab-hidden');
    resizeHandle.classList.add('vertab-hidden');

    // 恢复页面内容
    document.documentElement.classList.remove('vertab-push-left', 'vertab-push-right');
    document.documentElement.classList.add('vertab-no-push');
    document.documentElement.style.removeProperty('margin-left');
    document.documentElement.style.removeProperty('margin-right');

    chrome.storage.local.set({ sidebarVisible: false });
  }

  function toggleSidebar() {
    if (isVisible) {
      hideSidebar();
    } else {
      showSidebar();
    }
  }

  function updatePosition(newPosition) {
    const wasVisible = isVisible;
    if (wasVisible) hideSidebar();

    settings.position = newPosition;
    sidebar.className = `vertab-${newPosition}${wasVisible ? '' : ' vertab-hidden'}`;
    resizeHandle.className = `vertab-${newPosition}${wasVisible ? '' : ' vertab-hidden'}`;

    if (wasVisible) showSidebar();
  }

  // 监听来自 background 的消息
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case 'TOGGLE_SIDEBAR':
        toggleSidebar();
        break;
      case 'TABS_UPDATED':
        // 转发给 iframe 内的 sidebar
        if (sidebar) {
          const iframe = sidebar.querySelector('iframe');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'TABS_UPDATED' }, '*');
          }
        }
        break;
      case 'SETTINGS_UPDATED':
        if (message.settings.position && message.settings.position !== settings.position) {
          updatePosition(message.settings.position);
        }
        if (message.settings.sidebarWidth && message.settings.sidebarWidth !== settings.sidebarWidth) {
          updateWidth(message.settings.sidebarWidth);
        }
        if (message.settings.theme) {
          settings.theme = message.settings.theme;
          const iframe = sidebar.querySelector('iframe');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'THEME_CHANGED', theme: settings.theme }, '*');
          }
        }
        break;
      case 'SYNC_WIDTH':
        // 其他标签页拖拽时实时同步宽度
        if (message.width && message.width !== settings.sidebarWidth && isVisible) {
          updateWidth(message.width);
        }
        break;
      case 'SYNC_UI_STATE':
        // 同步 sidebar UI 状态（如设置面板打开/关闭）
        if (sidebar) {
          const iframe = sidebar.querySelector('iframe');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'SYNC_UI_STATE', state: message.state }, '*');
          }
        }
        break;
    }
  });

  // 初始化
  init();
})();

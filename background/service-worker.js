// VerTab Background Service Worker

// 标签页截图缓存 (tabId -> dataURL)
const thumbnailCache = new Map();

// 截取当前活跃标签页的截图并缓存
async function captureTab(tabId, windowId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: 'jpeg',
      quality: 40
    });
    thumbnailCache.set(tabId, dataUrl);
    // 限制缓存大小，最多存 50 个
    if (thumbnailCache.size > 50) {
      const oldest = thumbnailCache.keys().next().value;
      thumbnailCache.delete(oldest);
    }
  } catch (e) {
    // 某些页面无法截图（chrome://, 权限不足等），忽略
  }
}

// 标签页激活时，延迟截图（等页面渲染完成）
let activeCaptureInterval = null;

chrome.tabs.onActivated.addListener((activeInfo) => {
  // 切换后截图新标签
  setTimeout(() => {
    captureTab(activeInfo.tabId, activeInfo.windowId);
  }, 800);

  // 定期刷新当前标签截图（保持截图为最新状态）
  clearInterval(activeCaptureInterval);
  activeCaptureInterval = setInterval(() => {
    captureTab(activeInfo.tabId, activeInfo.windowId);
  }, 30000); // 每 30 秒刷新一次

  broadcastToAllTabs({ type: 'TABS_UPDATED' });
});

// 页面加载完成时，截图当前活跃标签
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    setTimeout(() => captureTab(tabId, tab.windowId), 500);
  }
  if (changeInfo.title || changeInfo.favIconUrl || changeInfo.status === 'complete' || changeInfo.pinned !== undefined) {
    broadcastToAllTabs({ type: 'TABS_UPDATED' });
  }
});

// 标签页关闭时清除缓存
chrome.tabs.onRemoved.addListener((tabId) => {
  thumbnailCache.delete(tabId);
  broadcastToAllTabs({ type: 'TABS_UPDATED' });
});

// 更新扩展图标上的标签页数量角标
async function updateBadge() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  chrome.action.setBadgeText({ text: String(tabs.length) });
  chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
  chrome.action.setBadgeTextColor({ color: '#ffffff' });
}
updateBadge();

// 点击扩展图标时切换侧边栏
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch(() => {});
  }
});

// 快捷键命令
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-sidebar' && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch(() => {});
  }
});

// 获取所有标签页信息
async function getAllTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs.map(tab => ({
    id: tab.id,
    title: tab.title || '新标签页',
    url: tab.url || '',
    favIconUrl: tab.favIconUrl || '',
    active: tab.active,
    pinned: tab.pinned,
    groupId: tab.groupId,
    index: tab.index
  }));
}

// 获取标签页分组信息
async function getTabGroups() {
  const groups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  return groups.map(g => ({
    id: g.id,
    title: g.title || '',
    color: g.color,
    collapsed: g.collapsed
  }));
}

// 处理来自 sidebar iframe 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_TABS':
      getAllTabs().then(sendResponse);
      return true;

    case 'GET_THUMBNAIL':
      sendResponse({ dataUrl: thumbnailCache.get(message.tabId) || null });
      return true;

    case 'GET_TAB_GROUPS':
      getTabGroups().then(sendResponse);
      return true;

    case 'SWITCH_TAB':
      chrome.tabs.update(message.tabId, { active: true });
      break;

    case 'CLOSE_TAB':
      chrome.tabs.remove(message.tabId);
      break;

    case 'CREATE_TAB':
      chrome.tabs.create({ active: true });
      break;

    case 'PIN_TAB':
      chrome.tabs.update(message.tabId, { pinned: message.pinned });
      break;

    case 'MOVE_TAB':
      chrome.tabs.move(message.tabId, { index: message.index });
      break;

    case 'MUTE_TAB':
      chrome.tabs.update(message.tabId, { muted: message.muted });
      break;

    case 'DUPLICATE_TAB':
      chrome.tabs.duplicate(message.tabId);
      break;

    case 'RELOAD_TAB':
      chrome.tabs.reload(message.tabId);
      break;

    case 'CREATE_GROUP':
      chrome.tabs.group({ tabIds: message.tabIds }).then(groupId => {
        if (message.title) {
          chrome.tabGroups.update(groupId, { title: message.title, color: message.color || 'blue' });
        }
        sendResponse({ groupId });
      });
      return true;

    case 'ADD_TO_GROUP':
      chrome.tabs.group({ tabIds: [message.tabId], groupId: message.groupId });
      break;

    case 'REMOVE_FROM_GROUP':
      chrome.tabs.ungroup(message.tabId);
      break;

    case 'TOGGLE_GROUP_COLLAPSE':
      chrome.tabGroups.update(message.groupId, { collapsed: message.collapsed });
      break;

    case 'GET_RECENTLY_CLOSED':
      chrome.sessions.getRecentlyClosed({ maxResults: 20 }).then(sessions => {
        const tabs = sessions
          .filter(s => s.tab)
          .map(s => ({
            sessionId: s.tab.sessionId,
            title: s.tab.title,
            url: s.tab.url,
            favIconUrl: s.tab.favIconUrl
          }));
        sendResponse(tabs);
      });
      return true;

    case 'RESTORE_TAB':
      chrome.sessions.restore(message.sessionId);
      break;

    case 'GET_SETTINGS':
      chrome.storage.sync.get({
        theme: 'dark',
        position: 'left',
        sidebarWidth: 200
      }).then(sendResponse);
      return true;

    case 'SAVE_SETTINGS':
      chrome.storage.sync.set(message.settings);
      // 通知所有标签页更新设置
      broadcastToAllTabs({ type: 'SETTINGS_UPDATED', settings: message.settings });
      break;

    case 'SYNC_WIDTH':
      // 实时同步宽度到其他标签页（排除发送者）
      broadcastToOtherTabs(sender, { type: 'SYNC_WIDTH', width: message.width });
      break;

    case 'SYNC_UI_STATE':
      // 同步 UI 状态到其他标签页（排除发送者）
      broadcastToOtherTabs(sender, { type: 'SYNC_UI_STATE', state: message.state });
      break;
  }
});

// 判断标签页是否可以接收消息
function canSendToTab(tab) {
  if (!tab.id || !tab.url) return false;
  const blocked = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'chrome-search://'];
  return !blocked.some(prefix => tab.url.startsWith(prefix));
}

// 广播消息到当前窗口的所有标签页
async function broadcastToAllTabs(message) {
  updateBadge();
  const tabs = await chrome.tabs.query({ currentWindow: true });
  for (const tab of tabs) {
    if (canSendToTab(tab)) {
      try { chrome.tabs.sendMessage(tab.id, message).catch(() => {}); } catch (e) {}
    }
  }
}

// 广播消息到其他标签页（排除发送者）
async function broadcastToOtherTabs(sender, message) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  for (const tab of tabs) {
    if (tab.id !== sender.tab?.id && canSendToTab(tab)) {
      try { chrome.tabs.sendMessage(tab.id, message).catch(() => {}); } catch (e) {}
    }
  }
}

// 监听标签页变化事件，通知 sidebar 更新
chrome.tabs.onCreated.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));
chrome.tabs.onMoved.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));
chrome.tabs.onDetached.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));
chrome.tabs.onAttached.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));

// 监听标签页分组变化
chrome.tabGroups.onCreated.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));
chrome.tabGroups.onRemoved.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));
chrome.tabGroups.onUpdated.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));

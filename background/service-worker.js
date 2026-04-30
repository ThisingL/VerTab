// VerTab Background Service Worker

// 点击扩展图标时切换侧边栏
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
  }
});

// 快捷键命令
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-sidebar' && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
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

// 广播消息到当前窗口的所有标签页
async function broadcastToAllTabs(message) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  for (const tab of tabs) {
    // 跳过无法注入 content script 的页面
    if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('about:')) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  }
}

// 广播消息到其他标签页（排除发送者）
async function broadcastToOtherTabs(sender, message) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  for (const tab of tabs) {
    if (tab.id && tab.id !== sender.tab?.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('about:')) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  }
}

// 监听标签页变化事件，通知 sidebar 更新
chrome.tabs.onCreated.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));
chrome.tabs.onRemoved.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.title || changeInfo.favIconUrl || changeInfo.status === 'complete' || changeInfo.pinned !== undefined) {
    broadcastToAllTabs({ type: 'TABS_UPDATED' });
  }
});
chrome.tabs.onMoved.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));
chrome.tabs.onActivated.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));
chrome.tabs.onDetached.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));
chrome.tabs.onAttached.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));

// 监听标签页分组变化
chrome.tabGroups.onCreated.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));
chrome.tabGroups.onRemoved.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));
chrome.tabGroups.onUpdated.addListener(() => broadcastToAllTabs({ type: 'TABS_UPDATED' }));

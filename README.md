<div align="center">

# VerTab

![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?logo=googlechrome&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-Styled-1572B6?logo=css3&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

**Chrome 垂直标签页扩展，灵感来自 Arc 浏览器。**

将标签页移到侧边栏，像 Arc 和 ChatGPT 对话列表一样管理你的标签页 — 简洁、高效、触手可及。

[安装](#安装) · [功能](#功能) · [使用](#使用) · [开发](#开发) · [English](README_EN.md)

</div>

---

## 为什么选择 VerTab？

Chrome 顶部的标签栏在 10 个标签以后就变成了一堆看不清的小图标。VerTab 把标签页放到侧边栏，提供一个可滚动、可搜索、可分组的垂直列表 — 和 Arc 浏览器一样的体验，但无需更换浏览器。

## 功能

- **垂直标签列表** — favicon + 标题，当前标签高亮显示
- **一键切换** — 点击扩展图标或 `Cmd+B` / `Ctrl+B` 展开/收起
- **推挤页面** — 侧边栏展开时页面内容自动压缩，不遮挡任何内容
- **拖拽排序** — 拖动标签项调整顺序
- **固定标签** — 重要标签固定在顶部独立区域
- **搜索过滤** — 顶部搜索框即时筛选标签
- **标签分组** — 创建可折叠的彩色分组
- **恢复关闭** — "最近关闭"区域，一键恢复误关的标签
- **悬浮预览** — 悬停标签页可预览截图或页面信息
- **加载状态** — 标签页导航时显示旋转加载动画
- **右键菜单** — 固定、静音、复制、复制链接、关闭等操作
- **深色 / 浅色主题** — 一键切换，跟随你的习惯
- **左侧 / 右侧** — 侧边栏位置可选
- **宽度可调** — 拖动侧边栏边缘调整宽度
- **全标签页同步** — 宽度、主题、面板状态实时同步到所有标签页
- **增量更新** — 只更新变化的标签页，不闪烁不抖动
- **刷新无感** — 页面刷新后侧边栏瞬间恢复，几乎无感知

## 安装

### 从源码安装（开发者模式）

1. 下载或克隆本仓库

   ```bash
   git clone https://github.com/your-username/VerTab.git
   ```

2. 打开 Chrome，地址栏输入 `chrome://extensions/`

3. 右上角开启 **开发者模式**

4. 点击 **加载已解压的扩展程序**，选择 `VerTab/` 文件夹

5. （推荐）点击 Chrome 工具栏的拼图图标，将 VerTab 固定到工具栏

### 安装后注意

> 安装前已打开的标签页需要 **刷新** 才能看到侧边栏。
> 安装后新打开的标签页会自动生效。

## 使用

| 操作 | 方法 |
|------|------|
| 打开/关闭侧边栏 | 点击工具栏图标 或 `Cmd+B` / `Ctrl+B` |
| 切换标签页 | 点击侧边栏中的标签项 |
| 关闭标签页 | 悬浮后点击右侧 **x** 按钮 |
| 新建标签页 | 点击顶部 **+** 按钮 |
| 搜索 | 在顶部搜索框输入关键词 |
| 排序 | 拖拽标签项到目标位置 |
| 固定 / 取消固定 | 右键 → 固定标签页 |
| 创建分组 | 右键 → 添加到分组 |
| 恢复已关闭标签 | 展开"最近关闭"区域 |
| 切换主题 | 点击顶部主题图标 |
| 更改位置 | 设置 → 侧边栏位置 |
| 调整宽度 | 拖动侧边栏边缘 |

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+B` / `Ctrl+B` | 切换侧边栏 |
| `Escape`（搜索框内） | 清空搜索 |

可在 `chrome://extensions/shortcuts` 自定义快捷键。

## 兼容性

| 支持 | 不支持 |
|------|--------|
| 所有普通网站 | `chrome://` 内部页面 |
| localhost 开发环境 | Chrome 网上应用店页面 |
| file:// 本地文件（需开启权限） | 内置 PDF 查看器 |

## 开发

### 项目结构

```
VerTab/
├── manifest.json              # 扩展清单 (Manifest V3)
├── background/
│   └── service-worker.js      # 标签页管理、消息路由
├── content/
│   ├── content.js             # 侧边栏注入、页面压缩
│   └── content.css            # 容器样式与动画
├── sidebar/
│   ├── sidebar.html           # 侧边栏界面（iframe 加载）
│   ├── sidebar.js             # 标签页渲染、交互逻辑
│   └── sidebar.css            # 侧边栏样式（深色/浅色主题）
└── assets/icons/              # 扩展图标
```

### 架构设计

- **Content Script** 向每个页面注入一个 `<iframe>` 实现样式隔离
- **Service Worker** 管理标签页状态，在各组件间路由消息
- **Sidebar** 通过 `chrome.runtime.sendMessage` 与 Service Worker 通信
- 标签页变化通过广播实时同步到所有标签页
- 用户设置存储在 `chrome.storage.sync`，可跨设备同步

### 本地调试

1. 修改代码
2. 到 `chrome://extensions/` 点击 VerTab 卡片的刷新按钮
3. 刷新已打开的网页以加载最新的 content script

## 参与贡献

欢迎提交 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/new-feature`)
3. 提交更改 (`git commit -m 'Add new feature'`)
4. 推送分支 (`git push origin feature/new-feature`)
5. 发起 Pull Request

## 许可证

MIT License — 详见 [LICENSE](LICENSE)

---

<div align="center">

为所有标签页囤积者而作。

</div>

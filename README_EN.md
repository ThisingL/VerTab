<div align="center">

# VerTab

![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?logo=googlechrome&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-Styled-1572B6?logo=css3&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

**Vertical tabs for Chrome, inspired by Arc Browser.**

A Chrome extension that brings ARC-style vertical tab management to your browser — clean, fast, and always at your fingertips.

[Installation](#installation) · [Features](#features) · [Usage](#usage) · [Development](#development) · [Contributing](#contributing) · [中文](README.md)

</div>

---

## Why VerTab?

Chrome's horizontal tab bar doesn't scale. Once you have 10+ tabs open, they become tiny icons impossible to identify. VerTab solves this by moving your tabs to a vertical sidebar — just like Arc Browser or ChatGPT's conversation list — giving you a scrollable, searchable, organized view of all your tabs.

## Features

- **Vertical Tab List** — All tabs displayed in a clean sidebar with favicons and titles
- **Sidebar Toggle** — Click the extension icon or press `Cmd+B` / `Ctrl+B` to show/hide
- **Page Push** — Page content compresses to make room; nothing gets covered
- **Drag & Drop** — Reorder tabs by dragging them
- **Pin Tabs** — Pin important tabs to the top section
- **Search** — Instantly filter tabs by title or URL
- **Tab Groups** — Organize tabs into collapsible color-coded groups
- **Recently Closed** — Restore tabs you accidentally closed
- **Hover Preview** — Hover over a tab to see a screenshot or page info preview
- **Loading State** — Tabs show a spinning indicator while navigating
- **Right-Click Menu** — Pin, mute, duplicate, copy URL, close, and more
- **Dark / Light Theme** — Switch themes with one click
- **Left / Right Position** — Place the sidebar on either side
- **Resizable** — Drag the edge to adjust sidebar width
- **Synced State** — Width, theme, and UI state sync across all tabs in real-time
- **Incremental Updates** — Only changed tabs are updated; no flickering or full re-renders
- **Instant Restore** — Sidebar restores instantly on page refresh with no visible delay

## Installation

### From Source (Developer Mode)

1. Clone or download this repository

   ```bash
   git clone https://github.com/your-username/VerTab.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top-right corner)

4. Click **Load unpacked** and select the `VerTab/` folder

5. *(Recommended)* Click the puzzle icon in Chrome's toolbar and pin VerTab for quick access

### After Installation

> Already-open tabs need a **page refresh** for the sidebar to appear.
> New tabs opened after installation work immediately.

## Usage

| Action | How |
|--------|-----|
| Toggle sidebar | Click toolbar icon or `Cmd+B` / `Ctrl+B` |
| Switch tab | Click any tab in the list |
| Close tab | Hover a tab, click the **x** button |
| New tab | Click the **+** button at the top |
| Search tabs | Type in the search box at the top |
| Reorder | Drag and drop tabs |
| Pin / Unpin | Right-click a tab → Pin |
| Create group | Right-click → Add to group |
| Restore closed tab | Expand the "Recently Closed" section |
| Switch theme | Click the theme icon at the top |
| Change position | Settings → Sidebar position |
| Resize | Drag the sidebar edge |

## Screenshots

<details>
<summary>Click to expand</summary>

> *Screenshots coming soon*

</details>

## Compatibility

| Supported | Not Supported |
|-----------|---------------|
| All regular websites | `chrome://` pages |
| `localhost` development | Chrome Web Store pages |
| File URLs (if enabled) | PDF viewer (built-in) |

## Development

### Project Structure

```
VerTab/
├── manifest.json              # Extension manifest (MV3)
├── background/
│   └── service-worker.js      # Tab management, message routing
├── content/
│   ├── content.js             # Sidebar injection, page compression
│   └── content.css            # Container styles & animations
├── sidebar/
│   ├── sidebar.html           # Sidebar UI (loaded as iframe)
│   ├── sidebar.js             # Tab rendering, interactions
│   └── sidebar.css            # Sidebar styles (dark/light themes)
└── assets/icons/              # Extension icons
```

### Architecture

- **Content Script** injects an `<iframe>` into each page for style isolation
- **Service Worker** manages tab state and routes messages between components
- **Sidebar** communicates with the service worker via `chrome.runtime.sendMessage`
- Tab changes are broadcast to all tabs in real-time for instant updates
- Settings stored in `chrome.storage.sync` (synced across devices)

### Local Development

1. Make your changes
2. Go to `chrome://extensions/`
3. Click the reload button on the VerTab card
4. Refresh any open tabs to pick up content script changes

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+B` / `Ctrl+B` | Toggle sidebar |
| `Escape` (in search) | Clear search |

You can customize shortcuts at `chrome://extensions/shortcuts`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with care for tab hoarders everywhere.

</div>

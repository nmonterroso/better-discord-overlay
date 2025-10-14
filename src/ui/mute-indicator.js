const { app, screen, BrowserWindow, ipcMain } = require('electron')
const events = require('../discord/events')

function centerPosition(windowWidth, windowHeight) {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  return {
    x: Math.floor((screenWidth - windowWidth) / 2),
    y: Math.floor((screenHeight - windowHeight) / 2),
  }
}

class MuteIndicator {
  constructor(discordBridge, storage) {
    this.bridge = discordBridge
    this.storage = storage
    this.windowSize = 65
    this.settings = this.loadSettings()
    this.window = this.createWindow()
    this.lastShowRequested = false
  }

  init() {
    this.subscribe()
    this.installIpcHandlers()
    // Always visible window
    this.window.showInactive()
  }

  subscribe() {
    this.bridge.on(events.SHOW_MUTE_INDICATOR, this.onShowMuteIndicator)
    this.bridge.on(events.DISCONNECT, this.onDisconnect)
  }

  onShowMuteIndicator = (show) => {
    this.lastShowRequested = !!show
    // Window is always visible; forward discord mute state to renderer
    if (!this.window.isVisible()) this.window.showInactive()
    try {
      this.window.webContents.send('discord-mute:state', { muted: !!show })
    } catch (_) {}
  }

  onDisconnect = () => {
    // Keep window visible; optionally mark as unmuted
    try { this.window.webContents.send('discord-mute:state', { muted: false }) } catch (_) {}
  }

  // --- internal helpers ---
  isLocked() { return !!(this.settings && this.settings.locked) }

  createWindow() {
    const initialPos = (this.settings && typeof this.settings.x === 'number' && typeof this.settings.y === 'number')
      ? { x: this.settings.x, y: this.settings.y }
      : centerPosition(this.windowSize * 2, this.windowSize)

    const initialWidth = (this.settings && typeof this.settings.width === 'number')
      ? this.settings.width : (this.windowSize * 2)
    const initialHeight = (this.settings && typeof this.settings.height === 'number')
      ? this.settings.height : this.windowSize

    const win = new BrowserWindow({
      width: initialWidth, // two side-by-side cells by default
      height: initialHeight,
      x: initialPos.x,
      y: initialPos.y,
      frame: false,
      show: false,
      skipTaskbar: true,
      opacity: .7,
      transparent: false,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    })

    // No aspect ratio enforcement needed without resize

    win.setAlwaysOnTop(true, 'screen-saver')
    this.applyLockMouseBehavior(win)
    // win.webContents.openDevTools()
    // No square aspect ratio; leave as 2:1

    // Persist position when moved
    let moveSaveTimer = null
    win.on('move', () => {
      const [x, y] = win.getPosition()
      this.settings.x = x
      this.settings.y = y
      clearTimeout(moveSaveTimer)
      moveSaveTimer = setTimeout(() => {
        this.saveSettings()
      }, 200)
    })

    // Persist size when resized (only possible when unlocked)
    let resizeSaveTimer = null
    win.on('resize', () => {
      const [width, height] = win.getSize()
      this.settings.width = width
      this.settings.height = height
      clearTimeout(resizeSaveTimer)
      resizeSaveTimer = setTimeout(() => {
        this.saveSettings()
      }, 200)
    })

    win.loadFile('ui/html/mute-indicator.html')
    return win
  }

  applyLockMouseBehavior(win) {
    // No custom drag regions; use native title bar when unlocked (frame=true)
    win.setIgnoreMouseEvents(false)
    if (win && win.webContents) {
      win.webContents.send('mute-indicator:state', { locked: this.isLocked() })
    }
  }

  loadSettings() {
    // Read from new nested keys with fallback to previous top-level keys
    const locked = this.storage.read('window.locked', false)
    const x = this.storage.read('window.x')
    const y = this.storage.read('window.y')
    const width = this.storage.read('window.width', this.windowSize * 2)
    const height = this.storage.read('window.height', this.windowSize)
    const hotkey = this.storage.read('global_mic_mute_hotkey', 'Ctrl+Alt+Shift+\\') // reserved for future use
    const settings = { locked, width, height }
    if (typeof x === 'number') settings.x = x
    if (typeof y === 'number') settings.y = y
    if (typeof hotkey === 'string') settings.hotkey = hotkey
    return settings
  }

  saveSettings() {
    if (!this.settings) return
    if ('locked' in this.settings) this.storage.write('window.locked', !!this.settings.locked)
    if ('x' in this.settings) this.storage.write('window.x', this.settings.x)
    if ('y' in this.settings) this.storage.write('window.y', this.settings.y)
    if ('width' in this.settings) this.storage.write('window.width', this.settings.width)
    if ('height' in this.settings) this.storage.write('window.height', this.settings.height)
    if ('hotkey' in this.settings) this.storage.write('global_mic_mute_hotkey', this.settings.hotkey)
  }

  installIpcHandlers() {
    ipcMain.on('mute-indicator:get-state', (event) => {
      event.sender.send('mute-indicator:state', { locked: this.isLocked() })
    })

    ipcMain.on('mute-indicator:set-locked', (_event, locked) => {
      this.settings.locked = !!locked
      this.saveSettings()
      // Notify renderer so it can enable/disable drag regions via CSS
      this.applyLockMouseBehavior(this.window)
      if (!this.window.isVisible()) this.window.showInactive()
    })
  }
}

module.exports = MuteIndicator

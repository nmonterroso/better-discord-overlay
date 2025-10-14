const { app, screen, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
const events = require('../discord/events')

function centerPosition(windowSize) {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  return {
    x: Math.floor((screenWidth - windowSize) / 2),
    y: Math.floor((screenHeight - windowSize) / 2),
  }
}

class MuteIndicator {
  constructor(discordBridge) {
    this.bridge = discordBridge
    this.settingsPath = path.join(app.getPath('userData'), 'mute-indicator.json')
    this.windowSize = 65
    this.settings = this.loadSettings()
    this.window = this.createWindow()
    this.lastShowRequested = false
  }

  init() {
    this.subscribe()
    this.installIpcHandlers()
    if (!this.isLocked()) {
      this.window.showInactive()
    }
  }

  subscribe() {
    this.bridge.on(events.SHOW_MUTE_INDICATOR, this.onShowMuteIndicator)
    this.bridge.on(events.DISCONNECT, this.onDisconnect)
  }

  onShowMuteIndicator = (show) => {
    this.lastShowRequested = !!show
    if (!this.isLocked()) {
      if (!this.window.isVisible()) this.window.showInactive()
      return
    }
    if (show && !this.window.isVisible()) {
      this.window.showInactive()
    } else if (!show && this.window.isVisible()) {
      this.window.hide()
    }
  }

  onDisconnect = () => {
    this.window.hide()
  }

  // --- internal helpers ---
  isLocked() { return !!(this.settings && this.settings.locked) }

  createWindow() {
    const initialPos = (this.settings && typeof this.settings.x === 'number' && typeof this.settings.y === 'number')
      ? { x: this.settings.x, y: this.settings.y }
      : centerPosition(this.windowSize)

    const win = new BrowserWindow({
      width: this.windowSize,
      height: this.windowSize,
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

    win.setAspectRatio(1)
    win.setAlwaysOnTop(true, 'screen-saver')
    this.applyLockMouseBehavior(win)
    // win.webContents.openDevTools()
    win.on('resize', () => {
      const [ width ] = win.getSize()
      win.setSize(width, width)
    })

    // Persist position when moved
    let moveSaveTimer = null
    win.on('move', () => {
      const [x, y] = win.getPosition()
      this.settings.x = x
      this.settings.y = y
      clearTimeout(moveSaveTimer)
      moveSaveTimer = setTimeout(() => this.saveSettings(), 200)
    })

    win.loadFile('ui/html/mute-indicator.html')
    return win
  }

  applyLockMouseBehavior(win) {
    // Always allow mouse events so the lock toggle is clickable.
    // Dragging is controlled in the renderer via CSS app-region.
    win.setIgnoreMouseEvents(false)
    // Inform renderer of lock state
    if (win && win.webContents) {
      win.webContents.send('mute-indicator:state', { locked: this.isLocked() })
    }
  }

  loadSettings() {
    try {
      const raw = fs.readFileSync(this.settingsPath, 'utf8')
      const parsed = JSON.parse(raw)
      return Object.assign({ locked: false }, parsed)
    } catch (_) {
      return { locked: false }
    }
  }

  saveSettings() {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings))
    } catch (_) {}
  }

  installIpcHandlers() {
    ipcMain.on('mute-indicator:get-state', (event) => {
      event.sender.send('mute-indicator:state', { locked: this.isLocked() })
    })

    ipcMain.on('mute-indicator:set-locked', (_event, locked) => {
      this.settings.locked = !!locked
      this.saveSettings()
      this.applyLockMouseBehavior(this.window)
      // If unlocked, ensure visible regardless of show state
      if (!this.isLocked() && !this.window.isVisible()) {
        this.window.showInactive()
      }
      // If locked and last requested show was false, hide
      if (this.isLocked() && !this.lastShowRequested && this.window.isVisible()) {
        this.window.hide()
      }
    })
  }
}

module.exports = MuteIndicator

const { app, screen, BrowserWindow, ipcMain, globalShortcut } = require('electron')
const fs = require('fs')
const path = require('path')
const events = require('../discord/events')

function centerPosition(windowWidth, windowHeight) {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  return {
    x: Math.floor((screenWidth - windowWidth) / 2),
    y: Math.floor((screenHeight - windowHeight) / 2),
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
    this.mic = null
    this.micMuted = null
  }

  init() {
    this.subscribe()
    this.installIpcHandlers()
    this.initMicControl()
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
      : centerPosition(this.windowSize * 2, this.windowSize)

    const win = new BrowserWindow({
      width: this.windowSize * 2, // two columns: discord icon + mic block
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

    win.setAlwaysOnTop(true, 'screen-saver')
    this.applyLockMouseBehavior(win)
    // win.webContents.openDevTools()
    // no aspect lock; window is 2:1 now

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
      const withDefaults = Object.assign({ locked: false, hotkey: 'Control+Alt+M' }, parsed)
      if (!withDefaults.hotkey || typeof withDefaults.hotkey !== 'string') {
        withDefaults.hotkey = 'Control+Alt+M'
      }
      return withDefaults
    } catch (_) {
      return { locked: false, hotkey: 'Control+Alt+M' }
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
      // also provide current mic state if known
      this.sendMicState()
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

  // ---- System microphone control (Windows) ----
  initMicControl() {
    // Register global hotkey regardless; will no-op if control unavailable
    try {
      const combo = this.settings && this.settings.hotkey ? this.settings.hotkey : 'Control+Alt+M'
      const ok = globalShortcut.register(combo, () => {
        this.toggleMicMute()
      })
      if (!ok) console.warn(`Global shortcut registration failed for ${combo}`)
    } catch (e) {
      console.warn('Global shortcut error', e)
    }

    // Try to load Windows mic control library
    try {
      // Lazy require to avoid crashing if not installed
      const winAudio = require('win-audio')  // requires node-gyp build: https://github.com/nodejs/node-gyp
      if (winAudio && winAudio.mic) {
        this.mic = winAudio.mic
        // Initial state if accessible
        this.micMuted = this.getMicMuted()
        this.sendMicState()
        // Listen for changes (best-effort; API differs by versions)
        if (typeof this.mic.on === 'function') {
          try {
            this.mic.on('mute', (muted) => { this.micMuted = !!muted; this.sendMicState() })
          } catch (_) {}
          try {
            this.mic.on('change', () => { this.micMuted = this.getMicMuted(); this.sendMicState() })
          } catch (_) {}
        }
      } else {
        console.warn('win-audio did not expose mic control')
      }
    } catch (e) {
      console.warn('Mic control unavailable; install win-audio to enable. Error:', e && e.message)
    }

    // Cleanup on exit
    app.on('will-quit', () => {
      try { globalShortcut.unregister('Control+Alt+M') } catch (_) {}
      try { globalShortcut.unregisterAll() } catch (_) {}
    })
  }

  getMicMuted() {
    try {
      if (!this.mic) return null
      if (typeof this.mic.isMuted === 'function') return !!this.mic.isMuted()
      if (typeof this.mic.getMuted === 'function') return !!this.mic.getMuted()
      if (Object.prototype.hasOwnProperty.call(this.mic, 'isMuted')) return !!this.mic.isMuted
      return null
    } catch (_) { return null }
  }

  toggleMicMute() {
    if (!this.mic) {
      console.warn('Mic toggle requested but mic control is unavailable (install win-audio)')
      return
    }
    try {
      if (typeof this.mic.toggle === 'function') {
        this.mic.toggle()
      } else {
        const muted = !!this.getMicMuted()
        if (muted && typeof this.mic.unmute === 'function') this.mic.unmute()
        else if (!muted && typeof this.mic.mute === 'function') this.mic.mute()
      }
      // Update state after toggle
      setTimeout(() => { this.micMuted = this.getMicMuted(); this.sendMicState() }, 50)
    } catch (e) { console.warn('Mic toggle failed', e) }
  }

  sendMicState() {
    try {
      if (this.window && this.window.webContents) {
        this.window.webContents.send('system-mic:state', { muted: this.micMuted })
      }
    } catch (_) {}
  }
}

module.exports = MuteIndicator

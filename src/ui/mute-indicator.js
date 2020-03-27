const { screen, BrowserWindow } = require('electron')
const events = require('../discord/events')

function createWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize
  const windowSize = 100

  let win = new BrowserWindow({
    width: windowSize,
    height: windowSize,
    x: Math.floor((screenWidth - windowSize) / 2),
    y: 25,
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegration: true
    },
  })

  win.setAspectRatio(1)
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setIgnoreMouseEvents(true);
  win.setOpacity(.7)
  // win.webContents.openDevTools()
  win.on('resize', () => {
    const [ width ] = win.getSize()
    win.setSize(width, width);
  })

  // and load the index.html of the app.
  win.loadFile('index.html')

  return win
}

class MuteIndicator {
  constructor(discordBridge) {
    this.bridge = discordBridge
    this.window = createWindow()
  }

  init() {
    this.subscribe()
  }

  subscribe() {
    this.bridge.on(events.SHOW_MUTE_INDICATOR, this.onShowMuteIndicator)
  }

  onShowMuteIndicator = (show) => {
    if (show && !this.window.isVisible()) {
      this.window.showInactive()
    } else if (!show && this.window.isVisible()) {
      this.window.hide()
    }
  }
}

module.exports = MuteIndicator

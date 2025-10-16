import { jest } from '@jest/globals'

// Mock Electron modules
jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn(() => '1.0.0'),
    getName: jest.fn(() => 'JLCONE'),
    getPath: jest.fn((name: string) => `/mock/path/${name}`),
    quit: jest.fn(),
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
    isReady: jest.fn(() => true),
    dock: {
      setIcon: jest.fn()
    }
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    loadURL: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    minimize: jest.fn(),
    maximize: jest.fn(),
    unmaximize: jest.fn(),
    isMaximized: jest.fn(() => false),
    setTitle: jest.fn(),
    webContents: {
      send: jest.fn(),
      on: jest.fn(),
      openDevTools: jest.fn()
    }
  })),
  BrowserView: jest.fn().mockImplementation(() => ({
    webContents: {
      loadURL: jest.fn(),
      on: jest.fn(),
      send: jest.fn()
    },
    setBounds: jest.fn(),
    setAutoResize: jest.fn()
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn()
  },
  dialog: {
    showMessageBox: jest.fn(),
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn()
  },
  shell: {
    openExternal: jest.fn()
  },
  nativeTheme: {
    shouldUseDarkColors: false,
    on: jest.fn()
  }
}))

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    size: 0,
    store: {}
  }))
})

// Mock electron-updater
jest.mock('electron-updater', () => ({
  autoUpdater: {
    checkForUpdatesAndNotify: jest.fn(),
    on: jest.fn(),
    setFeedURL: jest.fn(),
    quitAndInstall: jest.fn()
  }
}))

// Mock log4js
jest.mock('log4js', () => ({
  configure: jest.fn(),
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}))

// Mock ws
jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1
  }))
}))

// Mock crypto-js
jest.mock('crypto-js', () => ({
  MD5: jest.fn(() => ({ toString: jest.fn(() => 'mock-hash') })),
  SHA256: jest.fn(() => ({ toString: jest.fn(() => 'mock-hash') }))
}))

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4')
}))

// Mock systeminformation
jest.mock('systeminformation', () => ({
  system: jest.fn(() => Promise.resolve({ manufacturer: 'Mock', model: 'Mock' })),
  cpu: jest.fn(() => Promise.resolve({ manufacturer: 'Mock', brand: 'Mock' })),
  mem: jest.fn(() => Promise.resolve({ total: 8589934592, available: 4294967296 }))
}))

// Mock getmac
jest.mock('getmac', () => ({
  default: jest.fn(() => Promise.resolve('00:00:00:00:00:00'))
}))

// Mock os-utils
jest.mock('os-utils', () => ({
  cpuUsage: jest.fn((callback: (usage: number) => void) => callback(0.5)),
  freemem: jest.fn(() => 4096),
  totalmem: jest.fn(() => 8192),
  platform: jest.fn(() => 'darwin')
}))
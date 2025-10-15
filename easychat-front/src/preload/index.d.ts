import { ElectronAPI as ToolkitElectronAPI } from '@electron-toolkit/preload'
import { ElectronAPI } from '../types'

declare global {
  interface Window {
    electron: ToolkitElectronAPI
    electronAPI: ElectronAPI
  }
}

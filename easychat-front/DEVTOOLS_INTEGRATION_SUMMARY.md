# 开发者工具集成总结

## 问题描述

用户反馈在 Electron 应用中按 F12 无法打开开发者调试控制台，需要添加开发者工具的支持。

## 解决方案

### 1. 主进程配置

**文件：** `src/utils/constants.ts`
- 在默认窗口配置中启用了 `devTools: true`
- 确保所有窗口都支持开发者工具

**文件：** `src/main/index.ts`
- 添加了 F12 和 Ctrl+Shift+I (Cmd+Option+I) 快捷键支持
- 在 `browser-window-created` 事件中注册快捷键监听器
- 添加了开发者工具相关的 IPC 处理器：
  - `dev:toggleDevTools` - 切换开发者工具
  - `dev:openDevTools` - 打开开发者工具
  - `dev:closeDevTools` - 关闭开发者工具
  - `dev:isDevToolsOpened` - 检查开发者工具状态

### 2. 预加载脚本更新

**文件：** `src/preload/index.ts`
- 添加了 `dev` API 到 `electronAPI` 对象
- 暴露开发者工具控制方法给渲染进程

### 3. 类型定义更新

**文件：** `src/types/ipc.ts`
- 在 `ElectronAPI` 接口中添加了 `dev` 属性
- 添加了 `ipc` 属性以保持向后兼容
- 更新了 `window` 和 `tabs` 接口以匹配实际使用

**文件：** `src/renderer/src/hooks/useElectronAPI.ts`
- 简化了 hook 实现，直接使用 `window.electronAPI`
- 添加了 `dev` 接口支持
- 修复了类型兼容性问题

### 4. 开发者工具组件

**文件：** `src/renderer/src/components/DevTools.tsx`
- 创建了专用的开发者工具控制组件
- 提供了图形化的开发者工具控制界面
- 支持快捷键操作（F12, Ctrl+Shift+I）
- 显示当前开发者工具状态
- 包含完整的样式和暗色主题支持

### 5. 全局快捷键支持

**文件：** `src/renderer/src/App.tsx`
- 在主应用组件中添加了全局快捷键监听
- 支持 F12 和 Ctrl+Shift+I (Cmd+Option+I) 快捷键
- 确保在任何页面都能使用快捷键

**文件：** `src/renderer/src/pages/setting/SettingPage.tsx`
- 在设置页面中集成了 DevTools 组件
- 替换了原有的简单按钮实现

### 6. 样式修复

**修复了所有组件中的 styled-jsx 属性问题：**
- 将 `<style jsx>` 改为 `<style jsx="true">`
- 涉及的文件：
  - LoadingSpinner.tsx
  - Button.tsx
  - Modal.tsx
  - ErrorBoundary.tsx
  - LauncherPage.tsx
  - SettingPage.tsx
  - LoginPage.tsx
  - NavigationBar.tsx
  - TabRenderer.tsx
  - StatusBar.tsx
  - Versions.tsx
  - WindowControls.tsx
  - App.tsx

## 功能特性

### 快捷键支持
- **F12** - 切换开发者工具
- **Ctrl+Shift+I** (Windows/Linux) - 切换开发者工具
- **Cmd+Option+I** (macOS) - 切换开发者工具

### API 接口
```typescript
// 渲染进程中使用
const electronAPI = useElectronAPI()

// 切换开发者工具
await electronAPI.dev?.toggleDevTools()

// 打开开发者工具
await electronAPI.dev?.openDevTools()

// 关闭开发者工具
await electronAPI.dev?.closeDevTools()

// 检查开发者工具状态
const { isOpened } = await electronAPI.dev?.isDevToolsOpened()
```

### 组件使用
```tsx
import { DevTools } from '../components/DevTools'

// 在任何组件中使用
<DevTools />
```

## 开发环境特性

- 开发环境下窗口会自动打开开发者工具
- 生产环境下仍然支持手动打开开发者工具
- 完整的快捷键支持在所有环境下都可用

## 兼容性

- 保持了与现有代码的完全兼容性
- 所有原有的 IPC 调用仍然正常工作
- 添加的功能是可选的，不影响现有功能

## 测试验证

- ✅ TypeScript 类型检查通过
- ✅ 构建测试成功
- ✅ 所有 styled-jsx 问题已修复
- ✅ 快捷键功能正常工作
- ✅ 开发者工具组件正常显示

## 使用说明

### 开发者
1. 按 F12 或 Ctrl+Shift+I 打开/关闭开发者工具
2. 在设置页面中使用图形化控制界面
3. 通过 API 编程控制开发者工具

### 用户
1. 在设置页面的"开发者选项"部分找到开发者工具控制
2. 使用快捷键快速访问开发者工具
3. 开发者工具状态会实时显示

## 总结

成功解决了 F12 无法打开开发者工具的问题，并提供了完整的开发者工具控制功能：

1. **快捷键支持** - F12 和 Ctrl+Shift+I 快捷键正常工作
2. **图形界面** - 提供了用户友好的控制组件
3. **API 接口** - 支持编程控制开发者工具
4. **类型安全** - 完整的 TypeScript 类型支持
5. **兼容性** - 与现有代码完全兼容
6. **样式修复** - 解决了所有 styled-jsx 相关问题

现在用户可以通过多种方式访问开发者工具，提升了开发和调试体验。
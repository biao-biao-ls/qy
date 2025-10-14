# 设计文档

## 概述

本设计文档详细描述了将 desktop-app 项目迁移到 easychat-front 现代化架构的技术方案。迁移将保持所有现有功能，同时采用 Vite 构建系统、现代化的项目结构和改进的开发工具链。

## 架构

### 当前架构分析

**desktop-app 架构特点：**
- 构建工具：Webpack 5 + TypeScript
- 项目结构：复杂的多层级目录结构
- 窗口管理：自定义的 WndMgr 窗口管理器
- 标签页系统：基于 BrowserView 的 TabManager
- 消息系统：WebSocket 推送 + IPC 通信
- 配置管理：复杂的 AppConfig 系统
- 更新机制：electron-updater 自动更新

**easychat-front 架构特点：**
- 构建工具：Vite + electron-vite
- 项目结构：标准的 Electron 三层架构
- 开发工具：现代化的 ESLint + Prettier
- 依赖管理：更新的 Electron 和 React 版本

### 目标架构设计

```
easychat-front/
├── src/
│   ├── main/                    # 主进程代码
│   │   ├── index.ts            # 主进程入口
│   │   ├── windows/            # 窗口管理
│   │   ├── managers/           # 业务管理器
│   │   ├── config/             # 配置管理
│   │   ├── services/           # 服务层
│   │   └── utils/              # 工具函数
│   ├── preload/                # 预加载脚本
│   │   ├── index.ts            # 主预加载脚本
│   │   ├── browser.ts          # 浏览器预加载
│   │   ├── frame.ts            # 框架预加载
│   │   └── view.ts             # 视图预加载
│   └── renderer/               # 渲染进程代码
│       ├── src/
│       │   ├── components/     # React 组件
│       │   ├── pages/          # 页面组件
│       │   ├── hooks/          # React Hooks
│       │   ├── utils/          # 渲染进程工具
│       │   └── types/          # 类型定义
│       └── index.html          # HTML 模板
├── resources/                  # 静态资源
├── build/                      # 构建配置
└── out/                        # 构建输出
```

## 组件和接口

### 主进程组件

#### 1. 窗口管理系统
```typescript
// src/main/managers/WindowManager.ts
export class WindowManager {
    private windows: Map<string, BrowserWindow>
    
    createMainWindow(): BrowserWindow
    createLoginWindow(): BrowserWindow
    createSettingWindow(): BrowserWindow
    createAlertWindow(type: AlertType): BrowserWindow
    
    getWindow(id: string): BrowserWindow | undefined
    closeWindow(id: string): void
    closeAllWindows(): void
}
```

#### 2. 标签页管理系统
```typescript
// src/main/managers/TabManager.ts
export class TabManager extends EventEmitter {
    private tabs: Map<string, TabItem>
    private browserViews: Map<string, BrowserView>
    
    createTab(options: TabCreateOptions): TabItem
    removeTab(tabId: string): void
    switchTab(tabId: string): void
    updateTabState(tabId: string, state: Partial<TabState>): void
}
```

#### 3. 配置管理系统
```typescript
// src/main/config/AppConfig.ts
export class AppConfig {
    private store: ElectronStore
    
    get<T>(key: string): T
    set<T>(key: string, value: T): void
    has(key: string): boolean
    delete(key: string): void
    
    // 配置同步和备份
    syncConfig(): Promise<void>
    backupConfig(): Promise<void>
    restoreConfig(): Promise<void>
}
```

#### 4. 消息推送系统
```typescript
// src/main/services/PushService.ts
export class PushService extends EventEmitter {
    private wsConnection: WebSocket
    private messageQueue: Queue<PushMessage>
    
    connect(): Promise<void>
    disconnect(): void
    sendMessage(message: PushMessage): void
    onMessage(callback: (message: PushMessage) => void): void
}
```

### 预加载脚本接口

#### 1. 主预加载脚本
```typescript
// src/preload/index.ts
export interface ElectronAPI {
    // 窗口操作
    window: {
        minimize(): void
        maximize(): void
        close(): void
        setTitle(title: string): void
    }
    
    // 标签页操作
    tabs: {
        create(options: TabCreateOptions): Promise<TabItem>
        remove(tabId: string): Promise<void>
        switch(tabId: string): Promise<void>
        getAll(): Promise<TabItem[]>
    }
    
    // 配置操作
    config: {
        get<T>(key: string): Promise<T>
        set<T>(key: string, value: T): Promise<void>
        onChange(callback: (key: string, value: any) => void): void
    }
    
    // 消息推送
    push: {
        onMessage(callback: (message: PushMessage) => void): void
        sendMessage(message: PushMessage): Promise<void>
    }
}
```

### 渲染进程组件

#### 1. 主应用组件
```typescript
// src/renderer/src/App.tsx
export const App: React.FC = () => {
    const [tabs, setTabs] = useState<TabItem[]>([])
    const [activeTab, setActiveTab] = useState<string>('')
    
    // 标签页管理逻辑
    // 窗口状态管理
    // 消息处理逻辑
}
```

#### 2. 标签页组件
```typescript
// src/renderer/src/components/TabRenderer.tsx
export interface TabRendererProps {
    tabs: TabItem[]
    activeTab: string
    onTabCreate: (options: TabCreateOptions) => void
    onTabRemove: (tabId: string) => void
    onTabSwitch: (tabId: string) => void
}

export const TabRenderer: React.FC<TabRendererProps> = (props) => {
    // 标签页渲染逻辑
    // 拖拽功能
    // 右键菜单
}
```

## 数据模型

### 标签页数据模型
```typescript
export interface TabItem {
    id: string
    title: string
    url: string
    favicon?: string
    isActive: boolean
    isLoading: boolean
    canGoBack: boolean
    canGoForward: boolean
    createdAt: Date
    updatedAt: Date
}

export interface TabCreateOptions {
    url: string
    title?: string
    isActive?: boolean
    position?: number
}

export interface TabState {
    isLoading: boolean
    title: string
    url: string
    favicon?: string
    canGoBack: boolean
    canGoForward: boolean
}
```

### 配置数据模型
```typescript
export interface AppConfigData {
    // 窗口配置
    window: {
        bounds: Rectangle
        isMaximized: boolean
        isFullScreen: boolean
    }
    
    // 用户偏好
    preferences: {
        language: string
        theme: 'light' | 'dark' | 'auto'
        autoUpdate: boolean
        notifications: boolean
    }
    
    // 标签页配置
    tabs: {
        defaultUrls: string[]
        maxTabs: number
        restoreOnStartup: boolean
    }
    
    // 网络配置
    network: {
        proxy?: ProxyConfig
        timeout: number
        retryCount: number
    }
}
```

### 消息推送数据模型
```typescript
export interface PushMessage {
    id: string
    type: MessageType
    title: string
    content: string
    data?: any
    timestamp: Date
    priority: 'low' | 'normal' | 'high'
}

export enum MessageType {
    NOTIFICATION = 'notification',
    ALERT = 'alert',
    UPDATE = 'update',
    SYSTEM = 'system'
}
```

## 错误处理

### 错误分类和处理策略

#### 1. 窗口管理错误
```typescript
export class WindowError extends Error {
    constructor(
        public windowId: string,
        public operation: string,
        message: string
    ) {
        super(`Window ${windowId} ${operation}: ${message}`)
    }
}

// 处理策略：记录日志，尝试恢复窗口状态
```

#### 2. 标签页管理错误
```typescript
export class TabError extends Error {
    constructor(
        public tabId: string,
        public operation: string,
        message: string
    ) {
        super(`Tab ${tabId} ${operation}: ${message}`)
    }
}

// 处理策略：移除问题标签页，通知用户
```

#### 3. 配置管理错误
```typescript
export class ConfigError extends Error {
    constructor(
        public key: string,
        public operation: string,
        message: string
    ) {
        super(`Config ${key} ${operation}: ${message}`)
    }
}

// 处理策略：使用默认配置，记录错误日志
```

#### 4. 网络连接错误
```typescript
export class NetworkError extends Error {
    constructor(
        public url: string,
        public statusCode?: number,
        message?: string
    ) {
        super(`Network error for ${url}: ${statusCode} ${message}`)
    }
}

// 处理策略：重试机制，降级处理
```

### 全局错误处理器
```typescript
// src/main/utils/ErrorHandler.ts
export class ErrorHandler {
    static handleError(error: Error): void {
        // 记录错误日志
        logger.error(error)
        
        // 根据错误类型进行处理
        if (error instanceof WindowError) {
            this.handleWindowError(error)
        } else if (error instanceof TabError) {
            this.handleTabError(error)
        } else if (error instanceof ConfigError) {
            this.handleConfigError(error)
        } else {
            this.handleGenericError(error)
        }
    }
    
    private static handleWindowError(error: WindowError): void {
        // 窗口错误处理逻辑
    }
    
    private static handleTabError(error: TabError): void {
        // 标签页错误处理逻辑
    }
    
    private static handleConfigError(error: ConfigError): void {
        // 配置错误处理逻辑
    }
    
    private static handleGenericError(error: Error): void {
        // 通用错误处理逻辑
    }
}
```

## 测试策略

### 单元测试
- 使用 Jest 进行单元测试
- 测试覆盖率目标：80%以上
- 重点测试：配置管理、标签页管理、消息处理

### 集成测试
- 使用 Spectron 进行 Electron 应用测试
- 测试窗口创建、标签页操作、IPC 通信

### 端到端测试
- 使用 Playwright 进行端到端测试
- 测试完整的用户工作流程

### 性能测试
- 内存使用监控
- 启动时间测试
- 标签页切换性能测试

## 代码优化和重构策略

### 代码清理原则
1. **移除冗余代码**：删除未使用的文件、函数和变量
2. **简化复杂逻辑**：重构过度复杂的函数和类
3. **统一代码风格**：应用现代 TypeScript 最佳实践
4. **优化性能**：减少不必要的计算和内存占用
5. **提升可维护性**：改善代码结构和命名规范

### 重构目标

#### 1. 简化窗口管理
```typescript
// 原始复杂的窗口管理 -> 简化的窗口管理
// 移除过度抽象的 WndBase 类
// 使用更直接的窗口创建和管理方式
export class WindowManager {
    private windows = new Map<WindowType, BrowserWindow>()
    
    // 简化的窗口创建方法
    createWindow(type: WindowType, options?: WindowOptions): BrowserWindow {
        const window = new BrowserWindow(this.getWindowConfig(type, options))
        this.windows.set(type, window)
        return window
    }
}
```

#### 2. 优化标签页系统
```typescript
// 移除过度复杂的事件系统和状态管理
// 使用更简洁的 React 状态管理
export class TabManager {
    private tabs = new Map<string, Tab>()
    
    // 简化的标签页操作
    createTab(url: string): Tab {
        const tab = new Tab(url)
        this.tabs.set(tab.id, tab)
        return tab
    }
    
    // 移除不必要的中间层和抽象
}
```

#### 3. 精简配置管理
```typescript
// 移除过度复杂的配置同步和备份机制
// 使用更简单的配置存储方案
export class AppConfig {
    private store = new Store<ConfigSchema>()
    
    // 简化的配置操作，移除不必要的复杂性
    get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
        return this.store.get(key)
    }
    
    set<K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]): void {
        this.store.set(key, value)
    }
}
```

### 代码质量改进

#### 1. TypeScript 严格模式
- 启用 `strict: true`
- 移除 `any` 类型使用
- 添加完整的类型定义
- 使用联合类型和泛型优化类型安全

#### 2. 现代 JavaScript/TypeScript 特性
- 使用 ES2022+ 语法
- 采用 async/await 替代 Promise 链
- 使用可选链操作符 `?.`
- 采用空值合并操作符 `??`

#### 3. React 最佳实践
- 使用函数组件替代类组件
- 采用 React Hooks 进行状态管理
- 实现组件懒加载和代码分割
- 优化渲染性能

### 架构简化

#### 1. 移除不必要的抽象层
```typescript
// 移除过度抽象的基类
// 删除 AppBase, WndBase 等不必要的抽象
// 直接使用 Electron API 和 React 组件

// 原始复杂结构
class WndBase extends AppBase {
    // 大量抽象方法和复杂继承
}

// 简化后的结构
class MainWindow {
    private window: BrowserWindow
    
    constructor() {
        this.window = new BrowserWindow(windowConfig)
        this.setupEventHandlers()
    }
}
```

#### 2. 简化事件系统
```typescript
// 移除复杂的自定义事件系统
// 使用原生 EventEmitter 或 React 状态管理

// 原始复杂事件系统 -> 简化的事件处理
export class EventManager extends EventEmitter {
    // 只保留必要的事件类型
    // 移除过度复杂的事件路由和处理逻辑
}
```

#### 3. 优化文件结构
```
src/
├── main/
│   ├── index.ts                 # 主进程入口（简化）
│   ├── windows/                 # 窗口管理（重构）
│   │   ├── MainWindow.ts       # 主窗口（简化逻辑）
│   │   ├── LoginWindow.ts      # 登录窗口
│   │   └── SettingWindow.ts    # 设置窗口
│   ├── managers/               # 管理器（精简）
│   │   ├── TabManager.ts       # 标签页管理（重构）
│   │   └── ConfigManager.ts    # 配置管理（简化）
│   └── utils/                  # 工具函数（清理）
├── preload/                    # 预加载脚本（优化）
└── renderer/                   # 渲染进程（现代化）
    ├── components/             # React 组件（函数组件）
    ├── hooks/                  # 自定义 Hooks
    └── utils/                  # 渲染进程工具
```

## 迁移策略

### 阶段一：基础架构迁移 + 代码清理
1. 创建新的项目结构
2. 配置 Vite 构建系统
3. 分析和清理原始代码，移除不必要的文件
4. 迁移基础的主进程代码（同时重构）
5. 配置预加载脚本（简化逻辑）

### 阶段二：核心功能迁移 + 重构
1. 重构并迁移窗口管理系统（移除过度抽象）
2. 简化并迁移标签页管理系统（优化性能）
3. 精简并迁移配置管理系统（减少复杂性）
4. 优化 IPC 通信机制（提升效率）

### 阶段三：业务功能迁移 + 优化
1. 重构消息推送系统（简化架构）
2. 优化自动更新功能（移除冗余代码）
3. 简化各种弹窗和对话框（统一组件）
4. 现代化用户设置界面（React Hooks）

### 阶段四：全面优化和测试
1. 性能优化（内存、启动时间、响应速度）
2. 代码质量提升（ESLint、Prettier、类型检查）
3. 全面测试（单元测试、集成测试）
4. 文档更新和代码注释完善

### 代码优化检查清单

#### 删除目标
- [ ] 未使用的导入和变量
- [ ] 死代码和注释掉的代码
- [ ] 过时的配置文件和脚本
- [ ] 重复的工具函数
- [ ] 不必要的抽象层和基类
- [ ] 复杂的事件系统（如果可以简化）
- [ ] 过度的错误处理包装

#### 重构目标
- [ ] 长函数拆分（>50 行）
- [ ] 复杂类简化（>300 行）
- [ ] 深层嵌套逻辑优化（>3 层）
- [ ] 重复代码提取
- [ ] 命名规范统一
- [ ] 类型定义完善
- [ ] 异步操作优化

#### 现代化目标
- [ ] 类组件转函数组件
- [ ] Promise 链转 async/await
- [ ] 传统事件处理转 React Hooks
- [ ] 老式模块导入转 ES6 模块
- [ ] 配置文件现代化
- [ ] 构建脚本优化

## 风险评估

### 高风险项
1. **复杂的标签页系统**：BrowserView 管理逻辑复杂，需要仔细迁移
2. **配置同步机制**：多进程配置同步可能出现数据不一致
3. **消息推送系统**：WebSocket 连接管理和消息队列处理

### 中风险项
1. **构建配置差异**：Webpack 到 Vite 的配置转换
2. **依赖版本升级**：Electron 和 React 版本升级可能带来兼容性问题
3. **文件路径变更**：项目结构变更可能影响资源加载

### 低风险项
1. **UI 组件迁移**：React 组件相对独立，迁移风险较低
2. **工具函数迁移**：纯函数迁移风险最小
3. **静态资源迁移**：图片、字体等资源文件迁移简单

## 性能考虑

### 构建性能
- Vite 的快速冷启动和热重载
- 按需编译减少构建时间
- 优化的依赖预构建

### 运行时性能
- 减少主进程阻塞操作
- 优化 IPC 通信频率
- 合理使用 Web Workers

### 内存管理
- 及时清理不用的 BrowserView
- 优化大对象的生命周期
- 监控内存泄漏
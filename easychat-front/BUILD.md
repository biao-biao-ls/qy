# 构建和打包指南

## 构建配置

本项目使用 Vite + electron-vite 作为构建工具，支持快速开发和高效打包。

### 开发模式

```bash
# 启动开发服务器
npm run dev

# 预览构建结果
npm start
```

### 构建命令

```bash
# 生产环境构建
npm run build

# 开发环境构建（包含 source map）
npm run build:dev

# 清理构建输出
npm run clean

# 构建分析
npm run build:analyze
```

## 打包配置

### 基础打包

```bash
# 打包到目录（不生成安装包）
npm run build:unpack

# 构建所有平台
npm run package:all
```

### 平台特定打包

#### Windows

```bash
# Windows 32位
npm run package:win32

# Win
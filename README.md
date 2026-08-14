# ba-memorylobby-wallpaper-runtime

`ba-memorylobby-wallpaper-runtime` 是面向《蔚蓝档案》纪念大厅风格 Wallpaper Engine Web 壁纸的通用运行时内核。它将壁纸的程序能力与具体角色内容分离，使模型、动画、对话和音频能够以内容包的形式接入，而帧率控制、画面布局、播放状态及 Wallpaper Engine 宿主通信等逻辑由统一的运行时维护。

本仓库不包含具体角色的 Spine 模型、纹理、语音、BGM、字幕、预览图或 Wallpaper Engine 作品元数据，也不生成最终作品的 `project.json`。这些内容应由各壁纸实例项目自行拥有。当前版本提供运行时的基础契约和第一批通用模块；它仍是源码级 TypeScript 包，尚未发布到 npm registry。

## 快速开始

### 环境要求

- Node.js 22 或更高版本
- npm 10 或更高版本
- TypeScript 由项目开发依赖提供，无需全局安装

克隆或进入仓库后安装依赖：

```powershell
npm install
```

运行全部静态检查和测试：

```powershell
npm run check
```

也可以分别执行：

```powershell
npm run typecheck
npm test
```

### 在壁纸实例中定义内容

运行时通过 `defineWallpaper()` 接收实例配置。下面是最小内容包示例：

```ts
import { defineWallpaper } from "ba-memorylobby-wallpaper-runtime";

export const wallpaper = defineWallpaper({
  schemaVersion: 1,
  id: "example-memory-lobby",
  model: {
    binary: "./assets/model/example.skel",
    atlases: {
      "2k": "./assets/model/2k/example.atlas",
      "4k": "./assets/model/4k/example.atlas",
    },
    spineVersion: "3.8.99",
    designViewport: {
      width: 2560,
      height: 1600,
      centerX: 0,
      centerY: 800,
    },
  },
  animations: {
    intro: "Start_Idle_01",
    idle: "Idle_01",
    tracks: {
      base: 0,
      motion: 1,
      attachment: 2,
    },
  },
});
```

在启动应用前校验定义：

```ts
import {
  assertWallpaperDefinition,
  validateWallpaperDefinition,
} from "ba-memorylobby-wallpaper-runtime";

const issues = validateWallpaperDefinition(wallpaper);

if (issues.length > 0) {
  console.error(issues);
}

assertWallpaperDefinition(wallpaper);
```

`validateWallpaperDefinition()` 返回所有已发现的问题，适合构建工具或编辑器展示；`assertWallpaperDefinition()` 在配置无效时抛出一个包含问题路径的错误，适合构建和启动门禁。

### 接入 Wallpaper Engine 回调

Wallpaper Engine 专用入口与通用入口分开导出：

```ts
import {
  installWallpaperEngineBridge,
  type WallpaperProperties,
} from "ba-memorylobby-wallpaper-runtime/wallpaper-engine";

const disposeBridge = installWallpaperEngineBridge(window, {
  applyUserProperties(properties: WallpaperProperties) {
    // 将作品的用户属性转换为应用内部设置。
  },
  applyGeneralProperties(properties: WallpaperProperties) {
    // 处理 FPS 等 Wallpaper Engine 通用属性。
  },
  setPaused(paused) {
    // 暂停或恢复渲染、动画和音频。
  },
});

// 应用销毁或热重载时恢复安装前的宿主监听器。
disposeBridge();
```

本地开发可暂时使用 workspace 或本地路径依赖。例如在实例项目的 `package.json` 中使用：

```json
{
  "dependencies": {
    "ba-memorylobby-wallpaper-runtime": "file:../ba-memorylobby-wallpaper-runtime"
  }
}
```

由于当前导出直接指向 TypeScript 源文件，实例项目的构建器必须能够解析 TypeScript。发布为正式软件包前，应增加编译产物与声明文件，并将 `exports` 切换到 `dist`。

## 架构

运行时遵循“实例内容依赖运行时，运行时不反向依赖实例”的单向边界：

```text
壁纸实例
├─ 角色资源与授权信息
├─ WallpaperDefinition
├─ 作品界面与 project.json
└─ 实例默认设置
          │
          ▼
ba-memorylobby-wallpaper-runtime
├─ 内容契约与校验
├─ 对话播放状态
├─ 帧率与时间步进
├─ 视口、模型和字幕布局
└─ Wallpaper Engine 宿主桥接
```

源码按职责组织：

```text
src/
├─ definition.ts                  # 内容包公共类型与 defineWallpaper
├─ validation.ts                  # 内容定义的运行时校验
├─ dialogue/
│  └─ DialoguePlaybackSequence.ts # 对话序列及自动续播状态
├─ render/
│  └─ FrameLimiter.ts             # 固定帧率时间步进
├─ layout/
│  ├─ viewport.ts                 # CSS、渲染分辨率和世界视口换算
│  ├─ modelTransform.ts           # 模型旋转矩阵与点坐标变换
│  └─ subtitle.ts                 # 字幕位置和对齐方式
└─ wallpaper-engine/
   └─ WallpaperEngineBridge.ts    # Wallpaper Engine 全局监听器适配
```

根入口只导出与宿主无关的模块；Wallpaper Engine 桥接通过 `/wallpaper-engine` 子路径显式导入。这样普通浏览器测试和纯逻辑测试不必依赖 Wallpaper Engine 全局接口。

`WallpaperDefinition` 是实例和运行时之间的主要边界。运行时模块应依赖其中的通用字段，不能导入某个实例的配置文件，也不能包含角色 ID、固定资源路径、固定语言集合或特定动画名称。

## 功能和接口

### 内容定义

`defineWallpaper(definition)` 在 TypeScript 中保留传入对象的精确字面量类型，同时约束它满足 `WallpaperDefinition`。当前 Schema 版本为 `1`。

主要字段如下：

| 字段 | 作用 |
| --- | --- |
| `id` | 内容包的稳定唯一标识 |
| `model.binary` | Spine 二进制骨骼文件路径 |
| `model.atlases` | 纹理档位到 atlas 文件路径的映射 |
| `model.spineVersion` | 内容期望使用的 Spine 运行时版本 |
| `model.designViewport` | 内容制作时的设计坐标系和中心点 |
| `animations` | 入场、待机动画以及基础、动作、附件轨道编号 |
| `interactions` | 视线跟随、摸头、命中区域和交互时间参数 |
| `dialogues` | 对话编号、动作动画、持续时间和多语言字幕 |
| `audio` | 可选 BGM 信息和语音路径解析函数 |

语言与纹理档位使用字符串类型，实例可以声明自身实际支持的集合，不要求所有壁纸具有相同语言或相同分辨率档位。

### 定义校验

`validateWallpaperDefinition(definition)` 返回只读的 `DefinitionIssue[]`。每项包括：

- `path`：问题字段路径，例如 `dialogues[1].index`
- `message`：不带角色上下文的错误说明

当前校验覆盖内容 ID、模型路径、atlas 档位、设计视口尺寸、对话编号、对话时长以及不区分大小写的字幕行 ID 唯一性。文件是否存在、动画和骨骼是否真实存在于 Spine 数据中，仍应由实例构建工具完成。

### 对话播放序列

`DialoguePlaybackSequence` 管理对话顺序，不负责动画、音频或字幕本身：

```ts
const sequence = new DialoguePlaybackSequence(5);

sequence.start(sequence.nextIndex, false);
sequence.setAutomaticPlaybackAfterCurrent(true);

const continuation = sequence.takeAutomaticContinuation();
```

主要接口：

| 接口 | 行为 |
| --- | --- |
| `nextIndex` | 下一次手动播放应使用的编号 |
| `automaticPlaybackActive` | 当前是否存在待续播的对话 |
| `start(index, automatic)` | 开始指定对话，并更新手动和自动队列 |
| `takeAutomaticContinuation()` | 取出并推进下一段自动对话 |
| `setAutomaticPlaybackAfterCurrent(enabled)` | 修改当前对话结束后的续播状态 |
| `cancelAutomaticPlayback()` | 取消自动续播，但保留当前对话 |
| `stop()` | 停止当前队列，保留下次手动编号 |
| `reset()` | 清空状态并将手动编号恢复为 `1` |

构造参数必须是正整数；播放编号必须位于 `1` 到对话总数之间。

### 帧率限制

`FrameLimiter` 将浏览器帧间隔累积成稳定的模拟时间步：

```ts
const limiter = new FrameLimiter();
const delta = limiter.advance(elapsedSeconds, 60);

if (delta !== null) {
  updateAndRender(delta);
}
```

`advance()` 返回 `null` 表示尚未达到下一帧阈值；FPS 小于等于零时不限制帧率。单次累计时间会限制在 `0.25` 秒以内，以避免页面恢复后使用过大的时间步推进动画。切换渲染上下文或重新开始计时时应调用 `reset()`。

### 视口布局

`calculateViewportLayout()` 根据 CSS 尺寸、目标渲染高度、GPU 最大纹理尺寸、模型缩放和设计视口，计算：

- 实际渲染像素宽高
- CSS 像素到渲染像素的比例
- Spine 世界坐标中的可见矩形
- 超过 WebGL 上限时的等比例缩减结果

调用方必须提供大于零的 `modelScale`、合理的目标高度和 GPU 上限。该函数不访问 DOM，可直接进行单元测试。

### 模型坐标变换

- `modelRotationRadians(degrees)`：角度转换为弧度
- `createModelRotationMatrix(degrees, pivot)`：创建围绕给定轴心旋转的 4×4 矩阵
- `rotateModelPoint(point, degrees, pivot)`：对交互点或命中区域中心执行相同旋转

渲染和命中测试应使用同一旋转轴心，避免模型画面与交互区域发生偏移。

### 字幕布局

`applySubtitleLayout(element, settings)` 将字幕对齐和位置写入元素的 `data-alignment`、`data-position`，并设置 `--subtitle-x`、`--subtitle-y` CSS 自定义属性。

`isSubtitleAlignment()` 与 `isSubtitlePosition()` 可用于验证来自 Wallpaper Engine 或本地调试界面的未知值。

### Wallpaper Engine 桥接

`installWallpaperEngineBridge(host, callbacks)` 安装 Wallpaper Engine 识别的 `wallpaperPropertyListener`，支持：

- `applyUserProperties`
- `applyGeneralProperties`
- `setPaused`

返回的清理函数只会在当前监听器仍由该次调用拥有时恢复旧值，因此适用于应用销毁和开发时热重载。桥接只转发宿主事件，不规定作品属性名称，也不负责把属性值解释为应用设置。

## 注意事项

- 本仓库是运行时库，不应提交具体角色资产、作品预览图、作品描述、来源研究材料或由 Wallpaper Engine 生成的作品文件。
- `WallpaperDefinition.id`、对话 ID 和 Wallpaper Engine 用户属性键都应视为持久接口。作品发布后随意改名可能破坏用户已保存的设置或音频事件关联。
- `schemaVersion` 用于内容契约演进。出现不兼容变更时应提升 Schema 版本并提供明确迁移方式，不能静默改变旧字段含义。
- `spineVersion` 只是内容声明。当前基础包尚未包含 Spine WebGL 加载器，也不会自动选择或校验 Spine runtime；实例必须加载与模型兼容且许可允许分发的运行时。
- 内容定义中的资源路径应使用适合离线构建的相对路径。不要依赖开发服务器地址、用户机器绝对路径或运行时网络下载。
- `audio.voicePath` 是函数，因此内容定义不是纯 JSON。需要生成清单、缓存键或校验报告时，应由工具层将它解析成确定的文件列表。
- `FrameLimiter` 的参数单位都是秒。传入毫秒会导致动画和帧率行为错误。
- `calculateViewportLayout()` 不替调用方处理非法缩放值；实例配置和用户属性适配层应先限制数值范围。
- 安装 Wallpaper Engine 桥接后应保存并调用清理函数，尤其是在热重载或重复初始化场景中，避免残留旧回调。
- 通用浏览器测试不能替代真实 Wallpaper Engine 验证。任何实例接入或升级本运行时后，在部署到正式作品目录前，都必须分别完成外部 Chrome 行为与控制台检查，以及真实 Wallpaper Engine 窗口中的交互、属性回调、暂停/恢复和日志验证。
- 当前包仍处于 `0.x` 阶段且标记为 `private`。在接口稳定、生成 JavaScript 和 `.d.ts` 产物、补齐许可证及发布流程之前，不应作为公共 npm 包发布。

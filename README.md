# ba-memorial-lobby-wallpaper-runtime

`ba-memorial-lobby-wallpaper-runtime` 是面向《蔚蓝档案》纪念大厅风格 Wallpaper Engine Web 壁纸的通用运行时内核。它将壁纸的程序能力与具体角色内容分离，使模型、动画、对话和音频能够以内容包的形式接入，而帧率控制、画面布局、播放状态及 Wallpaper Engine 宿主通信等逻辑由统一的运行时维护。

本包不包含具体角色的 Spine 模型、纹理、语音、BGM、字幕、预览图或 Wallpaper Engine 作品元数据，也不生成最终作品的 `project.json`。这些内容应由各壁纸实例项目自行拥有。

## 快速开始

### 环境要求

- Node.js 22 或更高版本
- npm 10 或更高版本
- TypeScript 由项目开发依赖提供，无需全局安装

### 在壁纸实例中安装

```powershell
npm install ba-memorial-lobby-wallpaper-runtime
```

实例项目应在 `dependencies` 中声明受限的版本范围（例如 `^0.1.0`），通过 npm 版本更新接收运行时修复与功能演进。

### 在壁纸实例中定义内容

运行时通过 `defineWallpaper()` 接收实例配置。下面是最小内容包示例：

```ts
import { defineWallpaper } from "ba-memorial-lobby-wallpaper-runtime";

export const wallpaper = defineWallpaper({
  schemaVersion: 1,
  id: "example-memorial-lobby",
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
} from "ba-memorial-lobby-wallpaper-runtime";

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
} from "ba-memorial-lobby-wallpaper-runtime/wallpaper-engine";

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

包入口指向 `dist` 中的 ESM JavaScript 和类型声明。仓库内开发时先运行 `npm run build`；`npm run check`、`npm test` 和 `npm pack` 会自动执行构建。

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
ba-memorial-lobby-wallpaper-runtime
├─ 内容契约与校验
├─ Spine 渲染与指针交互
├─ 对话、字幕与音频生命周期
├─ 设置内核与 Wallpaper Engine 适配
├─ 帧率与时间步进
├─ 日志与调试界面
├─ 视口、模型和字幕布局
└─ Wallpaper Engine 宿主桥接
```

源码按职责组织：

```text
src/
├─ definition.ts                  # 内容包公共类型与 defineWallpaper
├─ validation.ts                  # 内容定义的运行时校验
├─ app/
│  └─ App.ts                      # 应用协调器：启动、渲染循环与暂停协调
├─ audio/
│  ├─ BgmPlayer.ts                # BGM 加载与播放状态
│  └─ VoicePlayer.ts              # 对话语音播放
├─ debug-ui/
│  ├─ LogViewerController.ts      # 日志查看器
│  ├─ DebugPanelPointerController.ts # 调试面板拖拽
│  └─ visibility.ts               # 调试面板可见性解析
├─ dialogue/
│  ├─ DialoguePlaybackSequence.ts # 对话序列及自动续播状态
│  └─ SubtitlePresenter.ts        # 字幕行解析与呈现
├─ i18n/
│  └─ panel.ts                    # 调试面板中英双语文案
├─ interaction/
│  ├─ PointerInteractionController.ts # 命中区到视线/摸头/对话意图
│  └─ interactionSettings.ts      # 交互设置变更判定
├─ layout/
│  ├─ viewport.ts                 # CSS、渲染分辨率和世界视口换算
│  ├─ modelTransform.ts           # 模型旋转矩阵与点坐标变换
│  └─ subtitle.ts                 # 字幕位置和对齐方式
├─ lifecycle/
│  └─ initializeStableResourceVariant.ts # 资源档位稳定初始化
├─ logging/
│  └─ WallpaperLogger.ts          # 分类日志与会话持久化
├─ render/
│  └─ FrameLimiter.ts             # 固定帧率时间步进
├─ settings/
│  ├─ WallpaperEngineAdapter.ts   # WE 用户属性到应用设置的适配
│  ├─ qualityPreset.ts            # 画质预设
│  ├─ resolution.ts               # 模型与渲染分辨率
│  ├─ propertyGroupPresets.ts     # 属性分组预设
│  └─ propertyGroupVisibility.ts  # 属性分组可见性
├─ spine/
│  ├─ SpineRenderer.ts            # WebGL 渲染、轨道切换与上下文恢复
│  └─ resetPlaybackPose.ts        # 播放姿态复位
├─ ui/
│  └─ createWallpaperShell.ts     # 壁纸 DOM 外壳
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

完整交互壁纸还需要提供 `InteractiveWallpaperDefinition` 要求的全部必填交互字段（视线与摸头骨骼、命中区域、夹紧范围、冷却与拖拽阈值等），`App` 与 `SpineRenderer` 依赖这些字段运行。

语言与纹理档位使用字符串类型，实例可以声明自身实际支持的集合，不要求所有壁纸具有相同语言或相同分辨率档位。

### 定义校验

`validateWallpaperDefinition(definition)` 返回只读的 `DefinitionIssue[]`。每项包括：

- `path`：问题字段路径，例如 `dialogues[1].index`
- `message`：不带角色上下文的错误说明

当前校验覆盖内容 ID、模型路径、atlas 档位、设计视口尺寸、对话编号、对话时长以及不区分大小写的字幕行 ID 唯一性。文件是否存在、动画和骨骼是否真实存在于 Spine 数据中，仍应由实例构建工具完成。

### 壁纸外壳

`createWallpaperShell(root, options)` 创建画布、字幕、状态面板、日志查看器和自定义滚动条等完整 DOM 外壳。`options` 提供 `title`、`canvasLabel` 和 `editionLabel`。外壳标记由运行时生成，实例的 `index.html` 只需保留一个空的挂载根节点。

### 应用协调器

`App` 组装外壳、Spine 渲染器、指针交互、音频与对话生命周期、设置内核与日志，并负责启动协调、渲染循环调度与暂停协调。`WallpaperAppOptions` 接收内容定义、字幕行解析函数、日志实例与可选的调试面板文案。

### Spine 渲染与指针交互

`SpineRenderer` 负责 WebGL 渲染、动画轨道切换、播放姿态复位、模型旋转与缩放、资源档位切换，以及 WebGL 上下文丢失与恢复。它不包含 Spine 数据加载器；skeleton 与 animation state 由实例加载后注入，`spineVersion` 声明由内容包保证与注入数据兼容。

`PointerInteractionController` 将指针命中区域（`head` / `body` / `background`）解析为对话、视线跟随或摸头意图，并处理拖拽阈值、冷却与对话宽限期。

### 对话与字幕

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

`SubtitlePresenter` 按事件 ID 解析多语言字幕行（`resolveSubtitlePresentation()`），并呈现主/次文本。

### 音频

`BgmPlayer` 管理 BGM 的加载、播放、暂停与错误状态（`disabled` / `loading` / `playing` / `paused` / `blocked` / `error`），支持懒加载。`VoicePlayer` 通过语音路径解析函数播放指定对话的语音，不持有具体路径。

### 设置内核

`WallpaperEngineAdapter` 将 Wallpaper Engine 用户属性适配为应用设置，并提供冻结的 `DEFAULT_SETTINGS`（版本 `7`）。配套模块提供：

- `QUALITY_PRESETS` 与 `isQualityPreset()`：画质预设
- `MODEL_RESOLUTIONS` / `RENDER_RESOLUTIONS` 与类型守卫：模型与渲染分辨率
- 属性分组预设与 `resolvePropertyGroupVisibility()`：面板可见性与分组
- `didInteractionSettingsChange()` 等判定函数：设置变更检测

实例通过预设键组合获得一致的默认行为，无需复制设置逻辑。

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

### 日志与调试界面

`WallpaperLogger` 按分类记录日志，并将会话持久化供回看；`LogViewerController` 驱动日志查看器，`DebugPanelPointerController` 支持调试面板拖拽。面板文案由 `PANEL_TEXT` 提供中英双语（`PanelLocale`）。

### 资源稳定初始化

`initializeStableResourceVariant()` 在资源档位（例如纹理档位）切换时，若新档位加载失败则保持上一次成功状态，避免画面空白或闪烁。

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
- `spineVersion` 只是内容声明。`SpineRenderer` 不加载 Spine 数据；实例必须注入与模型兼容且许可允许分发的 Spine skeleton 与 animation state。
- 内容定义中的资源路径应使用适合离线构建的相对路径。不要依赖开发服务器地址、用户机器绝对路径或运行时网络下载。
- `audio.voicePath` 是函数，因此内容定义不是纯 JSON。需要生成清单、缓存键或校验报告时，应由工具层将它解析成确定的文件列表。
- `FrameLimiter` 的参数单位都是秒。传入毫秒会导致动画和帧率行为错误。
- `calculateViewportLayout()` 不替调用方处理非法缩放值；实例配置和用户属性适配层应先限制数值范围。
- 安装 Wallpaper Engine 桥接后应保存并调用清理函数，尤其是在热重载或重复初始化场景中，避免残留旧回调。
- 通用浏览器测试不能替代真实 Wallpaper Engine 验证。任何实例接入或升级本运行时后，在部署到正式作品目录前，都必须分别完成外部 Chrome 行为与控制台检查，以及真实 Wallpaper Engine 窗口中的交互、属性回调、暂停/恢复和日志验证。
- 当前包为 `0.x` 阶段。`0.x` 期间语义化版本只保证补丁级兼容；升级运行时后应重新完成上述验证门禁，并在接口稳定后另行评估 `1.0` 发布。

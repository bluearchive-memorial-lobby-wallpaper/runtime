export type PanelLocale = "zh-cn" | "en";

export interface PanelText {
  panelAria: string;
  controlsAria: string;
  voiceLanguageAria: string;
  showDebugPanel: string;
  hideDebugPanel: string;
  openLogs: string;
  closeLogs: string;
  restoreHostSettings: string;
  expandSection: string;
  collapseSection: string;
  status: string;
  animation: string;
  interaction: string;
  lastAction: string;
  event: string;
  fps: string;
  fpsLimit: string;
  viewport: string;
  renderStatus: string;
  debugPanelVisibilityHint: string;
  visualQuality: string;
  preset: string;
  defaultPreset: string;
  maximumPreset: string;
  customPreset: string;
  renderResolution: string;
  modelResolution: string;
  panelSettings: string;
  panelPositionAndScale: string;
  panelSize: string;
  panelX: string;
  panelY: string;
  customPanelLayout: string;
  customVisualQuality: string;
  customModelLayout: string;
  customAnimationAndInteractions: string;
  interactionSettings: string;
  customDialogue: string;
  customSubtitlePosition: string;
  positionAndScale: string;
  modelScale: string;
  modelX: string;
  modelY: string;
  modelRotation: string;
  animationAndInteractions: string;
  introAnimation: string;
  interactiveActions: string;
  mouseTracking: string;
  headPatting: string;
  dialogue: string;
  volume: string;
  muted: string;
  dialoguePlayback: string;
  dialogueAutoPlay: string;
  dialogueLanguage: string;
  showSubtitles: string;
  subtitleSettings: string;
  primarySubtitleLanguage: string;
  showSecondarySubtitles: string;
  secondarySubtitleLanguage: string;
  subtitleAlignment: string;
  subtitleAlignCenter: string;
  subtitleAlignLeft: string;
  subtitleAlignRight: string;
  subtitlePosition: string;
  subtitlePositionBottomCenter: string;
  subtitlePositionTopCenter: string;
  subtitlePositionScreenCenter: string;
  subtitlePositionBottomLeft: string;
  subtitleX: string;
  subtitleY: string;
  replay: string;
  skipToIdle: string;
  nextDialogue: string;
  showHitboxes: string;
  hideHitboxes: string;
  voiceLanguage: string;
  chinese: string;
  japanese: string;
  korean: string;
  voiceVolume: string;
  bgmVolume: string;
  frameRate: string;
  panelLanguage: string;
  simplifiedChinese: string;
  english: string;
  loadingSpine: string;
  unlimited: string;
  phases: Record<"booting" | "loading" | "running" | "paused" | "error", string>;
  bgmStates: Record<"disabled" | "loading" | "playing" | "paused" | "blocked" | "error", string>;
  interactions: Record<"intro" | "idle" | "dialogue" | "look" | "pat" | "cooldown", string>;
}

export const PANEL_TEXT: Record<PanelLocale, PanelText> = {
  "zh-cn": {
    showDebugPanel: "显示调试面板",
    hideDebugPanel: "隐藏调试面板",
    openLogs: "打开日志",
    closeLogs: "关闭日志",
    restoreHostSettings: "恢复 WE 设置",
    expandSection: "展开",
    collapseSection: "折叠",
    panelAria: "Hare（露营）状态与控制面板",
    controlsAria: "壁纸调试控制",
    voiceLanguageAria: "对话语音语言",
    status: "状态",
    animation: "动画",
    interaction: "交互",
    lastAction: "最近动作",
    event: "事件",
    fps: "FPS",
    fpsLimit: "FPS 上限",
    viewport: "视口",
    renderStatus: "渲染",
    debugPanelVisibilityHint:
      "要切换调试面板的可见性，点击壁纸右上角的“显示/隐藏调试面板”按钮",
    visualQuality: "画面质量",
    preset: "预设",
    defaultPreset: "默认",
    maximumPreset: "最高",
    customPreset: "自定义",
    renderResolution: "渲染分辨率",
    modelResolution: "模型纹理",
    panelSettings: "面板设置",
    panelPositionAndScale: "位置与缩放",
    panelSize: "面板尺寸",
    panelX: "面板 X",
    panelY: "面板 Y",
    customPanelLayout: "自定义面板布局",
    customVisualQuality: "自定义画面质量",
    customModelLayout: "自定义模型布局",
    customAnimationAndInteractions: "自定义动画与互动",
    interactionSettings: "交互设置",
    customDialogue: "自定义对话",
    customSubtitlePosition: "自定义字幕位置",
    positionAndScale: "位置与缩放",
    modelScale: "模型缩放",
    modelX: "模型 X",
    modelY: "模型 Y",
    modelRotation: "模型旋转",
    animationAndInteractions: "动画与互动",
    introAnimation: "入场动画",
    interactiveActions: "交互动作",
    mouseTracking: "鼠标跟随",
    headPatting: "摸头",
    dialogue: "对话",
    volume: "音量",
    muted: "静音",
    dialoguePlayback: "对话播放",
    dialogueAutoPlay: "自动播放",
    dialogueLanguage: "对话语言",
    showSubtitles: "显示字幕",
    subtitleSettings: "字幕",
    primarySubtitleLanguage: "主字幕语言",
    showSecondarySubtitles: "显示副字幕",
    secondarySubtitleLanguage: "副字幕语言",
    subtitleAlignment: "字幕对齐",
    subtitleAlignCenter: "居中对齐",
    subtitleAlignLeft: "左对齐",
    subtitleAlignRight: "右对齐",
    subtitlePosition: "字幕位置",
    subtitlePositionBottomCenter: "底部中央",
    subtitlePositionTopCenter: "顶部中央",
    subtitlePositionScreenCenter: "屏幕中心",
    subtitlePositionBottomLeft: "底部左侧",
    subtitleX: "字幕 X",
    subtitleY: "字幕 Y",
    replay: "完整重播",
    skipToIdle: "切到待机",
    nextDialogue: "下一组对话",
    showHitboxes: "显示命中区",
    hideHitboxes: "隐藏命中区",
    voiceLanguage: "对话语音",
    chinese: "中文",
    japanese: "日文",
    korean: "韩文",
    voiceVolume: "对话音量",
    bgmVolume: "BGM 音量",
    frameRate: "帧率",
    panelLanguage: "面板语言",
    simplifiedChinese: "简体中文",
    english: "英文",
    loadingSpine: "正在加载 Spine 资源……",
    unlimited: "无限制",
    phases: { booting: "启动中", loading: "载入中", running: "运行中", paused: "已暂停", error: "错误" },
    bgmStates: { disabled: "已关闭", loading: "载入中", playing: "播放中", paused: "已暂停", blocked: "等待点击", error: "错误" },
    interactions: { intro: "入场", idle: "待机", dialogue: "对话", look: "视线跟随", pat: "摸头", cooldown: "冷却" },
  },
  en: {
    showDebugPanel: "Show debug panel",
    hideDebugPanel: "Hide debug panel",
    openLogs: "Open logs",
    closeLogs: "Close logs",
    restoreHostSettings: "Restore WE settings",
    expandSection: "Expand",
    collapseSection: "Collapse",
    panelAria: "Hare (Camping) status and controls",
    controlsAria: "Wallpaper debug controls",
    voiceLanguageAria: "Dialogue voice language",
    status: "Status",
    animation: "Animation",
    interaction: "Interaction",
    lastAction: "Last action",
    event: "Event",
    fps: "FPS",
    fpsLimit: "FPS limit",
    viewport: "Viewport",
    renderStatus: "Render",
    debugPanelVisibilityHint:
      'To toggle the debug panel, click the "Show/Hide Debug Panel" button in the top-right corner of the wallpaper.',
    visualQuality: "Visual Quality",
    preset: "Preset",
    defaultPreset: "Default",
    maximumPreset: "Maximum",
    customPreset: "Custom",
    renderResolution: "Render resolution",
    modelResolution: "Model texture",
    panelSettings: "Panel Settings",
    panelPositionAndScale: "Position & Scale",
    panelSize: "Panel size",
    panelX: "Panel X",
    panelY: "Panel Y",
    customPanelLayout: "Custom Panel Layout",
    customVisualQuality: "Custom Visual Quality",
    customModelLayout: "Custom Model Layout",
    customAnimationAndInteractions: "Custom Animation & Interactions",
    interactionSettings: "Interaction Settings",
    customDialogue: "Custom Dialogue",
    customSubtitlePosition: "Custom Subtitle Position",
    positionAndScale: "Position & Scale",
    modelScale: "Model scale",
    modelX: "Model X",
    modelY: "Model Y",
    modelRotation: "Model rotation",
    animationAndInteractions: "Animation & Interactions",
    introAnimation: "Intro animation",
    interactiveActions: "Interactive actions",
    mouseTracking: "Mouse tracking",
    headPatting: "Head patting",
    dialogue: "Dialogue",
    volume: "Volume",
    muted: "Mute",
    dialoguePlayback: "Dialogue Playback",
    dialogueAutoPlay: "Auto play",
    dialogueLanguage: "Dialogue Language",
    showSubtitles: "Show subtitles",
    subtitleSettings: "Subtitles",
    primarySubtitleLanguage: "Primary subtitle language",
    showSecondarySubtitles: "Show secondary subtitles",
    secondarySubtitleLanguage: "Secondary subtitle language",
    subtitleAlignment: "Subtitle alignment",
    subtitleAlignCenter: "Center",
    subtitleAlignLeft: "Left",
    subtitleAlignRight: "Right",
    subtitlePosition: "Subtitle position",
    subtitlePositionBottomCenter: "Bottom center",
    subtitlePositionTopCenter: "Top center",
    subtitlePositionScreenCenter: "Screen center",
    subtitlePositionBottomLeft: "Bottom left",
    subtitleX: "Subtitle X",
    subtitleY: "Subtitle Y",
    replay: "Full replay",
    skipToIdle: "Skip to idle",
    nextDialogue: "Next dialogue",
    showHitboxes: "Show hitboxes",
    hideHitboxes: "Hide hitboxes",
    voiceLanguage: "Dialogue voice",
    chinese: "Chinese",
    japanese: "Japanese",
    korean: "Korean",
    voiceVolume: "Dialogue volume",
    bgmVolume: "BGM volume",
    frameRate: "Frame rate",
    panelLanguage: "Panel language",
    simplifiedChinese: "Simplified Chinese",
    english: "English",
    loadingSpine: "Loading Spine assets…",
    unlimited: "Unlimited",
    phases: { booting: "Booting", loading: "Loading", running: "Running", paused: "Paused", error: "Error" },
    bgmStates: { disabled: "Disabled", loading: "Loading", playing: "Playing", paused: "Paused", blocked: "Click to play", error: "Error" },
    interactions: { intro: "Intro", idle: "Idle", dialogue: "Dialogue", look: "Eye tracking", pat: "Head pat", cooldown: "Cooldown" },
  },
};

export function isPanelLocale(value: unknown): value is PanelLocale {
  return value === "zh-cn" || value === "en";
}

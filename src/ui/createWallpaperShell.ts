export interface WallpaperShellOptions {
  readonly title?: string;
  readonly canvasLabel?: string;
  readonly editionLabel?: string;
}

const WALLPAPER_SHELL_TEMPLATE = `<canvas id="wallpaper" aria-label="Memory Lobby animated wallpaper"></canvas>
      <canvas id="interaction-overlay" class="interaction-overlay" hidden></canvas>

      <div id="subtitle" class="subtitle" aria-live="polite" hidden>
        <p id="subtitle-primary" class="subtitle__primary"></p>
        <p id="subtitle-secondary" class="subtitle__secondary" hidden></p>
      </div>

      <section id="status-panel" class="status-panel" aria-live="polite" aria-label="Wallpaper status and controls" data-panel-aria="panelAria">
        <p class="status-panel__eyebrow" hidden></p>
        <h1 id="status-title" data-wallpaper-title>Memory Lobby Wallpaper</h1>
        <dl>
          <div><dt data-panel-text="status">状态</dt><dd id="status-phase">启动中</dd></div>
          <div><dt data-panel-text="animation">动画</dt><dd id="status-animation">—</dd></div>
          <div><dt data-panel-text="interaction">交互</dt><dd id="status-interaction">入场</dd></div>
          <div><dt data-panel-text="lastAction">最近动作</dt><dd id="status-last-action">—</dd></div>
          <div><dt data-panel-text="event">事件</dt><dd id="status-event">—</dd></div>
          <div><dt>BGM</dt><dd id="status-bgm">载入中</dd></div>
          <div><dt>Spine</dt><dd id="status-runtime">3.8.99</dd></div>
          <div><dt data-panel-text="fps">FPS</dt><dd id="status-fps">0/60</dd></div>
          <div><dt data-panel-text="viewport">视口</dt><dd id="status-viewport">—</dd></div>
          <div><dt data-panel-text="renderStatus">渲染</dt><dd id="status-render-resolution">—</dd></div>
        </dl>
        <p class="status-panel__visibility-hint" data-panel-text="debugPanelVisibilityHint">要切换调试面板的可见性，点击壁纸右上角的“显示/隐藏调试面板”按钮</p>
        <div id="debug-controls" class="status-panel__controls" aria-label="壁纸调试控制" data-panel-aria="controlsAria">
          <div class="status-panel__toolbar">
            <button id="debug-open-logs" type="button" data-panel-text="openLogs">打开日志</button>
            <button id="debug-replay-intro" type="button" data-panel-text="replay">完整重播</button>
            <button id="debug-skip-idle" type="button" data-panel-text="skipToIdle">切到待机</button>
            <button id="debug-dialogue" type="button" data-panel-text="nextDialogue">下一组对话</button>
            <button id="debug-hitboxes" type="button">显示命中区</button>
            <button id="debug-restore-host-settings" type="button" data-panel-text="restoreHostSettings">恢复 WE 设置</button>
          </div>

          <div class="status-panel__property-groups">
            <fieldset class="status-panel__property-group">
              <legend><button class="status-panel__property-group-toggle" type="button" aria-expanded="true"><span data-panel-text="panelSettings">面板设置</span></button></legend>
              <div class="status-panel__control-group">
                <label class="status-panel__control-label" for="debug-panel-position-preset">
                  <span data-panel-text="panelPositionAndScale">位置与缩放</span>
                </label>
                <select id="debug-panel-position-preset">
                  <option value="default" data-panel-text="defaultPreset" selected>默认</option>
                  <option value="custom" data-panel-text="customPreset">自定义</option>
                </select>
              </div>
              <div id="debug-panel-position-custom" class="status-panel__nested-controls" hidden>
                <button class="status-panel__subgroup-toggle" type="button" aria-expanded="true"><span data-panel-text="customPanelLayout">自定义面板布局</span></button>
                <div class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-panel-scale">
                    <span data-panel-text="panelSize">面板尺寸</span>
                    <output id="debug-panel-scale-output" for="debug-panel-scale">1.00</output>
                  </label>
                  <input id="debug-panel-scale" type="range" min="0.6" max="1.4" step="0.01" value="1" />
                </div>
                <div class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-panel-x">
                    <span data-panel-text="panelX">面板 X</span>
                    <output id="debug-panel-x-output" for="debug-panel-x">0</output>
                  </label>
                  <input id="debug-panel-x" type="range" min="-1000" max="1000" step="1" value="0" />
                </div>
                <div class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-panel-y">
                    <span data-panel-text="panelY">面板 Y</span>
                    <output id="debug-panel-y-output" for="debug-panel-y">0</output>
                  </label>
                  <input id="debug-panel-y" type="range" min="-1000" max="1000" step="1" value="0" />
                </div>
              </div>
              <div class="status-panel__control-group">
                <label class="status-panel__control-label" for="debug-panel-language">
                  <span data-panel-text="panelLanguage">面板语言</span>
                </label>
                <select id="debug-panel-language">
                  <option value="zh-cn" data-panel-text="simplifiedChinese" selected>简体中文</option>
                  <option value="en" data-panel-text="english">English</option>
                </select>
              </div>
            </fieldset>

            <fieldset class="status-panel__property-group">
              <legend><button class="status-panel__property-group-toggle" type="button" aria-expanded="true"><span data-panel-text="visualQuality">画面质量</span></button></legend>
              <div class="status-panel__control-group">
                <label class="status-panel__control-label" for="debug-quality-preset">
                  <span data-panel-text="preset">预设</span>
                </label>
                <select id="debug-quality-preset">
                  <option value="default" data-panel-text="defaultPreset" selected>默认</option>
                  <option value="eco" data-panel-text="ecoPreset">节能</option>
                  <option value="2k">2K</option>
                  <option value="4k">4K</option>
                  <option value="maximum" data-panel-text="maximumPreset">最高</option>
                  <option value="custom" data-panel-text="customPreset">自定义</option>
                </select>
              </div>
              <div id="debug-quality-custom" class="status-panel__nested-controls" hidden>
                <button class="status-panel__subgroup-toggle" type="button" aria-expanded="true"><span data-panel-text="customVisualQuality">自定义画面质量</span></button>
                <div class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-render-resolution">
                    <span data-panel-text="renderResolution">渲染分辨率</span>
                  </label>
                  <select id="debug-render-resolution">
                    <option value="720p">720P</option>
                    <option value="1080p" selected>1080P</option>
                    <option value="1440p">2K</option>
                    <option value="2160p">4K</option>
                  </select>
                </div>
                <div class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-model-resolution">
                    <span data-panel-text="modelResolution">模型纹理</span>
                  </label>
                  <select id="debug-model-resolution">
                    <option value="2k" selected>2K</option>
                    <option value="4k">4K</option>
                    <option value="8k">8K</option>
                  </select>
                </div>
                <div class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-fps">
                    <span data-panel-text="fpsLimit">FPS 上限</span>
                    <output id="debug-fps-output" for="debug-fps">60 FPS</output>
                  </label>
                  <input id="debug-fps" type="range" min="15" max="160" step="1" value="60" />
                </div>
              </div>
            </fieldset>

            <fieldset class="status-panel__property-group">
              <legend><button class="status-panel__property-group-toggle" type="button" aria-expanded="true"><span data-panel-text="positionAndScale">位置与缩放</span></button></legend>
              <div class="status-panel__control-group">
                <label class="status-panel__control-label" for="debug-position-preset">
                  <span data-panel-text="preset">预设</span>
                </label>
                <select id="debug-position-preset">
                  <option value="default" data-panel-text="defaultPreset" selected>默认</option>
                  <option value="custom" data-panel-text="customPreset">自定义</option>
                </select>
              </div>
              <div id="debug-position-custom" class="status-panel__nested-controls" hidden>
                <button class="status-panel__subgroup-toggle" type="button" aria-expanded="true"><span data-panel-text="customModelLayout">自定义模型布局</span></button>
                <div class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-model-scale">
                    <span data-panel-text="modelScale">模型缩放</span>
                    <output id="debug-model-scale-output" for="debug-model-scale">0.80</output>
                  </label>
                  <input id="debug-model-scale" type="range" min="0.6" max="1.4" step="0.01" value="0.8" />
                </div>
                <div class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-model-x">
                    <span data-panel-text="modelX">模型 X</span>
                    <output id="debug-model-x-output" for="debug-model-x">0</output>
                  </label>
                  <input id="debug-model-x" type="range" min="-1000" max="1000" step="1" value="0" />
                </div>
                <div class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-model-y">
                    <span data-panel-text="modelY">模型 Y</span>
                    <output id="debug-model-y-output" for="debug-model-y">0</output>
                  </label>
                  <input id="debug-model-y" type="range" min="-1000" max="1000" step="1" value="0" />
                </div>
                <div class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-model-rotation">
                    <span data-panel-text="modelRotation">模型旋转</span>
                    <output id="debug-model-rotation-output" for="debug-model-rotation">0°</output>
                  </label>
                  <input id="debug-model-rotation" type="range" min="0" max="360" step="1" value="0" />
                </div>
              </div>
            </fieldset>

            <fieldset class="status-panel__property-group">
              <legend><button class="status-panel__property-group-toggle" type="button" aria-expanded="true"><span data-panel-text="animationAndInteractions">动画与互动</span></button></legend>
              <div class="status-panel__control-group">
                <label class="status-panel__control-label" for="debug-interaction-preset">
                  <span data-panel-text="preset">预设</span>
                </label>
                <select id="debug-interaction-preset">
                  <option value="default" data-panel-text="defaultPreset" selected>默认</option>
                  <option value="custom" data-panel-text="customPreset">自定义</option>
                </select>
              </div>
              <div id="debug-interaction-custom" class="status-panel__nested-controls" hidden>
                <button class="status-panel__subgroup-toggle" type="button" aria-expanded="true"><span data-panel-text="customAnimationAndInteractions">自定义动画与互动</span></button>
                <label class="status-panel__checkbox">
                  <span data-panel-text="introAnimation">入场动画</span>
                  <input id="debug-intro-animation" type="checkbox" checked />
                </label>
                <label class="status-panel__checkbox">
                  <span data-panel-text="interactiveActions">交互动作</span>
                  <input id="debug-interactions-enabled" type="checkbox" checked />
                </label>
                <div id="debug-interaction-dependent" class="status-panel__nested-controls">
                  <button class="status-panel__subgroup-toggle" type="button" aria-expanded="true"><span data-panel-text="interactionSettings">交互设置</span></button>
                  <label class="status-panel__checkbox">
                    <span data-panel-text="mouseTracking">鼠标跟随</span>
                    <input id="debug-mouse-tracking" type="checkbox" checked />
                  </label>
                  <label class="status-panel__checkbox">
                    <span data-panel-text="headPatting">摸头</span>
                    <input id="debug-head-patting" type="checkbox" checked />
                  </label>
                  <label class="status-panel__checkbox">
                    <span data-panel-text="dialogue">对话</span>
                    <input id="debug-voice-enabled" type="checkbox" checked />
                  </label>
                </div>
              </div>
            </fieldset>

            <fieldset class="status-panel__property-group">
              <legend><button class="status-panel__property-group-toggle" type="button" aria-expanded="true"><span data-panel-text="volume">音量</span></button></legend>
              <label class="status-panel__checkbox">
                <span data-panel-text="muted">静音</span>
                <input id="debug-muted" type="checkbox" />
              </label>
              <div id="debug-bgm-volume-control" class="status-panel__control-group">
                <label class="status-panel__control-label" for="debug-bgm-volume">
                  <span data-panel-text="bgmVolume">BGM 音量</span>
                  <output id="debug-bgm-volume-output" for="debug-bgm-volume">50%</output>
                </label>
                <input id="debug-bgm-volume" type="range" min="0" max="100" step="1" value="50" />
              </div>
              <div id="debug-voice-volume-control" class="status-panel__control-group">
                <label class="status-panel__control-label" for="debug-voice-volume">
                  <span data-panel-text="voiceVolume">对话音量</span>
                  <output id="debug-voice-volume-output" for="debug-voice-volume">70%</output>
                </label>
                <input id="debug-voice-volume" type="range" min="0" max="100" step="1" value="70" />
              </div>
            </fieldset>

            <fieldset id="debug-dialogue-playback-group" class="status-panel__property-group">
              <legend><button class="status-panel__property-group-toggle" type="button" aria-expanded="true"><span data-panel-text="dialoguePlayback">对话播放</span></button></legend>
              <label class="status-panel__checkbox">
                <span data-panel-text="dialogueAutoPlay">自动播放</span>
                <input id="debug-dialogue-autoplay" type="checkbox" />
              </label>
              <div class="status-panel__control-group">
                <label class="status-panel__control-label" for="debug-dialogue-language-preset">
                  <span data-panel-text="preset">预设</span>
                </label>
                <select id="debug-dialogue-language-preset">
                  <option value="zh-cn" data-panel-text="simplifiedChinese" selected>简体中文</option>
                  <option value="ja" data-panel-text="japanese">日文</option>
                  <option value="ko" data-panel-text="korean">韩文</option>
                  <option value="en" data-panel-text="english">英文</option>
                  <option value="custom" data-panel-text="customPreset">自定义</option>
                </select>
              </div>
              <div id="debug-dialogue-custom" class="status-panel__nested-controls" hidden>
                <button class="status-panel__subgroup-toggle" type="button" aria-expanded="true"><span data-panel-text="customDialogue">自定义对话</span></button>
                <div class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-voice-language">
                    <span data-panel-text="voiceLanguage">对话语音</span>
                  </label>
                  <select id="debug-voice-language">
                    <option value="zh-cn" data-panel-text="simplifiedChinese" selected>简体中文</option>
                    <option value="ja" data-panel-text="japanese">日文</option>
                    <option value="ko" data-panel-text="korean">韩文</option>
                  </select>
                </div>
                <div id="debug-subtitle-settings" class="status-panel__nested-controls status-panel__subtitle-settings">
                  <button class="status-panel__subgroup-toggle" type="button" aria-expanded="true"><span data-panel-text="subtitleSettings">字幕</span></button>
                <label class="status-panel__checkbox">
                  <span data-panel-text="showSubtitles">显示字幕</span>
                  <input id="debug-show-subtitles" type="checkbox" checked />
                </label>
                <div id="debug-primary-subtitle-language-control" class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-primary-subtitle-language">
                    <span data-panel-text="primarySubtitleLanguage">主字幕语言</span>
                  </label>
                  <select id="debug-primary-subtitle-language">
                    <option value="zh-cn" data-panel-text="simplifiedChinese" selected>简体中文</option>
                    <option value="ja" data-panel-text="japanese">日文</option>
                    <option value="ko" data-panel-text="korean">韩文</option>
                    <option value="en" data-panel-text="english">英文</option>
                  </select>
                </div>
                <label id="debug-show-secondary-subtitles-control" class="status-panel__checkbox">
                  <span data-panel-text="showSecondarySubtitles">显示副字幕</span>
                  <input id="debug-show-secondary-subtitles" type="checkbox" />
                </label>
                <div id="debug-secondary-subtitle-language-control" class="status-panel__control-group" hidden>
                  <label class="status-panel__control-label" for="debug-secondary-subtitle-language">
                    <span data-panel-text="secondarySubtitleLanguage">副字幕语言</span>
                  </label>
                  <select id="debug-secondary-subtitle-language">
                    <option value="zh-cn" data-panel-text="simplifiedChinese">简体中文</option>
                    <option value="ja" data-panel-text="japanese" selected>日文</option>
                    <option value="ko" data-panel-text="korean">韩文</option>
                    <option value="en" data-panel-text="english">英文</option>
                  </select>
                </div>
                <div class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-subtitle-alignment">
                    <span data-panel-text="subtitleAlignment">字幕对齐</span>
                  </label>
                  <select id="debug-subtitle-alignment">
                    <option value="center" data-panel-text="subtitleAlignCenter" selected>居中对齐</option>
                    <option value="left" data-panel-text="subtitleAlignLeft">左对齐</option>
                    <option value="right" data-panel-text="subtitleAlignRight">右对齐</option>
                  </select>
                </div>
                <div class="status-panel__control-group">
                  <label class="status-panel__control-label" for="debug-subtitle-position">
                    <span data-panel-text="subtitlePosition">字幕位置</span>
                  </label>
                  <select id="debug-subtitle-position">
                    <option value="bottom-center" data-panel-text="subtitlePositionBottomCenter" selected>底部中央</option>
                    <option value="top-center" data-panel-text="subtitlePositionTopCenter">顶部中央</option>
                    <option value="screen-center" data-panel-text="subtitlePositionScreenCenter">屏幕中心</option>
                    <option value="bottom-left" data-panel-text="subtitlePositionBottomLeft">底部左侧</option>
                    <option value="custom" data-panel-text="customPreset">自定义</option>
                  </select>
                </div>
                <div id="debug-subtitle-custom-position" class="status-panel__nested-controls" hidden>
                  <button class="status-panel__subgroup-toggle" type="button" aria-expanded="true"><span data-panel-text="customSubtitlePosition">自定义字幕位置</span></button>
                  <div class="status-panel__control-group">
                    <label class="status-panel__control-label" for="debug-subtitle-x">
                      <span data-panel-text="subtitleX">字幕 X</span>
                      <output id="debug-subtitle-x-output" for="debug-subtitle-x">0</output>
                    </label>
                    <input id="debug-subtitle-x" type="range" min="-1000" max="1000" step="1" value="0" />
                  </div>
                  <div class="status-panel__control-group">
                    <label class="status-panel__control-label" for="debug-subtitle-y">
                      <span data-panel-text="subtitleY">字幕 Y</span>
                      <output id="debug-subtitle-y-output" for="debug-subtitle-y">0</output>
                    </label>
                    <input id="debug-subtitle-y" type="range" min="-1000" max="1000" step="1" value="0" />
                  </div>
                </div>
                </div>
              </div>
            </fieldset>

          </div>
        </div>
        <p id="status-error" class="status-panel__error" hidden></p>
      </section>

      <section id="wallpaper-log-viewer" class="wallpaper-log-viewer wallpaper-log-viewer--independent" aria-label="壁纸日志" hidden>
        <header>
          <strong id="wallpaper-log-viewer-title">壁纸日志</strong>
          <div class="wallpaper-log-viewer__header-actions">
            <button id="wallpaper-log-viewer-copy" type="button">复制当前全部</button>
            <button id="wallpaper-log-viewer-close" class="wallpaper-log-viewer__close" type="button" aria-label="关闭">×</button>
          </div>
        </header>
        <div class="wallpaper-log-viewer__session-nav" aria-label="日志会话">
          <button id="wallpaper-log-viewer-previous-session" type="button" aria-label="上一份日志">‹</button>
          <span id="wallpaper-log-viewer-session-label">日志会话</span>
          <button id="wallpaper-log-viewer-next-session" type="button" aria-label="下一份日志">›</button>
        </div>
        <p id="wallpaper-log-viewer-notice" class="wallpaper-log-viewer__notice" hidden></p>
        <div class="wallpaper-log-viewer__scroll-shell">
          <pre id="wallpaper-log-viewer-content" tabindex="0" aria-label="日志内容"></pre>
          <div id="wallpaper-log-scrollbar" class="debug-scrollbar debug-scrollbar--embedded" aria-hidden="true" hidden>
            <div id="wallpaper-log-scrollbar-thumb" class="debug-scrollbar__thumb"></div>
          </div>
          <div id="wallpaper-log-scrollbar-horizontal" class="debug-scrollbar debug-scrollbar--horizontal" aria-hidden="true" hidden>
            <div id="wallpaper-log-scrollbar-horizontal-thumb" class="debug-scrollbar__thumb"></div>
          </div>
        </div>
      </section>

      <div id="debug-panel-scrollbar" class="debug-scrollbar debug-scrollbar--fixed" aria-hidden="true" hidden>
        <div id="debug-panel-scrollbar-thumb" class="debug-scrollbar__thumb"></div>
      </div>

      <button
        id="debug-panel-toggle"
        class="debug-panel-toggle"
        type="button"
        aria-controls="status-panel"
        aria-expanded="false"
        hidden
        disabled
      >调试面板</button>

      <div id="loading" class="loading">
        <span class="loading__pulse"></span>
        <span id="loading-label" data-panel-text="loadingSpine">正在加载 Spine 资源……</span>
      </div>`;

export function createWallpaperShell(
  root: HTMLElement,
  options: WallpaperShellOptions = {},
) {
  if (root.childElementCount !== 0) {
    throw new Error("Wallpaper shell root must be empty.");
  }
  root.dataset.phase = "booting";
  root.innerHTML = WALLPAPER_SHELL_TEMPLATE;
  const title = root.querySelector<HTMLElement>("[data-wallpaper-title]");
  const canvas = root.querySelector<HTMLCanvasElement>("#wallpaper");
  const edition = root.querySelector<HTMLElement>(".status-panel__eyebrow");
  if (!title || !canvas || !edition) {
    throw new Error("Wallpaper shell template is incomplete.");
  }
  title.textContent = options.title ?? "Memory Lobby Wallpaper";
  canvas.setAttribute(
    "aria-label",
    options.canvasLabel ?? `${options.title ?? "Memory Lobby"} animated wallpaper`,
  );
  // The eyebrow shows the wallpaper's own edition label (injected at build time
  // via __WALLPAPER_VERSION__). The runtime never invents a version: when no
  // label is provided the eyebrow stays hidden instead of showing a stale
  // placeholder.
  if (options.editionLabel) {
    edition.textContent = options.editionLabel;
    edition.hidden = false;
  }
  return root;
}
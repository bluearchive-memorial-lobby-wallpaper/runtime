export interface ViewportLayoutInput {
  cssWidth: number; cssHeight: number; requestedHeight: number;
  maximumWidth: number; maximumHeight: number; modelScale: number;
  modelX: number; modelY: number;
  designViewport: { width: number; height: number; centerX: number; centerY: number };
}
export function calculateViewportLayout(input: ViewportLayoutInput) {
  const cssWidth = Math.max(input.cssWidth, 1);
  const cssHeight = Math.max(input.cssHeight, 1);
  const cssAspect = cssWidth / cssHeight;
  let pixelHeight = input.requestedHeight;
  let pixelWidth = Math.max(Math.round(pixelHeight * cssAspect), 1);
  const downscale = Math.min(1, input.maximumWidth / pixelWidth, input.maximumHeight / pixelHeight);
  if (downscale < 1) {
    pixelWidth = Math.max(Math.floor(pixelWidth * downscale), 1);
    pixelHeight = Math.max(Math.floor(pixelHeight * downscale), 1);
  }
  const aspect = pixelWidth / pixelHeight;
  const designAspect = input.designViewport.width / input.designViewport.height;
  let worldWidth = input.designViewport.width / input.modelScale;
  let worldHeight = input.designViewport.height / input.modelScale;
  if (aspect > designAspect) worldHeight = worldWidth / aspect;
  else if (aspect < designAspect) worldWidth = worldHeight * aspect;
  return { cssWidth, cssHeight, pixelWidth, pixelHeight, pixelRatio: pixelHeight / cssHeight,
    worldRect: { left: input.designViewport.centerX + input.modelX - worldWidth / 2,
      bottom: input.designViewport.centerY + input.modelY - worldHeight / 2,
      width: worldWidth, height: worldHeight } };
}

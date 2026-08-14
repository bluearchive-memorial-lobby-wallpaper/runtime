export interface ModelTransformPoint { x: number; y: number }
export function modelRotationRadians(degrees: number): number { return (degrees * Math.PI) / 180; }
export function createModelRotationMatrix(degrees: number, pivot: ModelTransformPoint): Float32Array {
  const radians = modelRotationRadians(degrees); const cosine = Math.cos(radians); const sine = Math.sin(radians);
  const values = new Float32Array(16);
  values[0] = cosine; values[1] = sine; values[4] = -sine; values[5] = cosine; values[10] = 1;
  values[12] = pivot.x - cosine * pivot.x + sine * pivot.y;
  values[13] = pivot.y - sine * pivot.x - cosine * pivot.y; values[15] = 1;
  return values;
}
export function rotateModelPoint(point: ModelTransformPoint, degrees: number, pivot: ModelTransformPoint): ModelTransformPoint {
  const radians = modelRotationRadians(degrees); const cosine = Math.cos(radians); const sine = Math.sin(radians);
  const x = point.x - pivot.x; const y = point.y - pivot.y;
  return { x: pivot.x + cosine * x - sine * y, y: pivot.y + sine * x + cosine * y };
}

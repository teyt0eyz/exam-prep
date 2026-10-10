/** Position of slot k of a complete binary tree stored in an array (root = 0), in viewBox units. */
export function slotPosition(k: number, width: number, top: number, levelHeight: number) {
  const level = Math.floor(Math.log2(k + 1));
  const first = 2 ** level - 1;
  const count = 2 ** level;
  return { x: ((k - first + 0.5) / count) * width, y: top + level * levelHeight, level };
}

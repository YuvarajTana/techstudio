export const calculateMainPreviewFit = (
  containerWidth: number,
  containerHeight: number,
  canvasWidth: number,
  canvasHeight: number,
) => {
  const safeContainerWidth = Math.max(containerWidth, 1);
  const safeContainerHeight = Math.max(containerHeight, 1);
  const safeCanvasWidth = Math.max(canvasWidth, 1);
  const safeCanvasHeight = Math.max(canvasHeight, 1);
  const maxPreviewWidth = Math.max(260, Math.min(safeContainerWidth - 96, safeContainerWidth * 0.7));
  const maxPreviewHeight = Math.max(260, Math.min(safeContainerHeight - 72, safeContainerHeight * 0.86));
  const scale = Math.min(maxPreviewWidth / safeCanvasWidth, maxPreviewHeight / safeCanvasHeight, 1);
  const scaledWidth = safeCanvasWidth * scale;
  const scaledHeight = safeCanvasHeight * scale;

  return {
    scale,
    left: (safeContainerWidth - scaledWidth) / 2,
    top: (safeContainerHeight - scaledHeight) / 2,
    width: scaledWidth,
    height: scaledHeight,
  };
};

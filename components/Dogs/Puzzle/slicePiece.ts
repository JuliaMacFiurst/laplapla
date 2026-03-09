export function slicePiece(
  sourceCanvas: HTMLCanvasElement,
  pathD: string,
  scale: number = 1
) {

  // --- create SVG path to compute bounding box ---
  const svgNS = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(svgNS, "svg")
  const pathEl = document.createElementNS(svgNS, "path")

  pathEl.setAttribute("d", pathD)
  svg.appendChild(pathEl)

  // temporarily attach to DOM so getBBox works
  svg.style.position = "absolute"
  svg.style.opacity = "0"
  document.body.appendChild(svg)

  const bbox = pathEl.getBBox()

  document.body.removeChild(svg)

  const minX = Math.floor(bbox.x * scale)
  const minY = Math.floor(bbox.y * scale)
  const width = Math.ceil(bbox.width * scale)
  const height = Math.ceil(bbox.height * scale)

  // --- create canvas for the puzzle piece ---
  const pieceCanvas = document.createElement("canvas")
  pieceCanvas.width = width
  pieceCanvas.height = height

  const ctx = pieceCanvas.getContext("2d") as CanvasRenderingContext2D
  const path = new Path2D()
  path.addPath(new Path2D(pathD), new DOMMatrix().scale(scale))

  ctx.save()

  // move drawing so the piece fits the small canvas
  ctx.translate(-minX, -minY)

  ctx.clip(path)

  ctx.drawImage(sourceCanvas, 0, 0)

  ctx.restore()

  return {
    canvas: pieceCanvas,
    path,
    offsetX: bbox.x * scale,
    offsetY: bbox.y * scale
  }
}
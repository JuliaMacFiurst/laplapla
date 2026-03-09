import { loadPuzzleMask } from "./loadPuzzleMask"
import { slicePiece } from "./slicePiece"

export type PuzzlePiece = {
  id: string
  canvas: HTMLCanvasElement
  path: Path2D
  x: number
  y: number
  correctX: number
  correctY: number
  locked: boolean
}

export class PuzzleEngine {

  pieces: PuzzlePiece[] = []

  width: number
  height: number

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  async init(sourceCanvas: HTMLCanvasElement) {

    const mask = await loadPuzzleMask()

    if (!mask.length) return

    // compute one consistent scale for the whole puzzle
    const vbWidth = mask[0].vbWidth
    const vbHeight = mask[0].vbHeight

    const scaleX = this.width / vbWidth
    const scaleY = this.height / vbHeight

    const scale = Math.min(scaleX, scaleY)

    this.pieces = mask.map((p) => {

      const { canvas, path, offsetX, offsetY } = slicePiece(
  sourceCanvas,
  p.d,
  scale
)

      const correctX = offsetX
      const correctY = offsetY

      const piece: PuzzlePiece = {
        id: p.id,
        canvas,
        path,

        // spawn pieces inside the board for now
        x: Math.random() * Math.max(20, this.width - canvas.width - 20),
        y: Math.random() * Math.max(20, this.height - canvas.height - 20),

        correctX,
        correctY,
        locked: false
      }

      return piece
    })
  }

  render(ctx: CanvasRenderingContext2D) {

    ctx.clearRect(0, 0, this.width, this.height + 300)

    this.pieces.forEach(piece => {

      ctx.drawImage(
        piece.canvas,
        piece.x,
        piece.y
      )

    })
  }

  trySnap(piece: PuzzlePiece) {

    const dx = piece.x - piece.correctX
    const dy = piece.y - piece.correctY

    const dist = Math.sqrt(dx * dx + dy * dy)

    const SNAP_DISTANCE = 40

    if (dist < SNAP_DISTANCE) {
      piece.x = piece.correctX
      piece.y = piece.correctY
      piece.locked = true
    }

  }

}
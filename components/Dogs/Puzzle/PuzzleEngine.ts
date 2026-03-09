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
  groupId: number
}

export class PuzzleEngine {

  pieces: PuzzlePiece[] = []
  nextGroupId = 1

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

        // start pieces off‑screen so board is empty
        x: -9999,
        y: -9999,

        correctX,
        correctY,
        locked: false,
        groupId: this.nextGroupId++
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

  getGroupPieces(groupId: number) {
    return this.pieces.filter(p => p.groupId === groupId)
  }

  mergeGroups(a: PuzzlePiece, b: PuzzlePiece) {
    const target = a.groupId
    const source = b.groupId
    if (target === source) return

    this.pieces.forEach(p => {
      if (p.groupId === source) {
        p.groupId = target
      }
    })
  }

  trySnap(piece: PuzzlePiece) {

    const dx = piece.x - piece.correctX
    const dy = piece.y - piece.correctY

    const dist = Math.sqrt(dx * dx + dy * dy)

    const SNAP_DISTANCE = 40

    if (dist < SNAP_DISTANCE) {

      // compute how far the piece needs to move to reach the correct position
      const dxSnap = piece.correctX - piece.x
      const dySnap = piece.correctY - piece.y

      // move the entire group by the same amount
      const group = this.getGroupPieces(piece.groupId)

      group.forEach(p => {
        p.x += dxSnap
        p.y += dySnap
      })

      piece.locked = true

      // merge with any already locked neighbour pieces
      this.pieces.forEach(other => {
        if (other === piece) return
        if (!other.locked) return

        const odx = other.x - other.correctX
        const ody = other.y - other.correctY
        const odist = Math.sqrt(odx * odx + ody * ody)

        if (odist < SNAP_DISTANCE) {
          this.mergeGroups(piece, other)
        }
      })
    }

  }

}
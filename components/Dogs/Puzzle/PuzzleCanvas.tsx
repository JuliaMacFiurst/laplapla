"use client"

import { useEffect, useRef } from "react"
import { PuzzleEngine } from "./PuzzleEngine"

type Props = {
  sourceCanvas: HTMLCanvasElement
  drawingCanvas: HTMLCanvasElement | null
  colorCanvas: HTMLCanvasElement | null
  pawCanvas: HTMLCanvasElement | null
}

export default function PuzzleCanvas({ sourceCanvas, drawingCanvas, colorCanvas, pawCanvas }: Props) {
  console.log("PuzzleCanvas mounted")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<PuzzleEngine | null>(null)

  const draggingPieceRef = useRef<any>(null)
  const offsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {

    const canvas = canvasRef.current!

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D

    const engine = new PuzzleEngine(canvas.width, canvas.height)
    engineRef.current = engine

    async function init() {

      // Build a combined canvas so the puzzle includes lines, colors and paw stamps
      if (!sourceCanvas) return

      const combined = document.createElement("canvas")

      // Force puzzle generation to match the visible board size
      combined.width = canvas.width
      combined.height = canvas.height

      const combinedCtx = combined.getContext("2d") as CanvasRenderingContext2D

      // base white background
      combinedCtx.fillStyle = "#ffffff"
      combinedCtx.fillRect(0, 0, combined.width, combined.height)

      // draw layers in correct order
      if (colorCanvas) combinedCtx.drawImage(colorCanvas, 0, 0, combined.width, combined.height)
      if (drawingCanvas) combinedCtx.drawImage(drawingCanvas, 0, 0, combined.width, combined.height)
      if (pawCanvas) combinedCtx.drawImage(pawCanvas, 0, 0, combined.width, combined.height)

      await engine.init(combined)

      requestAnimationFrame(loop)

    }

    function loop() {

      if (!engineRef.current) return

      engineRef.current.render(ctx)

      requestAnimationFrame(loop)

    }

    init()

  }, [sourceCanvas, drawingCanvas, colorCanvas, pawCanvas])

  function getMousePos(e: React.MouseEvent) {

    const rect = canvasRef.current!.getBoundingClientRect()

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }

  }

  function handleMouseDown(e: React.MouseEvent) {

    e.preventDefault()

    const engine = engineRef.current
    if (!engine) return

    const pos = getMousePos(e)

    const piece = [...engine.pieces].reverse().find(p => {

      return (
        pos.x >= p.x &&
        pos.x <= p.x + p.canvas.width &&
        pos.y >= p.y &&
        pos.y <= p.y + p.canvas.height
      )

    })

    if (!piece) return

    draggingPieceRef.current = piece

    offsetRef.current = {
      x: pos.x - piece.x,
      y: pos.y - piece.y
    }

  }

  function handleMouseMove(e: React.MouseEvent) {

    const piece = draggingPieceRef.current
    if (!piece) return

    const pos = getMousePos(e)

    piece.x = pos.x - offsetRef.current.x
    piece.y = pos.y - offsetRef.current.y

  }

  function handleMouseUp() {

    const engine = engineRef.current
    const piece = draggingPieceRef.current

    if (!engine || !piece) return

    engine.trySnap(piece)

    draggingPieceRef.current = null

  }

  return (
    <canvas
      ref={canvasRef}
      width={512}
      height={512}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        border: "2px solid #000",
        background: "#fff",
        display: "block",
        margin: "0 auto",
        cursor: "grab",
        maxWidth: "512px"
      }}
    />
  )

}
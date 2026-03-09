export async function loadPuzzleMask() {
  const res = await fetch("/dog/puzzles/dogs-mask.svg")
  const text = await res.text()

  const parser = new DOMParser()
  const svgDoc = parser.parseFromString(text, "image/svg+xml")

  const svg = svgDoc.querySelector("svg")
  const paths = [...svgDoc.querySelectorAll("path")]

  if (!svg) return []

  const viewBox = svg.getAttribute("viewBox") || "0 0 512 512"
  const parts = viewBox.split(/\s+/).map(Number)

  const vbWidth = parts[2] || 512
  const vbHeight = parts[3] || 512

  return paths.map(p => ({
    id: p.id,
    d: p.getAttribute("d") || "",
    vbWidth,
    vbHeight
  }))
}

import { loadPuzzleMask } from "./loadPuzzleMask"

export async function testPuzzleMask() {

  const paths = await loadPuzzleMask()

  console.log("Puzzle pieces:", paths.length)
  console.log(paths[0])
}
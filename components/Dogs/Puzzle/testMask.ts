import { loadPuzzleMask } from "./loadPuzzleMask"
import { devLog } from "@/utils/devLog";

export async function testPuzzleMask() {

  const paths = await loadPuzzleMask()

  devLog("Puzzle pieces:", paths.length)
  devLog(paths[0])
}

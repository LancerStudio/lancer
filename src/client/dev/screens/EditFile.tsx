import axios from "axios"
import { usePromise } from "../lib/use-promise"

type Props = {
  filePath: string
  onClose: () => void
}
export function EditFile({ filePath, onClose }: Props) {
  if (!filePath.startsWith('/files/')) {
    throw new Error(`Invalid file path: ${filePath}`)
  }
  const fileInfo = usePromise(async () => {
    const result = await axios.get(`/lancer${filePath}`)
    console.log("result", result.data)
  }, { invoke: true })
  console.log(fileInfo, onClose)
  return (
    <div className="p-6 rounded-lg bg-gray-800 text-gray-100">
      Edit File
    </div>
  )
}

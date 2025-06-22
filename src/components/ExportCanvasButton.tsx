import { useEditor } from 'tldraw'

export default function ExportCanvasButton() {
  const editor = useEditor()

  return (
    <button
      style={{ pointerEvents: 'all', fontSize: 18, backgroundColor: 'thistle' }}
      onClick={async () => {
        const shapeIds = editor.getCurrentPageShapeIds()
        if (shapeIds.size === 0) return alert('No shapes on the canvas')

        const { blob } = await editor.toImage([...shapeIds], {
          format: 'png',
          background: false,
        })

        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'every-shape-on-the-canvas.jpg'
        link.click()
        URL.revokeObjectURL(link.href)
      }}
    >
      Export canvas as image
    </button>
  )
}

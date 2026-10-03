// Reads an image file and returns a scaled-down JPEG data URL so many
// photos fit inside the browser's localStorage limit.

const DEFAULT_MAX_SIDE = 800
const DEFAULT_JPEG_QUALITY = 0.75

export function resizeImageToDataUrl(
  file: File,
  maxSide = DEFAULT_MAX_SIDE,
  quality = DEFAULT_JPEG_QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new window.Image()

    image.onload = () => {
      URL.revokeObjectURL(url)

      const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))

      const context = canvas.getContext("2d")

      if (!context) {
        reject(new Error("Canvas is not available"))
        return
      }

      // JPEG has no transparency, so paint white behind transparent PNGs.
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      resolve(canvas.toDataURL("image/jpeg", quality))
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not read this image"))
    }

    image.src = url
  })
}

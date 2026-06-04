import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { createPdfWatermarkProcessor, type PdfWatermarkOptions } from './watermark'

const createPdfFile = async (pageCount = 2) => {
  const pdfDoc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([595, 842])
    page.drawText(`Page ${i + 1}`, { x: 50, y: 800 })
  }
  const bytes = await pdfDoc.save()
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const file = new File([new Uint8Array(buffer)], 'sample.pdf', { type: 'application/pdf' })
  ;(file as any).arrayBuffer = async () => buffer
  return file
}

const createFileFromBase64 = (base64: string, name: string, type: string) => {
  const buffer = Uint8Array.from(Buffer.from(base64, 'base64'))
  const file = new File([buffer], name, { type })
  ;(file as any).arrayBuffer = async () =>
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  return file
}

const pngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/woAAgMBgP1+YXkAAAAASUVORK5CYII='

const jpgBase64 =
  '/9j/4AAQSkZJRgABAQAAZABkAAD/2wCEABQQEBkSGScXFycyJh8mMi4mJiYmLj41NTU1NT5EQUFBQUFBREREREREREREREREREREREREREREREREREREREQBFRkZIBwgJhgYJjYmICY2RDYrKzZERERCNUJERERERERERERERERERERERERERERERERERERERERERERERERERP/AABEIAAEAAQMBIgACEQEDEQH/xABMAAEBAAAAAAAAAAAAAAAAAAAABQEBAQAAAAAAAAAAAAAAAAAABQYQAQAAAAAAAAAAAAAAAAAAAAARAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJQA9Yv/2Q=='

const baseTextOptions: PdfWatermarkOptions = {
  type: 'text',
  content: 'TEST',
  position: 'center',
  positionMode: 'grid',
  opacity: 40,
  rotation: 15,
  fontSize: 36,
  color: '#333333',
  fontFamily: 'Helvetica',
  layout: 'single',
  layer: 'foreground',
  applyTo: 'all',
  pageRange: '',
  imageScale: 0.5,
  outputStandard: 'pdf'
}

describe('pdf watermark', () => {
  it('adds text watermark with default options', async () => {
    const processor = createPdfWatermarkProcessor()
    const file = await createPdfFile()
    const result = await processor.process([file], baseTextOptions)
    expect(result.success).toBe(true)
    expect(result.data).toBeInstanceOf(Blob)
  })

  it('adds text watermark with custom position and range', async () => {
    const processor = createPdfWatermarkProcessor()
    const file = await createPdfFile(3)
    const options: PdfWatermarkOptions = {
      ...baseTextOptions,
      positionMode: 'custom',
      positionX: 120,
      positionY: 200,
      applyTo: 'range',
      pageRange: '1-2',
      layout: 'tile',
      layer: 'background'
    }
    const result = await processor.process([file], options)
    expect(result.success).toBe(true)
  })

  it('rejects empty page range when applyTo is range', async () => {
    const processor = createPdfWatermarkProcessor()
    const file = await createPdfFile(1)
    const result = await processor.process([file], {
      ...baseTextOptions,
      applyTo: 'range',
      pageRange: ''
    })
    expect(result.success).toBe(false)
  })

  it('adds image watermark with png', async () => {
    const processor = createPdfWatermarkProcessor()
    const file = await createPdfFile()
    const imageFile = createFileFromBase64(pngBase64, 'mark.png', 'image/png')
    const options: PdfWatermarkOptions = {
      ...baseTextOptions,
      type: 'image',
      content: '',
      imageFile,
      imageScale: 0.6,
      rotation: 25
    }
    const result = await processor.process([file], options)
    expect(result.success).toBe(true)
  })

  it('adds image watermark with jpg', async () => {
    const processor = createPdfWatermarkProcessor()
    const file = await createPdfFile()
    const imageFile = createFileFromBase64(jpgBase64, 'mark.jpg', 'image/jpeg')
    const options: PdfWatermarkOptions = {
      ...baseTextOptions,
      type: 'image',
      content: '',
      imageFile,
      imageScale: 0.4,
      rotation: -30
    }
    const result = await processor.process([file], options)
    expect(result.success).toBe(true)
  })

  it('meets baseline performance on small files', async () => {
    const processor = createPdfWatermarkProcessor()
    const file = await createPdfFile(10)
    const start = Date.now()
    const result = await processor.process([file], {
      ...baseTextOptions,
      outputStandard: 'pdf'
    })
    const duration = Date.now() - start
    expect(result.success).toBe(true)
    expect(duration).toBeLessThan(2000)
  })
})

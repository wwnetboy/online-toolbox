import { describe, it, expect } from 'vitest'
import { cropAreaToPdfCropBox, getVisualPageSize, validateCropArea } from './crop'

describe('pdf crop', () => {
  it('getVisualPageSize normalizes rotation', () => {
    const s0 = getVisualPageSize(200, 100, 0)
    expect(s0).toEqual({ width: 200, height: 100, rotation: 0 })

    const s90 = getVisualPageSize(200, 100, 89)
    expect(s90).toEqual({ width: 100, height: 200, rotation: 90 })
  })

  it('cropAreaToPdfCropBox rotation=0', () => {
    const crop = { x: 10, y: 20, width: 50, height: 30 }
    const box = cropAreaToPdfCropBox(crop, 200, 100, 0)
    expect(box).toEqual({ x: 10, y: 50, width: 50, height: 30 })
  })

  it('cropAreaToPdfCropBox rotation=90', () => {
    const crop = { x: 10, y: 20, width: 30, height: 40 }
    const visual = getVisualPageSize(200, 100, 90)
    expect(validateCropArea(crop, visual.width, visual.height).valid).toBe(true)

    const box = cropAreaToPdfCropBox(crop, 200, 100, 90)
    expect(box).toEqual({ x: 20, y: 10, width: 40, height: 30 })
  })

  it('cropAreaToPdfCropBox rotation=180', () => {
    const crop = { x: 10, y: 20, width: 50, height: 30 }
    const box = cropAreaToPdfCropBox(crop, 200, 100, 180)
    expect(box).toEqual({ x: 140, y: 20, width: 50, height: 30 })
  })

  it('cropAreaToPdfCropBox rotation=270', () => {
    const crop = { x: 5, y: 15, width: 25, height: 35 }
    const visual = getVisualPageSize(200, 100, 270)
    expect(validateCropArea(crop, visual.width, visual.height).valid).toBe(true)

    const box = cropAreaToPdfCropBox(crop, 200, 100, 270)
    expect(box).toEqual({ x: 150, y: 70, width: 35, height: 25 })
  })
})

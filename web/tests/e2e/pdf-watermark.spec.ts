import { test, expect } from '@playwright/test'

const pdfBase64 =
  'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUgODQyXSAvQ29udGVudHMgNCAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA0NCA+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKFRlc3QgUERGKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMTQgMDAwMDAgbiAKMDAwMDAwMDIwNCAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDUgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjI5MAolJUVPRgo='

const pngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/woAAgMBgP1+YXkAAAAASUVORK5CYII='

const buildMockRoutes = async (page: any) => {
  const taskId = 'mock-task-1'
  let pollCount = 0

  await page.route('**/pdf/convert', async (route: any) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          taskId,
          status: 'processing',
          progress: 30,
          conversionType: 'pdf-to-pdfa',
          inputFile: { originalName: 'sample.pdf', size: 1234 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      })
    }
    return route.fallback()
  })

  await page.route(`**/pdf/convert/${taskId}`, async (route: any) => {
    pollCount += 1
    const status = pollCount > 1 ? 'completed' : 'processing'
    const progress = pollCount > 1 ? 100 : 60
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        taskId,
        status,
        progress,
        conversionType: 'pdf-to-pdfa',
        inputFile: { originalName: 'sample.pdf', size: 1234 },
        outputFile: { filename: 'sample.pdf', size: 2345 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    })
  })

  await page.route(`**/pdf/convert/${taskId}/download`, async (route: any) => {
    const buffer = Buffer.from(pdfBase64, 'base64')
    return route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': buffer.length.toString()
      },
      body: buffer
    })
  })
}

test('文字水印预览与下载流程', async ({ page }) => {
  await buildMockRoutes(page)
  const pdfBuffer = Buffer.from(pdfBase64, 'base64')

  await page.goto('/toolbox-pdf/watermark')
  const pdfInput = page.locator('input[type="file"][accept=".pdf"]')
  await pdfInput.setInputFiles({
    name: 'sample.pdf',
    mimeType: 'application/pdf',
    buffer: pdfBuffer
  })

  await expect(page.locator('.preview-viewport')).toBeVisible()
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas.watermark-layer') as HTMLCanvasElement | null
    return !!canvas && canvas.width > 0
  })

  const before = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.watermark-layer') as HTMLCanvasElement | null
    return canvas?.toDataURL() || ''
  })

  await page.getByPlaceholder('请输入水印文字').fill('E2E 预览')
  await page.waitForTimeout(300)

  const after = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.watermark-layer') as HTMLCanvasElement | null
    return canvas?.toDataURL() || ''
  })

  expect(after).not.toBe(before)

  await page.getByRole('button', { name: '添加水印' }).click()
  await expect(page.getByText('水印添加完成！')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载文件' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('_watermarked')
})

test('图片水印上传与下载流程', async ({ page }) => {
  await buildMockRoutes(page)
  const pdfBuffer = Buffer.from(pdfBase64, 'base64')
  const pngBuffer = Buffer.from(pngBase64, 'base64')

  await page.goto('/toolbox-pdf/watermark')
  const pdfInput = page.locator('input[type="file"][accept=".pdf"]')
  await pdfInput.setInputFiles({
    name: 'sample.pdf',
    mimeType: 'application/pdf',
    buffer: pdfBuffer
  })

  await page.getByText('图片水印').click()

  const imageInput = page.locator('input[type="file"][accept=".png,.jpg,.jpeg,.svg"]')
  await imageInput.setInputFiles({
    name: 'mark.png',
    mimeType: 'image/png',
    buffer: pngBuffer
  })

  await page.getByRole('button', { name: '添加水印' }).click()
  await expect(page.getByText('水印添加完成！')).toBeVisible()
})

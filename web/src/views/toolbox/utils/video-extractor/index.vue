<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || '视频万能提取'"
      :description="toolDescription || '支持1000+网站的视频下载和音频提取'"
    />
    <PermissionGuard
      feature-id="video-extractor"
      feature-name="视频万能提取"
      ref="permissionGuardRef"
    >
      <ElRow :gutter="16">
        <!-- 左侧操作区域 -->
        <ElCol :span="12" :xs="24" :sm="24" :md="12">
          <ElCard shadow="never" class="art-card mb-4">
            <div class="tool-header">
              <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
              <span class="tool-title">{{ toolName || '输入设置' }}</span>
            </div>
            <ElForm label-width="80px">
              <ElFormItem label="视频链接">
                <ElInput
                  v-model="videoUrl"
                  placeholder="粘贴视频链接，支持YouTube、B站、抖音等1000+网站"
                  clearable
                  @keyup.enter="handleParseUrl"
                />
              </ElFormItem>
              <ElFormItem>
                <ElButton type="primary" :disabled="parsing" @click="handleParseUrl">
                  <ElIcon class="mr-1"><component :is="parsing ? Loading : Search" /></ElIcon>{{ parsing ? '解析中...' : '解析视频' }}
                </ElButton>
                <ElPopover placement="bottom" :width="360" trigger="click">
                  <template #reference>
                    <ElButton class="ml-2" text size="small">
                      <ElIcon class="mr-1"><QuestionFilled /></ElIcon>如何获取Cookie
                    </ElButton>
                  </template>
                  <div class="text-sm text-g-700 leading-relaxed">
                    <p class="font-medium mb-2">🎬 高清视频/部分平台需要登录Cookie</p>
                    <ElDivider class="my-2" />
                    <p class="font-medium mb-1">Chrome / Edge 浏览器：</p>
                    <ol class="list-decimal list-inside text-g-500 space-y-1 mb-3">
                      <li>安装 <a href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc" target="_blank" class="text-blue-500">Get cookies.txt LOCALLY</a> 扩展</li>
                      <li>打开目标视频网站并登录</li>
                      <li>点击扩展图标 → Export cookies.txt</li>
                      <li>下载文件后拖入下方上传区</li>
                    </ol>
                    <p class="font-medium mb-1">Firefox 浏览器：</p>
                    <ol class="list-decimal list-inside text-g-500 space-y-1 mb-3">
                      <li>安装 <a href="https://addons.mozilla.org/firefox/addon/cookies-txt/" target="_blank" class="text-blue-500">cookies.txt</a> 扩展</li>
                      <li>登录目标网站 → 点击扩展导出</li>
                    </ol>
                    <p class="text-xs text-g-400">Cookie 仅用于本次下载，不会被存储</p>
                  </div>
                </ElPopover>
              </ElFormItem>
              <ElFormItem label="Cookie">
                <div class="w-full">
                  <input
                    ref="cookieInputRef"
                    type="file"
                    accept=".txt"
                    hidden
                    @change="handleCookieUpload"
                  />
                  <div
                    v-if="!cookieFileName"
                    class="cookie-upload-area"
                    @click="cookieInputRef?.click()"
                    @dragover.prevent
                    @drop.prevent="handleCookieDrop"
                  >
                    <ElIcon class="text-xl text-g-400"><Upload /></ElIcon>
                    <span class="text-sm text-g-400 ml-2">拖入或点击上传 cookies.txt</span>
                    <span class="text-xs text-g-300 ml-2">（可选，用于高清下载）</span>
                  </div>
                  <div v-else class="flex items-center gap-2">
                    <ElTag type="success" size="small">{{ cookieFileName }}</ElTag>
                    <ElButton text size="small" type="danger" @click="removeCookie">移除</ElButton>
                  </div>
                </div>
              </ElFormItem>
            </ElForm>
          </ElCard>

          <!-- 下载选项 -->
          <ElCard v-if="videoInfo" shadow="never" class="art-card mb-4">
            <div class="text-base font-medium text-g-800 mb-4">下载选项</div>
            <ElForm label-width="80px">
              <ElFormItem label="下载类型">
                <ElRadioGroup v-model="downloadType" :disabled="downloading">
                  <ElRadioButton value="video">下载视频</ElRadioButton>
                  <ElRadioButton value="audio">提取音频</ElRadioButton>
                </ElRadioGroup>
              </ElFormItem>
              <ElFormItem v-if="downloadType === 'video'" label="视频质量">
                <ElSelect v-model="selectedFormat" placeholder="选择格式" style="width: 100%" :disabled="downloading">
                  <ElOption label="最佳质量（自动）" value="bv*+ba" />
                  <ElOption
                    v-for="f in availableFormats"
                    :key="f.formatId"
                    :label="formatLabel(f)"
                    :value="f.formatId"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem v-if="downloadType === 'audio'" label="音频格式">
                <ElSelect v-model="audioFormat" placeholder="选择格式" :disabled="downloading">
                  <ElOption label="MP3 (推荐)" value="mp3" />
                  <ElOption label="M4A (原始质量)" value="m4a" />
                  <ElOption label="Opus" value="opus" />
                  <ElOption label="FLAC (无损)" value="flac" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem>
                <ElButton type="success" :disabled="downloading || !videoUrl" @click="handleDownload">
                  <ElIcon class="mr-1"><component :is="downloading && downloadProgress < 100 ? Loading : Download" /></ElIcon>{{ downloading ? '下载中...' : '开始下载' }}
                </ElButton>
              </ElFormItem>
              <!-- 下载进度（内嵌） -->
              <ElFormItem v-if="downloadStatus" label="进度">
                <div class="w-full">
                  <ElProgress :percentage="downloadProgress" :stroke-width="16" class="mb-1" />
                  <div class="flex justify-between text-xs text-g-400">
                    <span v-if="downloadSpeed">速度: {{ downloadSpeed }}</span>
                    <span v-if="downloadEta">预计剩余: {{ downloadEta }}</span>
                  </div>
                  <div v-if="downloadStatus === 'error'" class="mt-2 text-sm text-danger">
                    {{ downloadError || '下载失败，请重试' }}
                  </div>
                </div>
              </ElFormItem>
            </ElForm>
          </ElCard>
        </ElCol>

        <!-- 右侧视频信息区域 -->
        <ElCol :span="12" :xs="24" :sm="24" :md="12">
          <ElCard shadow="never" class="art-card">
            <div class="text-base font-medium text-g-800 mb-4">视频信息</div>
            <div v-if="videoInfo" class="video-info">
              <div v-if="videoInfo.thumbnail && !thumbnailFailed" class="thumbnail-wrap mb-4">
                <img :src="videoInfo.thumbnail" alt="thumbnail" class="w-full rounded-lg" @error="thumbnailFailed = true" />
              </div>
              <div class="text-sm text-g-600 space-y-2">
                <div><span class="font-medium">标题：</span>{{ videoInfo.title }}</div>
                <div><span class="font-medium">作者：</span>{{ videoInfo.uploader || '未知' }}</div>
                <div><span class="font-medium">时长：</span>{{ videoInfo.durationString || formatDuration(videoInfo.duration) }}</div>
                <div v-if="videoInfo.description"><span class="font-medium">简介：</span>{{ videoInfo.description }}</div>
              </div>
            </div>
            <div v-else class="empty-state">
              <Icon icon="ri:video-download-line" class="text-5xl text-g-300 mb-3" />
              <p class="text-g-400">粘贴视频链接并点击"解析视频"查看信息</p>
            </div>
          </ElCard>
        </ElCol>
      </ElRow>
    </PermissionGuard>

    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">视频万能提取工具基于 yt-dlp 引擎，支持从 1000+ 网站提取视频和音频：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持 YouTube、B站、抖音、优酷等主流视频平台</li>
          <li>可选择不同分辨率和格式下载视频</li>
          <li>支持提取纯音频，可转换为 MP3/M4A/FLAC 等格式</li>
          <li>免费使用，无需注册</li>
        </ul>
        <div class="mt-3 p-3 bg-amber-50 rounded text-xs text-amber-700 leading-relaxed">
          <p class="font-medium mb-1">关于视频画质和Cookie</p>
          <p>部分平台（如B站高清、抖音等）需要浏览器登录Cookie才能获取更高画质或解析视频。未上传Cookie时仅能获取游客模式下的低画质。点击输入区域的"如何获取Cookie"按钮查看浏览器Cookie导出教程。</p>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Download, QuestionFilled, Upload, Loading } from '@element-plus/icons-vue'
import { Icon } from '@iconify/vue'
import ToolSearchBar from '../../components/ToolSearchBar.vue'
import ToolIcon from '../../components/ToolIcon.vue'
import { useCurrentTool } from '@/hooks/core/useCurrentTool'
import PermissionGuard from '@/components/business/permission-guard/index.vue'
import request from '@/utils/http'

defineOptions({ name: 'VideoExtractorPage' })

const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()
const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()

// --- Form state ---
const videoUrl = ref('')
const parsing = ref(false)
const downloading = ref(false)
const downloadType = ref<'video' | 'audio'>('video')
const selectedFormat = ref('bv*+ba')
const audioFormat = ref('mp3')

// --- Cookie ---
const cookieInputRef = ref<HTMLInputElement>()
const cookieFileName = ref('')
const cookiesContent = ref('')

// --- Video info ---
interface FormatInfo {
  formatId: string
  ext: string
  resolution: string
  fps: number | null
  vcodec: string
  acodec: string
  fileSize: number | null
  fileSizeApprox: number | null
  tbr: number | null
  note: string | null
}

interface VideoInfoData {
  title: string
  duration: number
  durationString: string
  thumbnail: string
  uploader: string
  uploadDate: string
  webpageUrl: string
  description: string | null
  formats: FormatInfo[]
}

const videoInfo = ref<VideoInfoData | null>(null)
const thumbnailFailed = ref(false)

// --- Download progress ---
const taskId = ref('')
const downloadProgress = ref(0)
const downloadSpeed = ref('')
const downloadEta = ref('')
const downloadStatus = ref<string | null>(null)
const downloadError = ref('')
let pollingTimer: ReturnType<typeof setInterval> | null = null

// --- Computed ---
const availableFormats = computed(() => {
  if (!videoInfo.value) return []
  const seen = new Set<string>()
  return videoInfo.value.formats
    .filter((f) => f.vcodec !== 'none' && f.resolution !== 'audio only' && f.resolution)
    .filter((f) => {
      const key = `${f.resolution}_${f.ext}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => {
      const getHeight = (r: string) => parseInt(r.replace(/[^0-9]/g, ''), 10) || 0
      return getHeight(b.resolution) - getHeight(a.resolution)
    })
})


// --- Helpers ---
function formatLabel(f: FormatInfo): string {
  const parts = [`${f.resolution} - ${f.ext}`]
  if (f.note) parts.push(`(${f.note})`)
  if (f.fileSize) parts.push(` - ${formatFileSize(f.fileSize)}`)
  else if (f.fileSizeApprox) parts.push(` - ~${formatFileSize(f.fileSizeApprox)}`)
  return parts.join('')
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '未知'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// --- Actions ---
async function handleParseUrl() {
  if (!videoUrl.value.trim()) {
    ElMessage.warning('请输入视频链接')
    return
  }
  parsing.value = true
  videoInfo.value = null
  thumbnailFailed.value = false
  try {
    const data = await request.post<VideoInfoData>({
      url: '/video/extract/info',
      data: { url: videoUrl.value, cookies: cookiesContent.value || undefined }
    })
    videoInfo.value = data
    ElMessage.success('视频信息获取成功')
  } catch (err: any) {
    const msg = err?.message || ''
    if (msg.includes('cookies') || msg.includes('Cookies')) {
      ElMessage.warning({
        message: '该平台需要登录Cookie才能解析，请先上传cookies.txt再重试',
        duration: 6000,
      })
      // Scroll cookie area into view
      cookieInputRef.value?.scrollIntoView?.({ behavior: 'smooth' })
    } else {
      ElMessage.error(msg || '获取视频信息失败，请检查链接是否正确')
    }
  } finally {
    parsing.value = false
  }
}

// --- Cookie handlers ---
function handleCookieUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  readCookieFile(file)
}
function handleCookieDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) readCookieFile(file)
}
function readCookieFile(file: File) {
  cookieFileName.value = file.name
  const reader = new FileReader()
  reader.onload = () => { cookiesContent.value = reader.result as string }
  reader.readAsText(file)
}
function removeCookie() {
  cookieFileName.value = ''
  cookiesContent.value = ''
  if (cookieInputRef.value) cookieInputRef.value.value = ''
}

async function handleDownload() {
  const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
  if (!hasPermission) return

  if (!videoUrl.value.trim()) {
    ElMessage.warning('请输入视频链接')
    return
  }

  downloading.value = true
  downloadStatus.value = 'pending'
  downloadProgress.value = 0
  downloadSpeed.value = ''
  downloadEta.value = ''
  downloadError.value = ''
  taskId.value = ''

  try {
    const data = await request.post<{ taskId: string; outputFile: string }>({
      url: '/video/extract/download',
      data: {
        url: videoUrl.value,
        format: downloadType.value === 'video' ? selectedFormat.value : undefined,
        audioOnly: downloadType.value === 'audio',
        audioFormat: downloadType.value === 'audio' ? audioFormat.value : undefined,
        cookies: cookiesContent.value || undefined,
      },
      timeout: 600000 // 10 minutes
    })
    taskId.value = data.taskId
    // Start polling for progress
    startPolling(data.taskId)
  } catch (err: any) {
    downloadStatus.value = 'error'
    downloadError.value = err?.message || '下载失败'
    ElMessage.error(err?.message || '下载失败')
    downloading.value = false
  }
}

function startPolling(id: string) {
  stopPolling()
  pollingTimer = setInterval(async () => {
    try {
      const task = await request.get<{
        status: string
        progress: number
        speed: string
        eta: string
        error: string | null
      }>({
        url: `/video/extract/progress/${id}`
      })
      downloadProgress.value = task.progress || 0
      downloadSpeed.value = task.speed || ''
      downloadEta.value = task.eta || ''
      downloadStatus.value = task.status
      if (task.status === 'completed') {
        stopPolling()
        downloadProgress.value = 100
        ElMessage.success('下载完成，正在保存...')
        permissionGuardRef.value?.recordUsage()
        // Auto trigger download
        setTimeout(() => {
          handleDownloadFile()
          downloading.value = false
          downloadStatus.value = null
        }, 500)
      } else if (task.status === 'error') {
        stopPolling()
        downloading.value = false
        downloadError.value = task.error || '下载失败'
        ElMessage.error(task.error || '下载失败')
      }
    } catch {
      // Ignore individual polling errors, keep trying
    }
  }, 1500)
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

function handleDownloadFile() {
  if (taskId.value) {
    // Use iframe to trigger download — browser reads Content-Disposition header
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = `/api/video/extract/file/${taskId.value}`
    document.body.appendChild(iframe)
    setTimeout(() => document.body.removeChild(iframe), 5000)
  }
}

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped lang="scss">
.tool-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}

.tool-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.video-info {
  .thumbnail-wrap {
    img {
      max-height: 240px;
      object-fit: cover;
    }
  }
}

.cookie-upload-area {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  transition: all 0.2s;
  &:hover { border-color: var(--theme-color); background: var(--theme-color-light-9); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 40px 20px;
  text-align: center;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}
</style>

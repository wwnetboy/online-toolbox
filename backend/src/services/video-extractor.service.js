const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const http = require('http');
const { URL } = require('url');
const config = require('../config');

// In-memory task store
const tasks = new Map();

/**
 * Auto-fetch guest cookies from a video URL
 * Makes a simple request to get session cookies (not login cookies)
 * Formats them as Netscape cookie file for yt-dlp
 */
async function fetchGuestCookies(videoUrl) {
  try {
    const parsed = new URL(videoUrl);
    // Fetch homepage (not video page) to get guest session cookies
    const homepage = `${parsed.protocol}//${parsed.hostname}/`;
    const cookies = [];

    return new Promise((resolve) => {
      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.get(homepage, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Referer': homepage,
        },
        timeout: 8000,
      }, (res) => {
        const setCookieHeaders = res.headers['set-cookie'] || [];
        for (const header of setCookieHeaders) {
          const match = header.match(/^([^=]+)=([^;]*)/);
          if (match) {
            const name = match[1].trim();
            const value = match[2].trim();
            const domain = '.' + parsed.hostname;
            const expires = String(Math.floor(Date.now() / 1000) + 86400);
            cookies.push(`${domain}\tTRUE\t/\tFALSE\t${expires}\t${name}\t${value}`);
          }
        }
        res.resume();
        res.on('end', () => resolve(cookies.join('\n')));
      });

      req.on('error', () => resolve(''));
      req.on('timeout', () => { req.destroy(); resolve(''); });
      req.end();
    });
  } catch {
    return '';
  }
}

// Generate unique task ID
function generateTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get video info from URL using yt-dlp --dump-json
 * @param {string} url - Video URL
 * @returns {Promise<Object>} Video metadata
 */
async function getVideoInfo(url, cookies) {
  // Auto-fetch guest cookies if not provided
  let cookieFile = null;
  if (!cookies) {
    const guestCookies = await fetchGuestCookies(url);
    if (guestCookies) {
      cookieFile = path.join(config.upload.path || 'uploads/temp', `info_${Date.now()}_cookies.txt`);
      await fs.mkdir(path.dirname(cookieFile), { recursive: true });
      await fs.writeFile(cookieFile, '# Netscape HTTP Cookie File\n' + guestCookies, 'utf8');
    }
  } else {
    cookieFile = path.join(config.upload.path || 'uploads/temp', `info_${Date.now()}_cookies.txt`);
    await fs.mkdir(path.dirname(cookieFile), { recursive: true });
    await fs.writeFile(cookieFile, '# Netscape HTTP Cookie File\n' + cookies, 'utf8');
  }

  return new Promise((resolve, reject) => {
    const args = [url, '--dump-json', '--no-warnings'];
    if (cookieFile) args.push('--cookies', cookieFile.replace(/\\/g, '/'));

    const ytDlp = spawn('yt-dlp', args, {
      env: { ...process.env, PYTHONUTF8: '1', PATH: process.env.PATH + (config.tool.ffmpeg !== 'ffmpeg' ? ';' + require('path').dirname(config.tool.ffmpeg) : '') },
    });

    let stdout = '';
    let stderr = '';

    ytDlp.stdout.on('data', (d) => {
      stdout += d.toString('utf8');
    });

    ytDlp.stderr.on('data', (d) => {
      stderr += d.toString('utf8');
    });

    ytDlp.on('close', async (code) => {
      // Clean up temp cookie file
      if (cookieFile) { try { await fs.unlink(cookieFile); } catch {} }
      if (code === 0 && stdout.trim()) {
        try {
          const info = JSON.parse(stdout.trim().split('\n').pop());

          resolve({
            title: info.title,
            duration: info.duration,
            durationString: info.duration_string,
            thumbnail: info.thumbnail,
            uploader: info.uploader,
            uploadDate: info.upload_date,
            webpageUrl: info.webpage_url,
            description: info.description ? info.description.substring(0, 500) : '',
            formats: (info.formats || [])
              .filter((f) => f.vcodec !== 'none' || f.acodec !== 'none')
              .map((f) => ({
                formatId: f.format_id,
                ext: f.ext,
                resolution: f.resolution || (f.height ? `${f.width}x${f.height}` : 'audio only'),
                fps: f.fps,
                vcodec: f.vcodec,
                acodec: f.acodec,
                fileSize: f.filesize,
                fileSizeApprox: f.filesize_approx,
                tbr: f.tbr,
                note: f.format_note,
              })),
          });
        } catch (e) {
          reject(new Error(`Failed to parse video info: ${e.message}`));
        }
      } else {
        // Extract actual ERROR lines from stderr, skip warnings
        const errorLines = stderr.split('\n').filter(l => l.startsWith('ERROR:'));
        const errorMsg = errorLines.join('; ') || 'yt-dlp failed to fetch video info';
        reject(new Error(errorMsg));
      }
    });

    ytDlp.on('error', reject);
  });
}

/**
 * Start download in background, fire-and-forget style.
 * Creates a task and returns taskId immediately so the client can poll for progress.
 * @param {string} url - Video URL
 * @param {Object} options - Download options
 * @param {string} [options.format] - yt-dlp format string
 * @param {boolean} [options.audioOnly] - Extract audio only
 * @param {string} [options.audioFormat] - Audio format when audioOnly
 * @param {string} [options.outputDir] - Custom output directory
 * @returns {string} taskId
 */
async function startDownload(url, options = {}) {
  const {
    format = '',
    audioOnly = false,
    audioFormat = 'mp3',
    outputDir,
    cookies,
  } = options;

  const taskId = generateTaskId();
  const dir = outputDir || config.upload.path || 'uploads/temp';
  let cookieFile = null;

  await fs.mkdir(dir, { recursive: true });

  // If user provided cookies, use them; otherwise auto-fetch guest cookies
  if (cookies) {
    cookieFile = path.join(dir, `${taskId}_cookies.txt`);
    const cookieContent = cookies.startsWith('# Netscape') ? cookies : '# Netscape HTTP Cookie File\n' + cookies;
    await fs.writeFile(cookieFile, cookieContent, 'utf8');
  } else {
    // Auto-fetch guest cookies from the video site
    const guestCookies = await fetchGuestCookies(url);
    if (guestCookies) {
      cookieFile = path.join(dir, `${taskId}_cookies.txt`);
      await fs.writeFile(cookieFile, '# Netscape HTTP Cookie File\n' + guestCookies, 'utf8');
    }
  }

  const outputTemplate = path.join(dir, `%(title)s_${taskId}.%(ext)s`);

  const args = [
    url,
    '-o', outputTemplate,
    '--no-warnings',
    '--newline',
    '--restrict-filenames',
  ];

  if (cookieFile) {
    args.push('--cookies', cookieFile.replace(/\\/g, '/'));
  }

  if (audioOnly) {
    args.push('-x', '--audio-format', audioFormat);
    args.push('--audio-quality', '0');
  } else {
    // For video: select best video + best audio, merge to mkv (universal container)
    const fmt = format || 'bv*+ba/best';
    args.push('-f', fmt, '--merge-output-format', 'mkv');
  }

  tasks.set(taskId, {
    id: taskId,
    status: 'pending',
    progress: 0,
    speed: '',
    eta: '',
    outputFile: null,
    error: null,
    startTime: Date.now(),
  });

  // Fire and forget - run yt-dlp in background, update task status
  const ytDlp = spawn('yt-dlp', args, {
    env: { ...process.env, PYTHONUTF8: '1', PATH: process.env.PATH + (config.tool.ffmpeg !== 'ffmpeg' ? ';' + require('path').dirname(config.tool.ffmpeg) : '') },
  });

  let stderrAccum = '';

  ytDlp.stdout.on('data', (data) => {
    const lines = data.toString('utf8').trim().split('\n');
    for (const line of lines) {
      const progressMatch = line.match(/(\d+\.?\d*)%/);
      const speedMatch = line.match(/at\s+([\d.]+\s*\w+\/s)/);
      const etaMatch = line.match(/ETA\s+(\d{2}:\d{2})/);
      const destMatch = line.match(/(?:Destination|Merging formats into|Writing video to):\s*(.+)/);

      const task = tasks.get(taskId);
      if (!task) continue;

      if (progressMatch) {
        task.progress = parseFloat(progressMatch[1]);
        task.status = 'downloading';
      }
      if (speedMatch) task.speed = speedMatch[1];
      if (etaMatch) task.eta = etaMatch[1];
      if (destMatch) task.outputFile = destMatch[1].trim().replace(/['"]/g, '');
    }
  });

  ytDlp.stderr.on('data', (data) => {
    const text = data.toString('utf8');
    stderrAccum += text;
    // Capture final output file destination (also from Merge/ExtractAudio)
    const destMatch = text.match(/(?:Destination|Merging formats into|Writing video to|ExtractAudio):\s*(.+)/);
    if (destMatch) {
      const task = tasks.get(taskId);
      if (task) task.outputFile = destMatch[1].trim().replace(/['"]/g, '');
    }
  });

  ytDlp.on('close', (code) => {
    const task = tasks.get(taskId);
    if (!task) return;
    if (code === 0) {
      task.status = 'completed';
      task.progress = 100;
      // Search for the actual output file (merged mp4 for video, or audio file)
      const fsSync = require('fs');
      try {
        const files = fsSync.readdirSync(dir);
        const candidates = files.filter(f => f.includes(taskId));
        if (candidates.length > 0) {
          // Prefer merged container (mkv/mp4) over individual streams (m4a/webm)
          const merged = candidates.find(f => f.endsWith('.mkv') || f.endsWith('.mp4'));
          task.outputFile = path.join(dir, merged || candidates[candidates.length - 1]);
        }
      } catch {}
    } else {
      task.status = 'error';
      // Extract actual ERROR lines from stderr
      const errorLines = stderrAccum.split('\n').filter(l => l.includes('ERROR:'));
      task.error = errorLines.join('; ') || `yt-dlp exited with code ${code}`;
    }
  });

  ytDlp.on('error', (err) => {
    const task = tasks.get(taskId);
    if (task) {
      task.status = 'error';
      task.error = err.message;
    }
  });

  return taskId;
}

/**
 * Get task progress
 * @param {string} taskId - Task ID
 * @returns {Object|null} Task progress object or null
 */
function getTaskProgress(taskId) {
  return tasks.get(taskId) || null;
}

/**
 * Cleanup task and temp files
 * @param {string} taskId - Task ID
 */
async function cleanupTask(taskId) {
  const task = tasks.get(taskId);
  if (!task) return;
  if (task.outputFile) {
    try { await fs.unlink(task.outputFile); } catch {}
  }
  // Also clean up cookie file if exists
  const cookieFile = require('path').join(require('path').dirname(task.outputFile || ''), `${taskId}_cookies.txt`);
  try { await fs.unlink(cookieFile); } catch {}
  tasks.delete(taskId);
}

module.exports = { getVideoInfo, startDownload, getTaskProgress, cleanupTask };

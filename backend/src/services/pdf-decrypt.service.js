/**
 * PDF Decrypt Service
 * Uses Python pikepdf to decrypt password-protected PDFs
 */
const { spawn } = require('child_process');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

const PYTHON = config.tool.python;

/**
 * Decrypt a password-protected PDF using pikepdf
 * @param {string} inputPath - Path to encrypted PDF
 * @param {string} password - PDF password
 * @param {string} outputPath - Path for decrypted output
 * @returns {Promise<void>}
 */
async function decryptPdf(inputPath, password, outputPath) {
  // Escape single quotes in password for Python string
  const safePassword = password.replace(/'/g, "\\'");
  const safeInput = inputPath.replace(/\\/g, '/');

  const script = `
import pikepdf, sys
try:
    pdf = pikepdf.open(r'${safeInput}', password=r'${safePassword}')
    pdf.save(r'${outputPath}')
    print('OK')
except pikepdf.PasswordError:
    print('PASSWORD_ERROR')
except ImportError:
    print('DEPENDENCY_ERROR: pikepdf not installed. Run: pip install pikepdf')
except Exception as e:
    print(f'ERROR: {e}')
`.trim();

  return new Promise((resolve, reject) => {
    const py = spawn(PYTHON, ['-c', script], { timeout: 30000 });

    let out = '';
    let err = '';
    py.stdout.on('data', d => out += d.toString());
    py.stderr.on('data', d => err += d.toString());
    py.on('close', code => {
      if (code === 0 && out.trim() === 'OK') resolve();
      else if (out.includes('PASSWORD_ERROR')) reject(Object.assign(new Error('密码错误，请重试'), { code: 'PASSWORD_ERROR' }));
      else if (out.includes('DEPENDENCY_ERROR')) reject(Object.assign(new Error('pikepdf 未安装，请在服务器上运行: pip install pikepdf'), { code: 'DEPENDENCY_ERROR' }));
      else reject(new Error(err || out || '解密失败'));
    });
    py.on('error', reject);
  });
}

module.exports = { decryptPdf };

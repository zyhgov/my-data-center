import { FILE_TYPES, MIME_TYPE_MAP, FOLDER_MAP, EXTENSION_MAP } from './constants';

/**
 * 将文件转换为 Base64
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

/**
 * 根据 MIME 类型和文件扩展名获取文件类型
 */
export function getFileType(mimeType, filename = '') {
  // 优先使用 MIME 类型精确匹配
  if (mimeType && MIME_TYPE_MAP[mimeType]) {
    return MIME_TYPE_MAP[mimeType];
  }
  
  // 使用文件扩展名匹配
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && EXTENSION_MAP[ext]) {
      return EXTENSION_MAP[ext];
    }
  }
  
  // MIME 类型模糊匹配
  if (mimeType) {
    const lowerMime = mimeType.toLowerCase();
    
    if (lowerMime.startsWith('image/')) return FILE_TYPES.IMAGE;
    if (lowerMime.startsWith('video/')) return FILE_TYPES.VIDEO;
    if (lowerMime.startsWith('audio/')) return FILE_TYPES.AUDIO;
    
    if (lowerMime.includes('pdf')) return FILE_TYPES.DOCUMENT;
    if (lowerMime.includes('word')) return FILE_TYPES.DOCUMENT;
    if (lowerMime.includes('document')) return FILE_TYPES.DOCUMENT;
    if (lowerMime.includes('excel')) return FILE_TYPES.DOCUMENT;
    if (lowerMime.includes('spreadsheet')) return FILE_TYPES.DOCUMENT;
    if (lowerMime.includes('powerpoint')) return FILE_TYPES.DOCUMENT;
    if (lowerMime.includes('presentation')) return FILE_TYPES.DOCUMENT;
    if (lowerMime.includes('text')) return FILE_TYPES.CODE; // 纯文本归类为代码
    
    if (lowerMime.includes('zip')) return FILE_TYPES.ARCHIVE;
    if (lowerMime.includes('rar')) return FILE_TYPES.ARCHIVE;
    if (lowerMime.includes('7z')) return FILE_TYPES.ARCHIVE;
    if (lowerMime.includes('tar')) return FILE_TYPES.ARCHIVE;
    if (lowerMime.includes('gzip')) return FILE_TYPES.ARCHIVE;
    if (lowerMime.includes('compress')) return FILE_TYPES.ARCHIVE;
    if (lowerMime.includes('package')) return FILE_TYPES.ARCHIVE;
    if (lowerMime.includes('installer')) return FILE_TYPES.ARCHIVE;
    
    if (lowerMime.includes('javascript')) return FILE_TYPES.CODE;
    if (lowerMime.includes('json')) return FILE_TYPES.CODE;
    if (lowerMime.includes('xml')) return FILE_TYPES.CODE;
  }
  
  return FILE_TYPES.OTHER;
}

/**
 * 根据文件类型获取存储文件夹
 */
export function getFolderByType(mimeType, filename = '') {
  const fileType = getFileType(mimeType, filename);
  return FOLDER_MAP[fileType] || 'files';
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 生成唯一文件名
 */
export function generateFileName(originalName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(`.${ext}`, '');
  
  // 清理文件名（移除特殊字符）
  const cleanName = nameWithoutExt
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '-')
    .substring(0, 50);
  
  return `${timestamp}-${random}-${cleanName}.${ext}`;
}

/**
 * 验证文件类型
 */
export function validateFileType(file, allowedTypes = []) {
  if (allowedTypes.length === 0) return true;
  
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.replace('/*', ''));
    }
    return file.type === type;
  });
}

/**
 * 验证文件大小
 */
export function validateFileSize(file, maxSize) {
  return file.size <= maxSize;
}
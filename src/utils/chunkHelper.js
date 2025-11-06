/**
 * 文件分块工具
 */

// 分块大小（15MB，确保 Base64 编码后 < 20MB）
const CHUNK_SIZE = 15 * 1024 * 1024;

/**
 * 将文件分块
 */
export async function splitFileIntoChunks(file) {
  const chunks = [];
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    chunks.push({
      index: i,
      blob: chunk,
      size: chunk.size,
      start,
      end
    });
  }
  
  return {
    chunks,
    totalChunks,
    originalSize: file.size,
    originalName: file.name,
    mimeType: file.type
  };
}

/**
 * 将 Blob 转换为 Base64
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

/**
 * 合并分块文件（用于下载）
 */
export function mergeChunks(chunks, mimeType) {
  const blob = new Blob(chunks, { type: mimeType });
  return blob;
}

/**
 * 下载合并后的文件
 */
export function downloadMergedFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 生成分块文件路径
 */
export function getChunkPath(basePath, index, totalChunks) {
  const ext = basePath.split('.').pop();
  const nameWithoutExt = basePath.replace(`.${ext}`, '');
  return `${nameWithoutExt}.part${index.toString().padStart(3, '0')}.${ext}`;
}
import { useState } from 'react';
import { Download, Loader, AlertCircle } from 'lucide-react';
import { githubService } from '../services/github';
import { formatFileSize } from '../utils/fileHelper';

export default function ChunkedFileDownloader({ file, className = '' }) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  async function handleDownload() {
    // 如果不是分块文件，直接下载
    if (!file.is_chunked) {
      if (file.cdn_url) {
        window.open(file.cdn_url, '_blank');
      } else {
        window.open(file.github_url, '_blank');
      }
      return;
    }

    // 分块文件需要合并下载
    setDownloading(true);
    setProgress(0);
    setError(null);

    try {
      console.log('🔽 开始下载分块文件:', file.original_name);
      console.log('📦 分块信息:', {
        chunkCount: file.chunk_count,
        chunkPaths: file.chunk_paths,
        chunkSHAs: file.chunk_shas
      });

      // 🔥 传入 chunkSHAs
      const blob = await githubService.downloadChunkedFile(
        file.chunk_paths,
        file.chunk_shas, // 传入 SHA 数组
        file.mime_type,
        file.original_name,
        (progress) => {
          setProgress(progress);
          console.log(`📊 下载进度: ${progress.toFixed(1)}%`);
        }
      );

      console.log(`✅ 文件合并完成，大小: ${formatFileSize(blob.size)}`);

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // 延迟释放 URL
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      console.log('🎉 下载完成！');

    } catch (err) {
      console.error('❌ 下载失败:', err);
      setError(err.message);
      
      setTimeout(() => setError(null), 5000);
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className={`p-2 hover:bg-gray-100 rounded-button transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title={file.is_chunked ? `下载分块文件 (${file.chunk_count} 块)` : '下载'}
      >
        {downloading ? (
          <div className="flex items-center gap-2">
            <Loader className="animate-spin" size={18} />
            <span className="text-xs font-medium">{progress.toFixed(0)}%</span>
          </div>
        ) : (
          <Download size={18} className="text-gray-600" />
        )}
      </button>

      {error && (
        <div className="absolute top-full left-0 mt-2 w-80 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg z-50">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
            <div className="flex-1 text-xs text-red-800">
              <p className="font-semibold">下载失败</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
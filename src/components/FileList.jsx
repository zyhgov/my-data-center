import { AlertTriangle, Github, Server } from 'lucide-react';
import { formatFileSize } from '../utils/fileHelper';
import FileIcon from './FileIcon';
import ChunkedFileDownloader from './ChunkedFileDownloader';
import { Settings, Eye, CheckSquare, Square } from 'lucide-react';

export default function FileList({ 
  files, 
  selectedFiles = [],
  onFileUpdate, 
  onSelectionChange,
  selectionMode = false,
  showExpiredStatus = false
}) {
  function toggleSelection(file) {
    const isSelected = selectedFiles.some(f => f.id === file.id);
    if (isSelected) {
      onSelectionChange?.(selectedFiles.filter(f => f.id !== file.id));
    } else {
      onSelectionChange?.([...selectedFiles, file]);
    }
  }

  function isSelected(file) {
    return selectedFiles.some(f => f.id === file.id);
  }

  function isFileExpired(file) {
    if (!file.expire_at) return false;
    return new Date(file.expire_at) <= new Date();
  }

  return (
    <div className="space-y-2">
      {files.map(file => {
        const expired = isFileExpired(file);
        const isR2 = file.storage_type === 'r2';
        
        return (
          <div
            key={file.id}
            className={`card flex items-center gap-4 transition ${
              isSelected(file) 
                ? 'ring-2 ring-accent bg-blue-50' 
                : expired && showExpiredStatus
                ? 'bg-gray-50 border-orange-200'
                : 'hover:shadow-md'
            }`}
          >
            {/* 选择框 */}
            {selectionMode && (
              <button
                onClick={() => toggleSelection(file)}
                className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-button transition"
              >
                {isSelected(file) ? (
                  <CheckSquare className="text-accent" size={24} />
                ) : (
                  <Square className="text-gray-400" size={24} />
                )}
              </button>
            )}

            {/* 过期标识 */}
            {expired && showExpiredStatus && (
              <div className="flex-shrink-0">
                <AlertTriangle className="text-orange-500" size={24} />
              </div>
            )}

            {/* 文件图标 */}
            <FileIcon file={file} size="md" />

            {/* 文件信息 */}
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold truncate ${expired && showExpiredStatus ? 'text-gray-500' : ''}`}>
                {file.original_name}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                <span>{formatFileSize(file.file_size)}</span>
                <span>•</span>
                <span>{new Date(file.created_at).toLocaleDateString('zh-CN')}</span>
                
                {file.is_chunked && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 font-medium">
                      分块文件 ({file.chunk_count} 块)
                    </span>
                  </>
                )}
                
                {file.expire_at && (
                  <>
                    <span>•</span>
                    {expired ? (
                      <span className="text-orange-600 font-medium flex items-center gap-1">
                        <AlertTriangle size={14} />
                        已过期
                      </span>
                    ) : (
                      <span className="text-orange-600">
                        {Math.ceil((new Date(file.expire_at) - new Date()) / 86400000)}天后过期
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 存储标签 */}
            <div className="flex flex-col items-center gap-2">
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isR2 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {isR2 ? <Server size={14} /> : <Github size={14} />}
                {isR2 ? 'Cloudflare R2' : 'GitHub'}
              </span>
            </div>

            {/* 快捷操作 */}
            {!selectionMode && (
              <div className="flex items-center gap-1">
                {!file.is_chunked && 
                 (file.file_type === 'image' || file.file_type === 'video' || file.file_type === 'audio') && 
                 file.cdn_url && (
                  <a
                    href={file.cdn_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-gray-100 rounded-button transition"
                    title="预览"
                  >
                    <Eye size={18} className="text-gray-600" />
                  </a>
                )}

                <ChunkedFileDownloader file={file} />

                <button
                  onClick={() => onFileUpdate?.(file)}
                  className="p-2 hover:bg-gray-100 rounded-button transition"
                  title="设置"
                >
                  <Settings size={18} className="text-gray-600" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
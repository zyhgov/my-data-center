import { useState } from 'react';
import { Trash2, X, AlertTriangle, Loader, CheckCircle, XCircle } from 'lucide-react';
import { storageService } from '../services/storage'; // 🔥 改用总的 storageService
import { db } from '../services/supabase';

export default function DeleteConfirmModal({ files, onClose, onComplete }) {
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleteStatus, setDeleteStatus] = useState([]);

  async function handleDelete() {
    setDeleting(true);
    setProgress(0);

    const statusList = files.map(file => ({
      id: file.id,
      name: file.original_name,
      status: 'pending'
    }));
    setDeleteStatus(statusList);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      setDeleteStatus(prev => prev.map(item => 
        item.id === file.id ? { ...item, status: 'deleting' } : item
      ));

      try {
        // 🔥 使用总的 storageService 删除
        await storageService.deleteFile(file);
        
        await db.deleteFile(file.id);

        setDeleteStatus(prev => prev.map(item => 
          item.id === file.id ? { ...item, status: 'success' } : item
        ));

        successCount++;
      } catch (error) {
        console.error('删除失败:', file.original_name, error);
        
        setDeleteStatus(prev => prev.map(item => 
          item.id === file.id ? { ...item, status: 'error', error: error.message } : item
        ));

        failCount++;
      }

      setProgress(((i + 1) / files.length) * 100);
    }

    setTimeout(() => {
      onComplete?.(successCount, failCount);
      onClose();
    }, 2000);
  }

  const totalSize = files.reduce((sum, file) => sum + file.file_size, 0);
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-card max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between bg-red-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-900">确认删除</h2>
              <p className="text-red-700 text-sm mt-1">
                此操作不可恢复，请谨慎操作
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-2 hover:bg-red-100 rounded-button transition disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {!deleting ? (
            <>
              <div className="mb-6">
                <p className="text-gray-700 font-semibold mb-2">
                  您即将删除 {files.length} 个文件：
                </p>
                <p className="text-sm text-gray-600">
                  总大小: {formatSize(totalSize)}
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map(file => (
                  <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Trash2 className="text-red-500" size={20} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.original_name}</p>
                      <p className="text-sm text-gray-500">{formatSize(file.file_size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">删除进度</span>
                  <span className="text-sm font-medium text-gray-700">{progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-red-500 h-3 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {deleteStatus.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {item.status === 'pending' && (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                    )}
                    {item.status === 'deleting' && (
                      <Loader className="text-red-500 animate-spin" size={20} />
                    )}
                    {item.status === 'success' && (
                      <CheckCircle className="text-green-500" size={20} />
                    )}
                    {item.status === 'error' && (
                      <XCircle className="text-red-500" size={20} />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      {item.error && (
                        <p className="text-sm text-red-600">{item.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {!deleting && (
          <div className="p-6 border-t bg-gray-50 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-button hover:bg-gray-100 transition"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-button hover:bg-red-700 transition font-semibold"
            >
              确认删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
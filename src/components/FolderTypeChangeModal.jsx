import { useState, useEffect } from 'react';
import { X, Tag } from 'lucide-react';
import { db } from '../services/supabase';
import FolderTypeSelector, { getFolderTypeLabel } from './FolderTypeSelector';

export default function FolderTypeChangeModal({ folder, onClose, onSuccess }) {
  const [folderType, setFolderType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (folder) {
      setFolderType(folder.file_type || 'all');
    }
  }, [folder]);

  async function handleChange() {
    setLoading(true);
    setError('');

    try {
      await db.updateFolder(folder.id, { file_type: folderType });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('修改分类失败:', err);
      setError('修改失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!folder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-card max-w-md w-full">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag className="text-accent" size={20} />
            <h2 className="text-xl font-bold">修改文件夹分类</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-button">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">当前文件夹</p>
            <p className="font-semibold">{folder.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              当前分类: {getFolderTypeLabel(folder.file_type || 'all')}
            </p>
          </div>

          <FolderTypeSelector
            selectedType={folderType}
            onSelect={setFolderType}
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-button hover:bg-gray-100"
          >
            取消
          </button>
          <button
            onClick={handleChange}
            disabled={loading}
            className="flex-1 btn-primary py-3 disabled:opacity-50"
          >
            {loading ? '修改中...' : '确认修改'}
          </button>
        </div>
      </div>
    </div>
  );
}
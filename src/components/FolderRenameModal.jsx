import { useState, useEffect } from 'react';
import { X, Folder } from 'lucide-react';
import { db } from '../services/supabase';

export default function FolderRenameModal({ folder, onClose, onSuccess }) {
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (folder) {
      setNewName(folder.name);
    }
  }, [folder]);

  async function handleRename() {
    if (!newName.trim()) {
      setError('请输入文件夹名称');
      return;
    }

    if (!/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/.test(newName)) {
      setError('文件夹名只能包含字母、数字、中文、下划线和横线');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await db.updateFolder(folder.id, { name: newName });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('重命名失败:', err);
      setError('重命名失败: ' + err.message);
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
            <Folder className="text-accent" size={20} />
            <h2 className="text-xl font-bold">重命名文件夹</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-button">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">新名称</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input w-full"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleRename();
              }}
            />
          </div>

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
            onClick={handleRename}
            disabled={loading || !newName.trim()}
            className="flex-1 btn-primary py-3 disabled:opacity-50"
          >
            {loading ? '重命名中...' : '确认'}
          </button>
        </div>
      </div>
    </div>
  );
}
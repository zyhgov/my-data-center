import { useState } from 'react';
import { FolderPlus, X, Folder } from 'lucide-react';
import { db } from '../services/supabase';
import FolderTypeSelector from './FolderTypeSelector';

export default function FolderManager({ currentFolderId, currentView = 'all', onClose, onCreated }) {
  const [folderName, setFolderName] = useState('');
  const [folderType, setFolderType] = useState(currentView === 'all' ? 'all' : currentView);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!folderName.trim()) {
      setError('请输入文件夹名称');
      return;
    }

    if (!/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/.test(folderName)) {
      setError('文件夹名只能包含字母、数字、中文、下划线和横线');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const folder = await db.createFolder(folderName, currentFolderId, folderType);
      onCreated?.(folder);
      onClose();
    } catch (err) {
      console.error('创建文件夹失败:', err);
      setError('创建失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-card max-w-md w-full">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderPlus className="text-accent" size={20} />
            </div>
            <h2 className="text-xl font-bold">新建文件夹</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-button transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              文件夹名称
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="例如：工作文档、个人照片"
              className="input w-full"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              只能包含字母、数字、中文、下划线和横线
            </p>
          </div>

          {/* 文件夹分类选择 */}
          <FolderTypeSelector
            selectedType={folderType}
            onSelect={setFolderType}
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Folder className="text-accent mt-0.5" size={16} />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">提示：</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>可以创建多级文件夹</li>
                  <li>文件夹路径会自动生成</li>
                  <li>分类可以在创建后修改</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-button hover:bg-gray-100 transition"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !folderName.trim()}
            className="flex-1 btn-primary py-3 disabled:opacity-50"
          >
            {loading ? '创建中...' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
}
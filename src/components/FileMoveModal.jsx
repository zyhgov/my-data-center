import { useState, useEffect } from 'react';
import { X, Folder, ChevronRight, Home, File } from 'lucide-react';
import { db } from '../services/supabase';

export default function FileMoveModal({ filesToMove, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allFolders, setAllFolders] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);

  useEffect(() => {
    loadFolders();
  }, []);

  async function loadFolders() {
    try {
      const folders = await getAllFoldersRecursive(null);
      setAllFolders(folders);
    } catch (err) {
      console.error('加载文件夹失败:', err);
      setError('加载失败: ' + err.message);
    }
  }

  async function getAllFoldersRecursive(parentId) {
    const folders = await db.getFolders(parentId);
    const allFolders = [...folders];
    
    for (const folder of folders) {
      const subFolders = await getAllFoldersRecursive(folder.id);
      allFolders.push(...subFolders);
    }
    
    return allFolders;
  }

  async function handleMove() {
    setLoading(true);
    setError('');

    try {
      for (const file of filesToMove) {
        await db.updateFile(file.id, { folder_id: selectedParentId });
      }
      
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('移动失败:', err);
      setError('移动失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function enterFolder(folderId) {
    const targetFolder = allFolders.find(f => f.id === folderId);
    if (targetFolder) {
      setSelectedParentId(folderId);
      const pathParts = targetFolder.path.split('/');
      const newPath = [];
      let currentPathStr = '';
      
      for (const part of pathParts) {
        currentPathStr = currentPathStr ? `${currentPathStr}/${part}` : part;
        const pathFolder = allFolders.find(f => f.path === currentPathStr);
        if (pathFolder) {
          newPath.push(pathFolder);
        }
      }
      
      setCurrentPath(newPath);
    }
  }

  function goToParent(parentId) {
    setSelectedParentId(parentId);
    if (parentId === null) {
      setCurrentPath([]);
    } else {
      const parentFolder = allFolders.find(f => f.id === parentId);
      if (parentFolder) {
        const pathParts = parentFolder.path.split('/');
        const newPath = [];
        let currentPathStr = '';
        
        for (const part of pathParts) {
          currentPathStr = currentPathStr ? `${currentPathStr}/${part}` : part;
          const pathFolder = allFolders.find(f => f.path === currentPathStr);
          if (pathFolder) {
            newPath.push(pathFolder);
          }
        }
        
        setCurrentPath(newPath);
      }
    }
  }

  const currentFolders = allFolders.filter(f => {
    if (selectedParentId === null) {
      return f.parent_id === null;
    }
    return f.parent_id === selectedParentId;
  });

  if (!filesToMove || filesToMove.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-card max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <File className="text-accent" size={20} />
            <h2 className="text-xl font-bold">移动文件</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-button">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-1">正在移动 {filesToMove.length} 个文件</p>
            <div className="flex items-center gap-2">
              <File className="text-accent" size={20} />
              <span className="font-semibold truncate">{filesToMove[0].original_name} {filesToMove.length > 1 ? `等...` : ''}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
            <button
              onClick={() => goToParent(null)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                selectedParentId === null 
                  ? 'bg-accent text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Home size={16} />
              <span>根目录</span>
            </button>
            
            {currentPath.map((pathFolder) => (
              <div key={pathFolder.id} className="flex items-center gap-2">
                <ChevronRight size={16} className="text-gray-400" />
                <button
                  onClick={() => goToParent(pathFolder.id)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    pathFolder.id === selectedParentId
                      ? 'bg-accent text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {pathFolder.name}
                </button>
              </div>
            ))}
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">
              选择目标位置（双击进入文件夹）
            </p>
            
            {currentFolders.length === 0 ? (
              <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                <Folder className="mx-auto mb-2 opacity-50" size={32} />
                <p className="text-sm">此位置没有文件夹</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentFolders.map(f => (
                  <div
                    key={f.id}
                    onDoubleClick={() => enterFolder(f.id)}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  >
                    <Folder className="text-accent" size={20} />
                    <span className="font-medium">{f.name}</span>
                    <ChevronRight className="ml-auto text-gray-400" size={16} />
                  </div>
                ))}
              </div>
            )}
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
            onClick={handleMove}
            disabled={loading}
            className="flex-1 btn-primary py-3 disabled:opacity-50"
          >
            {loading ? '移动中...' : `移动到${selectedParentId === null ? '根目录' : '此处'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
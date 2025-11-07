import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, LogOut, Folder, Image, Video, Music, 
  FileText, Archive, Settings as SettingsIcon, Home, Search,
  RefreshCw, Trash2, FolderPlus, ChevronRight, CheckSquare, AlertTriangle, Move,
  Menu, X // 导入 Menu 和 X 图标
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/supabase';
import { cleanupService } from '../services/cleanup';
import FileUploader from '../components/FileUploader';
import FileSettingsModal from '../components/FileSettingsModal';
import FileList from '../components/FileList';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import FolderManager from '../components/FolderManager';
import FolderOptionsMenu from '../components/FolderOptionsMenu';
import FolderRenameModal from '../components/FolderRenameModal';
import FolderMoveModal from '../components/FolderMoveModal';
import FileMoveModal from '../components/FileMoveModal';
import FolderTypeChangeModal from '../components/FolderTypeChangeModal';
import { getFolderTypeColor, getFolderTypeLabel } from '../components/FolderTypeSelector';
import Settings from './Settings';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState('all');
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [allFilesIncludingSubfolders, setAllFilesIncludingSubfolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  const [showUploader, setShowUploader] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [movingFiles, setMovingFiles] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFolderManager, setShowFolderManager] = useState(false);
  
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [movingFolder, setMovingFolder] = useState(null);
  const [changingTypeFolder, setChangingTypeFolder] = useState(null);
  
  // 🔥 新增：侧边栏状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
      loadAllFilesRecursive();
    //   const stopCleanup = cleanupService.startAutoCleanup();
    //   return () => stopCleanup();
    }
  }, [user, currentView, currentFolderId]);

  async function getAllSubfolderIds(folderId) {
    const ids = [folderId];
    const subfolders = await db.getFolders(folderId);
    for (const folder of subfolders) {
      ids.push(...await getAllSubfolderIds(folder.id));
    }
    return ids;
  }

  async function getAllFoldersRecursive(parentId) {
    const folders = await db.getFolders(parentId);
    let allFolders = [...folders];
    for (const folder of folders) {
      allFolders = allFolders.concat(await getAllFoldersRecursive(folder.id));
    }
    return allFolders;
  }

  async function loadAllFilesRecursive() {
    try {
      let folderIds = [currentFolderId];
      if (currentFolderId) {
        folderIds = await getAllSubfolderIds(currentFolderId);
      } else {
        const allFolders = await getAllFoldersRecursive(null);
        folderIds = [null, ...allFolders.map(f => f.id)];
      }
      const allFiles = [];
      for (const folderId of folderIds) {
        allFiles.push(...await db.getFiles({ folderId, includeExpired: true }));
      }
      setAllFilesIncludingSubfolders(allFiles);
    } catch (error) {
      console.error('递归加载文件失败:', error);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      const fileType = currentView === 'all' ? null : currentView;
      const filesData = await db.getFiles({ folderId: currentFolderId, fileType, includeExpired: true });
      setFiles(filesData);
      const foldersData = await db.getFolders(currentFolderId, currentView);
      setFolders(foldersData);
      if (currentFolderId) {
        setFolderPath(await db.getFolderPath(currentFolderId));
      } else {
        setFolderPath([]);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  function handleUploadComplete(newFiles) {
    setFiles(prev => [...newFiles, ...prev]);
    loadAllFilesRecursive();
  }

  function handleFileUpdate(updatedFile) {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    setEditingFile(null);
    loadAllFilesRecursive();
  }

  function handleFileMoved() {
    setMovingFiles([]);
    setSelectedFiles([]);
    setSelectionMode(false);
    loadData();
  }

  function handleDeleteComplete() {
    setSelectedFiles([]);
    setSelectionMode(false);
    loadData();
    loadAllFilesRecursive();
  }

  function handleFolderCreated() {
    loadData();
  }

  function enterFolder(folderId) {
    setCurrentFolderId(folderId);
    setSelectedFiles([]);
    setSelectionMode(false);
  }

  function navigateToFolder(folderId) {
    setCurrentFolderId(folderId);
    setSelectedFiles([]);
  }

  function toggleSelectionMode() {
    setSelectionMode(!selectionMode);
    setSelectedFiles([]);
  }

  async function handleDeleteFolder(folder) {
    if (confirm(`确定删除文件夹"${folder.name}"及其所有内容？此操作不可恢复！`)) {
      try {
        await db.deleteFolder(folder.id);
        loadData();
        loadAllFilesRecursive();
      } catch (error) {
        alert('删除失败: ' + error.message);
      }
    }
  }

  function handleFolderRenamed() {
    setRenamingFolder(null);
    loadData();
  }

  function handleFolderMoved() {
    setMovingFolder(null);
    loadData();
  }

  function handleFolderTypeChanged() {
    setChangingTypeFolder(null);
    loadData();
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const filteredFiles = files.filter(file => searchQuery ? file.original_name.toLowerCase().includes(searchQuery.toLowerCase()) : true);
  const stats = {
    total: allFilesIncludingSubfolders.length,
    image: allFilesIncludingSubfolders.filter(f => f.file_type === 'image').length,
    video: allFilesIncludingSubfolders.filter(f => f.file_type === 'video').length,
    audio: allFilesIncludingSubfolders.filter(f => f.file_type === 'audio').length,
    document: allFilesIncludingSubfolders.filter(f => f.file_type === 'document').length,
    archive: allFilesIncludingSubfolders.filter(f => f.file_type === 'archive').length,
    public: allFilesIncludingSubfolders.filter(f => f.is_public).length,
  };

  const menuItems = [
    { key: 'all', label: '全部文件', icon: <Folder size={20} />, count: stats.total },
    { key: 'image', label: '图片', icon: <Image size={20} />, count: stats.image },
    { key: 'video', label: '视频', icon: <Video size={20} />, count: stats.video },
    { key: 'audio', label: '音频', icon: <Music size={20} />, count: stats.audio },
    { key: 'document', label: '文档', icon: <FileText size={20} />, count: stats.document },
    { key: 'archive', label: '压缩包', icon: <Archive size={20} />, count: stats.archive },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <nav className="flex-1 space-y-1">
        {menuItems.map(item => (
          <button key={item.key} onClick={() => { setCurrentView(item.key); setCurrentFolderId(null); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-button transition text-sm ${
              currentView === item.key && !currentFolderId ? 'bg-accent text-white' : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">{item.icon}<span>{item.label}</span></div>
            {item.count > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${currentView === item.key && !currentFolderId ? 'bg-white/20' : 'bg-gray-100'}`}>{item.count}</span>}
          </button>
        ))}
        <div className="pt-4 mt-4 border-t">
          <button onClick={() => { setCurrentView('settings'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-button transition text-sm ${currentView === 'settings' ? 'bg-accent text-white' : 'hover:bg-gray-100'}`}
          >
            <SettingsIcon size={20} /><span>设置</span>
          </button>
        </div>
      </nav>
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">统计信息</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between"><span className="text-gray-600">总文件数</span><span className="font-semibold">{stats.total}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">公开文件</span><span className="font-semibold text-green-600">{stats.public}</span></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 -ml-2">
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
              <h1 className="text-lg sm:text-xl font-bold hidden sm:block">UNHub 数据中心</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="搜索文件..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 w-full text-sm"
              />
            </div>
            <button onClick={loadData} className="p-2 hover:bg-gray-100 rounded-button transition hidden sm:inline-flex" title="刷新"><RefreshCw size={18} /></button>
            <a href="/" target="_blank" className="p-2 hover:bg-gray-100 rounded-button transition hidden sm:inline-flex" title="公开页面"><Home size={18} /></a>
            <div className="hidden sm:flex items-center gap-2 p-2 bg-gray-100 rounded-button">
              <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white text-xs font-semibold">{user.email[0].toUpperCase()}</div>
              <span className="text-sm font-medium hidden lg:inline">{user.email}</span>
            </div>
            <button onClick={handleLogout} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-button transition" title="登出"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 桌面侧边栏 */}
        <aside className="hidden lg:block w-64 bg-white border-r h-[calc(100vh-61px)] sticky top-[61px] p-4 flex-shrink-0">
          <SidebarContent />
        </aside>

        {/* 移动端侧边栏 */}
        {isSidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
            <aside className="fixed top-0 left-0 w-64 h-full bg-white z-50 p-4 transform transition-transform duration-300 ease-in-out">
              <SidebarContent />
            </aside>
          </>
        )}

        <main className="flex-1 p-4 sm:p-6 min-w-0">
          <div className="max-w-7xl mx-auto">
            {currentView === 'settings' ? (
              <Settings />
            ) : (
              <>
                {folderPath.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 text-sm overflow-x-auto pb-2">
                    <button onClick={() => setCurrentFolderId(null)} className="text-gray-600 hover:text-accent transition whitespace-nowrap">根目录</button>
                    {folderPath.map((folder) => (
                      <div key={folder.id} className="flex items-center gap-2">
                        <ChevronRight size={16} className="text-gray-400" />
                        <button onClick={() => navigateToFolder(folder.id)} className="hover:text-accent transition whitespace-nowrap">{folder.name}</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">{folderPath.length > 0 ? folderPath[folderPath.length - 1].name : menuItems.find(item => item.key === currentView)?.label}</h2>
                    <p className="text-gray-600 mt-1 text-sm">{searchQuery ? `找到 ${filteredFiles.length} 个文件` : `${folders.length} 个文件夹，${filteredFiles.length} 个文件`}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                    {selectedFiles.length > 0 && (
                      <>
                        <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-button transition text-sm"><Trash2 size={16} /><span>删除({selectedFiles.length})</span></button>
                        <button onClick={() => setMovingFiles(selectedFiles)} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-button transition text-sm"><Move size={16} /><span>移动({selectedFiles.length})</span></button>
                      </>
                    )}
                    <button onClick={toggleSelectionMode} className={`flex items-center gap-2 px-3 py-2 rounded-button transition text-sm ${selectionMode ? 'bg-accent text-white' : 'bg-gray-100'}`}><CheckSquare size={16} /><span>{selectionMode ? '取消' : '选择'}</span></button>
                    <button onClick={() => setShowFolderManager(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-button transition text-sm"><FolderPlus size={16} /><span>新建</span></button>
                    <button onClick={() => setShowUploader(true)} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"><Upload size={16} /><span>上传</span></button>
                  </div>
                </div>

                {folders.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-600 mb-3">文件夹</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {folders.map(folder => (
                        <div key={folder.id} className="card hover:shadow-md transition text-left group relative p-4">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => enterFolder(folder.id)}>
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition"><Folder className="text-accent" size={24} /></div>
                            <div className="flex-1 min-w-0"><p className="font-semibold truncate">{folder.name}</p><p className="text-xs text-gray-500">文件夹</p></div>
                          </div>
                          {folder.file_type !== 'all' && <div className="mt-2"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getFolderTypeColor(folder.file_type)}`}>{getFolderTypeLabel(folder.file_type)}</span></div>}
                          <div className="absolute top-2 right-2"><FolderOptionsMenu folder={folder} onRename={() => setRenamingFolder(folder)} onDelete={() => handleDeleteFolder(folder)} onMove={() => setMovingFolder(folder)} onChangeType={() => setChangingTypeFolder(folder)} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {loading ? <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mx-auto" /><p className="mt-4 text-gray-600">加载中...</p></div> :
                 filteredFiles.length === 0 && folders.length === 0 ? <div className="text-center py-12 card"><Upload className="mx-auto text-gray-400" size={64} /><p className="mt-4 text-gray-600 font-semibold">{searchQuery ? '没有找到匹配的文件' : '暂无文件'}</p><p className="text-sm text-gray-400 mt-2">{searchQuery ? '尝试其他关键词' : '点击右上角上传文件'}</p></div> :
                 filteredFiles.length > 0 && <>
                    <h3 className="text-sm font-semibold text-gray-600 mb-3">文件</h3>
                    <FileList files={filteredFiles} selectedFiles={selectedFiles} onFileUpdate={setEditingFile} onSelectionChange={setSelectedFiles} selectionMode={selectionMode} showExpiredStatus={true}/>
                  </>}
              </>
            )}
          </div>
        </main>
      </div>

      {showUploader && <FileUploader currentFolderId={currentFolderId} onUploadComplete={handleUploadComplete} onClose={() => setShowUploader(false)} />}
      {editingFile && <FileSettingsModal file={editingFile} onClose={() => setEditingFile(null)} onUpdate={handleFileUpdate} onMove={setMovingFiles} />}
      {movingFiles.length > 0 && <FileMoveModal filesToMove={movingFiles} onClose={() => setMovingFiles([])} onSuccess={handleFileMoved} />}
      {showDeleteConfirm && <DeleteConfirmModal files={selectedFiles} onClose={() => setShowDeleteConfirm(false)} onComplete={handleDeleteComplete} />}
      {showFolderManager && <FolderManager currentFolderId={currentFolderId} currentView={currentView} onClose={() => setShowFolderManager(false)} onCreated={handleFolderCreated} />}
      {renamingFolder && <FolderRenameModal folder={renamingFolder} onClose={() => setRenamingFolder(null)} onSuccess={handleFolderRenamed} />}
      {movingFolder && <FolderMoveModal folder={movingFolder} onClose={() => setMovingFolder(null)} onSuccess={handleFolderMoved} />}
      {changingTypeFolder && <FolderTypeChangeModal folder={changingTypeFolder} onClose={() => setChangingTypeFolder(null)} onSuccess={handleFolderTypeChanged} />}
    </div>
  );
}
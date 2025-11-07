import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Lock, Search, Grid, List, Folder,
  ChevronRight, Eye, Calendar, HardDrive, FileText, Menu, X,
  Github, Server // 导入新图标
} from 'lucide-react';
import { db } from '../services/supabase';
import { formatFileSize } from '../utils/fileHelper';
import FileIcon from '../components/FileIcon';
import ChunkedFileDownloader from '../components/ChunkedFileDownloader';

export default function Home() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentFolderId]);

  async function loadData() {
    try {
      setLoading(true);
      
      const filesData = await db.getFiles({ 
        isPublic: true,
        folderId: currentFolderId,
        includeExpired: false
      });
      
      setFiles(filesData);

      const allFolders = await db.getFolders(currentFolderId);
      
      const foldersWithPublicFiles = [];
      for (const folder of allFolders) {
        const folderFiles = await db.getFiles({ 
          isPublic: true, 
          folderId: folder.id,
          includeExpired: false
        });
        if (folderFiles.length > 0) {
          foldersWithPublicFiles.push({
            ...folder,
            fileCount: folderFiles.length
          });
        }
      }
      
      setFolders(foldersWithPublicFiles);

      if (currentFolderId) {
        const path = await db.getFolderPath(currentFolderId);
        setFolderPath(path);
      } else {
        setFolderPath([]);
      }
    } catch (error) {
      console.error('加载文件失败:', error);
    } finally {
      setLoading(false);
    }
  }

  function enterFolder(folderId) {
    setCurrentFolderId(folderId);
  }

  function navigateToFolder(folderId) {
    setCurrentFolderId(folderId);
  }

  function goToRoot() {
    setCurrentFolderId(null);
  }

  const filteredFiles = files.filter(file => {
    if (filter !== 'all' && file.file_type !== filter) {
      return false;
    }
    
    if (searchQuery) {
      return file.original_name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    return true;
  });

  const stats = {
    total: files.length,
    image: files.filter(f => f.file_type === 'image').length,
    video: files.filter(f => f.file_type === 'video').length,
    audio: files.filter(f => f.file_type === 'audio').length,
    document: files.filter(f => f.file_type === 'document').length,
    archive: files.filter(f => f.file_type === 'archive').length,
  };

  const totalSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0);

  const filterButtons = [
    { key: 'all', label: '全部', count: stats.total },
    { key: 'image', label: '图片', count: stats.image },
    { key: 'video', label: '视频', count: stats.video },
    { key: 'audio', label: '音频', count: stats.audio },
    { key: 'document', label: '文档', count: stats.document },
    { key: 'archive', label: '压缩包', count: stats.archive }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <img src="/logo.svg" alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10" />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-text-primary">
                  UNHub 数据中心
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">高可用持续化文件存储与分享</p>
              </div>
            </div>
            
            <Link 
              to="/login" 
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-2.5 bg-accent text-white rounded-button hover:bg-blue-700 transition text-sm sm:text-base"
            >
              <Lock size={14} className="sm:w-4 sm:h-4" />
              <span className="font-semibold hidden sm:inline">管理后台</span>
              <span className="font-semibold sm:hidden">管理</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 面包屑和统计 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2 text-xs sm:text-sm overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={goToRoot}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  currentFolderId 
                    ? 'text-gray-600 hover:bg-gray-100 hover:text-accent' 
                    : 'text-accent font-semibold bg-blue-50'
                }`}
              >
                <HardDrive size={14} className="sm:w-4 sm:h-4" />
                <span>根目录</span>
              </button>
              
              {folderPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-gray-400 sm:w-4 sm:h-4" />
                  <button
                    onClick={() => navigateToFolder(folder.id)}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      index === folderPath.length - 1
                        ? 'text-accent font-semibold bg-blue-50'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-accent'
                    }`}
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="px-2 sm:px-3 py-1.5 bg-blue-50 text-accent rounded-lg font-semibold">
                {stats.total} 个文件
              </div>
              <div className="px-2 sm:px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-semibold">
                {formatFileSize(totalSize)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex gap-2 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="搜索文件名..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm sm:text-base"
                />
              </div>

              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 sm:p-2 rounded-lg transition ${
                    viewMode === 'grid' ? 'bg-accent text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Grid size={16} className="sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 sm:p-2 rounded-lg transition ${
                    viewMode === 'list' ? 'bg-accent text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <List size={16} className="sm:w-5 sm:h-5" />
                </button>
              </div>

              <button
                onClick={() => setShowMobileFilter(!showMobileFilter)}
                className="lg:hidden p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                {showMobileFilter ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            <div className={`${showMobileFilter ? 'flex' : 'hidden'} lg:flex flex-wrap gap-2 overflow-x-auto`}>
              {filterButtons.map(item => (
                <button
                  key={item.key}
                  onClick={() => {
                    setFilter(item.key);
                    setShowMobileFilter(false);
                  }}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition whitespace-nowrap font-medium text-sm sm:text-base ${
                    filter === item.key
                      ? 'bg-accent text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {item.label}
                  {item.count > 0 && (
                    <span className={`ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                      filter === item.key ? 'bg-white bg-opacity-20' : 'bg-gray-200'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {loading ? (
          <div className="text-center py-12 sm:py-20">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-accent border-t-transparent mx-auto mb-4" />
            <p className="text-gray-600 font-medium text-sm sm:text-base">加载中...</p>
          </div>
        ) : (
          <>
            {/* 文件夹 */}
            {folders.length > 0 && (
              <div className="mb-6 sm:mb-8">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <Folder className="text-accent" size={18} />
                  文件夹
                </h3>
                <div className={`grid gap-3 sm:gap-4 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' 
                    : 'grid-cols-1'
                }`}>
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => enterFolder(folder.id)}
                      className="bg-white rounded-lg p-3 sm:p-4 hover:shadow-lg transition border border-gray-200 hover:border-accent"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Folder className="text-accent" size={20} />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-semibold text-gray-900 truncate text-sm sm:text-base">{folder.name}</p>
                          <p className="text-xs text-gray-500">{folder.fileCount} 个文件</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 文件列表 */}
            {filteredFiles.length === 0 ? (
              <div className="text-center py-12 sm:py-20">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <FileText className="text-gray-400" size={32} />
                </div>
                <p className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery ? '没有找到匹配的文件' : '暂无公开文件'}
                </p>
                <p className="text-sm sm:text-base text-gray-500">
                  {searchQuery ? '尝试其他关键词' : '管理员还没有公开任何文件'}
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <FileText className="text-accent" size={18} />
                  文件 ({filteredFiles.length})
                </h3>
                
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {filteredFiles.map(file => {
                      const isR2 = file.storage_type === 'r2';
                      return (
                        <div key={file.id} className="bg-white rounded-lg overflow-hidden border border-gray-200 group relative">
                          {/* 🔥 存储标签 */}
                          <div className={`absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium z-10 ${
                            isR2 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {isR2 ? <Server size={14} /> : <Github size={14} />}
                          </div>

                          <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                            {file.file_type === 'image' && !file.is_chunked ? (
                              <img
                                src={file.cdn_url}
                                alt={file.original_name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <FileIcon file={file} size="xl" showThumbnail={false} />
                            )}
                          </div>
                          
                          <div className="p-3 sm:p-4">
                            <h3 className="font-semibold text-gray-900 truncate mb-2 text-sm sm:text-base" title={file.original_name}>
                              {file.original_name}
                            </h3>
                            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
                              <span>{formatFileSize(file.file_size)}</span>
                              <span className="hidden sm:inline">{new Date(file.created_at).toLocaleDateString('zh-CN')}</span>
                            </div>
                            
                            <div className="mt-3 flex items-center gap-2">
                              {!file.is_chunked && 
                               (file.file_type === 'image' || file.file_type === 'video' || file.file_type === 'audio') && 
                               file.cdn_url && (
                                <a 
                                  href={file.cdn_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm"
                                >
                                  <Eye size={16} />
                                  <span>预览</span>
                                </a>
                              )}
                              
                              <ChunkedFileDownloader 
                                file={file} 
                                className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      {filteredFiles.map(file => {
                        const isR2 = file.storage_type === 'r2';
                        return (
                          <div key={file.id} className="p-3 sm:p-4 hover:bg-gray-50 transition flex items-center gap-3 sm:gap-4 group">
                            <FileIcon file={file} size="md" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate mb-1 text-sm sm:text-base">{file.original_name}</h3>
                              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 flex-wrap">
                                <span>{formatFileSize(file.file_size)}</span>
                                <span className="hidden sm:inline">•</span>
                                <span className="hidden sm:inline">{new Date(file.created_at).toLocaleDateString('zh-CN')}</span>
                                
                                <span className="hidden sm:inline">•</span>
                                <span className={`flex items-center gap-1.5 ${isR2 ? 'text-orange-600' : 'text-gray-600'}`}>
                                  {isR2 ? <Server size={14} /> : <Github size={14} />}
                                  {isR2 ? 'R2' : 'GitHub'}
                                </span>
                                
                                {file.is_chunked && (
                                  <>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="text-blue-600 font-medium">{file.chunk_count} 块</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              {!file.is_chunked && 
                               (file.file_type === 'image' || file.file_type === 'video' || file.file_type === 'audio') && 
                               file.cdn_url && (
                                <a 
                                  href={file.cdn_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="p-1.5 sm:p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                                >
                                  <Eye size={14} className="sm:w-[18px] sm:h-[18px] text-gray-700" />
                                </a>
                              )}
                              
                              <ChunkedFileDownloader 
                                file={file} 
                                className="bg-blue-100 hover:bg-blue-200 text-accent"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* 底部 */}
      <footer className="bg-white border-t mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <img src="/logo.svg" alt="Logo" className="w-6 h-6 sm:w-8 sm:h-8" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">UNHub 数据中心</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-2">
              当前页共 {filteredFiles.length} 个公开文件 · 总大小 {formatFileSize(totalSize)}
            </p>
            <p className="text-xs text-gray-400">© 2025 UNHub 数据中心. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
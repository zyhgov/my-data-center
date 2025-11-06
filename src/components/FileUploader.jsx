import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader, Info, Server, Github } from 'lucide-react';
import { storageService } from '../services/storage'; // 🔥 改用总的 storageService
import { db } from '../services/supabase';
import { formatFileSize, getFileType } from '../utils/fileHelper';
import DeploymentStatus from './DeploymentStatus';

const DIRECT_UPLOAD_LIMIT = 20 * 1024 * 1024; // 20MB
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export default function FileUploader({ currentFolderId, onUploadComplete, onClose }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  
  // 🔥 新增：存储目标选择
  const [storageTarget, setStorageTarget] = useState('github'); 

  const [deploymentCommitSha, setDeploymentCommitSha] = useState(null);
  const [deploymentComplete, setDeploymentComplete] = useState(false);

  function handleFileSelect(e) {
    const selectedFiles = Array.from(e.target.files);
    
    const fileItems = selectedFiles.map(file => {
      let warning = null;
      let status = 'pending';
      let error = null;
      
      if (storageTarget === 'github' && file.size > MAX_FILE_SIZE) {
        warning = `GitHub 模式不支持 > 2GB 文件`;
        status = 'error';
        error = warning;
      } else if (storageTarget === 'github' && file.size > DIRECT_UPLOAD_LIMIT) {
        warning = `大文件（${formatFileSize(file.size)}），将分块上传到 GitHub`;
      }
      
      return {
        id: Math.random().toString(36).substring(7),
        file,
        status,
        progress: 0,
        error,
        warning
      };
    });
    
    setFiles(prev => [...prev, ...fileItems]);
  }

  function handleDrop(e) {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    const fileItems = droppedFiles.map(file => {
      let warning = null;
      let status = 'pending';
      let error = null;
      
      if (storageTarget === 'github' && file.size > MAX_FILE_SIZE) {
        warning = `GitHub 模式不支持 > 2GB 文件`;
        status = 'error';
        error = warning;
      } else if (storageTarget === 'github' && file.size > DIRECT_UPLOAD_LIMIT) {
        warning = `大文件（${formatFileSize(file.size)}），将分块上传到 GitHub`;
      }
      
      return {
        id: Math.random().toString(36).substring(7),
        file,
        status,
        progress: 0,
        error,
        warning
      };
    });
    
    setFiles(prev => [...prev, ...fileItems]);
  }

  function removeFile(id) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  async function handleUpload() {
    const validFiles = files.filter(f => f.status === 'pending');
    if (validFiles.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
    setDeploymentCommitSha(null);
    setDeploymentComplete(false);

    try {
      setFiles(prev => prev.map(f => 
        validFiles.find(vf => vf.id === f.id) 
          ? { ...f, status: 'uploading' }
          : f
      ));

      const filesToUpload = validFiles.map(f => f.file);

      // 🔥 使用总的 storageService 上传
      const result = await storageService.uploadFiles(filesToUpload, storageTarget, {
        onProgress: (progress) => {
          setUploadProgress(progress);
        }
      });

      console.log(`${storageTarget.toUpperCase()} 上传结果:`, result);

      if (result.commitSha) {
        setDeploymentCommitSha(result.commitSha);
      }

      const dbFiles = [];
      for (const fileResult of result.files) {
        const fileItem = validFiles.find(f => f.file.name === fileResult.originalFile.name);
        
        try {
          const fileType = getFileType(fileResult.originalFile.type, fileResult.originalFile.name);
          
          const dbFile = await db.createFile({
            filename: fileResult.path.split('/').pop(),
            original_name: fileResult.originalName,
            file_path: fileResult.path,
            file_type: fileType,
            mime_type: fileResult.originalFile.type,
            file_size: fileResult.originalFile.size,
            github_url: fileResult.githubUrl,
            github_sha: fileResult.sha,
            cdn_url: fileResult.cdnUrl,
            is_public: false,
            folder_id: currentFolderId,
            storage_type: fileResult.storageType || storageTarget, // 🔥 保存存储类型
            is_chunked: fileResult.isChunked || false,
            chunk_count: fileResult.chunkCount || 1,
            chunk_paths: fileResult.chunkPaths || [fileResult.path],
            chunk_shas: fileResult.chunkSHAs || null
          });

          dbFiles.push(dbFile);

          setFiles(prev => prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'success', progress: 100 }
              : f
          ));
        } catch (error) {
          console.error('保存文件失败:', error);
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'error', error: `数据库保存失败: ${error.message}` }
              : f
          ));
        }
      }

      onUploadComplete?.(dbFiles);

    } catch (error) {
      console.error('上传失败:', error);
      setFiles(prev => prev.map(f => 
        f.status === 'uploading' 
          ? { ...f, status: 'error', error: error.message }
          : f
      ));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function handleDeploymentComplete(status) {
    setDeploymentComplete(true);
    console.log('部署完成:', status);
  }

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  const canClose = !uploading && (!deploymentCommitSha || deploymentComplete);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-card max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">上传文件</h2>
            <p className="text-gray-600 mt-1">
              {files.length > 0 ? `已选择 ${files.length} 个文件` : '选择文件或拖拽到此处'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={!canClose}
            className="p-2 hover:bg-gray-100 rounded-button transition disabled:opacity-50 disabled:cursor-not-allowed"
            title={canClose ? '关闭' : '等待上传完成...'}
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* 🔥 存储目标选择 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-semibold mb-2">选择存储目标</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStorageTarget('github')}
                disabled={uploading}
                className={`flex items-center gap-2 p-3 border-2 rounded-lg transition ${
                  storageTarget === 'github' ? 'border-accent bg-blue-50' : 'hover:border-gray-300'
                }`}
              >
                <Github size={20} />
                <div>
                  <p className="font-semibold">GitHub</p>
                  <p className="text-xs text-gray-500">支持分块和CDN</p>
                </div>
              </button>
              <button
                onClick={() => setStorageTarget('r2')}
                disabled={uploading}
                className={`flex items-center gap-2 p-3 border-2 rounded-lg transition ${
                  storageTarget === 'r2' ? 'border-accent bg-blue-50' : 'hover:border-gray-300'
                }`}
              >
                <Server size={20} />
                <div>
                  <p className="font-semibold">Cloudflare R2</p>
                  <p className="text-xs text-gray-500">大文件更稳定</p>
                </div>
              </button>
            </div>
          </div>
          
          {deploymentCommitSha && (
            <DeploymentStatus
              commitSha={deploymentCommitSha}
              onComplete={handleDeploymentComplete}
            />
          )}

          {files.length === 0 && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-accent hover:bg-blue-50 transition"
            >
              <Upload className="mx-auto text-gray-400 mb-4" size={64} />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                点击选择文件或拖拽到此处
              </p>
              <p className="text-sm text-gray-500 mb-2">
                支持图片、视频、音频、文档等多种格式
              </p>
              <p className="text-xs text-gray-400">
                GitHub 最大 2GB (自动分块), R2 无限制
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-3">
              {files.map(fileItem => (
                <div
                  key={fileItem.id}
                  className={`flex items-center gap-3 p-4 border rounded-lg ${
                    fileItem.warning && fileItem.status === 'pending' ? 'border-blue-300 bg-blue-50' : ''
                  } ${
                    fileItem.status === 'error' ? 'border-red-300 bg-red-50' : ''
                  }`}
                >
                  <div className="flex-shrink-0">
                    {fileItem.status === 'pending' && (
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {fileItem.warning ? (
                          <Info className="text-blue-500" size={20} />
                        ) : (
                          <Upload className="text-gray-400" size={20} />
                        )}
                      </div>
                    )}
                    {fileItem.status === 'uploading' && (
                      <div className="w-10 h-10 flex items-center justify-center">
                        <Loader className="text-accent animate-spin" size={20} />
                      </div>
                    )}
                    {fileItem.status === 'success' && (
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="text-green-600" size={20} />
                      </div>
                    )}
                    {fileItem.status === 'error' && (
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <AlertCircle className="text-red-600" size={20} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{fileItem.file.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(fileItem.file.size)}
                      {fileItem.warning && storageTarget === 'github' && (
                        <span className="ml-2 text-blue-600">• 分块上传</span>
                      )}
                    </p>
                    {fileItem.status === 'error' && (
                      <p className="text-sm text-red-600 mt-1">{fileItem.error}</p>
                    )}
                  </div>

                  {fileItem.status === 'uploading' && (
                    <div className="w-32">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-accent h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {uploadProgress.toFixed(0)}%
                      </p>
                    </div>
                  )}

                  {fileItem.status === 'pending' && !uploading && (
                    <button
                      onClick={() => removeFile(fileItem.id)}
                      className="p-2 hover:bg-gray-100 rounded-button transition"
                    >
                      <X size={20} className="text-gray-400" />
                    </button>
                  )}
                </div>
              ))}

              {!uploading && !deploymentCommitSha && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-accent hover:bg-blue-50 transition text-gray-600 hover:text-accent"
                >
                  + 继续添加文件
                </button>
              )}
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-4 text-sm">
                {pendingCount > 0 && (
                  <span className="text-gray-600">等待: {pendingCount}</span>
                )}
                {successCount > 0 && (
                  <span className="text-green-600">成功: {successCount}</span>
                )}
                {errorCount > 0 && (
                  <span className="text-red-600">失败: {errorCount}</span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={!canClose}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-button hover:bg-gray-100 transition disabled:opacity-50"
              >
                {deploymentCommitSha && !deploymentComplete ? '上传中...' : '关闭'}
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || pendingCount === 0}
                className="flex-1 btn-primary py-3 disabled:opacity-50"
              >
                {uploading ? '上传中...' : `上传 ${pendingCount} 个文件`}
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}
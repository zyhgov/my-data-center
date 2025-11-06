import { Octokit } from '@octokit/rest';
import { fileToBase64, getFolderByType, generateFileName } from '../utils/fileHelper';
import { splitFileIntoChunks, blobToBase64, getChunkPath } from '../utils/chunkHelper';

// 初始化 Octokit
const octokit = new Octokit({
  auth: import.meta.env.VITE_GITHUB_TOKEN
});

const REPO_CONFIG = {
  owner: import.meta.env.VITE_GITHUB_OWNER,
  repo: import.meta.env.VITE_STORAGE_REPO
};

// 文件大小限制
const DIRECT_UPLOAD_LIMIT = 20 * 1024 * 1024; // 20MB - 直接上传
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB - 最大支持

// 检查配置
if (!import.meta.env.VITE_GITHUB_TOKEN || !REPO_CONFIG.owner || !REPO_CONFIG.repo) {
  console.error('❌ GitHub 配置缺失，请检查 .env.local 文件');
}

export const githubService = {
  
  // ============================================
  // 直接上传（小文件 <20MB）
  // ============================================
  async uploadDirect(file, options = {}) {
    try {
      const { onProgress = null } = options;

      const folder = getFolderByType(file.type, file.name);
      const filename = generateFileName(file.name);
      const path = `${folder}/${filename}`;

      console.log('📤 直接上传:', file.name, '→', path);
      onProgress?.(10);

      const content = await fileToBase64(file);
      onProgress?.(50);

      const response = await octokit.repos.createOrUpdateFileContents({
        ...REPO_CONFIG,
        path,
        message: `Upload ${file.name}`,
        content,
        committer: {
          name: 'Data Center Bot',
          email: 'bot@data-center.com'
        }
      });

      onProgress?.(90);
      console.log('✅ 上传成功:', response.data.content.path);

      await this.triggerWorkflow();
      onProgress?.(100);

      return {
        success: true,
        originalName: file.name,
        originalFile: file,
        path: response.data.content.path,
        sha: response.data.content.sha,
        commitSha: response.data.commit.sha,
        githubUrl: response.data.content.html_url,
        cdnUrl: this.getCDNUrl(path),
        isChunked: false,
        chunkCount: 1,
        chunkPaths: [path]
      };

    } catch (error) {
      console.error('❌ 直接上传失败:', error);
      throw new Error(`上传失败: ${error.message}`);
    }
  },

  // ============================================
  // 分块上传（大文件 20MB-2GB）
  // ============================================
  async uploadChunked(file, options = {}) {
    try {
      const { onProgress = null } = options;

      console.log('📦 开始分块上传:', file.name);
      onProgress?.(5);

      // 分块
      const { chunks, totalChunks } = await splitFileIntoChunks(file);
      console.log(`📊 分为 ${totalChunks} 块`);

      const folder = getFolderByType(file.type, file.name);
      const filename = generateFileName(file.name);
      const basePath = `${folder}/${filename}`;

      // 获取当前 commit
      const { data: ref } = await octokit.git.getRef({
        ...REPO_CONFIG,
        ref: 'heads/main'
      });

      const { data: commit } = await octokit.git.getCommit({
        ...REPO_CONFIG,
        commit_sha: ref.object.sha
      });

      onProgress?.(10);

      // 创建所有 blobs
      const blobs = [];
      const chunkPaths = [];
      const chunkSHAs = []; // 保存每个分块的 SHA

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkPath = getChunkPath(basePath, i, totalChunks);
        chunkPaths.push(chunkPath);

        console.log(`📄 处理分块 ${i + 1}/${totalChunks}:`, chunkPath);

        const content = await blobToBase64(chunk.blob);

        const { data: blob } = await octokit.git.createBlob({
          ...REPO_CONFIG,
          content,
          encoding: 'base64'
        });

        blobs.push({
          path: chunkPath,
          mode: '100644',
          type: 'blob',
          sha: blob.sha
        });

        chunkSHAs.push(blob.sha); // 记录 SHA

        const progress = 10 + ((i + 1) / totalChunks) * 70;
        onProgress?.(progress);
      }

      onProgress?.(80);
      console.log('✅ 所有分块 blob 创建完成');

      // 创建 tree
      const { data: tree } = await octokit.git.createTree({
        ...REPO_CONFIG,
        base_tree: commit.tree.sha,
        tree: blobs
      });

      onProgress?.(85);

      // 创建 commit
      const { data: newCommit } = await octokit.git.createCommit({
        ...REPO_CONFIG,
        message: `Upload chunked file: ${file.name} (${totalChunks} parts)`,
        tree: tree.sha,
        parents: [ref.object.sha],
        committer: {
          name: 'Data Center Bot',
          email: 'bot@data-center.com'
        }
      });

      onProgress?.(90);

      // 更新引用
      await octokit.git.updateRef({
        ...REPO_CONFIG,
        ref: 'heads/main',
        sha: newCommit.sha
      });

      onProgress?.(95);
      console.log('✅ 分块上传完成！');

      await this.triggerWorkflow();
      onProgress?.(100);

      return {
        success: true,
        originalName: file.name,
        originalFile: file,
        path: basePath,
        sha: newCommit.sha,
        commitSha: newCommit.sha,
        githubUrl: `https://github.com/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/tree/main/${folder}`,
        cdnUrl: null,
        isChunked: true,
        chunkCount: totalChunks,
        chunkPaths: chunkPaths,
        chunkSHAs: chunkSHAs // 🔥 新增：保存 SHA 数组
      };

    } catch (error) {
      console.error('❌ 分块上传失败:', error);
      throw new Error(`分块上传失败: ${error.message}`);
    }
  },

  // ============================================
  // 单文件上传（智能选择）
  // ============================================
  async uploadSingleFile(file, options = {}) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`文件过大（${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB），最大支持 2GB`);
    }

    if (file.size > DIRECT_UPLOAD_LIMIT) {
      console.log(`📦 分块模式: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return await this.uploadChunked(file, options);
    } else {
      console.log(`📄 直接模式: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return await this.uploadDirect(file, options);
    }
  },

  // ============================================
  // 批量文件上传
  // ============================================
  async uploadMultipleFiles(files, options = {}) {
    try {
      const { onProgress = null } = options;
      
      console.log(`📦 开始批量上传 ${files.length} 个文件...`);
      
      const directFiles = files.filter(f => f.size <= DIRECT_UPLOAD_LIMIT);
      const chunkedFiles = files.filter(f => f.size > DIRECT_UPLOAD_LIMIT && f.size <= MAX_FILE_SIZE);
      const tooLargeFiles = files.filter(f => f.size > MAX_FILE_SIZE);

      if (tooLargeFiles.length > 0) {
        const names = tooLargeFiles.map(f => f.name).join(', ');
        throw new Error(`以下文件超过 2GB 限制：${names}`);
      }

      console.log(`📊 直接上传: ${directFiles.length}，分块上传: ${chunkedFiles.length}`);

      const allResults = [];
      let totalProgress = 0;
      const totalFiles = directFiles.length + chunkedFiles.length;

      // 1. 批量上传小文件
      if (directFiles.length > 0) {
        console.log(`📤 批量上传 ${directFiles.length} 个小文件...`);
        onProgress?.(5);

        const { data: ref } = await octokit.git.getRef({
          ...REPO_CONFIG,
          ref: 'heads/main'
        });

        const { data: commit } = await octokit.git.getCommit({
          ...REPO_CONFIG,
          commit_sha: ref.object.sha
        });

        const blobs = [];
        const fileInfos = [];

        for (let i = 0; i < directFiles.length; i++) {
          const file = directFiles[i];
          const folder = getFolderByType(file.type, file.name);
          const filename = generateFileName(file.name);
          const path = `${folder}/${filename}`;

          console.log(`📄 处理文件 ${i + 1}/${directFiles.length}:`, file.name);

          const content = await fileToBase64(file);

          const { data: blob } = await octokit.git.createBlob({
            ...REPO_CONFIG,
            content,
            encoding: 'base64'
          });

          blobs.push({
            path,
            mode: '100644',
            type: 'blob',
            sha: blob.sha
          });

          fileInfos.push({
            originalFile: file,
            path,
            sha: blob.sha
          });

          totalProgress++;
          onProgress?.((totalProgress / totalFiles) * 60);
        }

        const { data: tree } = await octokit.git.createTree({
          ...REPO_CONFIG,
          base_tree: commit.tree.sha,
          tree: blobs
        });

        const { data: newCommit } = await octokit.git.createCommit({
          ...REPO_CONFIG,
          message: `Upload ${directFiles.length} files`,
          tree: tree.sha,
          parents: [ref.object.sha],
          committer: {
            name: 'Data Center Bot',
            email: 'bot@data-center.com'
          }
        });

        await octokit.git.updateRef({
          ...REPO_CONFIG,
          ref: 'heads/main',
          sha: newCommit.sha
        });

        console.log('✅ 小文件批量上传完成');

        allResults.push(...fileInfos.map(info => ({
          originalName: info.originalFile.name,
          originalFile: info.originalFile,
          path: info.path,
          sha: info.sha,
          githubUrl: `https://github.com/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/blob/main/${info.path}`,
          cdnUrl: this.getCDNUrl(info.path),
          isChunked: false,
          chunkCount: 1,
          chunkPaths: [info.path]
        })));
      }

      // 2. 逐个上传大文件（分块）
      if (chunkedFiles.length > 0) {
        console.log(`📦 逐个上传 ${chunkedFiles.length} 个大文件...`);
        
        for (let i = 0; i < chunkedFiles.length; i++) {
          const file = chunkedFiles[i];
          console.log(`📦 上传大文件 ${i + 1}/${chunkedFiles.length}:`, file.name);

          const result = await this.uploadChunked(file, {
            onProgress: (progress) => {
              const baseProgress = 60 + ((totalProgress + progress / 100) / totalFiles) * 30;
              onProgress?.(baseProgress);
            }
          });

          allResults.push(result);
          totalProgress++;
        }

        console.log('✅ 大文件上传完成');
      }

      await this.triggerWorkflow();
      onProgress?.(100);

      return {
        success: true,
        commitSha: null,
        files: allResults
      };

    } catch (error) {
      console.error('❌ 批量上传失败:', error);
      throw new Error(`批量上传失败: ${error.message}`);
    }
  },

  // ============================================
  // 智能上传入口
  // ============================================
  async uploadFiles(files, options = {}) {
    const fileArray = Array.isArray(files) ? files : [files];

    if (fileArray.length === 0) {
      throw new Error('没有文件需要上传');
    }

    const tooLarge = fileArray.filter(f => f.size > MAX_FILE_SIZE);
    if (tooLarge.length > 0) {
      const names = tooLarge.map(f => `${f.name} (${(f.size / 1024 / 1024 / 1024).toFixed(2)}GB)`).join(', ');
      throw new Error(`以下文件超过 2GB 限制：${names}`);
    }

    if (fileArray.length === 1) {
      console.log('📤 单文件上传模式');
      const result = await this.uploadSingleFile(fileArray[0], options);
      return {
        success: true,
        commitSha: result.commitSha,
        files: [result]
      };
    }

    console.log(`📦 批量上传模式 (${fileArray.length} 个文件)`);
    return await this.uploadMultipleFiles(fileArray, options);
  },

  // ============================================
  // 下载分块文件（使用 Blob API - 最稳定）
  // ============================================
  async downloadChunkedFile(chunkPaths, chunkSHAs, mimeType, originalName, onProgress = null) {
    try {
      console.log(`📥 开始下载分块文件: ${originalName} (${chunkPaths.length} 块)`);
      
      const chunks = [];
      
      // 🔥 优先使用 SHA 下载（如果有）
      const useSHA = chunkSHAs && chunkSHAs.length === chunkPaths.length;
      
      for (let i = 0; i < chunkPaths.length; i++) {
        const path = chunkPaths[i];
        console.log(`📥 下载分块 ${i + 1}/${chunkPaths.length}:`, path);
        
        try {
          let blobSHA = useSHA ? chunkSHAs[i] : null;
          
          // 如果没有 SHA，先获取文件信息
          if (!blobSHA) {
            console.log('🔍 获取文件 SHA...');
            const { data: fileInfo } = await octokit.repos.getContent({
              ...REPO_CONFIG,
              path,
              ref: 'main'
            });
            blobSHA = fileInfo.sha;
          }
          
          console.log(`🔑 使用 SHA: ${blobSHA.substring(0, 7)}...`);
          
          // 🔥 使用 Blob API 直接获取内容（通过 SHA）
          const { data: blobData } = await octokit.git.getBlob({
            ...REPO_CONFIG,
            file_sha: blobSHA
          });
          
          console.log(`📦 获取到 Blob:`, {
            encoding: blobData.encoding,
            size: blobData.size
          });
          
          if (!blobData.content) {
            throw new Error(`分块 ${path} 内容为空`);
          }
          
          // Base64 解码（清理所有空白字符）
          const cleanedContent = blobData.content.replace(/\s/g, '');
          const binaryString = atob(cleanedContent);
          const bytes = new Uint8Array(binaryString.length);
          
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j);
          }
          
          chunks.push(bytes);
          
          console.log(`✅ 分块 ${i + 1} 下载完成，大小: ${bytes.length} 字节`);
          
          const currentProgress = ((i + 1) / chunkPaths.length) * 100;
          onProgress?.(currentProgress);
          
        } catch (chunkError) {
          console.error(`❌ 下载分块 ${path} 失败:`, chunkError);
          throw new Error(`下载分块 ${i + 1} 失败: ${chunkError.message}`);
        }
      }
      
      // 合并分块
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      console.log(`📦 开始合并，总大小: ${totalSize} 字节`);
      
      const mergedArray = new Uint8Array(totalSize);
      let offset = 0;
      
      for (const chunk of chunks) {
        mergedArray.set(chunk, offset);
        offset += chunk.length;
      }
      
      const blob = new Blob([mergedArray], { type: mimeType });
      console.log(`✅ 分块文件合并完成，最终大小: ${blob.size} 字节`);
      
      return blob;
    } catch (error) {
      console.error('❌ 下载分块文件失败:', error);
      throw error;
    }
  },

  // ============================================
  // 删除文件（兼容分块）
  // ============================================
  async deleteFile(path, sha, isChunked = false, chunkPaths = []) {
    try {
      if (isChunked && chunkPaths.length > 0) {
        console.log(`🗑️ 删除分块文件 (${chunkPaths.length} 块)`);
        
        for (const chunkPath of chunkPaths) {
          try {
            const { data: fileData } = await octokit.repos.getContent({
              ...REPO_CONFIG,
              path: chunkPath
            });
            
            await octokit.repos.deleteFile({
              ...REPO_CONFIG,
              path: chunkPath,
              message: `Delete chunk: ${chunkPath}`,
              sha: fileData.sha
            });
            
            console.log(`✅ 已删除分块: ${chunkPath}`);
          } catch (error) {
            console.warn(`⚠️ 删除分块失败: ${chunkPath}`, error);
          }
        }
      } else {
        await octokit.repos.deleteFile({
          ...REPO_CONFIG,
          path,
          message: `Delete ${path}`,
          sha
        });
        console.log(`✅ 已删除文件: ${path}`);
      }
      
      await this.triggerWorkflow();
      
      return { success: true };
    } catch (error) {
      console.error('删除文件失败:', error);
      throw error;
    }
  },

  // ============================================
  // 触发 GitHub Actions Workflow
  // ============================================
  async triggerWorkflow() {
    try {
      await octokit.repos.createDispatchEvent({
        ...REPO_CONFIG,
        event_type: 'deploy-pages',
        client_payload: {
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('✅ 已触发 GitHub Pages 部署');
      return { success: true };
    } catch (error) {
      console.warn('⚠️ 触发部署失败，但文件已上传:', error.message);
      return { success: false, error: error.message };
    }
  },

  // ============================================
  // 获取 Workflow 运行状态
  // ============================================
  async getWorkflowRunStatus(commitSha) {
    try {
      const { data } = await octokit.actions.listWorkflowRunsForRepo({
        ...REPO_CONFIG,
        per_page: 5
      });

      const run = data.workflow_runs[0];
      
      if (!run) {
        return {
          status: 'pending',
          conclusion: null,
          url: null
        };
      }
      
      return {
        status: run.status,
        conclusion: run.conclusion,
        url: run.html_url,
        runId: run.id,
        createdAt: run.created_at,
        updatedAt: run.updated_at
      };

    } catch (error) {
      console.error('❌ 获取 workflow 状态失败:', error);
      return {
        status: 'unknown',
        conclusion: null,
        url: null,
        error: error.message
      };
    }
  },

  // ============================================
  // 轮询 Workflow 状态
  // ============================================
  async waitForDeployment(commitSha, onStatusChange = null) {
    const maxAttempts = 60;
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        attempts++;
        
        try {
          const status = await this.getWorkflowRunStatus(commitSha);
          
          console.log(`🔄 构建状态检查 (${attempts}/${maxAttempts}):`, status.status, status.conclusion);
          
          onStatusChange?.(status);

          if (status.status === 'completed') {
            if (status.conclusion === 'success') {
              console.log('✅ 部署成功！');
              resolve(status);
            } else {
              console.log('❌ 部署失败:', status.conclusion);
              reject(new Error(`部署失败: ${status.conclusion}`));
            }
            return;
          }

          if (attempts >= maxAttempts) {
            console.log('⏰ 等待超时');
            resolve({
              ...status,
              timeout: true
            });
            return;
          }

          setTimeout(checkStatus, 5000);

        } catch (error) {
          console.error('❌ 检查状态失败:', error);
          reject(error);
        }
      };

      setTimeout(checkStatus, 10000);
    });
  },

  // ============================================
  // 生成 CDN 链接
  // ============================================
  getCDNUrl(path) {
    const customDomain = import.meta.env.VITE_CDN_DOMAIN;
    
    if (customDomain) {
      return `https://${customDomain}/${path}`;
    } else {
      return `https://cdn.jsdelivr.net/gh/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}@main/${path}`;
    }
  },

  // ============================================
  // 测试连接
  // ============================================
  async testConnection() {
    try {
      const { data } = await octokit.repos.get({
        ...REPO_CONFIG
      });
      console.log('✅ GitHub 连接成功:', data.full_name);
      return {
        success: true,
        repo: data.full_name,
        size: data.size,
        private: data.private
      };
    } catch (error) {
      console.error('❌ GitHub 连接失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
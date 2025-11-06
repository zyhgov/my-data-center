import { githubService } from './github';
import { r2Service } from './r2';

export const storageService = {
  /**
   * 总上传入口
   */
  async uploadFiles(files, target, options) {
    console.log(`🚀 开始上传到: ${target}`);
    
    if (target === 'r2') {
      // R2 逐个上传
      const results = [];
      const totalFiles = files.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const result = await r2Service.uploadFile(file, {
          ...options,
          onProgress: (progress) => {
            const overallProgress = ((i + progress / 100) / totalFiles) * 100;
            options.onProgress?.(overallProgress);
          },
        });
        results.push(result);
      }
      
      return { success: true, files: results };
    } else {
      // GitHub 保持原有逻辑
      return await githubService.uploadFiles(files, options);
    }
  },

  /**
   * 总删除入口
   */
  async deleteFile(file) {
    console.log(`🗑️ 从 ${file.storage_type} 删除:`, file.file_path);
    
    if (file.storage_type === 'r2') {
      return await r2Service.deleteFile(file.file_path);
    } else {
      // GitHub 删除逻辑
      return await githubService.deleteFile(
        file.file_path,
        file.github_sha,
        file.is_chunked,
        file.chunk_paths
      );
    }
  },
};
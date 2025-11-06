import { db } from './supabase';
import { githubService } from './github';

export const cleanupService = {
  // 检查并删除过期文件
  async checkAndDeleteExpiredFiles() {
    try {
      // 获取所有过期的文件
      const allFiles = await db.getFiles({ limit: 10000 });
      const expiredFiles = allFiles.filter(file => {
        if (!file.expire_at) return false;
        return new Date(file.expire_at) <= new Date();
      });

      if (expiredFiles.length === 0) {
        console.log('✅ 没有过期文件');
        return { deleted: 0 };
      }

      console.log(`🗑️ 发现 ${expiredFiles.length} 个过期文件，开始清理...`);

      let successCount = 0;
      let failCount = 0;

      for (const file of expiredFiles) {
        try {
          // 从 GitHub 删除
          await githubService.deleteFile(file.file_path, file.github_sha);
          
          // 从数据库删除
          await db.deleteFile(file.id);
          
          successCount++;
          console.log(`✅ 已删除过期文件: ${file.original_name}`);
        } catch (error) {
          failCount++;
          console.error(`❌ 删除失败: ${file.original_name}`, error);
        }
      }

      console.log(`🎉 清理完成: 成功 ${successCount} 个，失败 ${failCount} 个`);

      return {
        deleted: successCount,
        failed: failCount,
        total: expiredFiles.length
      };
    } catch (error) {
      console.error('❌ 清理过期文件失败:', error);
      throw error;
    }
  },

  // 启动自动清理定时器（每小时检查一次）
  startAutoCleanup() {
    // 立即执行一次
    this.checkAndDeleteExpiredFiles();

    // 每小时执行一次
    const interval = setInterval(() => {
      this.checkAndDeleteExpiredFiles();
    }, 3600000); // 1小时 = 3600000毫秒

    // 返回清理函数
    return () => clearInterval(interval);
  }
};
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateFileName, getFolderByType } from '../utils/fileHelper';

const R2_CONFIG = {
  accountId: import.meta.env.VITE_R2_ACCOUNT_ID,
  accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
  secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  bucket: import.meta.env.VITE_R2_BUCKET_NAME,
  publicDomain: import.meta.env.VITE_R2_PUBLIC_DOMAIN,
};

// 初始化 S3 客户端
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

export const r2Service = {
  
  /**
   * 上传文件到 R2
   */
  async uploadFile(file, options = {}) {
    try {
      const { onProgress = null } = options;
      
      const folder = getFolderByType(file.type, file.name);
      const filename = generateFileName(file.name);
      const path = `${folder}/${filename}`;

      console.log('📦 R2: 准备上传', path);
      onProgress?.(10);

      // 1. 获取预签名 URL
      const command = new PutObjectCommand({
        Bucket: R2_CONFIG.bucket,
        Key: path,
        ContentType: file.type,
      });
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL 1小时内有效
      console.log('🔑 R2: 获取到预签名 URL');
      onProgress?.(30);

      // 2. 使用 fetch 直接上传文件到预签名 URL
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`);
      }

      console.log('✅ R2: 上传成功');
      onProgress?.(100);

      const cdnUrl = `https://${R2_CONFIG.publicDomain}/${path}`;

      return {
        success: true,
        storageType: 'r2',
        originalName: file.name,
        originalFile: file,
        path: path,
        sha: 'r2-file', // R2 没有 SHA
        githubUrl: cdnUrl, // GitHub URL 也用 CDN URL
        cdnUrl: cdnUrl,
        isChunked: false, // R2 直接上传，无需分块
      };

    } catch (error) {
      console.error('❌ R2 上传失败:', error);
      throw error;
    }
  },

  /**
   * 从 R2 删除文件
   */
  async deleteFile(path) {
    try {
      console.log('🗑️ R2: 准备删除', path);
      
      const command = new DeleteObjectCommand({
        Bucket: R2_CONFIG.bucket,
        Key: path,
      });

      await s3.send(command);
      console.log('✅ R2: 删除成功');

      return { success: true };
    } catch (error) {
      console.error('❌ R2 删除失败:', error);
      throw error;
    }
  },
};
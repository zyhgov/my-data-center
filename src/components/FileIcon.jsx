import { 
  Image, Video, Music, FileText, Archive, 
  File, FileSpreadsheet, Server // 导入 Server 图标
} from 'lucide-react';

export default function FileIcon({ file, size = 'md', showThumbnail = true }) {
  const sizeMap = {
    sm: { icon: 16, container: 'w-8 h-8' },
    md: { icon: 24, container: 'w-12 h-12' },
    lg: { icon: 40, container: 'w-20 h-20' },
    xl: { icon: 48, container: 'w-24 h-24' }
  };

  const config = sizeMap[size];

  // R2 上的图片
  if (file.storage_type === 'r2' && file.file_type === 'image' && file.cdn_url && showThumbnail) {
    return (
      <div className={`${config.container} rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 shadow-sm`}>
        <img
          src={file.cdn_url}
          alt={file.original_name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  // GitHub 上的图片
  if (file.storage_type !== 'r2' && file.file_type === 'image' && file.cdn_url && showThumbnail) {
    return (
      <div className={`${config.container} rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 shadow-sm`}>
        <img
          src={file.cdn_url}
          alt={file.original_name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  // 其他类型：显示图标
  const getIcon = () => {
    const iconProps = { size: config.icon };
    
    // 如果是 R2 上的文件，但不是图片，统一显示 Server 图标
    if (file.storage_type === 'r2') {
      return <Server {...iconProps} className="text-orange-500" />;
    }
    
    switch (file.file_type) {
      case 'image':
        return <Image {...iconProps} className="text-blue-500" />;
      
      case 'video':
        return <Video {...iconProps} className="text-purple-500" />;
      
      case 'audio':
        return <Music {...iconProps} className="text-green-500" />;
      
      case 'document':
        if (file.mime_type?.includes('pdf')) {
          return <FileText {...iconProps} className="text-red-500" />;
        }
        if (file.mime_type?.includes('word')) {
          return <FileText {...iconProps} className="text-blue-600" />;
        }
        if (file.mime_type?.includes('excel') || file.mime_type?.includes('spreadsheet')) {
          return <FileSpreadsheet {...iconProps} className="text-green-600" />;
        }
        return <FileText {...iconProps} className="text-orange-500" />;
      
      case 'archive':
        return <Archive {...iconProps} className="text-yellow-600" />;
      
      default:
        return <File {...iconProps} className="text-gray-500" />;
    }
  };

  return (
    <div className={`${config.container} rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm`}>
      {getIcon()}
    </div>
  );
}
import { Image, Video, Music, FileText, Archive, Folder } from 'lucide-react';

const TYPE_OPTIONS = [
  { key: 'all', label: '全部分类', icon: Folder, color: 'bg-gray-100 text-gray-700' },
  { key: 'image', label: '图片', icon: Image, color: 'bg-blue-100 text-blue-700' },
  { key: 'video', label: '视频', icon: Video, color: 'bg-purple-100 text-purple-700' },
  { key: 'audio', label: '音频', icon: Music, color: 'bg-green-100 text-green-700' },
  { key: 'document', label: '文档', icon: FileText, color: 'bg-orange-100 text-orange-700' },
  { key: 'archive', label: '压缩包', icon: Archive, color: 'bg-yellow-100 text-yellow-700' }
];

export default function FolderTypeSelector({ selectedType, onSelect, disabled = false }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">
        文件夹分类
      </label>
      <div className="grid grid-cols-2 gap-2">
        {TYPE_OPTIONS.map(type => {
          const Icon = type.icon;
          const isSelected = selectedType === type.key;
          
          return (
            <button
              key={type.key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(type.key)}
              className={`flex items-center gap-2 p-3 border-2 rounded-lg transition ${
                isSelected
                  ? `${type.color} border-current`
                  : 'bg-white border-gray-200 hover:border-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Icon size={18} />
              <span className="font-medium text-sm">{type.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        选择"全部分类"后，文件夹会在所有分类中显示
      </p>
    </div>
  );
}

// 导出工具函数
export function getFolderTypeLabel(type) {
  const option = TYPE_OPTIONS.find(t => t.key === type);
  return option?.label || '全部分类';
}

export function getFolderTypeColor(type) {
  const option = TYPE_OPTIONS.find(t => t.key === type);
  return option?.color || 'bg-gray-100 text-gray-700';
}

export { TYPE_OPTIONS };
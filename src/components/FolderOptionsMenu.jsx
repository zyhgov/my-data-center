import { useState } from 'react';
import { Edit2, Trash2, Move, MoreVertical, Tag } from 'lucide-react';

export default function FolderOptionsMenu({ folder, onRename, onDelete, onMove, onChangeType }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="p-2 hover:bg-gray-200 rounded-button transition"
      >
        <MoreVertical size={18} />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          
          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onChangeType?.(folder);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
            >
              <Tag size={16} />
              <span className="text-sm">修改分类</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onRename?.(folder);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
            >
              <Edit2 size={16} />
              <span className="text-sm">重命名</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onMove?.(folder);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
            >
              <Move size={16} />
              <span className="text-sm">移动</span>
            </button>

            <div className="border-t border-gray-200" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onDelete?.(folder);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 text-left"
            >
              <Trash2 size={16} />
              <span className="text-sm">删除</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
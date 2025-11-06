import { useState, useEffect } from 'react';
import { X, Copy, CheckCircle, Calendar, Globe, Lock, Clock, Eye, AlertTriangle, HardDrive, Move } from 'lucide-react';
import { db } from '../services/supabase';
import { formatFileSize } from '../utils/fileHelper';

export default function FileSettingsModal({ file, onClose, onUpdate, onMove }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    original_name: '',
    is_public: false,
    expire_type: 'never',
    expire_date: '',
    expire_time: '',
    expire_days: '',
    expire_hours: '',
    expire_minutes: ''
  });

  useEffect(() => {
    if (file) {
      let expireType = 'never';
      let expireDate = '';
      let expireTime = '';
      
      if (file.expire_at) {
        expireType = 'date';
        const date = new Date(file.expire_at);
        expireDate = date.toISOString().split('T')[0];
        expireTime = date.toTimeString().substring(0, 5);
      }
      
      setFormData({
        original_name: file.original_name,
        is_public: file.is_public,
        expire_type: expireType,
        expire_date: expireDate,
        expire_time: expireTime,
        expire_days: '',
        expire_hours: '',
        expire_minutes: ''
      });
    }
  }, [file]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      let expireAt = null;
      
      if (formData.expire_type === 'date' && formData.expire_date) {
        const dateTimeStr = formData.expire_time 
          ? `${formData.expire_date}T${formData.expire_time}:00`
          : `${formData.expire_date}T23:59:59`;
        expireAt = new Date(dateTimeStr);
      } else if (formData.expire_type === 'duration') {
        expireAt = new Date();
        const days = parseInt(formData.expire_days) || 0;
        const hours = parseInt(formData.expire_hours) || 0;
        const minutes = parseInt(formData.expire_minutes) || 0;
        
        const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;
        expireAt.setMinutes(expireAt.getMinutes() + totalMinutes);
      }

      const updated = await db.updateFile(file.id, {
        original_name: formData.original_name,
        is_public: formData.is_public,
        expire_at: expireAt ? expireAt.toISOString() : null
      });

      onUpdate?.(updated);
      onClose();
    } catch (error) {
      console.error('更新失败:', error);
      alert('更新失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function setQuickDuration(days = 0, hours = 0, minutes = 0) {
    setFormData({
      ...formData,
      expire_type: 'duration',
      expire_days: days.toString(),
      expire_hours: hours.toString(),
      expire_minutes: minutes.toString()
    });
  }

  if (!file) return null;

  const shortUrl = `${window.location.origin}/s/${file.short_code}`;
  const isExpired = file.expire_at && new Date(file.expire_at) <= new Date();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-card max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">文件设置</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-button transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {isExpired && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-orange-800">
                  <p className="font-semibold mb-1">文件已过期</p>
                  <p>
                    该文件已于 {new Date(file.expire_at).toLocaleString('zh-CN')} 过期，
                    在公开页面不可见。请重新设置有效期以恢复访问。
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            {file.file_type === 'image' && file.cdn_url && !file.is_chunked ? (
              <img
                src={file.cdn_url}
                alt={file.original_name}
                className="w-20 h-20 object-cover rounded-lg"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold">{file.original_name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(file.file_size)}</p>
              <p className="text-xs text-gray-400 mt-1">
                上传于 {new Date(file.created_at).toLocaleString('zh-CN')}
              </p>
              {file.is_chunked && (
                <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  <HardDrive size={12} />
                  <span>分块文件 ({file.chunk_count} 块)</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              文件名
            </label>
            <input
              type="text"
              className="input w-full"
              value={formData.original_name}
              onChange={(e) => setFormData({ ...formData, original_name: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">
              移动文件
            </label>
            <button
              type="button"
              onClick={() => {
                onClose(); // 先关闭当前弹窗
                onMove?.([file]); // 再打开移动弹窗
              }}
              className="w-full flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <Move size={16} />
              移动到其他文件夹
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3">
              访问权限
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="is_public"
                  checked={!formData.is_public}
                  onChange={() => setFormData({ ...formData, is_public: false })}
                  className="w-4 h-4 text-accent"
                />
                <Lock className="text-gray-400" size={20} />
                <div className="flex-1">
                  <p className="font-semibold">私有</p>
                  <p className="text-sm text-gray-500">只有你可以访问</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="is_public"
                  checked={formData.is_public}
                  onChange={() => setFormData({ ...formData, is_public: true })}
                  className="w-4 h-4 text-accent"
                />
                <Globe className="text-green-500" size={20} />
                <div className="flex-1">
                  <p className="font-semibold">公开</p>
                  <p className="text-sm text-gray-500">任何人都可以访问和下载</p>
                </div>
              </label>
            </div>
          </div>

          {file.is_chunked && (
            <div>
              <label className="block text-sm font-semibold mb-3">
                <Eye className="inline mr-2" size={16} />
                预览设置
              </label>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-2">分块文件无法直接预览</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>该文件使用分块存储</li>
                      <li>需要下载后自动合并才能查看</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-3">
              <Calendar className="inline mr-2" size={16} />
              有效期设置
            </label>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={formData.expire_type === 'never'}
                  onChange={() => setFormData({ ...formData, expire_type: 'never' })}
                  className="w-4 h-4"
                />
                <span className="font-medium">永久有效</span>
              </label>

              <div className="border rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.expire_type === 'date'}
                    onChange={() => setFormData({ ...formData, expire_type: 'date' })}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">指定日期和时间</span>
                </label>
                
                {formData.expire_type === 'date' && (
                  <div className="mt-3 ml-7 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">日期</label>
                        <input
                          type="date"
                          className="input w-full"
                          value={formData.expire_date}
                          onChange={(e) => setFormData({ ...formData, expire_date: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">时间</label>
                        <input
                          type="time"
                          className="input w-full"
                          value={formData.expire_time}
                          onChange={(e) => setFormData({ ...formData, expire_time: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.expire_type === 'duration'}
                    onChange={() => setFormData({ ...formData, expire_type: 'duration' })}
                    className="w-4 h-4"
                  />
                  <Clock size={16} />
                  <span className="font-medium">相对时长（从现在开始）</span>
                </label>
                
                {formData.expire_type === 'duration' && (
                  <div className="mt-3 ml-7 space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickDuration(1, 0, 0)}
                        className="px-3 py-2 text-sm border rounded-button hover:bg-gray-50"
                      >
                        1天
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDuration(7, 0, 0)}
                        className="px-3 py-2 text-sm border rounded-button hover:bg-gray-50"
                      >
                        7天
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDuration(30, 0, 0)}
                        className="px-3 py-2 text-sm border rounded-button hover:bg-gray-50"
                      >
                        30天
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDuration(0, 1, 0)}
                        className="px-3 py-2 text-sm border rounded-button hover:bg-gray-50"
                      >
                        1小时
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">天</label>
                        <input
                          type="number"
                          min="0"
                          className="input w-full"
                          placeholder="0"
                          value={formData.expire_days}
                          onChange={(e) => setFormData({ ...formData, expire_days: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">小时</label>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          className="input w-full"
                          placeholder="0"
                          value={formData.expire_hours}
                          onChange={(e) => setFormData({ ...formData, expire_hours: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">分钟</label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          className="input w-full"
                          placeholder="0"
                          value={formData.expire_minutes}
                          onChange={(e) => setFormData({ ...formData, expire_minutes: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    {(formData.expire_days || formData.expire_hours || formData.expire_minutes) && (
                      <p className="text-sm text-gray-600">
                        将于 {(() => {
                          const expireDate = new Date();
                          const days = parseInt(formData.expire_days) || 0;
                          const hours = parseInt(formData.expire_hours) || 0;
                          const minutes = parseInt(formData.expire_minutes) || 0;
                          expireDate.setMinutes(expireDate.getMinutes() + (days * 24 * 60) + (hours * 60) + minutes);
                          return expireDate.toLocaleString('zh-CN');
                        })()} 过期
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              访问链接
            </label>
            <div className="space-y-2">
              {!file.is_chunked && file.cdn_url && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={file.cdn_url}
                    className="input flex-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(file.cdn_url)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-button transition flex items-center gap-2"
                  >
                    {copied ? <CheckCircle size={16} className="text-green-600" /> : <Copy size={16} />}
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
              )}

              {file.is_chunked && file.github_url && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={file.github_url}
                    className="input flex-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(file.github_url)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-button transition flex items-center gap-2"
                  >
                    {copied ? <CheckCircle size={16} className="text-green-600" /> : <Copy size={16} />}
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shortUrl}
                  className="input flex-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(shortUrl)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-button transition"
                >
                  短链
                </button>
              </div>
            </div>
            
            {file.is_chunked && (
              <p className="text-xs text-gray-500 mt-2">
                💡 分块文件通过下载按钮会自动合并，无法通过链接直接访问
              </p>
            )}
          </div>
        </form>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-button hover:bg-gray-100 transition"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 btn-primary py-3 disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  BarChart, PieChart, TrendingUp, Database, HardDrive, 
  Image, Video, Music, FileText, Archive, RefreshCw, 
  Calendar, Filter, Download, Eye, Github, Server, AlertCircle, Clock, Link2
} from 'lucide-react';
import { db } from '../services/supabase';
import { formatFileSize } from '../utils/fileHelper';

// 中文映射
const TYPE_MAP_CN = {
  image: '图片',
  video: '视频',
  audio: '音频',
  document: '文档',
  archive: '压缩包',
  code: '代码',
  other: '其他'
};

// 卡片组件
const StatCard = ({ icon, label, value, color, children }) => (
  <div className={`card ${color}`}>
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-white/20`}>
          {icon}
        </div>
        <div>
          <p className="text-sm opacity-80 mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
      {children}
    </div>
  </div>
);

export default function Settings() {
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    publicFiles: 0,
    byType: {},
    byDate: [],
    byStorage: { github: 0, r2: 0, githubSize: 0, r2Size: 0 },
    byStorageAndDate: [],
    averageSizeByType: {},
    recentUploads: [],
    topLargestFiles: [],
    averageSize: 0,
    expiredFiles: 0,
    chunkedFiles: 0,
    shortLinks: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [chartType, setChartType] = useState('bar');

  useEffect(() => {
    loadStatistics();
  }, [timeRange]);

  async function getAllFoldersRecursive(parentId = null) {
    const folders = await db.getFolders(parentId);
    let allFolders = [...folders];
    for (const folder of folders) {
      allFolders = allFolders.concat(await getAllFoldersRecursive(folder.id));
    }
    return allFolders;
  }

  async function getAllFilesRecursive() {
    try {
      const allFolders = await getAllFoldersRecursive(null);
      const folderIds = [null, ...allFolders.map(f => f.id)];
      const allFiles = [];
      for (const folderId of folderIds) {
        allFiles.push(...await db.getFiles({ folderId, limit: 10000, includeExpired: true }));
      }
      return Array.from(new Map(allFiles.map(file => [file.id, file])).values());
    } catch (error) {
      console.error('递归获取所有文件失败:', error);
      return [];
    }
  }

  async function loadStatistics() {
    try {
      setLoading(true);
      const allFiles = await getAllFilesRecursive();
      
      let filteredFiles = allFiles;
      if (timeRange !== 'all') {
        const days = parseInt(timeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        filteredFiles = allFiles.filter(file => new Date(file.created_at) >= cutoffDate);
      }

      const totalFiles = filteredFiles.length;
      const totalSize = filteredFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);
      const publicFiles = filteredFiles.filter(f => f.is_public).length;
      const averageSize = totalFiles > 0 ? totalSize / totalFiles : 0;
      const expiredFiles = filteredFiles.filter(f => f.expire_at && new Date(f.expire_at) <= new Date()).length;
      const chunkedFiles = filteredFiles.filter(f => f.is_chunked).length;
      const shortLinks = filteredFiles.filter(f => f.short_code).length;

      const byType = filteredFiles.reduce((acc, file) => {
        const type = TYPE_MAP_CN[file.file_type] || '其他';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const byStorage = filteredFiles.reduce((acc, file) => {
        const storage = file.storage_type === 'r2' ? 'r2' : 'github';
        acc[storage]++;
        acc[`${storage}Size`] += file.file_size || 0;
        return acc;
      }, { github: 0, r2: 0, githubSize: 0, r2Size: 0 });

      const averageSizeByType = Object.entries(filteredFiles.reduce((acc, file) => {
        const type = TYPE_MAP_CN[file.file_type] || '其他';
        if (!acc[type]) acc[type] = { totalSize: 0, count: 0 };
        acc[type].totalSize += file.file_size || 0;
        acc[type].count++;
        return acc;
      }, {})).reduce((acc, [type, { totalSize, count }]) => {
        acc[type] = count > 0 ? totalSize / count : 0;
        return acc;
      }, {});

      const daysCount = timeRange === 'all' ? 30 : parseInt(timeRange);
      const dateMap = {};
      const now = new Date();
      for (let i = daysCount - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dateMap[date.toISOString().split('T')[0]] = { count: 0, size: 0, githubCount: 0, githubSize: 0, r2Count: 0, r2Size: 0 };
      }

      filteredFiles.forEach(file => {
        const dateStr = new Date(file.created_at).toISOString().split('T')[0];
        if (dateMap[dateStr]) {
          dateMap[dateStr].count++;
          dateMap[dateStr].size += file.file_size || 0;
          if (file.storage_type === 'r2') {
            dateMap[dateStr].r2Count++;
            dateMap[dateStr].r2Size += file.file_size || 0;
          } else {
            dateMap[dateStr].githubCount++;
            dateMap[dateStr].githubSize += file.file_size || 0;
          }
        }
      });
      
      const byDate = Object.entries(dateMap).map(([date, values]) => ({ date, ...values }));
      const byStorageAndDate = Object.entries(dateMap).map(([date, values]) => ({ date, ...values }));

      const recentUploads = allFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
      const topLargestFiles = allFiles.sort((a, b) => (b.file_size || 0) - (a.file_size || 0)).slice(0, 10);

      setStats({
        totalFiles, totalSize, publicFiles, byType, byDate, byStorage, 
        byStorageAndDate, recentUploads, topLargestFiles, averageSize, expiredFiles,
        averageSizeByType, chunkedFiles, shortLinks
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  function exportStatistics() {
    const data = {
      exportTime: new Date().toISOString(),
      timeRange: timeRange === 'all' ? '全部' : `最近${timeRange}天`,
      statistics: stats
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const chartStyle = { height: '400px', width: '100%' };

  // 图表配置
  const typeChartOption = {
    title: { text: '文件类型分布 (按数量)', left: 'center', textStyle: { fontSize: 16, fontWeight: 'bold' } },
    tooltip: { trigger: 'item' },
    legend: { bottom: 10, left: 'center' },
    series: [{
      type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
      labelLine: { show: false },
      data: Object.entries(stats.byType).map(([name, value]) => ({ name, value })).filter(item => item.value > 0)
    }],
    color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#eab308', '#6b7280', '#ef4444']
  };

  const uploadTrendOption = {
    title: { text: '每日上传趋势', left: 'center', textStyle: { fontSize: 16, fontWeight: 'bold' } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: stats.byDate.map(d => d.date.substring(5)) },
    yAxis: [{ type: 'value', name: '文件数' }, { type: 'value', name: '大小 (MB)', axisLabel: { formatter: value => (value / 1024 / 1024).toFixed(1) } }],
    dataZoom: [{ type: 'slider', start: 0, end: 100, height: 20, bottom: 5 }],
    series: [
      { name: '文件数', type: chartType, data: stats.byDate.map(d => d.count), smooth: chartType === 'line' },
      { name: '大小', type: 'line', yAxisIndex: 1, data: stats.byDate.map(d => d.size), smooth: true, lineStyle: { type: 'dashed' } }
    ],
    color: ['#0071e3', '#8b5cf6']
  };

  const storageTrendOption = {
    title: { text: '存储目标每日上传趋势', left: 'center', textStyle: { fontSize: 16, fontWeight: 'bold' } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 30 },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: stats.byStorageAndDate.map(d => d.date.substring(5)) },
    yAxis: [{ type: 'value', name: '文件数' }, { type: 'value', name: '大小 (MB)', axisLabel: { formatter: value => (value / 1024 / 1024).toFixed(1) } }],
    dataZoom: [{ type: 'slider', start: 0, end: 100, height: 20, bottom: 5 }],
    series: [
      { name: 'GitHub 文件数', type: 'bar', stack: '文件数', emphasis: { focus: 'series' }, data: stats.byStorageAndDate.map(d => d.githubCount) },
      { name: 'Cloudflare R2 文件数', type: 'bar', stack: '文件数', emphasis: { focus: 'series' }, data: stats.byStorageAndDate.map(d => d.r2Count) },
      { name: 'GitHub 大小', type: 'line', yAxisIndex: 1, smooth: true, lineStyle: { type: 'dashed' }, data: stats.byStorageAndDate.map(d => d.githubSize) },
      { name: 'Cloudflare R2 大小', type: 'line', yAxisIndex: 1, smooth: true, lineStyle: { type: 'dashed' }, data: stats.byStorageAndDate.map(d => d.r2Size) }
    ],
    color: ['#24292f', '#f38020', '#24292f', '#f38020']
  };

  const avgSizeByTypeOption = {
    title: { text: '各类型平均文件大小', left: 'center', textStyle: { fontSize: 16, fontWeight: 'bold' } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: params => `${params[0].name}<br/>平均大小: ${formatFileSize(params[0].value)}` },
    grid: { containLabel: true },
    xAxis: { type: 'category', data: Object.keys(stats.averageSizeByType), axisLabel: { interval: 0, rotate: 30 } },
    yAxis: { type: 'value', axisLabel: { formatter: value => formatFileSize(value) } },
    series: [{ type: 'bar', data: Object.values(stats.averageSizeByType) }],
    color: ['#10b981']
  };

  const publicPrivateOption = {
    title: { text: '文件状态分布', left: 'center', textStyle: { fontSize: 16, fontWeight: 'bold' } },
    tooltip: { trigger: 'item' },
    legend: { top: 'bottom' },
    series: [{
      type: 'pie', radius: '50%',
      data: [
        { value: stats.publicFiles, name: '公开文件' },
        { value: stats.totalFiles - stats.publicFiles - stats.expiredFiles, name: '私有文件' },
        { value: stats.expiredFiles, name: '已过期文件' },
      ],
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
    }],
    color: ['#34d399', '#6b7280', '#f97316']
  };
  
  const chunkedFileOption = {
    title: { text: '分块文件分析', left: 'center', textStyle: { fontSize: 16, fontWeight: 'bold' } },
    tooltip: { trigger: 'item' },
    legend: { top: 'bottom' },
    series: [{
      type: 'pie', radius: '50%',
      data: [
        { value: stats.chunkedFiles, name: '分块文件' },
        { value: stats.totalFiles - stats.chunkedFiles, name: '普通文件' },
      ],
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
    }],
    color: ['#8b5cf6', '#a1a1aa']
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">正在加载统计数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">数据统计中心</h2>
            <p className="text-sm text-gray-600">统计所有文件夹（包括子文件夹）的数据</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="text-gray-600" size={20} />
              <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="input px-3 py-2">
                <option value="7">最近7天</option>
                <option value="30">最近30天</option>
                <option value="90">最近90天</option>
                <option value="all">全部时间</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
              <button onClick={() => setChartType('bar')} className={`px-3 py-1 rounded transition ${chartType === 'bar' ? 'bg-accent text-white' : 'text-gray-600 hover:bg-gray-100'}`}>柱状图</button>
              <button onClick={() => setChartType('line')} className={`px-3 py-1 rounded transition ${chartType === 'line' ? 'bg-accent text-white' : 'text-gray-600 hover:bg-gray-100'}`}>折线图</button>
            </div>
            <button onClick={loadStatistics} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"><RefreshCw size={18} />刷新</button>
            <button onClick={exportStatistics} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-blue-700 transition"><Download size={18} />导出数据</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Database className="text-white" size={24} />} label="总文件数" value={stats.totalFiles} color="bg-blue-500 text-white" />
        <StatCard icon={<HardDrive className="text-white" size={24} />} label="总大小" value={formatFileSize(stats.totalSize)} color="bg-purple-500 text-white" />
        <StatCard icon={<Eye className="text-white" size={24} />} label="公开文件" value={stats.publicFiles} color="bg-green-500 text-white" />
        <StatCard icon={<AlertCircle className="text-white" size={24} />} label="过期文件" value={stats.expiredFiles} color="bg-orange-500 text-white" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <ReactECharts option={typeChartOption} style={chartStyle} opts={{ renderer: 'svg' }} />
        </div>
        <div className="card">
          <ReactECharts option={publicPrivateOption} style={chartStyle} opts={{ renderer: 'svg' }} />
        </div>
        <div className="card">
          <ReactECharts option={chunkedFileOption} style={chartStyle} opts={{ renderer: 'svg' }} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card flex flex-col justify-center">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><PieChart className="text-accent" size={20} />存储目标分布</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 text-center">
              <Github size={24} className="mx-auto mb-2 text-gray-800" />
              <p className="text-sm text-gray-600">GitHub</p>
              <p className="text-xl font-bold">{stats.byStorage.github} 文件</p>
              <p className="text-xs text-gray-500">{formatFileSize(stats.byStorage.githubSize)}</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 text-center">
              <Server size={24} className="mx-auto mb-2 text-orange-600" />
              <p className="text-sm text-orange-800">Cloudflare R2</p>
              <p className="text-xl font-bold">{stats.byStorage.r2} 文件</p>
              <p className="text-xs text-orange-700">{formatFileSize(stats.byStorage.r2Size)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <ReactECharts option={avgSizeByTypeOption} style={chartStyle} opts={{ renderer: 'svg' }} />
        </div>
      </div>

      <div className="card">
        <ReactECharts option={storageTrendOption} style={chartStyle} opts={{ renderer: 'svg' }} />
      </div>
      
      <div className="card">
        <ReactECharts option={uploadTrendOption} style={chartStyle} opts={{ renderer: 'svg' }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp className="text-accent" size={20} />最近上传</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stats.recentUploads.map(file => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{file.original_name}</p>
                  <p className="text-sm text-gray-500">{new Date(file.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-medium">{formatFileSize(file.file_size)}</p>
                  <span className={`flex items-center justify-end gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${file.storage_type === 'r2' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                    {file.storage_type === 'r2' ? <Server size={14} /> : <Github size={14} />}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><HardDrive className="text-accent" size={20} />最大文件 Top 10</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stats.topLargestFiles.map((file, index) => (
              <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">{index + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{file.original_name}</p>
                  <p className="text-xs text-gray-500">{TYPE_MAP_CN[file.file_type] || '其他'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-accent">{formatFileSize(file.file_size)}</p>
                  <p className="text-xs text-gray-500">{new Date(file.created_at).toLocaleDateString('zh-CN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
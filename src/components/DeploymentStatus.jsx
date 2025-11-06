import { useEffect, useState } from 'react';
import { Loader, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { githubService } from '../services/github';

export default function DeploymentStatus({ commitSha, onComplete }) {
  const [status, setStatus] = useState({
    status: 'pending',
    conclusion: null,
    url: null
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!commitSha) return;

    let cancelled = false;

    // 开始监控部署
    githubService.waitForDeployment(
      commitSha,
      (newStatus) => {
        if (!cancelled) {
          setStatus(newStatus);
        }
      }
    ).then((finalStatus) => {
      if (!cancelled) {
        setStatus(finalStatus);
        onComplete?.(finalStatus);
      }
    }).catch((error) => {
      if (!cancelled) {
        console.error('部署监控失败:', error);
        setStatus({
          status: 'error',
          conclusion: 'failure',
          error: error.message
        });
      }
    });

    // 计时器
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [commitSha, onComplete]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusDisplay = () => {
    switch (status.status) {
      case 'pending':
      case 'queued':
        return {
          icon: <Clock className="text-blue-500 animate-pulse" size={20} />,
          text: '等待构建队列...',
          color: 'bg-blue-50 border-blue-200 text-blue-800'
        };
      
      case 'in_progress':
        return {
          icon: <Loader className="text-blue-500 animate-spin" size={20} />,
          text: '正在部署到 CDN...',
          color: 'bg-blue-50 border-blue-200 text-blue-800'
        };
      
      case 'completed':
        if (status.conclusion === 'success') {
          return {
            icon: <CheckCircle className="text-green-500" size={20} />,
            text: '部署成功！文件已可访问',
            color: 'bg-green-50 border-green-200 text-green-800'
          };
        } else {
          return {
            icon: <XCircle className="text-red-500" size={20} />,
            text: `部署失败: ${status.conclusion}`,
            color: 'bg-red-50 border-red-200 text-red-800'
          };
        }
      
      case 'error':
        return {
          icon: <XCircle className="text-red-500" size={20} />,
          text: '获取状态失败',
          color: 'bg-red-50 border-red-200 text-red-800'
        };
      
      default:
        return {
          icon: <Loader className="text-gray-500 animate-spin" size={20} />,
          text: '检查中...',
          color: 'bg-gray-50 border-gray-200 text-gray-800'
        };
    }
  };

  const display = getStatusDisplay();

  return (
    <div className={`border rounded-lg p-4 ${display.color} transition-all`}>
      <div className="flex items-center gap-3">
        {display.icon}
        <div className="flex-1">
          <p className="font-semibold">{display.text}</p>
          <p className="text-sm opacity-75 mt-1">
            已用时: {formatTime(elapsedTime)}
          </p>
        </div>

        {status.url && (
          <a
            href={status.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-white hover:bg-opacity-50 rounded-button transition"
            title="查看构建详情"
          >
            <ExternalLink size={18} />
          </a>
        )}
      </div>

      {/* 详细信息 */}
      {status.status === 'in_progress' && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm underline opacity-75 hover:opacity-100"
          >
            {showDetails ? '隐藏详情' : '查看详情'}
          </button>
          
          {showDetails && (
            <div className="mt-2 text-xs space-y-1 opacity-75">
              <p>• Commit: {commitSha?.substring(0, 7)}</p>
              <p>• GitHub Actions 正在构建 GitHub Pages</p>
              <p>• 预计需要 1-3 分钟</p>
              <p>• 完成后文件将通过 CDN 访问</p>
            </div>
          )}
        </div>
      )}

      {/* 超时提示 */}
      {status.timeout && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <p className="text-sm opacity-75">
            ⚠️ 构建时间较长，请稍后手动刷新查看文件
          </p>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, AlertCircle, RefreshCw } from 'lucide-react';
import { auth } from '../services/supabase';

// 生成数学验证问题
function generateCaptcha() {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operators = ['+', '-', '×'];
  const operator = operators[Math.floor(Math.random() * operators.length)];

  let question, answer;

  switch (operator) {
    case '+':
      question = `${num1} + ${num2} = ?`;
      answer = num1 + num2;
      break;
    case '-':
      // 确保结果为正数
      if (num1 < num2) {
        question = `${num2} - ${num1} = ?`;
        answer = num2 - num1;
      } else {
        question = `${num1} - ${num2} = ?`;
        answer = num1 - num2;
      }
      break;
    case '×':
      question = `${num1} × ${num2} = ?`;
      answer = num1 * num2;
      break;
  }

  return { question, answer };
}

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    captcha: '',
  });

  const [captcha, setCaptcha] = useState(generateCaptcha());

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // 验证数学题
    if (parseInt(formData.captcha) !== captcha.answer) {
      setError('验证问题回答错误');
      refreshCaptcha();
      return;
    }

    setLoading(true);

    try {
      await auth.signIn(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      console.error('登录失败:', err);
      setError('邮箱或密码错误');
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/" className="inline-block mb-4">
            <img src="/logo.svg" alt="Logo" className="w-16 h-16 mx-auto" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">管理 UNHub 数据中心</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">登录以管理你的资产文件</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  name="email"
                  required
                  className="input w-full pl-10 text-sm sm:text-base"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                密钥
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  className="input w-full pl-10 pr-10 text-sm sm:text-base"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            {/* 数学验证 */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                数学验证
              </label>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 p-3 bg-gray-100 rounded-lg font-mono text-gray-700 font-semibold">
                  {captcha.question}
                </span>
                <input
                  type="number"
                  name="captcha"
                  required
                  className="input w-full text-center font-semibold"
                  placeholder="答案"
                  value={formData.captcha}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  title="换一个"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <AlertCircle size={18} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-accent hover:underline">
              ← 返回首页
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center text-xs sm:text-sm text-gray-500">
          <p>💡 使用在 Supabase 中创建的管理员账号登录</p>
        </div>
      </div>
    </div>
  );
}
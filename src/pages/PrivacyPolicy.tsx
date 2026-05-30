import { useState } from 'react';
import { Mail, ExternalLink } from 'lucide-react';

export default function PrivacyPolicy() {
  const [emailCopied, setEmailCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@bambu-export.com');
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl py-8 px-4">
      {/* 标题区 */}
      <div className="mb-8 text-center border-b border-[var(--border)] pb-6">
        <h1 className="font-mono-heading text-3xl font-bold text-[var(--text-primary)] mb-3">
          隐私政策
        </h1>
        <p className="text-[var(--accent)] font-semibold mb-2">Bambu 打印历史</p>
        <p className="text-sm text-[var(--text-muted)]">最后更新日期：2024年5月31日</p>
      </div>

      {/* 生效说明 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          本政策自<strong className="text-[var(--text-primary)]">2024年6月1日</strong>起生效。
          请您仔细阅读并理解本政策的全部内容，特别是以粗体标识的条款。
          使用本应用即表示您同意本隐私政策的条款。
        </p>
      </section>

      {/* 一、信息收集 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-[var(--accent)]">
        <h2 className="font-mono-heading text-lg font-bold text-[var(--accent)] mb-4">
          一、我们收集的信息
        </h2>

        <div className="space-y-4 text-sm text-[var(--text-secondary)]">
          <div className="pl-4 border-l-2 border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">1.1 您主动提供的信息</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>手机号码：用于账号登录和身份验证</li>
              <li>验证码：用于验证您的身份</li>
            </ul>
          </div>

          <div className="pl-4 border-l-2 border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">1.2 自动收集的信息</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>设备信息：设备型号、操作系统版本（用于适配优化）</li>
              <li>日志信息：操作记录、错误日志（用于问题排查）</li>
              <li>使用数据：功能使用频率（用于改进服务）</li>
            </ul>
          </div>

          <div className="pl-4 border-l-2 border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">1.3 从第三方获取的信息</h3>
            <p className="leading-relaxed">
              打印历史数据：经您授权后，从 Bambu Lab 云端 API 获取您的3D打印任务记录，
              包括任务名称、状态、起止时间、耗材重量、打印时长、喷嘴直径、封面图片、设备型号、切片模式、AMS详细信息等。
            </p>
          </div>
        </div>
      </section>

      {/* 二、信息使用目的 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-[var(--accent)]">
        <h2 className="font-mono-heading text-lg font-bold text-[var(--accent)] mb-4">
          二、信息的使用目的
        </h2>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-disc list-inside">
          <li><strong className="text-[var(--text-primary)]">提供核心功能：</strong>登录认证、数据同步、历史记录展示</li>
          <li><strong className="text-[var(--text-primary)]">数据分析：</strong>统计打印成功率、耗材使用情况、设备利用率</li>
          <li><strong className="text-[var(--text-primary)]">服务改进：</strong>优化界面体验、修复已知问题</li>
          <li><strong className="text-[var(--text-primary)]">导出分享：</strong>按您选择的格式导出数据或分享给他人</li>
          <li><strong className="text-[var(--text-primary)]">安全保障：</strong>检测异常行为、防止滥用</li>
        </ul>
      </section>

      {/* 三、存储与保护 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-[var(--accent)]">
        <h2 className="font-mono-heading text-lg font-bold text-[var(--accent)] mb-4">
          三、信息的存储与保护
        </h2>

        <div className="space-y-4 text-sm text-[var(--text-secondary)]">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">3.1 存储位置</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>所有数据存储在您的浏览器本地存储中（LocalStorage/IndexedDB）</li>
              <li>不使用我们的自有服务器，不进行云端备份</li>
              <li>清除浏览器数据后，本地数据将一并清除</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">3.2 安全措施</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>使用 HTTPS 加密传输所有网络请求</li>
              <li>Token 等敏感信息加密后本地存储</li>
              <li>定期清理过期缓存数据</li>
              <li>遵循 Web 安全最佳实践（CSP、XSS防护等）</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 四、信息共享 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-[var(--accent)]">
        <h2 className="font-mono-heading text-lg font-bold text-[var(--accent)] mb-4">
          四、信息的共享与披露
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          除以下情况外，我们不会向第三方共享您的个人信息：
        </p>
        <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)] list-disc list-inside">
          <li>Bambu Lab API 服务：仅在您登录授权后，调用官方接口获取您的打印数据</li>
          <li>法律法规要求：应政府部门、司法机关的合法要求</li>
          <li>保护安全：为防止欺诈、侵权等违法行为</li>
        </ul>
      </section>

      {/* 五、用户权利 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-[var(--accent)]">
        <h2 className="font-mono-heading text-lg font-bold text-[var(--accent)] mb-4">
          五、您的权利
        </h2>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-disc list-inside">
          <li><strong className="text-[var(--text-primary)]">访问权：</strong>可在「设置」页面查看已缓存的数据条数</li>
          <li><strong className="text-[var(--text-primary)]">删除权：</strong>可在「设置」中清除所有本地缓存数据</li>
          <li><strong className="text-[var(--text-primary)]">撤回权：</strong>可随时注销账号，清除所有数据</li>
          <li><strong className="text-[var(--text-primary)]">导出权：</strong>支持将数据导出为 JSON/CSV/HA 格式</li>
          <li><strong className="text-[var(--text-primary)]">更正权：</strong>如发现数据错误，可通过重新同步更新</li>
        </ul>
      </section>

      {/* 六、第三方服务 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-[var(--accent)]">
        <h2 className="font-mono-heading text-lg font-bold text-[var(--accent)] mb-4">
          六、第三方服务声明
        </h2>
        <div className="space-y-4 text-sm text-[var(--text-secondary)]">
          <div className="rounded bg-[var(--bg-primary)] p-4">
            <p className="font-semibold text-[var(--text-primary)] mb-2">Bambu Lab 官方 API (api.bambulab.cn)</p>
            <p><strong>用途：</strong>用户认证、打印历史数据查询</p>
            <p><strong>数据处理地点：</strong>中国大陆/全球节点</p>
            <a href="https://bambulab.com/privacy-policy" target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline mt-2">
              <ExternalLink size={14} />隐私政策
            </a>
          </div>
        </div>
      </section>

      {/* 七、未成年人保护 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-[var(--accent)]">
        <h2 className="font-mono-heading text-lg font-bold text-[var(--accent)] mb-4">
          七、未成年人保护
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          我们非常重视未成年人个人信息的保护。若您是18周岁以下的未成年人，
          在使用我们的服务前，应在法定监护人的陪同下阅读本政策，并在取得法定监护人的同意后使用。
        </p>
      </section>

      {/* 八、联系我们 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-purple-500">
        <h2 className="font-mono-heading text-lg font-bold text-purple-400 mb-4">
          八、联系我们
        </h2>
        <div className="text-sm text-[var(--text-secondary)] space-y-3">
          <p>如果您对本隐私政策有任何疑问、意见或建议，可以通过以下方式联系我们：</p>
          <div className="flex items-center gap-2">
            <Mail size={16} />
            <span>电子邮箱：</span>
            <button onClick={handleCopyEmail}
                    className="text-[var(--accent)] hover:underline font-medium bg-transparent border-none cursor-pointer">
              support@bambu-export.com
            </button>
            {emailCopied && <span className="text-xs text-green-400">(已复制)</span>}
          </div>
          <div className="flex items-center gap-2">
            <ExternalLink size={16} />
            <a href="https://github.com/nicepkg/bambu-export-web/issues" target="_blank" rel="noopener noreferrer"
               className="text-[var(--accent)] hover:underline">
              GitHub Issues
            </a>
          </div>
          <p className="text-xs text-[var(--text-muted)]">响应时间：通常在 3-5 个工作日内回复</p>
        </div>
      </section>

      {/* 底部声明 */}
      <footer className="text-center pt-6 border-t border-[var(--border)]">
        <p className="text-sm text-[var(--text-muted)]">
          本政策的解释权归 Bambu 打印历史应用所有。
        </p>
      </footer>
    </div>
  );
}

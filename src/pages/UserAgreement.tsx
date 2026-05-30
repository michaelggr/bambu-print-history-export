import { useState } from 'react';
import { FileText, Mail, AlertTriangle } from 'lucide-react';

export default function UserAgreement() {
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
          用户服务协议
        </h1>
        <p className="text-[var(--accent)] font-semibold mb-2">Bambu 打印历史</p>
        <p className="text-sm text-[var(--text-muted)]">版本：V1.0 | 更新日期：2024年5月31日</p>
      </div>

      {/* 重要提示 */}
      <section className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="shrink-0 mt-0.5 text-yellow-500" size={20} />
          <div className="text-sm text-yellow-200 leading-relaxed">
            <strong className="block mb-1 text-yellow-400">【重要提示】</strong>
            在使用本应用前，请您仔细阅读并充分理解本协议的全部内容，
            特别是免除或限制责任的条款。如您不同意本协议的任何内容，您应立即停止使用本应用。
            您的使用行为将被视为对本协议的接受和同意。
          </div>
        </div>
      </section>

      {/* 一、定义与说明 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-[var(--accent)]">
        <h2 className="font-mono-heading text-lg font-bold text-[var(--accent)] mb-4">
          一、定义与说明
        </h2>
        <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
          <p><strong className="text-[var(--text-primary)]">1.1</strong> 本应用指"Bambu 打印历史"，是一个面向 Bambu Lab 3D打印机用户的
          数据管理与统计分析工具。</p>
          <p><strong className="text-[var(--text-primary)]">1.2</strong> 用户指通过账号登录并使用本应用服务的个人或组织。</p>
          <p><strong className="text-[var(--text-primary)]">1.3</strong> Bambu Lab 指深圳拓竹科技有限公司及其关联公司，是3D打印设备制造商。</p>
          <p><strong className="text-[var(--text-primary)]">1.4</strong> 服务内容包括但不限于：打印历史记录查看、数据统计、报表导出、数据导入等功能。</p>
        </div>
      </section>

      {/* 二、服务内容 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-[var(--accent)]">
        <h2 className="font-mono-heading text-lg font-bold text-[var(--accent)] mb-4">
          二、服务内容
        </h2>

        <div className="space-y-4 text-sm text-[var(--text-secondary)]">
          <div className="pl-4 border-l-2 border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">2.1 核心功能</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>数据同步：从 Bambu Lab 云端获取您的3D打印任务记录</li>
              <li>历史浏览：按时间、状态、设备等维度筛选查看</li>
              <li>统计分析：成功率、耗材用量、设备利用率等多维统计</li>
              <li>数据导出：支持 JSON/CSV/HA 等多种格式导出</li>
              <li>数据导入：支持从其他平台导入打印记录</li>
              <li>分享功能：将统计结果分享给好友或社群</li>
            </ul>
          </div>

          <div className="pl-4 border-l-2 border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">2.2 服务限制</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>需要有效的 Bambu Lab 账号才能使用完整功能</li>
              <li>数据同步依赖网络连接，离线状态下仅可查看已缓存数据</li>
              <li>单次查询数量受 Bambu Lab API 限制</li>
              <li>封面图等资源需要网络加载</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 三、账号与登录 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-[var(--accent)]">
        <h2 className="font-mono-heading text-lg font-bold text-[var(--accent)] mb-4">
          三、账号与登录
        </h2>
        <div className="space-y-2 text-sm text-[var(--text-secondary)] leading-relaxed">
          <p><strong className="text-[var(--text-primary)]">3.1</strong> 您可以使用手机号+验证码方式登录本应用。</p>
          <p><strong className="text-[var(--text-primary)]">3.2</strong> 登录凭证（Token）将加密存储在本地，用于后续 API 调用认证。</p>
          <p><strong className="text-[var(--text-primary)]">3.3</strong> 您有责任妥善保管您的 Bambu Lab 账号密码和验证码，
          因账号泄露导致的任何损失由您自行承担。</p>
          <p><strong className="text-[var(--text-primary)]">3.4</strong> 如发现账号异常，请立即修改 Bambu Lab 密码并清除本应用缓存。</p>
        </div>
      </section>

      {/* 四、用户行为规范 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-[var(--accent)]">
        <h2 className="font-mono-heading text-lg font-bold text-[var(--accent)] mb-4">
          四、用户行为规范
        </h2>

        <div className="space-y-4 text-sm text-[var(--text-secondary)]">
          <div className="pl-4 border-l-2 border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">4.1 您承诺不会从事以下行为：</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>利用本应用进行任何违法违规活动</li>
              <li>逆向工程、反汇编或试图提取源代码</li>
              <li>恶意攻击、干扰服务器正常运行</li>
              <li>批量爬取、滥用 API 接口</li>
              <li>传播违法、不良信息</li>
              <li>冒充他人身份或盗用他人账号</li>
            </ul>
          </div>

          <div className="pl-4 border-l-2 border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">4.2 数据使用限制</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>导出的数据仅限个人使用，不得用于商业用途</li>
              <li>未经他人同意，不得公开包含他人隐私的数据</li>
              <li>分享功能仅用于合法的信息交流目的</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 五、知识产权 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-[var(--accent)]">
        <h2 className="font-mono-heading text-lg font-bold text-[var(--accent)] mb-4">
          五、知识产权
        </h2>
        <div className="space-y-2 text-sm text-[var(--text-secondary)] leading-relaxed">
          <p><strong className="text-[var(--text-primary)]">5.1</strong> 本应用的源代码、界面设计、图标等知识产权归开发者所有。</p>
          <p><strong className="text-[var(--text-primary)]">5.2</strong> Bambu Lab 及其相关商标归深圳拓竹科技有限公司所有。
          本应用为非官方工具，未获得 Bambu Lab 官方授权或背书。</p>
          <p><strong className="text-[var(--text-primary)]">5.3</strong> 从云端获取的打印数据（包括封面图、模型名称等）
          归原始创作者或 Bambu Lab 所有，您仅拥有个人使用的权利。</p>
        </div>
      </section>

      {/* 六、免责声明 */}
      <section className="mb-6 rounded-lg border border-red-500/30 bg-red-500/5 p-6 border-l-4 border-l-red-500">
        <h2 className="font-mono-heading text-lg font-bold text-red-400 mb-4">
          六、免责声明
        </h2>
        <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
          <p><strong className="text-red-300">6.1 服务可用性：</strong>
          本应用依赖 Bambu Lab 提供的第三方 API 服务，因 API 故障、维护、网络问题导致的服务中断，我们不承担责任。</p>

          <p><strong className="text-red-300">6.2 数据准确性：</strong>
          我们尽力确保数据的准确性和及时性，但不对因数据延迟、错误或不完整导致的任何损失负责。</p>

          <p><strong className="text-red-300">6.3 安全性：</strong>
          虽然我们采取了合理的安全措施，但无法保证绝对安全。建议您定期备份重要数据。</p>

          <p><strong className="text-red-300">6.4 第三方链接：</strong>
          本应用可能包含指向外部网站的链接（如 Makerworld 模型页），我们对这些网站的内容和隐私政策不承担责任。</p>

          <p><strong className="text-red-300">6.5 间接损失：</strong>
          在任何情况下，我们对因使用或无法使用本应用而导致的间接、附带、特殊或后果性损害不承担责任。</p>
        </div>
      </section>

      {/* 七、争议解决 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-[var(--accent)]">
        <h2 className="font-mono-heading text-lg font-bold text-[var(--accent)] mb-4">
          七、争议解决
        </h2>
        <div className="space-y-2 text-sm text-[var(--text-secondary)] leading-relaxed">
          <p><strong className="text-[var(--text-primary)]">7.1</strong> 本协议的订立、执行和解释均适用中华人民共和国法律。</p>
          <p><strong className="text-[var(--text-primary)]">7.2</strong> 因本协议引起的任何争议，双方应首先通过友好协商解决。</p>
          <p><strong className="text-[var(--text-primary)]">7.3</strong> 协商不成的，任何一方可将争议提交至开发者所在地有管辖权的人民法院诉讼解决。</p>
        </div>
      </section>

      {/* 八、联系我们 */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 border-l-4 border-l-purple-500">
        <h2 className="font-mono-heading text-lg font-bold text-purple-400 mb-4">
          八、联系我们
        </h2>
        <div className="text-sm text-[var(--text-secondary)] space-y-3">
          <p>如果您对本协议有任何疑问或建议，欢迎联系我们：</p>
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
            <FileText size={16} />
            <a href="https://github.com/nicepkg/bambu-export-web" target="_blank" rel="noopener noreferrer"
               className="text-[var(--accent)] hover:underline">
              GitHub 项目地址
            </a>
          </div>
        </div>
      </section>

      {/* 底部提示 */}
      <footer className="text-center pt-6 border-t border-[var(--border)]">
        <p className="text-sm text-[var(--text-muted)] italic">
          继续使用即表示您已阅读并同意以上全部条款
        </p>
      </footer>
    </div>
  );
}

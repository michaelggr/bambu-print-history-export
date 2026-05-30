import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

export default function UserAgreementPage() {
  const handleContact = () => {
    Taro.setClipboardData({
      data: 'support@bambu-export.com',
    });
  };

  return (
    <ScrollView scrollY className="agreement-page">
      <View className="agreement-container">
        {/* 标题 */}
        <View className="agreement-header">
          <Text className="title">用户服务协议</Text>
          <Text className="subtitle">Bambu 打印历史小程序</Text>
          <Text className="update-date">版本：V1.0 | 更新日期：2024年5月31日</Text>
        </View>

        {/* 协议声明 */}
        <View className="section highlight-section">
          <Text className="highlight-text">
            【重要提示】在使用本小程序前，请您仔细阅读并充分理解本协议的全部内容，
            特别是免除或限制责任的条款。如您不同意本协议的任何内容，您应立即停止使用本小程序。
            您的使用行为将被视为对本协议的接受和同意。
          </Text>
        </View>

        {/* 定义 */}
        <View className="section">
          <Text className="section-title">一、定义与说明</Text>
          <Text className="content">
            1.1 本小程序指"Bambu 打印历史"微信小程序，是一个面向 Bambu Lab 3D打印机用户的
            数据管理与统计分析工具。{'\n\n'}
            1.2 用户指通过微信账号登录并使用本小程序服务的个人或组织。{'\n\n'}
            1.3 Bambu Lab 指深圳拓竹科技有限公司及其关联公司，是3D打印设备制造商。{'\n\n'}
            1.4 服务内容包括但不限于：打印历史记录查看、数据统计、报表导出、数据导入等功能。
          </Text>
        </View>

        {/* 服务内容 */}
        <View className="section">
          <Text className="section-title">二、服务内容</Text>
          
          <View className="sub-section">
            <Text className="sub-title">2.1 核心功能</Text>
            <Text className="content">
              • 数据同步：从 Bambu Lab 云端获取您的3D打印任务记录{'\n'}
              • 历史浏览：按时间、状态、设备等维度筛选查看{'\n'}
              • 统计分析：成功率、耗材用量、设备利用率等多维统计{'\n'}
              • 数据导出：支持 JSON/CSV/HA 等多种格式导出{'\n'}
              • 数据导入：支持从其他平台导入打印记录{'\n'}
              • 分享功能：将统计结果分享给好友或社群
            </Text>
          </View>

          <View className="sub-section">
            <Text className="sub-title">2.2 服务限制</Text>
            <Text className="content">
              • 需要有效的 Bambu Lab 账号才能使用完整功能{'\n'}
              • 数据同步依赖网络连接，离线状态下仅可查看已缓存数据{'\n'}
              • 单次查询数量受 Bambu Lab API 限制{'\n'}
              • 封面图等资源需要网络加载
            </Text>
          </View>
        </View>

        {/* 账号与登录 */}
        <View className="section">
          <Text className="section-title">三、账号与登录</Text>
          <Text className="content">
            3.1 您可以使用手机号+验证码方式登录本小程序。{'\n\n'}
            3.2 登录凭证（Token）将加密存储在本地，用于后续 API 调用认证。{'\n\n'}
            3.3 您有责任妥善保管您的 Bambu Lab 账号密码和验证码，
            因账号泄露导致的任何损失由您自行承担。{'\n\n'}
            3.4 如发现账号异常，请立即修改 Bambu Lab 密码并清除本小程序缓存。
          </Text>
        </View>

        {/* 用户行为规范 */}
        <View className="section">
          <Text className="section-title">四、用户行为规范</Text>
          
          <View className="sub-section">
            <Text className="sub-title">4.1 您承诺不会从事以下行为：</Text>
            <Text className="content">
              • 利用本小程序进行任何违法违规活动{'\n'}
              • 逆向工程、反汇编或试图提取源代码{'\n'}
              • 恶意攻击、干扰服务器正常运行{'\n'}
              • 批量爬取、滥用 API 接口{'\n'}
              • 传播违法、不良信息{'\n'}
              • 冒充他人身份或盗用他人账号
            </Text>
          </View>

          <View className="sub-section">
            <Text className="sub-title">4.2 数据使用限制</Text>
            <Text className="content">
              • 导出的数据仅限个人使用，不得用于商业用途{'\n'}
              • 未经他人同意，不得公开包含他人隐私的数据{'\n'}
              • 分享功能仅用于合法的信息交流目的
            </Text>
          </View>
        </View>

        {/* 知识产权 */}
        <View className="section">
          <Text className="section-title">五、知识产权</Text>
          <Text className="content">
            5.1 本小程序的源代码、界面设计、图标等知识产权归开发者所有。{'\n\n'}
            5.2 Bambu Lab 及其相关商标归深圳拓竹科技有限公司所有。
            本小程序为非官方工具，未获得 Bambu Lab 官方授权或背书。{'\n\n'}
            5.3 从云端获取的打印数据（包括封面图、模型名称等）
            归原始创作者或 Bambu Lab 所有，您仅拥有个人使用的权利。
          </Text>
        </View>

        {/* 免责声明 */}
        <View className="section warning-section">
          <Text className="section-title">六、免责声明</Text>
          <Text className="content">
            6.1 **服务可用性**：本小程序依赖 Bambu Lab 提供的第三方 API 服务，
            因 API 故障、维护、网络问题导致的服务中断，我们不承担责任。{'\n\n'}

            6.2 **数据准确性**：我们尽力确保数据的准确性和及时性，
            但不对因数据延迟、错误或不完整导致的任何损失负责。{'\n\n'}

            6.3 **安全性**：虽然我们采取了合理的安全措施，
            但无法保证绝对安全。建议您定期备份重要数据。{'\n\n'}

            6.4 **第三方链接**：本小程序可能包含指向外部网站的链接（如 Makerworld 模型页），
            我们对这些网站的内容和隐私政策不承担责任。{'\n\n'}

            6.5 **间接损失**：在任何情况下，我们对因使用或无法使用本小程序而导致的
            间接、附带、特殊或后果性损害不承担责任。
          </Text>
        </View>

        {/* 服务变更与终止 */}
        <View className="section">
          <Text className="section-title">七、服务变更与终止</Text>
          <Text className="content">
            7.1 我们保留随时修改、暂停或终止全部或部分服务的权利，
            无需事先通知用户。{'\n\n'}
            7.2 如发生以下情况，我们可立即终止服务：{'\n'}
            • 用户违反本协议条款{'\n'}
            • 应政府部门或司法机关要求{'\n'}
            • 不可抗力因素（自然灾害、战争等）{'\n\n'}
            7.3 服务终止后，您在本地的数据仍可保留，但无法再同步新数据。
          </Text>
        </View>

        {/* 争议解决 */}
        <View className="section">
          <Text className="section-title">八、争议解决</Text>
          <Text className="content">
            8.1 本协议的订立、执行和解释均适用中华人民共和国法律。{'\n\n'}
            8.2 因本协议引起的任何争议，双方应首先通过友好协商解决。{'\n\n'}
            8.3 协商不成的，任何一方可将争议提交至开发者所在地有管辖权的人民法院诉讼解决。
          </Text>
        </View>

        {/* 其他条款 */}
        <View className="section">
          <Text className="section-title">九、其他条款</Text>
          <Text className="content">
            9.1 **完整性**：本协议构成您与我们之间关于本小程序使用的完整协议，
            取代之前的所有口头或书面约定。{'\n\n'}
            9.2 **可分割性**：如果本协议的任何条款被认定为无效或不可执行，
            其余条款仍然有效。{'\n\n'}
            9.3 **标题**：本协议各章节的标题仅为方便阅读，不影响条款的解释。{'\n\n'}
            9.4 **更新**：我们可能会不时更新本协议。重大变更将在小程序内通知您，
            继续使用即视为接受新版本。
          </Text>
        </View>

        {/* 联系方式 */}
        <View className="section contact-section">
          <Text className="section-title">十、联系我们</Text>
          <Text className="content">
            如果您对本协议有任何疑问或建议，欢迎联系我们：{'\n\n'}
            • 电子邮箱：<Text className="contact-link" onClick={handleContact}>support@bambu-export.com</Text>{'\n'}
            • GitHub 项目地址：https://github.com/nicepkg/bambu-export-web{'\n'}
            • 问题反馈：请在 GitHub 提交 Issue
          </Text>
        </View>

        {/* 同意按钮提示 */}
        <View className="agreement-footer">
          <Text className="footer-note">
            点击「同意并继续」即表示您已阅读并同意以上全部条款
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

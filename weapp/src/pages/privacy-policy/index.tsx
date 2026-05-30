import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

export default function PrivacyPolicyPage() {
  const handleContact = () => {
    Taro.setClipboardData({
      data: 'support@bambu-export.com',
    });
  };

  return (
    <ScrollView scrollY className="privacy-page">
      <View className="privacy-container">
        {/* 标题 */}
        <View className="privacy-header">
          <Text className="title">隐私政策</Text>
          <Text className="subtitle">Bambu 打印历史小程序</Text>
          <Text className="update-date">最后更新日期：2024年5月31日</Text>
        </View>

        {/* 生效说明 */}
        <View className="section">
          <Text className="section-title">生效时间</Text>
          <Text className="content">
            本政策自2024年6月1日起生效。请您仔细阅读并理解本政策的全部内容，特别是以粗体/下划线标识的条款。
          </Text>
        </View>

        {/* 引言 */}
        <View className="section">
          <Text className="section-title">引言</Text>
          <Text className="content">
            Bambu 打印历史（以下简称"我们"）非常重视用户的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。
            使用本小程序即表示您同意本隐私政策的条款。
          </Text>
        </View>

        {/* 信息收集 */}
        <View className="section">
          <Text className="section-title">一、我们收集的信息</Text>
          
          <View className="sub-section">
            <Text className="sub-title">1.1 您主动提供的信息</Text>
            <Text className="content">
              • 手机号码：用于账号登录和身份验证{'\n'}
              • 验证码：用于验证您的身份
            </Text>
          </View>

          <View className="sub-section">
            <Text className="sub-title">1.2 自动收集的信息</Text>
            <Text className="content">
              • 设备信息：设备型号、操作系统版本（用于适配优化）{'\n'}
              • 日志信息：操作记录、错误日志（用于问题排查）{'\n'}
              • 使用数据：功能使用频率（用于改进服务）
            </Text>
          </View>

          <View className="sub-section">
            <Text className="sub-title">1.3 从第三方获取的信息</Text>
            <Text className="content">
              • 打印历史数据：经您授权后，从 Bambu Lab 云端 API 获取您的3D打印任务记录，包括：
              - 任务名称、状态、起止时间
              - 耗材重量、打印时长、喷嘴直径
              - 封面图片、设备型号、切片模式
              - AMS（自动耗材系统）详细信息
            </Text>
          </View>
        </View>

        {/* 信息使用 */}
        <View className="section">
          <Text className="section-title">二、信息的使用目的</Text>
          <Text className="content">
            我们收集的信息仅用于以下合法目的：{'\n\n'}
            • 提供核心功能：登录认证、数据同步、历史记录展示{'\n'}
            • 数据分析：统计打印成功率、耗材使用情况、设备利用率{'\n'}
            • 服务改进：优化界面体验、修复已知问题{'\n'}
            • 导出分享：按您选择的格式导出数据或分享给他人{'\n'}
            • 安全保障：检测异常行为、防止滥用
          </Text>
        </View>

        {/* 信息存储 */}
        <View className="section">
          <Text className="section-title">三、信息的存储与保护</Text>
          
          <View className="sub-section">
            <Text className="sub-title">3.1 存储位置</Text>
            <Text className="content">
              • 所有数据存储在您的手机本地存储中（微信小程序 Storage）{'\n'}
              • 不使用我们的自有服务器，不进行云端备份{'\n'}
              • 删除小程序后，本地数据将一并清除
            </Text>
          </View>

          <View className="sub-section">
            <Text className="sub-title">3.2 安全措施</Text>
            <Text className="content">
              • 使用 HTTPS 加密传输所有网络请求{'\n'}
              • Token 等敏感信息加密后本地存储{'\n'}
              • 定期清理过期缓存数据{'\n'}
              • 遵循微信小程序安全开发规范
            </Text>
          </View>
        </View>

        {/* 信息共享 */}
        <View className="section">
          <Text className="section-title">四、信息的共享与披露</Text>
          <Text className="content">
            除以下情况外，我们不会向第三方共享您的个人信息：{'\n\n'}
            • Bambu Lab API 服务：仅在您登录授权后，调用官方接口获取您的打印数据{'\n'}
            • 法律法规要求：应政府部门、司法机关的合法要求{'\n'}
            • 保护安全：为防止欺诈、侵权等违法行为
          </Text>
        </View>

        {/* 用户权利 */}
        <View className="section">
          <Text className="section-title">五、您的权利</Text>
          <Text className="content">
            您对个人信息享有以下权利：{'\n\n'}
            • 访问权：可在「设置」页面查看已缓存的数据条数{'\n'}
            • 删除权：可在「设置」中清除所有本地缓存数据{'\n'}
            • 撤回权：可随时注销账号，清除所有数据{'\n'}
            • 导出权：支持将数据导出为 JSON/CSV/HA 格式{'\n'}
            • 更正权：如发现数据错误，可通过重新同步更新
          </Text>
        </View>

        {/* 第三方服务 */}
        <View className="section">
          <Text className="section-title">六、第三方服务声明</Text>
          <Text className="content">
            本小程序集成了以下第三方服务：{'\n\n'}
            • Bambu Lab 官方 API（api.bambulab.cn）{'\n'}
              用途：用户认证、打印历史数据查询{'\n'}
              数据处理地点：中国大陆/全球节点{'\n'}
              隐私政策：https://bambulab.com/privacy-policy{'\n\n'}
            • 微信小程序基础服务{'\n'}
              用途：账号体系、文件存储、分享功能{'\n'}
              隐私政策：https://weixin.qq.com/terms
          </Text>
        </View>

        {/* 未成年人保护 */}
        <View className="section">
          <Text className="section-title">七、未成年人保护</Text>
          <Text className="content">
            我们非常重视未成年人个人信息的保护。若您是18周岁以下的未成年人，
            在使用我们的服务前，应在法定监护人的陪同下阅读本政策，并在取得法定监护人的同意后使用。
          </Text>
        </View>

        {/* 政策更新 */}
        <View className="section">
          <Text className="section-title">八、政策的更新</Text>
          <Text className="content">
            我们可能会适时修订本隐私政策。重大变更将通过以下方式通知您：{'\n\n'}
            • 在小程序内弹窗提示{'\n'}
            • 在本页面顶部标注"最后更新日期"{'\n'}
            • 通过您预留的联系方式发送通知
          </Text>
        </View>

        {/* 联系方式 */}
        <View className="section contact-section">
          <Text className="section-title">九、联系我们</Text>
          <Text className="content">
            如果您对本隐私政策有任何疑问、意见或建议，可以通过以下方式联系我们：{'\n\n'}
            • 电子邮箱：<Text className="contact-link" onClick={handleContact}>support@bambu-export.com</Text>{'\n'}
            • GitHub Issues：https://github.com/nicepkg/bambu-export-web/issues{'\n'}
            • 响复时间：通常在 3-5 个工作日内回复
          </Text>
        </View>

        {/* 底部声明 */}
        <View className="footer">
          <Text className="footer-text">
            本政策的解释权归 Bambu 打印历史小程序所有。
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

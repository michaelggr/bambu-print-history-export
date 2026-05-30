﻿﻿﻿﻿﻿﻿import { View } from '@tarojs/components';
import './AppIcon.scss';

interface AppIconProps {
  size?: number;
}

export default function AppIcon({ size = 120 }: AppIconProps) {
  return (
    <View className="app-icon-wrap" style={{ width: `${size}px`, height: `${size}px` }}>
      {/* 圆角方形背景 */}
      <View className="icon-bg">
        {/* 顶部微光效果 */}
        <View className="icon-bg-glow" />

        {/* 喷嘴组件 */}
        <View className="icon-nozzle-body">
          <View className="nozzle-feed" />
        </View>
        <View className="icon-nozzle-tip" />

        {/* 打印中的数据柱状图区域 */}
        <View className="icon-chart-area">
          <View className="icon-bar icon-bar-1" />
          <View className="icon-bar icon-bar-2" />
          <View className="icon-bar icon-bar-3" />
          <View className="icon-bar icon-bar-4" />

          {/* 正在打印的最新层 */}
          <View className="icon-printing-layer">
            <View className="print-scan" />
          </View>

          {/* 热床基线 */}
          <View className="icon-bed-line" />
        </View>

        {/* 右侧数据指示点 */}
        <View className="icon-dots">
          <View className="icon-dot active" />
          <View className="icon-dot active" />
          <View className="icon-dot" />
        </View>
      </View>
    </View>
  );
}

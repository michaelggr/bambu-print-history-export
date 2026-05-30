﻿﻿﻿﻿﻿﻿import { View } from '@tarojs/components';
// 使用统一的 index.scss 命名，避免大小写问题
import './index.scss';

interface PrinterIconProps {
  size?: number;
}

export default function PrinterIcon({ size = 56 }: PrinterIconProps) {
  const scale = size / 56;

  return (
    <View
      className="fdm-icon"
      style={{ width: `${size}px`, height: `${size * (64 / 56)}px` }}
    >
      <View className="fdm-feed" />
      <View className="fdm-heatsink">
        <View className="fin fin-1" />
        <View className="fin fin-2" />
        <View className="fin fin-3" />
        <View className="fin fin-4" />
        <View className="fin fin-5" />
      </View>
      <View className="fdm-heater">
        <View className="heater-dot heater-d1" />
        <View className="heater-dot heater-d2" />
      </View>
      <View className="fdm-throat" />
      <View className="fdm-nozzle">
        <View className="nozzle-tip" />
      </View>
      <View className="fdm-fan">
        <View className="fan-blade fan-b1" />
        <View className="fan-blade fan-b2" />
        <View className="fan-blade fan-b3" />
        <View className="fan-hub" />
      </View>
    </View>
  );
}

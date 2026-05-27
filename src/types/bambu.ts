/**
 * 前后端共用类型定义
 * 与后端 api/services/bambu.ts 中的类型保持同步
 */

/** Bambu 打印历史记录项 */
export interface BambuHistoryItem {
  id: string;
  designId?: number | string;
  designTitle?: string;
  title?: string;
  designTitleTranslated?: string;
  status: number; // 2=成功, 3=失败, 1=打印中, 4=取消
  deviceName?: string;
  deviceModel?: string;
  deviceId?: string;
  startTime?: string;
  endTime?: string;
  costTime?: number; // 秒
  weight?: number; // 克
  length?: number; // 毫米
  cover?: string;
  snapShot?: string;
  nozzleInfos?: Array<{ diameter: number; type: string }>;
  amsDetailMapping?: Array<{
    filamentType: string;
    sourceColor: string;
    weight: number;
    length: number;
  }>;
  mode?: string; // cloud_slice / local
  bedType?: string;
  useAms?: boolean;
  modelId?: string;
  profileId?: string;
  progress?: number;
  filament?: Record<string, { type: string; color: string; weight: number; length: number }>;
  filamentType?: string;
  filamentColor?: string;
  nozzleSize?: string | number;
  [key: string]: unknown;
}

/** 周期统计数据 */
export interface PeriodStats {
  total_prints: number;
  successful_prints: number;
  failed_prints: number;
  cancelled_prints: number;
  success_rate: number;
  total_weight_g: number;
  total_duration_hours: number;
  devices: Record<string, { count: number; success: number; failed: number; weight_g: number }>;
  filaments: Record<string, { count: number; weight_g: number; success: number; failed: number }>;
  monthly: Record<string, number>;
  duration_distribution: Record<string, number>;
  failure_stage_distribution: Record<string, number>;
  extremes: {
    longest: { name: string; hours: number };
    shortest: { name: string; hours: number };
    heaviest: { name: string; weight_g: number };
    lightest: { name: string; weight_g: number };
    most_colors: { name: string; count: number };
  };
  /** 喷嘴尺寸分布：如 { "0.4": 250, "0.2": 10 } */
  nozzle_size_distribution: Record<string, number>;
  /** 超500g模型数 */
  over_500g_count: number;
  /** 超500g模型占比(%) */
  over_500g_rate: number;
  /** 切片模式分布：如 { "cloud_slice": 300, "local": 50 } */
  slice_mode_distribution: Record<string, number>;
  /** 多色模型数 */
  multi_color_count: number;
  /** 多色模型占比(%) */
  multi_color_rate: number;
}

/** 完整统计结果 */
export interface StatsResult {
  stats_lifetime: PeriodStats;
  stats_7d: PeriodStats;
  stats_30d: PeriodStats;
  activity_heatmap: Record<string, number>;
  filament_success_stats: Record<string, {
    total: number; success: number; failed: number; cancelled: number;
    success_rate: number; weight_g: number;
  }>;
  /** 颜色使用量对比：如 { "#FFFFFF": 15000, "#000000": 8000 } 单位：克 */
  color_usage_stats: Record<string, number>;
}

/** HA 格式单条记录的颜色用量详情 */
export interface HAColorUsage {
  color: string;
  type: string;
  weight_g: number;
  length_m: number;
}

/** HA printer_analytics 插件单条记录格式 */
export interface HARecord {
  task_name: string;
  status: string;
  design_id: number | string;
  printer_serial: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  prepare_time_minutes: number | null;
  filament_type: string;
  filament_color: string;
  total_weight: number;
  total_length: number;
  colors_used: string[];
  types_used: string[];
  total_colors: number;
  multi_color: boolean;
  over_500g: boolean;
  color_usage: HAColorUsage[];
  energy_kwh: number | null;
  nozzle_type: string;
  nozzle_size: string;
  print_bed_type: string;
  speed_profile: number | null;
  slice_mode: string;
  ams_used: boolean;
  total_layer_count: number | null;
  progress: number;
  cover_image_url: string;
}

/** HA printer_analytics 插件完整导出格式 */
export interface HAFormat {
  version: number;
  history: HARecord[];
}

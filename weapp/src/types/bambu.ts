﻿﻿﻿﻿﻿﻿export interface BambuHistoryItem {
  id: string;
  designId?: number | string;
  designTitle?: string;
  title?: string;
  designTitleTranslated?: string;
  status: number;
  deviceName?: string;
  deviceModel?: string;
  deviceId?: string;
  startTime?: string;
  endTime?: string;
  costTime?: number;
  weight?: number;
  length?: number;
  cover?: string;
  snapShot?: string;
  nozzleInfos?: Array<{ diameter: number; type: string }>;
  amsDetailMapping?: Array<{
    filamentType: string;
    sourceColor: string;
    weight: number;
    length: number;
  }>;
  mode?: string;
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
  nozzle_size_distribution: Record<string, number>;
  over_500g_count: number;
  over_500g_rate: number;
  slice_mode_distribution: Record<string, number>;
  multi_color_count: number;
  multi_color_rate: number;
}

export interface StatsResult {
  stats_lifetime: PeriodStats;
  stats_7d: PeriodStats;
  stats_30d: PeriodStats;
  activity_heatmap: Record<string, number>;
  filament_success_stats: Record<string, {
    total: number; success: number; failed: number; cancelled: number;
    success_rate: number; weight_g: number;
  }>;
  color_usage_stats: Record<string, number>;
}

export interface HAColorUsage {
  color: string;
  type: string;
  weight_g: number;
  length_m: number;
}

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

export interface HAFormat {
  version: number;
  history: HARecord[];
}

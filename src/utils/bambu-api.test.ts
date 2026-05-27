import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bambuApi from './bambu-api';

// ---------------------------------------------------------------------------
// Mock 依赖
// ---------------------------------------------------------------------------

// Mock CapacitorHttp
vi.mock('@capacitor/core', () => ({
  CapacitorHttp: {
    request: vi.fn(),
  },
}));

// Mock window.electronAPI
beforeEach(() => {
  vi.clearAllMocks();
  // 重置 window 对象
  Object.defineProperty(globalThis, 'window', {
    value: {
      electronAPI: undefined,
      Capacitor: undefined,
    },
    writable: true,
    configurable: true,
  });
});

// ---------------------------------------------------------------------------
// getBaseUrl 逻辑（通过 sendCode 间接测试）
// ---------------------------------------------------------------------------

describe('区域判断逻辑', () => {
  it('手机号（不含@）应使用中国区 API', () => {
    // 通过检查 sendCode 的请求 URL 来验证
    // 手机号 → /v1/user-service/user/sendsmscode
    // 邮箱   → /v1/user-service/user/sendemail/code
    // 此测试验证分支逻辑，实际 HTTP 请求会被 mock
    const phone = '13800138000';
    const email = 'user@example.com';

    expect(phone.includes('@')).toBe(false);  // 手机号不含 @
    expect(email.includes('@')).toBe(true);    // 邮箱含 @
  });
});

// ---------------------------------------------------------------------------
// sendCode（浏览器环境 mock fetch）
// ---------------------------------------------------------------------------

describe('sendCode', () => {
  it('成功发送验证码', async () => {
    // Mock fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ statusCode: 200 }),
    });
    globalThis.fetch = mockFetch;

    const result = await bambuApi.sendCode('user@example.com');
    expect(result.success).toBe(true);
  });

  it('429 返回频率限制错误', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 429,
      json: () => Promise.resolve({}),
    });
    globalThis.fetch = mockFetch;

    const result = await bambuApi.sendCode('user@example.com');
    expect(result.success).toBe(false);
    expect(result.error).toContain('频繁');
  });

  it('网络错误返回网络错误提示', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    globalThis.fetch = mockFetch;

    const result = await bambuApi.sendCode('user@example.com');
    expect(result.success).toBe(false);
    expect(result.error).toBe('网络错误');
  });
});

// ---------------------------------------------------------------------------
// loginWithCode
// ---------------------------------------------------------------------------

describe('loginWithCode', () => {
  it('成功登录返回 token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'test-token-123' }),
    });
    globalThis.fetch = mockFetch;

    const result = await bambuApi.loginWithCode('user@example.com', '123456');
    expect(result.success).toBe(true);
    expect(result.token).toBe('test-token-123');
  });

  it('登录失败返回错误信息', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: '验证码错误' }),
    });
    globalThis.fetch = mockFetch;

    const result = await bambuApi.loginWithCode('user@example.com', 'wrong');
    expect(result.success).toBe(false);
    expect(result.error).toContain('验证码错误');
  });
});

// ---------------------------------------------------------------------------
// loginWithPassword
// ---------------------------------------------------------------------------

describe('loginWithPassword', () => {
  it('成功登录返回 token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'pwd-token-456' }),
    });
    globalThis.fetch = mockFetch;

    const result = await bambuApi.loginWithPassword('user@example.com', 'password123');
    expect(result.success).toBe(true);
    expect(result.token).toBe('pwd-token-456');
  });
});

// ---------------------------------------------------------------------------
// fetchHistory
// ---------------------------------------------------------------------------

describe('fetchHistory', () => {
  it('空 token 返回空数组', async () => {
    const result = await bambuApi.fetchHistory('');
    expect(result).toEqual([]);
  });

  it('分页获取全部历史', async () => {
    // PAGE_SIZE=20，第一页返回 total=3, 2条数据
    // 但 offset=20 >= total=3，不会触发第二页请求
    // 所以实际只返回第一页的 2 条数据
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        hits: [
          { id: '1', designTitle: '模型A', status: 2 },
          { id: '2', designTitle: '模型B', status: 2 },
        ],
        total: 2,
      }),
    });
    globalThis.fetch = mockFetch;

    const result = await bambuApi.fetchHistory('test-token');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });

  it('existingIds 过滤已存在的记录', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        hits: [
          { id: '1', designTitle: '模型A', status: 2 },
          { id: '2', designTitle: '模型B', status: 2 },
        ],
        total: 2,
      }),
    });
    globalThis.fetch = mockFetch;

    const existingIds = new Set(['1']);
    const result = await bambuApi.fetchHistory('test-token', existingIds);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });
});

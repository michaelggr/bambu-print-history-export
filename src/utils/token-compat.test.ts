﻿﻿﻿﻿﻿﻿﻿﻿import { describe, it, expect, beforeEach } from 'vitest';
import { saveToken, loadToken } from './bambu-cache';

beforeEach(() => {
  localStorage.clear();
});

describe('Token 存储兼容性', () => {
  it('saveToken 写入 JSON 后 loadToken 能正确读取', () => {
    saveToken('jwt-abc-123', 'user@test.com');
    expect(loadToken()).toBe('jwt-abc-123');
  });

  it('当外部用纯字符串覆盖 bambu_token 时 loadToken 仍能返回 token', () => {
    saveToken('jwt-abc-123', 'user@test.com');
    // 模拟 store.setAuth() 用纯字符串覆盖同一个 key
    localStorage.setItem('bambu_token', 'jwt-abc-123');
    // loadToken 应该仍能正确返回 token，而不是 null
    expect(loadToken()).toBe('jwt-abc-123');
  });

  it('当 localStorage 中只有纯字符串 token 时 loadToken 能正确读取', () => {
    localStorage.setItem('bambu_token', 'raw-token-string');
    expect(loadToken()).toBe('raw-token-string');
  });

  it('空字符串 token 视为无效', () => {
    localStorage.setItem('bambu_token', '');
    expect(loadToken()).toBeNull();
  });
});

"""
从 resources/icon.png 生成所有 Android mipmap 尺寸的 App 图标
用法: python scripts/gen_android_icons.py
前提: 需要先执行 npx cap add android 创建 android/ 目录
"""

import os
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, 'resources', 'icon.png')
ANDROID_RES = os.path.join(BASE, 'android', 'app', 'src', 'main', 'res')

# 各密度的图标尺寸
MIPMAP_SIZES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

def main():
    if not os.path.exists(SRC):
        print(f'❌ 源图不存在: {SRC}')
        print('   请先运行资源生成脚本或确认 resources/icon.png 存在')
        return False

    if not os.path.exists(ANDROID_RES):
        print(f'❌ android 资源目录不存在: {ANDROID_RES}')
        print('   请先执行: npx cap add android')
        return False

    img = Image.open(SRC).convert('RGBA')

    for folder, size in MIPMAP_SIZES.items():
        d = os.path.join(ANDROID_RES, folder)
        os.makedirs(d, exist_ok=True)
        resized = img.resize((size, size), Image.LANCZOS)

        # 标准启动图标
        resized.save(os.path.join(d, 'ic_launcher.png'), 'PNG')
        # 圆角启动图标
        resized.save(os.path.join(d, 'ic_launcher_round.png'), 'PNG')
        print(f'✅ {folder}: {size}×{size}')

    # 通知前景图标（Android 8.0+ 自适应图标）
    for folder, size in MIPMAP_SIZES.items():
        fg_size = max(size // 2, 24)  # 前景图标约为一半
        d_v26 = os.path.join(ANDROID_RES, f'mipmap-anydpi-v26')
        os.makedirs(d_v26, exist_ok=True)

        # 同时为各密度生成前景图
        d_fg = os.path.join(ANDROID_RES, f'{folder}-v26')
        os.makedirs(d_fg, exist_ok=True)
        fg_img = img.resize((fg_size * 2, fg_size * 2), Image.LANCZOS)
        fg_img.save(os.path.join(d_fg, 'ic_launcher_foreground.png'), 'PNG')

    print(f'\n🎉 全部完成！共 {len(MIPMAP_SIZES)} 种尺寸已生成')
    return True

if __name__ == '__main__':
    main()

/**
 * Stats 子组件共享模块 — 空数据占位 & 区块标题
 */

/** 空数据占位 */
export function EmptyBlock() {
  return <p className="py-8 text-center text-sm text-[var(--text-muted)]">暂无数据</p>;
}

/** 区块标题 */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-mono-heading text-base font-bold text-[var(--text-primary)]">
      {children}
    </h2>
  );
}

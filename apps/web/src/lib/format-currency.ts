export function formatRupiah(amount: number, compact = false): string {
  const value = Number(amount ?? 0);

  if (compact) {
    if (Math.abs(value) >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
    if (Math.abs(value) >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  }

  return `Rp ${value.toLocaleString("id-ID")}`;
}

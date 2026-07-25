/**
 * Fetches the live PKR/USD exchange rate from the open.er-api.com free tier.
 * Cached for 1 hour by Next.js. Falls back to a hard-coded rate if the
 * network request fails.
 *
 * Usage (server components only):
 *   const pkrRate = await getPkrRate();
 *   formatCurrencyPKR(usdAmount, pkrRate)
 */
export async function getPkrRate(): Promise<number> {
  try {
    const resp = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 }, // cache 1 hour
    });
    if (!resp.ok) throw new Error("rate-api-error");
    const data = (await resp.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.PKR;
    if (typeof rate === "number" && rate > 0) return rate;
  } catch {
    // fall through to fallback
  }
  // Fallback: approximate mid-market rate (update manually if needed)
  return 278.5;
}

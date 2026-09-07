// Posh's public ticket response includes expired and non-public tiers.
// Only a price a visitor can buy on the event page is publishable.
export function purchasablePrices(groups, now = Date.now()) {
  const bound = (v, check) => v == null || (Number.isFinite(Date.parse(v)) && check(Date.parse(v)));
  const prices = (Array.isArray(groups) ? groups : []).flatMap(g => Array.isArray(g?.tickets) ? g.tickets : [])
    .filter(t => t && t.closed === false && !t.disabled && !t.isHidden && !t.priceHidden && !t.password && !t.approvalRequired
      && typeof t.quantityAvailable === 'number' && Number.isFinite(t.quantityAvailable) && t.quantityAvailable > 0
      && Array.isArray(t.availableForSaleVia) && t.availableForSaleVia.includes('event_page')
      && bound(t.onSaleUtc, v => v <= now) && bound(t.endSaleUtc, v => v > now)
      && typeof t.totalPrice === 'number' && Number.isFinite(t.totalPrice) && t.totalPrice >= 0)
    .map(t => t.totalPrice);
  return prices.length ? { low: Math.min(...prices), high: Math.max(...prices), count: prices.length } : null;
}

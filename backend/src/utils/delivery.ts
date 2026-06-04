// Delivery charge per camper, by order quantity (shared by orders & billing,
// and mirrored in the mobile Order screen).
//   1–4 campers   → ₹10 each
//   5–9 campers   → ₹5 each
//   10–20 campers → ₹2 each
//   more than 20  → FREE
export function deliveryPerCamper(qty: number): number {
  if (qty > 20) return 0;
  if (qty >= 10) return 2;
  if (qty >= 5) return 5;
  return 10;
}

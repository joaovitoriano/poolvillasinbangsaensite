export type DiscountMode = "amount" | "percentage";

export function calculateDiscount(subtotalThb: number, mode: DiscountMode, value: number) {
  if (!Number.isFinite(value) || value < 0 || (mode === "percentage" && value > 100)) {
    throw new Error("Enter a valid discount (percentage must be 0–100) / กรอกส่วนลดให้ถูกต้อง (เปอร์เซ็นต์ต้องอยู่ระหว่าง 0–100)");
  }
  return mode === "percentage" ? Math.round(subtotalThb * value) / 100 : value;
}

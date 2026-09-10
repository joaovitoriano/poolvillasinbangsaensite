export type CommissionMode = "amount" | "percentage";

export function calculateCommission(totalThb: number, mode: CommissionMode, value: number) {
  if (!Number.isFinite(value) || value < 0 || (mode === "percentage" && value > 100)) {
    throw new Error("Enter a valid commission (percentage must be 0–100) / กรอกค่าคอมมิชชั่นให้ถูกต้อง (เปอร์เซ็นต์ต้องอยู่ระหว่าง 0–100)");
  }
  return mode === "percentage" ? Math.round(Math.max(0, totalThb) * value) / 100 : value;
}

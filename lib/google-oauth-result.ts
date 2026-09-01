export const googleOAuthMessages = {
  cancelled: ["Google connection cancelled. You can try again when ready.", "ยกเลิกการเชื่อมต่อ Google แล้ว คุณสามารถลองใหม่ได้เมื่อพร้อม"],
  session_expired: ["Your sign-in session expired. Sign in again, then reconnect Google.", "เซสชันเข้าสู่ระบบหมดอายุ โปรดเข้าสู่ระบบอีกครั้งแล้วเชื่อมต่อ Google ใหม่"],
  forbidden: ["Superadmin access is required to connect Google.", "ต้องมีสิทธิ์ผู้ดูแลระบบขั้นสูงเพื่อเชื่อมต่อ Google"],
  invalid_state: ["This connection attempt expired or could not be verified. Start again from this page.", "คำขอเชื่อมต่อนี้หมดอายุหรือไม่สามารถยืนยันได้ โปรดเริ่มใหม่จากหน้านี้"],
  setup_required: ["Google connection setup is incomplete. Check the server configuration before trying again.", "การตั้งค่าการเชื่อมต่อ Google ยังไม่ครบ โปรดตรวจสอบการตั้งค่าฝั่งเซิร์ฟเวอร์ก่อนลองใหม่"],
  scope_required: ["Allow read access to Google Calendar on the Google consent screen, then try again.", "โปรดอนุญาตให้อ่าน Google Calendar ในหน้าขอความยินยอมของ Google แล้วลองใหม่"],
  calendar_access_required: ["This Google account cannot access all connected villa calendars. Choose the account that manages them and try again.", "บัญชี Google นี้ไม่สามารถเข้าถึงปฏิทินวิลล่าที่เชื่อมต่อได้ทั้งหมด โปรดเลือกบัญชีที่จัดการปฏิทินเหล่านั้นแล้วลองใหม่"],
  connection_changed: ["Another connection was saved while you were authorizing. Check the current status before trying again.", "มีการบันทึกการเชื่อมต่ออื่นระหว่างที่คุณอนุญาต โปรดตรวจสอบสถานะปัจจุบันก่อนลองใหม่"],
  authorization_failed: ["Google could not be connected. Try again and complete the Google approval screen.", "ไม่สามารถเชื่อมต่อ Google ได้ โปรดลองใหม่และดำเนินการอนุญาตบนหน้าของ Google ให้เสร็จสิ้น"],
  request_failed: ["The connection request could not be completed. Check your connection and try again.", "ไม่สามารถดำเนินการคำขอเชื่อมต่อได้ โปรดตรวจสอบอินเทอร์เน็ตแล้วลองใหม่"],
} as const;

export type GoogleOAuthError = keyof typeof googleOAuthMessages;

export function isGoogleOAuthError(value: unknown): value is GoogleOAuthError {
  return typeof value === "string" && Object.hasOwn(googleOAuthMessages, value);
}

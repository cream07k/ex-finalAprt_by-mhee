export interface Room {
  id: string;
  roomNumber: string;
  tenantName: string;
  floor: string;
  rent: number;
}

export interface BillingRecord {
  id: string;
  roomId: string;
  roomNumber: string;
  tenantName: string;
  billingMonth: string; // "YYYY-MM"
  prevElectric: number;
  currElectric: number;
  prevWater: number;
  currWater: number;
  electricCost: number;
  waterCost: number;
  rent: number;
  otherFee: number;
  otherFeeNote: string;
  total: number;
  isPaid: boolean;
  createdAt: string;
  slipRef?: string;
  slipVerifiedAt?: string;
  qrToken?: string;
  qrExpiresAt?: string; // ISO timestamp หมดอายุ
}

export interface QrTokenEntry {
  token: string;
  recordId: string;
  expiresAt: number; // epoch ms
  usedAt?: number;
}

export interface Settings {
  electricRate: number;
  waterRate: number;
  apartmentName: string;
  promptPayId: string;        // เบอร์โทรหรือเลขบัตรประชาชนพร้อมเพย์
  apartmentAddress: string;   // ที่อยู่ที่จะแสดงในบิล
  apartmentPhone: string;     // เบอร์ติดต่อในบิล
  apartmentLogo: string;      // base64 data URL หรือ URL รูป
  invoiceFooter: string;      // ข้อความ footer ใบแจ้งหนี้
  receiptFooter: string;      // ข้อความ footer ใบเสร็จ
}

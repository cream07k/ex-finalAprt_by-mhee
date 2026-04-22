"use client";

import { useEffect } from "react";
import { useStore, fmtMoney, fmtMonth, type DbBillingRecord } from "@/lib/store";

interface Props {
  record: DbBillingRecord;
  mode?: "invoice" | "receipt";       // default = receipt
  onClose: () => void;
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ReceiptPrintModal({ record, mode = "receipt", onClose }: Props) {
  const { state } = useStore();
  const { settings } = state;

  useEffect(() => {
    (async () => {
      const r       = record;
      const eu      = r.currElectric - r.prevElectric;
      const wu      = r.currWater - r.prevWater;
      const ppId    = settings.promptPayId?.trim() ?? "";
      const aptName = settings.apartmentName || "อพาร์ตเมนต์";
      const billNo  = r.id;
      const issuedAt = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

      const isReceipt = mode === "receipt";
      const title     = isReceipt ? "ใบเสร็จรับเงิน" : "ใบแจ้งหนี้";
      const titleEn   = isReceipt ? "RECEIPT" : "INVOICE";
      const headColor = isReceipt
        ? "linear-gradient(135deg,#059669,#0891b2)"
        : "linear-gradient(135deg,#1d4ed8 0%,#0891b2 60%,#0f766e 100%)";

      // QR PromptPay เฉพาะใบแจ้งหนี้
      let qrDataUrl = "";
      if (!isReceipt && ppId) {
        try {
          const [{ default: QRCode }, { default: generatePayload }] = await Promise.all([
            import("qrcode"),
            import("promptpay-qr"),
          ]);
          const payload = generatePayload(ppId, { amount: r.total });
          qrDataUrl = await QRCode.toDataURL(payload, { width: 240, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } });
        } catch { /* ignore */ }
      }

      const otherRow = r.otherFee > 0
        ? `<tr><td>ค่าอื่นๆ${r.otherFeeNote ? ` <span class="note">(${r.otherFeeNote})</span>` : ""}</td><td class="r">฿${fmtMoney(r.otherFee)}</td></tr>`
        : "";

      // Receipt-specific block: ผู้จ่าย + วันที่จ่าย + วิธี
      const methodText =
        r.paymentMethod === "cash" ? "💵 เงินสด"
        : r.paymentMethod === "slip" ? "📱 โอน (PromptPay)"
        : "";

      const paidBlock = isReceipt ? `
        <div class="paid-info">
          <div class="paid-row">
            <span class="paid-label">ชำระเมื่อ</span>
            <span class="paid-value">${fmtDateTime(r.paidAt)}</span>
          </div>
          ${methodText ? `<div class="paid-row"><span class="paid-label">วิธีชำระ</span><span class="paid-value">${methodText}</span></div>` : ""}
          ${r.paidBy ? `<div class="paid-row"><span class="paid-label">ผู้จ่าย</span><span class="paid-value"><b>${r.paidBy}</b></span></div>` : ""}
          ${r.slipRef && r.paymentMethod === "slip" ? `<div class="paid-row"><span class="paid-label">Slip Ref</span><span class="paid-value mono">${r.slipRef}</span></div>` : ""}
        </div>
      ` : "";

      // Invoice-specific block: QR + วิธีจ่าย
      const qrBlock = !isReceipt && qrDataUrl ? `
        <div class="qr-section">
          <div class="qr-note">
            <b>📌 วิธีชำระ</b>
            สแกน QR ด้านขวาด้วยแอปธนาคาร<br/>
            แล้วส่งสลิปให้ผู้ดูแล
          </div>
          <div class="qr-box">
            <div class="qr-title">สแกนเพื่อชำระ</div>
            <img src="${qrDataUrl}" alt="QR PromptPay" class="qr-img" />
            <div class="qr-amount">฿${fmtMoney(r.total)}</div>
            <div class="qr-pp">PromptPay: <b>${ppId}</b></div>
          </div>
        </div>
      ` : !isReceipt && !qrDataUrl ? `
        <div class="qr-section">
          <div class="qr-note" style="grid-column:1/-1">
            <b>📌 วิธีชำระ</b>
            กรุณาติดต่อผู้ดูแลเพื่อรับข้อมูลการชำระเงิน
          </div>
        </div>
      ` : "";

      const logoHtml = settings.apartmentLogo
        ? `<img src="${settings.apartmentLogo}" alt="logo" class="brand-logo-img" />`
        : `<div class="brand-icon">🏢</div>`;

      const aptInfo = (settings.apartmentAddress || settings.apartmentPhone)
        ? `<div class="brand-detail">
             ${settings.apartmentAddress ? `<span>📍 ${settings.apartmentAddress}</span>` : ""}
             ${settings.apartmentPhone ? `<span>📞 ${settings.apartmentPhone}</span>` : ""}
           </div>`
        : "";

      const footerText = isReceipt
        ? (settings.receiptFooter || "ขอบคุณที่ชำระค่าเช่า")
        : (settings.invoiceFooter || "ขอบคุณที่ชำระตรงเวลา");

      const win = window.open("", "_blank", "width=640,height=860");
      if (!win) { onClose(); return; }
      win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} ${billNo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:A5;margin:6mm}
  html,body{font-family:'Sarabun',sans-serif;background:#f1f5f9;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{padding:8px}
  .invoice{max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 28px rgba(15,23,42,0.08)}
  .head{background:${headColor};color:#fff;padding:14px 18px;position:relative;overflow:hidden}
  .head::after{content:"";position:absolute;right:-30px;top:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.08)}
  .head-top{display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;gap:12px}
  .brand{display:flex;align-items:center;gap:10px;min-width:0}
  .brand-icon{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
  .brand-logo-img{width:36px;height:36px;border-radius:10px;background:#fff;object-fit:contain;flex-shrink:0;padding:2px}
  .brand-name{font-size:13px;font-weight:800}
  .brand-sub{font-size:9.5px;opacity:.85;margin-top:1px}
  .brand-detail{font-size:8.5px;opacity:.85;margin-top:3px;display:flex;flex-direction:column;gap:1px}
  .bill-meta{text-align:right;font-size:9.5px;line-height:1.4;opacity:.95;flex-shrink:0}
  .bill-meta b{display:block;font-size:11px;font-weight:700;margin-top:1px;font-family:monospace}
  .title-row{margin-top:10px;position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-end;gap:8px}
  .title{font-size:16px;font-weight:800}
  .title-th{font-size:11px;opacity:.9}
  .title-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
  .title-sub{font-size:10px;opacity:.9}
  .stamp{display:inline-block;background:rgba(255,255,255,.22);padding:3px 10px;border-radius:99px;font-size:9.5px;font-weight:700;letter-spacing:.5px;border:1px solid rgba(255,255,255,.5);white-space:nowrap}

  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
  .info-label{font-size:8.5px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
  .info-value{font-size:12px;color:#0f172a;font-weight:700;margin-top:1px}

  .body{padding:12px 18px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  thead tr{background:#0f172a;color:#fff}
  th{padding:6px 8px;text-align:left;font-weight:700;font-size:10px;letter-spacing:.3px}
  th.c{text-align:center}th.r{text-align:right}
  tbody td{padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#334155}
  tbody tr:nth-child(even) td{background:#f8fafc}
  td.c{text-align:center}td.r{text-align:right;font-weight:600;color:#0f172a}
  td .note{color:#94a3b8;font-size:10px;font-weight:400}
  .meter-hint{font-size:9.5px;color:#64748b;margin-top:1px}

  .total-box{margin-top:10px;background:linear-gradient(135deg,#059669,#0891b2);color:#fff;border-radius:10px;padding:9px 14px;display:flex;justify-content:space-between;align-items:center}
  .total-label{font-size:11px;font-weight:600;opacity:.95}
  .total-value{font-size:18px;font-weight:800}

  .paid-info{margin-top:10px;background:#ecfdf5;border:1.5px solid #6ee7b7;border-radius:10px;padding:8px 12px}
  .paid-row{display:flex;justify-content:space-between;align-items:center;font-size:10.5px;padding:2px 0}
  .paid-label{color:#065f46;font-weight:600}
  .paid-value{color:#0f172a}
  .paid-value.mono{font-family:monospace;font-size:9.5px}
  .paid-value b{color:#065f46}

  .qr-section{display:grid;grid-template-columns:1fr 1.05fr;gap:10px;padding:0 18px 10px}
  .qr-note{background:#fefce8;border:1px dashed #eab308;border-radius:10px;padding:8px 10px;font-size:9.5px;color:#713f12;line-height:1.45}
  .qr-note b{color:#422006;display:block;margin-bottom:2px;font-size:10px}
  .qr-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;text-align:center}
  .qr-title{font-size:9px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
  .qr-img{width:100%;max-width:120px;height:auto;display:block;margin:0 auto;border-radius:5px}
  .qr-amount{font-size:12px;font-weight:800;color:#059669;margin-top:3px}
  .qr-pp{font-size:9px;color:#64748b;margin-top:1px}
  .qr-pp b{color:#0f172a;font-weight:700}

  .foot{background:#0f172a;color:#cbd5e1;padding:8px 18px;font-size:9.5px;display:flex;justify-content:space-between;align-items:center}
  .foot-msg{color:#e2e8f0;font-weight:600}
  .foot-date{font-size:9px;opacity:.8}

  @media print{
    body{background:#fff;padding:0}
    .invoice{box-shadow:none;border-radius:0;max-width:100%;page-break-inside:avoid}
    @page{size:A5;margin:5mm}
  }
</style></head>
<body>
  <div class="invoice">
    <div class="head">
      <div class="head-top">
        <div class="brand">
          ${logoHtml}
          <div style="min-width:0">
            <div class="brand-name">${aptName}</div>
            <div class="brand-sub">${isReceipt ? "ใบเสร็จรับเงิน · ค่าเช่า/น้ำ/ไฟ" : "ใบแจ้งค่าเช่า · ค่าน้ำ · ค่าไฟ"}</div>
            ${aptInfo}
          </div>
        </div>
        <div class="bill-meta">
          เลขที่<b>#${billNo}</b>
          วันที่<b>${issuedAt}</b>
        </div>
      </div>
      <div class="title-row">
        <div>
          <div class="title">${titleEn}</div>
          <div class="title-th">${title}</div>
        </div>
        <div class="title-right">
          <div class="title-sub">เดือน ${fmtMonth(r.billingMonth)}</div>
          ${isReceipt ? '<div class="stamp">✓ ชำระแล้ว</div>' : ""}
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div>
        <div class="info-label">ห้องเลขที่</div>
        <div class="info-value">${r.room?.roomNumber ?? r.roomId}</div>
      </div>
      <div>
        <div class="info-label">ผู้เช่า</div>
        <div class="info-value">${r.tenantName || "—"}</div>
      </div>
    </div>

    <div class="body">
      <table>
        <thead>
          <tr><th>รายการ</th><th class="c">หน่วย</th><th class="c">อัตรา</th><th class="r">จำนวนเงิน</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>ค่าไฟฟ้า<div class="meter-hint">มิเตอร์ ${r.prevElectric} → ${r.currElectric}</div></td>
            <td class="c">${eu}</td>
            <td class="c">฿${fmtMoney(r.electricRate)}</td>
            <td class="r">฿${fmtMoney(r.electricCost)}</td>
          </tr>
          <tr>
            <td>ค่าน้ำประปา<div class="meter-hint">มิเตอร์ ${r.prevWater} → ${r.currWater}</div></td>
            <td class="c">${wu}</td>
            <td class="c">฿${fmtMoney(r.waterRate)}</td>
            <td class="r">฿${fmtMoney(r.waterCost)}</td>
          </tr>
          <tr>
            <td>ค่าเช่าห้องพัก</td>
            <td class="c">1</td>
            <td class="c">฿${fmtMoney(r.rent)}</td>
            <td class="r">฿${fmtMoney(r.rent)}</td>
          </tr>
          ${otherRow}
        </tbody>
      </table>

      <div class="total-box">
        <span class="total-label">${isReceipt ? "ยอดเงินที่รับ" : "ยอดชำระรวม"}</span>
        <span class="total-value">฿${fmtMoney(r.total)}</span>
      </div>

      ${paidBlock}
    </div>

    ${qrBlock}

    <div class="foot">
      <span class="foot-msg">${footerText}</span>
      <span class="foot-date">พิมพ์ ${issuedAt}</span>
    </div>
  </div>
<script>window.onload=()=>setTimeout(()=>{window.print();},300);<\/script>
</body></html>`);
      win.document.close();
      onClose();
    })();
  }, [record, mode, settings, onClose]);

  return null;
}

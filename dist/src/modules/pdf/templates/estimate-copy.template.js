"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEstimateCopyHtml = buildEstimateCopyHtml;
function buildEstimateCopyHtml(data) {
    const notesSection = data.operationalNotes || data.settlementNotes
        ? `
    <div class="section-title">Notes</div>
    <table class="info-table">
      ${data.operationalNotes
            ? `<tr>
        <td class="field-label">Operational Notes</td>
        <td class="field-value" colspan="3">${data.operationalNotes}</td>
      </tr>`
            : ''}
      ${data.settlementNotes
            ? `<tr>
        <td class="field-label">Settlement Notes</td>
        <td class="field-value" colspan="3">${data.settlementNotes}</td>
      </tr>`
            : ''}
    </table>`
        : '';
    const termsSection = data.termsConditions
        ? `
    <div class="section-title">Terms &amp; Conditions</div>
    <div class="terms-box">${data.termsConditions}</div>`
        : '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sri Thangam Housing - Estimate Copy</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      background: #fff;
      padding: 10mm 15mm;
    }
    .company-header {
      text-align: center;
      border-bottom: 3px solid #8B0000;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .company-name {
      font-size: 26px;
      font-weight: 900;
      color: #8B0000;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .form-subtitle {
      font-size: 14px;
      font-weight: 600;
      color: #444;
      margin-top: 4px;
      letter-spacing: 1px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
      gap: 12px;
    }
    .meta-block {
      flex: 1;
      background: #f9f2f2;
      border: 1px solid #c0a0a0;
      padding: 8px 12px;
    }
    .meta-block .meta-line {
      display: flex;
      gap: 6px;
      margin-bottom: 4px;
      font-size: 12px;
    }
    .meta-block .meta-label {
      font-weight: 700;
      color: #8B0000;
      min-width: 110px;
    }
    .meta-block .meta-value {
      font-weight: 600;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      background: #8B0000;
      padding: 5px 10px;
      margin-bottom: 8px;
      margin-top: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .info-table td {
      padding: 5px 8px;
      border: 1px solid #ddd;
      vertical-align: top;
    }
    .info-table .field-label {
      font-weight: 700;
      color: #555;
      width: 25%;
      background: #fdf6f6;
    }
    .info-table .field-value {
      width: 25%;
    }
    .amount-words-box {
      border: 2px solid #8B0000;
      background: #fff8f8;
      padding: 10px 14px;
      margin-bottom: 12px;
      font-size: 13px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .amount-words-box .words-label {
      font-size: 11px;
      color: #8B0000;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .summary-box {
      width: 280px;
      margin-left: auto;
      border: 1px solid #c0a0a0;
      margin-bottom: 16px;
    }
    .summary-box table {
      width: 100%;
      border-collapse: collapse;
    }
    .summary-box table td {
      padding: 6px 10px;
      border-bottom: 1px solid #e0cece;
      font-size: 12px;
    }
    .summary-box table .sum-label {
      font-weight: 700;
      color: #555;
    }
    .summary-box table .sum-value {
      text-align: right;
      font-weight: 700;
    }
    .summary-box table tr:last-child td {
      border-bottom: none;
      background: #f0e0e0;
      font-size: 13px;
    }
    .terms-box {
      border: 1px solid #ddd;
      background: #fafafa;
      padding: 10px 12px;
      font-size: 11px;
      color: #444;
      line-height: 1.6;
      margin-bottom: 12px;
      white-space: pre-line;
    }
    .signature-section {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
    .signature-box {
      width: 220px;
      text-align: center;
    }
    .signature-img {
      max-width: 200px;
      max-height: 60px;
      margin-bottom: 6px;
    }
    .signature-line {
      border-top: 2px solid #1a1a1a;
      padding-top: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #444;
    }
    .footer-note {
      margin-top: 16px;
      font-size: 10px;
      color: #777;
      text-align: center;
      border-top: 1px solid #ddd;
      padding-top: 8px;
    }
    .amount-highlight {
      font-size: 20px;
      font-weight: 900;
      color: #8B0000;
    }
  </style>
</head>
<body>

  <div class="company-header">
    <div class="company-name">Sri Thangam Housing</div>
    <div class="form-subtitle">Estimate Copy / Receipt</div>
  </div>

  <div class="meta-row">
    <div class="meta-block">
      <div class="meta-line">
        <span class="meta-label">Billing ID</span>
        <span class="meta-value">${data.billingId}</span>
      </div>
      <div class="meta-line">
        <span class="meta-label">Billing Date</span>
        <span class="meta-value">${data.billingDate}</span>
      </div>
      <div class="meta-line">
        <span class="meta-label">Booking ID</span>
        <span class="meta-value">${data.bookingId}</span>
      </div>
    </div>
    <div class="meta-block">
      ${data.orderNumber ? `<div class="meta-line"><span class="meta-label">Order No.</span><span class="meta-value">${data.orderNumber}</span></div>` : ''}
      ${data.billingNumber ? `<div class="meta-line"><span class="meta-label">Billing No.</span><span class="meta-value">${data.billingNumber}</span></div>` : ''}
    </div>
  </div>

  <div class="section-title">Buyer Details</div>
  <table class="info-table">
    <tr>
      <td class="field-label">Name</td>
      <td class="field-value">${data.buyerName}</td>
      <td class="field-label">Phone</td>
      <td class="field-value">${data.buyerPhone}</td>
    </tr>
    <tr>
      <td class="field-label">Address</td>
      <td class="field-value" colspan="3">${data.buyerAddress || '-'}</td>
    </tr>
  </table>

  <div class="section-title">Property Details</div>
  <table class="info-table">
    <tr>
      <td class="field-label">Project Name</td>
      <td class="field-value">${data.projectName}</td>
      <td class="field-label">Plot No.</td>
      <td class="field-value">${data.plotNumber}</td>
    </tr>
    <tr>
      <td class="field-label">Sq. Ft</td>
      <td class="field-value">${data.squareFeet !== undefined ? data.squareFeet : '-'}</td>
      <td class="field-label">Booking Status</td>
      <td class="field-value">${data.bookingStatus}</td>
    </tr>
  </table>

  <div class="section-title">Payment Details</div>
  <table class="info-table">
    <tr>
      <td class="field-label">Payment Method</td>
      <td class="field-value">${data.paymentMethod}</td>
      <td class="field-label">Amount</td>
      <td class="field-value">
        <span class="amount-highlight">₹ ${data.amountInNumbers.toLocaleString('en-IN')}</span>
      </td>
    </tr>
  </table>

  <div class="amount-words-box">
    <div class="words-label">Amount in Words</div>
    Rupees: ${data.amountInWords}
  </div>

  <div class="summary-box">
    <table>
      <tr>
        <td class="sum-label">Total Received</td>
        <td class="sum-value">₹ ${data.totalReceived.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td class="sum-label">Total Balance</td>
        <td class="sum-value">₹ ${data.totalBalance.toLocaleString('en-IN')}</td>
      </tr>
    </table>
  </div>

  ${notesSection}
  ${termsSection}

  <div class="signature-section">
    <div class="signature-box">
      ${data.signatureUrl ? `<img src="${data.signatureUrl}" class="signature-img" alt="Authorized Signature" />` : '<div style="height:55px;"></div>'}
      <div class="signature-line">Authorized Signatory</div>
    </div>
  </div>

  <div class="footer-note">
    This is a computer-generated estimate copy. Sri Thangam Housing | All rights reserved.
  </div>

</body>
</html>`;
}
//# sourceMappingURL=estimate-copy.template.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBookingFormHtml = buildBookingFormHtml;
function buildBookingFormHtml(data) {
    const paymentRows = data.payments
        .map((p) => `
      <tr>
        <td>${p.paymentMethod || ''}</td>
        <td>${p.bankName || ''}</td>
        <td>${p.chequeNumber || ''}</td>
        <td>${p.gpayReference || ''}</td>
        <td style="text-align:right;">₹ ${p.totalAmount.toLocaleString('en-IN')}</td>
      </tr>`)
        .join('');
    const denominationRows = data.denominations
        .map((d) => `
      <tr>
        <td style="text-align:right;">₹ ${d.denomination}</td>
        <td style="text-align:right;">${d.count}</td>
        <td style="text-align:right;">₹ ${d.amount.toLocaleString('en-IN')}</td>
      </tr>`)
        .join('');
    const totalPayment = data.payments.reduce((sum, p) => sum + p.totalAmount, 0);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sri Thangam Housing - Booking Form</title>
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
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      background: #f9f2f2;
      border: 1px solid #c0a0a0;
    }
    .meta-table td {
      padding: 6px 10px;
      font-size: 12px;
    }
    .meta-table .label {
      font-weight: 700;
      color: #8B0000;
      width: 20%;
    }
    .meta-table .value {
      font-weight: 600;
      width: 30%;
      border-right: 1px solid #c0a0a0;
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
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .data-table th {
      background: #8B0000;
      color: #fff;
      padding: 6px 8px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      border: 1px solid #700000;
    }
    .data-table td {
      padding: 5px 8px;
      border: 1px solid #ddd;
      font-size: 11px;
    }
    .data-table tr:nth-child(even) td {
      background: #fdf6f6;
    }
    .data-table tfoot td {
      font-weight: 700;
      background: #f0e0e0;
      border-top: 2px solid #8B0000;
    }
    .signature-section {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
    .signature-box {
      width: 200px;
      text-align: center;
      border-top: 2px solid #1a1a1a;
      padding-top: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #444;
    }
    .signature-img {
      max-width: 180px;
      max-height: 60px;
      margin-bottom: 4px;
    }
    .footer-note {
      margin-top: 16px;
      font-size: 10px;
      color: #777;
      text-align: center;
      border-top: 1px solid #ddd;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <div class="company-header">
    <div class="company-name">Sri Thangam Housing</div>
    <div class="form-subtitle">Property Booking Form</div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="label">Booking ID</td>
      <td class="value">${data.bookingId}</td>
      <td class="label">Booking Date</td>
      <td class="value">${data.bookingDate}</td>
    </tr>
  </table>

  <div class="section-title">Applicant Details</div>
  <table class="info-table">
    <tr>
      <td class="field-label">Name</td>
      <td class="field-value">${data.applicantName}</td>
      <td class="field-label">S/o D/o</td>
      <td class="field-value">${data.relation}</td>
    </tr>
    <tr>
      <td class="field-label">Address</td>
      <td class="field-value" colspan="3">${data.applicantAddress}</td>
    </tr>
    <tr>
      <td class="field-label">PIN Code</td>
      <td class="field-value">${data.pinCode}</td>
      <td class="field-label">Cell Number</td>
      <td class="field-value">${data.cellNumber}</td>
    </tr>
    <tr>
      <td class="field-label">Date of Birth</td>
      <td class="field-value">${data.dateOfBirth || '-'}</td>
      <td class="field-label">Wedding Day</td>
      <td class="field-value">${data.weddingDay || '-'}</td>
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
      <td class="field-value" colspan="3">${data.squareFeet !== undefined ? data.squareFeet : '-'}</td>
    </tr>
  </table>

  <div class="section-title">Reference Details</div>
  <table class="info-table">
    <tr>
      <td class="field-label">ED/DD/SM/BM Name</td>
      <td class="field-value">${data.edDdSmBmName || '-'}</td>
      <td class="field-label">Reference Code</td>
      <td class="field-value">${data.referenceCode || '-'}</td>
    </tr>
    <tr>
      <td class="field-label">Director Name</td>
      <td class="field-value" colspan="3">${data.directorName || '-'}</td>
    </tr>
  </table>

  <div class="section-title">Payment Details</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Method</th>
        <th>Bank</th>
        <th>Cheque No.</th>
        <th>GPay Ref.</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${paymentRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align:right; font-weight:700;">Total</td>
        <td style="text-align:right; font-weight:700;">₹ ${totalPayment.toLocaleString('en-IN')}</td>
      </tr>
    </tfoot>
  </table>

  <div class="section-title">Cash Denomination Details</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="text-align:right;">Denomination</th>
        <th style="text-align:right;">Count</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${denominationRows}
    </tbody>
  </table>

  <div class="signature-section">
    <div class="signature-box">
      ${data.signatureUrl ? `<img src="${data.signatureUrl}" class="signature-img" alt="Signature" />` : '<div style="height:50px;"></div>'}
      Applicant Signature
    </div>
  </div>

  <div class="footer-note">
    This is a computer-generated booking form. Sri Thangam Housing | All rights reserved.
  </div>

</body>
</html>`;
}
//# sourceMappingURL=booking-form.template.js.map
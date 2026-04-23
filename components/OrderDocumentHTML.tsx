import { OrderDocument } from '@/types/material-order';
import { formatWeight, formatTotalWeight } from '@/lib/utils/format';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

export const generatePDFContent = (data: OrderDocument, options?: { hidePrintButton?: boolean; watermarkText?: string; hideWatermark?: boolean }): string => {
  // 行のタイプ定義
  type TableRow = {
    type: 'category-header';
    categoryName: string;
  } | {
    type: 'item';
    item: typeof data.items[0];
  };

  // カテゴリごとにグループ化
  const categoryMap = new Map<string, typeof data.items>();
  data.items.forEach(item => {
    if (!categoryMap.has(item.categoryName)) {
      categoryMap.set(item.categoryName, []);
    }
    categoryMap.get(item.categoryName)!.push(item);
  });

  // カテゴリヘッダー行と資材行を含む全行リストを作成
  const allRows: TableRow[] = [];
  categoryMap.forEach((items, categoryName) => {
    // カテゴリヘッダー行を追加
    allRows.push({ type: 'category-header', categoryName });
    // そのカテゴリの資材行を追加
    items.forEach(item => {
      allRows.push({ type: 'item', item });
    });
  });

  // 30行ごとに列分割
  const itemsPerColumn =30;
  const columns: TableRow[][] = [];
  for (let i = 0; i < allRows.length; i += itemsPerColumn) {
    columns.push(allRows.slice(i, i + itemsPerColumn));
  }

  // アイテムが2個以上の場合は最小2列を保証
  const itemCount = allRows.filter(r => r.type === 'item').length;
  if (columns.length === 1 && itemCount > 1) {
    const allRowsInColumn = columns[0];
    const midPoint = Math.ceil(allRowsInColumn.length / 2);
    columns[0] = allRowsInColumn.slice(0, midPoint);
    columns.push(allRowsInColumn.slice(midPoint));
  }

  // 2列ごとにページを分ける
  const pages: TableRow[][][] = [];
  for (let i = 0; i < columns.length; i += 2) {
    pages.push(columns.slice(i, i + 2));
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <title>${data.siteName || '現場名未設定'}-${data.orderDate.split('T')[0].replace(/-/g, '')}</title>
      <style>
        :root {
          --ink: #0a0a0a;
          --ink-soft: #525252;
          --ink-mute: #6b6b6b;
          --rule: #0a0a0a;
          --rule-soft: #9a9a9a;
          --rule-mute: #c7c7c7;
          --row-alt: #fafafa;
          --band: #f1f1f1;
          --panel: #f8f8f8;
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.5;
          color: var(--ink);
          padding: 16px;
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
          font-feature-settings: "palt";
          -webkit-font-smoothing: antialiased;
        }

        .print-content {
          display: block;
          max-width: 880px;
          margin: 0 auto;
          position: relative;
          min-height: 600px;
        }

        /* ===== Title ===== */
        .title {
          text-align: center;
          margin-bottom: 18px;
          padding-bottom: 10px;
          position: relative;
        }
        .title h1 {
          font-size: 30px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.45em;
          padding-left: 0.45em;
          color: var(--ink);
          line-height: 1.2;
        }
        .title::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 22%;
          right: 22%;
          border-top: 2px solid var(--rule);
          border-bottom: 1px solid var(--rule);
          height: 4px;
        }
        .title .page-indicator {
          display: block;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.12em;
          color: var(--ink-mute);
          margin-top: 6px;
          font-variant-numeric: tabular-nums;
        }

        /* ===== Info section ===== */
        .info-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 20px;
          row-gap: 8px;
          margin-bottom: 16px;
          padding: 14px 18px;
          background: var(--panel);
          border: 1.5px solid var(--rule);
        }
        .info-row {
          font-size: 15px;
          display: flex;
          align-items: baseline;
          gap: 10px;
          min-width: 0;
        }
        .info-row-full { grid-column: 1 / -1; }
        .info-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: var(--ink-mute);
          min-width: 64px;
          flex-shrink: 0;
        }
        .info-row span:not(.info-label) {
          font-weight: 600;
          color: var(--ink);
          min-width: 0;
          word-break: break-all;
        }

        /* ===== Tables ===== */
        .tables-container {
          display: flex;
          gap: 14px;
          margin-bottom: 8px;
          justify-content: space-between;
          width: 100%;
          overflow: hidden;
        }
        .table-column {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          overflow: hidden;
          border: 1.5px solid var(--rule);
          font-variant-numeric: tabular-nums;
        }
        thead th {
          background: var(--band);
          color: var(--ink);
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.1em;
          padding: 8px 6px;
          border-right: 1px solid var(--rule-soft);
          border-bottom: 1.5px solid var(--rule);
          word-break: break-word;
          overflow-wrap: break-word;
        }
        thead th:last-child { border-right: none; }
        td {
          padding: 6px 8px;
          border-right: 1px solid var(--rule-mute);
          border-bottom: 1px solid var(--rule-mute);
          vertical-align: middle;
          line-height: 1.35;
          word-break: break-word;
          overflow-wrap: break-word;
          font-size: 14px;
        }
        td:last-child { border-right: none; }
        tr:last-child td { border-bottom: none; }
        .row-alternate { background-color: var(--row-alt); }

        .category-header-row td {
          background: var(--band);
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.1em;
          padding: 7px 10px !important;
          text-align: left !important;
          border-top: 1px solid var(--rule);
          border-bottom: 1px solid var(--rule);
          color: var(--ink);
        }

        /* ===== Total ===== */
        .total-section {
          margin-top: 14px;
          padding: 14px 18px;
          border: 2px solid var(--rule);
          background: var(--panel);
          display: flex;
          justify-content: flex-end;
          align-items: baseline;
          gap: 16px;
        }
        .total-label {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: var(--ink-soft);
        }
        .total-value {
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--ink);
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }

        /* ===== Note (kept for backward compat) ===== */
        .note-section {
          margin-top: 12px;
          padding: 10px 14px;
          border: 1.5px solid var(--rule);
          background: var(--panel);
        }
        .note-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: var(--ink-mute);
          margin-bottom: 6px;
        }
        .note-text {
          font-size: 14px;
          line-height: 1.5;
          color: var(--ink);
          white-space: pre-wrap;
        }

        /* ===== Print button (screen only) ===== */
        .print-button {
          background: var(--ink);
          color: #fff;
          border: none;
          padding: 11px 22px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 18px;
          letter-spacing: 0.02em;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .print-button:hover { background: #1c1917; }
        .print-button:active { transform: scale(0.99); }

        .page-break { page-break-after: always; }

        /* ===== Watermark ===== */
        .watermark-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
          user-select: none;
          overflow: hidden;
        }
        .print-content > *:not(.watermark-container) {
          position: relative;
          z-index: 1;
        }
        .watermark {
          position: absolute;
          font-size: 16px;
          font-weight: 600;
          color: rgba(10, 10, 10, 0.06);
          white-space: nowrap;
          letter-spacing: 0.1em;
          transform: translate(-50%, -50%) rotate(-30deg);
        }

        /* ===== Tablet (medium screens) ===== */
        @media screen and (max-width: 900px) {
          .title h1 { font-size: 26px; letter-spacing: 0.35em; padding-left: 0.35em; }
          .info-section { column-gap: 14px; padding: 12px 14px; }
          body { padding: 12px; }
        }

        /* ===== Print media ===== */
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body {
            width: 100% !important;
            height: 100svh !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            margin: 0 !important;
            padding: 0 10mm !important;
            position: relative;
            font-size: 9pt !important;
          }
          .print-button { display: none !important; }
          .print-content {
            max-width: 100% !important;
            margin: 0 !important;
          }
          .watermark-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 9999 !important;
            pointer-events: none !important;
          }
          .watermark { font-size: 10pt !important; }
          .print-content {
            position: relative !important;
            padding: 3mm 0 !important;
            width: 100% !important;
            overflow: hidden !important;
            page-break-inside: avoid;
          }
          .title {
            margin-bottom: 3mm !important;
            padding-bottom: 2mm !important;
          }
          .title h1 {
            font-size: 16pt !important;
            line-height: 1.2 !important;
            letter-spacing: 0.4em !important;
            padding-left: 0.4em !important;
          }
          .title .page-indicator {
            font-size: 8pt !important;
            margin-top: 1mm !important;
          }
          .info-section {
            margin-bottom: 2.5mm !important;
            padding: 2mm 3mm !important;
            grid-template-columns: 1fr 1fr !important;
            column-gap: 6mm !important;
            row-gap: 1mm !important;
            border-width: 1pt !important;
          }
          .info-row { font-size: 10pt !important; line-height: 1.3 !important; }
          .info-label {
            font-size: 8pt !important;
            min-width: 14mm !important;
          }
          .tables-container { width: 100% !important; gap: 4mm !important; }
          table { font-size: 8pt !important; line-height: 1.1 !important; border-width: 1pt !important; }
          thead th {
            font-size: 8pt !important;
            padding: 2pt 2pt !important;
            line-height: 1.1 !important;
          }
          td {
            font-size: 8pt !important;
            padding: 1pt 3pt !important;
            height: 18pt !important;
            line-height: 1.1 !important;
          }
          .category-header-row td {
            font-size: 9pt !important;
            padding: 2pt 4pt !important;
          }
          .total-section {
            margin-top: 3mm !important;
            padding: 2.5mm 4mm !important;
            border-width: 1.5pt !important;
          }
          .total-label { font-size: 11pt !important; }
          .total-value { font-size: 16pt !important; }
          .note-section {
            margin-top: 2mm !important;
            padding: 2mm 3mm !important;
          }
          .note-label { font-size: 8pt !important; }
          .note-text { font-size: 9pt !important; }
        }

        /* ===== Mobile (screen, <=767px) ===== */
        @media screen and (max-width: 767px) {
          body { font-size: 14px; padding: 10px; }
          .print-content { max-width: 100%; }
          .title { margin-bottom: 14px; padding-bottom: 8px; }
          .title h1 {
            font-size: 20px;
            letter-spacing: 0.2em;
            padding-left: 0.2em;
          }
          .title .page-indicator { font-size: 11px; }

          .info-section {
            grid-template-columns: 1fr;
            column-gap: 0;
            row-gap: 6px;
            padding: 12px 14px;
          }
          .info-row { font-size: 14px; }
          .info-label { min-width: 64px; font-size: 11px; }

          .watermark { font-size: 14px; }

          /* Tables container: 2-column grid on mobile (matches PC) */
          .tables-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .table-column {
            display: block;
            width: auto;
            flex: none;
            margin-bottom: 0;
            min-width: 0;
          }

          /* Item row — CSS Grid card layout */
          table {
            table-layout: auto;
            border: 1.5px solid var(--rule);
          }
          thead { display: none; }

          tbody tr:not(.category-header-row) {
            display: grid;
            grid-template-areas:
              "name name name"
              "qty  unit total";
            grid-template-columns: 1fr 1fr 1fr;
            border-bottom: 1px solid var(--rule-mute);
            background: transparent;
          }
          tbody tr:not(.category-header-row):last-child { border-bottom: none; }
          tbody tr:not(.category-header-row).row-alternate {
            background: var(--row-alt);
          }

          tbody tr:not(.category-header-row) td {
            border: none;
            padding: 0;
          }

          /* Name row (full width within card) */
          tbody tr:not(.category-header-row) td:nth-child(1) {
            grid-area: name;
            padding: 7px 8px 5px;
            font-size: 12px;
            font-weight: 700;
            line-height: 1.35;
            white-space: normal;
            text-align: left !important;
            border-bottom: 1px solid var(--rule-mute);
            word-break: break-word;
          }

          /* Value cells (数量 / 単重 / 合計) */
          tbody tr:not(.category-header-row) td:nth-child(2),
          tbody tr:not(.category-header-row) td:nth-child(3),
          tbody tr:not(.category-header-row) td:nth-child(4) {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 5px 2px 7px;
            border-right: 1px solid var(--rule-mute);
            box-sizing: border-box;
            white-space: normal;
            font-size: 13px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            text-align: center !important;
            line-height: 1.25;
          }
          tbody tr:not(.category-header-row) td:nth-child(2) { grid-area: qty; }
          tbody tr:not(.category-header-row) td:nth-child(3) { grid-area: unit; }
          tbody tr:not(.category-header-row) td:nth-child(4) {
            grid-area: total;
            border-right: none;
            font-weight: 700;
            color: var(--ink);
          }

          /* Label pseudo-elements (shortened for 2-col mobile) */
          tbody tr:not(.category-header-row) td:nth-child(2)::before,
          tbody tr:not(.category-header-row) td:nth-child(3)::before,
          tbody tr:not(.category-header-row) td:nth-child(4)::before {
            font-size: 9px;
            color: var(--ink-mute);
            font-weight: 700;
            letter-spacing: 0.1em;
            width: 100%;
            text-align: center;
            padding: 0 0 3px;
          }
          tbody tr:not(.category-header-row) td:nth-child(2)::before { content: "数量"; }
          tbody tr:not(.category-header-row) td:nth-child(3)::before { content: "単重"; }
          tbody tr:not(.category-header-row) td:nth-child(4)::before { content: "合計"; }

          .category-header-row { display: block; }
          .category-header-row td {
            display: block;
            text-align: left !important;
            padding: 6px 12px !important;
            font-size: 13px !important;
          }

          .total-section {
            padding: 14px 16px;
            flex-direction: row;
            justify-content: space-between;
            align-items: baseline;
          }
          .total-label { font-size: 13px; letter-spacing: 0.14em; }
          .total-value { font-size: 26px; }
        }
      </style>
    </head>
    <body>
      ${!options?.hidePrintButton ? '<button class="print-button" onclick="window.print()">印刷 / PDFに保存</button>' : ''}

      ${pages.map((pageColumns, pageIndex) => `
      <div class="print-content ${pageIndex < pages.length - 1 ? 'page-break' : ''}">
        ${options?.hideWatermark ? '' : `<div class="watermark-container">
          ${(() => {
            const watermarks = [];
            const rows = 8;
            const spacingPct = 20; // 列間隔（％）: 0, 20, 40, 60, 80, 100 → 6列
            const rowStep = 100 / (rows - 1);

            for (let row = 0; row < rows; row++) {
              for (let colPct = 0; colPct <= 100; colPct += spacingPct) {
                // 奇数列を少しずらしてハニカム的な分布に
                const isOddCol = Math.floor(colPct / spacingPct) % 2 === 1;
                const top = (row * rowStep) + (isOddCol ? rowStep / 2 : 0);
                watermarks.push(`<div class="watermark" style="top: ${top}%; left: ${colPct}%;">${options?.watermarkText || '株式会社　櫻建'}</div>`);
              }
            }

            return watermarks.join('');
          })()}
        </div>`}
        <div class="title">
          <h1>資材発注書</h1>
          ${pages.length > 1 ? `<span class="page-indicator">${pageIndex + 1} / ${pages.length}</span>` : ''}
        </div>

        <div class="info-section">
          ${data.siteName ? `
          <div class="info-row info-row-full">
            <span class="info-label">現場名:</span>
            <span>${data.siteName}</span>
          </div>` : ''}
          <div class="info-row">
            <span class="info-label">発注日:</span>
            <span>${formatDate(data.orderDate)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">注文者:</span>
            <span>${data.ordererName}</span>
          </div>
          ${data.contactInfo ? `
          <div class="info-row">
            <span class="info-label">連絡先:</span>
            <span>${data.contactInfo}</span>
          </div>` : ''}
          ${data.loadingDate ? `
          <div class="info-row">
            <span class="info-label">積込日:</span>
            <span>${formatDate(data.loadingDate)}</span>
          </div>` : ''}
        </div>

        ${data.items.length > 0 ? `
        <div class="tables-container">
          ${pageColumns.map((columnItems) => `
          <div class="table-column">
            <table>
              <thead>
                <tr>
                  <th style="text-align: left; width: 46%;">資材名</th>
                  <th style="text-align: right; width: 18%;">数量</th>
                  <th style="text-align: right; width: 16%;">単重</th>
                  <th style="text-align: right; width: 20%;">合計</th>
                </tr>
              </thead>
              <tbody>
                ${columnItems.filter(row => row.type === 'item').map((row, rowIndex) => {
                  if (row.type !== 'item') return '';
                  return `
                <tr ${rowIndex % 2 === 1 ? 'class="row-alternate"' : ''}>
                  <td style="font-weight: bold; white-space: normal; line-height: 1.3;">${row.item.name}</td>
                  <td style="text-align: right; font-weight: bold;">${row.item.quantity}</td>
                  <td style="text-align: right;">${formatWeight(row.item.weightPerUnit).replace('kg', '')}</td>
                  <td style="text-align: right; font-weight: bold;">${formatWeight(row.item.totalWeight).replace('kg', '')}</td>
                </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`).join('')}
        </div>` : ''}

        ${pageIndex === pages.length - 1 ? `
        <div class="total-section">
          <span class="total-label">合計重量:</span>
          <span class="total-value">${formatTotalWeight(data.totalWeight)}</span>
        </div>` : ''}
      </div>`).join('')}
    </body>
    </html>
  `;
};

export const printToPDF = (data: OrderDocument, options?: { watermarkText?: string }): void => {
  // iframeを使ってポップアップブロックを回避
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.zIndex = '9999';

  document.body.appendChild(iframe);

  const htmlContent = generatePDFContent(data, { watermarkText: options?.watermarkText });

  if (iframe.contentDocument) {
    iframe.contentDocument.open();
    iframe.contentDocument.write(htmlContent);
    iframe.contentDocument.close();

    // 印刷ダイアログが閉じられたらiframeを削除
    if (iframe.contentWindow) {
      iframe.contentWindow.onafterprint = () => {
        document.body.removeChild(iframe);
      };

      // 少し待ってから印刷ダイアログを開く（コンテンツの読み込みを待つ）
      setTimeout(() => {
        iframe.contentWindow?.print();
      }, 100);
    }
  }
};
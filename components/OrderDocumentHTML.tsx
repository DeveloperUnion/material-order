import { OrderDocument } from '@/types/material-order';
import { formatWeight, formatTotalWeight } from '@/lib/utils/format';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

export const generatePDFContent = (data: OrderDocument, options?: { hidePrintButton?: boolean; watermarkText?: string }): string => {
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

  // 最小2列を保証
  if (columns.length === 1 && allRows.length > 0) {
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
        * {
          box-sizing: border-box;
        }
        html, body {
          margin: 0;
          padding: 0;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
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
          }
          .print-button {
            display: none !important;
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
          .watermark {
            font-size: 10pt !important;
          }
          .print-content {
            position: relative !important;
            padding: 3mm 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
            page-break-inside: avoid;
          }
          .title {
            margin-bottom: 2mm !important;
          }
          .title h1 {
            margin-bottom: 1mm !important;
            padding-bottom: 1mm !important;
          }
          .info-section {
            margin-bottom: 1mm !important;
            padding: 2pt 4pt !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 0.5mm 0mm !important;
          }
          .info-row-full {
            grid-column: 1 / -1 !important;
          }
          .tables-container {
            width: 100% !important;
          }
          table {
            font-size: 7pt !important;
            line-height: 1.0 !important;
          }
          th {
            font-size: 7pt !important;
            padding: 2pt !important;
            line-height: 1.0 !important;
          }
          td {
            font-size: 7pt !important;
            padding: 0 2pt !important;
            height: 17pt !important;
            line-height: 1.0 !important;
          }
          .title h1 {
            font-size: 14pt !important;
            line-height: 1.2 !important;
          }
          .info-row {
            font-size: 10pt !important;
            line-height: 1.3 !important;
          }
          .info-label {
            font-size: 10pt !important;
            line-height: 1.3 !important;
          }
          .total-label {
            font-size: 11pt !important;
            line-height: 1.3 !important;
          }
          .total-value {
            font-size: 12pt !important;
            line-height: 1.3 !important;
          }
          .note-label {
            font-size: 10pt !important;
            line-height: 1.3 !important;
          }
          .note-text {
            font-size: 9pt !important;
            line-height: 1.3 !important;
          }
          .category-header-row td {
            font-size: 9pt !important;
            padding: 0 2pt !important;
          }
          .total-section {
            margin-top: 1mm !important;
            padding: 2mm !important;
          }
          .note-section {
            margin-top: 1mm !important;
            padding: 2mm !important;
          }
        }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 12px;
          line-height: 1.2;
          color: #000;
          padding: 6px;
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
        }
        .print-content {
          display: block;
          max-width: 100%;
          position: relative;
        }
        .title {
          text-align: center;
          margin-bottom: 4px;
        }
        .title h1 {
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 3px 0;
          border-bottom: 1px solid #333;
          padding-bottom: 3px;
        }
        .info-section {
          margin-bottom: 5px;
          padding: 6px;
          background-color: #f8fafc;
          border: 2px solid #000;
          border-radius: 4px;
        }
        .info-row {
          margin-bottom: 2px;
          font-size: 16px;
        }
        .info-label {
          font-weight: bold;
          min-width: 60px;
          display: inline-block;
          font-size: 16px;
        }
        .tables-container {
          display: flex;
          gap: 6px;
          margin-bottom: 5px;
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
          border: 2px solid #000;
          table-layout: fixed;
          overflow: hidden;
        }
        th {
          border: 1px solid #000;
          padding: 0 2px;
          background-color: #475569;
          color: white;
          font-weight: bold;
          font-size: 14px;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        td {
          border: 1px solid #000;
          padding: 0 2px;
          height: auto;
          vertical-align: middle;
          line-height: 1.3;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .row-alternate {
          background-color: #f7fafc;
        }
        .category-header-row {
          background-color: #cbd5e1;
          font-weight: bold;
          text-align: center;
        }
        .category-header-row td {
          font-size: 15px;
          padding: 0 4px;
        }
        .total-section {
          margin-top: 5px;
          padding: 6px;
          background-color: #f8fafc;
          border-radius: 4px;
          border: 2px solid #000;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .total-label {
          font-size: 18px;
          font-weight: bold;
          color: #1a1a1a;
        }
        .total-value {
          font-size: 20px;
          font-weight: bold;
          color: #1e293b;
        }
        .note-section {
          margin-top: 5px;
          padding: 6px;
          background-color: #f8fafc;
          border-radius: 4px;
          border: 2px solid #000;
        }
        .note-label {
          font-size: 16px;
          font-weight: bold;
          color: #333;
          margin-bottom: 3px;
        }
        .note-text {
          font-size: 15px;
          line-height: 1.3;
          color: #1a1a1a;
          white-space: pre-wrap;
        }
        .print-button {
          background: linear-gradient(to right, #1e293b, #334155);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 20px;
          transition: all 0.2s ease;
        }
        .print-button:hover {
          background: linear-gradient(to right, #0f172a, #1e293b);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .page-break {
          page-break-after: always;
        }
        .watermark-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          pointer-events: none;
          user-select: none;
          overflow: visible;
        }
        .watermark {
          position: absolute;
          font-size: 18px;
          font-weight: bold;
          color: rgba(0, 0, 0, 0.07);
          white-space: nowrap;
          transform: translate(-50%, -50%) rotate(-45deg);
        }
        @media screen and (max-width: 767px) {
          .watermark {
            font-size: 16px;
          }
          /* スマホ用2行レイアウト */
          table {
            table-layout: auto;
          }
          thead {
            display: none;
          }
          tbody tr:not(.category-header-row) {
            display: flex;
            flex-wrap: wrap;
            border: 1px solid #000;
            margin-bottom: 0;
          }
          tbody tr:not(.category-header-row) td {
            border: none;
            border-bottom: 0.5px solid #ccc;
          }
          tbody tr:not(.category-header-row) td:first-child {
            width: 100%;
            text-align: left;
            background-color: #f1f5f9;
            padding: 2px 8px;
            font-size: 12px;
            white-space: normal;
          }
          tbody tr:not(.category-header-row) td:nth-child(2),
          tbody tr:not(.category-header-row) td:nth-child(3),
          tbody tr:not(.category-header-row) td:nth-child(4) {
            width: 33.333%;
            flex: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 0;
            border-bottom: none;
            border-right: 1px solid #000;
            box-sizing: border-box;
            white-space: normal;
          }
          tbody tr:not(.category-header-row) td:nth-child(2)::before,
          tbody tr:not(.category-header-row) td:nth-child(3)::before,
          tbody tr:not(.category-header-row) td:nth-child(4)::before {
            font-size: 9px;
            color: #666;
            font-weight: normal;
            width: 100%;
            text-align: center;
            border-bottom: 0.5px solid #ccc;
            padding: 1px 0;
          }
          tbody tr:not(.category-header-row) td:nth-child(2)::before {
            content: "数量";
          }
          tbody tr:not(.category-header-row) td:nth-child(3)::before {
            content: "単重(kg)";
          }
          tbody tr:not(.category-header-row) td:nth-child(4)::before {
            content: "合計(kg)";
          }
          tbody tr:not(.category-header-row) td:nth-child(4) {
            border-right: none;
          }
                    .category-header-row {
            display: block;
            margin-top: 0;
          }
          .category-header-row td {
            display: block;
            text-align: center;
          }
        }
      </style>
    </head>
    <body>
      ${!options?.hidePrintButton ? '<button class="print-button" onclick="window.print()">印刷 / PDFに保存</button>' : ''}

      ${pages.map((pageColumns, pageIndex) => `
      <div class="print-content ${pageIndex < pages.length - 1 ? 'page-break' : ''}">
        <div class="watermark-container">
          ${(() => {
            const watermarks = [];
            const rows = 8;
            const spacingVw = 25;

            for (let row = 0; row < rows; row++) {
              for (let colVw = 0; colVw <= 100; colVw += spacingVw) {
                const top = (row * (100 / (rows - 1))) + (Math.floor(colVw / spacingVw) % 2 === 0 ? 0 : 5);
                watermarks.push(`<div class="watermark" style="top: ${top}%; left: ${colVw}vw;">${options?.watermarkText || '株式会社　櫻建'}</div>`);
              }
            }

            return watermarks.join('');
          })()}
        </div>
        <div class="title">
          <h1>資材発注書${pages.length > 1 ? ` (${pageIndex + 1}/${pages.length})` : ''}</h1>
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
                ${columnItems.map((row, rowIndex) => {
                  if (row.type === 'category-header') {
                    return `
                <tr class="category-header-row">
                  <td colspan="4">${row.categoryName}</td>
                </tr>`;
                  } else {
                    // 同一カテゴリ内でのアイテムインデックスを計算（縞模様用）
                    let itemIndexInCategory = 0;
                    for (let i = rowIndex - 1; i >= 0; i--) {
                      if (columnItems[i].type === 'category-header') break;
                      itemIndexInCategory++;
                    }
                    return `
                <tr ${itemIndexInCategory % 2 === 1 ? 'class="row-alternate"' : ''}>
                  <td style="font-weight: bold; white-space: normal; line-height: 1.3;">${row.item.name}</td>
                  <td style="text-align: right; font-weight: bold;">${row.item.quantity}</td>
                  <td style="text-align: right;">${formatWeight(row.item.weightPerUnit).replace('kg', '')}</td>
                  <td style="text-align: right; font-weight: bold;">${formatWeight(row.item.totalWeight).replace('kg', '')}</td>
                </tr>`;
                  }
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
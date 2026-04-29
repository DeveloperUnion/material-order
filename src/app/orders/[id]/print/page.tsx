"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generatePDFContent } from '@/components/OrderDocumentHTML';
import { ArrowLeft, Printer } from 'lucide-react';
import { useTenant } from '@/lib/tenant/context';
import { OrderDocument } from '@/types/material-order';

interface OrderDetail {
  id: string;
  orderNumber: string;
  customerName: string;
  customerAddress: string;
  contactInfo: string;
  loadingDate: string | null;
  deliveryDate: string;
  shippingAddress: string;
  truckId: string | null;
  truckName: string | null;
  truckCapacityKg: number | null;
  totalWeight: number;
  status: string;
  createdAt: string;
  items: Array<{
    materialId: string;
    productName: string;
    categoryName: string;
    quantity: number;
    weightPerUnit: number;
    totalWeight: number;
    notes: string | null;
  }>;
}

export default function OrderPrintPage() {
  const params = useParams();
  const router = useRouter();
  const { config } = useTenant();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [orderDocument, setOrderDocument] = useState<OrderDocument | null>(null);
  const [showWatermark, setShowWatermark] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchOrderDetail = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/orders/${id}`);
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      const data = await response.json();
      setOrder(data.order);

      const nextOrderDocument: OrderDocument = {
        orderDate: data.order.deliveryDate || data.order.createdAt,
        ordererName: data.order.customerAddress || '担当者',
        siteName: data.order.customerName,
        contactInfo: data.order.contactInfo,
        loadingDate: data.order.loadingDate || undefined,
        truckId: data.order.truckId ?? null,
        truckName: data.order.truckName ?? null,
        truckCapacityKg: data.order.truckCapacityKg ?? null,
        items: data.order.items.map((item: OrderDetail['items'][0]) => ({
          id: `${data.order.id}-${item.productName}`,
          name: item.productName,
          categoryName: item.categoryName,
          quantity: item.quantity,
          weightPerUnit: item.weightPerUnit,
          totalWeight: item.totalWeight
        })),
        totalWeight: data.order.totalWeight,
      };
      setOrderDocument(nextOrderDocument);

      document.title = `${nextOrderDocument.siteName || '現場名未設定'}-${nextOrderDocument.orderDate.split('T')[0].replace(/-/g, '')}`;

      if (data.order.status !== 'completed') {
        await fetch(`/api/orders/${data.order.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectName: data.order.customerName,
            personInCharge: data.order.customerAddress,
            contactInfo: data.order.contactInfo,
            loadingDate: data.order.loadingDate,
            orderDate: data.order.deliveryDate || data.order.createdAt,
            deliveryDate: data.order.deliveryDate,
            notes: data.order.shippingAddress,
            status: 'completed',
            items: data.order.items.map((item: OrderDetail['items'][0]) => ({
              materialId: item.materialId,
              quantity: item.quantity,
              totalWeightKg: item.totalWeight,
              notes: item.notes
            }))
          }),
        });
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      alert('発注書の読み込みに失敗しました');
      router.push('/order-history');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (params.id) {
      fetchOrderDetail(params.id as string);
    }
  }, [params.id, fetchOrderDetail]);

  useEffect(() => {
    if (!orderDocument) return;
    const content = generatePDFContent(orderDocument, {
      hidePrintButton: true,
      watermarkText: config.title,
      hideWatermark: !showWatermark,
    });
    setHtmlContent(content);
  }, [orderDocument, showWatermark, config.title]);

  useEffect(() => {
    if (htmlContent && iframeRef.current && iframeRef.current.contentDocument) {
      const iframeDoc = iframeRef.current.contentDocument;
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
    }
  }, [htmlContent]);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-border border-t-accent mx-auto" />
          <p className="mt-4 text-sm text-muted">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!order || !htmlContent) {
    return (
      <div className="flex items-center justify-center h-screen bg-background px-4">
        <div className="text-center max-w-sm">
          <p className="text-sm text-muted mb-5">発注書が見つかりません</p>
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 bg-foreground text-background font-semibold text-sm rounded-md hover:bg-foreground/90 transition-colors"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      {/* Print toolbar (hidden on print) */}
      <div className="print:hidden bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 px-2 py-1.5 -ml-2 text-sm text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 px-3 h-10 border border-border bg-surface rounded-md">
              <span className="text-sm font-medium text-foreground select-none">透かし</span>
              <button
                type="button"
                role="switch"
                aria-checked={showWatermark}
                aria-label="透かしの表示切替"
                onClick={() => setShowWatermark((v) => !v)}
                className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                  showWatermark ? 'bg-accent' : 'bg-border-strong'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    showWatermark ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 h-10 px-3 sm:px-4 bg-foreground text-background text-sm font-semibold rounded-md hover:bg-foreground/90 transition-colors whitespace-nowrap"
            >
              <Printer className="h-4 w-4" />
              <span>印刷 / PDFに保存</span>
            </button>
          </div>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        className="block w-full h-[calc(100vh-120px)] sm:h-[calc(100vh-136px)] border-none bg-surface"
        title="発注書印刷プレビュー"
      />
    </div>
  );
}

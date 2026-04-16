"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generatePDFContent } from '@/components/OrderDocumentHTML';
import { ArrowLeft, Printer } from 'lucide-react';
import { useTenant } from '@/lib/tenant/context';

interface OrderDetail {
  id: string;
  orderNumber: string;
  customerName: string;
  customerAddress: string;
  contactInfo: string;
  loadingDate: string | null;
  deliveryDate: string;
  shippingAddress: string;
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

      const orderDocument = {
        orderDate: data.order.deliveryDate || data.order.createdAt,
        ordererName: data.order.customerAddress || '担当者',
        siteName: data.order.customerName,
        contactInfo: data.order.contactInfo,
        loadingDate: data.order.loadingDate || undefined,
        items: data.order.items.map((item: OrderDetail['items'][0]) => ({
          id: `${data.order.id}-${item.productName}`,
          name: item.productName,
          categoryName: item.categoryName,
          quantity: item.quantity,
          weightPerUnit: item.weightPerUnit,
          totalWeight: item.totalWeight
        })),
        totalWeight: data.order.totalWeight,
        note: data.order.shippingAddress || ''
      };

      const content = generatePDFContent(orderDocument, {
        hidePrintButton: true,
        watermarkText: config.title
      });
      setHtmlContent(content);

      document.title = `${orderDocument.siteName || '現場名未設定'}-${orderDocument.orderDate.split('T')[0].replace(/-/g, '')}`;

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
  }, [router, config.title]);

  useEffect(() => {
    if (params.id) {
      fetchOrderDetail(params.id as string);
    }
  }, [params.id, fetchOrderDetail]);

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
    router.push('/dashboard');
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
      <div className="print:hidden fixed top-[76px] sm:top-[92px] left-0 right-0 z-40 pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between pointer-events-none">
          <button
            type="button"
            onClick={handleBack}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 border border-border bg-surface/95 backdrop-blur text-foreground text-sm font-medium rounded-md hover:bg-surface-muted hover:border-border-strong transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-semibold rounded-md hover:bg-foreground/90 transition-colors shadow-md"
          >
            <Printer className="h-4 w-4" />
            <span>印刷 / PDFに保存</span>
          </button>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        className="w-full h-screen border-none bg-surface"
        title="発注書印刷プレビュー"
      />
    </div>
  );
}

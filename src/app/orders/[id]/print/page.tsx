"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generatePDFContent } from '@/components/OrderDocumentHTML';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

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

      // OrderDocument形式に変換
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

      // HTML生成（印刷ボタンを非表示に）
      const content = generatePDFContent(orderDocument, {
        hidePrintButton: true,
        watermarkText: '株式会社　櫻建'
      });
      setHtmlContent(content);

      // PDF保存時のファイル名を設定
      document.title = `${orderDocument.siteName || '現場名未設定'}-${orderDocument.orderDate.split('T')[0].replace(/-/g, '')}`;

      // ステータスを処理済みに更新
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

  // iframeにHTMLコンテンツを挿入
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
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!order || !htmlContent) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <p className="text-gray-600 mb-4">発注書が見つかりません</p>
          <Button onClick={handleBack} className="bg-slate-700 hover:bg-slate-800">
            戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 印刷時に非表示になるボタン */}
      <div className="print:hidden fixed top-4 left-4 z-50 flex gap-2">
        <Button
          onClick={handleBack}
          variant="outline"
          className="flex items-center gap-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          戻る
        </Button>
        <Button
          onClick={handlePrint}
          className="bg-slate-700 hover:bg-slate-800 text-white shadow-lg"
        >
          印刷 / PDFに保存
        </Button>
      </div>

      {/* 印刷用コンテンツをiframeで表示 */}
      <iframe
        ref={iframeRef}
        className="w-full h-screen border-none"
        title="発注書印刷プレビュー"
      />
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Calendar, Package, User, Edit } from 'lucide-react';
import { formatWeight, formatTotalWeight } from '@/lib/utils/format';

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
    quantity: number;
    weightPerUnit: number;
    totalWeight: number;
    notes: string | null;
  }>;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderDetail = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/orders/${id}`);
      if (response.status === 401) {
        router.push('/');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      const data = await response.json();
      setOrder(data.order);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (params.id) {
      fetchOrderDetail(params.id as string);
    }
  }, [params.id, fetchOrderDetail]);

  const handleDownload = () => {
    if (!order) return;
    router.push(`/orders/${order.id}/print`);
  };

  const handleEdit = () => {
    if (!order) return;
    router.push(`/material-order/edit/${order.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f4f4f5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0891b2] mx-auto"></div>
          <p className="mt-4 text-sm text-[#71717a]">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f4f4f5]">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white rounded-2xl border border-[#e4e4e7] py-12 text-center">
            <p className="text-sm text-[#71717a] mb-4">発注書が見つかりません</p>
            <Button
              onClick={() => router.push('/order-history')}
              size="sm"
              className="bg-[#0891b2] hover:bg-[#0e7490] text-white"
            >
              履歴に戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: '処理中', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
      completed: { label: '完了', className: 'bg-green-50 text-green-700 border border-green-200' },
      cancelled: { label: 'キャンセル', className: 'bg-red-50 text-red-700 border border-red-200' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7]' };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>;
  };

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/order-history')}
              className="text-[#71717a] hover:text-[#18181b]"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              戻る
            </Button>
            <h1 className="text-xl font-bold text-[#18181b]">発注書詳細</h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleEdit}
              size="sm"
              className="border border-[#d4d4d8] bg-white text-[#18181b] hover:bg-[#f4f4f5]"
            >
              <Edit className="h-4 w-4 mr-1" />
              編集
            </Button>
            <Button
              onClick={handleDownload}
              size="sm"
              className="bg-[#0891b2] hover:bg-[#0e7490] text-white"
            >
              <Download className="h-4 w-4 mr-1" />
              発注書出力
            </Button>
          </div>
        </div>

        {/* 発注番号 + ステータス */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#71717a] mb-1">発注番号</p>
              <p className="text-base font-bold text-[#18181b]">{order.orderNumber}</p>
            </div>
            {getStatusBadge(order.status)}
          </div>
        </div>

        {/* 発注情報 */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] p-5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#eef2ff] rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-[#6366f1]" />
            </div>
            <h2 className="text-sm font-bold text-[#18181b]">発注情報</h2>
          </div>
          <div className="bg-[#fafafa] rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs text-[#71717a] mb-0.5">現場名</p>
              <p className="text-sm font-medium text-[#18181b]">{order.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-[#71717a] mb-0.5">担当者</p>
              <p className="text-sm font-medium text-[#18181b]">{order.customerAddress}</p>
            </div>
            {order.contactInfo && (
              <div>
                <p className="text-xs text-[#71717a] mb-0.5">連絡先</p>
                <p className="text-sm font-medium text-[#18181b]">{order.contactInfo}</p>
              </div>
            )}
            {order.loadingDate && (
              <div>
                <p className="text-xs text-[#71717a] mb-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  積込日
                </p>
                <p className="text-sm font-medium text-[#18181b]">
                  {format(new Date(order.loadingDate), 'yyyy年M月d日', { locale: ja })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 注文商品 */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] overflow-hidden mb-4">
          <div className="p-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#eef2ff] rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-[#6366f1]" />
              </div>
              <h2 className="text-sm font-bold text-[#18181b]">注文商品</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-[#fafafa] border-y border-[#e4e4e7]">
                  <th className="text-left px-5 py-2.5 text-xs font-bold text-[#71717a]">商品名</th>
                  <th className="text-right px-5 py-2.5 text-xs font-bold text-[#71717a] whitespace-nowrap">数量</th>
                  <th className="text-right px-5 py-2.5 text-xs font-bold text-[#71717a] whitespace-nowrap">単位重量(kg)</th>
                  <th className="text-right px-5 py-2.5 text-xs font-bold text-[#71717a] whitespace-nowrap">合計重量(kg)</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index} className="border-b border-[#f4f4f5] hover:bg-[#fafafa]">
                    <td className="px-5 py-3 text-sm text-[#18181b]">{item.productName}</td>
                    <td className="text-right px-5 py-3 text-sm font-medium text-[#18181b]">{item.quantity}</td>
                    <td className="text-right px-5 py-3 text-sm text-[#71717a]">{formatWeight(item.weightPerUnit).replace('kg', '')}</td>
                    <td className="text-right px-5 py-3 text-sm font-medium text-[#18181b]">{formatWeight(item.totalWeight).replace('kg', '')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#fafafa] border-t border-[#e4e4e7]">
                  <td colSpan={3} className="text-right px-5 py-3 text-sm font-bold text-[#18181b]">合計重量:</td>
                  <td className="text-right px-5 py-3 font-bold text-[#18181b]">{formatTotalWeight(order.totalWeight)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* フッター */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] px-5 py-3">
          <p className="text-xs text-[#71717a]">
            発注日: <span className="font-medium text-[#18181b]">{format(new Date(order.createdAt), 'yyyy年M月d日 HH:mm', { locale: ja })}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTenantPath } from '@/lib/tenant/links';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ArrowLeft, Printer, Edit, ArrowRight, AlertTriangle } from 'lucide-react';
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
  truckId: string | null;
  truckName: string | null;
  truckCapacityKg: number | null;
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
  const t = useTenantPath();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderDetail = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/orders/${id}`);
      if (response.status === 401) {
        router.push(t('/'));
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
  }, [router, t]);

  useEffect(() => {
    if (params.id) {
      fetchOrderDetail(params.id as string);
    }
  }, [params.id, fetchOrderDetail]);

  const handleDownload = () => {
    if (!order) return;
    router.push(t(`/orders/${order.id}/print`));
  };

  const handleEdit = () => {
    if (!order) return;
    router.push(t(`/material-order/edit/${order.id}`));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-border border-t-accent mx-auto" />
          <p className="mt-4 text-sm text-muted">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="bg-surface rounded-xl border border-border py-16 text-center">
            <p className="text-sm text-muted mb-5">発注書が見つかりません</p>
            <button
              type="button"
              onClick={() => router.push(t('/order-history'))}
              className="px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 font-semibold text-sm transition-colors"
            >
              履歴に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; dotClassName: string }> = {
      pending: {
        label: '処理中',
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
        dotClassName: 'bg-amber-500',
      },
      completed: {
        label: '完了',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        dotClassName: 'bg-emerald-500',
      },
      cancelled: {
        label: 'キャンセル',
        className: 'bg-red-50 text-red-700 border border-red-200',
        dotClassName: 'bg-red-500',
      },
    };

    const config = statusConfig[status] || {
      label: status,
      className: 'bg-surface-muted text-muted border border-border',
      dotClassName: 'bg-subtle',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotClassName}`} />
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(t('/order-history'))}
              className="flex items-center gap-1 px-2 py-1.5 -ml-2 text-sm text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              戻る
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              発注書詳細
            </h1>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleEdit}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted hover:border-border-strong rounded-md transition-all"
            >
              <Edit className="h-4 w-4" />
              編集
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-md transition-colors"
            >
              <Printer className="h-4 w-4" />
              発注書出力
              <ArrowRight className="h-4 w-4 hidden sm:inline" />
            </button>
          </div>
        </div>

        {/* 発注番号 + ステータス + 発注日 */}
        <div className="bg-surface rounded-xl border border-border p-4 sm:p-5 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-subtle">発注番号</p>
                <p className="text-base font-bold text-foreground font-mono tabular-nums mt-0.5">
                  {order.orderNumber}
                </p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-subtle">発注日</p>
                <p className="text-sm font-semibold text-foreground font-mono tabular-nums mt-0.5">
                  {format(new Date(order.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                </p>
              </div>
            </div>
            {getStatusBadge(order.status)}
          </div>
        </div>

        {/* 発注情報 */}
        <div className="bg-surface rounded-xl border border-border p-5 sm:p-6 mb-4">
          <h2 className="text-xs font-semibold text-foreground tracking-tight mb-4">
            発注情報
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <InfoField label="現場名" value={order.customerName} />
            <InfoField label="担当者" value={order.customerAddress} />
            {order.contactInfo && (
              <InfoField label="連絡先" value={order.contactInfo} />
            )}
            {order.loadingDate && (
              <InfoField
                label="積込日"
                value={format(new Date(order.loadingDate), 'yyyy年M月d日', { locale: ja })}
                mono
              />
            )}
            {order.truckName && order.truckCapacityKg && (
              <InfoField
                label="使用トラック"
                value={`${order.truckName}（${order.truckCapacityKg.toLocaleString()}kg）`}
              />
            )}
          </div>
          {order.truckName && order.truckCapacityKg && order.totalWeight > order.truckCapacityKg && (
            <div className="mt-4 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-md text-xs font-semibold text-red-700">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
              <span className="leading-snug">
                {order.truckName}の積載量を超過しています（+{formatWeight(order.totalWeight - order.truckCapacityKg)}）
              </span>
            </div>
          )}
        </div>

        {/* 注文商品 */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="p-5 sm:p-6 pb-3 flex items-baseline justify-between">
            <h2 className="text-xs font-semibold text-foreground tracking-tight">
              注文商品
            </h2>
            <span className="font-mono text-[10px] tracking-wider text-subtle uppercase tabular-nums">
              {order.items.length} 品
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-muted border-y border-border">
                  <th className="text-left px-5 py-2.5 text-[11px] font-mono uppercase tracking-wider font-semibold text-muted">商品名</th>
                  <th className="text-right px-5 py-2.5 text-[11px] font-mono uppercase tracking-wider font-semibold text-muted whitespace-nowrap">数量</th>
                  <th className="text-right px-5 py-2.5 text-[11px] font-mono uppercase tracking-wider font-semibold text-muted whitespace-nowrap">単位重量<span className="hidden sm:inline">(kg)</span></th>
                  <th className="text-right px-5 py-2.5 text-[11px] font-mono uppercase tracking-wider font-semibold text-muted whitespace-nowrap">合計重量<span className="hidden sm:inline">(kg)</span></th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-border last:border-b-0 hover:bg-surface-muted transition-colors"
                  >
                    <td className="px-5 py-3 text-sm text-foreground">{item.productName}</td>
                    <td className="text-right px-5 py-3 text-sm font-mono tabular-nums font-semibold text-foreground">
                      {item.quantity}
                    </td>
                    <td className="text-right px-5 py-3 text-sm font-mono tabular-nums text-muted">
                      {formatWeight(item.weightPerUnit).replace('kg', '')}
                    </td>
                    <td className="text-right px-5 py-3 text-sm font-mono tabular-nums font-semibold text-foreground">
                      {formatWeight(item.totalWeight).replace('kg', '')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-muted border-t border-border">
                  <td colSpan={3} className="text-right px-5 py-3 text-sm font-semibold text-foreground">
                    合計重量
                  </td>
                  <td className="text-right px-5 py-3 font-bold font-mono tabular-nums text-foreground">
                    {formatTotalWeight(order.totalWeight)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-subtle mb-1">
        {label}
      </p>
      <p className={`text-sm font-medium text-foreground ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value}
      </p>
    </div>
  );
}

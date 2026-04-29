"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import MaterialOrderForm from "@/components/MaterialOrderForm";
import { OrderDocument } from "@/types/material-order";
import { formatWeight, formatTotalWeight } from "@/lib/utils/format";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface EditOrderData {
  orderId: string;
  ordererName: string;
  siteName: string;
  contactInfo: string;
  loadingDate: string;
  truckId: string | null;
  truckName: string | null;
  truckCapacityKg: number | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    weightPerUnit: number;
    totalWeight: number;
  }>;
}

export default function MaterialOrderEditPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [orderData, setOrderData] = useState<OrderDocument | null>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [editOrderData, setEditOrderData] = useState<EditOrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) {
          throw new Error('発注データの取得に失敗しました');
        }
        const data = await response.json();
        const order = data.order;

        const editData: EditOrderData = {
          orderId: order.id,
          ordererName: order.customerAddress || '',
          siteName: order.customerName || '',
          contactInfo: order.contactInfo || '',
          loadingDate: order.loadingDate ? new Date(order.loadingDate).toISOString().split('T')[0] : '',
          truckId: order.truckId ?? null,
          truckName: order.truckName ?? null,
          truckCapacityKg: order.truckCapacityKg ?? null,
          items: order.items.map((item: { materialId: string; productName: string; quantity: number; weightPerUnit: number; totalWeight: number }) => ({
            id: item.materialId,
            name: item.productName,
            quantity: item.quantity,
            weightPerUnit: item.weightPerUnit,
            totalWeight: item.totalWeight
          }))
        };

        setEditOrderData(editData);
      } catch (error) {
        console.error('Error fetching order data:', error);
        alert('発注データの取得に失敗しました');
        window.location.href = '/dashboard';
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderData();
    }
  }, [orderId]);

  const handleFormSubmit = (data: OrderDocument) => {
    setOrderData(data);
    setShowPDFPreview(true);
  };

  const handleReset = () => {
    setOrderData(null);
    setShowPDFPreview(false);
    setOrderCreated(false);
  };

  const handleUpdateOrder = async () => {
    if (!orderData) return;

    setIsCreatingOrder(true);
    try {
      const requestData = {
        projectName: orderData.siteName,
        personInCharge: orderData.ordererName,
        contactInfo: orderData.contactInfo,
        loadingDate: orderData.loadingDate,
        orderDate: orderData.orderDate,
        deliveryDate: null,
        status: 'completed',
        notes: null,
        truckId: orderData.truckId ?? null,
        truckName: orderData.truckName ?? null,
        truckCapacityKg: orderData.truckCapacityKg ?? null,
        items: orderData.items.map(item => ({
          materialId: item.id,
          quantity: item.quantity,
          totalWeightKg: item.totalWeight,
          notes: null
        }))
      };

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || '発注書の更新に失敗しました');
      }

      try {
        sessionStorage.removeItem(`material-order-draft-edit-${orderId}`);
      } catch {
        // ignore
      }

      router.replace(`/orders/${orderId}/print`);
    } catch (error) {
      console.error("発注書更新エラー:", error);
      alert("発注書の更新に失敗しました");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted text-sm">データを読み込み中...</div>
      </div>
    );
  }

  if (showPDFPreview && orderData) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-foreground tracking-tight">発注書編集プレビュー</h1>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 sm:flex-none px-4 py-2 border border-border bg-surface text-foreground rounded-md hover:bg-surface-muted font-medium transition-colors text-sm"
              >
                戻る
              </button>
              <button
                onClick={handleUpdateOrder}
                disabled={isCreatingOrder || orderCreated}
                className="flex-1 sm:flex-none px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:bg-subtle disabled:cursor-not-allowed font-semibold transition-colors text-sm inline-flex items-center justify-center gap-1.5"
              >
                {isCreatingOrder ? "更新中..." : orderCreated ? "更新済み" : "発注書を更新"}
                {!isCreatingOrder && !orderCreated && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-xl p-5 md:p-8 bg-surface border border-border">
            <h2 className="text-sm font-bold mb-4 text-foreground tracking-tight">発注内容確認</h2>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6 p-4 bg-surface-muted rounded-lg">
              <InfoLine label="注文者" value={orderData.ordererName} />
              <InfoLine label="発注日" value={new Date(orderData.orderDate).toLocaleDateString('ja-JP')} />
              {orderData.siteName && <InfoLine label="現場名" value={orderData.siteName} />}
              {orderData.contactInfo && <InfoLine label="連絡先" value={orderData.contactInfo} />}
              {orderData.loadingDate && (
                <InfoLine label="積込日" value={new Date(orderData.loadingDate).toLocaleDateString('ja-JP')} />
              )}
              {orderData.truckName && orderData.truckCapacityKg && (
                <InfoLine
                  label="トラック"
                  value={`${orderData.truckName}（${orderData.truckCapacityKg.toLocaleString()}kg）`}
                />
              )}
            </div>

            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full min-w-[500px] border-collapse">
                <thead>
                  <tr className="bg-surface-muted border-b border-border">
                    <th className="p-2 md:p-3 text-left text-[11px] font-mono uppercase tracking-wider font-semibold text-muted">資材名</th>
                    <th className="p-2 md:p-3 text-right text-[11px] font-mono uppercase tracking-wider font-semibold text-muted whitespace-nowrap">数量</th>
                    <th className="p-2 md:p-3 text-right text-[11px] font-mono uppercase tracking-wider font-semibold text-muted whitespace-nowrap">単位重量<span className="hidden sm:inline">(kg)</span></th>
                    <th className="p-2 md:p-3 text-right text-[11px] font-mono uppercase tracking-wider font-semibold text-muted whitespace-nowrap">合計重量<span className="hidden sm:inline">(kg)</span></th>
                  </tr>
                </thead>
                <tbody>
                  {orderData.items.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-muted border-b border-border">
                      <td className="p-2 md:p-3 text-sm text-foreground">{item.name}</td>
                      <td className="p-2 md:p-3 text-right text-sm font-mono font-semibold tabular-nums text-foreground">{item.quantity}</td>
                      <td className="p-2 md:p-3 text-right text-sm font-mono tabular-nums text-muted">{formatWeight(item.weightPerUnit).replace('kg', '')}</td>
                      <td className="p-2 md:p-3 text-right text-sm font-mono font-semibold tabular-nums text-foreground">{formatWeight(item.totalWeight).replace('kg', '')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-muted">
                    <td colSpan={3} className="p-2 md:p-3 text-right text-sm font-semibold text-foreground">合計重量:</td>
                    <td className="p-2 md:p-3 text-right font-bold font-mono tabular-nums text-foreground">{formatTotalWeight(orderData.totalWeight)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => router.push(`/orders/${orderId}`)}
            className="flex items-center gap-1 px-2 py-1.5 -ml-2 text-sm text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">発注書の編集</h1>
        </div>

        <MaterialOrderForm onSubmit={handleFormSubmit} editMode={true} editOrderData={editOrderData} />
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="font-mono text-[10px] uppercase tracking-wider text-subtle mr-2">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}

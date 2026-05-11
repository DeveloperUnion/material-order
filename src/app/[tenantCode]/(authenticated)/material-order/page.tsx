"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTenantPath } from "@/lib/tenant/links";
import MaterialOrderForm from "@/components/MaterialOrderForm";
import { OrderDocument } from "@/types/material-order";
import { formatWeight, formatTotalWeight } from "@/lib/utils/format";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function MaterialOrderPage() {
  const router = useRouter();
  const t = useTenantPath();
  const [orderData, setOrderData] = useState<OrderDocument | null>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);

  const handleFormSubmit = (data: OrderDocument) => {
    setOrderData(data);
    setShowPDFPreview(true);
  };

  const handleReset = () => {
    setOrderData(null);
    setShowPDFPreview(false);
    setOrderCreated(false);
  };

  const handleCreateOrder = async () => {
    if (!orderData) return;

    setIsCreatingOrder(true);
    try {
      let draftOrderId: string | null = null;
      try {
        const savedDraft = sessionStorage.getItem('material-order-draft-new');
        if (savedDraft) {
          draftOrderId = JSON.parse(savedDraft).draftOrderId || null;
        }
      } catch {
        // ignore
      }

      const requestData = {
        projectName: orderData.siteName,
        personInCharge: orderData.ordererName,
        contactInfo: orderData.contactInfo,
        loadingDate: orderData.loadingDate,
        orderDate: orderData.orderDate,
        deliveryDate: null,
        status: 'completed',
        notes: null,
        draftOrderId,
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

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || '発注書の作成に失敗しました');
      }

      const result = await response.json();

      try {
        sessionStorage.removeItem('material-order-draft-new');
      } catch {
        // ignore
      }

      router.replace(t(`/orders/${result.order.id}/print`));
    } catch (error) {
      console.error("発注書作成エラー:", error);
      alert("発注書の作成に失敗しました");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (showPDFPreview && orderData) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-foreground tracking-tight">発注書プレビュー</h1>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 sm:flex-none px-4 py-2 border border-border bg-surface text-foreground rounded-md hover:bg-surface-muted font-medium transition-colors text-sm"
              >
                戻る
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={isCreatingOrder || orderCreated}
                className="flex-1 sm:flex-none px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:bg-subtle disabled:cursor-not-allowed font-semibold transition-colors text-sm inline-flex items-center justify-center gap-1.5"
              >
                {isCreatingOrder ? "作成中..." : orderCreated ? "作成済み" : "発注書を作成"}
                {!isCreatingOrder && !orderCreated && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-xl p-5 md:p-8 bg-surface border border-border">
            <h2 className="text-sm font-bold mb-4 text-foreground tracking-tight">発注内容確認</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-6 p-4 bg-surface-muted rounded-lg">
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
                      <td className="p-2 md:p-3 text-sm text-foreground">{item.size && item.size.trim() !== '' ? `${item.name} ${item.size}` : item.name}</td>
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
            onClick={() => {
              try { sessionStorage.removeItem('material-order-draft-new'); } catch {}
              router.push(t('/dashboard'));
            }}
            className="flex items-center gap-1 px-2 py-1.5 -ml-2 text-sm text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">新規発注</h1>
        </div>

        <MaterialOrderForm onSubmit={handleFormSubmit} />
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

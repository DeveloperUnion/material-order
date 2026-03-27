"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import MaterialOrderForm from "@/components/MaterialOrderForm";
import { OrderDocument } from "@/types/material-order";
import { formatWeight, formatTotalWeight } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function MaterialOrderPage() {
  const router = useRouter();
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
      // sessionStorage から draftOrderId を取得
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
        notes: null, // orderData.note, // 備考機能を削除
        draftOrderId,
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
      console.log('発注書を作成しました:', result);

      // 発注作成成功後に下書きデータを削除
      try {
        sessionStorage.removeItem('material-order-draft-new');
      } catch {
        // ignore
      }

      // 印刷専用ページに遷移
      router.push(`/orders/${result.order.id}/print`);
    } catch (error) {
      console.error("発注書作成エラー:", error);
      alert("発注書の作成に失敗しました");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (showPDFPreview && orderData) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] p-3 md:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-[#18181b]">発注書プレビュー</h1>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 sm:flex-none px-4 py-2 border border-[#d4d4d8] bg-white text-[#18181b] rounded-lg hover:bg-[#f4f4f5] font-medium transition-all text-sm"
              >
                戻る
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={isCreatingOrder || orderCreated}
                className="flex-1 sm:flex-none px-4 py-2 bg-[#0891b2] text-white rounded-lg hover:bg-[#0e7490] disabled:bg-[#a1a1aa] disabled:cursor-not-allowed font-medium transition-all text-sm"
              >
                {isCreatingOrder ? "作成中..." : orderCreated ? "作成済み" : "発注書を作成"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-4 md:p-8 bg-white border border-[#e4e4e7]">
            <h2 className="text-base font-bold mb-4 text-[#18181b]">発注内容確認</h2>

            <div className="space-y-2 mb-6 p-4 bg-[#fafafa] rounded-xl">
              <p className="text-sm"><span className="font-medium text-[#71717a]">注文者:</span> <span className="text-[#18181b]">{orderData.ordererName}</span></p>
              <p className="text-sm"><span className="font-medium text-[#71717a]">発注日:</span> <span className="text-[#18181b]">{new Date(orderData.orderDate).toLocaleDateString('ja-JP')}</span></p>
              {orderData.siteName && (
                <p className="text-sm"><span className="font-medium text-[#71717a]">現場名:</span> <span className="text-[#18181b]">{orderData.siteName}</span></p>
              )}
              {orderData.contactInfo && (
                <p className="text-sm"><span className="font-medium text-[#71717a]">連絡先:</span> <span className="text-[#18181b]">{orderData.contactInfo}</span></p>
              )}
              {orderData.loadingDate && (
                <p className="text-sm"><span className="font-medium text-[#71717a]">積込日:</span> <span className="text-[#18181b]">{new Date(orderData.loadingDate).toLocaleDateString('ja-JP')}</span></p>
              )}
            </div>

            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full min-w-[500px] border-collapse">
                <thead>
                  <tr className="bg-[#fafafa] border-b border-[#e4e4e7]">
                    <th className="p-2 md:p-3 text-left text-xs font-bold text-[#71717a]">資材名</th>
                    <th className="p-2 md:p-3 text-right text-xs font-bold text-[#71717a] whitespace-nowrap">数量</th>
                    <th className="p-2 md:p-3 text-right text-xs font-bold text-[#71717a] whitespace-nowrap">単位重量<span className="hidden sm:inline">(kg)</span></th>
                    <th className="p-2 md:p-3 text-right text-xs font-bold text-[#71717a] whitespace-nowrap">合計重量<span className="hidden sm:inline">(kg)</span></th>
                  </tr>
                </thead>
                <tbody>
                  {orderData.items.map((item) => (
                    <tr key={item.id} className="hover:bg-[#fafafa] border-b border-[#f4f4f5]">
                      <td className="p-2 md:p-3 text-sm text-[#18181b]">{item.name}</td>
                      <td className="p-2 md:p-3 text-right text-sm font-medium text-[#18181b]">{item.quantity}</td>
                      <td className="p-2 md:p-3 text-right text-sm text-[#71717a]">{formatWeight(item.weightPerUnit).replace('kg', '')}</td>
                      <td className="p-2 md:p-3 text-right text-sm font-medium text-[#18181b]">{formatWeight(item.totalWeight).replace('kg', '')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#fafafa]">
                    <td colSpan={3} className="p-2 md:p-3 text-right text-sm font-bold text-[#18181b]">合計重量:</td>
                    <td className="p-2 md:p-3 text-right font-bold text-[#18181b]">{formatTotalWeight(orderData.totalWeight)}</td>
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
    <div className="min-h-screen bg-[#f4f4f5]">
      <div className="container mx-auto px-4 py-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              try { sessionStorage.removeItem('material-order-draft-new'); } catch {}
              router.push('/dashboard');
            }}
            className="text-[#71717a] hover:text-[#18181b]"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </Button>
          <h1 className="text-xl font-bold text-[#18181b]">新規発注書作成</h1>
        </div>

        <MaterialOrderForm onSubmit={handleFormSubmit} />
      </div>
    </div>
  );
}
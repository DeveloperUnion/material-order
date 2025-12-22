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
      const requestData = {
        projectName: orderData.siteName,
        personInCharge: orderData.ordererName,
        contactInfo: orderData.contactInfo,
        loadingDate: orderData.loadingDate,
        orderDate: orderData.orderDate,
        deliveryDate: null,
        status: 'completed',
        notes: null, // orderData.note, // 備考機能を削除
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 md:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h1 className="text-xl md:text-3xl font-bold text-slate-800">発注書プレビュー</h1>
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={handleReset}
                className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-3 bg-slate-500 text-white rounded-lg hover:bg-slate-600 font-semibold shadow-md hover:shadow-lg transition-all duration-200 text-sm md:text-base"
              >
                戻る
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={isCreatingOrder || orderCreated}
                className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg hover:from-slate-800 hover:to-slate-900 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transition-all duration-200 text-sm md:text-base"
              >
                {isCreatingOrder ? "作成中..." : orderCreated ? "作成済み" : "発注書を作成"}
              </button>
            </div>
          </div>

          <div className="rounded-xl md:rounded-2xl p-4 md:p-8 bg-white shadow-xl">
            <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-6 text-slate-800">発注内容確認</h2>

            <div className="space-y-2 md:space-y-3 mb-6 md:mb-8 p-3 md:p-4 bg-slate-50 rounded-lg">
              <p className="text-sm md:text-lg"><span className="font-semibold text-slate-700">注文者:</span> <span className="text-slate-800">{orderData.ordererName}</span></p>
              <p className="text-sm md:text-lg"><span className="font-semibold text-slate-700">発注日:</span> <span className="text-slate-800">{new Date(orderData.orderDate).toLocaleDateString('ja-JP')}</span></p>
              {orderData.siteName && (
                <p className="text-sm md:text-lg"><span className="font-semibold text-slate-700">現場名:</span> <span className="text-slate-800">{orderData.siteName}</span></p>
              )}
              {orderData.contactInfo && (
                <p className="text-sm md:text-lg"><span className="font-semibold text-slate-700">連絡先:</span> <span className="text-slate-800">{orderData.contactInfo}</span></p>
              )}
              {orderData.loadingDate && (
                <p className="text-sm md:text-lg"><span className="font-semibold text-slate-700">積込日:</span> <span className="text-slate-800">{new Date(orderData.loadingDate).toLocaleDateString('ja-JP')}</span></p>
              )}
            </div>

          <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full min-w-[500px] border-collapse rounded-lg overflow-hidden shadow-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-700 to-slate-600">
                    <th className="p-2 md:p-4 text-left text-white font-semibold text-xs md:text-base">資材名</th>
                    <th className="p-2 md:p-4 text-right text-white font-semibold text-xs md:text-base whitespace-nowrap">数量</th>
                    <th className="p-2 md:p-4 text-right text-white font-semibold text-xs md:text-base whitespace-nowrap">単位重量<span className="hidden sm:inline">(kg)</span></th>
                    <th className="p-2 md:p-4 text-right text-white font-semibold text-xs md:text-base whitespace-nowrap">合計重量<span className="hidden sm:inline">(kg)</span></th>
                  </tr>
                </thead>
              <tbody>
                {orderData.items.map((item) => (
                    <tr key={item.id} className="bg-white hover:bg-slate-50 border-b border-slate-200 transition-colors duration-150">
                      <td className="p-2 md:p-4 text-slate-800 font-medium text-xs md:text-base">{item.name}</td>
                      <td className="p-2 md:p-4 text-right text-slate-800 font-semibold text-xs md:text-base">{item.quantity}</td>
                      <td className="p-2 md:p-4 text-right text-slate-700 text-xs md:text-base">{formatWeight(item.weightPerUnit).replace('kg', '')}</td>
                      <td className="p-2 md:p-4 text-right text-slate-800 font-semibold text-xs md:text-base">{formatWeight(item.totalWeight).replace('kg', '')}</td>
                    </tr>
                ))}
              </tbody>
              <tfoot>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <td colSpan={3} className="p-2 md:p-4 text-right font-bold text-slate-800 text-xs md:text-base">合計重量:</td>
                    <td className="p-2 md:p-4 text-right font-bold text-slate-800 text-sm md:text-lg">{formatTotalWeight(orderData.totalWeight)}</td>
                  </tr>
              </tfoot>
            </table>
          </div>

          {/* 備考表示 - コメントアウト
          {orderData.note && (
              <div className="mt-4 md:mt-6 p-3 md:p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-semibold mb-2 text-slate-800 text-sm md:text-base">備考:</p>
                <p className="whitespace-pre-wrap text-slate-700 text-sm md:text-base">{orderData.note}</p>
              </div>
          )}
          */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">新規発注書作成</h1>
            <p className="text-sm text-gray-500">資材を選択して発注書を作成</p>
          </div>
        </div>

        <MaterialOrderForm onSubmit={handleFormSubmit} />
      </div>
    </div>
  );
}
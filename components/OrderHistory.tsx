"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { formatWeight } from '@/lib/utils/format';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Search, Calendar, Printer, Trash2, Copy, ArrowLeft } from 'lucide-react';

interface OrderData {
  id: string;
  orderNumber: string;
  customerName: string;
  customerAddress: string;
  loadingDate: string | null;
  deliveryDate: string;
  totalWeight: number;
  status: string;
  createdAt: string;
  items: Array<{
    productName: string;
    quantity: number;
    weightPerUnit: number;
    totalWeight: number;
  }>;
}

export default function OrderHistory() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; orderNumber: string } | null>(null);

  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'yyyy年M月', { locale: ja })
      });
    }
    return months;
  };

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.status === 401) {
        router.push('/');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      setOrders(data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customerAddress && order.customerAddress.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      let matchesMonth = true;
      if (monthFilter !== 'all') {
        const orderMonth = format(new Date(order.createdAt), 'yyyy-MM');
        matchesMonth = orderMonth === monthFilter;
      }

      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [orders, searchTerm, statusFilter, monthFilter]);

  const handleView = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const handleDelete = async (orderId: string, orderNumber: string) => {
    if (!confirm(`発注書「${orderNumber}」を削除しますか？\n\nこの操作は元に戻すことができません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        router.push('/');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      alert('発注書を削除しました');
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('発注書の削除に失敗しました');
    }
  };

  const handleCopy = (orderId: string, orderNumber: string) => {
    setSelectedOrder({ id: orderId, orderNumber });
    setCopyDialogOpen(true);
  };

  const confirmCopy = async () => {
    if (!selectedOrder) return;

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}`);
      if (response.status === 401) {
        setCopyDialogOpen(false);
        router.push('/');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      const data = await response.json();
      const order = data.order;

      const createResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: order.customerName,
          personInCharge: order.customerAddress,
          contactInfo: order.contactInfo,
          loadingDate: order.loadingDate,
          orderDate: new Date().toISOString(),
          deliveryDate: order.deliveryDate,
          notes: order.shippingAddress,
          status: 'pending',
          copyFromOrderId: selectedOrder.id,
          items: order.items.map((item: { materialId: string; quantity: number; totalWeight: number; notes: string | null }) => ({
            materialId: item.materialId,
            quantity: item.quantity,
            totalWeightKg: item.totalWeight,
            notes: item.notes
          }))
        }),
      });

      if (createResponse.status === 401) {
        setCopyDialogOpen(false);
        router.push('/');
        return;
      }

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.error('Error response:', errorData);
        throw new Error('Failed to create order copy');
      }

      const newOrderData = await createResponse.json();
      setCopyDialogOpen(false);
      alert('発注書をコピーしました');
      router.push(`/orders/${newOrderData.order.id}`);
    } catch (error) {
      console.error('Error copying order:', error);
      alert('発注書のコピーに失敗しました');
      setCopyDialogOpen(false);
    }
  };

  const handleDownload = (orderId: string) => {
    router.push(`/orders/${orderId}/print`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: '処理中', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
      completed: { label: '完了', className: 'bg-green-50 text-green-700 border border-green-200' },
      cancelled: { label: 'キャンセル', className: 'bg-red-50 text-red-700 border border-red-200' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7]' };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>;
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

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-[#71717a] hover:text-[#18181b]"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </Button>
          <h1 className="text-xl font-bold text-[#18181b]">発注書履歴</h1>
        </div>

        {/* 検索・フィルター */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] p-5 mb-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* 検索欄 */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#a1a1aa]" />
              </div>
              <input
                placeholder="現場名、担当者名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-[#0891b2] focus:border-transparent outline-none placeholder:text-[#a1a1aa]"
              />
            </div>

            {/* フィルター */}
            <div className="flex gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a1a1aa] pointer-events-none" />
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-[#0891b2] focus:border-transparent outline-none bg-white appearance-none cursor-pointer"
                >
                  <option value="all">すべての月</option>
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-[#0891b2] focus:border-transparent outline-none bg-white appearance-none cursor-pointer"
              >
                <option value="all">すべて</option>
                <option value="pending">処理中</option>
                <option value="completed">完了</option>
                <option value="cancelled">キャンセル</option>
              </select>
            </div>
          </div>

          {searchTerm && (
            <div className="mt-3 pt-3 border-t border-[#e4e4e7]">
              <p className="text-xs text-[#71717a]">
                「{searchTerm}」の検索結果: {filteredOrders.length}件
              </p>
            </div>
          )}
        </div>

        {/* テーブル */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[#71717a]">発注書が見つかりません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#fafafa] border-b border-[#e4e4e7]">
                    <TableHead className="text-xs font-bold text-[#71717a]">現場名</TableHead>
                    <TableHead className="text-xs font-bold text-[#71717a]">担当者名</TableHead>
                    <TableHead className="text-xs font-bold text-[#71717a]">発注日</TableHead>
                    <TableHead className="text-xs font-bold text-[#71717a]">積込日</TableHead>
                    <TableHead className="text-right text-xs font-bold text-[#71717a]">合計重量</TableHead>
                    <TableHead className="text-xs font-bold text-[#71717a]">ステータス</TableHead>
                    <TableHead className="text-right text-xs font-bold text-[#71717a]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-[#fafafa] border-b border-[#f4f4f5]">
                      <TableCell className="text-sm text-[#18181b]">{order.customerName}</TableCell>
                      <TableCell className="text-sm text-[#18181b]">{order.customerAddress}</TableCell>
                      <TableCell className="text-sm text-[#71717a]">
                        {format(new Date(order.createdAt), 'yyyy/MM/dd', { locale: ja })}
                      </TableCell>
                      <TableCell className="text-sm text-[#71717a]">
                        {order.loadingDate ? format(new Date(order.loadingDate), 'yyyy年M月d日', { locale: ja }) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm text-[#18181b]">
                        {formatWeight(order.totalWeight)}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleCopy(order.id, order.orderNumber)}
                            className="p-2 rounded-lg text-[#71717a] hover:text-[#0891b2] hover:bg-[#ecfeff] transition-colors"
                            title="コピー"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleView(order.id)}
                            className="p-2 rounded-lg text-[#71717a] hover:text-[#0891b2] hover:bg-[#ecfeff] transition-colors"
                            title="詳細表示"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(order.id)}
                            className="p-2 rounded-lg text-[#71717a] hover:text-[#0891b2] hover:bg-[#ecfeff] transition-colors"
                            title="発注書出力"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(order.id, order.orderNumber)}
                            className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="削除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* コピー確認ダイアログ */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#18181b]">発注書のコピー</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-2 text-sm text-[#18181b]">
              <p>発注書「{selectedOrder.orderNumber}」をコピーしますか？</p>
              <p className="text-[#71717a]">新しい発注書として複製されます。</p>
            </div>
          )}
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              type="button"
              size="sm"
              className="border border-[#d4d4d8] bg-white text-[#18181b] hover:bg-[#f4f4f5]"
              onClick={() => setCopyDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirmCopy}
              className="bg-[#0891b2] hover:bg-[#0e7490] text-white"
            >
              コピー
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

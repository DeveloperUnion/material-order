"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { formatWeight } from '@/lib/utils/format';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Search, Calendar, FileText, Printer, Trash2, Copy, ArrowLeft } from 'lucide-react';

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
  
  // 月選択用のオプションを生成
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
        // セッション切れ - ログインページにリダイレクト
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
      // 検索条件（現場名、担当者名）
      const matchesSearch = 
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customerAddress && order.customerAddress.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      // 月フィルター
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
        // セッション切れ - ログインページにリダイレクト
        router.push('/');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      alert('発注書を削除しました');

      // 一覧を再読み込み
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
      // 注文詳細を取得
      const response = await fetch(`/api/orders/${selectedOrder.id}`);
      if (response.status === 401) {
        // セッション切れ - ログインページにリダイレクト
        setCopyDialogOpen(false);
        router.push('/');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      const data = await response.json();
      const order = data.order;

      // 新しい発注書として作成（APIが期待する形式に変換）
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
          copyFromOrderId: selectedOrder.id, // 元の発注書のIDを渡してisTemporary材料を複製
          items: order.items.map((item: { materialId: string; quantity: number; totalWeight: number; notes: string | null }) => ({
            materialId: item.materialId,
            quantity: item.quantity,
            totalWeightKg: item.totalWeight,
            notes: item.notes
          }))
        }),
      });

      if (createResponse.status === 401) {
        // セッション切れ - ログインページにリダイレクト
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

      // 新しく作成された発注書の詳細ページに移動
      router.push(`/orders/${newOrderData.order.id}`);
    } catch (error) {
      console.error('Error copying order:', error);
      alert('発注書のコピーに失敗しました');
      setCopyDialogOpen(false);
    }
  };

  const handleDownload = (orderId: string) => {
    // 印刷専用ページに遷移
    router.push(`/orders/${orderId}/print`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: '処理中', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
      completed: { label: '完了', className: 'bg-green-50 text-green-700 border border-green-200' },
      cancelled: { label: 'キャンセル', className: 'bg-red-50 text-red-700 border border-red-200' },
    };
    
    const config = statusConfig[status] || { label: status, className: 'bg-gray-50 text-gray-700 border border-gray-200' };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
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
            <h1 className="text-xl font-semibold text-gray-900">発注書履歴</h1>
            <p className="text-sm text-gray-500">過去の発注書を確認・ダウンロード</p>
          </div>
        </div>

        {/* 検索・フィルターセクション */}
        <Card className="mb-8 border border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg text-gray-900">検索・フィルター</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* 検索欄 */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  placeholder="現場名、担当者名で検索..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500 placeholder-gray-500"
                />
              </div>
              
              {/* フィルター */}
              <div className="flex flex-col sm:flex-row gap-3 lg:w-auto">
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] h-10 bg-white text-gray-900 border-gray-300">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                      <SelectValue placeholder="月" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900">
                    <SelectItem value="all">すべて</SelectItem>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] h-10 bg-white text-gray-900 border-gray-300">
                    <SelectValue placeholder="ステータス" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900">
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="pending">処理中</SelectItem>
                    <SelectItem value="completed">完了</SelectItem>
                    <SelectItem value="cancelled">キャンセル</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* 検索結果数表示 */}
            {searchTerm && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  「{searchTerm}」の検索結果: {filteredOrders.length}件
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* テーブルセクション */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">発注書が見つかりません</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-b border-gray-200">
                      <TableHead className="font-medium text-gray-700">現場名</TableHead>
                      <TableHead className="font-medium text-gray-700">担当者名</TableHead>
                      <TableHead className="font-medium text-gray-700">発注日</TableHead>
                      <TableHead className="font-medium text-gray-700">積込日</TableHead>
                      <TableHead className="text-right font-medium text-gray-700">合計重量</TableHead>
                      <TableHead className="font-medium text-gray-700">ステータス</TableHead>
                      <TableHead className="text-right font-medium text-gray-700"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <TableCell className="text-gray-700">{order.customerName}</TableCell>
                        <TableCell className="text-gray-700">{order.customerAddress}</TableCell>
                        <TableCell className="text-gray-700">
                          {format(new Date(order.createdAt), 'yyyy/MM/dd', { locale: ja })}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {order.loadingDate ? format(new Date(order.loadingDate), 'yyyy年M月d日', { locale: ja }) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-gray-700">
                          {formatWeight(order.totalWeight)}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy(order.id, order.orderNumber)}
                              className="h-8 w-8 p-0 bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                              title="コピー"
                            >
                              <Copy className="h-4 w-4 text-gray-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleView(order.id)}
                              className="h-8 w-8 p-0 bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                              title="詳細表示"
                            >
                              <Eye className="h-4 w-4 text-gray-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(order.id)}
                              className="h-8 w-8 p-0 bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                              title="発注書出力"
                            >
                              <Printer className="h-4 w-4 text-gray-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(order.id, order.orderNumber)}
                              className="h-8 w-8 p-0 bg-white border-red-300 hover:bg-red-50 hover:border-red-400 transition-colors"
                              title="削除"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* コピー確認ダイアログ */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">発注書のコピー</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-2 text-sm text-gray-900">
              <p>発注書「{selectedOrder.orderNumber}」をコピーしますか？</p>
              <p>新しい発注書として複製されます。</p>
            </div>
          )}
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCopyDialogOpen(false)}
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </Button>
            <Button
              type="button"
              onClick={confirmCopy}
              className="bg-slate-700 hover:bg-slate-800 text-white"
            >
              コピー
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
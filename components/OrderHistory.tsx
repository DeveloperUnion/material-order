"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { formatWeight } from '@/lib/utils/format';
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
import {
  Eye,
  Search,
  Calendar,
  Printer,
  Trash2,
  Copy,
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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

const ITEMS_PER_PAGE = 10;

export default function OrderHistory() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialogs
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [selectedCopyOrder, setSelectedCopyOrder] = useState<{ id: string; orderNumber: string; customerName: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDeleteOrder, setSelectedDeleteOrder] = useState<{ id: string; orderNumber: string; customerName: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // フィルタ変更時に1ページ目へ
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, monthFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const handleView = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const handleDeleteClick = (order: OrderData) => {
    setSelectedDeleteOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
    });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedDeleteOrder) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/orders/${selectedDeleteOrder.id}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        router.push('/');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      setDeleteDialogOpen(false);
      setSelectedDeleteOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('発注書の削除に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyClick = (order: OrderData) => {
    setSelectedCopyOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
    });
    setCopyDialogOpen(true);
  };

  const confirmCopy = async () => {
    if (!selectedCopyOrder) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/orders/${selectedCopyOrder.id}`);
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
          copyFromOrderId: selectedCopyOrder.id,
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
      router.push(`/orders/${newOrderData.order.id}`);
    } catch (error) {
      console.error('Error copying order:', error);
      alert('発注書のコピーに失敗しました');
      setCopyDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (orderId: string) => {
    router.push(`/orders/${orderId}/print`);
  };

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 px-2 py-1.5 -ml-2 text-sm text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            発注書履歴
          </h1>
        </div>

        {/* 検索・フィルター */}
        <div className="bg-surface rounded-xl border border-border p-4 sm:p-5 mb-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* 検索欄 */}
            <div className="relative flex-1 flex items-center gap-3 px-4 py-2.5 border border-border rounded-md bg-surface focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 transition-all">
              <Search className="h-4 w-4 text-subtle flex-shrink-0" />
              <input
                type="text"
                placeholder="現場名・担当者名で検索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 border-0 outline-none bg-transparent text-sm text-foreground placeholder:text-subtle"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-subtle hover:text-foreground transition-colors"
                  aria-label="クリア"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* フィルター */}
            <div className="flex gap-2">
              <div className="relative flex-1 lg:flex-none">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle pointer-events-none" />
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full lg:w-auto pl-9 pr-8 py-2.5 text-sm text-foreground border border-border rounded-md focus:ring-4 focus:ring-accent/15 focus:border-accent outline-none bg-surface appearance-none cursor-pointer transition-all"
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
                className="flex-1 lg:flex-none px-3 py-2.5 text-sm text-foreground border border-border rounded-md focus:ring-4 focus:ring-accent/15 focus:border-accent outline-none bg-surface appearance-none cursor-pointer transition-all"
              >
                <option value="all">すべて</option>
                <option value="pending">処理中</option>
                <option value="completed">完了</option>
                <option value="cancelled">キャンセル</option>
              </select>
            </div>
          </div>

          {(searchTerm || statusFilter !== 'all' || monthFilter !== 'all') && (
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted">
                検索結果:{' '}
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {filteredOrders.length}
                </span>{' '}
                件
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setMonthFilter('all');
                }}
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                フィルタをクリア
              </button>
            </div>
          )}
        </div>

        {/* テーブル */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-surface-muted flex items-center justify-center">
                <Search className="h-6 w-6 text-subtle" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">発注書が見つかりません</p>
              <p className="text-xs text-muted">
                {searchTerm || statusFilter !== 'all' || monthFilter !== 'all'
                  ? 'フィルタ条件を変更してください'
                  : 'まだ発注書が作成されていません'}
              </p>
            </div>
          ) : (
            <>
              {/* モバイル: カード表示 */}
              <div className="lg:hidden divide-y divide-border">
                {paginatedOrders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-surface-muted transition-colors">
                    <button
                      type="button"
                      onClick={() => handleView(order.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-muted truncate mt-0.5">
                            {order.customerAddress}
                          </p>
                        </div>
                        <div className="flex-shrink-0">{getStatusBadge(order.status)}</div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <div className="flex items-center gap-3 font-mono tabular-nums">
                          <span>
                            発注 {format(new Date(order.createdAt), 'MM/dd', { locale: ja })}
                          </span>
                          {order.loadingDate && (
                            <span>
                              積込 {format(new Date(order.loadingDate), 'MM/dd', { locale: ja })}
                            </span>
                          )}
                        </div>
                        <span className="text-foreground font-semibold font-mono tabular-nums">
                          {formatWeight(order.totalWeight)}
                        </span>
                      </div>
                    </button>
                    <div className="mt-3 flex items-center justify-end gap-1 border-t border-border pt-2 -mx-1">
                      <button
                        onClick={() => handleCopyClick(order)}
                        className="flex items-center justify-center h-11 w-11 rounded-md text-muted hover:text-foreground hover:bg-surface-muted active:bg-surface-muted transition-colors"
                        aria-label="コピー"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleView(order.id)}
                        className="flex items-center justify-center h-11 w-11 rounded-md text-muted hover:text-foreground hover:bg-surface-muted active:bg-surface-muted transition-colors"
                        aria-label="詳細表示"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDownload(order.id)}
                        className="flex items-center justify-center h-11 w-11 rounded-md text-muted hover:text-foreground hover:bg-surface-muted active:bg-surface-muted transition-colors"
                        aria-label="発注書出力"
                      >
                        <Printer className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(order)}
                        className="flex items-center justify-center h-11 w-11 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 active:bg-red-50 transition-colors"
                        aria-label="削除"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* デスクトップ: テーブル表示 */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-surface-muted border-b border-border hover:bg-surface-muted">
                      <TableHead className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted">現場名</TableHead>
                      <TableHead className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted">担当者</TableHead>
                      <TableHead className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted">発注日</TableHead>
                      <TableHead className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted">積込日</TableHead>
                      <TableHead className="text-right text-[11px] font-mono uppercase tracking-wider font-semibold text-muted">合計重量</TableHead>
                      <TableHead className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted">ステータス</TableHead>
                      <TableHead className="text-right text-[11px] font-mono uppercase tracking-wider font-semibold text-muted"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="hover:bg-surface-muted border-b border-border"
                      >
                        <TableCell className="text-sm text-foreground font-medium">
                          {order.customerName}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {order.customerAddress}
                        </TableCell>
                        <TableCell className="text-sm text-muted font-mono tabular-nums">
                          {format(new Date(order.createdAt), 'yyyy/MM/dd', { locale: ja })}
                        </TableCell>
                        <TableCell className="text-sm text-muted font-mono tabular-nums">
                          {order.loadingDate
                            ? format(new Date(order.loadingDate), 'yyyy/MM/dd', { locale: ja })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm text-foreground font-mono tabular-nums font-semibold">
                          {formatWeight(order.totalWeight)}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-0.5">
                            <button
                              onClick={() => handleCopyClick(order)}
                              className="p-2 rounded-md text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
                              title="コピー"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleView(order.id)}
                              className="p-2 rounded-md text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
                              title="詳細表示"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(order.id)}
                              className="p-2 rounded-md text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
                              title="発注書出力"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(order)}
                              className="p-2 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
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
            </>
          )}
        </div>

        {/* ページネーション */}
        {filteredOrders.length > 0 && (
          <div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-3">
            <div className="text-xs text-muted">
              全{' '}
              <span className="font-mono font-semibold text-foreground tabular-nums">
                {filteredOrders.length}
              </span>{' '}
              件中{' '}
              <span className="font-mono font-semibold text-foreground tabular-nums">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                {'-'}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)}
              </span>{' '}
              件表示
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium border border-border bg-surface text-foreground rounded-md hover:bg-surface-muted hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                  前へ
                </button>
                <span className="text-sm text-muted font-mono tabular-nums px-2">
                  <span className="font-semibold text-foreground">{currentPage}</span> / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium border border-border bg-surface text-foreground rounded-md hover:bg-surface-muted hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  次へ
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* コピー確認ダイアログ */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-md bg-surface rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">発注書をコピー</DialogTitle>
          </DialogHeader>
          {selectedCopyOrder && (
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                「
                <span className="font-semibold">{selectedCopyOrder.customerName}</span>
                」の発注書を新規発注として複製します。
              </p>
              <p className="text-xs text-muted">
                コピー後、内容を編集・変更できます。
              </p>
            </div>
          )}
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setCopyDialogOpen(false)}
              className="px-4 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={confirmCopy}
              className="px-4 py-2 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'コピー中...' : 'コピー'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-surface rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">発注書を削除</DialogTitle>
          </DialogHeader>
          {selectedDeleteOrder && (
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                「
                <span className="font-semibold">{selectedDeleteOrder.customerName}</span>
                」の発注書を削除しますか？
              </p>
              <p className="text-xs text-red-700 font-medium">
                この操作は元に戻せません。
              </p>
            </div>
          )}
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setDeleteDialogOpen(false)}
              className="px-4 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? '削除中...' : '削除'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

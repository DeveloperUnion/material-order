"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Clock, BarChart3, CheckCircle, AlertCircle, Users, Settings } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

interface Stats {
  thisMonthOrders: number;
  completedOrders: number;
  pendingOrders: number;
}

export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const [stats, setStats] = useState<Stats>({
    thisMonthOrders: 0,
    completedOrders: 0,
    pendingOrders: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
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
      const orders = data.orders;

      // 今月の発注書数
      const now = new Date();
      const currentMonth = format(now, 'yyyy-MM');
      const thisMonthOrders = orders.filter((order: { createdAt: string }) => {
        const orderMonth = format(new Date(order.createdAt), 'yyyy-MM');
        return orderMonth === currentMonth;
      }).length;

      // 処理済み
      const completedOrders = orders.filter((order: { status: string }) => order.status === 'completed').length;

      // 処理中
      const pendingOrders = orders.filter((order: { status: string }) => order.status === 'pending').length;

      setStats({
        thisMonthOrders,
        completedOrders,
        pendingOrders
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const navigateToOrderForm = () => {
    router.push('/material-order');
  };

  const navigateToOrderHistory = () => {
    router.push('/order-history');
  };

  const navigateToUserManagement = () => {
    router.push('/admin/users');
  };

  const navigateToTenantSettings = () => {
    router.push('/admin/settings');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* メインコンテンツ */}
      <div className="container mx-auto px-6 py-8">
        {/* ページタイトル */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            ダッシュボード
          </h1>
        </div>
        {/* 管理者メニュー */}
        {isAdmin && (
          <div className="mb-8 grid md:grid-cols-2 gap-4">
            <Card
              className="hover:shadow-md transition-shadow border border-purple-200 bg-purple-50/30 cursor-pointer"
              onClick={navigateToUserManagement}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-900">
                      ユーザー管理
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      ユーザーの招待・管理を行います
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <Card
              className="hover:shadow-md transition-shadow border border-slate-200 bg-slate-50/30 cursor-pointer"
              onClick={navigateToTenantSettings}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Settings className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-900">
                      テナント設定
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      会社情報の編集を行います
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* メインアクション */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card 
            className="hover:shadow-md transition-shadow border border-gray-200"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg text-gray-900">
                  新規発注書作成
                </CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                新しい発注書を作成します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>現場情報・発注者情報の入力</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>資材の選択と数量指定</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>発注書PDF生成・保存</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full" onClick={navigateToOrderForm}>
                発注書を作成
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md transition-shadow border border-gray-200"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-lg text-gray-900">
                  発注書履歴
                </CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                過去の発注書を確認・管理できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>現場名・期間での検索</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>発注内容の詳細確認</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>PDFファイルの再ダウンロード</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full" onClick={navigateToOrderHistory}>
                履歴を確認
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 統計情報 */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg text-gray-900">統計情報</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 mb-1">{stats.thisMonthOrders}</div>
                  <div className="text-sm text-gray-600">今月の発注書</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-50 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 mb-1">{stats.completedOrders}</div>
                  <div className="text-sm text-gray-600">処理済み</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-50 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 mb-1">{stats.pendingOrders}</div>
                  <div className="text-sm text-gray-600">処理中</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
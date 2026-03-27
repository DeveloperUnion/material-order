"use client";

import { useRouter } from 'next/navigation';
import { FileText, Clock, Building2, Package, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const navigateToOrderForm = () => {
    router.push('/material-order');
  };

  const navigateToOrderHistory = () => {
    router.push('/order-history');
  };

  const navigateToCompanySettings = () => {
    router.push('/admin/settings');
  };

  const navigateToMaterials = () => {
    router.push('/admin/materials');
  };

  if (!isAdmin) {
    // 非管理者レイアウト
    return (
      <div className="min-h-screen bg-[#f4f4f5]">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              className="group bg-white rounded-2xl border border-[#e4e4e7] p-6 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all md:min-h-[180px]"
              onClick={navigateToOrderForm}
            >
              <div className="h-full flex flex-col justify-between">
                <div className="w-12 h-12 bg-[#eef2ff] rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-[#6366f1]" />
                </div>
                <div className="mt-4">
                  <p className="text-lg font-bold text-[#18181b]">新規発注書作成</p>
                  <p className="text-xs text-[#71717a] mt-1">新しい発注書を作成します</p>
                </div>
              </div>
            </div>

            <div
              className="group bg-white rounded-2xl border border-[#e4e4e7] p-6 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all md:min-h-[180px]"
              onClick={navigateToOrderHistory}
            >
              <div className="h-full flex flex-col justify-between">
                <div className="w-12 h-12 bg-[#eef2ff] rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-[#6366f1]" />
                </div>
                <div className="mt-4">
                  <p className="text-lg font-bold text-[#18181b]">発注書履歴</p>
                  <p className="text-xs text-[#71717a] mt-1">過去の発注書を確認・管理できます</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 管理者レイアウト: Bento Grid
  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Bento Grid - モバイル1列 / タブレット2列 / デスクトップ4列 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 md:grid-rows-[180px_100px] gap-3">

          {/* 新規発注書作成 - 大きいセル */}
          <div
            className="group col-span-1 sm:col-span-2 md:row-span-2 bg-white rounded-2xl border border-[#e4e4e7] p-6 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all min-h-[200px] sm:min-h-0"
            onClick={navigateToOrderForm}
          >
            <div className="h-full flex flex-col justify-between">
              <div className="w-12 h-12 bg-[#eef2ff] rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-[#6366f1]" />
              </div>
              <div>
                <p className="text-xl font-bold text-[#18181b]">新規発注書作成</p>
                <p className="text-sm text-[#71717a] mt-1">新しい発注書を作成します</p>
              </div>
            </div>
          </div>

          {/* 発注書履歴 */}
          <div
            className="group col-span-1 sm:col-span-2 bg-white rounded-2xl border border-[#e4e4e7] p-5 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all"
            onClick={navigateToOrderHistory}
          >
            <div className="h-full flex items-center gap-4">
              <div className="w-12 h-12 bg-[#eef2ff] rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-[#6366f1]" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-[#18181b]">発注書履歴</p>
                <p className="text-xs text-[#71717a] mt-0.5">過去の発注書を確認・管理できます</p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#d4d4d8] group-hover:text-[#6366f1] transition-colors" />
            </div>
          </div>

          {/* 管理者メニュー */}
          <div
            className="group bg-white rounded-2xl border border-[#e4e4e7] px-5 py-4 cursor-pointer hover:shadow-md hover:bg-[#fafafa] transition-all flex items-center gap-3"
            onClick={navigateToCompanySettings}
          >
            <div className="w-9 h-9 bg-[#eef2ff] rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4 w-4 text-[#6366f1]" />
            </div>
            <p className="text-sm font-semibold text-[#18181b]">会社設定</p>
          </div>

          <div
            className="group bg-white rounded-2xl border border-[#e4e4e7] px-5 py-4 cursor-pointer hover:shadow-md hover:bg-[#fafafa] transition-all flex items-center gap-3"
            onClick={navigateToMaterials}
          >
            <div className="w-9 h-9 bg-[#eef2ff] rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="h-4 w-4 text-[#6366f1]" />
            </div>
            <p className="text-sm font-semibold text-[#18181b]">資材管理</p>
          </div>

        </div>
      </div>
    </div>
  );
}

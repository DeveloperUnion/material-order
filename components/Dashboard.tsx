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
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div
              className="group bg-white rounded-2xl border border-[#e4e4e7] p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all min-h-[100px] sm:min-h-[140px]"
              onClick={navigateToOrderForm}
            >
              <div className="h-full flex items-center gap-3 sm:gap-5">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#ecfeff] rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-[#0891b2]" />
                </div>
                <p className="text-base sm:text-lg font-bold text-[#18181b]">発注</p>
                <ChevronRight className="h-5 w-5 text-[#d4d4d8] group-hover:text-[#0891b2] transition-colors ml-auto" />
              </div>
            </div>

            <div
              className="group bg-white rounded-2xl border border-[#e4e4e7] p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all min-h-[100px] sm:min-h-[140px]"
              onClick={navigateToOrderHistory}
            >
              <div className="h-full flex items-center gap-3 sm:gap-5">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#ecfeff] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 sm:h-7 sm:w-7 text-[#0891b2]" />
                </div>
                <p className="text-base sm:text-lg font-bold text-[#18181b]">履歴</p>
                <ChevronRight className="h-5 w-5 text-[#d4d4d8] group-hover:text-[#0891b2] transition-colors ml-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 管理者レイアウト
  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* メインメニュー: 発注・履歴（同サイズ） */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div
            className="group bg-white rounded-2xl border border-[#e4e4e7] p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all min-h-[100px] sm:min-h-[140px]"
            onClick={navigateToOrderForm}
          >
            <div className="h-full flex items-center gap-3 sm:gap-5">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#ecfeff] rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-[#0891b2]" />
              </div>
              <p className="flex-1 text-base sm:text-lg font-bold text-[#18181b]">発注</p>
              <ChevronRight className="h-5 w-5 text-[#d4d4d8] group-hover:text-[#0891b2] transition-colors" />
            </div>
          </div>

          <div
            className="group bg-white rounded-2xl border border-[#e4e4e7] p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all min-h-[100px] sm:min-h-[140px]"
            onClick={navigateToOrderHistory}
          >
            <div className="h-full flex items-center gap-3 sm:gap-5">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#ecfeff] rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 sm:h-7 sm:w-7 text-[#0891b2]" />
              </div>
              <p className="flex-1 text-base sm:text-lg font-bold text-[#18181b]">履歴</p>
              <ChevronRight className="h-5 w-5 text-[#d4d4d8] group-hover:text-[#0891b2] transition-colors" />
            </div>
          </div>
        </div>

        {/* 管理者メニュー: 会社設定・資材管理（同サイズ） */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <div
            className="group bg-white rounded-2xl border border-[#e4e4e7] p-4 sm:px-5 sm:py-5 cursor-pointer hover:shadow-md hover:bg-[#fafafa] transition-all flex items-center gap-3 sm:gap-5"
            onClick={navigateToCompanySettings}
          >
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#ecfeff] rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 sm:h-7 sm:w-7 text-[#0891b2]" />
            </div>
            <p className="text-base sm:text-lg font-bold text-[#18181b]">会社設定</p>
          </div>

          <div
            className="group bg-white rounded-2xl border border-[#e4e4e7] p-4 sm:px-5 sm:py-5 cursor-pointer hover:shadow-md hover:bg-[#fafafa] transition-all flex items-center gap-3 sm:gap-5"
            onClick={navigateToMaterials}
          >
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#ecfeff] rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 sm:h-7 sm:w-7 text-[#0891b2]" />
            </div>
            <p className="text-base sm:text-lg font-bold text-[#18181b]">資材管理</p>
          </div>
        </div>
      </div>
    </div>
  );
}

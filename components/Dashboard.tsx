"use client";

import { useRouter } from 'next/navigation';
import { FileText, Clock, Building2, Package, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import type { LucideIcon } from 'lucide-react';

interface MenuItem {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

interface MenuCardProps extends MenuItem {
  onClick: () => void;
}

function MenuCard({ title, description, icon: Icon, onClick }: MenuCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full bg-surface border border-border rounded-2xl p-5 sm:p-6 text-left cursor-pointer transition-all hover:border-border-strong hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-accent-soft flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-[1.04]">
          <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px] text-accent" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] sm:text-base font-bold text-foreground tracking-tight leading-tight">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-muted leading-snug">
            {description}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-subtle flex-shrink-0 transition-all group-hover:text-accent group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const baseItems: MenuItem[] = [
    {
      title: '発注',
      description: '新しい資材発注書を作成',
      icon: FileText,
      href: '/material-order',
    },
    {
      title: '履歴',
      description: '過去の発注を確認・再利用',
      icon: Clock,
      href: '/order-history',
    },
  ];

  const adminItems: MenuItem[] = [
    {
      title: '会社設定',
      description: '会社情報・メンバー管理',
      icon: Building2,
      href: '/admin/settings',
    },
    {
      title: '資材管理',
      description: '資材マスタの登録・編集',
      icon: Package,
      href: '/admin/materials',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
        <div className="text-right text-xs sm:text-sm font-mono tabular-nums text-muted mb-4 sm:mb-6">
          {formatDate(new Date())}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {baseItems.map((item) => (
            <MenuCard
              key={item.href}
              {...item}
              onClick={() => router.push(item.href)}
            />
          ))}
          {isAdmin &&
            adminItems.map((item) => (
              <MenuCard
                key={item.href}
                {...item}
                onClick={() => router.push(item.href)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

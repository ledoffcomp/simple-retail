import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Truck, 
  ReceiptText, 
  Coins, 
  Settings, 
  Store,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  shiftStatus: { isOpen: boolean; starting_cash?: number; cashier_name?: string };
  lowStockCount: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge: string | null;
  badgeColor?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  shiftStatus,
  lowStockCount,
}) => {
  const navItems: NavGroup[] = [
    {
      group: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'pos', label: 'Касса / РМК', icon: ShoppingCart, badge: 'F1' },
        { id: 'receipts', label: 'Чеки и продажи', icon: ReceiptText, badge: null },
      ]
    },
    {
      group: 'СКЛАД И ЦЕНЫ',
      items: [
        { 
          id: 'products', 
          label: 'Товары и цены', 
          icon: Package, 
          badge: lowStockCount > 0 ? `${lowStockCount}` : null,
          badgeColor: 'bg-[#ff9500] text-white'
        },
        { id: 'supplies', label: 'Склад и приход', icon: Truck, badge: null },
      ]
    },
    {
      group: 'ФИНАНСЫ И СИСТЕМА',
      items: [
        { id: 'shifts', label: 'Касса и смены', icon: Coins, badge: null },
        { id: 'settings', label: 'Настройки', icon: Settings, badge: null },
      ]
    }
  ];

  return (
    <aside className="w-[230px] my-3 ml-3 flex flex-col justify-between shrink-0 select-none h-[calc(100vh-1.5rem)] sticky top-3 glass-panel p-3.5 z-20">
      <div>
        {/* Project Brand Header (Matches Figma Flowly header) */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-md">
              <Store className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="leading-tight">
              <h3 className="font-semibold text-xs text-foreground tracking-tight">Простая Розница</h3>
              <p className="text-[10px] text-muted-foreground">Управление торговлей</p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-lg glass-subpanel flex items-center justify-center text-muted-foreground">
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Shift Status Pill */}
        <div className="my-3 px-3 py-1.5 glass-subpanel flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${shiftStatus.isOpen ? 'bg-[#34c759] shadow-[0_0_6px_#34c759]' : 'bg-[#ff9500]'}`} />
            <span className="font-medium text-foreground">
              {shiftStatus.isOpen ? 'Смена открыта' : 'Смена закрыта'}
            </span>
          </div>
          <button
            onClick={() => setActiveTab('shifts')}
            className="text-[10px] font-semibold text-[#6531F7] hover:underline"
          >
            Инфо
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-4 pt-1">
          {navItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <h4 className="px-2 text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                {group.group}
              </h4>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all duration-150 relative ${
                        isActive
                          ? 'bg-white/80 dark:bg-white/10 text-foreground font-semibold shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/5'
                      }`}
                    >
                      {/* Active indicator bar matching Figma design */}
                      {isActive && (
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-[#6531F7] shadow-[0_0_8px_rgba(101,49,247,0.8)]" />
                      )}

                      <div className="flex items-center gap-2.5 pl-1.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#6531F7]' : 'text-muted-foreground'}`} />
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                          item.badgeColor || 'bg-[#6531F7]/15 text-[#6531F7]'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Electric Button (Matches Figma 'AI Insight Hub' button) */}
      <div className="space-y-2 pt-2">
        <button
          onClick={() => setActiveTab('pos')}
          className="w-full py-2.5 px-3 rounded-[18px] bg-gradient-to-r from-[#6531F7] to-[#7B46FF] text-white font-semibold text-xs shadow-[0_0_12px_rgba(101,49,247,0.35)] hover:shadow-[0_0_18px_rgba(101,49,247,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4 fill-white" />
          <span>Касса (РМК)</span>
          <span className="bg-white/20 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-md">F1</span>
        </button>

        <div className="px-2 py-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34c759]" />
            <span>Кассир: Админ</span>
          </div>
          <span className="text-[10px] text-muted-foreground/60">v1.2</span>
        </div>
      </div>
    </aside>
  );
};

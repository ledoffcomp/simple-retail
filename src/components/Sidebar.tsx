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
  Zap,
  CreditCard,
  AlertCircle
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
      group: 'ПРОДАЖИ И КЛИЕНТЫ',
      items: [
        { id: 'dashboard', label: 'Аналитика и период', icon: LayoutDashboard, badge: null },
        { id: 'pos', label: 'Касса / РМК', icon: ShoppingCart, badge: 'F1' },
        { id: 'debts', label: 'Долги клиентов', icon: AlertCircle, badge: 'А5', badgeColor: 'bg-rose-500 text-white' },
        { id: 'receipts', label: 'Накладные и чеки', icon: ReceiptText, badge: null },
      ]
    },
    {
      group: 'СКЛАД И МАТЕРИАЛЫ',
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
      group: 'ФИНАНСЫ И НАСТРОЙКИ',
      items: [
        { id: 'shifts', label: 'Касса и смены', icon: Coins, badge: null },
        { id: 'settings', label: 'Настройки точки', icon: Settings, badge: null },
      ]
    }
  ];

  return (
    <aside className="w-[230px] my-3 ml-3 flex flex-col justify-between shrink-0 select-none h-[calc(100vh-1.5rem)] sticky top-3 glass-panel p-3.5 z-20">
      <div>
        {/* Project Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-md">
              <Store className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="leading-tight">
              <h3 className="font-extrabold text-xs text-foreground tracking-tight">VIP-Plast</h3>
              <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">Подоконники & отливы</p>
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
                      {/* Active indicator bar */}
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

      {/* Bottom Pro / System Widget */}
      <div className="pt-2">
        <div className="glass-subpanel p-3 rounded-xl border border-white/60 dark:border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> VIP-Plast Учет
            </span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
              А5 готова
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Подоконники, отливы, сэндвич панели, расчет накладных и долгов.
          </p>
        </div>
      </div>
    </aside>
  );
};

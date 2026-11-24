import React from 'react';
import { 
  Search, 
  Sun, 
  Moon, 
  Bell, 
  MessageSquare, 
  ShoppingCart, 
  PlusCircle, 
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenPOS: () => void;
  onOpenNewProduct: () => void;
  onRefresh?: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenPOS,
  onOpenNewProduct,
  onRefresh,
  isDark,
  toggleTheme,
}) => {
  return (
    <header className="h-16 px-4 my-3 mr-3 glass-panel flex items-center justify-between gap-4 z-20">
      {/* Top Search Input (Matches Figma Glass Search Input) */}
      <div className="flex-1 max-w-xl relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
          <Search className="w-4 h-4 text-muted-foreground/70" />
        </div>
        <input
          type="text"
          placeholder="Поиск товаров по штрихкоду, названию, чеков (F2)..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/40 dark:bg-white/[0.04] border border-white/60 dark:border-white/10 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#6531F7]/40 shadow-inner"
        />
      </div>

      {/* Right Top Actions */}
      <div className="flex items-center gap-2.5">
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Обновить данные"
            className="w-9 h-9 rounded-xl glass-subpanel flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Theme Switcher Pill (Matches Figma Sun/Moon toggle pill) */}
        <div className="p-1 rounded-xl glass-subpanel flex items-center gap-1">
          <button
            onClick={() => { if (isDark) toggleTheme(); }}
            className={`p-1.5 rounded-lg transition-all ${
              !isDark ? 'bg-white shadow-sm text-amber-500' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { if (!isDark) toggleTheme(); }}
            className={`p-1.5 rounded-lg transition-all ${
              isDark ? 'bg-white/20 shadow-sm text-indigo-400' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Notifications Icon Button */}
        <button className="w-9 h-9 rounded-xl glass-subpanel flex items-center justify-center text-muted-foreground hover:text-foreground relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#ff3b30]" />
        </button>

        {/* Add Product Button */}
        <button
          onClick={onOpenNewProduct}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl glass-subpanel hover:bg-white/80 dark:hover:bg-white/10 text-xs font-semibold text-foreground transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#6531F7]" />
          <span>+ Товар</span>
        </button>

        {/* Primary Action Button (Matches Figma Purple Button) */}
        <button
          onClick={onOpenPOS}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#6531F7] to-[#7B46FF] text-white text-xs font-bold shadow-[0_0_12px_rgba(101,49,247,0.35)] hover:shadow-[0_0_16px_rgba(101,49,247,0.5)] active:scale-95 transition-all"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>В кассу</span>
          <span className="bg-white/20 text-white font-mono text-[9px] px-1 rounded">F1</span>
        </button>

        {/* User Account Avatar (Matches Figma rounded image avatar) */}
        <div className="w-9 h-9 rounded-xl overflow-hidden glass-subpanel p-0.5 border border-white/80 dark:border-white/20">
          <div className="w-full h-full rounded-[10px] bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white font-bold text-xs">
            А
          </div>
        </div>
      </div>
    </header>
  );
};

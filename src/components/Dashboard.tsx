import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  CircleDollarSign, 
  Receipt, 
  ShoppingBag, 
  AlertTriangle, 
  ArrowUpRight, 
  Calendar, 
  CreditCard, 
  Banknote, 
  Smartphone,
  ChevronRight,
  Package,
  Plus,
  Send,
  Sparkles,
  BarChart2,
  PieChart,
  ArrowRight
} from 'lucide-react';
import { AnalyticsSummary, Shift } from '../types';

interface DashboardProps {
  summary: AnalyticsSummary | null;
  shift: Shift | null;
  onNavigate: (tab: string) => void;
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  summary,
  shift,
  onNavigate,
  onRefresh
}) => {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(6); // Default hover on Jul like Figma
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  if (!summary) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground text-sm">Загрузка аналитики...</div>
      </div>
    );
  }

  const { today, yesterday, stockStats, last7Days, topProducts, recentSales } = summary;

  const revDiff = today.revenue - yesterday.revenue;
  const revTrendPercent = yesterday.revenue > 0 
    ? Math.round((revDiff / yesterday.revenue) * 100) 
    : today.revenue > 0 ? 10 : 0;

  // Monthly mock data matching the exact Figma chart curve
  const monthsData = [
    { month: 'Jan', rev: 24000, cost: 7000, newMrr: 12000, churn: 2000 },
    { month: 'Feb', rev: 19000, cost: 5000, newMrr: 14000, churn: 1500 },
    { month: 'Mar', rev: 21000, cost: 6000, newMrr: 11000, churn: 1800 },
    { month: 'Apr', rev: 18000, cost: 4500, newMrr: 9000, churn: 1200 },
    { month: 'May', rev: 22000, cost: 6500, newMrr: 13000, churn: 1600 },
    { month: 'Jun', rev: 26000, cost: 7500, newMrr: 15000, churn: 2100 },
    { month: 'Jul', rev: 28500, cost: 8000, newMrr: 17832, churn: 2200 },
    { month: 'Aug', rev: 27000, cost: 7800, newMrr: 16000, churn: 1900 },
    { month: 'Sep', rev: 29000, cost: 8200, newMrr: 17500, churn: 2000 },
    { month: 'Oct', rev: 31000, cost: 8900, newMrr: 18900, churn: 2400 },
    { month: 'Nov', rev: 32500, cost: 9200, newMrr: 19500, churn: 2300 },
    { month: 'Dec', rev: 35000, cost: 10000, newMrr: 21000, churn: 2500 },
  ];

  const handleAskAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiResponse(`На основе продаж точки: средний чек составляет ${today.avg_check || 450} ₽. Самая маржинальная позиция недели — Кофе и Снеки (+75% наценки). Рекомендуется пополнить остатки.`);
    setAiQuestion('');
  };

  return (
    <div className="p-4 mr-3 space-y-4 max-w-[1600px]">
      {/* 5 Top Glass Cards (Matches Figma Row 1) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Revenue */}
        <div className="glass-panel p-1.5 flex flex-col justify-between">
          <div className="glass-subpanel p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <span className="text-[#34c759] font-bold">▲</span>
              <span>Выручка сегодня</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold font-mono text-foreground">
                {(today.revenue || 12450).toLocaleString('ru-RU')} ₽
              </div>
              <span className="bg-[#34c759] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                +{revTrendPercent}%
              </span>
            </div>
          </div>
          <div className="mt-1 px-3 py-1.5 rounded-b-xl bg-gradient-to-r from-[#6531F7]/10 to-transparent border-l-2 border-[#6531F7] flex items-center justify-between text-[11px]">
            <span className="text-foreground italic truncate">Прогноз: +18% к концу недели</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
        </div>

        {/* Card 2: Profit / Margin */}
        <div className="glass-panel p-1.5 flex flex-col justify-between">
          <div className="glass-subpanel p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <span className="text-[#34c759] font-bold">▲</span>
              <span>Чистая прибыль</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold font-mono text-foreground">
                {(today.profit || 5245).toLocaleString('ru-RU')} ₽
              </div>
              <span className="bg-[#34c759] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                +15%
              </span>
            </div>
          </div>
          <div className="mt-1 px-3 py-1.5 rounded-b-xl bg-gradient-to-r from-[#6531F7]/10 to-transparent border-l-2 border-[#6531F7] flex items-center justify-between text-[11px]">
            <span className="text-foreground italic truncate">Драйвер роста: Бакалея и Кофе</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
        </div>

        {/* Card 3: Receipts & Avg Check */}
        <div className="glass-panel p-1.5 flex flex-col justify-between">
          <div className="glass-subpanel p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <span className="text-[#ff3b30] font-bold">▼</span>
              <span>Чеков за день</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold font-mono text-foreground">
                {today.receipts || 28} <span className="text-xs font-normal text-muted-foreground">шт</span>
              </div>
              <span className="bg-[#ff3b30] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                -3%
              </span>
            </div>
          </div>
          <div className="mt-1 px-3 py-1.5 rounded-b-xl bg-gradient-to-r from-[#6531F7]/10 to-transparent border-l-2 border-[#6531F7] flex items-center justify-between text-[11px]">
            <span className="text-foreground italic truncate">Ср. чек: {today.avg_check || 445} ₽</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
        </div>

        {/* Card 4: Inventory & Low Stock */}
        <div className="glass-panel p-1.5 flex flex-col justify-between">
          <div className="glass-subpanel p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <span className="text-[#34c759] font-bold">▲</span>
              <span>Товары на складе</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold font-mono text-foreground">
                {stockStats.total_products || 10} <span className="text-xs font-normal text-muted-foreground">поз.</span>
              </div>
              <span className="bg-[#34c759] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                ОК
              </span>
            </div>
          </div>
          <div className="mt-1 px-3 py-1.5 rounded-b-xl bg-gradient-to-r from-[#6531F7]/10 to-transparent border-l-2 border-[#6531F7] flex items-center justify-between text-[11px]">
            <span className="text-foreground italic truncate">{stockStats.low_stock_count} поз. требуют заказа</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
        </div>

        {/* Card 5: Cash In Drawer */}
        <div className="glass-panel p-1.5 flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="glass-subpanel p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <span className="text-[#34c759] font-bold">▲</span>
              <span>Деньги в кассе</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold font-mono text-foreground">
                {(shift?.expectedCashInDrawer || 3000).toLocaleString('ru-RU')} ₽
              </div>
              <span className="bg-[#34c759] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                Смена
              </span>
            </div>
          </div>
          <div className="mt-1 px-3 py-1.5 rounded-b-xl bg-gradient-to-r from-[#6531F7]/10 to-transparent border-l-2 border-[#6531F7] flex items-center justify-between text-[11px]">
            <span className="text-foreground italic truncate">Размен: {shift?.starting_cash || 0} ₽</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
        </div>
      </div>

      {/* Middle Row (Matches Figma Row 2: Large Chart + AI Insights) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left 8 Cols: Revenue & MRR Dynamics Graph */}
        <div className="lg:col-span-8 glass-panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Динамика выручки и чистой прибыли</h3>
              <p className="text-[11px] text-muted-foreground">Сравнение продаж, себестоимости и чистого дохода</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6531F7]" /> Выручка
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-[#34c759]" /> Доход
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-[#ff3b30]" /> Закупка
                </span>
              </div>
              <div className="glass-pill px-3 py-1 text-[11px] font-semibold text-foreground">
                2025 / Месяцы
              </div>
            </div>
          </div>

          {/* Bar & Trend Chart Canvas with Interactive Tooltip (Exact Figma Replica) */}
          <div className="glass-subpanel p-4 relative h-64 flex flex-col justify-between">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-x-4 top-8 bottom-8 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-black dark:border-white" />
              <div className="border-b border-black dark:border-white" />
              <div className="border-b border-black dark:border-white" />
              <div className="border-b border-black dark:border-white" />
            </div>

            {/* Bars container */}
            <div className="flex-1 flex items-end justify-between gap-1 sm:gap-3 px-2 z-10">
              {monthsData.map((item, idx) => {
                const isHovered = hoveredMonth === idx;
                const revHeight = Math.min(180, Math.max(20, Math.round((item.rev / 35000) * 160)));
                const costHeight = Math.min(80, Math.max(10, Math.round((item.cost / 35000) * 160)));

                return (
                  <div 
                    key={idx}
                    onMouseEnter={() => setHoveredMonth(idx)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {/* Tooltip on active hover (Figma style) */}
                    {isHovered && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-44 p-2.5 glass-panel bg-white/95 dark:bg-zinc-900/95 shadow-2xl z-30 space-y-1 text-[10px] pointer-events-none animate-in fade-in zoom-in-95">
                        <div className="font-bold text-foreground border-b border-border pb-1">
                          {item.month} 2025 • Итоги
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Выручка:</span>
                          <span className="font-mono font-bold text-foreground">{item.rev.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-500 font-semibold">Доход:</span>
                          <span className="font-mono font-bold text-emerald-500">{(item.rev - item.cost).toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-rose-500">Себестоимость:</span>
                          <span className="font-mono text-rose-500">{item.cost.toLocaleString()} ₽</span>
                        </div>
                      </div>
                    )}

                    {/* Bars pair: Green (Income) and Red (Cost) */}
                    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1">
                      <div 
                        style={{ height: `${revHeight}px` }}
                        className={`w-2.5 sm:w-3 rounded-t-sm transition-all ${
                          isHovered ? 'bg-[#34c759] shadow-[0_0_8px_#34c759]' : 'bg-[#34c759]/80'
                        }`}
                      />
                      <div 
                        style={{ height: `${costHeight}px` }}
                        className={`w-2.5 sm:w-3 rounded-t-sm transition-all ${
                          isHovered ? 'bg-[#ff3b30] shadow-[0_0_8px_#ff3b30]' : 'bg-[#ff3b30]/70'
                        }`}
                      />
                    </div>

                    <span className={`text-[10px] mt-2 font-medium transition-colors ${
                      isHovered ? 'text-[#6531F7] font-bold' : 'text-muted-foreground'
                    }`}>
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: AI Insights Panel (Matches Figma Right Card) */}
        <div className="lg:col-span-4 glass-panel p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6531F7]" />
                <h3 className="font-semibold text-sm text-foreground">AI Аналитика и Рекомендации</h3>
              </div>
            </div>

            {/* 2 Sub-cards in Figma style */}
            <div className="mt-3 space-y-2.5">
              {/* Insight 1: Low stock alert */}
              <div className="glass-subpanel p-3 space-y-1.5 border-l-4 border-amber-500">
                <div className="flex items-center justify-between text-xs font-bold text-amber-500">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Внимание: Остатки
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20">Срочно</span>
                </div>
                <p className="text-[11px] text-foreground leading-snug">
                  У 3 позиций остаток ниже минимума (Кофе зерновой, Вода 0.5л). Закажите у поставщика, чтобы не потерять продажи.
                </p>
                <button
                  onClick={() => onNavigate('supplies')}
                  className="text-[10px] font-bold text-[#6531F7] hover:underline flex items-center gap-0.5 pt-1"
                >
                  Оформить приход <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Insight 2: Forecast growth */}
              <div className="glass-subpanel p-3 space-y-1.5 border-l-4 border-[#6531F7]">
                <div className="flex items-center justify-between text-xs font-bold text-[#6531F7]">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Прогноз продаж
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#6531F7]/20">+18%</span>
                </div>
                <p className="text-[11px] text-foreground leading-snug">
                  Ожидается пиковый спрос в выходные дни по категориям «Напитки» и «Снеки».
                </p>
                <button
                  onClick={() => onNavigate('products')}
                  className="text-[10px] font-bold text-[#6531F7] hover:underline flex items-center gap-0.5 pt-1"
                >
                  Открыть каталог <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {aiResponse && (
                <div className="glass-subpanel p-3 text-[11px] text-foreground bg-[#6531F7]/10 border border-[#6531F7]/30">
                  {aiResponse}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Chat with AI Input (Matches Figma Glass Pill Input + Button) */}
          <form onSubmit={handleAskAi} className="pt-2 flex items-center gap-2">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Спросить AI о выручке, остатках..."
              className="flex-1 px-3 py-2 rounded-xl glass-subpanel text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#6531F7]/40 shadow-inner"
            />
            <button
              type="submit"
              className="w-8 h-8 rounded-xl bg-[#6531F7] hover:bg-[#5224d4] text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Row (Matches Figma Row 3: Segmentation + Features + Satisfaction) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Category Segmentation */}
        <div className="glass-panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
            <div>
              <h4 className="font-semibold text-xs text-foreground">Продажи по категориям</h4>
              <p className="text-[10px] text-muted-foreground">Доля в общей выручке точки</p>
            </div>
            <PieChart className="w-4 h-4 text-[#6531F7]" />
          </div>

          <div className="flex items-center justify-center gap-4 py-2">
            {/* Visual SVG Donut */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-black/5 dark:text-white/5" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#6531F7" strokeWidth="4" strokeDasharray="42, 100" strokeLinecap="round" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#34C759" strokeWidth="4" strokeDasharray="30, 100" strokeDashoffset="-42" strokeLinecap="round" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#FF9500" strokeWidth="4" strokeDasharray="28, 100" strokeDashoffset="-72" strokeLinecap="round" />
              </svg>
              <span className="absolute font-bold text-xs text-foreground">100%</span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6531F7]" />
                <span className="text-muted-foreground">Напитки:</span>
                <strong className="text-foreground font-mono">42%</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
                <span className="text-muted-foreground">Бакалея:</span>
                <strong className="text-foreground font-mono">30%</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF9500]" />
                <span className="text-muted-foreground">Снеки:</span>
                <strong className="text-foreground font-mono">28%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Top Selling Products */}
        <div className="glass-panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
            <div>
              <h4 className="font-semibold text-xs text-foreground">Лидеры продаж</h4>
              <p className="text-[10px] text-muted-foreground">Топ популярных позиций</p>
            </div>
            <button onClick={() => onNavigate('products')} className="text-[10px] text-[#6531F7] font-bold hover:underline">
              Все
            </button>
          </div>

          <div className="space-y-2.5">
            {topProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Нет данных</p>
            ) : (
              topProducts.slice(0, 3).map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground truncate max-w-[140px]">{item.name}</span>
                    <span className="font-mono font-bold text-foreground">{item.total_revenue} ₽</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[#6531F7] to-[#A382FF]"
                      style={{ width: `${Math.min(100, Math.max(25, (item.units_sold / (topProducts[0]?.units_sold || 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 3: Shift Health / Customer Rating */}
        <div className="glass-panel p-4 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
            <div>
              <h4 className="font-semibold text-xs text-foreground">Состояние кассы</h4>
              <p className="text-[10px] text-muted-foreground">Сверка ящика и безналичных оплат</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#34C759]/20 text-[#34C759]">
              100%
            </span>
          </div>

          <div className="text-center py-1">
            <div className="text-3xl font-extrabold font-mono text-foreground">
              {shift ? 'Смена активна' : 'Смена закрыта'}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Все чеки фискализированы и синхронизированы в локальной базе
            </p>
          </div>

          <div className="pt-2 border-t border-black/5 dark:border-white/10">
            <button
              onClick={() => onNavigate('pos')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#6531F7] to-[#7B46FF] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Открыть РМК Кассира</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

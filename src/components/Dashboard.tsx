import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Filter,
  FileText
} from 'lucide-react';
import { AnalyticsSummary, Shift, PeriodAnalytics } from '../types';
import { api } from '../api';

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
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(6);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  // Period Analytics Filter State
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [periodData, setPeriodData] = useState<PeriodAnalytics | null>(null);
  const [isLoadingPeriod, setIsLoadingPeriod] = useState<boolean>(false);

  // Load period analytics when period changes
  const fetchPeriodStats = async (periodKey: string, start?: string, end?: string) => {
    try {
      setIsLoadingPeriod(true);
      let sDate = '';
      let eDate = '';
      const now = new Date();

      if (periodKey === 'today') {
        sDate = now.toISOString().slice(0, 10);
        eDate = sDate;
      } else if (periodKey === 'yesterday') {
        const y = new Date(now.getTime() - 86400000);
        sDate = y.toISOString().slice(0, 10);
        eDate = sDate;
      } else if (periodKey === 'week') {
        const w = new Date(now.getTime() - 7 * 86400000);
        sDate = w.toISOString().slice(0, 10);
        eDate = now.toISOString().slice(0, 10);
      } else if (periodKey === 'month') {
        const m = new Date(now.getFullYear(), now.getMonth(), 1);
        sDate = m.toISOString().slice(0, 10);
        eDate = now.toISOString().slice(0, 10);
      } else if (periodKey === 'custom') {
        sDate = start || '';
        eDate = end || '';
      }

      const res = await api.getPeriodAnalytics(sDate || undefined, eDate || undefined);
      setPeriodData(res);
    } catch (err) {
      console.error('Ошибка загрузки аналитики за период:', err);
    } finally {
      setIsLoadingPeriod(false);
    }
  };

  useEffect(() => {
    fetchPeriodStats(selectedPeriod, customStart, customEnd);
  }, [selectedPeriod]);

  if (!summary) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground text-sm">Загрузка аналитики VIP-Plast...</div>
      </div>
    );
  }

  const { today, yesterday, stockStats, topProducts } = summary;

  const revDiff = today.revenue - yesterday.revenue;
  const revTrendPercent = yesterday.revenue > 0 
    ? Math.round((revDiff / yesterday.revenue) * 100) 
    : today.revenue > 0 ? 10 : 0;

  // Monthly mock data translated to Russian and matching building materials dynamics
  const monthsData = [
    { month: 'Янв', rev: 240000, cost: 150000 },
    { month: 'Фев', rev: 290000, cost: 180000 },
    { month: 'Мар', rev: 350000, cost: 210000 },
    { month: 'Апр', rev: 420000, cost: 260000 },
    { month: 'Май', rev: 510000, cost: 310000 },
    { month: 'Июн', rev: 590000, cost: 360000 },
    { month: 'Июл', rev: 640000, cost: 390000 },
    { month: 'Авг', rev: 610000, cost: 375000 },
    { month: 'Сен', rev: 580000, cost: 355000 },
    { month: 'Окт', rev: 490000, cost: 300000 },
    { month: 'Ноя', rev: 410000, cost: 250000 },
    { month: 'Дек', rev: 380000, cost: 235000 },
  ];

  const handleAskAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiResponse(`VIP-Plast Аналитика: По подоконникам ПВХ средняя наценка составляет +45%, по сэндвич-панелям +38%. Рекомендуется поддерживать неснижаемый запас белого подоконника 250–350мм не менее 50 м.п.`);
    setAiQuestion('');
  };

  return (
    <div className="p-4 mr-3 space-y-4 max-w-[1600px]">
      {/* 5 Top Glass Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Today Revenue */}
        <div className="glass-panel p-1.5 flex flex-col justify-between">
          <div className="glass-subpanel p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <span className="text-[#34c759] font-bold">▲</span>
              <span>Выручка сегодня</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold font-mono text-foreground">
                {(today.revenue || 0).toLocaleString('ru-RU')} ₽
              </div>
              <span className="bg-[#34c759] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                +{revTrendPercent}%
              </span>
            </div>
          </div>
          <div className="mt-1 px-3 py-1.5 rounded-b-xl bg-gradient-to-r from-[#6531F7]/10 to-transparent border-l-2 border-[#6531F7] flex items-center justify-between text-[11px]">
            <span className="text-foreground italic truncate">VIP-Plast продажи</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
        </div>

        {/* Card 2: Today Profit */}
        <div className="glass-panel p-1.5 flex flex-col justify-between">
          <div className="glass-subpanel p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <span className="text-[#34c759] font-bold">▲</span>
              <span>Чистая прибыль</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold font-mono text-foreground">
                {(today.profit || 0).toLocaleString('ru-RU')} ₽
              </div>
              <span className="bg-[#34c759] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                Прибыль
              </span>
            </div>
          </div>
          <div className="mt-1 px-3 py-1.5 rounded-b-xl bg-gradient-to-r from-[#6531F7]/10 to-transparent border-l-2 border-[#6531F7] flex items-center justify-between text-[11px]">
            <span className="text-foreground italic truncate">Маржинальность учтена</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
        </div>

        {/* Card 3: Invoices Count & Avg Check */}
        <div className="glass-panel p-1.5 flex flex-col justify-between">
          <div className="glass-subpanel p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <span className="text-[#6531F7] font-bold">●</span>
              <span>Накладных сегодня</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold font-mono text-foreground">
                {today.receipts || 0} <span className="text-xs font-normal text-muted-foreground">шт</span>
              </div>
              <span className="bg-[#6531F7] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                А5
              </span>
            </div>
          </div>
          <div className="mt-1 px-3 py-1.5 rounded-b-xl bg-gradient-to-r from-[#6531F7]/10 to-transparent border-l-2 border-[#6531F7] flex items-center justify-between text-[11px]">
            <span className="text-foreground italic truncate">Ср. заказ: {today.avg_check || 0} ₽</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
        </div>

        {/* Card 4: Inventory Items */}
        <div className="glass-panel p-1.5 flex flex-col justify-between">
          <div className="glass-subpanel p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <span className="text-[#34c759] font-bold">▲</span>
              <span>Позиций в каталоге</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold font-mono text-foreground">
                {stockStats.total_products || 0} <span className="text-xs font-normal text-muted-foreground">разм.</span>
              </div>
              <span className="bg-[#34c759] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                Склад
              </span>
            </div>
          </div>
          <div className="mt-1 px-3 py-1.5 rounded-b-xl bg-gradient-to-r from-[#6531F7]/10 to-transparent border-l-2 border-[#6531F7] flex items-center justify-between text-[11px]">
            <span className="text-foreground italic truncate">{stockStats.low_stock_count || 0} поз. требуют заказа</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
        </div>

        {/* Card 5: Cash / Drawer */}
        <div className="glass-panel p-1.5 flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="glass-subpanel p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <span className="text-[#34c759] font-bold">▲</span>
              <span>Деньги в кассе</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold font-mono text-foreground">
                {(shift?.expectedCashInDrawer || 0).toLocaleString('ru-RU')} ₽
              </div>
              <span className="bg-[#34c759] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                Касса
              </span>
            </div>
          </div>
          <div className="mt-1 px-3 py-1.5 rounded-b-xl bg-gradient-to-r from-[#6531F7]/10 to-transparent border-l-2 border-[#6531F7] flex items-center justify-between text-[11px]">
            <span className="text-foreground italic truncate">Размен: {shift?.starting_cash || 0} ₽</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SPECIAL FEATURE: PERIOD SALES REPORT ("СКОЛЬКО ПРОДАЛИ ЗА ПЕРИОД") */}
      {/* ============================================================ */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-black/5 dark:border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#6531F7]" />
              <h3 className="font-bold text-sm text-foreground">Отчет о продажах за период</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6531F7]/15 text-[#6531F7] font-bold">
                VIP-Plast учет
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Выберите период для просмотра точной выручки, прибыли, отданного в долг и проданных материалов
            </p>
          </div>

          {/* Period selector buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Сегодня' },
              { id: 'yesterday', label: 'Вчера' },
              { id: 'week', label: 'Последние 7 дней' },
              { id: 'month', label: 'Этот месяц' },
              { id: 'all', label: 'Весь период' },
              { id: 'custom', label: 'Выбрать даты' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedPeriod(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedPeriod === tab.id
                    ? 'bg-gradient-to-r from-[#6531F7] to-[#7B46FF] text-white shadow-sm'
                    : 'glass-subpanel text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date range pickers if 'custom' selected */}
        {selectedPeriod === 'custom' && (
          <div className="glass-subpanel p-3 rounded-xl flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">С даты:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-[#6531F7]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">По дату:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-[#6531F7]"
              />
            </div>
            <button
              onClick={() => fetchPeriodStats('custom', customStart, customEnd)}
              className="px-4 py-1.5 rounded-lg bg-[#6531F7] text-white font-bold text-xs shadow-sm hover:opacity-90 transition-all"
            >
              Применить фильтр
            </button>
          </div>
        )}

        {/* Period Summary 4 Stat Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-subpanel p-3.5 space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium">Выручка за период:</span>
            <div className="text-2xl font-black font-mono text-foreground">
              {(periodData?.summary.total_revenue || 0).toLocaleString('ru-RU')} ₽
            </div>
            <span className="text-[10px] text-emerald-500 font-semibold">Оплачено клиентами</span>
          </div>

          <div className="glass-subpanel p-3.5 space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium">Чистая прибыль:</span>
            <div className="text-2xl font-black font-mono text-emerald-500">
              {(periodData?.summary.total_profit || 0).toLocaleString('ru-RU')} ₽
            </div>
            <span className="text-[10px] text-muted-foreground font-semibold">За вычетом себестоимости</span>
          </div>

          <div className="glass-subpanel p-3.5 space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium">Продажи в долг:</span>
            <div className="text-2xl font-black font-mono text-rose-500">
              {(periodData?.summary.period_unpaid_debt || 0).toLocaleString('ru-RU')} ₽
            </div>
            <span className="text-[10px] text-rose-500/80 font-semibold">Под реализацию</span>
          </div>

          <div className="glass-subpanel p-3.5 space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium">Оформлено накладных:</span>
            <div className="text-2xl font-black font-mono text-foreground">
              {periodData?.summary.total_orders || 0} <span className="text-sm font-normal text-muted-foreground">шт</span>
            </div>
            <span className="text-[10px] text-[#6531F7] font-semibold">Формат А5</span>
          </div>
        </div>

        {/* Detailed Items Table for the Period */}
        <div className="glass-subpanel rounded-xl overflow-hidden border border-black/5 dark:border-white/10">
          <div className="p-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
            <span className="font-bold text-xs text-foreground">
              Детализация проданных подоконников, отливов и панелей за выбранный период:
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              Позиций: {periodData?.itemsSold.length || 0}
            </span>
          </div>

          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3">Материал / Размер</th>
                  <th className="py-2.5 px-2">Категория</th>
                  <th className="py-2.5 px-2 text-center">Продано объем</th>
                  <th className="py-2.5 px-3 text-right">Выручка</th>
                  <th className="py-2.5 px-3 text-right">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {!periodData || periodData.itemsSold.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                      {isLoadingPeriod ? 'Загрузка данных...' : 'За выбранный период продаж пока не зарегистрировано.'}
                    </td>
                  </tr>
                ) : (
                  periodData.itemsSold.map((prod, idx: number) => (
                    <tr key={idx} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {prod.name}
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground">
                        {prod.category_name || 'VIP-Plast'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-[#6531F7]">
                        {prod.total_quantity} {prod.unit || 'м.п.'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                        {prod.total_revenue.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-500">
                        Оформлено
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Middle Row: Monthly Dynamics Graph + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left 8 Cols: Revenue & Profit Dynamics Graph */}
        <div className="lg:col-span-8 glass-panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Годовая динамика производства и сбыта</h3>
              <p className="text-[11px] text-muted-foreground">Помесячное соотношение выручки и себестоимости материалов</p>
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
                2025 / Сезон
              </div>
            </div>
          </div>

          {/* Bar & Trend Chart Canvas with Interactive Tooltip */}
          <div className="glass-subpanel p-4 relative h-64 flex flex-col justify-between">
            <div className="absolute inset-x-4 top-8 bottom-8 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-black dark:border-white" />
              <div className="border-b border-black dark:border-white" />
              <div className="border-b border-black dark:border-white" />
              <div className="border-b border-black dark:border-white" />
            </div>

            <div className="flex-1 flex items-end justify-between gap-1 sm:gap-3 px-2 z-10">
              {monthsData.map((item, idx) => {
                const isHovered = hoveredMonth === idx;
                const revHeight = Math.min(180, Math.max(20, Math.round((item.rev / 650000) * 160)));
                const costHeight = Math.min(110, Math.max(10, Math.round((item.cost / 650000) * 160)));

                return (
                  <div 
                    key={idx}
                    onMouseEnter={() => setHoveredMonth(idx)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {isHovered && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-44 p-2.5 glass-panel bg-white/95 dark:bg-zinc-900/95 shadow-2xl z-30 space-y-1 text-[10px] pointer-events-none animate-in fade-in zoom-in-95">
                        <div className="font-bold text-foreground border-b border-border pb-1">
                          {item.month} 2025 • VIP-Plast
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Выручка:</span>
                          <span className="font-mono font-bold text-foreground">{item.rev.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-500 font-semibold">Чистый доход:</span>
                          <span className="font-mono font-bold text-emerald-500">{(item.rev - item.cost).toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-rose-500">Закупка сырья:</span>
                          <span className="font-mono text-rose-500">{item.cost.toLocaleString()} ₽</span>
                        </div>
                      </div>
                    )}

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

        {/* Right 4 Cols: AI Insights Panel */}
        <div className="lg:col-span-4 glass-panel p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6531F7]" />
                <h3 className="font-semibold text-sm text-foreground">VIP-Plast Помощник и Аналитика</h3>
              </div>
            </div>

            <div className="mt-3 space-y-2.5">
              {/* Insight 1: Low stock alert */}
              <div className="glass-subpanel p-3 space-y-1.5 border-l-4 border-amber-500">
                <div className="flex items-center justify-between text-xs font-bold text-amber-500">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Внимание: Остатки на складе
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20">Срочно</span>
                </div>
                <p className="text-[11px] text-foreground leading-snug">
                  Заканчивается ходовой белый подоконник ПВХ 300мм и заглушки торцевые. Рекомендуется оформить приходную накладную.
                </p>
                <button
                  onClick={() => onNavigate('supplies')}
                  className="text-[10px] font-bold text-[#6531F7] hover:underline flex items-center gap-0.5 pt-1"
                >
                  Оформить приход <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Insight 2: Growth driver */}
              <div className="glass-subpanel p-3 space-y-1.5 border-l-4 border-[#6531F7]">
                <div className="flex items-center justify-between text-xs font-bold text-[#6531F7]">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Долговой контроль
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#6531F7]/20">А5 Накладные</span>
                </div>
                <p className="text-[11px] text-foreground leading-snug">
                  Все накладные под реализацию сохраняются в реестре с печатью бланка А5 для подписи заказчиком при получении.
                </p>
                <button
                  onClick={() => onNavigate('debts')}
                  className="text-[10px] font-bold text-[#6531F7] hover:underline flex items-center gap-0.5 pt-1"
                >
                  Открыть долги клиентов <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {aiResponse && (
                <div className="glass-subpanel p-3 text-[11px] text-foreground bg-[#6531F7]/10 border border-[#6531F7]/30">
                  {aiResponse}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Chat with AI Input */}
          <form onSubmit={handleAskAi} className="pt-2 flex items-center gap-2">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Спросить о наценке, остатках или долгах..."
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

      {/* Bottom Row: Category Segmentation + Best Sellers + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Category Segmentation */}
        <div className="glass-panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
            <div>
              <h4 className="font-semibold text-xs text-foreground">Продажи по направлениям</h4>
              <p className="text-[10px] text-muted-foreground">Доля категорий VIP-Plast</p>
            </div>
            <PieChart className="w-4 h-4 text-[#6531F7]" />
          </div>

          <div className="flex items-center justify-center gap-4 py-2">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-black/5 dark:text-white/5" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#6531F7" strokeWidth="4" strokeDasharray="52, 100" strokeLinecap="round" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#34C759" strokeWidth="4" strokeDasharray="28, 100" strokeDashoffset="-52" strokeLinecap="round" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#FF9500" strokeWidth="4" strokeDasharray="20, 100" strokeDashoffset="-80" strokeLinecap="round" />
              </svg>
              <span className="absolute font-bold text-xs text-foreground">100%</span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6531F7]" />
                <span className="text-muted-foreground">Подоконники:</span>
                <strong className="text-foreground font-mono">52%</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
                <span className="text-muted-foreground">Отливы:</span>
                <strong className="text-foreground font-mono">28%</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF9500]" />
                <span className="text-muted-foreground">Сэндвичи:</span>
                <strong className="text-foreground font-mono">20%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Top Selling Materials */}
        <div className="glass-panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
            <div>
              <h4 className="font-semibold text-xs text-foreground">Лидеры продаж</h4>
              <p className="text-[10px] text-muted-foreground">Популярные размеры и позиции</p>
            </div>
            <button onClick={() => onNavigate('products')} className="text-[10px] text-[#6531F7] font-bold hover:underline">
              Весь каталог
            </button>
          </div>

          <div className="space-y-2.5">
            {topProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Данные появятся после первых продаж</p>
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

        {/* Card 3: Fast Actions */}
        <div className="glass-panel p-4 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
            <div>
              <h4 className="font-semibold text-xs text-foreground">Быстрые действия</h4>
              <p className="text-[10px] text-muted-foreground">Оформление накладных и учет</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#34C759]/20 text-[#34C759]">
              VIP-Plast
            </span>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => onNavigate('pos')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#6531F7] to-[#7B46FF] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Оформить накладную (Касса)</span>
            </button>
            <button
              onClick={() => onNavigate('debts')}
              className="w-full py-2 rounded-xl glass-subpanel hover:bg-white/80 dark:hover:bg-white/10 text-foreground text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Долговые накладные клиентов</span>
            </button>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            Накладные автоматически форматируются под стандартный лист А5 (148×210 мм).
          </p>
        </div>
      </div>
    </div>
  );
};

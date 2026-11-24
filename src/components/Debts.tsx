import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Calendar, 
  ArrowDownCircle, 
  Printer, 
  AlertCircle, 
  CheckCircle2, 
  X,
  FileText,
  User,
  Phone
} from 'lucide-react';
import { Sale, StoreSettings } from '../types';
import { api } from '../api';
import { InvoiceA5 } from './InvoiceA5';

interface DebtsProps {
  settings: StoreSettings;
  onRefresh: () => void;
}

export const Debts: React.FC<DebtsProps> = ({ settings, onRefresh }) => {
  const [debts, setDebts] = useState<Sale[]>([]);
  const [totals, setTotals] = useState({ total_debt_issued: 0, total_debt_collected: 0, total_debt_remaining: 0, debtors_count: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Pay Modal State
  const [payingSale, setPayingSale] = useState<Sale | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [payComment, setPayComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invoice Print View
  const [printingSale, setPrintingSale] = useState<{ sale: Sale; items: any[] } | null>(null);

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDebts();
      setDebts(data.debts);
      setTotals(data.totals);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPay = (sale: Sale) => {
    const remaining = (sale.debt_amount || sale.final_amount) - (sale.debt_paid || 0);
    setPayingSale(sale);
    setPayAmount(String(remaining));
    setPayComment('');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSale || !payAmount) return;

    try {
      setIsSubmitting(true);
      await api.payDebt(payingSale.id, Number(payAmount), payMethod, payComment);
      alert('Оплата по долгу успешно зафиксирована!');
      setPayingSale(null);
      loadDebts();
      onRefresh();
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintA5 = async (sale: Sale) => {
    try {
      const details = await api.getSaleDetails(sale.id);
      setPrintingSale({ sale: details.sale, items: details.items });
    } catch (err: any) {
      alert(`Ошибка загрузки накладной: ${err.message}`);
    }
  };

  const filteredDebts = debts.filter(d => {
    const q = search.toLowerCase();
    return (
      d.receipt_number.toLowerCase().includes(q) ||
      (d.customer_name && d.customer_name.toLowerCase().includes(q)) ||
      (d.customer_phone && d.customer_phone.includes(q))
    );
  });

  return (
    <div className="p-4 mr-3 space-y-4 max-w-[1600px]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Долговые накладные и взаиморасчеты</h2>
          <p className="text-xs text-muted-foreground">
            Контроль дебиторской задолженности, отгрузок под реализацию и прием оплат
          </p>
        </div>

        <div className="flex-1 max-w-sm relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по клиенту, телефону или номеру накладной..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl glass-subpanel text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#6531f7]/40"
          />
        </div>
      </div>

      {/* KPI Cards for Debts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="glass-panel p-4 space-y-1 border-l-4 border-rose-500">
          <div className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
            Текущий долг клиентов
          </div>
          <div className="text-2xl font-black font-mono text-rose-500">
            {totals.total_debt_remaining.toLocaleString('ru-RU')} ₽
          </div>
          <p className="text-[10px] text-muted-foreground">
            Активных клиентов с долгами: <strong className="text-foreground">{totals.debtors_count}</strong>
          </p>
        </div>

        <div className="glass-panel p-4 space-y-1 border-l-4 border-indigo-500">
          <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">
            Отгружено в долг всего
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {totals.total_debt_issued.toLocaleString('ru-RU')} ₽
          </div>
          <p className="text-[10px] text-muted-foreground">Общая сумма накладных под реализацию</p>
        </div>

        <div className="glass-panel p-4 space-y-1 border-l-4 border-emerald-500">
          <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
            Погашено клиентами
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            {totals.total_debt_collected.toLocaleString('ru-RU')} ₽
          </div>
          <p className="text-[10px] text-muted-foreground">Фактически поступившие оплаты по долгам</p>
        </div>
      </div>

      {/* Debts Table */}
      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-muted-foreground uppercase text-[10px] font-bold">
              <th className="py-3 px-4">Накладная</th>
              <th className="py-3 px-3">Дата отгрузки</th>
              <th className="py-3 px-3">Клиент (Заказчик)</th>
              <th className="py-3 px-3 text-right">Сумма накладной</th>
              <th className="py-3 px-3 text-right">Оплачено</th>
              <th className="py-3 px-3 text-right text-rose-500">Остаток долга</th>
              <th className="py-3 px-4 text-center">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {filteredDebts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  {isLoading ? 'Загрузка...' : 'Долговых накладных нет. При оформлении продажи в РМК выберите «В долг», чтобы зафиксировать задолженность клиента.'}
                </td>
              </tr>
            ) : (
              filteredDebts.map(sale => {
                const remaining = (sale.debt_amount || sale.final_amount) - (sale.debt_paid || 0);

                return (
                  <tr key={sale.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {sale.receipt_number}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {new Date(sale.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{sale.customer_name || 'Не указан'}</span>
                      </div>
                      {sale.customer_phone && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{sale.customer_phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                      {(sale.debt_amount || sale.final_amount).toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-500 font-semibold">
                      {(sale.debt_paid || 0).toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-rose-500 text-sm">
                      {remaining.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenPay(sale)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm transition-all flex items-center gap-1"
                        >
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                          <span>Оплатить долг</span>
                        </button>
                        <button
                          onClick={() => handlePrintA5(sale)}
                          title="Накладная А5"
                          className="p-1 rounded-lg glass-subpanel text-muted-foreground hover:text-foreground"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pay Debt Modal */}
      {payingSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel bg-card border border-border p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground">Погашение долга по накладной</h3>
                <p className="text-[11px] text-muted-foreground">{payingSale.receipt_number} • {payingSale.customer_name}</p>
              </div>
              <button onClick={() => setPayingSale(null)} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/40 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Остаток долга:</span>
                  <span className="font-mono font-bold text-rose-500">
                    {((payingSale.debt_amount || payingSale.final_amount) - (payingSale.debt_paid || 0)).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Сумма вносимой оплаты (₽) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full text-xl font-bold font-mono px-3 py-2 rounded-xl bg-card border border-emerald-500/50 text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Форма оплаты</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none"
                >
                  <option value="CASH">Наличные в кассу</option>
                  <option value="CARD">Оплата банковской картой</option>
                  <option value="TRANSFER">Безналичный расчет / СБП</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Примечание (необязательно)</label>
                <input
                  type="text"
                  value={payComment}
                  onChange={(e) => setPayComment(e.target.value)}
                  placeholder="Например: частичная оплата от прораба"
                  className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayingSale(null)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                >
                  {isSubmitting ? 'Проведение...' : 'Зафиксировать оплату'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice A5 View */}
      {printingSale && (
        <InvoiceA5
          sale={printingSale.sale}
          items={printingSale.items}
          settings={settings}
          onClose={() => setPrintingSale(null)}
        />
      )}
    </div>
  );
};

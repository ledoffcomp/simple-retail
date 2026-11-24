import React, { useState } from 'react';
import { 
  Coins, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Receipt, 
  Lock, 
  Unlock, 
  CreditCard, 
  Banknote, 
  Smartphone,
  AlertCircle,
  X,
  FileCheck
} from 'lucide-react';
import { Shift } from '../types';
import { api } from '../api';

interface CashShiftsProps {
  shift: Shift | null;
  onRefresh: () => void;
}

export const CashShifts: React.FC<CashShiftsProps> = ({ shift, onRefresh }) => {
  // Open Shift Modal
  const [isOpenShiftModal, setIsOpenShiftModal] = useState(false);
  const [cashierName, setCashierName] = useState('Администратор');
  const [startingCash, setStartingCash] = useState('3000');

  // Close Shift Modal (Z-report)
  const [isCloseShiftModal, setIsCloseShiftModal] = useState(false);
  const [actualClosingCash, setActualClosingCash] = useState('');

  // Cash Operation Modal (Внесение / Изъятие / Расход)
  const [isOpModalOpen, setIsOpModalOpen] = useState(false);
  const [opType, setOpType] = useState<'IN' | 'OUT' | 'EXPENSE'>('IN');
  const [opAmount, setOpAmount] = useState('');
  const [opCategory, setOpCategory] = useState('Размен');
  const [opComment, setOpComment] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Open Shift
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.openShift(cashierName, Number(startingCash) || 0);
      setIsOpenShiftModal(false);
      onRefresh();
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close Shift
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.closeShift(Number(actualClosingCash) || 0);
      setIsCloseShiftModal(false);
      alert('Кассовая смена успешно закрыта! Z-отчет зафиксирован.');
      onRefresh();
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cash Operation
  const handleCashOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opAmount || Number(opAmount) <= 0) {
      alert('Укажите корректную сумму');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.addCashOperation({
        type: opType,
        amount: Number(opAmount),
        category: opCategory,
        comment: opComment
      });
      setIsOpModalOpen(false);
      setOpAmount('');
      setOpComment('');
      onRefresh();
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Shift Overview Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            shift ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
          }`}>
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">
                {shift ? `Кассовая смена №${shift.id}` : 'Кассовая смена закрыта'}
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                shift 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}>
                {shift ? 'ОТКРЫТА' : 'ЗАКРЫТА'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {shift ? `Открыта ${new Date(shift.opened_at).toLocaleTimeString('ru-RU')} • Кассир: ${shift.cashier_name}` : 'Начните день с открытия смены и внесения размена'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {shift ? (
            <>
              <button
                onClick={() => { setOpType('IN'); setOpCategory('Размен'); setIsOpModalOpen(true); }}
                className="px-3 py-2 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors"
              >
                <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                <span>Внесение</span>
              </button>
              <button
                onClick={() => { setOpType('EXPENSE'); setOpCategory('Хозрасходы'); setIsOpModalOpen(true); }}
                className="px-3 py-2 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors"
              >
                <ArrowUpCircle className="w-4 h-4 text-rose-500" />
                <span>Расход / Инкассация</span>
              </button>
              <button
                onClick={() => {
                  setActualClosingCash(String(shift.expectedCashInDrawer || 0));
                  setIsCloseShiftModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>Закрыть смену (Z-отчет)</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsOpenShiftModal(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
            >
              <Unlock className="w-4 h-4" />
              <span>Открыть новую смену</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Cash Stats if open */}
      {shift && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Расчет в денежном ящике</span>
            <div className="text-2xl font-bold font-mono text-emerald-500 mt-2">
              {(shift.expectedCashInDrawer || 0).toLocaleString('ru-RU')} ₽
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Размен ({shift.starting_cash} ₽) + Наличные ({shift.stats?.cash_sales || 0} ₽)
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Выручка за смену</span>
            <div className="text-2xl font-bold font-mono text-foreground mt-2">
              {(shift.stats?.total_sales || 0).toLocaleString('ru-RU')} ₽
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Чеков: {shift.stats?.receipt_count || 0}
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Безналичные оплаты</span>
            <div className="text-2xl font-bold font-mono text-indigo-500 mt-2">
              {((shift.stats?.card_sales || 0) + (shift.stats?.transfer_sales || 0)).toLocaleString('ru-RU')} ₽
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Карты: {shift.stats?.card_sales || 0} ₽ • СБП: {shift.stats?.transfer_sales || 0} ₽
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Чистая прибыль смены</span>
            <div className="text-2xl font-bold font-mono text-sky-500 mt-2">
              {(shift.stats?.total_profit || 0).toLocaleString('ru-RU')} ₽
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Торговая наценка за вычетом себестоимости
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: OPEN SHIFT                                            */}
      {/* ============================================================ */}
      {isOpenShiftModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <form onSubmit={handleOpenShift}>
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
                <h3 className="text-base font-bold text-foreground">Открытие кассовой смены</h3>
                <button type="button" onClick={() => setIsOpenShiftModal(false)} className="p-1 rounded-lg hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Имя кассира</label>
                  <input
                    type="text"
                    required
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Сумма размена в ящике (₽)</label>
                  <input
                    type="number"
                    required
                    value={startingCash}
                    onChange={(e) => setStartingCash(e.target.value)}
                    className="w-full font-mono text-xl font-bold px-3 py-2.5 rounded-xl bg-card border border-emerald-500/50 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpenShiftModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
                >
                  {isSubmitting ? 'Открытие...' : 'Открыть смену'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CLOSE SHIFT (Z-REPORT)                                */}
      {/* ============================================================ */}
      {isCloseShiftModal && shift && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <form onSubmit={handleCloseShift}>
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
                <div>
                  <h3 className="text-base font-bold text-foreground">Закрытие смены (Z-отчет)</h3>
                  <p className="text-xs text-muted-foreground">Фиксация итогов дня и сверка кассы</p>
                </div>
                <button type="button" onClick={() => setIsCloseShiftModal(false)} className="p-1 rounded-lg hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Расчет наличных в ящике:</span>
                    <span className="font-mono font-bold text-foreground">{shift.expectedCashInDrawer || 0} ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Всего продаж за смену:</span>
                    <span className="font-mono font-bold text-foreground">{shift.stats?.total_sales || 0} ₽</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Фактическая сумма наличных в ящике (₽) *</label>
                  <input
                    type="number"
                    required
                    value={actualClosingCash}
                    onChange={(e) => setActualClosingCash(e.target.value)}
                    className="w-full font-mono text-xl font-bold px-3 py-2.5 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {actualClosingCash !== '' && (
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Расхождение:</span>
                    <span className={`font-mono font-bold ${
                      Number(actualClosingCash) - (shift.expectedCashInDrawer || 0) === 0
                        ? 'text-emerald-500'
                        : 'text-rose-500'
                    }`}>
                      {Number(actualClosingCash) - (shift.expectedCashInDrawer || 0)} ₽
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all"
                >
                  {isSubmitting ? 'Закрытие...' : 'Закрыть смену (Z-отчет)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CASH OPERATION (ВНЕСЕНИЕ / ИЗЪЯТИЕ / РАСХОД)           */}
      {/* ============================================================ */}
      {isOpModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <form onSubmit={handleCashOperation}>
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
                <h3 className="text-base font-bold text-foreground">
                  {opType === 'IN' ? 'Внесение наличных' : opType === 'OUT' ? 'Инкассация (изъятие)' : 'Расход из кассы'}
                </h3>
                <button type="button" onClick={() => setIsOpModalOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Категория операции</label>
                  <select
                    value={opCategory}
                    onChange={(e) => setOpCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none"
                  >
                    {opType === 'IN' ? (
                      <>
                        <option value="Размен">Размен</option>
                        <option value="Внесение учредителя">Внесение учредителя</option>
                        <option value="Прочее поступление">Прочее поступление</option>
                      </>
                    ) : (
                      <>
                        <option value="Инкассация выручки">Инкассация выручки</option>
                        <option value="Аренда">Аренда</option>
                        <option value="Зарплата кассира">Зарплата кассира</option>
                        <option value="Оплата курьеру / поставщику">Оплата курьеру / поставщику</option>
                        <option value="Хозрасходы (бытовая химия, пакеты)">Хозрасходы</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Сумма (₽) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={opAmount}
                    onChange={(e) => setOpAmount(e.target.value)}
                    className="w-full font-mono text-xl font-bold px-3 py-2.5 rounded-xl bg-card border border-border text-foreground focus:outline-none"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Комментарий</label>
                  <input
                    type="text"
                    value={opComment}
                    onChange={(e) => setOpComment(e.target.value)}
                    placeholder="Например: покупка чековой ленты"
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md transition-all"
                >
                  {isSubmitting ? 'Сохранение...' : 'Провести операцию'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

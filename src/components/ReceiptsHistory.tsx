import React, { useState, useEffect } from 'react';
import { 
  ReceiptText, 
  Search, 
  Calendar, 
  Printer, 
  Eye, 
  CreditCard, 
  Banknote, 
  Smartphone,
  X,
  FileCheck,
  CheckCircle2
} from 'lucide-react';
import { Sale, SaleItem, StoreSettings } from '../types';
import { api } from '../api';

interface ReceiptsHistoryProps {
  settings: StoreSettings;
}

export const ReceiptsHistory: React.FC<ReceiptsHistoryProps> = ({ settings }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<{ sale: Sale; items: SaleItem[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSales(100);
      setSales(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReceipt = async (saleId: number) => {
    try {
      const data = await api.getSaleDetails(saleId);
      setSelectedSale(data);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const filteredSales = sales.filter(s => {
    return !search || s.receipt_number.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по номеру чека (например: ЧЕК-00001)..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Receipts Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <th className="py-3 px-4">Номер чека</th>
              <th className="py-3 px-3">Дата и время</th>
              <th className="py-3 px-3">Кассир</th>
              <th className="py-3 px-3">Тип оплаты</th>
              <th className="py-3 px-3 text-right">Сумма чека</th>
              <th className="py-3 px-3 text-right">Прибыль</th>
              <th className="py-3 px-4 text-center">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  {isLoading ? 'Загрузка...' : 'Чеков пока нет'}
                </td>
              </tr>
            ) : (
              filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-foreground">
                    {s.receipt_number}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">
                    {new Date(s.created_at).toLocaleString('ru-RU')}
                  </td>
                  <td className="py-3 px-3 text-foreground font-medium">
                    {s.cashier_name}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      {s.payment_method === 'CASH' && <Banknote className="w-3.5 h-3.5 text-emerald-500" />}
                      {s.payment_method === 'CARD' && <CreditCard className="w-3.5 h-3.5 text-indigo-500" />}
                      {s.payment_method === 'TRANSFER' && <Smartphone className="w-3.5 h-3.5 text-sky-500" />}
                      {s.payment_method === 'CASH' ? 'Наличные' : s.payment_method === 'CARD' ? 'Карта' : 'СБП / Перевод'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-foreground text-sm">
                    {s.final_amount.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-500 font-semibold">
                    +{s.profit.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleViewReceipt(s.id)}
                      className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted text-foreground text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3 h-3 text-muted-foreground" />
                      <span>Просмотр</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ============================================================ */}
      {/* MODAL: VIEW RECEIPT DETAILS & PRINT                          */}
      {/* ============================================================ */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <h3 className="text-sm font-bold text-foreground">Чек {selectedSale.sale.receipt_number}</h3>
              <button onClick={() => setSelectedSale(null)} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-muted/40 flex justify-center">
              <div 
                id="printable-receipt"
                className="w-full max-w-[340px] bg-white text-black p-5 rounded-lg shadow-sm font-mono text-xs space-y-3"
              >
                <div className="text-center space-y-1 pb-2 border-b border-dashed border-zinc-400">
                  <div className="font-bold text-sm uppercase">{settings.store_name || 'Магазин'}</div>
                  <div className="text-[10px] text-zinc-600">{settings.store_address || ''}</div>
                  {settings.store_inn && <div className="text-[10px] text-zinc-600">ИНН: {settings.store_inn}</div>}
                  <div className="text-[11px] font-bold mt-2">ТОВАРНЫЙ ЧЕК {selectedSale.sale.receipt_number}</div>
                  <div className="text-[10px] text-zinc-500">
                    {new Date(selectedSale.sale.created_at).toLocaleString('ru-RU')} • Кассир: {selectedSale.sale.cashier_name}
                  </div>
                </div>

                <div className="space-y-1.5 py-1 border-b border-dashed border-zinc-400">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="text-[11px] font-medium leading-tight">{item.product_name}</div>
                      <div className="flex justify-between text-[10px] text-zinc-600">
                        <span>{item.quantity} шт × {item.unit_price} ₽</span>
                        <span className="font-bold text-black">{item.total_price} ₽</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 pt-1 text-[11px]">
                  {selectedSale.sale.discount_amount > 0 && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Скидка:</span>
                      <span>−{selectedSale.sale.discount_amount} ₽</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-zinc-300">
                    <span>ИТОГО:</span>
                    <span>{selectedSale.sale.final_amount} ₽</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-600">
                    <span>Оплата:</span>
                    <span>
                      {selectedSale.sale.payment_method === 'CASH' ? 'Наличные' : selectedSale.sale.payment_method === 'CARD' ? 'Карта' : 'СБП / Перевод'}
                    </span>
                  </div>
                </div>

                <div className="text-center pt-3 border-t border-dashed border-zinc-400 text-[10px] text-zinc-600 space-y-1">
                  <div>{settings.receipt_footer || 'Спасибо за покупку!'}</div>
                  <div className="text-[9px] text-zinc-400">Система «Простая Розница»</div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4 text-primary" />
                <span>Распечатать чек</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

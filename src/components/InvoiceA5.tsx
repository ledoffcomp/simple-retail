import React from 'react';
import { Printer, X } from 'lucide-react';
import { Sale, SaleItem, StoreSettings } from '../types';

interface InvoiceA5Props {
  sale: Sale;
  items: Array<SaleItem | { product_name: string; quantity: number; unit?: string; unit_price: number; total_price?: number; total?: number }>;
  settings: StoreSettings;
  onClose: () => void;
}

export const InvoiceA5: React.FC<InvoiceA5Props> = ({
  sale,
  items,
  settings,
  onClose
}) => {
  const dateFormatted = new Date(sale.created_at || Date.now()).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const grandTotal = sale.final_amount || items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price)), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-2xl w-full bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Top Control Bar */}
        <div className="p-3.5 px-5 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">Расходная накладная (Формат А5)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6531f7]/15 text-[#6531f7] font-mono font-bold">
              148 × 210 мм
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-[#6531f7] hover:bg-[#5224d4] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Печать (Ctrl+P)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas (Optimized for A5 paper) */}
        <div className="flex-1 p-6 overflow-y-auto bg-muted/30 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[190mm] bg-white text-black p-6 rounded-lg shadow-sm font-sans text-[11px] leading-tight space-y-3 border border-zinc-200"
            style={{ minHeight: '140mm' }}
          >
            {/* Header / Supplier Info */}
            <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-2.5">
              <div>
                <h2 className="text-xl font-black tracking-tight uppercase text-zinc-900">
                  {settings.store_name || 'VIP-Plast'}
                </h2>
                <p className="text-[10px] font-semibold text-zinc-700">
                  {settings.store_subtitle || 'Подоконники, отливы и сэндвич панели'}
                </p>
                <p className="text-[9px] text-zinc-500">
                  {settings.store_address || 'Склад-производство'} • Тел: {settings.store_phone || '+7 (999) 000-00-00'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-zinc-900 uppercase">НАКЛАДНАЯ</div>
                <div className="font-mono font-bold text-xs text-zinc-800">{sale.receipt_number}</div>
                <div className="text-[10px] text-zinc-600">от {dateFormatted}</div>
              </div>
            </div>

            {/* Customer & Order Metadata */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-50 rounded border border-zinc-200 text-[10px]">
              <div>
                <span className="text-zinc-500">Покупатель (Заказчик):</span>
                <div className="font-bold text-zinc-900 text-[11px]">
                  {sale.customer_name || 'Розничный покупатель'}
                </div>
                {sale.customer_phone && (
                  <div className="text-zinc-600">Тел: {sale.customer_phone}</div>
                )}
              </div>
              <div className="text-right">
                <span className="text-zinc-500">Условия оплаты:</span>
                <div className="font-bold">
                  {sale.payment_method === 'DEBT' || sale.is_debt ? (
                    <span className="text-rose-600 uppercase font-black">В ДОЛГ (Под реализацию)</span>
                  ) : sale.payment_method === 'CASH' ? (
                    'Наличный расчет'
                  ) : sale.payment_method === 'CARD' ? (
                    'Оплата картой'
                  ) : (
                    'Безналичный перевод / СБП'
                  )}
                </div>
                <div className="text-zinc-500">Отпустил: {sale.cashier_name || 'Менеджер'}</div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-zinc-300 rounded overflow-hidden">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 font-bold text-zinc-800">
                    <th className="py-1 px-1.5 w-6 text-center">№</th>
                    <th className="py-1 px-2">Наименование (подоконники / отливы / панели)</th>
                    <th className="py-1 px-1.5 w-12 text-center">Ед.</th>
                    <th className="py-1 px-1.5 w-14 text-center">Кол-во</th>
                    <th className="py-1 px-1.5 w-16 text-right">Цена (₽)</th>
                    <th className="py-1 px-2 w-20 text-right">Сумма (₽)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {items.map((item, idx) => {
                    const itemName = 'product_name' in item ? item.product_name : (item as any).name || (item as any).product?.name;
                    const itemUnit = ('unit' in item && item.unit) || 'м.п.';
                    const itemTotal = 'total_price' in item ? item.total_price : ('total' in item ? item.total : item.quantity * item.unit_price);

                    return (
                      <tr key={idx} className="hover:bg-zinc-50">
                        <td className="py-1 px-1.5 text-center text-zinc-500">{idx + 1}</td>
                        <td className="py-1 px-2 font-medium text-zinc-900 leading-snug">{itemName}</td>
                        <td className="py-1 px-1.5 text-center text-zinc-600">{itemUnit}</td>
                        <td className="py-1 px-1.5 text-center font-bold text-zinc-900">{item.quantity}</td>
                        <td className="py-1 px-1.5 text-right font-mono text-zinc-700">{item.unit_price}</td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-zinc-900">{itemTotal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals & Debt info */}
            <div className="pt-1 space-y-1">
              <div className="flex justify-between items-baseline border-t-2 border-zinc-800 pt-1.5 text-xs font-bold text-zinc-900">
                <span>ВСЕГО К ОПЛАТЕ:</span>
                <span className="text-sm font-black font-mono">{grandTotal.toLocaleString('ru-RU')} ₽</span>
              </div>

              {(sale.is_debt || sale.payment_method === 'DEBT') && (
                <div className="flex justify-between items-center p-1.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[10px]">
                  <span>СУММА ЗАДОЛЖЕННОСТИ ПО НАКЛАДНОЙ:</span>
                  <span className="font-mono text-xs">{grandTotal.toLocaleString('ru-RU')} ₽</span>
                </div>
              )}
            </div>

            {/* Signatures & Acceptance Notice */}
            <div className="pt-3 border-t border-dashed border-zinc-400 space-y-3">
              <p className="text-[9px] text-zinc-500 italic">
                {settings.receipt_footer || 'Товар проверен, претензий по количеству и качеству не имею. Отгружено со склада VIP-Plast.'}
              </p>

              <div className="grid grid-cols-2 gap-8 pt-2 text-[10px]">
                <div className="space-y-1">
                  <div>Отпустил со склада:</div>
                  <div className="border-b border-zinc-400 pt-3 flex justify-between text-[8px] text-zinc-500">
                    <span>(подпись)</span>
                    <span>/ {sale.cashier_name || 'Менеджер'} /</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div>Товар получил (груз принял):</div>
                  <div className="border-b border-zinc-400 pt-3 flex justify-between text-[8px] text-zinc-500">
                    <span>(подпись)</span>
                    <span>/ {sale.customer_name || 'Заказчик'} /</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

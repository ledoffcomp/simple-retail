import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  Calendar, 
  FileText, 
  Search, 
  CheckCircle2, 
  SlidersHorizontal,
  ArrowDownRight,
  X,
  PackageCheck
} from 'lucide-react';
import { Product } from '../types';
import { api } from '../api';

interface SuppliesProps {
  products: Product[];
  onRefresh: () => void;
}

export const Supplies: React.FC<SuppliesProps> = ({ products, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'supplies' | 'adjustment'>('supplies');
  const [suppliesList, setSuppliesList] = useState<any[]>([]);

  // New Supply State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplier, setSupplier] = useState('Основной поставщик');
  const [docNumber, setDocNumber] = useState(`ПН-${Date.now().toString().slice(-4)}`);
  const [supplyItems, setSupplyItems] = useState<Array<{ product_id: number; name: string; quantity: number; cost_price: number; retail_price: number }>>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Adjustment State
  const [adjustProductId, setAdjustProductId] = useState<number | ''>('');
  const [adjustNewStock, setAdjustNewStock] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState('Инвентаризация (плановый пересчет)');

  // Load supplies
  useEffect(() => {
    loadSupplies();
  }, []);

  const loadSupplies = async () => {
    try {
      const data = await api.getSupplies();
      setSuppliesList(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Add item to supply document
  const handleAddItemToSupply = () => {
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === Number(selectedProductId));
    if (!prod) return;

    // Check if already in list
    if (supplyItems.some(i => i.product_id === prod.id)) {
      alert('Этот товар уже добавлен в накладную');
      return;
    }

    setSupplyItems(prev => [
      ...prev,
      {
        product_id: prod.id,
        name: prod.name,
        quantity: 10,
        cost_price: prod.cost_price || 0,
        retail_price: prod.retail_price
      }
    ]);
    setSelectedProductId('');
  };

  // Submit supply
  const handleSubmitSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supplyItems.length === 0) {
      alert('Добавьте хотя бы один товар в накладную');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createSupply({
        supplier,
        doc_number: docNumber,
        items: supplyItems.map(i => ({
          product_id: i.product_id,
          quantity: Number(i.quantity),
          cost_price: Number(i.cost_price),
          retail_price: Number(i.retail_price)
        }))
      });

      alert('Накладная успешно проведена! Остатки и цены обновлены.');
      setIsModalOpen(false);
      setSupplyItems([]);
      setDocNumber(`ПН-${Date.now().toString().slice(-4)}`);
      loadSupplies();
      onRefresh();
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle inventory adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProductId || adjustNewStock === '') {
      alert('Выберите товар и укажите фактический остаток');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.adjustInventory(Number(adjustProductId), Number(adjustNewStock), adjustReason);
      alert('Остаток успешно скорректирован!');
      setAdjustProductId('');
      setAdjustNewStock('');
      onRefresh();
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAdjustProd = products.find(p => p.id === Number(adjustProductId));
  const diff = selectedAdjustProd && adjustNewStock !== '' ? Number(adjustNewStock) - selectedAdjustProd.stock : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Sub-tabs: Supplies vs Inventory adjustment */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('supplies')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'supplies'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Приходные накладные (Поступление)
          </button>
          <button
            onClick={() => setActiveTab('adjustment')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'adjustment'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Инвентаризация и списание
          </button>
        </div>

        {activeTab === 'supplies' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Новое поступление</span>
          </button>
        )}
      </div>

      {/* TAB 1: SUPPLIES LIST */}
      {activeTab === 'supplies' && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Номер документа</th>
                <th className="py-3 px-3">Дата</th>
                <th className="py-3 px-3">Поставщик</th>
                <th className="py-3 px-4 text-right">Сумма накладной</th>
                <th className="py-3 px-4 text-center">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {suppliesList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    Накладных пока нет. Нажмите «+ Новое поступление», чтобы оприходовать товар от поставщика.
                  </td>
                </tr>
              ) : (
                suppliesList.map((sup) => (
                  <tr key={sup.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-foreground">
                      {sup.doc_number}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {new Date(sup.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="py-3 px-3 text-foreground font-medium">
                      {sup.supplier}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground text-sm">
                      {sup.total_amount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Оприходовано
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: INVENTORY ADJUSTMENT */}
      {activeTab === 'adjustment' && (
        <div className="max-w-2xl bg-card border border-border rounded-2xl shadow-sm p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-foreground">Быстрая инвентаризация и корректировка</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              В отличие от 1С, здесь не нужно создавать тяжелые ордера или инвентаризационные описи. Просто выберите товар и введите его фактическое количество на полке.
            </p>
          </div>

          <form onSubmit={handleSaveAdjustment} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Товар *</label>
              <select
                required
                value={adjustProductId}
                onChange={(e) => {
                  setAdjustProductId(Number(e.target.value) || '');
                  const p = products.find(prod => prod.id === Number(e.target.value));
                  if (p) setAdjustNewStock(String(p.stock));
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">-- Выберите товар из списка --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (текущий остаток: {p.stock} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            {selectedAdjustProd && (
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Текущий учетный остаток:</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {selectedAdjustProd.stock} {selectedAdjustProd.unit}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Фактический остаток на полке *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={adjustNewStock}
                    onChange={(e) => setAdjustNewStock(e.target.value)}
                    className="w-full text-lg font-mono font-bold px-3 py-2 rounded-xl bg-card border border-emerald-500/50 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div className="pt-2 border-t border-border/80 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Результат пересчета:</span>
                  <span className={`font-mono font-bold text-sm ${
                    diff === 0 ? 'text-muted-foreground' : diff > 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {diff === 0 ? 'Без расхождений' : diff > 0 ? `+${diff} (Излишек)` : `${diff} (Недостача)`}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Причина корректировки</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="Инвентаризация (плановый пересчет)">Инвентаризация (плановый пересчет)</option>
                <option value="Списание (бой / брак / порча)">Списание (бой / брак / порча)</option>
                <option value="Списание (истек срок годности)">Списание (истек срок годности)</option>
                <option value="Оприходование найденного излишка">Оприходование найденного излишка</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedAdjustProd}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-all disabled:opacity-40"
            >
              {isSubmitting ? 'Сохранение...' : 'Зафиксировать новый остаток'}
            </button>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: NEW SUPPLY (ОПРИХОДОВАНИЕ)                             */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <form onSubmit={handleSubmitSupply}>
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
                <h3 className="text-base font-bold text-foreground">Поступление товаров (Накладная)</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Номер накладной</label>
                    <input
                      type="text"
                      required
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      className="w-full font-mono px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Поставщик</label>
                    <input
                      type="text"
                      required
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                {/* Add product to supply row */}
                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
                  <label className="text-xs font-semibold text-foreground">Добавить товар в накладную:</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(Number(e.target.value) || '')}
                      className="flex-1 px-3 py-2 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none"
                    >
                      <option value="">-- Выберите товар --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.barcode || 'без ШК'})</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddItemToSupply}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                    >
                      + Добавить
                    </button>
                  </div>
                </div>

                {/* Supply Items Table */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Товар</th>
                        <th className="py-2.5 px-2 w-24 text-center">Кол-во</th>
                        <th className="py-2.5 px-2 w-28 text-right">Закупка (₽)</th>
                        <th className="py-2.5 px-2 w-28 text-right">Розница (₽)</th>
                        <th className="py-2.5 px-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {supplyItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-muted-foreground">
                            Выберите товары выше для добавления в накладную
                          </td>
                        </tr>
                      ) : (
                        supplyItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-medium text-foreground">{item.name}</td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setSupplyItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                                }}
                                className="w-full text-center font-mono py-1 rounded bg-muted/60 border border-border"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                step="0.01"
                                value={item.cost_price}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setSupplyItems(prev => prev.map((it, i) => i === idx ? { ...it, cost_price: val } : it));
                                }}
                                className="w-full text-right font-mono py-1 rounded bg-muted/60 border border-border"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                step="0.01"
                                value={item.retail_price}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setSupplyItems(prev => prev.map((it, i) => i === idx ? { ...it, retail_price: val } : it));
                                }}
                                className="w-full text-right font-mono font-bold py-1 rounded bg-muted/60 border border-border"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSupplyItems(prev => prev.filter((_, i) => i !== idx))}
                                className="text-muted-foreground hover:text-rose-500"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 flex justify-between items-baseline text-xs">
                  <span className="text-muted-foreground">Итого по накладной:</span>
                  <span className="text-lg font-mono font-bold text-foreground">
                    {supplyItems.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.cost_price)), 0).toLocaleString()} ₽
                  </span>
                </div>
              </div>

              <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || supplyItems.length === 0}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-40"
                >
                  {isSubmitting ? 'Проведение...' : 'Оприходовать накладную'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

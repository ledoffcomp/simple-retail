import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Printer, 
  Barcode, 
  AlertTriangle, 
  Sparkles,
  Download,
  Filter,
  CheckCircle2,
  X
} from 'lucide-react';
import { Product, Category } from '../types';
import { api } from '../api';

interface ProductsProps {
  products: Product[];
  categories: Category[];
  onRefresh: () => void;
  openAddModalInitially?: boolean;
}

export const Products: React.FC<ProductsProps> = ({
  products,
  categories,
  onRefresh,
  openAddModalInitially = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Edit / Add Modal
  const [isModalOpen, setIsModalOpen] = useState(openAddModalInitially);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Price Tag Print Modal
  const [priceTagProduct, setPriceTagProduct] = useState<Product | null>(null);

  // Filtered list
  const filteredProducts = products.filter(p => {
    const matchesSearch = !search || 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.barcode?.includes(search) || 
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === null || p.category_id === selectedCategory;
    const matchesLow = !onlyLowStock || p.stock <= p.min_stock;
    return matchesSearch && matchesCat && matchesLow;
  });

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingProduct({
      name: '',
      barcode: '',
      sku: '',
      category_id: categories[0]?.id || null,
      unit: 'шт',
      cost_price: 0,
      retail_price: 0,
      stock: 0,
      min_stock: 3
    });
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (p: Product) => {
    setEditingProduct({ ...p });
    setIsModalOpen(true);
  };

  // Generate random 13-digit EAN barcode
  const generateEAN13 = () => {
    let code = '460' + Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9);
    // Calculate EAN-13 checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    code += checkDigit;

    if (editingProduct) {
      setEditingProduct({ ...editingProduct, barcode: code });
    }
  };

  // Save product
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || editingProduct.retail_price === undefined) {
      alert('Укажите наименование и цену продажи');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.saveProduct(editingProduct);
      setIsModalOpen(false);
      setEditingProduct(null);
      onRefresh();
    } catch (err: any) {
      alert(`Ошибка при сохранении: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete product
  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Вы уверены, что хотите удалить товар "${p.name}"?`)) return;
    try {
      await api.deleteProduct(p.id);
      onRefresh();
    } catch (err: any) {
      alert(`Ошибка при удалении: ${err.message}`);
    }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['ID', 'Штрихкод', 'Артикул', 'Наименование', 'Категория', 'Ед.изм', 'Закупка', 'Розница', 'Остаток'];
    const rows = filteredProducts.map(p => [
      p.id,
      p.barcode || '',
      p.sku || '',
      `"${p.name.replace(/"/g, '""')}"`,
      p.category_name || '',
      p.unit,
      p.cost_price,
      p.retail_price,
      p.stock
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Calculate margin preview in modal
  const cost = Number(editingProduct?.cost_price || 0);
  const retail = Number(editingProduct?.retail_price || 0);
  const marginRub = Math.max(0, retail - cost);
  const markupPct = cost > 0 ? Math.round(((retail - cost) / cost) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, штрихкоду или артикулу..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Добавить товар</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card text-xs">
        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-muted-foreground font-semibold flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Категории:
          </span>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              selectedCategory === null ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Все ({products.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedCategory === cat.id ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Low Stock Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-muted-foreground hover:text-foreground">
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(e) => setOnlyLowStock(e.target.checked)}
            className="rounded border-border text-emerald-500 focus:ring-0 w-3.5 h-3.5"
          />
          <span>Заканчивается (осталось ≤ мин.)</span>
        </label>
      </div>

      {/* Products Data Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Товар</th>
                <th className="py-3 px-3">Категория</th>
                <th className="py-3 px-3 text-right">Закупка</th>
                <th className="py-3 px-3 text-right">Розница</th>
                <th className="py-3 px-3 text-right">Наценка</th>
                <th className="py-3 px-3 text-center">Остаток</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Товары не найдены. Нажмите «+ Добавить товар», чтобы создать первую позицию.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const isLow = p.stock <= p.min_stock;
                  return (
                    <tr key={p.id} className="hover:bg-muted/40 transition-colors group">
                      {/* Name & Barcode */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground text-sm">{p.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                          {p.barcode && <span>ШК: {p.barcode}</span>}
                          {p.sku && <span>Арт: {p.sku}</span>}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                          {p.category_name || 'Без категории'}
                        </span>
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        {p.cost_price.toLocaleString('ru-RU')} ₽
                      </td>

                      {/* Retail Price */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-foreground text-sm">
                        {p.retail_price.toLocaleString('ru-RU')} ₽
                      </td>

                      {/* Markup % */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono text-emerald-500 font-semibold">+{p.markup_percent}%</div>
                        <div className="text-[10px] text-muted-foreground font-mono">+{p.margin_rub} ₽</div>
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                          isLow
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}>
                          {isLow && <AlertTriangle className="w-3 h-3" />}
                          {p.stock} {p.unit}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setPriceTagProduct(p)}
                            title="Печать ценника"
                            className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Редактировать товар"
                            className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            title="Удалить товар"
                            className="p-1.5 rounded-lg border border-border hover:bg-rose-500/10 hover:border-rose-500/30 text-muted-foreground hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* ============================================================ */}
      {/* MODAL: ADD / EDIT PRODUCT                                    */}
      {/* ============================================================ */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <form onSubmit={handleSave}>
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
                <h3 className="text-base font-bold text-foreground">
                  {editingProduct.id ? 'Редактирование товара' : 'Новый товар'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Наименование товара *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    placeholder="Например: Кофе зерновой Espresso 250г"
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Category & Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Категория</label>
                    <select
                      value={editingProduct.category_id || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category_id: Number(e.target.value) || null })}
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">Без категории</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Единица измерения</label>
                    <select
                      value={editingProduct.unit || 'шт'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="шт">Штука (шт)</option>
                      <option value="кг">Килограмм (кг)</option>
                      <option value="л">Литр (л)</option>
                      <option value="уп">Упаковка (уп)</option>
                    </select>
                  </div>
                </div>

                {/* Barcode & SKU */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground">Штрихкод (EAN-13)</label>
                      <button
                        type="button"
                        onClick={generateEAN13}
                        className="text-[11px] font-semibold text-emerald-500 hover:underline flex items-center gap-0.5"
                      >
                        <Sparkles className="w-3 h-3" /> Сгенерировать
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editingProduct.barcode || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                      placeholder="4607001234567"
                      className="w-full font-mono px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Артикул</label>
                    <input
                      type="text"
                      value={editingProduct.sku || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                      placeholder="NAP-001"
                      className="w-full font-mono px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                {/* Prices & Stock */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/80">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Цена закупки (₽)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct.cost_price || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, cost_price: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full font-mono px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Цена продажи (₽) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingProduct.retail_price || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, retail_price: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full font-mono font-bold px-3 py-2 rounded-xl bg-card border border-emerald-500/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                </div>

                {/* Real-time Profit Preview */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Расчет доходности:</span>
                  <div className="flex items-center gap-4">
                    <span>Маржа: <strong className="text-foreground font-mono">+{marginRub} ₽</strong></span>
                    <span>Наценка: <strong className="text-emerald-500 font-mono">+{markupPct}%</strong></span>
                  </div>
                </div>

                {/* Stock Controls */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Текущий остаток</label>
                    <input
                      type="number"
                      step="0.001"
                      value={editingProduct.stock || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                      className="w-full font-mono px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Минимальный остаток</label>
                    <input
                      type="number"
                      step="1"
                      value={editingProduct.min_stock || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, min_stock: Number(e.target.value) })}
                      className="w-full font-mono px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
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
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-sm"
                >
                  {isSubmitting ? 'Сохранение...' : 'Сохранить товар'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PRINT PRICE TAG                                       */}
      {/* ============================================================ */}
      {priceTagProduct && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <h3 className="text-sm font-bold text-foreground">Печать ценника</h3>
              <button onClick={() => setPriceTagProduct(null)} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex justify-center bg-muted/40">
              {/* Realistic Price Tag */}
              <div 
                id="printable-receipt"
                className="w-64 bg-white text-black p-4 rounded-lg border-2 border-black font-sans text-center space-y-2 shadow-md"
              >
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-600">ЦЕННИК</div>
                <div className="font-bold text-sm leading-tight text-black line-clamp-2">{priceTagProduct.name}</div>
                <div className="py-2 border-y-2 border-black">
                  <div className="text-3xl font-black font-mono tracking-tight">{priceTagProduct.retail_price} ₽</div>
                  <div className="text-[10px] text-zinc-600">за 1 {priceTagProduct.unit}</div>
                </div>
                {priceTagProduct.barcode && (
                  <div className="pt-1">
                    <div className="font-mono text-xs tracking-widest">{priceTagProduct.barcode}</div>
                  </div>
                )}
                <div className="text-[9px] text-zinc-500 pt-1">
                  Дата: {new Date().toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setPriceTagProduct(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
              >
                Закрыть
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Распечатать</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

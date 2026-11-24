import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Printer, 
  CheckCircle2, 
  X, 
  PauseCircle, 
  PlayCircle,
  Percent,
  RotateCcw,
  Store,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Product, CartItem, Shift, Category, StoreSettings } from '../types';
import { api } from '../api';

interface POSProps {
  products: Product[];
  categories: Category[];
  shift: Shift | null;
  settings: StoreSettings;
  onRefreshData: () => void;
  onOpenShift: () => void;
}

export const POS: React.FC<POSProps> = ({
  products,
  categories,
  shift,
  settings,
  onRefreshData,
  onOpenShift
}) => {
  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [heldCarts, setHeldCarts] = useState<Array<{ id: string; time: string; items: CartItem[]; total: number }>>([]);
  
  // Checkout Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success / Receipt Modal
  const [completedSale, setCompletedSale] = useState<{
    receipt_number: string;
    items: CartItem[];
    total: number;
    final_amount: number;
    discount_amount: number;
    payment_method: string;
    cash_received: number;
    change_returned: number;
    created_at: string;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keep search input focused for instant barcode scanning
  useEffect(() => {
    searchInputRef.current?.focus();
  }, [isPaymentOpen, completedSale]);

  // Global hotkeys (F1-F12, Space, Enter, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If modal is open
      if (isPaymentOpen) {
        if (e.key === 'Escape') {
          setIsPaymentOpen(false);
        } else if (e.key === 'Enter' && !isSubmitting) {
          handleConfirmSale();
        }
        return;
      }

      if (completedSale) {
        if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
          setCompletedSale(null);
          searchInputRef.current?.focus();
        }
        return;
      }

      // F2 -> focus search/barcode
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F8 or Space -> open payment if cart has items
      if (e.key === 'F8' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (cart.length > 0) {
          openPaymentModal();
        }
      }
      // F4 -> Hold cart
      if (e.key === 'F4') {
        e.preventDefault();
        handleHoldCart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaymentOpen, completedSale, cart, isSubmitting, cashReceived, paymentMethod, discountPercent]);

  // Fast Barcode / Search handling
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // First try exact barcode or SKU match
    const foundProduct = products.find(
      p => p.barcode?.toLowerCase() === query.toLowerCase() || p.sku?.toLowerCase() === query.toLowerCase()
    );

    if (foundProduct) {
      addToCart(foundProduct);
      setSearchQuery('');
      return;
    }

    // Try name match if query is not pure digits
    const matchedProducts = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    if (matchedProducts.length === 1) {
      addToCart(matchedProducts[0]);
      setSearchQuery('');
    }
  };

  // Add product to cart
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unit_price: product.retail_price,
          cost_price: product.cost_price,
          discount: 0,
          total: product.retail_price
        }
      ];
    });
  };

  // Update quantity
  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty, total: newQty * item.unit_price };
        }
        return item;
      });
    });
  };

  // Remove from cart
  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Clear cart
  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Очистить весь текущий чек?')) {
      setCart([]);
      setDiscountPercent(0);
    }
  };

  // Hold / Resume cart
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const newHold = {
      id: `ЧЕК-${Date.now().toString().slice(-4)}`,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      items: cart,
      total: totalSum
    };
    setHeldCarts(prev => [newHold, ...prev]);
    setCart([]);
    setDiscountPercent(0);
  };

  const handleResumeCart = (holdId: string) => {
    const hold = heldCarts.find(h => h.id === holdId);
    if (!hold) return;
    if (cart.length > 0 && !window.confirm('Текущая корзина будет заменена отложенным чеком. Продолжить?')) {
      return;
    }
    setCart(hold.items);
    setHeldCarts(prev => prev.filter(h => h.id !== holdId));
  };

  // Calculations
  const rawTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = Math.round((rawTotal * discountPercent) / 100);
  const totalSum = Math.max(0, rawTotal - discountAmount);

  // Open Payment Modal
  const openPaymentModal = () => {
    if (cart.length === 0) return;
    setPaymentMethod('CASH');
    setCashReceived(String(totalSum));
    setIsPaymentOpen(true);
  };

  // Quick Cash Bills
  const addQuickCash = (amount: number) => {
    const current = Number(cashReceived) || 0;
    setCashReceived(String(current + amount));
  };

  const setExactCash = () => {
    setCashReceived(String(totalSum));
  };

  // Confirm Sale & Send to Server
  const handleConfirmSale = async () => {
    if (isSubmitting || cart.length === 0) return;

    const numCashReceived = Number(cashReceived) || 0;
    if (paymentMethod === 'CASH' && numCashReceived < totalSum) {
      alert(`Недостаточно внесенных наличных! Требуется: ${totalSum} ₽, внесено: ${numCashReceived} ₽`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.createSale({
        items: cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          barcode: item.product.barcode,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price: item.cost_price
        })),
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'CASH' ? numCashReceived : totalSum,
        discount_amount: discountAmount
      });

      // Show receipt view
      setCompletedSale({
        receipt_number: res.receipt_number,
        items: [...cart],
        total: rawTotal,
        final_amount: res.final_amount,
        discount_amount: discountAmount,
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'CASH' ? numCashReceived : totalSum,
        change_returned: res.change_returned,
        created_at: new Date().toISOString()
      });

      // Reset cart
      setCart([]);
      setDiscountPercent(0);
      setIsPaymentOpen(false);
      onRefreshData();
    } catch (err: any) {
      alert(`Ошибка при сохранении чека: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered product grid for quick selection
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === null || p.category_id === selectedCategory;
    const matchesQuery = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.barcode?.includes(searchQuery) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* Shift alert if closed */}
      {!shift && (
        <div className="absolute inset-0 z-30 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl border border-border bg-card shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Смена закрыта</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Для работы на кассе и пробития чеков необходимо открыть кассовую смену и указать сумму размена в ящике.
              </p>
            </div>
            <button
              onClick={onOpenShift}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all"
            >
              Открыть смену и начать продажи
            </button>
          </div>
        </div>
      )}

      {/* LEFT COLUMN: Fast Product Picker & Catalog */}
      <div className="flex-1 flex flex-col border-r border-border min-w-0">
        {/* Barcode & Search Top Input */}
        <div className="p-4 border-b border-border bg-card/50 flex items-center gap-3">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Barcode className="w-5 h-5 text-emerald-500" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Сканируйте штрихкод или введите название товара (F2)..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted/60 border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
            />
          </form>

          {heldCarts.length > 0 && (
            <div className="relative group">
              <button
                className="px-3 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Отложенные чеки"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Отложено: {heldCarts.length}</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-card border border-border rounded-xl shadow-xl z-20 hidden group-hover:block space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1">Отложенные покупатели:</p>
                {heldCarts.map(h => (
                  <button
                    key={h.id}
                    onClick={() => handleResumeCart(h.id)}
                    className="w-full p-2 text-left hover:bg-muted rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{h.id} ({h.time})</div>
                      <div className="text-[10px] text-muted-foreground">{h.items.length} товаров</div>
                    </div>
                    <span className="font-bold text-emerald-500 font-mono">{h.total} ₽</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Categories Bar */}
        <div className="px-4 py-2 border-b border-border bg-card/30 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === null
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Все категории
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid Tiles */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
          {filteredProducts.map(product => {
            const isOutOfStock = product.stock <= 0;
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={isOutOfStock}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 active:scale-95 group relative ${
                  isOutOfStock
                    ? 'border-border/40 bg-muted/20 opacity-50 cursor-not-allowed'
                    : 'border-border bg-card hover:border-emerald-500/50 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate mb-1">
                    {product.barcode || product.sku || 'Без ШК'}
                  </div>
                  <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-emerald-500 transition-colors">
                    {product.name}
                  </h4>
                </div>

                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-sm font-bold font-mono text-foreground">
                    {product.retail_price.toLocaleString('ru-RU')} ₽
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    product.stock <= product.min_stock
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {product.stock} {product.unit}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart, Total, and Fast Checkout */}
      <div className="w-full lg:w-96 flex flex-col bg-card border-t lg:border-t-0 select-none">
        {/* Cart Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div>
            <h3 className="text-sm font-bold text-foreground">Текущий чек</h3>
            <p className="text-[11px] text-muted-foreground">Позиций: {cart.length}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleHoldCart}
              disabled={cart.length === 0}
              title="Отложить чек (F4)"
              className="p-2 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <PauseCircle className="w-4 h-4" />
            </button>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              title="Очистить чек"
              className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-3 overflow-y-auto divide-y divide-border/60">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <Barcode className="w-10 h-10 mb-2 stroke-[1.5] text-muted-foreground/40 animate-pulse" />
              <p className="text-xs font-medium">Чек пока пуст</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-[200px]">
                Пикните сканером или выберите товар из списка слева
              </p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-3 group">
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-medium text-foreground truncate" title={item.product.name}>
                    {item.product.name}
                  </h5>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {item.unit_price} ₽ × {item.quantity} = <strong className="text-foreground">{item.total} ₽</strong>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/80">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center font-mono font-bold text-xs text-foreground">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-muted-foreground hover:text-rose-500 opacity-40 group-hover:opacity-100 transition-opacity p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout Button */}
        <div className="p-4 border-t border-border bg-muted/10 space-y-3">
          {/* Discount Selector */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" /> Скидка на чек:
            </span>
            <div className="flex items-center gap-1">
              {[0, 3, 5, 10].map(pct => (
                <button
                  key={pct}
                  onClick={() => setDiscountPercent(pct)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    discountPercent === pct 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-500 font-medium">
              <span>Скидка ({discountPercent}%):</span>
              <span className="font-mono">−{discountAmount} ₽</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="pt-2 border-t border-border/80 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-muted-foreground">ИТОГО К ОПЛАТЕ:</span>
            <div className="text-3xl font-extrabold font-mono tracking-tight text-foreground">
              {totalSum.toLocaleString('ru-RU')} <span className="text-xl font-normal text-muted-foreground">₽</span>
            </div>
          </div>

          {/* Large Checkout Button */}
          <button
            onClick={openPaymentModal}
            disabled={cart.length === 0}
            className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>Оплата (F8)</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: CHECKOUT & PAYMENT                                  */}
      {/* ============================================================ */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <h3 className="text-base font-bold text-foreground">Оплата покупки</h3>
                <p className="text-xs text-muted-foreground">Сумма к оплате: <strong className="text-foreground font-mono">{totalSum} ₽</strong></p>
              </div>
              <button 
                onClick={() => setIsPaymentOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Payment Methods */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 text-xs font-bold transition-all ${
                    paymentMethod === 'CASH'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-sm'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Banknote className="w-6 h-6" />
                  <span>Наличные</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 text-xs font-bold transition-all ${
                    paymentMethod === 'CARD'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 shadow-sm'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                  <span>Карта</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 text-xs font-bold transition-all ${
                    paymentMethod === 'TRANSFER'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-500 shadow-sm'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Smartphone className="w-6 h-6" />
                  <span>СБП / Перевод</span>
                </button>
              </div>

              {/* If CASH: Cash Received & Change Calculation */}
              {paymentMethod === 'CASH' && (
                <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/20">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Внесено покупателем (₽):</label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      autoFocus
                      className="w-full text-2xl font-bold font-mono px-4 py-3 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="0"
                    />
                  </div>

                  {/* Quick Bill Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={setExactCash}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                    >
                      Без сдачи
                    </button>
                    {[100, 500, 1000, 2000, 5000].map(bill => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => addQuickCash(bill)}
                        className="px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs font-mono font-semibold hover:bg-muted transition-colors"
                      >
                        +{bill} ₽
                      </button>
                    ))}
                  </div>

                  {/* Calculated Change */}
                  <div className="pt-3 border-t border-border flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Сдача покупателю:</span>
                    <span className={`text-xl font-mono font-bold ${
                      (Number(cashReceived) || 0) >= totalSum ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {Math.max(0, (Number(cashReceived) || 0) - totalSum).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors"
              >
                Отмена (Esc)
              </button>
              <button
                type="button"
                onClick={handleConfirmSale}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                {isSubmitting ? 'Проведение...' : 'Завершить продажу (Enter)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: RECEIPT PREVIEW & THERMAL PRINT                      */}
      {/* ============================================================ */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-bold text-foreground">Продажа проведена!</span>
              </div>
              <button 
                onClick={() => setCompletedSale(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Paper Container */}
            <div className="flex-1 p-6 overflow-y-auto bg-muted/40 flex justify-center">
              <div 
                id="printable-receipt"
                className="w-full max-w-[340px] bg-white text-black p-5 rounded-lg shadow-sm font-mono text-xs space-y-3"
              >
                {/* Receipt Header */}
                <div className="text-center space-y-1 pb-2 border-b border-dashed border-zinc-400">
                  <div className="font-bold text-sm uppercase">{settings.store_name || 'Магазин'}</div>
                  <div className="text-[10px] text-zinc-600">{settings.store_address || ''}</div>
                  {settings.store_inn && <div className="text-[10px] text-zinc-600">ИНН: {settings.store_inn}</div>}
                  <div className="text-[11px] font-bold mt-2">ТОВАРНЫЙ ЧЕК {completedSale.receipt_number}</div>
                  <div className="text-[10px] text-zinc-500">
                    {new Date(completedSale.created_at).toLocaleString('ru-RU')}
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1.5 py-1 border-b border-dashed border-zinc-400">
                  {completedSale.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="text-[11px] font-medium leading-tight">{item.product.name}</div>
                      <div className="flex justify-between text-[10px] text-zinc-600">
                        <span>{item.quantity} шт × {item.unit_price} ₽</span>
                        <span className="font-bold text-black">{item.total} ₽</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1 pt-1 text-[11px]">
                  {completedSale.discount_amount > 0 && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Скидка:</span>
                      <span>−{completedSale.discount_amount} ₽</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-zinc-300">
                    <span>ИТОГО:</span>
                    <span>{completedSale.final_amount} ₽</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-600">
                    <span>Оплата:</span>
                    <span>
                      {completedSale.payment_method === 'CASH' ? 'Наличные' : completedSale.payment_method === 'CARD' ? 'Карта' : 'СБП / Перевод'}
                    </span>
                  </div>
                  {completedSale.payment_method === 'CASH' && (
                    <>
                      <div className="flex justify-between text-[10px] text-zinc-600">
                        <span>Получено:</span>
                        <span>{completedSale.cash_received} ₽</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-bold text-black">
                        <span>СДАЧА:</span>
                        <span>{completedSale.change_returned} ₽</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Greeting */}
                <div className="text-center pt-3 border-t border-dashed border-zinc-400 text-[10px] text-zinc-600 space-y-1">
                  <div>{settings.receipt_footer || 'Спасибо за покупку!'}</div>
                  <div className="text-[9px] text-zinc-400">Система «Простая Розница»</div>
                </div>
              </div>
            </div>

            {/* Receipt Modal Actions */}
            <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4 text-primary" />
                <span>Печать (Ctrl+P)</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all"
              >
                Новый чек (Space)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

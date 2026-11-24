import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { POS } from './components/POS';
import { Products } from './components/Products';
import { Supplies } from './components/Supplies';
import { CashShifts } from './components/CashShifts';
import { ReceiptsHistory } from './components/ReceiptsHistory';
import { Debts } from './components/Debts';
import { Settings } from './components/Settings';
import { Product, Category, Shift, AnalyticsSummary, StoreSettings } from './types';
import { api } from './api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [openAddProductModal, setOpenAddProductModal] = useState<boolean>(false);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [settings, setSettings] = useState<StoreSettings>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize Theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  // Global F1 key listener for instant POS access
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('pos');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Fetch all initial data
  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [prods, cats, shiftRes, sum, sets] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getCurrentShift(),
        api.getAnalyticsSummary(),
        api.getSettings(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setCurrentShift(shiftRes.isOpen ? shiftRes.shift : null);
      setSummary(sum);
      setSettings(sets);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Tab Titles
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'VIP-Plast: Аналитика и период', subtitle: 'Продажи за период, выручка, себестоимость и прибыль' };
      case 'pos':
        return { title: 'Касса и оформление накладных', subtitle: 'Оформление продажи, реализация в долг, печать А5' };
      case 'debts':
        return { title: 'Долги клиентов (Накладные в долг)', subtitle: 'Учет задолженностей покупателей, погашение и печать А5' };
      case 'products':
        return { title: 'Каталог товаров и цены', subtitle: 'Подоконники, отливы, сэндвич-панели и комплектующие' };
      case 'supplies':
        return { title: 'Склад и приходные накладные', subtitle: 'Поступление от поставщиков, остатки и инвентаризация' };
      case 'receipts':
        return { title: 'Журнал накладных и чеков', subtitle: 'История всех оформленных накладных и повторная печать' };
      case 'shifts':
        return { title: 'Касса и смены', subtitle: 'Денежный ящик, размен и Z-отчет' };
      case 'settings':
        return { title: 'Реквизиты и настройки', subtitle: 'Данные организации VIP-Plast для печати в накладных' };
      default:
        return { title: 'VIP-Plast', subtitle: 'Учет подоконников, отливов и сэндвич-панелей' };
    }
  };

  const { title, subtitle } = getTabTitle();
  const lowStockCount = products.filter(p => p.stock <= p.min_stock).length;

  return (
    <div className={`min-h-screen flex flex-row ${isDark ? 'glass-canvas-dark' : 'glass-canvas-light'} text-foreground transition-colors duration-300 antialiased`}>
      {/* Translucent Frosted Glass Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        shiftStatus={{
          isOpen: Boolean(currentShift),
          cashier_name: currentShift?.cashier_name,
          starting_cash: currentShift?.starting_cash,
        }}
        lowStockCount={lowStockCount}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Translucent Frosted Glass Header */}
        <Header
          title={title}
          subtitle={subtitle}
          onOpenPOS={() => setActiveTab('pos')}
          onOpenNewProduct={() => {
            setActiveTab('products');
            setOpenAddProductModal(true);
          }}
          onRefresh={loadAllData}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />

        <main className="flex-1 overflow-y-auto pb-6">
          {activeTab === 'dashboard' && (
            <Dashboard
              summary={summary}
              shift={currentShift}
              onNavigate={(tab) => setActiveTab(tab)}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'pos' && (
            <div className="mr-3 glass-panel p-2">
              <POS
                products={products}
                categories={categories}
                shift={currentShift}
                settings={settings}
                onRefreshData={loadAllData}
                onOpenShift={() => setActiveTab('shifts')}
              />
            </div>
          )}

          {activeTab === 'debts' && (
            <div className="mr-3 glass-panel p-2">
              <Debts
                settings={settings}
                onRefresh={loadAllData}
              />
            </div>
          )}

          {activeTab === 'products' && (
            <div className="mr-3 glass-panel p-2">
              <Products
                products={products}
                categories={categories}
                onRefresh={loadAllData}
                openAddModalInitially={openAddProductModal}
              />
            </div>
          )}

          {activeTab === 'supplies' && (
            <div className="mr-3 glass-panel p-2">
              <Supplies
                products={products}
                onRefresh={loadAllData}
              />
            </div>
          )}

          {activeTab === 'receipts' && (
            <div className="mr-3 glass-panel p-2">
              <ReceiptsHistory
                settings={settings}
              />
            </div>
          )}

          {activeTab === 'shifts' && (
            <div className="mr-3 glass-panel p-2">
              <CashShifts
                shift={currentShift}
                onRefresh={loadAllData}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="mr-3 glass-panel p-2">
              <Settings
                settings={settings}
                onRefresh={loadAllData}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
export default App;

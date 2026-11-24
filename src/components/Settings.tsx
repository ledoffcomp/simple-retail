import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Store, 
  Database, 
  Save, 
  CheckCircle2, 
  Download, 
  HelpCircle,
  Shield,
  FileSpreadsheet
} from 'lucide-react';
import { StoreSettings } from '../types';
import { api } from '../api';

interface SettingsProps {
  settings: StoreSettings;
  onRefresh: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onRefresh }) => {
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.saveSettings(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      onRefresh();
    } catch (err: any) {
      alert(`Ошибка при сохранении: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Настройки магазина и системы</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Параметры торговой точки, печать товарных чеков и резервное копирование данных
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Details Card */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Реквизиты торговой точки</h3>
              <p className="text-[11px] text-muted-foreground">Отображаются в шапке товарного чека для покупателей</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Название магазина / ИП</label>
              <input
                type="text"
                value={formData.store_name || ''}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                placeholder="Например: ИП Иванов И.И. / Магазин «У Дома»"
                className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">ИНН организации или ИП</label>
              <input
                type="text"
                value={formData.store_inn || ''}
                onChange={(e) => setFormData({ ...formData, store_inn: e.target.value })}
                placeholder="770123456789"
                className="w-full font-mono px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Фактический адрес магазина</label>
              <input
                type="text"
                value={formData.store_address || ''}
                onChange={(e) => setFormData({ ...formData, store_address: e.target.value })}
                placeholder="г. Москва, ул. Примерная, д. 10"
                className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        </div>

        {/* Receipt Settings Card */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Текст на товарном чеке</h3>
              <p className="text-[11px] text-muted-foreground">Приветствие и пожелание в чеке</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Текст в шапке чека</label>
              <input
                type="text"
                value={formData.receipt_header || ''}
                onChange={(e) => setFormData({ ...formData, receipt_header: e.target.value })}
                placeholder="Добро пожаловать!"
                className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Текст в подвале чека</label>
              <input
                type="text"
                value={formData.receipt_footer || ''}
                onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
                placeholder="Спасибо за покупку! Ждем вас снова."
                className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        </div>

        {/* Database & Backup Card */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">База данных и резервное копирование</h3>
              <p className="text-[11px] text-muted-foreground">Вся база хранится в одном надежном файле `data/retail.db`</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-foreground">Прозрачное резервное копирование</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Чтобы создать полную резервную копию со всеми чеками, товарами и ценами, достаточно скопировать файл `data/retail.db` на флешку или в облако.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-mono font-bold">
                SQLite 3
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2">
          {isSaved ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
              <span>Настройки успешно сохранены!</span>
            </div>
          ) : <div />}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Сохранение...' : 'Сохранить настройки'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

import { useEffect, useState } from 'react';
import { Package, TrendingUp, BarChart3, Brain, Warehouse, Bot, LogOut, Settings as SettingsIcon, ShoppingBag } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import MLPredictions from './components/MLPredictions';
import Analytics from './components/Analytics';
import AutoOrders from './components/AutoOrders';
import Settings from './components/Settings';
import SalesSimulator from './components/SalesSimulator';
import Login from './components/Login';
import { api, clearAuth, getStoredUser, login, setupFirstUser } from './lib/api';

export default function App() {
  const storedUser = getStoredUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(!!storedUser);
  const [currentUser, setCurrentUser] = useState(storedUser?.username ?? '');
  const [autoOrderEnabled, setAutoOrderEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setAutoOrderEnabled(null);
      return;
    }

    let isMounted = true;

    const loadAutoOrderStatus = async () => {
      try {
        const settings = await api.getSettings();
        if (isMounted) setAutoOrderEnabled(settings.autoOrderEnabled);
      } catch {
        if (isMounted) setAutoOrderEnabled(null);
      }
    };

    loadAutoOrderStatus();
    const intervalId = window.setInterval(loadAutoOrderStatus, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  const handleLogin = async (username: string, password: string) => {
    const user = await login(username, password);
    setIsAuthenticated(true);
    setCurrentUser(user.username);
  };

  const handleLogout = () => {
    clearAuth();
    setIsAuthenticated(false);
    setCurrentUser('');
    setAutoOrderEnabled(null);
    setActiveTab('dashboard');
  };

  const handleSetup = async (username: string, password: string) => {
    const user = await setupFirstUser(username, password);
    setIsAuthenticated(true);
    setCurrentUser(user.username);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} onSetup={handleSetup} />;
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-blue-100 text-slate-900">
                <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />
          <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-violet-300/25 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl" />
        </div>

        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-6 py-4 backdrop-blur-md">
                    <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Warehouse className="h-6 w-6 text-white" />
              </div>
              <div className="flex min-h-10 items-center">
                <h1 className="text-2xl font-semibold leading-10 text-slate-900">Система управления складом</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2 shadow-sm">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {currentUser.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700">{currentUser}</span>
              </div>
              <div
                className={`rounded-full border px-3 py-1 text-sm font-medium shadow-sm ${
                  autoOrderEnabled === true
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : autoOrderEnabled === false
                      ? 'border-slate-200 bg-slate-50 text-slate-600'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
              >
                {autoOrderEnabled === true ? 'Автозаказ включен' : autoOrderEnabled === false ? 'Автозаказ выключен' : 'Проверка автозаказа'}
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 rounded-xl bg-white/85 shadow-sm">
                <LogOut className="h-4 w-4" />
                Выход
              </Button>
            </div>
          </div>
        </header>

                <main className="relative z-10 mx-auto w-full max-w-[1600px] p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="mb-6 rounded-full border border-slate-200/80 bg-white/90 p-1 shadow-sm backdrop-blur">
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Панель управления
              </TabsTrigger>
              <TabsTrigger value="inventory" className="gap-2">
                <Package className="h-4 w-4" />
                Складские запасы
              </TabsTrigger>
              <TabsTrigger value="auto-orders" className="gap-2">
                <Bot className="h-4 w-4" />
                AI Автозаказы
              </TabsTrigger>
              <TabsTrigger value="ml-predictions" className="gap-2">
                <Brain className="h-4 w-4" />
                ML Прогнозы
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Аналитика
              </TabsTrigger>
              <TabsTrigger value="sales-simulator" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Симуляция продаж
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <SettingsIcon className="h-4 w-4" />
                Настройки
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard"><Dashboard /></TabsContent>
            <TabsContent value="inventory"><Inventory /></TabsContent>
            <TabsContent value="auto-orders"><AutoOrders /></TabsContent>
            <TabsContent value="ml-predictions"><MLPredictions /></TabsContent>
            <TabsContent value="analytics"><Analytics /></TabsContent>
            <TabsContent value="sales-simulator"><SalesSimulator /></TabsContent>
            <TabsContent value="settings"><Settings /></TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}

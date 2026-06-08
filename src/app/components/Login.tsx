import { useEffect, useState } from 'react';
import { Eye, EyeOff, Warehouse, Lock, User, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { api } from '../lib/api';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onSetup: (username: string, password: string) => Promise<void>;
}

export default function Login({ onLogin, onSetup }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    api.authStatus()
      .then((status) => setNeedsSetup(!status.hasUsers))
      .catch((error) => setError(error instanceof Error ? error.message : 'Не удалось проверить состояние авторизации'))
      .finally(() => setIsCheckingSetup(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (needsSetup && password.length < 6) {
      setError('Пароль администратора должен содержать минимум 6 символов');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      if (needsSetup) {
        await onSetup(username, password);
      } else {
        await onLogin(username, password);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Неверное имя пользователя или пароль');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = needsSetup ? 'Создание администратора' : 'Вход в систему';
  const description = needsSetup
    ? 'В базе нет пользователей. Создайте первого администратора.'
    : 'Введите свои учетные данные для входа';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-blue-600 p-4 rounded-2xl mb-4 shadow-lg">
            <Warehouse className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Система управления складом</h1>
          <p className="text-slate-600">Данные хранятся в вашей Supabase-базе</p>
        </div>

        <Card className="shadow-xl border-slate-200">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {isCheckingSetup ? (
              <div className="flex items-center justify-center py-8 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Проверка базы данных...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Имя пользователя</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="username"
                      type="text"
                      placeholder={needsSetup ? 'Придумайте логин администратора' : 'Введите имя пользователя'}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={needsSetup ? 'Придумайте пароль' : 'Введите пароль'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Сохранение...' : needsSetup ? 'Создать администратора' : 'Войти в систему'}
                </Button>

                {needsSetup && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                    Демо-логин и демо-пароль удалены. Первый пользователь создаётся в вашей базе Supabase.
                  </div>
                )}
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-slate-600">
          <p>© 2026 Система управления складом</p>
        </div>
      </div>
    </div>
  );
}

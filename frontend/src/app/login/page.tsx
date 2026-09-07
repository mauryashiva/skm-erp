'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/auth-store';
import { useErpContextStore } from '../../stores/context-store';
import { UserProfile, Division, FinancialYear } from '../../types';
import { Lock, User, ShieldCheck, ArrowRight, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const { setAvailableDivisions, setAvailableFinancialYears } = useErpContextStore();

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const handleLogin = async (loginUsername?: string, loginPassword?: string) => {
    const finalUsername = loginUsername || username;
    const finalPassword = loginPassword || password;

    if (!finalUsername.trim() || !finalPassword) {
      toast.error('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await api.post<{ accessToken: string; user: UserProfile }>(
        '/auth/login',
        {
          username: finalUsername.trim(),
          password: finalPassword,
        },
      );

      setSession(response.user, response.accessToken);

      // Load divisions and FYs for active context
      try {
        const divs = await api.get<Division[]>('/divisions');
        setAvailableDivisions(divs);

        const fys = await api.get<FinancialYear[]>('/financial-years');
        setAvailableFinancialYears(fys);
      } catch (ctxErr) {
        console.warn('Context fetch fallback:', ctxErr);
      }

      toast.success(`Welcome to SKM ERP, ${response.user.full_name}!`);
      router.push('/parameters/pincode');
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (uname: string, pass: string) => {
    setUsername(uname);
    setPassword(pass);
    handleLogin(uname, pass);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/40 to-background">
      <div className="w-full max-w-md space-y-6">
        {/* Organization Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white shadow-xl font-black text-xl mb-1">
            SKM
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            SKM STEELS LIMITED
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Enterprise Resource Planning Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Sign in to your account</h2>
            <p className="text-xs text-muted-foreground">
              Enter your corporate username and password to proceed
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. ho_admin or your username"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              <span>Access ERP</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-border space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
              Quick Test Roles
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('ho_admin', 'admin123')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-border bg-secondary hover:bg-muted text-xs font-medium transition-colors text-foreground text-center"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>HO Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('inox_user', 'user123')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-border bg-secondary hover:bg-muted text-xs font-medium transition-colors text-foreground text-center"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span>SKM Inox User</span>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            New employee?{' '}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Submit registration request
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

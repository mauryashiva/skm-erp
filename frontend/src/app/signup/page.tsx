'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/api';
import { Division } from '../../types';
import {
  User,
  Mail,
  Phone,
  Building2,
  Lock,
  ArrowLeft,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();
  const [divisions, setDivisions] = React.useState<Division[]>([]);
  const [fullName, setFullName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [gender, setGender] = React.useState<'Male' | 'Female' | ''>('');
  const [mobileNumber, setMobileNumber] = React.useState('');
  const [divisionId, setDivisionId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  React.useEffect(() => {
    async function loadDivisions() {
      try {
        const list = await api.get<Division[]>('/divisions/public');
        setDivisions(list);
        if (list.length > 0) {
          setDivisionId(list[0].id);
        }
      } catch (err) {
        console.warn('Divisions load fallback:', err);
      }
    }
    loadDivisions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid Email ID');
      return;
    }

    if (!gender) {
      toast.error('Please select gender (Male or Female)');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Password and confirmation password do not match');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/signup', {
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        gender,
        mobileNumber: mobileNumber.trim(),
        divisionId,
        password,
        confirmPassword,
      });

      setIsSubmitted(true);
      toast.success('Registration submitted! Status is PENDING admin review.');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/40 to-background">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Clock className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Registration Pending Approval</h2>
            <p className="text-xs text-muted-foreground">
              Your registration request for employee account <strong className="text-foreground">@{username}</strong> has been received with status:
            </p>
            <div className="inline-block mt-2">
              <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Status = Pending
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-secondary text-left text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Next Steps</span>
            </div>
            <p>
              1. The SKM ERP Administrator will review your account.
            </p>
            <p>
              2. The Admin will assign your roles, authorized divisions, and permission matrix.
            </p>
            <p>
              3. Once approved, you can log in using your username and password.
            </p>
          </div>

          <Button
            onClick={() => router.push('/login')}
            className="w-full"
            variant="outline"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/40 to-background">
      <div className="w-full max-w-lg space-y-6">
        {/* Organization Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white shadow-lg font-black text-lg mb-1">
            SKM
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            SKM STEELS LIMITED
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Employee ERP Registration
          </p>
        </div>

        {/* Signup Form Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Create Employee Account</h2>
            <p className="text-xs text-muted-foreground">
              Signup assigns your primary division and requests administrator authorization
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Username *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="e.g. rsharma"
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email ID */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Email ID *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rajesh@skmsteels.com"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Gender *
                </label>
                <div className="flex items-center gap-4 h-9 px-3 rounded-lg border border-input bg-card">
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-foreground select-none">
                    <input
                      type="radio"
                      name="gender"
                      value="Male"
                      checked={gender === 'Male'}
                      onChange={() => setGender('Male')}
                      className="w-3.5 h-3.5 text-primary accent-primary cursor-pointer"
                      required
                    />
                    <span>Male</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-foreground select-none">
                    <input
                      type="radio"
                      name="gender"
                      value="Female"
                      checked={gender === 'Female'}
                      onChange={() => setGender('Female')}
                      className="w-3.5 h-3.5 text-primary accent-primary cursor-pointer"
                      required
                    />
                    <span>Female</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              {/* Primary Division */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Primary Division *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <select
                    value={divisionId}
                    onChange={(e) => setDivisionId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                    required
                  >
                    {divisions.map((div) => (
                      <option key={div.id} value={div.id}>
                        {div.name} {div.is_ho ? '(HO)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/70 border border-border text-[11px] text-muted-foreground flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Account Review Policy:</strong> Signup registers your account in <em>Pending</em> status. An Administrator must authorize your role and division permissions before login is enabled.
              </span>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Submit Registration
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground">
            Already have an approved account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  HardHat,
  Info,
  Lock,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { DEMO_CREDENTIALS, ROLES } from '@/data/generate';
import { Button, Checkbox, Field, Input, Label, FieldError } from '@/components/ui';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatNumber, formatPercent } from '@/lib/format';

interface LocationState {
  from?: string;
}

export function Login() {
  const { login } = useAuth();
  const { corporate, settings, state } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const [employeeId, setEmployeeId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const idInvalid = touched && employeeId.trim().length < 3;
  const pwdInvalid = touched && password.length < 6;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (employeeId.trim().length < 3 || password.length < 6) return;
    setBusy(true);
    setError(null);
    // A short delay makes the async feel intentional rather than glitchy.
    window.setTimeout(() => {
      const result = login(employeeId, password, remember);
      setBusy(false);
      if (!result.ok) {
        setError(result.error ?? 'Sign-in failed.');
        return;
      }
      const state = location.state as LocationState | null;
      navigate(state?.from ?? '/dashboard', { replace: true });
    }, 450);
  };

  const fill = (id: string, pwd: string) => {
    setEmployeeId(id);
    setPassword(pwd);
    setError(null);
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* -------------------------------- brand panel --------------------------- */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(1100px 500px at 10% -10%, rgba(249,115,22,0.30), transparent 60%), radial-gradient(900px 500px at 110% 110%, rgba(37,99,235,0.28), transparent 55%)',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
          aria-hidden="true"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-safety-500 shadow-lg">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg leading-tight font-semibold">EHS Command Centre</p>
              <p className="text-xs text-navy-200/70">{settings.organisationName}</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight">
            One screen for safety across all <span className="text-safety-400">{state.units.length} spinning units</span>.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-navy-100/75">
            Live monitoring of injuries, near misses, corrective actions, competence, PPE, inspections and emergency
            readiness — with every figure traceable back to the record that produced it.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            <MiniStat
              label="LTIFR"
              value={corporate.ltifr.toFixed(2)}
              unit="per 1M hrs"
              target={settings.target.ltifr}
              good="down"
            />
            <MiniStat
              label="Training"
              value={formatPercent(corporate.trainingCompliance)}
              unit="compliant"
              target={settings.target.trainingCompliance}
              good="up"
            />
            <MiniStat
              label="Open CAPA"
              value={formatNumber(corporate.openCapa)}
              unit="actions"
              target={0}
              good="down"
            />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs text-navy-100/70">
            {[
              'Deterministic demo dataset (Jan–Sep 2026)',
              'Role-based access for 5 personas',
              'CSV / Excel / print-PDF exports',
              'Accessible, keyboard-first navigation',
            ].map((f) => (
              <span key={f} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-safety-400" />
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-[10px] text-navy-200/45">
          Illustrative demonstration data. Not a compliance or statutory record.
        </p>
      </section>

      {/* --------------------------------- form ------------------------------- */}
      <section className="flex items-center justify-center bg-white px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm leading-tight font-semibold text-ink-900">EHS Command Centre</p>
              <p className="text-[11px] leading-tight text-ink-500">{settings.organisationName}</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-ink-900">Sign in</h2>
          <p className="mt-1 text-xs text-ink-500">
            Use your employee ID. Demo credentials are listed below — no account setup required.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <Field>
              <Label htmlFor="employeeId">Employee ID</Label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input
                  id="employeeId"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="EHS001"
                  autoComplete="username"
                  autoCapitalize="characters"
                  className="pl-8"
                  aria-invalid={idInvalid}
                  aria-describedby={idInvalid ? 'employeeId-error' : undefined}
                />
              </div>
              {idInvalid ? (
                <FieldError id="employeeId-error">Enter at least 3 characters.</FieldError>
              ) : null}
            </Field>

            <Field>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-9 pl-8"
                  aria-invalid={pwdInvalid}
                  aria-describedby={pwdInvalid ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwdInvalid ? <FieldError id="password-error">Password must be at least 6 characters.</FieldError> : null}
            </Field>

            <div className="flex items-center justify-between pt-0.5">
              <Checkbox checked={remember} onCheckedChange={setRemember} label="Keep me signed in" />
              <button
                type="button"
                onClick={() => setError('Password reset is disabled in this demonstration module.')}
                className="text-[11px] font-medium text-navy-700 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {error ? (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
              {busy ? 'Signing in…' : 'Sign in to EHS Command Centre'}
              {!busy ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>

          {/* ------------------------------ demo logins ------------------------ */}
          <div className="mt-7 rounded-xl border border-ink-200 bg-ink-50/70 p-3.5">
            <div className="mb-2.5 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-ink-400" />
              <p className="text-[11px] font-semibold tracking-wide text-ink-600 uppercase">Demo personas</p>
            </div>
            <ul className="space-y-1.5">
              {DEMO_CREDENTIALS.map((cred) => {
                const role = ROLES.find((r) => r.id === cred.roleId);
                const unit = state.units.find((u) => u.id === cred.unitId);
                const active = employeeId.trim().toUpperCase() === cred.employeeId;
                return (
                  <li key={cred.employeeId}>
                    <button
                      type="button"
                      onClick={() => fill(cred.employeeId, cred.password)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors',
                        active
                          ? 'border-safety-400 bg-safety-50'
                          : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50',
                      )}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy-800 text-[10px] font-semibold text-white">
                        {cred.avatarInitials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-ink-900">{cred.name}</span>
                        <span className="block truncate text-[10px] text-ink-500">
                          {role?.name} · {unit ? unit.code : 'Corporate'}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-[10px] font-medium text-ink-700">{cred.employeeId}</span>
                        <span className="block font-mono text-[9px] text-ink-400">{cred.password}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-5 flex items-start gap-2 text-[10px] leading-relaxed text-ink-400">
            <HardHat className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>
              This module is a functional prototype. Passwords are stored in plain text in the demo dataset and must
              never be copied into a production system.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniStat({
  label,
  value,
  unit,
  target,
  good,
}: {
  label: string;
  value: string;
  unit: string;
  target: number;
  good: 'up' | 'down';
}) {
  const numeric = Number.parseFloat(value);
  const met = good === 'up' ? numeric >= target : numeric <= target;
  const Trend = good === 'up' ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
      <p className="text-[10px] font-semibold tracking-wider text-navy-200/60 uppercase">{label}</p>
      <p className="mt-1 text-xl leading-none font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-[10px] font-normal text-navy-200/60">{unit}</span>
      </p>
      <div className="mt-2">
        <Progress
          value={Math.min(100, (numeric / (target || 1)) * 100)}
          size="sm"
          tone={met ? 'green' : 'amber'}
          showTarget
          target={100}
        />
      </div>
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-navy-200/60">
          <Trend className="h-3 w-3" />
          Target {good === 'up' ? '≥' : '≤'} {target}
        </p>
    </div>
  );
}

'use client';
import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui';

export const PasswordInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? 'text' : 'password'} className="pr-11" {...props} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-charcoal" aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  const level = score <= 2 ? ['Weak', 'bg-danger', 1] : score <= 3 ? ['Fair', 'bg-warning', 2] : ['Strong', 'bg-success', 3];
  return (
    <div className="mt-2 flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1">{[1, 2, 3].map((i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= (level[2] as number) ? level[1] : 'bg-soft'}`} />)}</div>
      <span className="text-xs text-muted">{level[0] as string}</span>
    </div>
  );
}

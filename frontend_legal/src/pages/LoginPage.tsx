import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui/Primitives';
import { DEMO_ACCOUNTS } from '../data/mockData';
import { PublicHeader } from '../components/layout/PublicHeader';
import { Footer } from '../components/layout/Footer';

type Stage = 'CREDENTIALS' | 'MFA';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>('CREDENTIALS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
  }, [stage]);

  const handleCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    const match = DEMO_ACCOUNTS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!match || password !== 'password123') {
      setError('Invalid email or password.');
      return;
    }
    setStage('MFA');
  };

  const handleMfa = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    const user = login(email);
    if (user) navigate('/home');
    else setError('Session expired. Please sign in again.');
  };

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col">
      <PublicHeader />

      <main id="main-content" className="flex-1">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-[1fr_400px] gap-8">
          <div>
            <h1 className="text-lg font-bold text-navy-900 mb-4">Instructions for Login</h1>
            <div className="border border-line-200 bg-white rounded-sm p-5 text-sm text-ink-700 leading-relaxed space-y-3">
              <p>
                This portal is for the exclusive use of Judges, Public Prosecutors, Defense Counsel, Registrars and
                other authorized judicial officers. User accounts are provisioned by the Court Registry Administrator
                — self-registration is not available.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Enter the email address and password issued to you by your Court Registry.</li>
                <li>A one-time verification code (MFA) will be requested on every login.</li>
                <li>If you have forgotten your password, use the &ldquo;Forgot password?&rdquo; link to reset it via OTP.</li>
                <li>Report any suspicious activity immediately to the helpdesk listed below.</li>
              </ul>
              <div className="flex items-start gap-2.5 bg-status-urgentBg border border-status-urgent/20 rounded-sm p-3.5 mt-4">
                <ShieldAlert size={16} className="text-status-urgent shrink-0 mt-0.5" />
                <p className="text-xs text-ink-700">
                  <span className="font-semibold text-status-urgent">Unauthorized access is a punishable offence</span> under
                  the Information Technology Act, 2000. All login attempts, IP addresses and session activity on this
                  system are logged and may be used in evidence.
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="border border-line-200 bg-white rounded-sm">
              <div className="px-5 py-4 border-b border-line-200 bg-paper-50">
                <h2 className="text-sm font-semibold text-navy-900">
                  {stage === 'CREDENTIALS' ? 'Registered User Login' : 'Two-Factor Verification'}
                </h2>
              </div>
              <div className="p-5">
                {stage === 'CREDENTIALS' && (
                  <form onSubmit={handleCredentials} className="space-y-4">
                    {error && (
                      <div className="bg-status-urgentBg border border-status-urgent/20 text-status-urgent px-3.5 py-2.5 rounded-sm flex items-center gap-2 text-sm">
                        <AlertCircle size={16} /> {error}
                      </div>
                    )}

                    <Input label="Email Address" type="email" placeholder="name@tngovt.in" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required className="rounded-sm" />
                    <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-sm" />

                    <div className="flex justify-end -mt-1">
                      <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-medium text-navy-700 hover:underline">
                        Forgot password?
                      </button>
                    </div>

                    <Button type="submit" variant="primary" size="lg" className="w-full rounded-sm">Login</Button>
                  </form>
                )}

                {stage === 'MFA' && (
                  <form onSubmit={handleMfa} className="space-y-5">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-navy-50 text-navy-700 mb-2.5">
                        <ShieldCheck size={20} />
                      </div>
                      <p className="text-xs text-ink-500">Enter the 6-digit code sent to your registered device</p>
                    </div>

                    {error && <div className="text-center text-status-urgent text-sm font-medium">{error}</div>}

                    <div className="flex justify-center">
                      <input
                        autoFocus
                        inputMode="numeric"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="••••••"
                        className="w-44 text-center text-2xl tracking-[0.6em] font-mono py-2 border-b-2 border-line-300 focus:border-navy-500 bg-transparent outline-none text-navy-900"
                      />
                    </div>

                    <Button type="submit" variant="primary" size="lg" className="w-full rounded-sm">Verify &amp; Login</Button>
                    <Button type="button" variant="ghost" className="w-full rounded-sm" onClick={() => setStage('CREDENTIALS')}>
                      <ArrowLeft size={14} /> Back
                    </Button>
                    <p className="text-center text-xs text-ink-400">(Demo code: any 6 digits, e.g. 123456)</p>
                  </form>
                )}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-2">
                Demo Accounts &middot; password: <span className="font-mono normal-case">password123</span>
              </p>
              <div className="border border-line-200 bg-white rounded-sm divide-y divide-line-200">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => { setEmail(acc.email); setPassword('password123'); setStage('CREDENTIALS'); }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-xs hover:bg-paper-50"
                  >
                    <span className="font-medium text-navy-900">{acc.designation}</span>
                    <span className="text-ink-500">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer variant="slim" />
    </div>
  );
};

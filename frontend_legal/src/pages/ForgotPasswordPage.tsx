import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { Button, Input } from '../components/ui/Primitives';
import { DEMO_ACCOUNTS } from '../data/mockData';
import { PublicHeader } from '../components/layout/PublicHeader';
import { Footer } from '../components/layout/Footer';

type Stage = 'EMAIL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const knownAccount = DEMO_ACCOUNTS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!knownAccount) {
      setError('No account found with this email address.');
      return;
    }
    setError('');
    setStage('OTP');
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit OTP sent to your email.');
      return;
    }
    setError('');
    setStage('NEW_PASSWORD');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setStage('SUCCESS');
  };

  const STEP_LABELS = ['Email', 'OTP', 'New Password', 'Done'];
  const stepIndex = { EMAIL: 0, OTP: 1, NEW_PASSWORD: 2, SUCCESS: 3 }[stage];

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col">
      <PublicHeader />

      <main id="main-content" className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            {STEP_LABELS.map((label, i) => (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                      i < stepIndex ? 'bg-ashoka-600 border-ashoka-600 text-white' : i === stepIndex ? 'bg-saffron-500 border-saffron-500 text-white' : 'bg-white border-line-300 text-ink-300'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className={`text-[10px] ${i <= stepIndex ? 'text-ink-700 font-medium' : 'text-ink-300'}`}>{label}</span>
                </div>
                {i < STEP_LABELS.length - 1 && <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < stepIndex ? 'bg-ashoka-600' : 'bg-line-300'}`} />}
              </React.Fragment>
            ))}
          </div>

          <div className="border border-line-200 bg-white rounded-sm">
            <div className="px-5 py-4 border-b border-line-200 bg-paper-50">
              <h1 className="text-sm font-semibold text-navy-900">Password Reset</h1>
            </div>
            <div className="p-5">
              {stage === 'EMAIL' && (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="flex items-start gap-2.5">
                    <Mail size={16} className="text-navy-700 shrink-0 mt-0.5" />
                    <p className="text-xs text-ink-500">Enter your registered email to receive a one-time password (OTP).</p>
                  </div>
                  {error && <p className="text-status-urgent text-sm font-medium">{error}</p>}
                  <Input label="Email Address" type="email" placeholder="name@tngovt.in" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required className="rounded-sm" />
                  <Button type="submit" variant="primary" size="lg" className="w-full rounded-sm">Send OTP</Button>
                  <Button type="button" variant="ghost" className="w-full rounded-sm" onClick={() => navigate('/login')}>
                    <ArrowLeft size={14} /> Back to Login
                  </Button>
                </form>
              )}

              {stage === 'OTP' && (
                <form onSubmit={handleOtpSubmit} className="space-y-5">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck size={16} className="text-navy-700 shrink-0 mt-0.5" />
                    <p className="text-xs text-ink-500">
                      A 6-digit code has been sent to <span className="font-medium text-ink-700">{email}</span>
                    </p>
                  </div>
                  {error && <p className="text-center text-status-urgent text-sm font-medium">{error}</p>}
                  <div className="flex justify-center">
                    <input
                      autoFocus
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="••••••"
                      className="w-44 text-center text-2xl tracking-[0.6em] font-mono py-2 border-b-2 border-line-300 focus:border-navy-500 bg-transparent outline-none text-navy-900"
                    />
                  </div>
                  <Button type="submit" variant="primary" size="lg" className="w-full rounded-sm">Verify OTP</Button>
                  <div className="flex items-center justify-between">
                    <Button type="button" variant="ghost" size="sm" className="rounded-sm" onClick={() => setStage('EMAIL')}>
                      <ArrowLeft size={14} /> Back
                    </Button>
                    <button type="button" className="text-xs font-medium text-navy-700 hover:underline">Resend OTP</button>
                  </div>
                  <p className="text-center text-xs text-ink-400">(Demo OTP: any 6 digits, e.g. 123456)</p>
                </form>
              )}

              {stage === 'NEW_PASSWORD' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="flex items-start gap-2.5">
                    <KeyRound size={16} className="text-navy-700 shrink-0 mt-0.5" />
                    <p className="text-xs text-ink-500">Choose a strong password you haven&apos;t used before.</p>
                  </div>
                  {error && <p className="text-status-urgent text-sm font-medium">{error}</p>}
                  <Input label="New Password" type="password" placeholder="Minimum 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus required className="rounded-sm" />
                  <Input label="Confirm New Password" type="password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="rounded-sm" />
                  <Button type="submit" variant="primary" size="lg" className="w-full rounded-sm">Update Password</Button>
                </form>
              )}

              {stage === 'SUCCESS' && (
                <div className="text-center space-y-4 py-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-ashoka-50 text-ashoka-600">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-navy-900">Password Changed Successfully</h2>
                    <p className="text-xs text-ink-500 mt-1.5 max-w-xs mx-auto">
                      Your password has been updated. You can now sign in with your new password.
                    </p>
                  </div>
                  <Button variant="primary" size="lg" className="w-full rounded-sm" onClick={() => navigate('/login')}>
                    Back to Login
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer variant="slim" />
    </div>
  );
};

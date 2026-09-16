
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Button, Input, Card } from './Common';
import { Shield, AlertCircle, Fingerprint, ArrowLeft, Lock } from 'lucide-react';
import { UserRole, User } from '../types';
import { bootstrapLegalSession } from '../legal/bootstrapLegalSession';

type AuthStage = 'CREDENTIALS' | 'PIN' | 'BIOMETRIC';

export const Login = () => {
    const { login } = useStore();
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

    // State
    const [stage, setStage] = useState<AuthStage>('CREDENTIALS');
    const [tempUser, setTempUser] = useState<User | null>(null);
    // Raw /api/auth/login response, kept alongside tempUser — a LEGAL user's
    // row also carries judicial/bar fields (bar_judicial_id, court, etc.)
    // that the mapped `User` shape above doesn't have room for, but the
    // embedded Legal app needs once this login hands off to it.
    const [tempRawUser, setTempRawUser] = useState<any>(null);
    const [tempToken, setTempToken] = useState<string>('');

    // Form Inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');

    // UX State
    const [error, setError] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    // Reset error when stage changes
    useEffect(() => {
        setError('');
        setPin('');
    }, [stage]);

    // STAGE 1: Validate Email/Password
    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch(`${apiBase}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                setError('Invalid credentials.');
                return;
            }

            const payload = await response.json();
            if (payload?.user) {
                if (payload.token) {
                    localStorage.setItem('kaaval_web_token', payload.token);
                }
                const u = payload.user;
                const mappedUser: User = {
                    id: u.user_id || u.id,
                    username: u.username || u.email,
                    email: u.email,
                    name: u.name,
                    role: u.role as UserRole,
                    designation: u.designation || '',
                    badgeNumber: u.badge_number || u.badgeNumber || undefined,
                    profileImage: u.profile_image_url || u.profileImage || undefined,
                };
                setTempUser(mappedUser);
                setTempRawUser(u);
                setTempToken(payload.token || '');
                setStage('PIN');
                return;
            }

            setError('Invalid credentials.');
        } catch (error) {
            console.error('Login failed', error);
            setError('Unable to reach authentication service.');
        }
    };

    // Demo hint boxes below the form — clicking one fills the credential
    // fields (and jumps back to the CREDENTIALS stage) instead of just
    // displaying the values for manual copy-paste.
    const fillDemoCredentials = (demoEmail: string, demoPassword: string) => {
        setEmail(demoEmail);
        setPassword(demoPassword);
        setStage('CREDENTIALS');
        setError('');
    };

    // Hands the authenticated user off to the rest of the app. For LEGAL
    // users this also seeds the embedded Legal app's own session storage
    // (see bootstrapLegalSession) before the role-based redirect in App.tsx
    // mounts it, so it never has to prompt for credentials a second time.
    const finalizeLogin = (user: User) => {
        if (user.role === UserRole.LEGAL && tempRawUser) {
            bootstrapLegalSession(tempRawUser, tempToken);
        }
        login(user);
    };

    // STAGE 2: Validate PIN
    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === '1234') {
            // ADMIN requires Biometric NEXT
            if (tempUser?.role === UserRole.ADMIN) {
                setStage('BIOMETRIC');
            } else if (tempUser) {
                // Others log in immediately
                finalizeLogin(tempUser);
            }
        } else {
            setError('Invalid Security PIN.');
        }
    };

    // STAGE 3: Simulate Biometric (Admin Only - Mandatory)
    const handleBiometricScan = () => {
        setIsScanning(true);
        setError('');

        // Simulate hardware delay
        setTimeout(() => {
            // 90% chance of success for demo
            const success = true;
            setIsScanning(false);
            if (success && tempUser) {
                finalizeLogin(tempUser);
            } else {
                setError('Biometric Not Recognized. Try again.');
            }
        }, 2000);
    };

    // Render Logic
    const renderContent = () => {
        switch (stage) {
            case 'CREDENTIALS':
                return (
                    <form onSubmit={handleCredentialsSubmit} className="space-y-6">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-semibold text-navy-900">Authorized Access Only</h2>
                            <p className="text-xs text-ink-500 mt-1">Please enter your government email</p>
                        </div>

                        {error && (
                            <div className="bg-status-urgentBg border border-status-urgent/20 text-status-urgent px-3.5 py-2.5 rounded-sm flex items-center gap-2 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div>
                            <Input
                                label="Email Address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="officer@police.gov"
                                autoFocus
                            />
                        </div>
                        <div>
                            <Input
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        <Button className="w-full justify-center" size="lg">Continue</Button>

                        <div className="mt-4 text-xs text-center text-ink-500">
                            <p>Restricted System. All activities are monitored and logged.</p>
                        </div>
                    </form>
                );

            case 'PIN':
                return (
                    <form onSubmit={handlePinSubmit} className="space-y-6">
                        <div className="text-center mb-6">
                            <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-navy-50 text-navy-700 mb-4">
                                <Lock size={24} />
                            </div>
                            <h2 className="text-xl font-semibold text-navy-900">Enter Security PIN</h2>
                            <p className="text-xs text-ink-500 mt-1">
                                {tempUser?.role === UserRole.ADMIN
                                    ? 'Step 2/3: Identity Verification'
                                    : 'Enter the 4-digit code generated by your authenticator.'}
                            </p>
                        </div>

                        {error && (
                            <div className="text-center text-status-urgent text-sm font-medium animate-pulse">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-center">
                            <input
                                type="password"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-40 text-center text-3xl tracking-[1em] font-mono py-2 border-b-2 border-line-300 focus:border-navy-500 bg-transparent outline-none text-navy-900 transition-colors"
                                placeholder="••••"
                                autoFocus
                            />
                        </div>

                        <Button className="w-full justify-center" size="lg">
                            {tempUser?.role === UserRole.ADMIN ? 'Verify & Continue' : 'Verify Identity'}
                        </Button>

                        <Button type="button" variant="ghost" className="w-full" onClick={() => setStage('CREDENTIALS')}>
                            <ArrowLeft size={14} /> Cancel
                        </Button>

                        <div className="text-center text-xs text-ink-300">
                            (Demo PIN: 1234)
                        </div>
                    </form>
                );

            case 'BIOMETRIC':
                return (
                    <div className="space-y-8 flex flex-col items-center text-center">
                         <div className="relative">
                            {isScanning && (
                                <div className="absolute inset-0 rounded-full bg-navy-500/20 animate-ping"></div>
                            )}
                            <div
                                onClick={!isScanning ? handleBiometricScan : undefined}
                                className={`w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                                    isScanning
                                    ? 'border-navy-500 bg-navy-50 text-navy-700'
                                    : 'border-line-300 hover:border-navy-400 text-ink-300 hover:text-navy-600 hover:bg-paper-50'
                                }`}
                            >
                                <Fingerprint size={48} />
                            </div>
                         </div>

                         <div>
                             <h2 className="text-xl font-semibold text-navy-900">
                                 {isScanning ? 'Scanning...' : 'Biometric Auth Required'}
                             </h2>
                             <p className="text-xs text-ink-500 mt-2 max-w-xs mx-auto">
                                 {isScanning
                                    ? 'Verifying biometric credentials against database...'
                                    : 'Step 3/3: Admin privileges require mandatory biometric confirmation.'}
                             </p>
                         </div>

                         {error && (
                            <div className="text-status-urgent text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div className="w-full space-y-3">
                             <Button onClick={!isScanning ? handleBiometricScan : undefined} disabled={isScanning} className="w-full">
                                {isScanning ? 'Verifying...' : 'Scan Fingerprint'}
                             </Button>

                             <Button variant="ghost" className="w-full" onClick={() => setStage('PIN')}>
                                <ArrowLeft size={14} /> Back to PIN
                            </Button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-paper-50 flex flex-col items-center justify-center p-4">
            <div className="mb-8 text-center">
                <div className="flex justify-center mb-4">
                    <Shield className="w-16 h-16 text-navy-900" />
                </div>
                <h1 className="text-3xl font-serif font-bold text-navy-900 tracking-tight">NodeWatch</h1>
                <p className="text-ink-500 mt-2">Digital Evidence Chain of Custody System</p>
            </div>

            <Card className="w-full max-w-md min-h-[400px] flex flex-col justify-center">
                {renderContent()}
            </Card>

            {/* Hint Box — click a box to auto-fill its credentials */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-ink-500 max-w-2xl text-center opacity-60 hover:opacity-100 transition-opacity">
                <button
                    type="button"
                    onClick={() => fillDemoCredentials('rajendran.k@tnpolice.gov.in', 'password123')}
                    className="p-2 border border-line-200 rounded-sm hover:bg-white transition-colors cursor-pointer"
                >
                    <strong>Admin</strong><br/>rajendran.k@tnpolice.gov.in<br/>password123
                </button>
                <button
                    type="button"
                    onClick={() => fillDemoCredentials('murugan.s@tnpolice.gov.in', 'password123')}
                    className="p-2 border border-line-200 rounded-sm hover:bg-white transition-colors cursor-pointer"
                >
                    <strong>Police</strong><br/>murugan.s@tnpolice.gov.in<br/>password123
                </button>
                <button
                    type="button"
                    onClick={() => fillDemoCredentials('karthik.venkat@tnfsl.gov.in', 'password123')}
                    className="p-2 border border-line-200 rounded-sm hover:bg-white transition-colors cursor-pointer"
                >
                    <strong>Forensics</strong><br/>karthik.venkat@tnfsl.gov.in<br/>password123
                </button>
                <button
                    type="button"
                    onClick={() => fillDemoCredentials('vijay.sundaram@tngovt.in', 'password123')}
                    className="p-2 border border-line-200 rounded-sm hover:bg-white transition-colors cursor-pointer"
                >
                    <strong>Legal</strong><br/>vijay.sundaram@tngovt.in<br/>password123
                </button>
            </div>
        </div>
    );
};

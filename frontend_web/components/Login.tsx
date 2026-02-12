import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { MOCK_USERS } from '../constants';
import { Button, Input, Card } from './Common';
import { Shield, AlertCircle, Fingerprint, ArrowLeft, Lock } from 'lucide-react';
import { UserRole, User } from '../types';

type AuthStage = 'CREDENTIALS' | 'PIN' | 'BIOMETRIC';

export const Login = () => {
    const { login } = useStore();
    
    // State
    const [stage, setStage] = useState<AuthStage>('CREDENTIALS');
    const [tempUser, setTempUser] = useState<User | null>(null);
    
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
    const handleCredentialsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        
        if (user) {
            setTempUser(user);
            setStage('PIN');
        } else {
            setError('Invalid credentials.');
        }
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
                login(tempUser);
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
                login(tempUser);
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
                            <h2 className="text-xl font-semibold text-gov-800 dark:text-gov-100">Authorized Access Only</h2>
                            <p className="text-xs text-gov-500 dark:text-gov-400 mt-1">Please enter your government email</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded flex items-center gap-2 text-sm">
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
                        
                        <div className="mt-4 text-xs text-center text-gov-400 dark:text-gov-500">
                            <p>Restricted System. All activities are monitored and logged.</p>
                        </div>
                    </form>
                );

            case 'PIN':
                return (
                    <form onSubmit={handlePinSubmit} className="space-y-6">
                        <div className="text-center mb-6">
                            <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                                <Lock size={24} />
                            </div>
                            <h2 className="text-xl font-semibold text-gov-800 dark:text-gov-100">Enter Security PIN</h2>
                            <p className="text-xs text-gov-500 dark:text-gov-400 mt-1">
                                {tempUser?.role === UserRole.ADMIN 
                                    ? 'Step 2/3: Identity Verification' 
                                    : 'Enter the 4-digit code generated by your authenticator.'}
                            </p>
                        </div>

                        {error && (
                            <div className="text-center text-red-600 dark:text-red-400 text-sm font-medium animate-pulse">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-center">
                            <input
                                type="password"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-40 text-center text-3xl tracking-[1em] font-mono py-2 border-b-2 border-gov-300 focus:border-blue-500 bg-transparent outline-none text-gov-900 dark:text-white dark:border-gov-600 transition-colors"
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
                        
                        <div className="text-center text-xs text-gov-400">
                            (Demo PIN: 1234)
                        </div>
                    </form>
                );

            case 'BIOMETRIC':
                return (
                    <div className="space-y-8 flex flex-col items-center text-center">
                         <div className="relative">
                            {isScanning && (
                                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
                            )}
                            <div 
                                onClick={!isScanning ? handleBiometricScan : undefined}
                                className={`w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                                    isScanning 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
                                    : 'border-gov-300 dark:border-gov-600 hover:border-blue-400 text-gov-400 hover:text-blue-500 hover:bg-gov-50 dark:hover:bg-gov-900'
                                }`}
                            >
                                <Fingerprint size={48} />
                            </div>
                         </div>

                         <div>
                             <h2 className="text-xl font-semibold text-gov-800 dark:text-gov-100">
                                 {isScanning ? 'Scanning...' : 'Biometric Auth Required'}
                             </h2>
                             <p className="text-xs text-gov-500 dark:text-gov-400 mt-2 max-w-xs mx-auto">
                                 {isScanning 
                                    ? 'Verifying biometric credentials against database...' 
                                    : 'Step 3/3: Admin privileges require mandatory biometric confirmation.'}
                             </p>
                         </div>

                         {error && (
                            <div className="text-red-600 dark:text-red-400 text-sm font-medium">
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
        <div className="min-h-screen bg-gov-50 dark:bg-gov-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
            <div className="mb-8 text-center">
                <div className="flex justify-center mb-4">
                    <Shield className="w-16 h-16 text-gov-800 dark:text-blue-500" />
                </div>
                <h1 className="text-3xl font-bold text-gov-900 dark:text-white tracking-tight">ChainGuard</h1>
                <p className="text-gov-500 dark:text-gov-400 mt-2">Digital Evidence Chain of Custody System</p>
            </div>

            <Card className="w-full max-w-md shadow-lg min-h-[400px] flex flex-col justify-center">
                {renderContent()}
            </Card>

            {/* Hint Box */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gov-500 dark:text-gov-400 max-w-2xl text-center opacity-60 hover:opacity-100 transition-opacity">
                <div className="p-2 border border-gov-200 dark:border-gov-800 rounded hover:bg-white dark:hover:bg-gov-900 transition-colors">
                    <strong>Admin</strong><br/>director.smith@agency.gov<br/>password123
                </div>
                <div className="p-2 border border-gov-200 dark:border-gov-800 rounded hover:bg-white dark:hover:bg-gov-900 transition-colors">
                    <strong>Police</strong><br/>j.doe@police.gov<br/>password123
                </div>
                <div className="p-2 border border-gov-200 dark:border-gov-800 rounded hover:bg-white dark:hover:bg-gov-900 transition-colors">
                    <strong>Forensics</strong><br/>b.wayne@lab.gov<br/>password123
                </div>
                <div className="p-2 border border-gov-200 dark:border-gov-800 rounded hover:bg-white dark:hover:bg-gov-900 transition-colors">
                    <strong>Legal</strong><br/>h.dent@da.gov<br/>password123
                </div>
            </div>
        </div>
    );
};
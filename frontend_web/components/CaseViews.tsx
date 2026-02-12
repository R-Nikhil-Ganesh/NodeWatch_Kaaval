
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Case, Evidence, IntegrityStatus, UserRole, CaseStatus, EvidenceType, LegalDocument, EvidenceClassification } from '../types';
import { Card, Button, Table, Badge, CaseStatusBadge, IntegrityBadge, Input } from './Common';
import { ArrowLeft, Upload, FileText, Lock, Eye, AlertTriangle, ShieldCheck, Download, History, File as FileIcon, Loader2, Link as LinkIcon, CheckSquare, Square, ChevronDown, Fingerprint, Shield, X, Send, Gavel, LayoutList, Scale, CheckCircle, Video, FileBadge } from 'lucide-react';

// --- Security Modal Component ---
const StatusChangeSecurityModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    targetStatus 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void; 
    targetStatus: CaseStatus | null 
}) => {
    const [stage, setStage] = useState<'PIN' | 'BIOMETRIC'>('PIN');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStage('PIN');
            setPin('');
            setError('');
            setIsScanning(false);
        }
    }, [isOpen]);

    if (!isOpen || !targetStatus) return null;

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === '1234') {
            setStage('BIOMETRIC');
            setError('');
        } else {
            setError('Invalid Admin PIN');
            setPin('');
        }
    };

    const handleBiometricScan = () => {
        setIsScanning(true);
        // Simulate hardware delay
        setTimeout(() => {
            setIsScanning(false);
            onConfirm();
        }, 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-sm overflow-hidden relative shadow-2xl border-2 border-gov-300 dark:border-gov-600">
                 <button onClick={onClose} className="absolute top-3 right-3 text-gov-400 hover:text-gov-700 dark:hover:text-white">
                    <X size={20} />
                </button>

                <div className="text-center mb-6 pt-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
                        <ShieldAlertIcon stage={stage} />
                    </div>
                    <h3 className="text-lg font-bold text-gov-900 dark:text-white">
                        {stage === 'PIN' ? 'Admin Authorization' : 'Biometric Confirm'}
                    </h3>
                    <p className="text-xs text-gov-500 px-4 mt-1">
                        Changing Case Status to <span className="font-bold text-gov-800 dark:text-white">{targetStatus}</span> requires Level 2 clearance.
                    </p>
                </div>

                {stage === 'PIN' && (
                    <form onSubmit={handlePinSubmit} className="space-y-4">
                        <div className="flex justify-center">
                            <input
                                type="password"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-32 text-center text-3xl tracking-[0.5em] font-mono py-2 border-b-2 border-gov-300 focus:border-red-500 bg-transparent outline-none text-gov-900 dark:text-white transition-colors"
                                placeholder="••••"
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-center text-xs text-red-600 font-bold animate-pulse">{error}</p>}
                        <Button className="w-full" type="submit">Verify PIN</Button>
                    </form>
                )}

                {stage === 'BIOMETRIC' && (
                    <div className="space-y-6 flex flex-col items-center">
                        <div className="relative">
                            {isScanning && (
                                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></div>
                            )}
                            <div 
                                onClick={!isScanning ? handleBiometricScan : undefined}
                                className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                                    isScanning 
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600' 
                                    : 'border-gov-300 dark:border-gov-600 hover:border-red-400 text-gov-400 hover:text-red-500 hover:bg-gov-50 dark:hover:bg-gov-900'
                                }`}
                            >
                                <Fingerprint size={40} />
                            </div>
                        </div>
                        <p className="text-xs text-gov-500 text-center">
                             {isScanning ? 'Verifying Identity...' : 'Touch sensor to confirm transaction signature.'}
                        </p>
                        <Button 
                            className="w-full" 
                            disabled={isScanning} 
                            onClick={!isScanning ? handleBiometricScan : undefined}
                            variant="danger"
                        >
                            {isScanning ? 'Processing...' : 'Authorize Change'}
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

const ShieldAlertIcon = ({ stage }: { stage: string }) => {
    if (stage === 'PIN') return <Lock size={24} />;
    return <Fingerprint size={24} />;
};


export const CaseDetail = ({ caseId, onBack }: { caseId: string, onBack: () => void }) => {
    const { cases, evidence, logs, documents, users, currentUser, addEvidence, addLog, updateCaseStatus, verifyEvidence, approveEvidence, toggleIntegrityHack, addDocument, transferCaseCustody } = useStore();
    const currentCase = cases.find(c => c.caseId === caseId);
    
    // View State
    const [activeTab, setActiveTab] = useState<'evidence' | 'charges'>('evidence');

    // Derived Data
    const rawCaseEvidence = evidence.filter(e => e.caseId === caseId);
    // Constraint: Legal can ONLY see approved evidence
    const isLegal = currentUser.role === UserRole.LEGAL;
    const caseEvidence = isLegal ? rawCaseEvidence.filter(e => e.approvedForLegal) : rawCaseEvidence;
    const verifiedEvidence = caseEvidence.filter(e => e.integrityStatus === IntegrityStatus.VERIFIED);
    const caseLogs = logs.filter(l => l.caseId === caseId || rawCaseEvidence.some(e => e.evidenceId === l.evidenceId));
    const caseDocuments = documents.filter(d => d.caseId === caseId);
    
    // Custody Logic: Police-only
    const hasCustody = (
        (currentCase?.currentCustodian === currentUser.name) ||
        (currentCase?.currentCustodian?.startsWith?.("Police") ?? false)
    ) && currentUser.role === UserRole.POLICE;

    // Upload Modal State
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [evidenceNotes, setEvidenceNotes] = useState('');
    const [linkedEvidenceIds, setLinkedEvidenceIds] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    // New Fields for Primary/Secondary
    const [sourceHash, setSourceHash] = useState('');
    const [liftingVideo, setLiftingVideo] = useState<File | null>(null);
    
    // Charge Sheet Modal State
    const [chargeSheetModalOpen, setChargeSheetModalOpen] = useState(false);
    const [chargeData, setChargeData] = useState({ accused: '', charges: '', details: '' });
    const [chargeEvidenceIds, setChargeEvidenceIds] = useState<string[]>([]);

    // Transfer Custody Modal State
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [transferTarget, setTransferTarget] = useState({ role: UserRole.POLICE, userId: '', notes: '' });

    // Audit & Status Modal State
    const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null); 
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<CaseStatus | null>(null);

    if (!currentCase) return <div>Case not found</div>;

    // Permissions
    const canUpload = currentUser.role === UserRole.POLICE && hasCustody;
    const canApprove = currentUser.role === UserRole.ADMIN;
    const canVerify = currentUser.role === UserRole.FORENSICS || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.LEGAL;
    const canFileChargeSheet = currentUser.role === UserRole.POLICE && hasCustody;
    const canTransferCustody = currentUser.role === UserRole.POLICE && hasCustody;
    
    const handleToggleLink = (id: string) => {
        setLinkedEvidenceIds(prev => 
            prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
        );
    };

    const handleToggleChargeEvidence = (id: string) => {
        setChargeEvidenceIds(prev => 
            prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
        );
    };

    // --- Status Change Handler ---
    const handleStatusDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as CaseStatus;
        if (newStatus !== currentCase.status) {
            setPendingStatus(newStatus);
            setStatusModalOpen(true);
        }
    };

    const confirmStatusChange = () => {
        if (pendingStatus) {
            updateCaseStatus(caseId, pendingStatus);
            setStatusModalOpen(false);
            setPendingStatus(null);
        }
    };

    // --- Charge Sheet Handler ---
    const handleSubmitChargeSheet = () => {
        if (!chargeData.accused || !chargeData.charges) return;

        const newDoc: LegalDocument = {
            docId: `CS-${Date.now().toString().slice(-6)}`,
            caseId: caseId,
            title: `Charge Sheet: ${chargeData.accused}`,
            type: 'CHARGE_SHEET',
            description: `Charges: ${chargeData.charges}\nDetails: ${chargeData.details}\nSupporting Evidence Count: ${chargeEvidenceIds.length}`,
            uploadedBy: currentUser.id,
            timestamp: new Date().toISOString(),
            linkedEvidenceIds: chargeEvidenceIds
        };
        
        addDocument(newDoc);
        setChargeSheetModalOpen(false);
        setChargeData({ accused: '', charges: '', details: '' });
        setChargeEvidenceIds([]);
    };

    // --- Transfer Custody Handler ---
    const handleTransferCustody = () => {
        if (!transferTarget.role) return;
        
        const targetId = transferTarget.userId || `${transferTarget.role} Department`;
        
        transferCaseCustody(caseId, targetId, transferTarget.role, transferTarget.notes);
        setTransferModalOpen(false);
        setTransferTarget({ role: UserRole.POLICE, userId: '', notes: '' });
    };

    const handleUpload = () => {
        if (!selectedFile) return;
        
        const typeStr = selectedFile.type.includes('image') ? EvidenceType.IMAGE : 
                        selectedFile.type.includes('pdf') ? EvidenceType.PDF : EvidenceType.WORD;

        if (currentUser.role === UserRole.POLICE && typeStr !== EvidenceType.IMAGE) {
            alert("Police can only upload images.");
            return;
        }

        setIsUploading(true);

        const finalizeUpload = (locationStr: string) => {
            const newEvidence: Evidence = {
                evidenceId: `EV-${Date.now().toString().slice(-6)}`,
                caseId: caseId,
                type: typeStr,
                fileName: selectedFile.name,
                uploadedBy: currentUser.id,
                role: currentUser.role,
                timestamp: new Date().toISOString(),
                location: locationStr,
                fileHash: `0x${Math.random().toString(16).slice(2)}...`,
                metadataHash: `0x${Math.random().toString(16).slice(2)}...`,
                custodian: 'Police Evidence Room',
                integrityStatus: IntegrityStatus.NOT_CHECKED,
                approvedForLegal: false,
                visibility: {
                    isRestricted: false,
                    allowedRoles: [],
                    allowedDesignations: [],
                    allowedUserIds: []
                },
                notes: evidenceNotes,
                linkedEvidenceIds: linkedEvidenceIds,
                classification: EvidenceClassification.SECONDARY,
                sourceHash: sourceHash || undefined,
                liftingVideo: liftingVideo ? liftingVideo.name : undefined,
                liftingVideoHash: liftingVideo ? `0x${Math.random().toString(16).slice(2)}...` : undefined
            };
    
            addEvidence(newEvidence);
            setUploadModalOpen(false);
            setSelectedFile(null);
            setEvidenceNotes('');
            setLinkedEvidenceIds([]);
            setSourceHash('');
            setLiftingVideo(null);
            setIsUploading(false);
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    finalizeUpload(`GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    const proceed = confirm("Could not acquire live location. Upload without precise GPS?");
                    if (proceed) {
                        finalizeUpload("GPS: Unavailable (Signal Lost/Denied)");
                    } else {
                        setIsUploading(false);
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
            finalizeUpload("GPS: Not Supported");
        }
    };

    const handleViewEvidence = (e: Evidence) => {
        if (currentUser.role === UserRole.LEGAL && !e.approvedForLegal) {
            alert("Evidence not approved for Legal review.");
            addLog({
                evidenceId: e.evidenceId,
                caseId: e.caseId,
                accessedBy: currentUser.id,
                role: currentUser.role,
                action: 'VIEW',
                details: 'Unauthorized view attempt blocked'
            });
            return;
        }
        
        addLog({
             evidenceId: e.evidenceId,
             caseId: e.caseId,
             accessedBy: currentUser.id,
             role: currentUser.role,
             action: 'VIEW',
             details: `Viewed evidence ${e.fileName}`
        });

        alert(`Viewing ${e.fileName}\nHash: ${e.fileHash}\n\n(File content simulated)`);
    };

    const tableHeaders = isLegal 
        ? ['ID', 'File', 'Type', 'Class', 'Date', 'Integrity', 'Actions']
        : ['ID', 'File', 'Type', 'Class', 'Date', 'Integrity', 'Status', 'Actions'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={onBack}><ArrowLeft size={16} /> Back</Button>
                    <div>
                        <h2 className="text-2xl font-bold text-gov-900 dark:text-white">{currentCase.caseId}: {currentCase.title}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <CaseStatusBadge status={currentCase.status} />
                            <span className="text-sm text-gov-500 dark:text-gov-400">Created by {currentCase.createdBy} on {new Date(currentCase.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    {currentUser.role === UserRole.ADMIN && (
                        <div className="flex items-center gap-2 bg-gov-100 dark:bg-gov-800 p-1.5 rounded-lg border border-gov-200 dark:border-gov-700 mr-2">
                            <span className="text-[10px] font-bold text-gov-500 uppercase px-2 tracking-wider flex items-center gap-1">
                                <Shield size={10} /> Admin Actions
                            </span>
                            <div className="relative">
                                <select 
                                    value={currentCase.status}
                                    onChange={handleStatusDropdownChange}
                                    className="appearance-none pl-3 pr-8 py-1.5 text-sm font-medium bg-white dark:bg-gov-900 border border-gov-300 dark:border-gov-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gov-900 dark:text-white cursor-pointer"
                                >
                                    {Object.values(CaseStatus).map((status) => (
                                        <option key={status} value={status}>
                                            {status.replace(/_/g, ' ')}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gov-400 pointer-events-none" />
                            </div>
                        </div>
                    )}
                    
                    {!hasCustody && currentUser.role === UserRole.POLICE && (
                         <div className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-bold rounded border border-yellow-200 dark:border-yellow-800 flex items-center gap-1">
                             <Lock size={12} /> View Only (No Custody)
                         </div>
                    )}

                    {canTransferCustody && (
                         <Button variant="secondary" onClick={() => setTransferModalOpen(true)}>
                            <Send size={16} /> Transfer Custody
                        </Button>
                    )}

                    {canUpload && (
                        <Button onClick={() => setUploadModalOpen(true)}><Upload size={16} /> Upload Evidence</Button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-gov-200 dark:border-gov-700 space-x-6">
                <button
                    onClick={() => setActiveTab('evidence')}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'evidence'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-gov-500 hover:text-gov-700 dark:text-gov-400 dark:hover:text-gov-200'
                    }`}
                >
                    <LayoutList size={16} /> Evidence Chain ({caseEvidence.length})
                </button>
                {currentUser.role === UserRole.POLICE && (
                    <button
                        onClick={() => setActiveTab('charges')}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === 'charges'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                : 'border-transparent text-gov-500 hover:text-gov-700 dark:text-gov-400 dark:hover:text-gov-200'
                        }`}
                    >
                        <Gavel size={16} /> Charge Sheets ({caseDocuments.filter(d => d.type === 'CHARGE_SHEET').length})
                    </button>
                )}
            </div>

            {/* Main Content Area */}
            {activeTab === 'evidence' ? (
                <Card title="Evidence Ledger">
                    <Table headers={tableHeaders}>
                        {caseEvidence.map(e => (
                            <tr key={e.evidenceId} className={`${e.integrityStatus === IntegrityStatus.COMPROMISED ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-gov-50 dark:hover:bg-gov-700/50'}`}>
                                <td className="px-6 py-4 text-xs font-mono text-gov-600 dark:text-gov-300">{e.evidenceId}</td>
                                <td className="px-6 py-4 text-sm font-medium">
                                    <div className="flex items-center gap-2 text-gov-900 dark:text-gov-100">
                                        <FileIcon size={14} className="text-gov-400" /> {e.fileName}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gov-500 dark:text-gov-400">{e.type}</td>
                                
                                <td className="px-6 py-4 text-sm">
                                    <Badge color={e.classification === EvidenceClassification.PRIMARY ? 'green' : 'yellow'}>
                                        {e.classification}
                                    </Badge>
                                </td>

                                <td className="px-6 py-4 text-sm text-gov-500 dark:text-gov-400">{new Date(e.timestamp).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <IntegrityBadge status={e.integrityStatus} />
                                    {e.integrityStatus === IntegrityStatus.COMPROMISED && (
                                        <div className="text-xs text-red-600 dark:text-red-400 font-bold mt-1">HASH MISMATCH</div>
                                    )}
                                </td>
                                {!isLegal && (
                                    <td className="px-6 py-4">
                                        {e.approvedForLegal ? (
                                            <Badge color="green">Legal Approved</Badge>
                                        ) : (
                                            <Badge color="gray">Restricted</Badge>
                                        )}
                                    </td>
                                )}
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <button onClick={() => handleViewEvidence(e)} title="View" className="text-gov-600 hover:text-blue-600 dark:text-gov-400 dark:hover:text-blue-400"><Eye size={16}/></button>
                                    
                                    {canVerify && (
                                        <button onClick={() => verifyEvidence(e.evidenceId)} title="Verify Integrity" className="text-gov-600 hover:text-green-600 dark:text-gov-400 dark:hover:text-green-400"><ShieldCheck size={16}/></button>
                                    )}

                                    {canApprove && !e.approvedForLegal && (
                                        <button 
                                            onClick={() => approveEvidence(e.evidenceId)} 
                                            title={e.classification === EvidenceClassification.SECONDARY && !e.section63Certificate ? "Secondary Evidence requires Section 63 Cert" : "Approve for Legal"} 
                                            className={`transition-colors ${
                                                e.classification === EvidenceClassification.SECONDARY && !e.section63Certificate 
                                                ? 'text-gray-300 cursor-not-allowed' 
                                                : 'text-gov-600 hover:text-green-600 dark:text-gov-400 dark:hover:text-green-400'
                                            }`}
                                            disabled={e.classification === EvidenceClassification.SECONDARY && !e.section63Certificate}
                                        >
                                            <Lock size={16}/>
                                        </button>
                                    )}

                                    <button onClick={() => setSelectedEvidenceId(e.evidenceId)} title="View Logs" className="text-gov-600 hover:text-purple-600 dark:text-gov-400 dark:hover:text-purple-400"><History size={16}/></button>
                                    
                                    {currentUser.role === UserRole.ADMIN && (
                                        <button onClick={() => toggleIntegrityHack(e.evidenceId)} title="Simulate Tamper" className="text-red-300 hover:text-red-600"><AlertTriangle size={16}/></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </Table>
                </Card>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gov-500 dark:text-gov-400">Formal charges filed against accused persons in this case.</p>
                        {canFileChargeSheet && (
                            <Button onClick={() => setChargeSheetModalOpen(true)}>
                                <Gavel size={16} /> Create Charge Sheet
                            </Button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        {caseDocuments.filter(d => d.type === 'CHARGE_SHEET').length === 0 ? (
                            <div className="p-8 text-center bg-gov-50 dark:bg-gov-900/50 rounded-lg border border-gov-200 dark:border-gov-800 border-dashed">
                                <Scale className="w-12 h-12 text-gov-300 mx-auto mb-2" />
                                <p className="text-gov-500">No charge sheets filed.</p>
                            </div>
                        ) : (
                            caseDocuments.filter(d => d.type === 'CHARGE_SHEET').map(doc => (
                                <div key={doc.docId}>
                                    <Card className="hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-bold text-lg text-gov-900 dark:text-white">{doc.title}</h3>
                                                    <Badge color="red">FILED</Badge>
                                                </div>
                                                <p className="text-xs text-gov-500 font-mono mb-4">ID: {doc.docId} • Filed by {doc.uploadedBy}</p>
                                                
                                                <div className="bg-gov-50 dark:bg-gov-900 p-3 rounded-md border border-gov-100 dark:border-gov-800 text-sm whitespace-pre-line mb-4">
                                                    {doc.description}
                                                </div>

                                                {doc.linkedEvidenceIds && doc.linkedEvidenceIds.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-bold uppercase text-gov-500 mb-2">Attached Verified Evidence</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {doc.linkedEvidenceIds.map(eid => {
                                                                const ev = evidence.find(e => e.evidenceId === eid);
                                                                return (
                                                                    <span key={eid} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded border border-blue-100 dark:border-blue-800">
                                                                        <FileIcon size={10} />
                                                                        {ev ? ev.fileName : eid}
                                                                    </span>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right text-xs text-gov-400">
                                                {new Date(doc.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2">
                     <Card title="Chain of Custody Timeline">
                        <div className="relative border-l-2 border-gov-200 dark:border-gov-700 ml-3 space-y-6 py-2">
                            {caseLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log) => (
                                <div key={log.id} className="relative pl-8">
                                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-gov-800 ${
                                        log.action === 'COMPROMISED' ? 'bg-red-500' : 
                                        log.action === 'VERIFY' ? 'bg-green-500' : 
                                        log.action === 'TRANSFER_CUSTODY' ? 'bg-purple-500' :
                                        log.action === 'ISSUE_CERT' ? 'bg-pink-500' :
                                        'bg-blue-500'
                                    }`}></div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                                        <div>
                                            <p className="text-sm font-bold text-gov-800 dark:text-gov-100">{log.action.replace('_', ' ')}</p>
                                            <p className="text-sm text-gov-600 dark:text-gov-300">{log.details}</p>
                                            {log.evidenceId && <p className="text-xs text-gov-400 font-mono mt-1">Ref: {log.evidenceId}</p>}
                                        </div>
                                        <div className="text-right mt-1 sm:mt-0">
                                            <p className="text-xs font-medium text-gov-500 dark:text-gov-400">{new Date(log.timestamp).toLocaleDateString()}</p>
                                            <p className="text-xs text-gov-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                            <span className="text-xs font-bold text-gov-600 dark:text-gov-300 block mt-1">{log.accessedBy} ({log.role})</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </Card>
                 </div>
                 
                 <div>
                     <Card title="Case Metadata">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gov-400 uppercase font-bold">Current Status</label>
                                <div className="mt-1"><CaseStatusBadge status={currentCase.status}/></div>
                            </div>
                            <div>
                                <label className="text-xs text-gov-400 uppercase font-bold">Current Custodian</label>
                                <div className={`mt-1 flex items-center gap-2 p-2 rounded text-sm font-bold border ${hasCustody ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-100'}`}>
                                    {hasCustody ? <CheckCircle size={14} /> : <Shield size={14} />} 
                                    {currentCase.currentCustodian}
                                    {hasCustody && <span className="ml-auto text-[10px] uppercase bg-white/50 px-1 rounded">You</span>}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gov-400 uppercase font-bold">Investigator</label>
                                <p className="text-sm font-medium text-gov-900 dark:text-gov-100">{currentCase.createdBy}</p>
                            </div>
                             <div>
                                <label className="text-xs text-gov-400 uppercase font-bold">Forensics Lead</label>
                                <p className="text-sm font-medium text-gov-900 dark:text-gov-100">{currentCase.assignedToForensics || 'Unassigned'}</p>
                            </div>
                            <div className="pt-4 border-t border-gov-100 dark:border-gov-700">
                                <p className="text-xs text-gov-500 dark:text-gov-400 italic">{currentCase.description}</p>
                            </div>
                        </div>
                     </Card>
                 </div>
            </div>

            {chargeSheetModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                     <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" title="File Charge Sheet">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Input 
                                    label="Accused Name" 
                                    value={chargeData.accused}
                                    onChange={(e) => setChargeData({...chargeData, accused: e.target.value})}
                                    placeholder="Full name of suspect"
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Charges</label>
                                    <textarea 
                                        className="w-full px-3 py-2 border border-gov-300 rounded-md bg-white dark:bg-gov-900 dark:border-gov-600 dark:text-white focus:ring-blue-500"
                                        rows={3}
                                        value={chargeData.charges}
                                        onChange={(e) => setChargeData({...chargeData, charges: e.target.value})}
                                        placeholder="List sections of law..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Investigation Details</label>
                                    <textarea 
                                        className="w-full px-3 py-2 border border-gov-300 rounded-md bg-white dark:bg-gov-900 dark:border-gov-600 dark:text-white focus:ring-blue-500"
                                        rows={4}
                                        value={chargeData.details}
                                        onChange={(e) => setChargeData({...chargeData, details: e.target.value})}
                                        placeholder="Brief summary of findings..."
                                    />
                                </div>
                            </div>
                            
                            <div className="border-l border-gov-200 dark:border-gov-700 pl-6">
                                <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-2">Attach Verified Evidence</label>
                                <p className="text-xs text-gov-500 mb-3">Only integrity-verified assets can be attached to a charge sheet.</p>
                                
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                    {verifiedEvidence.length === 0 && (
                                        <p className="text-xs text-red-500 italic">No verified evidence available.</p>
                                    )}
                                    {verifiedEvidence.map(e => (
                                        <div 
                                            key={e.evidenceId}
                                            onClick={() => handleToggleChargeEvidence(e.evidenceId)}
                                            className={`p-2 rounded border cursor-pointer transition-colors ${
                                                chargeEvidenceIds.includes(e.evidenceId) 
                                                ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
                                                : 'bg-white border-gov-200 dark:bg-gov-800 dark:border-gov-700 hover:border-blue-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${chargeEvidenceIds.includes(e.evidenceId) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-400'}`}>
                                                    {chargeEvidenceIds.includes(e.evidenceId) && <CheckSquare size={12} />}
                                                </div>
                                                <span className="text-sm font-medium text-gov-900 dark:text-white truncate">{e.fileName}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-gov-500 ml-6">
                                                <span>{e.type}</span>
                                                <span className="font-mono">{e.evidenceId}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-right text-gov-400 mt-2">
                                    {chargeEvidenceIds.length} items selected
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-gov-100 dark:border-gov-800">
                            <Button variant="secondary" onClick={() => setChargeSheetModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmitChargeSheet} disabled={!chargeData.accused || !chargeData.charges}>
                                Sign & Submit Charge Sheet
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {transferModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md" title="Transfer Case Custody">
                        <div className="p-3 mb-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded border border-yellow-200 dark:border-yellow-800">
                            <strong>Warning:</strong> Transferring custody shifts legal responsibility. You will lose ability to add evidence or modify charge sheets.
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Transfer To</label>
                                <select 
                                    className="w-full px-3 py-2 border border-gov-300 rounded-md bg-white dark:bg-gov-900 dark:border-gov-600 dark:text-white"
                                    value={transferTarget.role}
                                    disabled
                                >
                                    <option value={UserRole.POLICE}>Police Department (Internal Transfer)</option>
                                </select>
                                <p className="text-xs text-gov-400 mt-1">Police can only transfer custody to other Police units or officers.</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Receiving Officer / Station</label>
                                <select 
                                    className="w-full px-3 py-2 border border-gov-300 rounded-md bg-white dark:bg-gov-900 dark:border-gov-600 dark:text-white"
                                    value={transferTarget.userId}
                                    onChange={(e) => setTransferTarget({...transferTarget, userId: e.target.value})}
                                >
                                    <option value="">-- Select Recipient --</option>
                                    <option value="Police Station 2">Police Station 2 (General)</option>
                                    <option value="Cyber Crime Unit">Cyber Crime Unit</option>
                                    {users.filter(u => u.role === UserRole.POLICE && u.id !== currentUser.id).map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.designation})</option>
                                    ))}
                                </select>
                            </div>

                             <div>
                                <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Transfer Notes</label>
                                <textarea 
                                    className="w-full px-3 py-2 border border-gov-300 rounded-md bg-white dark:bg-gov-900 dark:border-gov-600 dark:text-white focus:ring-blue-500"
                                    rows={2}
                                    value={transferTarget.notes}
                                    onChange={(e) => setTransferTarget({...transferTarget, notes: e.target.value})}
                                    placeholder="Reason for transfer, special instructions..."
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setTransferModalOpen(false)}>Cancel</Button>
                            <Button variant="danger" onClick={handleTransferCustody} disabled={!transferTarget.userId}>
                                Sign & Transfer Custody
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {uploadModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" title="Upload New Evidence">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Select File</label>
                            <input 
                                type="file" 
                                onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                className="w-full text-sm text-gov-500 dark:text-gov-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300 dark:hover:file:bg-blue-900/50"
                                accept={currentUser.role === UserRole.POLICE ? "image/*" : ".pdf,.doc,.docx,image/*"}
                            />
                            {currentUser.role === UserRole.POLICE && <p className="text-xs text-gov-500 dark:text-gov-400 mt-1">Police restricted to Image uploads only.</p>}
                        </div>

                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Primary Evidence Requirements</h4>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">Include these fields to mark evidence as PRIMARY. Otherwise, it will be classified as SECONDARY.</p>
                            
                            <div className="space-y-3">
                                <Input 
                                    label="Source Hash (Pre-Lifting)"
                                    value={sourceHash}
                                    onChange={(e) => setSourceHash(e.target.value)}
                                    placeholder="e.g. 0x..."
                                    className="bg-white"
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-1">Lifting Video</label>
                                    <input 
                                        type="file" 
                                        accept="video/*"
                                        onChange={(e) => setLiftingVideo(e.target.files ? e.target.files[0] : null)}
                                        className="w-full text-xs text-gov-500 dark:text-gov-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-200 file:text-blue-800"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="mb-4">
                             <Input 
                                label="Notes / Description" 
                                value={evidenceNotes} 
                                onChange={e => setEvidenceNotes(e.target.value)} 
                                placeholder="Describe location, condition, etc."
                            />
                        </div>

                        {caseEvidence.length > 0 && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gov-700 dark:text-gov-300 mb-2">Link to Related Evidence</label>
                                <div className="border border-gov-300 dark:border-gov-600 rounded-md max-h-40 overflow-y-auto bg-gov-50 dark:bg-gov-900/50">
                                    {caseEvidence.map(e => (
                                        <div 
                                            key={e.evidenceId} 
                                            onClick={() => handleToggleLink(e.evidenceId)}
                                            className="flex items-center p-2 hover:bg-gov-100 dark:hover:bg-gov-800 cursor-pointer border-b border-gov-200 dark:border-gov-700 last:border-0"
                                        >
                                            <div className={`mr-3 ${linkedEvidenceIds.includes(e.evidenceId) ? 'text-blue-600 dark:text-blue-400' : 'text-gov-400'}`}>
                                                {linkedEvidenceIds.includes(e.evidenceId) ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gov-900 dark:text-gov-100">{e.fileName}</p>
                                                <p className="text-xs text-gov-500 font-mono">{e.evidenceId}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gov-500 dark:text-gov-400 mt-1">Select items to establish a direct chain of connection on the Pinboard.</p>
                            </div>
                        )}

                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-200 mb-4">
                            <strong>Note:</strong> File content is hashed client-side. Live location coordinates will be attached.
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => !isUploading && setUploadModalOpen(false)} disabled={isUploading}>Cancel</Button>
                            <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                                {isUploading ? <><Loader2 className="animate-spin" size={16}/> Acquiring Location...</> : "Sign & Upload"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
             
            {selectedEvidenceId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                     <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto" title={`Audit History: ${selectedEvidenceId}`}>
                        <Table headers={['Time', 'User', 'Action', 'Details']}>
                            {logs.filter(l => l.evidenceId === selectedEvidenceId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(l => (
                                <tr key={l.id}>
                                    <td className="px-4 py-2 text-xs text-gov-500 dark:text-gov-400">{new Date(l.timestamp).toLocaleString()}</td>
                                    <td className="px-4 py-2 text-xs font-medium text-gov-900 dark:text-gov-100">{l.accessedBy} ({l.role})</td>
                                    <td className="px-4 py-2 text-xs text-gov-800 dark:text-gov-200">{l.action}</td>
                                    <td className="px-4 py-2 text-xs text-gov-600 dark:text-gov-300">{l.details}</td>
                                </tr>
                            ))}
                        </Table>
                        <div className="mt-4 flex justify-end">
                            <Button onClick={() => setSelectedEvidenceId(null)}>Close Audit</Button>
                        </div>
                     </Card>
                </div>
            )}

            <StatusChangeSecurityModal 
                isOpen={statusModalOpen} 
                onClose={() => setStatusModalOpen(false)} 
                onConfirm={confirmStatusChange}
                targetStatus={pendingStatus}
            />
        </div>
    );
};

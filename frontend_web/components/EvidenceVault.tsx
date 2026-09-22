
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store';
import { Card, Button, IntegrityBadge, Badge, Input } from './Common';
import { Evidence, UserRole, IntegrityStatus, EvidenceType, DESIGNATIONS, EvidenceVisibility, EvidenceClassification, Case } from '../types';
import { computeSha256 } from '../utils/hashing';
import { verifyEvidenceIntegrity } from '../services/verificationService';
import type { VerificationResult } from '../services/types';
import { 
    Eye, Lock, Unlock, FileText, Image as ImageIcon, Box, AlertTriangle, Loader2, 
    X, CheckCircle, Shield, Settings, Search, ArrowUpDown, LayoutGrid, Network, 
    Video, FileBadge, Hash, XCircle, Upload, FileUp, Copy, Check, MapPin, 
    CheckSquare, Square, Music, Sparkles 
} from 'lucide-react';

const AccessControlModal = ({ 
    evidence, 
    onClose, 
    onSave 
}: { 
    evidence: Evidence, 
    onClose: () => void, 
    onSave: (v: EvidenceVisibility) => void 
}) => {
    const { users } = useStore();
    const [visibility, setVisibility] = useState<EvidenceVisibility>(evidence.visibility);

    const toggleRole = (role: UserRole) => {
        const current = visibility.allowedRoles;
        if (current.includes(role)) {
            setVisibility({ ...visibility, allowedRoles: current.filter(r => r !== role) });
        } else {
            setVisibility({ ...visibility, allowedRoles: [...current, role] });
        }
    };

    const toggleDesignation = (designation: string) => {
        const current = visibility.allowedDesignations;
        if (current.includes(designation)) {
            setVisibility({ ...visibility, allowedDesignations: current.filter(d => d !== designation) });
        } else {
            setVisibility({ ...visibility, allowedDesignations: [...current, designation] });
        }
    };

    const toggleUser = (userId: string) => {
        const current = visibility.allowedUserIds;
        if (current.includes(userId)) {
            setVisibility({ ...visibility, allowedUserIds: current.filter(id => id !== userId) });
        } else {
            setVisibility({ ...visibility, allowedUserIds: [...current, userId] });
        }
    };

    return (
        <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-line-200 bg-paper-50">
                    <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-ink-700" />
                        Access Control: {evidence.fileName}
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-ink-500 hover:text-ink-700" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-paper-100 rounded-sm">
                        <div>
                            <h4 className="font-bold text-navy-900">Restricted Access Mode</h4>
                            <p className="text-xs text-ink-500">
                                If enabled, only Admins and selected entities can view this evidence.
                            </p>
                        </div>
                        <button
                            onClick={() => setVisibility({ ...visibility, isRestricted: !visibility.isRestricted })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-navy-500 focus:ring-offset-2 ${visibility.isRestricted ? 'bg-navy-700' : 'bg-line-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${visibility.isRestricted ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {visibility.isRestricted && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">

                            <div>
                                <h4 className="text-sm font-bold text-ink-700 mb-2 uppercase tracking-wide">Allowed Roles</h4>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(UserRole).filter(r => r !== UserRole.ADMIN).map(role => (
                                        <button
                                            key={role}
                                            onClick={() => toggleRole(role)}
                                            className={`px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors ${
                                                visibility.allowedRoles.includes(role)
                                                ? 'bg-navy-50 border-navy-100 text-navy-800'
                                                : 'bg-white border-line-300 text-ink-700 hover:bg-paper-50'
                                            }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-ink-700 mb-2 uppercase tracking-wide">Allowed Designations</h4>
                                <div className="space-y-3">
                                    {Object.entries(DESIGNATIONS).filter(([key]) => key !== UserRole.ADMIN).map(([role, list]) => (
                                        <div key={role} className="bg-paper-50 p-3 rounded-sm border border-line-200">
                                            <p className="text-xs font-bold text-ink-500 mb-2">{role}</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {list.map(des => (
                                                    <label key={des} className="flex items-center space-x-2 text-xs cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={visibility.allowedDesignations.includes(des)}
                                                            onChange={() => toggleDesignation(des)}
                                                            className="rounded border-line-300 text-navy-700 focus:ring-navy-500"
                                                        />
                                                        <span className="text-ink-700">{des}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-ink-700 mb-2 uppercase tracking-wide">Specific Personnel</h4>
                                <div className="border border-line-200 rounded-sm max-h-40 overflow-y-auto">
                                    {users.filter(u => u.role !== UserRole.ADMIN).map(u => (
                                        <label key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-paper-50 cursor-pointer border-b border-line-200 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={visibility.allowedUserIds.includes(u.id)}
                                                    onChange={() => toggleUser(u.id)}
                                                    className="rounded border-line-300 text-navy-700 focus:ring-navy-500"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-navy-900">{u.name}</p>
                                                    <p className="text-[10px] text-ink-500">{u.designation} • {u.role}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-mono text-ink-300">{u.id}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-paper-50 border-t border-line-200 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(visibility)}>Save Access Controls</Button>
                </div>
            </div>
        </div>
    );
};

interface Position { x: number; y: number; }
const Pinboard = ({ evidence, onView }: { evidence: Evidence[], onView: (e: Evidence) => void }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [positions, setPositions] = useState<Record<string, Position>>({});
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 120;

    useEffect(() => {
        if (!containerRef.current) return;
        
        setPositions(prev => {
            const newPos = { ...prev };
            const containerW = containerRef.current?.clientWidth || 800;
            const containerH = containerRef.current?.clientHeight || 600;
            const centerX = containerW / 2;
            const centerY = containerH / 2;
            const radius = Math.min(containerW, containerH) * 0.35;

            evidence.forEach((ev, index) => {
                if (!newPos[ev.evidenceId]) {
                    const angle = (index / evidence.length) * 2 * Math.PI;
                    newPos[ev.evidenceId] = {
                        x: centerX + radius * Math.cos(angle) - NODE_WIDTH / 2,
                        y: centerY + radius * Math.sin(angle) - NODE_HEIGHT / 2
                    };
                }
            });
            return newPos;
        });
    }, [evidence.length, evidence]);

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        const pos = positions[id];
        if (pos) {
            setDraggingId(id);
            setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
        }
        e.stopPropagation();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingId && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            
            setPositions(prev => ({
                ...prev,
                [draggingId]: { x: newX, y: newY }
            }));
        }
    };

    const handleMouseUp = () => {
        setDraggingId(null);
    };

    const connections = useMemo(() => {
        const lines: { start: string, end: string, key: string }[] = [];
        const processed = new Set<string>();

        evidence.forEach(ev => {
            if (ev.linkedEvidenceIds) {
                ev.linkedEvidenceIds.forEach(targetId => {
                    if (evidence.some(e => e.evidenceId === targetId)) {
                        const pair = [ev.evidenceId, targetId].sort().join('-');
                        if (!processed.has(pair)) {
                            lines.push({ start: ev.evidenceId, end: targetId, key: pair });
                            processed.add(pair);
                        }
                    }
                });
            }
        });
        return lines;
    }, [evidence]);

    return (
        <div 
            ref={containerRef}
            className="w-full h-[650px] bg-navy-950 relative rounded-sm overflow-hidden border border-navy-800 shadow-inner cursor-default select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
                backgroundImage: 'radial-gradient(#0E2F58 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}
        >
             <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {connections.map(({ start, end, key }) => {
                    const posStart = positions[start];
                    const posEnd = positions[end];
                    if (!posStart || !posEnd) return null;

                    return (
                        <line 
                            key={key}
                            x1={posStart.x + NODE_WIDTH / 2}
                            y1={posStart.y + NODE_HEIGHT / 2}
                            x2={posEnd.x + NODE_WIDTH / 2}
                            y2={posEnd.y + NODE_HEIGHT / 2}
                            stroke="#F1A055"
                            strokeWidth="2"
                            strokeOpacity="0.6"
                            strokeDasharray="5,5"
                        />
                    );
                })}
            </svg>
            
             {evidence.map(ev => {
                const pos = positions[ev.evidenceId];
                if (!pos) return null;

                return (
                    <div
                        key={ev.evidenceId}
                        style={{ 
                            transform: `translate(${pos.x}px, ${pos.y}px)`,
                            width: NODE_WIDTH
                        }}
                        className={`absolute flex flex-col bg-navy-900 border-2 rounded-sm shadow-xl hover:shadow-2xl transition-shadow ${
                            ev.evidenceId === draggingId ? 'z-20 border-saffron-400 cursor-grabbing' : 'z-10 border-navy-800 hover:border-navy-600 cursor-grab'
                        }`}
                        onMouseDown={(e) => handleMouseDown(e, ev.evidenceId)}
                    >
                        <div className={`h-2 w-full rounded-t-sm mb-2 ${ev.classification === EvidenceClassification.PRIMARY ? 'bg-status-resolved' : 'bg-status-pending'}`}></div>

                        <div className="px-3 pb-3 flex flex-col h-full">
                            <div className="flex items-start justify-between mb-2">
                                <span className={`text-[10px] px-1.5 rounded-sm font-mono ${
                                    ev.type === EvidenceType.IMAGE ? 'bg-navy-800 text-navy-200' : 'bg-ashoka-700/50 text-ashoka-100'
                                }`}>
                                    {ev.type}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${
                                    ev.integrityStatus === IntegrityStatus.VERIFIED ? 'bg-status-resolved shadow-[0_0_5px_rgba(34,197,94,0.6)]' :
                                    ev.integrityStatus === IntegrityStatus.COMPROMISED ? 'bg-status-urgent animate-pulse' : 'bg-status-pending'
                                }`}></div>
                            </div>

                            <p className="text-white text-xs font-bold leading-tight line-clamp-2 mb-1 pointer-events-none">
                                {ev.fileName}
                            </p>
                            <p className="text-navy-300 text-[9px] font-mono mb-2 pointer-events-none">
                                {ev.evidenceId}
                            </p>

                            <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={() => onView(ev)}
                                className="mt-auto w-full py-1 text-[10px] font-medium bg-navy-800 hover:bg-saffron-600 text-navy-200 hover:text-white rounded-sm transition-colors"
                            >
                                Inspect
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const ClassificationDetailModal = ({
    evidence,
    onClose,
    onIssueCertClick,
    canIssueCert,
}: {
    evidence: Evidence;
    onClose: () => void;
    onIssueCertClick: (evidenceId: string) => void;
    canIssueCert: boolean;
}) => {
    const isPrimary = evidence.classification === EvidenceClassification.PRIMARY;
    return (
        <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg" title="Evidence Classification Details">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-navy-900">{evidence.fileName}</h4>
                        <p className="text-xs font-mono text-ink-500">{evidence.evidenceId}</p>
                    </div>
                    <Badge color={isPrimary ? 'green' : 'yellow'}>{evidence.classification}</Badge>
                </div>

                <p className="text-sm text-ink-700 mt-4">
                    {isPrimary
                        ? "This evidence meets all requirements to be considered PRIMARY and is admissible in court."
                        : "This evidence is SECONDARY. To be admissible, it requires a Section 63 Certificate from Forensics."}
                </p>

                <div className="mt-6 space-y-3">
                    <div className={`flex items-center justify-between p-3 rounded-sm border ${evidence.sourceHash ? 'bg-status-resolvedBg border-status-resolved/20' : 'bg-status-urgentBg border-status-urgent/20'}`}>
                        <div className="flex items-center gap-2">
                            <Hash size={16} className={evidence.sourceHash ? 'text-status-resolved' : 'text-status-urgent'} />
                            <span className="text-sm font-medium text-navy-900">Source Hash (at lifting)</span>
                        </div>
                        <span className="text-sm font-bold">{evidence.sourceHash ? 'PRESENT' : 'MISSING'}</span>
                    </div>
                    <div className={`flex items-center justify-between p-3 rounded-sm border ${evidence.liftingVideo ? 'bg-status-resolvedBg border-status-resolved/20' : 'bg-status-urgentBg border-status-urgent/20'}`}>
                        <div className="flex items-center gap-2">
                            <Video size={16} className={evidence.liftingVideo ? 'text-status-resolved' : 'text-status-urgent'} />
                            <span className="text-sm font-medium text-navy-900">Lifting Video</span>
                        </div>
                        <span className="text-sm font-bold">{evidence.liftingVideo ? 'PRESENT' : 'MISSING'}</span>
                    </div>
                    <div className={`flex items-center justify-between p-3 rounded-sm border ${evidence.section63Certificate ? 'bg-status-resolvedBg border-status-resolved/20' : 'bg-status-pendingBg border-status-pending/20'}`}>
                        <div className="flex items-center gap-2">
                            <FileBadge size={16} className={evidence.section63Certificate ? 'text-status-resolved' : 'text-status-pending'} />
                            <span className="text-sm font-medium text-navy-900">Section 63 Certificate</span>
                        </div>
                        <span className="text-sm font-bold">{evidence.section63Certificate ? 'ISSUED' : 'NOT ISSUED'}</span>
                    </div>
                </div>

                {canIssueCert && !isPrimary && !evidence.section63Certificate && (
                    <div className="mt-6 pt-4 border-t border-line-200">
                        <p className="text-xs text-center text-ink-500 mb-2">As a Forensics officer, you can issue a certificate for this evidence.</p>
                        <Button className="w-full" onClick={() => onIssueCertClick(evidence.evidenceId)}>
                            Issue Certificate
                        </Button>
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </Card>
        </div>
    );
};

interface UploadEvidenceModalProps {
    cases: Case[];
    initialCaseId: string;
    existingEvidence: Evidence[];
    onClose: () => void;
    onUploadSuccess: (caseId: string) => void;
}

const UploadEvidenceModal: React.FC<UploadEvidenceModalProps> = ({
    cases,
    initialCaseId,
    existingEvidence,
    onClose,
    onUploadSuccess,
}) => {
    const { currentUser, uploadEvidenceFile } = useStore();
    const [targetCaseId, setTargetCaseId] = useState(initialCaseId || (cases[0]?.caseId || ''));
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [evidenceName, setEvidenceName] = useState('');
    const [evidenceType, setEvidenceType] = useState<EvidenceType>(EvidenceType.IMAGE);
    const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
    const [isComputingHash, setIsComputingHash] = useState(false);
    const [computedFileHash, setComputedFileHash] = useState('');
    const [sourceHash, setSourceHash] = useState('');
    const [liftingVideo, setLiftingVideo] = useState<File | null>(null);
    const [liftingVideoHash, setLiftingVideoHash] = useState('');
    const [isComputingVideoHash, setIsComputingVideoHash] = useState(false);
    const [location, setLocation] = useState('Acquiring live location...');
    const [isAcquiringGps, setIsAcquiringGps] = useState(false);
    const [notes, setNotes] = useState('');
    const [linkedEvidenceIds, setLinkedEvidenceIds] = useState<string[]>([]);
    const [isRestricted, setIsRestricted] = useState(false);
    const [allowedRoles, setAllowedRoles] = useState<UserRole[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedHash, setCopiedHash] = useState(false);

    // Initial Geolocation fetch
    const fetchLocation = () => {
        if (!navigator.geolocation) {
            setLocation('Crime Scene (GPS Not Supported)');
            return;
        }
        setIsAcquiringGps(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setLocation(`GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                setIsAcquiringGps(false);
            },
            (err) => {
                console.warn('Geolocation acquisition warning:', err.message);
                setLocation('Crime Scene (GPS Denied/Timeout)');
                setIsAcquiringGps(false);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
    };

    useEffect(() => {
        fetchLocation();
    }, []);

    // Handle File Selection
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setEvidenceName(file.name.replace(/\.[^/.]+$/, ''));

        // Auto-detect EvidenceType from mime/extension
        const mime = file.type || '';
        let detectedType = EvidenceType.IMAGE;
        if (mime.startsWith('image/')) detectedType = EvidenceType.IMAGE;
        else if (mime.startsWith('video/')) detectedType = EvidenceType.VIDEO;
        else if (mime.startsWith('audio/')) detectedType = EvidenceType.AUDIO;
        else if (mime.includes('pdf')) detectedType = EvidenceType.PDF;
        else if (mime.includes('word') || /\.(doc|docx)$/i.test(file.name)) detectedType = EvidenceType.WORD;
        else if (/\.(raw|dd|img|e01|iso)$/i.test(file.name)) detectedType = EvidenceType.DISK_IMAGE;
        setEvidenceType(detectedType);

        // Generate Preview
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
            const url = URL.createObjectURL(file);
            setFilePreview(url);
        } else {
            setFilePreview(null);
        }

        // Live Cryptographic SHA-256 Hashing
        setIsComputingHash(true);
        try {
            const hash = await computeSha256(file);
            setComputedFileHash(hash);
        } catch (err) {
            console.error('Error computing SHA-256 hash:', err);
            setComputedFileHash('0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''));
        } finally {
            setIsComputingHash(false);
        }
    };

    // Handle Lifting Video Pick
    const handleLiftingVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const vidFile = e.target.files?.[0];
        if (!vidFile) {
            setLiftingVideo(null);
            setLiftingVideoHash('');
            return;
        }

        setLiftingVideo(vidFile);
        setIsComputingVideoHash(true);
        try {
            const vidHash = await computeSha256(vidFile);
            setLiftingVideoHash(vidHash);
        } catch (err) {
            console.error('Error computing lifting video hash:', err);
        } finally {
            setIsComputingVideoHash(false);
        }
    };

    // Copy file hash to source hash
    const handleCopyFileHashToSource = () => {
        if (computedFileHash) {
            setSourceHash(computedFileHash);
            setCopiedHash(true);
            setTimeout(() => setCopiedHash(false), 2000);
        }
    };

    // Toggle Pinboard Links
    const handleToggleLink = (id: string) => {
        setLinkedEvidenceIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Toggle Restricted Roles
    const toggleRole = (r: UserRole) => {
        setAllowedRoles(prev => 
            prev.includes(r) ? prev.filter(role => role !== r) : [...prev, r]
        );
    };

    // Classification Rule: PRIMARY only if sourceHash + liftingVideo present
    const isPrimary = Boolean(sourceHash && (liftingVideo || liftingVideoHash));

    const handleSubmit = async () => {
        if (!selectedFile || !targetCaseId || !currentUser) return;
        setIsSubmitting(true);

        try {
            const effectiveClassification = isPrimary ? EvidenceClassification.PRIMARY : EvidenceClassification.SECONDARY;

            // Uploads the real file bytes (stored in MinIO, hashed server-side)
            // instead of building an Evidence object whose `fileUrl` was a
            // browser-only blob: URL with no durable file behind it.
            const result = await uploadEvidenceFile({
                caseId: targetCaseId,
                file: selectedFile,
                name: evidenceName || selectedFile.name,
                type: evidenceType,
                location: location || 'Crime Scene',
                notes: notes || undefined,
                classification: effectiveClassification,
                riskLevel,
                sourceHash: sourceHash || undefined,
                liftingVideo: liftingVideo || undefined,
                linkedEvidenceIds,
                visibility: {
                    isRestricted,
                    allowedRoles: isRestricted ? allowedRoles : [],
                    allowedDesignations: [],
                    allowedUserIds: [],
                },
            });

            if (!result.ok) {
                alert(result.message || 'Evidence upload failed. Please try again.');
                return;
            }

            onUploadSuccess(targetCaseId);
        } catch (err) {
            console.error('Failed to upload evidence:', err);
            alert('An error occurred while uploading the evidence. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-navy-950/50 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-3xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-line-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-line-200 bg-paper-50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-sm bg-navy-50 text-navy-700 flex items-center justify-center">
                            <Upload className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-navy-900">Upload Digital Evidence to Vault</h3>
                            <p className="text-xs text-ink-500">Cryptographically hashed and enqueued for Hyperledger Fabric registration</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-ink-300 hover:text-ink-700 transition-colors">
                        <X size={22} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Target Case Selector */}
                    <div>
                        <label className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1">
                            Target Case File <span className="text-status-urgent">*</span>
                        </label>
                        <select
                            value={targetCaseId}
                            onChange={(e) => setTargetCaseId(e.target.value)}
                            className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white text-navy-900 text-sm focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                        >
                            {cases.map(c => (
                                <option key={c.caseId} value={c.caseId}>
                                    {c.caseId} — {c.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* File Dropzone & Pick */}
                    <div className="border-2 border-dashed border-line-300 rounded-sm p-5 text-center bg-paper-50/50 hover:border-navy-500 transition-colors">
                        {!selectedFile ? (
                            <label className="cursor-pointer flex flex-col items-center justify-center space-y-2 py-4">
                                <FileUp className="w-10 h-10 text-navy-500 animate-bounce" />
                                <p className="text-sm font-semibold text-ink-700">
                                    Click to select digital evidence file or drag and drop
                                </p>
                                <p className="text-xs text-ink-500">
                                    Images, Videos, Audio, PDFs, Documents, Forensic Disk Images
                                </p>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </label>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-white rounded-sm border border-line-200">
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="p-2 bg-navy-50 rounded-sm text-navy-700">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-navy-900 truncate max-w-sm">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-xs text-ink-500 font-mono">
                                                {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'binary/raw'}
                                            </p>
                                        </div>
                                    </div>
                                    <label className="cursor-pointer text-xs font-semibold text-navy-700 hover:text-navy-600">
                                        Change File
                                        <input type="file" className="hidden" onChange={handleFileChange} />
                                    </label>
                                </div>

                                {/* Live Image Preview if Image */}
                                {filePreview && selectedFile.type.startsWith('image/') && (
                                    <div className="flex justify-center bg-navy-950/20 p-2 rounded-sm border border-line-200">
                                        <img src={filePreview} alt="Preview" className="max-h-48 object-contain rounded-sm" />
                                    </div>
                                )}

                                {/* Cryptographic Fingerprint Badge */}
                                <div className="p-3 bg-navy-950 text-navy-100 rounded-sm text-left">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-status-resolved">
                                            <Shield size={13} />
                                            {isComputingHash ? 'Calculating SHA-256...' : 'Client-Side SHA-256 Hash'}
                                        </div>
                                        {computedFileHash && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(computedFileHash);
                                                    setCopiedHash(true);
                                                    setTimeout(() => setCopiedHash(false), 2000);
                                                }}
                                                className="text-navy-300 hover:text-white text-xs flex items-center gap-1"
                                            >
                                                {copiedHash ? <Check size={12} className="text-status-resolved" /> : <Copy size={12} />}
                                                {copiedHash ? 'Copied' : 'Copy'}
                                            </button>
                                        )}
                                    </div>
                                    <p className="font-mono text-xs break-all text-navy-300">
                                        {isComputingHash ? 'Hashing file bytes...' : computedFileHash}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Evidence Name & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1">
                                Artifact Title / Name <span className="text-status-urgent">*</span>
                            </label>
                            <input
                                type="text"
                                value={evidenceName}
                                onChange={(e) => setEvidenceName(e.target.value)}
                                placeholder="e.g. CCTV Recording Front Gate, Confiscated iPhone"
                                className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white text-navy-900 text-sm focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1">
                                Evidence Type
                            </label>
                            <select
                                value={evidenceType}
                                onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                                className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white text-navy-900 text-sm focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                            >
                                {Object.values(EvidenceType).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* BSA Section 63 Legal Classification Engine */}
                    <div className="p-4 bg-navy-50 rounded-sm border border-navy-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-navy-700" />
                                <h4 className="text-sm font-bold text-navy-900">
                                    Legal Classification (Bharatiya Sakshya Adhiniyam)
                                </h4>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide border ${
                                isPrimary
                                    ? 'bg-status-resolvedBg text-status-resolved border-status-resolved/30'
                                    : 'bg-status-pendingBg text-status-pending border-status-pending/30'
                            }`}>
                                {isPrimary ? 'PRIMARY EVIDENCE (Sec. 62 BSA)' : 'SECONDARY EVIDENCE (Sec. 63 BSA)'}
                            </span>
                        </div>

                        <p className="text-xs text-ink-700">
                            Under the BSA framework, evidence is classified as <strong>PRIMARY</strong> if both a pre-lifting Source Hash and an unbroken Lifting Video are provided. Otherwise, it is stored as <strong>SECONDARY</strong> and requires a Section 63 certificate for court admissibility.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Pre-Lifting Source Hash */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-ink-700">
                                        Source Hash (Pre-Lifting / Device Hash)
                                    </label>
                                    {computedFileHash && (
                                        <button
                                            type="button"
                                            onClick={handleCopyFileHashToSource}
                                            className="text-[11px] text-navy-700 hover:underline"
                                        >
                                            Use File Hash
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={sourceHash}
                                    onChange={(e) => setSourceHash(e.target.value)}
                                    placeholder="e.g. SHA-256 hash before lifting"
                                    className="w-full px-3 py-2 font-mono text-xs border border-line-300 rounded-sm bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                                />
                            </div>

                            {/* Lifting Video Input */}
                            <div>
                                <label className="block text-xs font-bold text-ink-700 mb-1">
                                    Lifting Video Recording
                                </label>
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleLiftingVideoChange}
                                    className="w-full text-xs text-ink-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100"
                                />
                                {liftingVideo && (
                                    <p className="text-[11px] text-ink-500 font-mono mt-1 truncate">
                                        {isComputingVideoHash ? 'Computing video SHA-256...' : `Hash: ${liftingVideoHash || 'Ready'}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Seizure Location & Risk Level */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider flex items-center gap-1">
                                    <MapPin size={12} className="text-status-urgent" /> Seizure Location / Geo-Tag
                                </label>
                                <button
                                    type="button"
                                    onClick={fetchLocation}
                                    disabled={isAcquiringGps}
                                    className="text-[11px] text-navy-700 hover:underline flex items-center gap-1"
                                >
                                    {isAcquiringGps ? <Loader2 size={11} className="animate-spin" /> : null}
                                    {isAcquiringGps ? 'Fetching GPS...' : 'Refresh GPS'}
                                </button>
                            </div>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="GPS coordinates or scene address"
                                className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white text-navy-900 text-sm focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1">
                                Operational Risk Level
                            </label>
                            <select
                                value={riskLevel}
                                onChange={(e) => setRiskLevel(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                                className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white text-navy-900 text-sm focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                            >
                                <option value="LOW">LOW — Standard Storage</option>
                                <option value="MEDIUM">MEDIUM — Sensitive Artifact</option>
                                <option value="HIGH">HIGH — Critical National Security</option>
                            </select>
                        </div>
                    </div>

                    {/* Operational Notes */}
                    <div>
                        <label className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1">
                            Seizure Notes & Device Details
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Physical condition, device IMEI / serial numbers, package bag seal numbers, seizing officer remarks..."
                            className="w-full px-3 py-2 border border-line-300 rounded-sm bg-white text-navy-900 text-sm focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                        />
                    </div>

                    {/* Link to Existing Evidence in Case */}
                    {existingEvidence.length > 0 && (
                        <div>
                            <label className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1">
                                Link to Related Case Evidence (Pinboard Connections)
                            </label>
                            <div className="border border-line-200 rounded-sm max-h-36 overflow-y-auto bg-paper-50/50 p-1">
                                {existingEvidence.map(ev => (
                                    <div
                                        key={ev.evidenceId}
                                        onClick={() => handleToggleLink(ev.evidenceId)}
                                        className="flex items-center p-2 hover:bg-paper-100 rounded-sm cursor-pointer transition-colors"
                                    >
                                        <div className={`mr-2.5 ${linkedEvidenceIds.includes(ev.evidenceId) ? 'text-navy-700' : 'text-ink-300'}`}>
                                            {linkedEvidenceIds.includes(ev.evidenceId) ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-navy-900 truncate">{ev.name || ev.fileName}</p>
                                            <p className="text-[10px] text-ink-500 font-mono">{ev.evidenceId} • {ev.type}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Access Control Options */}
                    <div className="p-4 bg-paper-100 rounded-sm flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h5 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                                    Restricted Access Mode
                                </h5>
                                <p className="text-xs text-ink-500">
                                    Limit artifact viewing strictly to authorized roles
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsRestricted(!isRestricted)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isRestricted ? 'bg-navy-700' : 'bg-line-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isRestricted ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {isRestricted && (
                            <div className="pt-2 border-t border-line-200">
                                <p className="text-[11px] font-bold text-ink-700 mb-1.5 uppercase">
                                    Permitted Roles:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(UserRole).filter(r => r !== UserRole.ADMIN).map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => toggleRole(role)}
                                            className={`px-3 py-1 rounded-sm text-xs font-medium border transition-colors ${
                                                allowedRoles.includes(role)
                                                    ? 'bg-navy-50 border-navy-100 text-navy-800'
                                                    : 'bg-white border-line-300 text-ink-700'
                                            }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-paper-50 border-t border-line-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-ink-500 flex items-center gap-1.5">
                        <Lock size={13} className="text-navy-500" />
                        <span>Signatory: <strong>{currentUser?.name}</strong> ({currentUser?.role})</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={!selectedFile || isComputingHash || isSubmitting}
                            className="flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="animate-spin" size={16} /> Registering on Ledger...</>
                            ) : (
                                <><Upload size={16} /> Sign & Upload to Ledger</>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const EvidenceVault = () => {
    const { cases, evidence, currentUser, addLog, updateEvidenceVisibility, issueSection63Certificate } = useStore();
    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [viewingEvidence, setViewingEvidence] = useState<Evidence | null>(null);
    const [classDetailEvidence, setClassDetailEvidence] = useState<Evidence | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationComplete, setVerificationComplete] = useState(false);
    const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
    const [managingAccess, setManagingAccess] = useState<Evidence | null>(null);

    const [certModalOpen, setCertModalOpen] = useState(false);
    const [certEvidenceId, setCertEvidenceId] = useState<string | null>(null);
    const [certFile, setCertFile] = useState<File | null>(null);

    const [viewMode, setViewMode] = useState<'grid' | 'pinboard'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{key: 'date' | 'integrity' | 'name', direction: 'asc' | 'desc'}>({ key: 'date', direction: 'desc' });

    useEffect(() => {
        if (cases.length > 0 && !selectedCaseId) {
            setSelectedCaseId(cases[0].caseId);
        }
    }, [cases, selectedCaseId]);

    const filteredEvidence = evidence.filter(e => {
        if (e.caseId !== selectedCaseId) return false;
        
        let isVisible = false;
        if (currentUser?.role === UserRole.ADMIN) isVisible = true;
        else if (!e.visibility?.isRestricted) isVisible = true;
        else if (e.visibility) {
             const { allowedRoles = [], allowedDesignations = [], allowedUserIds = [] } = e.visibility;
             if (currentUser) {
                 if (allowedRoles.includes(currentUser.role)) isVisible = true;
                 else if (allowedDesignations.includes(currentUser.designation)) isVisible = true;
                 else if (allowedUserIds.includes(currentUser.id)) isVisible = true;
             }
        }
        if (!isVisible) return false;

        const q = searchQuery.toLowerCase();
        return (e.fileName || '').toLowerCase().includes(q) || 
               (e.evidenceId || '').toLowerCase().includes(q) || 
               e.notes?.toLowerCase().includes(q) ||
               (e.type || '').toLowerCase().includes(q);
    });

    const sortedEvidence = [...filteredEvidence].sort((a, b) => {
        let valA, valB;
        switch(sortConfig.key) {
            case 'name': valA = a.fileName.toLowerCase(); valB = b.fileName.toLowerCase(); break;
            case 'integrity': valA = a.integrityStatus; valB = b.integrityStatus; break;
            default: valA = new Date(a.timestamp).getTime(); valB = new Date(b.timestamp).getTime(); break;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleViewClick = async (ev: Evidence) => {
        setViewingEvidence(ev);
        setIsVerifying(true);
        setVerificationComplete(false);
        setVerifyResult(null);

        // Real server-side hash comparison against the ledger-anchored value —
        // this previously ran a 1.5s timer and then always rendered "Matches"
        // regardless of the exhibit's actual integrity status.
        const result = await verifyEvidenceIntegrity(ev.evidenceId, () => {}, {
            actorId: currentUser?.id,
            actorRole: currentUser?.role,
        });
        setVerifyResult(result);
        setIsVerifying(false);
        setVerificationComplete(true);
        if (currentUser) {
            addLog({ evidenceId: ev.evidenceId, caseId: ev.caseId, accessedBy: currentUser.id, role: currentUser.role, action: 'VIEW', details: 'User opened secure evidence file' });
        }
    };

    const handleCloseModal = () => {
        setViewingEvidence(null);
        setIsVerifying(false);
        setVerificationComplete(false);
        setVerifyResult(null);
    };

    const handleSaveAccess = (newVisibility: EvidenceVisibility) => {
        if (managingAccess) {
            updateEvidenceVisibility(managingAccess.evidenceId, newVisibility);
            setManagingAccess(null);
        }
    };

    const handleOpenCertModal = (evidenceId: string) => {
        setClassDetailEvidence(null);
        setCertEvidenceId(evidenceId);
        setCertModalOpen(true);
    };

    const handleIssueCert = () => {
        if (certEvidenceId && certFile) {
            const certRef = `CERT-${Date.now()}.pdf`;
            issueSection63Certificate(certEvidenceId, certRef, certFile);
            setCertModalOpen(false);
            setCertEvidenceId(null);
            setCertFile(null);
        }
    };

    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const canUpload = currentUser?.role === UserRole.POLICE || 
                      currentUser?.role === UserRole.FORENSICS || 
                      currentUser?.role === UserRole.ADMIN;

    const renderContentPreview = (ev: Evidence) => {
        const isImage = ev.type === EvidenceType.IMAGE || (ev.fileName && /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(ev.fileName));
        const isVideo = ev.type === EvidenceType.VIDEO || (ev.fileName && /\.(mp4|webm|mov|mkv)$/i.test(ev.fileName));
        const isAudio = ev.type === EvidenceType.AUDIO || (ev.fileName && /\.(mp3|wav|ogg|m4a|aac)$/i.test(ev.fileName));
        const isPdf = ev.type === EvidenceType.PDF || (ev.fileName && /\.pdf$/i.test(ev.fileName));

        if (ev.fileUrl) {
            if (isImage) {
                return (
                    <div className="w-full max-h-[420px] bg-navy-950/40 rounded-sm flex items-center justify-center overflow-hidden p-2 border border-line-200">
                        <img src={ev.fileUrl} alt={ev.fileName} className="max-h-[400px] max-w-full object-contain rounded-sm" />
                    </div>
                );
            }
            if (isVideo) {
                return (
                    <div className="w-full max-h-[420px] bg-navy-950/40 rounded-sm flex items-center justify-center overflow-hidden p-2 border border-line-200">
                        <video src={ev.fileUrl} controls className="max-h-[400px] max-w-full rounded-sm" />
                    </div>
                );
            }
            if (isAudio) {
                return (
                    <div className="w-full p-6 bg-paper-100 rounded-sm flex flex-col items-center justify-center border border-line-200">
                        <Music className="w-12 h-12 text-navy-500 mb-3" />
                        <p className="font-bold text-sm text-navy-900 mb-2">{ev.fileName}</p>
                        <audio src={ev.fileUrl} controls className="w-full max-w-md" />
                    </div>
                );
            }
        }

        return (
            <div className="w-full h-64 bg-navy-950 rounded-sm flex flex-col items-center justify-center overflow-hidden border border-navy-800 p-4">
                <div className="text-center text-navy-300">
                    {isImage && <ImageIcon className="w-16 h-16 mx-auto mb-2 text-navy-400 opacity-75" />}
                    {isVideo && <Video className="w-16 h-16 mx-auto mb-2 text-ashoka-100 opacity-75" />}
                    {isAudio && <Music className="w-16 h-16 mx-auto mb-2 text-status-resolved opacity-75" />}
                    {isPdf && <FileText className="w-16 h-16 mx-auto mb-2 text-status-urgent opacity-75" />}
                    {!isImage && !isVideo && !isAudio && !isPdf && <Box className="w-16 h-16 mx-auto mb-2 opacity-50" />}
                    <p className="text-sm font-semibold text-white">{ev.name || ev.fileName}</p>
                    <p className="text-xs text-navy-300 mt-1 font-mono">{ev.type} • {ev.fileSizeBytes ? `${(ev.fileSizeBytes / 1024).toFixed(1)} KB` : 'Secured Ledger Artifact'}</p>
                    {ev.fileUrl && (
                        <a
                            href={ev.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1 text-xs text-saffron-400 hover:text-saffron-300 underline"
                        >
                            Open / Download File
                        </a>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-navy-900 flex items-center gap-2"><Box className="w-6 h-6" />Evidence Vault</h2>
                    <p className="text-sm text-ink-500 mt-1">Securely view, verify, and upload evidence artifacts. Access is logged.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                    <div className="w-full sm:w-64">
                        <label className="block text-xs font-bold text-ink-500 uppercase mb-1">Select Case</label>
                        <div className="relative">
                            <select value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-line-300 focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500 sm:text-sm rounded-sm bg-white text-navy-900">
                                {cases.map(c => <option key={c.caseId} value={c.caseId}>{c.caseId} - {c.title}</option>)}
                            </select>
                        </div>
                    </div>
                    {canUpload && (
                        <Button
                            onClick={() => setUploadModalOpen(true)}
                            className="flex items-center justify-center gap-2 h-10 whitespace-nowrap"
                            disabled={cases.length === 0}
                        >
                            <Upload size={16} /> Upload Evidence
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-sm shadow-card border border-line-200">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-300" size={16} />
                    <input type="text" placeholder="Search by ID, filename, or type..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-line-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500" />
                </div>
                <div className="flex items-center gap-2 border-l border-line-200 pl-4">
                    <div className="flex items-center bg-paper-100 p-1 rounded-sm">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-sm transition-colors ${viewMode === 'grid' ? 'bg-white shadow-card text-navy-700' : 'text-ink-500 hover:text-navy-900'}`} title="Grid View"><LayoutGrid size={16} /></button>
                        <button onClick={() => setViewMode('pinboard')} className={`p-1.5 rounded-sm transition-colors ${viewMode === 'pinboard' ? 'bg-white shadow-card text-navy-700' : 'text-ink-500 hover:text-navy-900'}`} title="Pinboard View"><Network size={16} /></button>
                    </div>
                    {viewMode === 'grid' && (<>
                        <div className="h-6 w-px bg-line-200 mx-2"></div>
                        <span className="text-xs font-bold text-ink-500 uppercase hidden sm:block">Sort:</span>
                        <select value={sortConfig.key} onChange={(e) => setSortConfig({...sortConfig, key: e.target.value as any})} className="text-sm border border-line-300 rounded-sm px-3 py-2">
                            <option value="date">Date Uploaded</option><option value="integrity">Integrity Status</option><option value="name">File Name</option>
                        </select>
                        <button onClick={() => setSortConfig({...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})} className="p-2 border border-line-300 rounded-sm hover:bg-paper-100" title={sortConfig.direction === 'asc' ? "Ascending" : "Descending"}><ArrowUpDown size={16} /></button>
                    </>)}
                </div>
            </div>

            {sortedEvidence.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-line-300 rounded-sm">
                    <Box className="w-12 h-12 text-ink-300 mx-auto mb-3" />
                    <p className="text-ink-500 mb-4">No evidence found matching your criteria.</p>
                    {canUpload && cases.length > 0 && (
                        <Button onClick={() => setUploadModalOpen(true)} size="sm">
                            <Upload size={14} className="mr-1.5" /> Upload Evidence to this Case
                        </Button>
                    )}
                </div>
            ) : viewMode === 'pinboard' ? (
                <Pinboard evidence={sortedEvidence} onView={handleViewClick} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    {sortedEvidence.map(ev => (
                        <div key={ev.evidenceId} className="relative group">
                            <Card className="h-full flex flex-col transition-shadow hover:shadow-md">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2"><ImageIcon size={14}/> <span className="truncate max-w-[150px]" title={ev.fileName}>{ev.fileName}</span></h3>
                                        <p className="text-xs text-ink-500 font-mono mt-1">{ev.evidenceId}</p>
                                    </div><IntegrityBadge status={ev.integrityStatus} />
                                </div>
                                <div className="flex-1 space-y-2 text-sm text-ink-700">
                                    <div className="flex justify-between"><span className="text-ink-300">Class:</span><Badge color={ev.classification === EvidenceClassification.PRIMARY ? 'green' : 'yellow'}>{ev.classification}</Badge></div>
                                    <div className="flex justify-between"><span className="text-ink-300">Type:</span><span>{ev.type}</span></div>
                                    <div className="flex justify-between"><span className="text-ink-300">Legal Status:</span><span className={ev.approvedForLegal ? "text-status-resolved" : "text-ink-500"}>{ev.approvedForLegal ? "Approved" : "Restricted"}</span></div>
                                </div>
                                <div className="mt-6 flex items-center gap-2 pt-4 border-t border-line-200">
                                    <Button onClick={() => handleViewClick(ev)} size="sm" className="flex-1" disabled={ev.integrityStatus === IntegrityStatus.COMPROMISED && !isAdmin}><Eye size={14} /> View File</Button>
                                    <Button onClick={() => setClassDetailEvidence(ev)} variant="secondary" size="sm" className="flex-1"><FileBadge size={14} /> View Class</Button>
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>
            )}

            {viewingEvidence && (
                <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-line-200 bg-paper-50">
                            <div>
                                <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">Secure View: {viewingEvidence.fileName}{verificationComplete && verifyResult?.success && (<Badge color="green">Secure</Badge>)}</h3>
                                <p className="text-xs text-ink-500 font-mono">{viewingEvidence.evidenceId}</p>
                            </div>
                            <button onClick={handleCloseModal} className="text-ink-300 hover:text-ink-700 transition-colors"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center min-h-[400px] bg-paper-100">
                            {isVerifying ? (
                                <div className="text-center"><Loader2 className="w-16 h-16 text-navy-500 animate-spin mx-auto mb-4" /><h4 className="text-lg font-bold text-navy-900">Verifying Integrity</h4><p className="text-ink-500 mt-1">Comparing the stored hash against the ledger-anchored record...</p></div>
                            ) : (
                                <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
                                    {verifyResult && !verifyResult.success && (<div className="w-full mb-6 bg-status-urgentBg border border-status-urgent/20 p-4 rounded-sm flex items-start gap-3"><AlertTriangle className="text-status-urgent shrink-0 mt-0.5" /><div><h4 className="text-sm font-bold text-status-urgent">Integrity Warning</h4><p className="text-xs text-status-urgent mt-1">{verifyResult.message}</p></div></div>)}
                                    {renderContentPreview(viewingEvidence)}
                                    <div className="mt-8 w-full max-w-2xl bg-white rounded-sm p-4 border border-line-200">
                                        <h5 className="text-xs font-bold uppercase text-ink-300 mb-3">Integrity Verification</h5>
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex-1"><p className="text-ink-500 text-xs">File Hash (vs. Ledger)</p><p className="font-mono text-navy-900 truncate">{verifyResult?.currentHash || viewingEvidence.fileHash}</p></div>
                                            {verifyResult?.success ? (
                                                <div className="flex items-center gap-2 text-status-resolved font-bold bg-status-resolvedBg px-3 py-1 rounded-sm"><CheckCircle size={16} /> Matches</div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-status-urgent font-bold bg-status-urgentBg px-3 py-1 rounded-sm"><XCircle size={16} /> Mismatch</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-paper-50 border-t border-line-200 flex justify-between items-center"><div className="text-xs text-ink-500">Access ID: {currentUser?.id} • Time: {new Date().toLocaleTimeString()}</div><Button variant="secondary" onClick={handleCloseModal}>Close Viewer</Button></div>
                    </div>
                </div>
            )}

            {classDetailEvidence && <ClassificationDetailModal evidence={classDetailEvidence} onClose={() => setClassDetailEvidence(null)} onIssueCertClick={handleOpenCertModal} canIssueCert={currentUser?.role === UserRole.FORENSICS} />}

            {certModalOpen && (
                <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md" title="Issue Section 63 Certificate">
                        <div className="space-y-4">
                            <p className="text-sm text-ink-700">This evidence is classified as <span className="font-bold text-status-pending">SECONDARY</span>. To make it admissible, a valid Section 63 Certificate must be attached.</p>
                            <div>
                                <label className="block text-sm font-medium text-ink-700 mb-1">Certificate File</label>
                                <input type="file" onChange={(e) => setCertFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-ink-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ashoka-50 file:text-ashoka-700 hover:file:bg-ashoka-100" />
                            </div>
                        </div>
                         <div className="mt-6 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setCertModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleIssueCert} disabled={!certFile}>Issue Certificate</Button>
                        </div>
                    </Card>
                </div>
            )}

            {managingAccess && <AccessControlModal evidence={managingAccess} onClose={() => setManagingAccess(null)} onSave={handleSaveAccess} />}

            {uploadModalOpen && (
                <UploadEvidenceModal
                    cases={cases}
                    initialCaseId={selectedCaseId}
                    existingEvidence={evidence.filter(e => e.caseId === selectedCaseId)}
                    onClose={() => setUploadModalOpen(false)}
                    onUploadSuccess={(caseId) => {
                        setSelectedCaseId(caseId);
                        setUploadModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

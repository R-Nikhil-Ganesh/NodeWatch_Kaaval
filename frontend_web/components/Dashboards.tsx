
import React, { useState } from 'react';
import { useStore } from '../store';
import { Case, CaseStatus, EvidenceType, UserRole, Evidence, User, IntegrityStatus } from '../types';
import { Card, Button, Table, Badge, CaseStatusBadge, Input, RoleBadge, downloadCSV } from './Common';
import { Plus, Upload, Search, FileText, BarChart2, ShieldAlert, Edit2, Download, ArrowUpDown, ShieldCheck, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
    onNavigate: (view: string, id?: string) => void;
    onEditUser?: (user: User) => void;
}

// ----------------------------------------------------------------------
// SYSTEM LOGS VIEW (EXTRACTED)
// ----------------------------------------------------------------------
export const SystemLogsView = () => {
    const { logs, currentUser } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Filtering
    const filteredLogs = logs.filter(log => {
        const q = searchQuery.toLowerCase();
        return (
            log.action.toLowerCase().includes(q) ||
            log.details?.toLowerCase().includes(q) ||
            log.accessedBy.toLowerCase().includes(q) ||
            (log.evidenceId && log.evidenceId.toLowerCase().includes(q)) ||
            (log.caseId && log.caseId.toLowerCase().includes(q))
        );
    });

    // Sorting
    const sortedLogs = [...filteredLogs].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });

    const handleDownload = () => {
        if (currentUser?.role !== UserRole.ADMIN) return;

        const data = sortedLogs.map(log => ({
            ID: log.id,
            Timestamp: new Date(log.timestamp).toLocaleString(),
            User: log.accessedBy,
            Role: log.role,
            Action: log.action,
            Reference: log.evidenceId || log.caseId || 'N/A',
            Details: log.details || ''
        }));

        const headers = ['ID', 'Timestamp', 'User', 'Role', 'Action', 'Reference', 'Details'];
        downloadCSV(data, headers, `system_audit_logs_${new Date().toISOString()}.csv`);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gov-900 dark:text-white">System Audit Logs</h2>
            
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gov-800 p-4 rounded-lg shadow-sm border border-gov-200 dark:border-gov-700">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gov-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search logs by ID, user, or action..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gov-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gov-900 dark:border-gov-600 dark:text-white"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2 px-3 py-2 border border-gov-300 rounded-md hover:bg-gov-100 dark:border-gov-600 dark:hover:bg-gov-700 dark:text-white text-sm"
                    >
                        <ArrowUpDown size={14} />
                        Sort Date: {sortDirection === 'asc' ? 'Oldest' : 'Newest'}
                    </button>
                    
                    {currentUser?.role === UserRole.ADMIN && (
                        <Button onClick={handleDownload} variant="secondary" size="sm">
                            <Download size={14} /> Export CSV
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <Table headers={['ID', 'Timestamp', 'User', 'Role', 'Action', 'Reference', 'Details']}>
                    {sortedLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gov-50 dark:hover:bg-gov-700/50 transition-colors">
                            <td className="px-6 py-4 text-xs font-mono text-gov-400 dark:text-gov-500">{log.id}</td>
                            <td className="px-6 py-4 text-xs text-gov-500 dark:text-gov-400">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gov-900 dark:text-gov-100">{log.accessedBy}</td>
                            <td className="px-6 py-4 text-xs"><span className="bg-gov-200 dark:bg-gov-700 px-2 py-1 rounded text-gov-700 dark:text-gov-200">{log.role}</span></td>
                            <td className="px-6 py-4 text-sm font-bold text-gov-800 dark:text-gov-100">{log.action}</td>
                            <td className="px-6 py-4 text-xs font-mono text-gov-500 dark:text-gov-400">{log.evidenceId || log.caseId || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gov-600 dark:text-gov-300">{log.details}</td>
                        </tr>
                    ))}
                </Table>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// USERS VIEW (ADMIN ONLY)
// ----------------------------------------------------------------------
export const AdminUsersView = ({ onEditUser }: { onEditUser?: (user: User) => void }) => {
    const { users } = useStore();
    return (
        <div className="space-y-6">
             <h2 className="text-2xl font-bold text-gov-900 dark:text-white">User Management</h2>
             <Card title="Authorized Personnel">
                 <Table headers={['User ID', 'Name', 'Email', 'Role', 'Designation', 'Action']}>
                     {users.map(u => (
                         <tr key={u.id} className="hover:bg-gov-50 dark:hover:bg-gov-700/50 transition-colors">
                             <td className="px-6 py-4 text-xs font-mono text-gov-500 dark:text-gov-400">{u.id}</td>
                             <td className="px-6 py-4 text-sm font-medium text-gov-900 dark:text-gov-100">
                                <div className="flex items-center gap-2">
                                    {u.profileImage ? (
                                        <img src={u.profileImage} className="w-6 h-6 rounded-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gov-200 dark:bg-gov-700 flex items-center justify-center text-xs">
                                            {u.name[0]}
                                        </div>
                                    )}
                                    {u.name}
                                </div>
                             </td>
                             <td className="px-6 py-4 text-sm text-gov-600 dark:text-gov-300 font-mono">{u.email}</td>
                             <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                             <td className="px-6 py-4 text-sm text-gov-600 dark:text-gov-300">{u.designation}</td>
                             <td className="px-6 py-4">
                                <Button size="sm" variant="ghost" onClick={() => onEditUser && onEditUser(u)}>
                                    <Edit2 size={14} className="mr-1" /> Edit
                                </Button>
                             </td>
                         </tr>
                     ))}
                 </Table>
             </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// POLICE DASHBOARD
// ----------------------------------------------------------------------
export const PoliceDashboard = ({ onNavigate }: DashboardProps) => {
    const { cases, currentUser } = useStore();
    // Police can view cases they created (historical) or are generally open (depending on policy).
    // Assuming they can see cases assigned to their precinct or created by them.
    const myCases = cases.filter(c => c.createdBy === currentUser?.id || c.status === CaseStatus.OPEN || c.status === CaseStatus.UNDER_INVESTIGATION);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gov-900 dark:text-white">Police Dashboard</h2>
            </div>

            <Card title="Available Cases">
                {myCases.length === 0 ? (
                    <p className="text-gov-500 dark:text-gov-400 text-center py-4">No cases available.</p>
                ) : (
                    <Table headers={['Case ID', 'Title', 'Date Created', 'Status', 'Action']}>
                        {myCases.map(c => (
                            <tr key={c.caseId} className="hover:bg-gov-50 dark:hover:bg-gov-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gov-900 dark:text-gov-100">{c.caseId}</td>
                                <td className="px-6 py-4 text-sm text-gov-600 dark:text-gov-300">{c.title}</td>
                                <td className="px-6 py-4 text-sm text-gov-500 dark:text-gov-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4"><CaseStatusBadge status={c.status} /></td>
                                <td className="px-6 py-4 text-sm font-medium">
                                    <button onClick={() => onNavigate('case_detail', c.caseId)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">View Details</button>
                                </td>
                            </tr>
                        ))}
                    </Table>
                )}
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// FORENSICS DASHBOARD
// ----------------------------------------------------------------------
export const ForensicsDashboard = ({ onNavigate }: DashboardProps) => {
    const { cases, evidence, verifyEvidence } = useStore();
    const activeCases = cases.filter(c => c.status === CaseStatus.UNDER_INVESTIGATION);
    const pendingVerification = evidence.filter(e => e.integrityStatus === 'PENDING' || e.integrityStatus === 'NOT_CHECKED');

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gov-900 dark:text-white">Forensics Laboratory</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Pending Verifications">
                    {pendingVerification.length === 0 ? (
                        <div className="text-center py-6 text-green-600 dark:text-green-400 flex flex-col items-center">
                            <ShieldAlert size={32} className="mb-2" />
                            <p>All evidence verified</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gov-200 dark:divide-gov-700">
                            {pendingVerification.slice(0,5).map(e => (
                                <li key={e.evidenceId} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium text-gov-900 dark:text-gov-100">{e.fileName}</p>
                                        <p className="text-xs text-gov-500 dark:text-gov-400">{e.caseId}</p>
                                    </div>
                                    <Button size="sm" onClick={() => verifyEvidence(e.evidenceId)}>Verify</Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                <Card title="Active Investigations">
                     <Table headers={['Case ID', 'Title', 'Action']}>
                        {activeCases.map(c => (
                            <tr key={c.caseId} className="hover:bg-gov-50 dark:hover:bg-gov-700/50 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-gov-900 dark:text-gov-100">{c.caseId}</td>
                                <td className="px-4 py-3 text-sm text-gov-600 dark:text-gov-300">{c.title}</td>
                                <td className="px-4 py-3">
                                    <Button size="sm" variant="secondary" onClick={() => onNavigate('case_detail', c.caseId)}>Access</Button>
                                </td>
                            </tr>
                        ))}
                     </Table>
                </Card>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// LEGAL DASHBOARD
// ----------------------------------------------------------------------
export const LegalDashboard = ({ onNavigate }: DashboardProps) => {
    const { cases, evidence, verifyEvidence } = useStore();
    
    // Constraint: Only show cases marked as SUBMITTED_TO_COURT
    const legalCases = cases.filter(c => c.status === CaseStatus.SUBMITTED_TO_COURT);

    const handleVerifyEvidences = (caseId: string) => {
        // Find all evidence for this case
        const caseEvidence = evidence.filter(e => e.caseId === caseId && e.approvedForLegal);
        
        if (caseEvidence.length === 0) {
            alert("No accessible evidence found for this case.");
            return;
        }

        // Trigger verification (Mocking a batch process)
        caseEvidence.forEach(e => verifyEvidence(e.evidenceId));

        // Calculate Stats
        const compromisedCount = caseEvidence.filter(e => e.integrityStatus === IntegrityStatus.COMPROMISED).length;
        const verifiedCount = caseEvidence.length - compromisedCount; // Simplified for demo, technically some might be pending

        // Show Output
        alert(`VERIFICATION COMPLETE for Case ${caseId}\n\nTotal Items Checked: ${caseEvidence.length}\nVerified: ${verifiedCount}\nIntegrity Warnings: ${compromisedCount}\n\n${compromisedCount > 0 ? "⚠️ CRITICAL: Some evidence hashes do not match the ledger." : "✅ All evidence chains are intact."}`);
        
        // Navigate after check
        onNavigate('case_detail', caseId);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gov-900 dark:text-white">Legal Review Dashboard</h2>
            <Card title="Court Cases (Docket)">
                 {legalCases.length === 0 ? (
                     <div className="p-4 text-center text-gov-500">No cases currently submitted for court review.</div>
                 ) : (
                    // Constraint: Legal should not see Case Status column
                    <Table headers={['Case ID', 'Title', 'Date', 'Action']}>
                        {legalCases.map(c => (
                            <tr key={c.caseId} className="hover:bg-gov-50 dark:hover:bg-gov-700/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gov-900 dark:text-gov-100">{c.caseId}</td>
                                <td className="px-6 py-4 text-sm text-gov-600 dark:text-gov-300">{c.title}</td>
                                <td className="px-6 py-4 text-sm text-gov-500 dark:text-gov-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <Button size="sm" variant="primary" onClick={() => handleVerifyEvidences(c.caseId)} className="flex items-center gap-1">
                                        <ShieldCheck size={14} /> Verify Case Integrity
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </Table>
                 )}
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// ADMIN DASHBOARD
// ----------------------------------------------------------------------
export const AdminDashboard = ({ onNavigate }: DashboardProps) => {
    const { cases, evidence, logs, addCase, currentUser } = useStore();
    
    // Create Case Logic (Moved from Police)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCaseData, setNewCaseData] = useState({ title: '', description: '' });

    const handleCreateCase = () => {
        if (!newCaseData.title || !currentUser) return;
        addCase({
            caseId: `CASE-2024-${Math.floor(Math.random() * 1000)}`,
            title: newCaseData.title,
            description: newCaseData.description,
            status: CaseStatus.OPEN,
            createdBy: currentUser.id,
            createdAt: new Date().toISOString()
        });
        setIsCreateModalOpen(false);
        setNewCaseData({ title: '', description: '' });
    };

    const totalCases = cases.length;
    const totalEvidence = evidence.length;
    const compromised = evidence.filter(e => e.integrityStatus === 'COMPROMISED').length;
    const recentLogs = logs.slice(0, 10);

    const chartData = [
        { name: 'Cases', value: totalCases },
        { name: 'Evidence', value: totalEvidence },
        { name: 'Warnings', value: compromised },
    ];

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gov-900 dark:text-white">System Administration</h2>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={16} /> Create New Case
                </Button>
            </div>

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md" title="Create New Case">
                        <Input 
                            label="Case Title" 
                            value={newCaseData.title} 
                            onChange={e => setNewCaseData({...newCaseData, title: e.target.value})} 
                        />
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gov-700 mb-1 dark:text-gov-300">Description</label>
                            <textarea 
                                className="w-full px-3 py-2 border border-gov-300 rounded-md bg-white dark:bg-gov-900 dark:border-gov-600 dark:text-white dark:focus:ring-blue-500"
                                rows={3}
                                value={newCaseData.description}
                                onChange={e => setNewCaseData({...newCaseData, description: e.target.value})}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateCase}>Create Case</Button>
                        </div>
                    </Card>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <p className="text-sm text-gov-500 dark:text-gov-400">Total Cases</p>
                    <p className="text-3xl font-bold text-gov-800 dark:text-white">{totalCases}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-gov-500 dark:text-gov-400">Total Evidence</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalEvidence}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-gov-500 dark:text-gov-400">Integrity Warnings</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{compromised}</p>
                </Card>
                 <Card className="text-center">
                    <p className="text-sm text-gov-500 dark:text-gov-400">Total Access Logs</p>
                    <p className="text-3xl font-bold text-gov-800 dark:text-white">{logs.length}</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card title="System Activity (Last 10 Actions)">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gov-200 dark:divide-gov-700">
                            <thead className="bg-gov-50 dark:bg-gov-900/50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gov-500 dark:text-gov-400 uppercase">Time</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gov-500 dark:text-gov-400 uppercase">User</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gov-500 dark:text-gov-400 uppercase">Action</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gov-500 dark:text-gov-400 uppercase">Details</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gov-200 dark:bg-gov-800 dark:divide-gov-700">
                                {recentLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gov-50 dark:hover:bg-gov-700/50 transition-colors">
                                        <td className="px-3 py-2 text-xs whitespace-nowrap text-gov-500 dark:text-gov-400">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td className="px-3 py-2 text-xs font-medium text-gov-900 dark:text-gov-100">{log.accessedBy}</td>
                                        <td className="px-3 py-2 text-xs">
                                            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gov-600 dark:text-gov-300 truncate max-w-xs">{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => onNavigate('logs')}>View All Logs</Button>
                    </div>
                </Card>

                <Card title="System Overview">
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" stroke="#64748b" />
                                <YAxis stroke="#64748b" />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#f8fafc' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Bar dataKey="value" fill="#64748b" barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

             <Card title="All Cases Administration">
                 <Table headers={['ID', 'Title', 'Status', 'Creator', 'Action']}>
                    {cases.map(c => (
                        <tr key={c.caseId} className="hover:bg-gov-50 dark:hover:bg-gov-700/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gov-900 dark:text-gov-100">{c.caseId}</td>
                            <td className="px-6 py-4 text-sm text-gov-600 dark:text-gov-300">{c.title}</td>
                            <td className="px-6 py-4"><CaseStatusBadge status={c.status} /></td>
                            <td className="px-6 py-4 text-sm text-gov-500 dark:text-gov-400">{c.createdBy}</td>
                            <td className="px-6 py-4">
                                <Button size="sm" variant="secondary" onClick={() => onNavigate('case_detail', c.caseId)}>Manage</Button>
                            </td>
                        </tr>
                    ))}
                 </Table>
            </Card>
        </div>
    );
};

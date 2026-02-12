import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Table, Card, RoleBadge, Button, downloadCSV } from './Common';
import { FileSearch, Mail, User as UserIcon, Search, ArrowUpDown, Download } from 'lucide-react';
import { UserRole } from '../types';

export const ChainOfCustodyView = () => {
    const { cases, logs, users, currentUser } = useStore();
    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Set default selection
    useEffect(() => {
        if (cases.length > 0 && !selectedCaseId) {
            setSelectedCaseId(cases[0].caseId);
        }
    }, [cases, selectedCaseId]);

    // Helper to find user details
    const getUserDetails = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) return user;
        // Fallback if ID not found (e.g. system action or deleted user)
        return { name: userId, email: 'unknown@system.local', role: 'UNKNOWN' };
    };

    // Filter logs for the specific case AND search query
    const filteredLogs = logs.filter(log => {
        if (!selectedCaseId) return false;
        if (log.caseId !== selectedCaseId) return false;

        const q = searchQuery.toLowerCase();
        const actor = getUserDetails(log.accessedBy);
        
        return (
            log.action.toLowerCase().includes(q) ||
            log.details?.toLowerCase().includes(q) ||
            (log.evidenceId && log.evidenceId.toLowerCase().includes(q)) ||
            actor.name.toLowerCase().includes(q)
        );
    });
    
    // Sort logs
    const sortedLogs = [...filteredLogs].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });

    const handleDownload = () => {
        if (currentUser?.role !== UserRole.ADMIN) return;
        
        const data = sortedLogs.map(log => {
            const actor = getUserDetails(log.accessedBy);
            return {
                ID: log.id,
                Timestamp: new Date(log.timestamp).toLocaleString(),
                User_ID: log.accessedBy,
                User_Name: actor.name,
                Role: log.role,
                Action: log.action,
                Evidence_Ref: log.evidenceId || 'N/A',
                Details: log.details || ''
            };
        });

        const headers = ['ID', 'Timestamp', 'User_ID', 'User_Name', 'Role', 'Action', 'Evidence_Ref', 'Details'];
        downloadCSV(data, headers, `chain_of_custody_${selectedCaseId}_${new Date().toISOString()}.csv`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gov-900 dark:text-white flex items-center gap-2">
                        <FileSearch className="w-6 h-6" />
                        Chain of Custody Ledger
                    </h2>
                    <p className="text-sm text-gov-500 dark:text-gov-400 mt-1">
                        Immutable timeline of all actions taken on a specific case.
                    </p>
                </div>
                
                <div className="w-full md:w-64">
                    <label className="block text-xs font-bold text-gov-500 dark:text-gov-400 uppercase mb-1">Select Case</label>
                    <div className="relative">
                        <select 
                            value={selectedCaseId}
                            onChange={(e) => setSelectedCaseId(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gov-300 dark:border-gov-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gov-800 text-gov-900 dark:text-white"
                        >
                            {cases.map(c => (
                                <option key={c.caseId} value={c.caseId}>
                                    {c.caseId} - {c.title}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Controls */}
             <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gov-800 p-4 rounded-lg shadow-sm border border-gov-200 dark:border-gov-700">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gov-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search logs by user, action, or details..." 
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

            <Card title={`Custody Log: ${selectedCaseId || 'Select a case'}`}>
                {sortedLogs.length === 0 ? (
                    <div className="py-8 text-center text-gov-500 dark:text-gov-400">
                        No records found matching your filters.
                    </div>
                ) : (
                    <Table headers={['Timestamp', 'Actor', 'Role', 'Action', 'Reference', 'Details']}>
                        {sortedLogs.map(log => {
                            const actor = getUserDetails(log.accessedBy);
                            return (
                                <tr key={log.id} className="hover:bg-gov-50 dark:hover:bg-gov-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gov-500 dark:text-gov-400 font-mono">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gov-200 dark:bg-gov-700 flex items-center justify-center text-gov-600 dark:text-gov-300 font-bold text-xs">
                                                {actor.name.charAt(0)}
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gov-900 dark:text-white flex items-center gap-1">
                                                    {actor.name}
                                                </div>
                                                <div className="text-xs text-gov-500 dark:text-gov-400 flex items-center gap-1">
                                                    <Mail size={10} /> {actor.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <RoleBadge role={log.role} />
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gov-800 dark:text-gov-100">
                                        {log.action}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-gov-500 dark:text-gov-400">
                                        {log.evidenceId ? (
                                            <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                                {log.evidenceId}
                                            </span>
                                        ) : (
                                            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                                CASE LEVEL
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gov-600 dark:text-gov-300 max-w-xs truncate" title={log.details}>
                                        {log.details}
                                    </td>
                                </tr>
                            );
                        })}
                    </Table>
                )}
            </Card>
        </div>
    );
};
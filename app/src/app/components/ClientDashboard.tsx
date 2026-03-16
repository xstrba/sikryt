'use client'

import { useState, useMemo } from 'react';
import { createDirectory, createSecret, deleteDirectory, deleteSecret } from '@/lib/actions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUI } from '../providers';
import CodeView from './CodeView';

// dbSecrets: Secret[] with versions: SecretVersion[] (from Prisma)
export default function ClientDashboard({ directories, dbSecrets, currentDirId, canManage = true }: any) {
    const router = useRouter();
    const [showCreateDirModal, setShowCreateDirModal] = useState(false);
    const [showCreateSecretModal, setShowCreateSecretModal] = useState(false);
    const [showCreateConfigModal, setShowCreateConfigModal] = useState(false);
    const [dirName, setDirName] = useState('');
    const [secName, setSecName] = useState('');
    const [secValue, setSecValue] = useState('');
    const [confName, setConfName] = useState('');
    const [confValue, setConfValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDirs, setShowDirs] = useState(true);
    const [showConfigs, setShowConfigs] = useState(true);
    const [showSecrets, setShowSecrets] = useState(true);

    const { confirm, toast } = useUI();

    const { dirTree, secretsByDir } = useMemo(() => {
        const dTree: Record<string, any[]> = { root: [] };
        directories.forEach((d: any) => {
            const pId = d.parentId || 'root';
            if (!dTree[pId]) dTree[pId] = [];
            dTree[pId].push(d);
        });

        const sByDir: Record<string, any[]> = { root: [] };
        dbSecrets.forEach((s: any) => {
            const pId = s.directoryId || 'root';
            if (!sByDir[pId]) sByDir[pId] = [];
            sByDir[pId].push(s);
        });

        return { dirTree: dTree, secretsByDir: sByDir };
    }, [directories, dbSecrets]);

    const handleCreateDir = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await createDirectory(dirName, currentDirId === 'root' ? null : currentDirId);
        if (res.success) {
            toast('Directory created!', 'success');
            setDirName('');
            setShowCreateDirModal(false);
            router.refresh();
        } else {
            toast(res.error || 'Unknown error', 'error');
        }
        setLoading(false);
    };

    const handleCreateSecret = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await createSecret(secName, secValue, currentDirId === 'root' ? null : currentDirId, false);
        if (res.success) {
            toast('Secret created!', 'success');
            setSecName('');
            setSecValue('');
            setShowCreateSecretModal(false);
            router.refresh();
        } else {
            toast(res.error || 'Unknown error', 'error');
        }
        setLoading(false);
    };

    const handleCreateConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await createSecret(confName, confValue, currentDirId === 'root' ? null : currentDirId, true);
        if (res.success) {
            toast('Config created!', 'success');
            setConfName('');
            setConfValue('');
            setShowCreateConfigModal(false);
            router.refresh();
        } else {
            toast(res.error || 'Unknown error', 'error');
        }
        setLoading(false);
    };

    const handleDeleteDir = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await confirm({ title: 'Delete Directory?', message: 'Are you sure you want to delete this directory?', danger: true });
        if (!ok) return;
        setDeletingId(id);
        const res = await deleteDirectory(id);
        if (!res.success) toast(res.error || 'Failed to delete directory', 'error');
        else {
            toast('Directory deleted', 'success');
            router.refresh();
        }
        setDeletingId(null);
    };

    const handleDeleteSecret = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await confirm({ title: 'Delete Secret?', message: 'Delete this secret and ALL its versions?', danger: true });
        if (!ok) return;
        setDeletingId(id);
        const res = await deleteSecret(id);
        if (!res.success) toast(res.error || 'Failed to delete secret', 'error');
        else {
            toast('Secret deleted', 'success');
            router.refresh();
        }
        setDeletingId(null);
    };

    const getPath = (dirId: string) => {
        if (dirId === 'root') return [];
        const path: any[] = [];
        let curr = directories.find((d: any) => d.id === dirId);
        while (curr) {
            path.unshift(curr);
            curr = directories.find((d: any) => d.id === curr.parentId);
        }
        return path;
    };

    const TrashIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
        </svg>
    );

    const Spinner = () => (
        <div className="h-4 w-4 rounded-full border-2 border-slate-500/20 border-t-red-400 animate-spin" />
    );

    const EyeIcon = ({ show }: { show: boolean }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors">
            {show ? (
                <>
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
                    <circle cx="12" cy="12" r="3" />
                </>
            ) : (
                <>
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                </>
            )}
        </svg>
    );

    const renderDirectoryView = () => {
        const dirs = dirTree[currentDirId] || [];
        const secs = secretsByDir[currentDirId] || [];
        const configs = secs.filter((s: any) => s.isConfig);
        const actualSecrets = secs.filter((s: any) => !s.isConfig);
        const breadcrumbs = getPath(currentDirId);

        return (
            <div className="space-y-6">
                {/* 1. Breadcrumbs & Quick Actions Panel */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-400">
                        <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/50">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                            Root
                        </Link>
                        {breadcrumbs.map((b: any) => (
                            <div key={b.id} className="flex items-center gap-2">
                                <span className="text-slate-700">/</span>
                                <Link href={`/directory/${b.id}`} title={b.name} className="hover:text-white transition-colors flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/50">
                                    <span className="max-w-[120px] truncate">{b.name}</span>
                                </Link>
                            </div>
                        ))}
                    </div>

                    {canManage && (
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => setShowCreateDirModal(true)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-slate-700/50">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>
                                Directory
                            </button>
                            <button onClick={() => setShowCreateConfigModal(true)}
                                className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                                Config
                            </button>
                            <button onClick={() => setShowCreateSecretModal(true)}
                                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /><line x1="12" y1="14" x2="12" y2="18" /><line x1="10" y1="16" x2="14" y2="16" /></svg>
                                Secret
                            </button>
                        </div>
                    )}
                </section>

                {/* 2. Subdirectories Grid */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                            Directories
                            {dirs.length > 0 && <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-1">{dirs.length}</span>}
                        </h3>
                        <button onClick={() => setShowDirs(!showDirs)} className="text-slate-500 hover:text-slate-300 transition-colors p-1" title={showDirs ? 'Hide' : 'Show'}>
                            <EyeIcon show={showDirs} />
                        </button>
                    </div>
                    {showDirs && (
                        dirs.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {dirs.map((d: any) => (
                                <div key={d.id} className="group relative flex items-center">
                                    <Link href={`/directory/${d.id}`} className="flex-1 flex items-center gap-3 text-slate-300 p-4 rounded-2xl bg-slate-900 border border-slate-800/50 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all shadow-lg shadow-black/20">
                                        <div className="bg-blue-500/10 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                            </svg>
                                        </div>
                                        <span className="font-bold text-sm truncate">{d.name}</span>
                                    </Link>
                                    {canManage && (
                                        <button onClick={(e) => handleDeleteDir(e, d.id)} disabled={deletingId === d.id}
                                            className="absolute right-2 p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50">
                                            {deletingId === d.id ? <Spinner /> : <TrashIcon />}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        ) : (
                            <div className="py-8 text-center text-slate-600 text-[10px] uppercase tracking-widest border border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
                                No subdirectories
                            </div>
                        )
                    )}
                </section>

                <div className="flex flex-col gap-6">
                    {/* 3. Configs Table */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-500/70 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                                Configurations
                                {configs.length > 0 && <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded ml-1">{configs.length}</span>}
                            </h3>
                            <button onClick={() => setShowConfigs(!showConfigs)} className="text-slate-500 hover:text-blue-400 transition-colors p-1" title={showConfigs ? 'Hide' : 'Show'}>
                                <EyeIcon show={showConfigs} />
                            </button>
                        </div>
                        {showConfigs && (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                                {configs.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-800 bg-slate-950/50">
                                                    <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase tracking-tighter">Name</th>
                                                    <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase tracking-tighter hidden sm:table-cell text-right">Updated</th>
                                                    <th className="py-3 px-4 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {configs.map((s: any) => (
                                                    <tr key={s.id} className="group border-b border-slate-800/50 hover:bg-blue-500/[0.03] transition-colors">
                                                        <td className="py-3 px-4">
                                                            <Link href={`/secret/${s.id}`} className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                                                                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1-1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                                                                </div>
                                                                <span className="font-mono text-blue-300 font-medium truncate">{s.name}</span>
                                                            </Link>
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-600 hidden sm:table-cell text-right text-[10px]" suppressHydrationWarning>
                                                            {new Date(s.updatedAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            {canManage && (
                                                                <button onClick={(e) => handleDeleteSecret(e, s.id)} disabled={deletingId === s.id}
                                                                    className="p-1.5 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                                                    {deletingId === s.id ? <Spinner /> : <TrashIcon />}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-slate-600 font-mono text-[10px] uppercase tracking-[0.2em]">No configurations</div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* 4. Secrets Table */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-500/70 px-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                Secrets
                                {actualSecrets.length > 0 && <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded ml-1">{actualSecrets.length}</span>}
                            </h3>
                            <button onClick={() => setShowSecrets(!showSecrets)} className="text-slate-500 hover:text-emerald-400 transition-colors p-1" title={showSecrets ? 'Hide' : 'Show'}>
                                <EyeIcon show={showSecrets} />
                            </button>
                        </div>
                        {showSecrets && (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                                {actualSecrets.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-800 bg-slate-950/50">
                                                    <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase tracking-tighter">Name</th>
                                                    <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase tracking-tighter hidden sm:table-cell text-right">Updated</th>
                                                    <th className="py-3 px-4 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {actualSecrets.map((s: any) => (
                                                    <tr key={s.id} className="group border-b border-slate-800/50 hover:bg-emerald-500/[0.03] transition-colors">
                                                        <td className="py-3 px-4">
                                                            <Link href={`/secret/${s.id}`} className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                                                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                                    </svg>
                                                                </div>
                                                                <span className="font-mono text-emerald-400 font-medium truncate">{s.name}</span>
                                                            </Link>
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-600 hidden sm:table-cell text-right text-[10px]" suppressHydrationWarning>
                                                            {new Date(s.updatedAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            {canManage && (
                                                                <button onClick={(e) => handleDeleteSecret(e, s.id)} disabled={deletingId === s.id}
                                                                    className="p-1.5 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                                                    {deletingId === s.id ? <Spinner /> : <TrashIcon />}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-slate-600 font-mono text-[10px] uppercase tracking-[0.2em]">No secrets</div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        );
    };

    return (
        <main className="space-y-6">
            <div className="min-h-[60vh]">
                {renderDirectoryView()}
            </div>


            {/* Create Directory Modal */}
            {showCreateDirModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowCreateDirModal(false)} />
                    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl max-w-lg w-full">
                        <h3 className="text-xl font-bold text-white mb-2">Create New Directory</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Creating in <span className="text-blue-400 font-mono">/{currentDirId === 'root' ? '' : directories.find((d: any) => d.id === currentDirId)?.name}</span>
                        </p>
                        <form onSubmit={handleCreateDir} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Directory Name</label>
                                <input autoFocus type="text" required value={dirName} onChange={e => setDirName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                    placeholder="e.g. databases" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateDirModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-medium">Cancel</button>
                                <button disabled={loading}
                                    className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all">
                                    {loading ? 'Creating...' : 'Create Directory'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Secret Modal */}
            {showCreateSecretModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowCreateSecretModal(false)} />
                    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <h3 className="text-xl font-bold text-white mb-2">Create New Secret</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Target: <span className="text-emerald-400 font-mono">/{currentDirId === 'root' ? '' : directories.find((d: any) => d.id === currentDirId)?.name}</span>
                        </p>
                        <form onSubmit={handleCreateSecret} className="space-y-5 flex-1 flex flex-col overflow-hidden">
                            <div className="shrink-0">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Secret Name</label>
                                <input autoFocus type="text" required value={secName} onChange={e => setSecName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono"
                                    placeholder="e.g. POSTGRES_PASSWORD" />
                            </div>
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Secret Value</label>
                                <CodeView 
                                    value={secValue}
                                    onChange={setSecValue}
                                    editable={true}
                                    minHeight="300px"
                                    maxHeight="45vh"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateSecretModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-medium">Cancel</button>
                                <button disabled={loading}
                                    className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20">
                                    {loading ? 'Creating...' : 'Save Secret'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Create Config Modal */}
            {showCreateConfigModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowCreateConfigModal(false)} />
                    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <h3 className="text-xl font-bold text-white mb-2">Create New Config</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Target: <span className="text-blue-400 font-mono">/{currentDirId === 'root' ? '' : directories.find((d: any) => d.id === currentDirId)?.name}</span>
                        </p>
                        <form onSubmit={handleCreateConfig} className="space-y-5 flex-1 flex flex-col overflow-hidden">
                            <div className="shrink-0">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Config Name</label>
                                <input autoFocus type="text" required value={confName} onChange={e => setConfName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                    placeholder="e.g. nginx_conf" />
                            </div>
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Config Content</label>
                                <CodeView 
                                    value={confValue}
                                    onChange={setConfValue}
                                    editable={true}
                                    minHeight="300px"
                                    maxHeight="45vh"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateConfigModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-medium">Cancel</button>
                                <button disabled={loading}
                                    className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20">
                                    {loading ? 'Creating...' : 'Save Config'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}

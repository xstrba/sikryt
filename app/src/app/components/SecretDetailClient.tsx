'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSecretVersion, deleteSecretVersion, deleteSecret, readSecretValue } from '@/lib/actions';
import { useUI } from '../providers';
import CodeView from './CodeView';

function versionLabel(v: number) {
    return v === 0 ? 'Initial' : `v${v}`;
}

/** Try to pretty-print JSON; return null if not JSON */
function tryParseJson(raw: string): string | null {
    try {
        return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
        return null;
    }
}



interface RevealModalProps {
    version: any;
    onClose: () => void;
}

function RevealModal({ version, onClose }: RevealModalProps) {
    const [loading, setLoading] = useState(true);
    const [value, setValue] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Fetch on mount
    useEffect(() => {
        readSecretValue(version.id, version.dockerName).then(res => {
            if (res.success) {
                setValue(res.value ?? '');
                setEditValue(res.value ?? '');
            }
            else setError(res.error || 'Failed to read value');
            setLoading(false);
        });
    }, []);

    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);
    const router = useRouter();
    const isConfig = version.secret?.isConfig;

    const isJson = value !== null ? tryParseJson(value) : null;
    const displayValue = isJson ?? value ?? '';

    async function handleCopy() {
        await navigator.clipboard.writeText(value ?? '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    async function handleSave() {
        if (!version.secret?.id) return;
        setSaving(true);
        const res = await createSecretVersion(version.secret.id, editValue);
        if (res.success) {
            onClose();
            router.refresh();
        } else {
            setError(res.error || 'Failed to save new version');
        }
        setSaving(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" />
            <div
                className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className={`${version.secret?.isConfig ? 'bg-blue-500/10 border-blue-500/20' : 'bg-emerald-500/10 border-emerald-500/20'} p-2 rounded-xl border`}>
                                {version.secret?.isConfig ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <h3 className="text-white font-semibold font-mono">{version.dockerName}</h3>
                                <p className="text-xs text-slate-500 mt-0.5" suppressHydrationWarning>
                                    {versionLabel(version.version)} · {new Date(version.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!loading && value !== null && isConfig && editValue !== value && (
                            <button onClick={handleSave} disabled={saving}
                                className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50">
                                {saving ? (
                                    <div className="h-3 w-3 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><path d="M7 3v5h8"/></svg>
                                )}
                                Save as New Version
                            </button>
                        )}
                        {!loading && value !== null && (
                            <button onClick={handleCopy}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all">
                                {copied ? (
                                    <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12" /></svg>Copied!</>
                                ) : (
                                    <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>Copy</>
                                )}
                            </button>
                        )}
                        {isJson !== null && (
                            <span className="text-xs bg-violet-500/15 text-violet-400 px-2.5 py-1 rounded-full font-medium">JSON</span>
                        )}
                        <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Modal body */}
                <div className="flex-1 flex flex-col overflow-hidden p-6">
                    {loading && (
                        <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
                            <div className="h-5 w-5 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin" />
                            <span className="text-sm">Spawning reader service…</span>
                        </div>
                    )}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
                    )}
                    {!loading && value !== null && (
                        <div className={`json-viewer`}>
                            <style>{`
                                .json-viewer .json-key  { color: #93c5fd; }
                                .json-viewer .json-str  { color: #6ee7b7; }
                                .json-viewer .json-num  { color: #f9a8d4; }
                                .json-viewer .json-bool { color: #fbbf24; }
                            `}</style>
                            <CodeView 
                                value={isConfig ? editValue : displayValue} 
                                onChange={isConfig ? setEditValue : undefined}
                                editable={isConfig}
                                isJson={isJson !== null} 
                                minHeight="300px" 
                                maxHeight="60vh"
                            />
                        </div>
                    )}
                </div>

                {/* Security notice */}
                <div className="px-6 pb-5">
                    <p className="text-xs text-slate-600 text-center">
                        Value retrieved via temporary Alpine service — never stored in database
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function SecretDetailClient({ secret }: { secret: any }) {
    const router = useRouter();

    const [revealVersion, setRevealVersion] = useState<any | null>(null);
    const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);
    const [deletingAll, setDeletingAll] = useState(false);

    const { confirm, toast } = useUI();

    // New-version modal state
    const [showNewVersionModal, setShowNewVersionModal] = useState(false);
    const [newVersionValue, setNewVersionValue] = useState('');
    const [prefilling, setPrefilling] = useState(false);
    const [savingVersion, setSavingVersion] = useState(false);

    const latestVersion = secret.versions.at(-1);

    // ── Delete single version ────────────────────────────────────────────────
    async function handleDeleteVersion(versionId: string) {
        const ok = await confirm({ title: 'Delete Version?', message: 'Delete this version? If it is the last one, the secret will also be deleted.', danger: true });
        if (!ok) return;
        setDeletingVersionId(versionId);
        const res = await deleteSecretVersion(versionId);
        if (!res.success) {
            toast(res.error || 'Failed to delete version', 'error');
        } else if (res.secretDeleted) {
            toast('Secret deleted (last version removed)', 'success');
            router.replace('/');
        } else {
            toast('Version deleted', 'success');
            router.refresh();
        }
        setDeletingVersionId(null);
    }

    // ── Delete entire secret ─────────────────────────────────────────────────
    async function handleDeleteAll() {
        const ok = await confirm({ title: 'Delete Secret?', message: 'Delete this secret AND all its versions permanently?', danger: true });
        if (!ok) return;
        setDeletingAll(true);
        const res = await deleteSecret(secret.id);
        if (!res.success) toast(res.error || 'Failed to delete', 'error');
        else {
            toast('Secret deleted', 'success');
            router.replace('/');
        }
        setDeletingAll(false);
    }

    // ── Open new-version modal, prefill with latest value ───────────────────
    async function openNewVersionModal() {
        setShowNewVersionModal(true);
        setNewVersionValue('');
        if (latestVersion) {
            setPrefilling(true);
            const res = await readSecretValue(latestVersion.id, latestVersion.dockerName);
            if (res.success) setNewVersionValue(res.value || '');
            setPrefilling(false);
        }
    }

    // ── Save new version ─────────────────────────────────────────────────────
    async function handleSaveNewVersion(e: React.FormEvent) {
        e.preventDefault();
        setSavingVersion(true);
        const res = await createSecretVersion(secret.id, newVersionValue);
        if (res.success) {
            toast('New version created!', 'success');
            setShowNewVersionModal(false);
            setNewVersionValue('');
            router.refresh();
        } else {
            toast(res.error || 'Failed to create version', 'error');
        }
        setSavingVersion(false);
    }

    const nextVersionNum = (latestVersion?.version ?? -1) + 1;
    const nextDockerName = latestVersion
        ? latestVersion.dockerName.replace(/--v\d+$/, '') + `--v${nextVersionNum}`
        : secret.name;

    return (
        <>
            {/* Header card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
                <div className="flex items-start justify-between border-b border-slate-800 pb-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`${secret.isConfig ? 'bg-blue-500/10 border-blue-500/20' : 'bg-emerald-500/10 border-emerald-500/20'} p-3 rounded-xl border`}>
                            {secret.isConfig ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white font-mono">{secret.name}</h1>
                            <p className="text-slate-500 text-sm mt-0.5">
                                {secret.versions.length} version{secret.versions.length !== 1 ? 's' : ''} ·
                                {' Created '}
                                <span suppressHydrationWarning>{new Date(secret.createdAt).toLocaleDateString()}</span>
                                {secret.isConfig && <span className="ml-2 bg-blue-500/15 text-blue-400 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">Config</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={openNewVersionModal}
                            className={`${secret.isConfig ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'} text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-lg`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            New Version
                        </button>
                        <button onClick={handleDeleteAll} disabled={deletingAll}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50" title="Delete entire secret">
                            {deletingAll ? (
                                <div className="h-5 w-5 rounded-full border-2 border-slate-500/20 border-t-red-400 animate-spin" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Versions table */}
                <div className="overflow-x-auto rounded-xl border border-slate-800 custom-scrollbar">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-950 border-b border-slate-800">
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Version</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Docker Name</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Created</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...secret.versions].sort((a: any, b: any) => (b.version - a.version) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())).map((v: any) => {
                                const maxVersion = Math.max(...secret.versions.map((version: any) => version.version));
                                const isLatest = v.version === maxVersion;
                                return (
                                    <tr key={v.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isLatest ? (secret.isConfig ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400') : 'bg-slate-700/50 text-slate-400'}`}>
                                                    {versionLabel(v.version)}
                                                </span>
                                                {isLatest && <span className="text-xs text-slate-600">latest</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-slate-300 text-xs">
                                            <button
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    await navigator.clipboard.writeText(v.dockerName);
                                                    toast("Copied Docker name to clipboard!", "success");
                                                }}
                                                className="bg-slate-900/50 hover:bg-slate-800 hover:text-white transition-colors px-2 py-1 rounded text-slate-300 cursor-copy text-left w-auto" title="Copy Docker Name">
                                                {v.dockerName}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs" suppressHydrationWarning>{new Date(v.createdAt).toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setRevealVersion({ ...v, secret })}
                                                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all border border-slate-700/50 hover:border-slate-600"
                                            >
                                                {secret.isConfig ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                )}
                                                {secret.isConfig ? 'View / Edit' : 'Reveal value'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleDeleteVersion(v.id)} disabled={deletingVersionId === v.id}
                                                className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50 opacity-0 group-hover:opacity-100">
                                                {deletingVersionId === v.id ? (
                                                    <div className="h-4 w-4 rounded-full border-2 border-slate-500/20 border-t-red-400 animate-spin" />
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reveal Value Modal */}
            {revealVersion && (
                <RevealModal version={revealVersion} onClose={() => setRevealVersion(null)} />
            )}

            {/* New Version Modal */}
            {showNewVersionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !savingVersion && setShowNewVersionModal(false)} />
                    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <h3 className="text-xl font-bold text-white mb-1">Create New Version</h3>
                        <p className="text-xs text-slate-500 font-mono mb-6">
                            Will be stored as: <span className="text-emerald-400">{nextDockerName}</span>
                        </p>
                        <form onSubmit={handleSaveNewVersion} className="space-y-5 flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                    Secret Value
                                    {prefilling && <span className="ml-2 text-slate-600 normal-case font-normal">Loading previous value…</span>}
                                </label>
                                <CodeView 
                                    value={newVersionValue}
                                    onChange={setNewVersionValue}
                                    editable={true}
                                    disabled={prefilling || savingVersion}
                                    minHeight="300px"
                                    maxHeight="50vh"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowNewVersionModal(false)} disabled={savingVersion}
                                    className="flex-1 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-medium">
                                    Cancel
                                </button>
                                <button disabled={savingVersion || prefilling}
                                    className={`flex-[2] ${secret.isConfig ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'} disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all shadow-lg`}>
                                    {savingVersion ? 'Saving…' : `Save as ${versionLabel(nextVersionNum)}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSecretVersion, readSecretValue } from '@/lib/actions';
import CodeView from './CodeView';

export function versionLabel(v: number) {
    return v === 0 ? 'Initial' : `v${v}`;
}

/** Try to pretty-print JSON; return null if not JSON */
export function tryParseJson(raw: string): string | null {
    try {
        return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
        return null;
    }
}

export interface RevealModalProps {
    version: any;
    onClose: () => void;
}

export function RevealModal({ version, onClose }: RevealModalProps) {
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
                        <div className="json-viewer">
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

'use client'

import { useState } from 'react';
import { readSecretValue } from '@/lib/actions';

export default function RevealSecretButton({ secretId, secretName }: { secretId: string, secretName: string }) {
    const [loading, setLoading] = useState(false);
    const [secretValue, setSecretValue] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleReveal = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await readSecretValue(secretId, secretName);
            if (res.success) {
                setSecretValue(res.value || '');
            } else {
                setError(res.error || 'Failed to reveal secret');
            }
        } catch (e: any) {
            setError(e.message);
        }

        setLoading(false);
    };

    if (secretValue !== null) {
        return (
            <div className="mt-6 p-4 bg-slate-950 border border-slate-800 rounded-xl relative group">
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 flex justify-between items-center">
                    <span>Decrypted Value</span>
                    <button
                        onClick={() => setSecretValue(null)}
                        className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        Hide
                    </button>
                </div>
                <pre className="text-emerald-400 font-mono text-sm whitespace-pre-wrap overflow-x-auto p-4 bg-slate-900 rounded-lg">
                    {secretValue}
                </pre>
            </div>
        );
    }

    return (
        <div className="mt-6 pt-6 border-t border-slate-800">
            <h4 className="text-sm font-semibold text-slate-200 mb-3">Secret Value</h4>
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-xl text-sm mb-4">
                <strong>Warning:</strong> Viewing this secret will temporarily spawn an isolated foreground service to extract the value from Docker Swarm. This will take a few seconds.
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-4">
                    {error}
                </div>
            )}

            <button
                onClick={handleReveal}
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:opacity-50 text-white px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 border border-slate-700/50"
            >
                {loading ? (
                    <>
                        <div className="h-4 w-4 rounded-full border-2 border-slate-400/20 border-t-white animate-spin"></div>
                        Extracting from Swarm...
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        Reveal Value
                    </>
                )}
            </button>
        </div>
    );
}

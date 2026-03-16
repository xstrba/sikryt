'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteSecret } from '@/lib/actions';
import { useUI } from '../providers';

export default function DeleteSecretButton({ id }: { id: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const { confirm, toast } = useUI();

    const handleDelete = async () => {
        const isConfirmed = await confirm({
            title: "Delete Secret",
            message: "Are you sure you want to permanently delete this secret? This action is irreversible.",
            danger: true
        });
        if (!isConfirmed) return;

        setLoading(true);
        const res = await deleteSecret(id);
        if (res.success) {
            toast("Secret deleted successfully", "success");
            router.push('/');
        } else {
            toast(res.error || "Failed to delete secret", "error");
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-4 py-2 rounded-lg border border-red-500/20 hover:border-red-600 transition-all font-medium disabled:opacity-50"
        >
            {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
            )}
            Delete Secret
        </button>
    );
}

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl mb-8 shadow-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                    <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
                </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Access Denied or Page Missing</h1>
            <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
                The resource you are looking for doesn't exist or you don't have the necessary privileges to access it.
            </p>
            <Link
                href="/"
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                Return to Dashboard
            </Link>
        </div>
    );
}

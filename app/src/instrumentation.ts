/**
 * Next.js Instrumentation Hook (runs once when the server starts).
 * This is the recommended way to run background jobs alongside Next.js.
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
    // Only run in the Node.js runtime (not Edge), and only on the server
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { syncSecrets } = await import('./lib/syncService');
        const cron = (await import('node-cron')).default;

        // Run immediately on boot to catch up with any changes while app was offline
        console.log('[instrumentation] Starting initial secret sync...');
        await syncSecrets();

        const interval = process.env.SYNC_INTERVAL || '10';
        const cronExpression = `*/${interval} * * * *`;

        // Then run based on SYNC_INTERVAL
        cron.schedule(cronExpression, () => {
            syncSecrets().catch(err => console.error('[cron] Sync error:', err));
        });

        console.log(`[instrumentation] Secret sync scheduled (every ${interval} minutes).`);
    }
}

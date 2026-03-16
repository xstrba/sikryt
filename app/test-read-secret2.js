const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

async function readSecret(secretId, secretName) {
    const serviceName = `reader-${Date.now()}`;
    const service = await docker.createService({
        Name: serviceName,
        TaskTemplate: {
            ContainerSpec: {
                Image: 'alpine:latest',
                Command: ['sh', '-c', `cat /run/secrets/${secretName}`],
                Secrets: [
                    {
                        SecretName: secretName,
                        SecretID: secretId,
                        File: {
                            Name: secretName,
                            UID: '0',
                            GID: '0',
                            Mode: 292
                        }
                    }
                ]
            },
            RestartPolicy: { Condition: 'none' }
        }
    });

    let logs = '';
    while (true) {
        const tasks = await docker.listTasks({ filters: { service: [serviceName] } });
        if (tasks.length > 0 && ['complete', 'failed', 'rejected'].includes(tasks[0].Status.State)) {
             try {
                const stream = await service.logs({ stdout: true, stderr: true });
                logs = stream.toString('utf8');
                // parse out docker multiplex header
                logs = logs.replace(/^[\u0000-\u0007].{7}/gm, '').trim();
             } catch(e) { console.error(e) }
             break;
        }
        await new Promise(r => setTimeout(r, 500));
    }
    await service.remove();
    console.log("Extracted:", logs);
}

docker.listSecrets().then(secrets => {
    if (secrets.length > 0) {
        readSecret(secrets[0].ID, secrets[0].Spec.Name);
    }
});

const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

async function readSecret(secretId, secretName) {
    const serviceName = `reader-${Date.now()}`;
    console.log("Creating service", serviceName);
    const service = await docker.createService({
        Name: serviceName,
        TaskTemplate: {
            ContainerSpec: {
                Image: 'alpine:latest',
                Command: ['cat', `/run/secrets/${secretName}`],
                Secrets: [
                    {
                        SecretID: secretId,
                        SecretName: secretName,
                        File: {
                            Name: secretName,
                            UID: '0',
                            GID: '0',
                            Mode: 292
                        }
                    }
                ]
            },
            RestartPolicy: {
                Condition: 'none'
            }
        }
    });

    console.log("Service created");
    
    // poll for task completion
    let logs = '';
    while (true) {
        const tasks = await docker.listTasks({ filters: { service: [serviceName] } });
        if (tasks.length > 0) {
            const task = tasks[0];
            if (task.Status.State === 'complete') {
                console.log("Task complete");
                // The logs need to be fetched from the service or task
                const stream = await docker.getService(service.id).logs({ stdout: true, stderr: true });
                logs = stream.toString('utf8');
                break;
            } else if (task.Status.State === 'failed' || task.Status.State === 'rejected') {
                console.log("Task failed", task.Status);
                break;
            }
        }
        await new Promise(r => setTimeout(r, 500));
    }
    
    await docker.getService(service.id).remove();
    console.log("Service removed. Value:");
    console.log(logs);
}

// Find a secret
docker.listSecrets().then(secrets => {
    if (secrets.length > 0) {
        readSecret(secrets[0].ID, secrets[0].Spec.Name);
    } else {
        console.log("No secrets found");
    }
});

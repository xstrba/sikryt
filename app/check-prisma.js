
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Prisma Model Exploration ---');
  
  // Try to find a secret and log its keys
  try {
    const one = await prisma.secret.findFirst();
    if (one) {
        console.log('Actual Secret object keys:', Object.keys(one).join(', '));
    } else {
        console.log('No secrets found in DB to inspect.');
    }
  } catch (e) {
    console.log('Error fetching secret:', e.message);
  }

  // Check the model definition in the client
  try {
    const model = prisma._runtimeDataModel.models.Secret;
    if (model) {
        const fieldNames = Object.keys(model.fields);
        console.log('Model "Secret" fields in client:', fieldNames.join(', '));
    }
  } catch (e) {
    // Fallback if internal structure is different
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

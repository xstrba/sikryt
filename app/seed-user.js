const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    const password = process.argv[3];
    const nickname = process.argv[4] || email;
    const name = process.argv[5] || 'Administrator';
    const role = process.argv[6] === 'admin' ? 'ADMIN' : 'USER';

    if (!email || !password) {
        console.log('Usage: node seed-user.js <email> <password> [nickname] [name] [admin]');
        process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: { password: hashedPassword, nickname, name, role },
            create: {
                email,
                nickname,
                password: hashedPassword,
                name,
                role,
            },
        });

        console.log(`User ${user.email} created/updated successfully.`);
    } catch (error) {
        console.error('Error creating user:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

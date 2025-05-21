import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

export async function runMigrate() {
  console.log("⏳ Running migrations with Prisma...");

  const start = Date.now();

  try {
    // Exécute la commande prisma migrate deploy
    await execAsync('npx prisma migrate deploy');
    
    const end = Date.now();
    console.log(`✅ Migrations completed in ${end - start}ms`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed");
    console.error(error);
    process.exit(1);
  }
}

// En ES modules, on vérifie si le fichier en cours d'exécution est le main module
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  runMigrate().catch((err) => {
    console.error("❌ Migration failed");
    console.error(err);
    process.exit(1);
  });
} 
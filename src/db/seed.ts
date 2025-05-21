import { prisma } from './index';
import { seedTasks } from "@/app/_lib/seeds";
import { fileURLToPath } from 'url';

async function runSeed() {
  console.log("⏳ Running seed with Prisma...");

  const start = Date.now();

  await seedTasks({ count: 100 });

  const end = Date.now();

  console.log(`✅ Seed completed in ${end - start}ms`);

  process.exit(0);
}

// En ES modules, on vérifie si le fichier en cours d'exécution est le main module
// à l'aide du métadata import.meta.url
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  runSeed().catch((err) => {
    console.error("❌ Seed failed");
    console.error(err);
    process.exit(1);
  });
} 
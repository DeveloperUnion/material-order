import { execSync } from 'child_process';
import { tenantConfigs } from '../lib/tenant/config';

async function migrateAllTenants() {
  console.log('🚀 Starting migrations for all tenants...\n');

  const tenants = Object.values(tenantConfigs);
  let successCount = 0;
  let failCount = 0;

  for (const tenant of tenants) {
    // Direct URLを優先（マイグレーションにはpgbouncer経由でないURLが必要）
    const directEnvKey = `${tenant.envPrefix}_DIRECT_URL`;
    const dbEnvKey = `${tenant.envPrefix}_DATABASE_URL`;
    const directUrl = process.env[directEnvKey] || process.env[dbEnvKey];

    if (!directUrl) {
      console.log(`⚠️  [${tenant.id}] Skipped - ${directEnvKey} or ${dbEnvKey} not set`);
      continue;
    }

    const urlType = process.env[directEnvKey] ? 'DIRECT_URL' : 'DATABASE_URL';
    console.log(`📦 [${tenant.id}] Running migration using ${urlType}...`);

    try {
      execSync('npx prisma migrate deploy', {
        env: {
          ...process.env,
          DATABASE_URL: directUrl,
        },
        stdio: 'inherit',
      });
      console.log(`✅ [${tenant.id}] Migration completed\n`);
      successCount++;
    } catch (error) {
      console.error(`❌ [${tenant.id}] Migration failed\n`);
      failCount++;
    }
  }

  console.log('─'.repeat(40));
  console.log(`📊 Results: ${successCount} succeeded, ${failCount} failed`);

  if (failCount > 0) {
    process.exit(1);
  }
}

migrateAllTenants();

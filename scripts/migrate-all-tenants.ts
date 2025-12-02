import { execSync } from 'child_process';
import { tenantConfigs, getTenantsByDeployEnv, DeployEnv } from '../lib/tenant/config';

async function migrateAllTenants() {
  // DEPLOY_ENV で対象テナントを決定
  // staging: development テナントのみ
  // production: auth_client, oken テナント
  // 未設定: 全テナント
  const deployEnv = process.env.DEPLOY_ENV as DeployEnv | undefined;

  const tenants = deployEnv
    ? getTenantsByDeployEnv(deployEnv)
    : Object.values(tenantConfigs);

  console.log(`🚀 Starting migrations for ${deployEnv || 'all'} tenants...\n`);
  console.log(`📋 Target tenants: ${tenants.map(t => t.id).join(', ')}\n`);

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

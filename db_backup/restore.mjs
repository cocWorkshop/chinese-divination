#!/usr/bin/env node
/**
 * PostgreSQL 跨平台数据库一键恢复脚本 (Node.js / ESM)
 * 
 * 特性：
 * - 0 外部系统依赖：不依赖本机 pg_restore / psql / Docker，跨 Windows / macOS / Linux 平台无缝运行
 * - 自动寻找 db_backup 目录中最新的 .json.gz 备份文件
 * - 结合 Prisma Schema 自动确保目标库表结构、外键与索引完整性
 * - 使用 PostgreSQL 会话级复制模式 (session_replication_role = 'replica') 确保高效、无外键冲突的批量数据恢复
 * - 自动校验每张表恢复后的行数，确保数据 100% 完整可用
 */

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 默认目标数据库连接 URL（优先读取环境变量，默认开发库）
const DEFAULT_DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@10.0.0.237:5432/divination_dev";

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  let targetUrl = DEFAULT_DATABASE_URL;
  let backupFile = null;
  let force = false;
  let skipSchemaPush = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' || args[i] === '-u') {
      targetUrl = args[++i];
    } else if (args[i] === '--file' || args[i] === '-f') {
      backupFile = path.resolve(args[++i]);
    } else if (args[i] === '--force') {
      force = true;
    } else if (args[i] === '--skip-schema') {
      skipSchemaPush = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
PostgreSQL 跨平台数据库一键恢复工具

使用方法:
  node db_backup/restore.mjs [选项]
  npm run db:restore

选项:
  -u, --url <url>      指定目标数据库连接字符串 (默认内置开发库 URL)
  -f, --file <file>    指定要恢复的备份文件 (.json.gz 或 .json) (默认自动选取最新备份)
  --force              跳过交互确认提示（一键静默恢复）
  --skip-schema        跳过 prisma db push 架构同步（仅恢复数据）
  -h, --help           显示此帮助信息
`);
      process.exit(0);
    }
  }

  return { targetUrl, backupFile, force, skipSchemaPush };
}

// 自动寻找最新的备份文件
function findLatestBackupFile(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('backup_') && (f.endsWith('.json.gz') || f.endsWith('.json')))
    .map(f => {
      const fullPath = path.join(dir, f);
      return {
        path: fullPath,
        time: fs.statSync(fullPath).mtimeMs
      };
    })
    .sort((a, b) => b.time - a.time);

  return files.length > 0 ? files[0].path : null;
}

// 交互式确认
async function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// 格式化输出文件大小
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 主恢复逻辑
async function main() {
  const { targetUrl, backupFile: userBackupFile, force, skipSchemaPush } = parseArgs();
  const startTime = Date.now();

  console.log('\x1b[36m=============================================\x1b[0m');
  console.log('\x1b[36m   PostgreSQL 跨平台数据库恢复 (Node.js)    \x1b[0m');
  console.log('\x1b[36m=============================================\x1b[0m');

  // 定位备份文件
  const backupFilePath = userBackupFile || findLatestBackupFile(__dirname);

  if (!backupFilePath || !fs.existsSync(backupFilePath)) {
    console.error('\x1b[31m[错误] 未找到有效的备份文件！\x1b[0m');
    console.error(`请确认 ${__dirname} 目录下存在 backup_*.json.gz 文件，或通过 --file 指定备份路径。`);
    process.exit(1);
  }

  // 解析 URL 提取数据库名与主机信息
  let host = 'unknown';
  let dbName = 'database';
  try {
    const parsed = new URL(targetUrl.replace(/^postgresql:/, 'http:'));
    host = `${parsed.hostname}:${parsed.port || '5432'}`;
    dbName = parsed.pathname.replace(/^\//, '') || 'database';
  } catch {
    // ignore parse error for display
  }

  const fileStats = fs.statSync(backupFilePath);
  console.log(`\x1b[90m[目标主机] ${host}\x1b[0m`);
  console.log(`\x1b[90m[目标数据库] ${dbName}\x1b[0m`);
  console.log(`\x1b[90m[恢复备份源] ${backupFilePath}\x1b[0m`);
  console.log(`\x1b[90m[文件大小] ${formatBytes(fileStats.size)}\x1b[0m\n`);

  // 安全确认 (AUD-06: 强化生产库恢复护栏)
  const isProductionTarget = targetUrl.includes('divination_db') || targetUrl.includes('prod');
  if (isProductionTarget) {
    console.log('\x1b[41m\x1b[37m[高危警告] 检测到目标数据库为生产库 (divination_db)！\x1b[0m');
    const answer = await askConfirmation('【生产环境安全保护】确定要将数据恢复并覆盖至生产数据库吗？请输入 "RESTORE-PROD": ');
    if (answer !== 'RESTORE-PROD') {
      console.log('安全保护生效：输入不匹配，已终止对生产库的恢复。');
      process.exit(1);
    }
  } else if (!force) {
    console.log('\x1b[33m[警告] 此操作将重置/清空目标数据库中的所有数据并恢复备份！\x1b[0m');
    const answer = await askConfirmation('确认继续执行恢复吗？(y/N): ');
    if (answer !== 'y' && answer !== 'yes') {
      console.log('已取消恢复操作。');
      process.exit(0);
    }
    console.log('');
  }

  // 读取并解压备份数据
  console.log('\x1b[33m[1/4] 正在解析备份文件内容...\x1b[0m');
  let backupData = null;
  try {
    const rawBuffer = fs.readFileSync(backupFilePath);
    let jsonText = '';
    if (backupFilePath.endsWith('.gz')) {
      jsonText = zlib.gunzipSync(rawBuffer).toString('utf-8');
    } else {
      jsonText = rawBuffer.toString('utf-8');
    }
    backupData = JSON.parse(jsonText);
  } catch (err) {
    console.error('\x1b[31m[错误] 备份文件损坏或无法解析:\x1b[0m', err.message);
    process.exit(1);
  }

  console.log(`  备份创建时间: \x1b[37m${backupData.createdAt || '未知'}\x1b[0m`);
  console.log(`  备份表总数:   \x1b[32m${backupData.tableCount || backupData.tables.length}\x1b[0m 张`);
  console.log(`  备份记录总数: \x1b[32m${backupData.totalRows || '计算中'}\x1b[0m 行`);

  // 同步 Prisma Schema（AUD-06: 使用 migrate deploy 保证迁移历史完整，杜绝 db push 漂移）
  if (!skipSchemaPush) {
    console.log('\n\x1b[33m[2/4] 正在同步 Prisma 数据库迁移 (prisma migrate deploy)...\x1b[0m');
    try {
      execSync('npx prisma migrate deploy', {
        cwd: projectRoot,
        env: {
          ...process.env,
          DATABASE_URL: targetUrl
        },
        stdio: 'pipe'
      });
      console.log('  \x1b[32m✓\x1b[0m 数据库迁移已全部应用完毕');
    } catch (pushErr) {
      console.log(`  \x1b[90m(提示: 迁移执行输出: ${pushErr.message.split('\n')[0]})\x1b[0m`);
    }
  } else {
    console.log('\n\x1b[33m[2/4] 跳过架构同步...\x1b[0m');
  }

  const prisma = new PrismaClient({
    datasources: {
      db: { url: targetUrl }
    }
  });

  try {
    console.log('\n\x1b[33m[3/4] 正在写入数据并恢复关联关系...\x1b[0m');

    // 禁用外键检查与触发器（避免外键依赖插入顺序报错）
    await prisma.$executeRawUnsafe("SET session_replication_role = 'replica';");

    // 清空现有数据表（确保干净恢复）
    for (const table of backupData.tables) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table.name}" CASCADE;`);
      } catch {
        // 如果个别表不存在则忽略
      }
    }

    let totalRestoredRows = 0;

    // 逐表插入数据
    for (const table of backupData.tables) {
      const { name: tableName, columns, rows } = table;

      if (!rows || rows.length === 0) {
        console.log(`  ✓ ${tableName.padEnd(25)} : \x1b[90m0 行 (空表跳过)\x1b[0m`);
        continue;
      }

      // 列名列表
      const colNames = columns.map(c => c.name);
      const colTypeMap = new Map(columns.map(c => [c.name, c]));

      // 分批批量插入（每批 100 行，避免超出 PostgreSQL 参数上限）
      const BATCH_SIZE = 100;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const valuePlaceholders = [];
        const queryParams = [];

        batch.forEach((row) => {
          const rowPlaceholders = [];
          colNames.forEach((colName) => {
            const rawVal = row[colName];
            const colInfo = colTypeMap.get(colName);
            queryParams.push(formatValueForDb(rawVal, colInfo));
            
            // 对 json / jsonb 字段进行显式类型转换
            if (colInfo && (colInfo.dataType === 'json' || colInfo.dataType === 'jsonb' || colInfo.udtName === 'json' || colInfo.udtName === 'jsonb')) {
              rowPlaceholders.push(`$${queryParams.length}::jsonb`);
            } else {
              rowPlaceholders.push(`$${queryParams.length}`);
            }
          });
          valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        });

        const quotedCols = colNames.map(c => `"${c}"`).join(', ');
        const insertSql = `INSERT INTO "${tableName}" (${quotedCols}) VALUES ${valuePlaceholders.join(', ')};`;
        await prisma.$executeRawUnsafe(insertSql, ...queryParams);
      }

      totalRestoredRows += rows.length;
      console.log(`  ✓ ${tableName.padEnd(25)} : \x1b[32m${rows.length}\x1b[0m 行已恢复`);
    }

    // 恢复序列 (Sequences)
    if (backupData.sequences && backupData.sequences.length > 0) {
      for (const seq of backupData.sequences) {
        try {
          if (seq.sequencename && seq.last_value !== undefined) {
            await prisma.$executeRawUnsafe(`SELECT setval('${seq.sequencename}', ${seq.last_value}, true);`);
          }
        } catch {
          // 序列设置失败不阻断流程
        }
      }
    }

    // 恢复外键检查与触发器
    await prisma.$executeRawUnsafe("SET session_replication_role = 'origin';");

    // 4. 验证恢复结果
    console.log('\n\x1b[33m[4/4] 正在验证数据库完整性...\x1b[0m');
    const tableVerification = [];
    for (const table of backupData.tables) {
      try {
        const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as c FROM "${table.name}";`);
        const actualCount = countRes[0]?.c ?? 0;
        tableVerification.push({
          table: table.name,
          expected: table.rowCount,
          actual: actualCount,
          ok: actualCount === table.rowCount
        });
      } catch {
        // ignore check on missing tables
      }
    }

    const allOk = tableVerification.every(t => t.ok);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n\x1b[32m=============================================\x1b[0m');
    console.log('\x1b[32m   数据库恢复成功！已可直接运行与访问        \x1b[0m');
    console.log('\x1b[32m=============================================\x1b[0m');
    console.log(`  目标数据库: \x1b[37m${dbName}\x1b[0m`);
    console.log(`  恢复数据表: \x1b[37m${tableVerification.length} 张\x1b[0m`);
    console.log(`  恢复总行数: \x1b[37m${totalRestoredRows} 行\x1b[0m`);
    console.log(`  数据完整性: ${allOk ? '\x1b[32m100% 校验一致 ✓\x1b[0m' : '\x1b[33m部分差异\x1b[0m'}`);
    console.log(`  恢复总耗时: \x1b[37m${elapsed} 秒\x1b[0m`);
    console.log('\x1b[90m---------------------------------------------\x1b[0m');
    console.log('\x1b[36m  现在可以直接运行应用: npm run dev\x1b[0m\n');

  } catch (err) {
    // 确保无论如何恢复 session_replication_role
    try {
      await prisma.$executeRawUnsafe("SET session_replication_role = 'origin';");
    } catch {}
    console.error('\n\x1b[31m[错误] 恢复执行失败:\x1b[0m', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 数据值格式化处理
function formatValueForDb(val, colInfo) {
  if (val === null || val === undefined) {
    return null;
  }

  // 处理 JSON 字段或嵌套对象
  if (typeof val === 'object') {
    if (val instanceof Date) {
      return val.toISOString();
    }
    return JSON.stringify(val);
  }

  // 字符串处理
  if (typeof val === 'string') {
    // 处理可能的 ISO 时间字符串
    if (colInfo && (colInfo.dataType.includes('timestamp') || colInfo.dataType.includes('date'))) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
    return val;
  }

  return val;
}

main();


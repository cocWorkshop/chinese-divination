#!/usr/bin/env node
/**
 * PostgreSQL 跨平台数据库备份脚本 (Node.js / ESM)
 * 
 * 特性：
 * - 0 外部系统依赖：不依赖本机 pg_dump / Docker，跨 Windows / macOS / Linux 平台无缝运行
 * - 使用项目自带的 @prisma/client 原生连接数据库
 * - 导出为高压缩比的 .json.gz 文件（保存在 db_backup 目录下）
 * - 支持所有数据类型：JSONB, DateTime, BigInt, Text, Boolean, Null, Sequences 等
 */

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 默认数据库连接 URL（直接内置，不直接引用 .env）
const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@10.0.0.237:5432/divination_db";

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  let databaseUrl = DEFAULT_DATABASE_URL;
  let outputDir = __dirname;
  let uncompressed = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' || args[i] === '-u') {
      databaseUrl = args[++i];
    } else if (args[i] === '--out' || args[i] === '-o') {
      outputDir = path.resolve(args[++i]);
    } else if (args[i] === '--uncompressed') {
      uncompressed = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
PostgreSQL 跨平台数据库备份工具

使用方法:
  node db_backup/backup.mjs [选项]
  npm run db:backup

选项:
  -u, --url <url>      指定数据库连接字符串 (默认内置开发库 URL)
  -o, --out <dir>      指定备份文件输出目录 (默认: db_backup)
  --uncompressed       输出未压缩的 .json 格式 (默认输出 .json.gz)
  -h, --help           显示此帮助信息
`);
      process.exit(0);
    }
  }

  return { databaseUrl, outputDir, uncompressed };
}

// 格式化输出文件大小
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 主备份逻辑
async function main() {
  const { databaseUrl, outputDir, uncompressed } = parseArgs();
  const startTime = Date.now();

  console.log('\x1b[36m=============================================\x1b[0m');
  console.log('\x1b[36m   PostgreSQL 跨平台数据库备份 (Node.js)    \x1b[0m');
  console.log('\x1b[36m=============================================\x1b[0m');

  // 解析 URL 提取数据库名与主机信息
  let host = 'unknown';
  let dbName = 'database';
  try {
    const parsed = new URL(databaseUrl.replace(/^postgresql:/, 'http:'));
    host = `${parsed.hostname}:${parsed.port || '5432'}`;
    dbName = parsed.pathname.replace(/^\//, '') || 'database';
  } catch {
    // ignore parse error for display
  }

  console.log(`\x1b[90m[目标主机] ${host}\x1b[0m`);
  console.log(`\x1b[90m[数据库名] ${dbName}\x1b[0m`);
  console.log(`\x1b[90m[存储目录] ${outputDir}\x1b[0m\n`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl }
    }
  });

  try {
    console.log('\x1b[33m[1/3] 正在连接数据库并扫描表结构...\x1b[0m');

    // 1. 获取 public schema 下的所有表（包括 _prisma_migrations）
    const tablesResult = await prisma.$queryRawUnsafe(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename ASC;
    `);

    const tableNames = tablesResult.map(r => r.tablename);
    console.log(`  找到 \x1b[32m${tableNames.length}\x1b[0m 张数据表`);

    // 2. 获取所有表中的数据和字段元数据
    console.log('\n\x1b[33m[2/3] 正在提取数据行与字段类型...\x1b[0m');
    const tablesData = [];
    let totalRowsCount = 0;

    for (const tableName of tableNames) {
      // 获取列元数据
      const columnsMeta = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type, udt_name, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position ASC;
      `, tableName);

      // 查询全表数据
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}";`);
      totalRowsCount += rows.length;

      tablesData.push({
        name: tableName,
        columns: columnsMeta.map(c => ({
          name: c.column_name,
          dataType: c.data_type,
          udtName: c.udt_name,
          isNullable: c.is_nullable === 'YES'
        })),
        rowCount: rows.length,
        rows: rows
      });

      console.log(`  ✓ ${tableName.padEnd(25)} : \x1b[32m${rows.length}\x1b[0m 行`);
    }

    // 3. 获取所有序列状态 (Sequences)
    let sequences = [];
    try {
      sequences = await prisma.$queryRawUnsafe(`
        SELECT sequencename, last_value 
        FROM pg_sequences 
        WHERE schemaname = 'public';
      `);
    } catch {
      // 部分旧版 postgres 可能无 pg_sequences，忽略
    }

    // 4. 构建备份数据包
    console.log('\n\x1b[33m[3/3] 正在打包并写入备份文件...\x1b[0m');
    const now = new Date();
    const timestampStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const backupPayload = {
      version: '1.0.0',
      createdAt: now.toISOString(),
      database: dbName,
      tableCount: tableNames.length,
      totalRows: totalRowsCount,
      tables: tablesData,
      sequences: sequences
    };

    // 自定义序列化，安全支持 BigInt / Date / Buffer
    const jsonString = JSON.stringify(backupPayload, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }, 2);

    let outputFilePath = '';
    let finalSize = 0;

    if (uncompressed) {
      outputFilePath = path.join(outputDir, `backup_${dbName}_${timestampStr}.json`);
      fs.writeFileSync(outputFilePath, jsonString, 'utf-8');
      finalSize = fs.statSync(outputFilePath).size;
    } else {
      outputFilePath = path.join(outputDir, `backup_${dbName}_${timestampStr}.json.gz`);
      const gzippedBuffer = zlib.gzipSync(Buffer.from(jsonString, 'utf-8'), { level: 9 });
      fs.writeFileSync(outputFilePath, gzippedBuffer);
      finalSize = gzippedBuffer.length;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n\x1b[32m=============================================\x1b[0m');
    console.log('\x1b[32m   备份成功完成！                            \x1b[0m');
    console.log('\x1b[32m=============================================\x1b[0m');
    console.log(`  文件路径: \x1b[37m${outputFilePath}\x1b[0m`);
    console.log(`  数据表数: \x1b[37m${tableNames.length} 张\x1b[0m`);
    console.log(`  总记录数: \x1b[37m${totalRowsCount} 行\x1b[0m`);
    console.log(`  文件大小: \x1b[37m${formatBytes(finalSize)}\x1b[0m`);
    console.log(`  总耗时:   \x1b[37m${elapsed} 秒\x1b[0m`);
    console.log('\x1b[90m---------------------------------------------\x1b[0m');
    console.log('\x1b[36m[提示] 可通过以下命令一键将此备份恢复至数据库：\x1b[0m');
    console.log(`  \x1b[33mnpm run db:restore\x1b[0m 或 \x1b[33mnode db_backup/restore.mjs --file "${outputFilePath}"\x1b[0m\n`);

  } catch (err) {
    console.error('\n\x1b[31m[错误] 备份执行失败:\x1b[0m', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


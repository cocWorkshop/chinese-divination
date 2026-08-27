# 数据库备份与恢复指南 (Database Backup & Restore Guide)

本项目提供了一套**纯 Node.js 实现、零外部系统依赖、全跨平台（Windows / macOS / Linux）**的 PostgreSQL 数据库一键备份与恢复工具。

无需在宿主机安装 PostgreSQL 客户端（`pg_dump` / `psql` / `pg_restore`），也不强制要求运行 Docker，只要安装了项目依赖即可开箱即用。

---

## 快速上手 (Quick Start)

在项目根目录下通过 `npm` 指令即可执行：

### 1. 备份数据库 (Backup)

将当前开发数据库导出为经过 Gzip 高度压缩的数据包（保存于 `db_backup/` 目录下）：

```bash
npm run db:backup
```

* 默认连接数据库：`postgresql://postgres:postgres@10.0.0.237:5432/divination_dev`
* 生成文件命名规则：`db_backup/backup_<数据库名>_<YYYYMMDD_HHMMSS>.json.gz`

### 2. 恢复数据库 (Restore)

将备份文件一键还原至目标数据库。脚本会自动选取 `db_backup/` 目录下**最新的一份备份文件**进行还原：

```bash
# 方式 1：标准恢复（带交互确认提示，防止误操作）
npm run db:restore

# 方式 2：静默一键恢复（跳过确认，适合脚本/自动化环境）
npm run db:restore -- --force
```

恢复完成后，即可直接启动开发服务：
```bash
npm run dev
```

---

## 目录结构说明

```text
chinese-divination/
├── db_backup/
│   ├── backup.mjs        # 跨平台备份主脚本 (Node.js ESM)
│   ├── restore.mjs       # 跨平台恢复主脚本 (Node.js ESM)
│   └── backup_*.json.gz  # 导出的备份文件 (已在 .gitignore 中自动忽略)
└── contribution/
    └── README.md         # 本文档
```
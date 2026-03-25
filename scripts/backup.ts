import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || 'data/assistant.db';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const BACKUP_DIR = 'data/backups';
const BACKUP_KEEP = parseInt(process.env.BACKUP_KEEP || process.argv[2] || '7', 10);

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return 0;
  ensureDir(dest);
  let count = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDirSize(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let size = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += getDirSize(entryPath);
    } else {
      size += fs.statSync(entryPath).size;
    }
  }
  return size;
}

// --- Main ---
console.log(`Backup starting at ${new Date().toISOString()}`);
console.log(`  Database: ${DB_PATH}`);
console.log(`  Uploads:  ${UPLOAD_DIR}`);
console.log(`  Keep last: ${BACKUP_KEEP} backups\n`);

const backupSubDir = path.join(BACKUP_DIR, `backup-${timestamp}`);
ensureDir(backupSubDir);

// 1. SQLite backup using better-sqlite3's .backup() API (WAL-safe, no external deps)
if (!fs.existsSync(DB_PATH)) {
  console.error(`ERROR: Database not found at ${DB_PATH}`);
  process.exit(1);
}

const dbBackupPath = path.join(backupSubDir, 'assistant.db');
const source = new Database(DB_PATH, { readonly: true });
await source.backup(dbBackupPath);
source.close();
const dbSize = fs.statSync(dbBackupPath).size;
console.log(`  [OK] Database backed up (${formatBytes(dbSize)})`);

// 2. Copy uploads directory
const uploadsBackupDir = path.join(backupSubDir, 'uploads');
const fileCount = copyDirRecursive(UPLOAD_DIR, uploadsBackupDir);
const uploadsSize = getDirSize(uploadsBackupDir);
console.log(`  [OK] Uploads backed up (${fileCount} files, ${formatBytes(uploadsSize)})`);

// 3. Rotate old backups
const allBackups = fs.readdirSync(BACKUP_DIR)
  .filter(name => name.startsWith('backup-'))
  .sort()
  .reverse();

let removed = 0;
for (const old of allBackups.slice(BACKUP_KEEP)) {
  fs.rmSync(path.join(BACKUP_DIR, old), { recursive: true });
  removed++;
}
if (removed > 0) {
  console.log(`  [OK] Rotated ${removed} old backup(s)`);
}

// 4. Summary
const totalSize = getDirSize(backupSubDir);
console.log(`\nBackup complete: ${backupSubDir}`);
console.log(`  Total size: ${formatBytes(totalSize)}`);
console.log(`  Backups on disk: ${Math.min(allBackups.length, BACKUP_KEEP)}`);

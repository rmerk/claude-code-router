#!/usr/bin/env node

/**
 * Ollama Model Management System
 * Automated model updates, cleanup, and maintenance
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions
interface ModelConfig {
  required: string[];
  optional: string[];
  experimental: string[];
}

interface ManagerConfig {
  maxDiskUsage: number;
  retentionDays: number;
  autoUpdate: boolean;
  autoBackup: boolean;
  models: ModelConfig;
}

interface ModelInfo {
  name: string;
  size: number;
  modified: Date;
  path: string;
}

class OllamaModelManager {
  private ollamaPath: string;
  private modelsDir: string;
  private backupDir: string;
  private config: ManagerConfig;

  constructor() {
    this.ollamaPath = this.findOllamaPath();
    this.modelsDir = path.join(os.homedir(), '.ollama', 'models');
    this.backupDir = path.join(os.homedir(), '.ollama', 'backups');
    this.config = {
      maxDiskUsage: 50 * 1024 * 1024 * 1024, // 50GB
      retentionDays: 30,
      autoUpdate: true,
      autoBackup: true,
      models: {
        required: ['llama3.2:latest', 'qwen2.5-coder:latest'],
        optional: ['deepseek-coder-v2:latest'],
        experimental: []
      }
    };
  }

  findOllamaPath(): string {
    // Try to find ollama executable
    const paths = [
      '/opt/homebrew/bin/ollama',
      '/usr/local/bin/ollama',
      '/usr/bin/ollama',
      'ollama' // In PATH
    ];

    for (const p of paths) {
      try {
        execSync(`${p} --version`, { stdio: 'pipe' });
        return p;
      } catch (e) {
        continue;
      }
    }

    throw new Error('Ollama executable not found. Please install Ollama first.');
  }

  async checkOllamaStatus() {
    try {
      const result = execSync(`${this.ollamaPath} list`, { encoding: 'utf8' });
      console.log('✅ Ollama is running and accessible');
      return true;
    } catch (error) {
      console.log('❌ Ollama is not accessible:', error.message);
      return false;
    }
  }

  async listInstalledModels() {
    try {
      const result = execSync(`${this.ollamaPath} list`, { encoding: 'utf8' });
      const lines = result.trim().split('\n').slice(1); // Skip header

      const models = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          name: parts[0],
          id: parts[1],
          size: parts[2],
          modified: parts.slice(3).join(' ')
        };
      });

      console.log(`📦 Installed models: ${models.length}`);
      models.forEach(model => {
        console.log(`  • ${model.name} (${model.size})`);
      });

      return models;
    } catch (error) {
      console.error('Failed to list models:', error.message);
      return [];
    }
  }

  async pullModel(modelName, force = false) {
    console.log(`📥 Pulling model: ${modelName}`);

    // Check if model already exists
    const installedModels = await this.listInstalledModels();
    const exists = installedModels.some(model => model.name === modelName);

    if (exists && !force) {
      console.log(`ℹ️  Model ${modelName} already exists. Use --force to re-download.`);
      return true;
    }

    try {
      // Use spawn for better progress tracking
      const child = spawn(this.ollamaPath, ['pull', modelName], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      return new Promise((resolve, reject) => {
        child.stdout.on('data', (data) => {
          process.stdout.write(data.toString());
        });

        child.stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });

        child.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Successfully pulled ${modelName}`);
            resolve(true);
          } else {
            console.error(`❌ Failed to pull ${modelName} (exit code: ${code})`);
            resolve(false);
          }
        });

        child.on('error', (error) => {
          console.error(`❌ Error pulling ${modelName}:`, error.message);
          reject(error);
        });
      });
    } catch (error) {
      console.error(`❌ Failed to pull ${modelName}:`, error.message);
      return false;
    }
  }

  async updateModels() {
    console.log('🔄 Checking for model updates...');

    const installedModels = await this.listInstalledModels();
    const requiredModels = this.config.models.required;
    const optionalModels = this.config.models.optional;

    console.log('\n📋 Required Models:');
    for (const model of requiredModels) {
      const installed = installedModels.some(m => m.name === model);
      const status = installed ? '✅' : '❌';

      if (!installed) {
        console.log(`  ${status} ${model} - Pulling...`);
        await this.pullModel(model);
      } else {
        console.log(`  ${status} ${model} - Already installed`);
      }
    }

    console.log('\n📋 Optional Models:');
    for (const model of optionalModels) {
      const installed = installedModels.some(m => m.name === model);
      const status = installed ? '✅' : '❌';

      if (!installed) {
        console.log(`  ${status} ${model} - Available (run: node model-manager.js pull ${model})`);
      } else {
        console.log(`  ${status} ${model} - Already installed`);
      }
    }
  }

  async cleanupOldModels() {
    console.log('🧹 Cleaning up old/unused models...');

    try {
      const installedModels = await this.listInstalledModels();

      if (installedModels.length === 0) {
        console.log('No models to clean up');
        return;
      }

      // Keep only required models and recently used ones
      const keepModels = new Set(this.config.models.required);

      // Check disk usage
      const diskUsage = await this.getDiskUsage();
      console.log(`💾 Current disk usage: ${this.formatBytes(diskUsage)}`);

      if (diskUsage > this.config.maxDiskUsage) {
        console.log(`⚠️  Disk usage exceeds limit (${this.formatBytes(this.config.maxDiskUsage)})`);

        // Remove optional models if disk usage is high
        for (const model of this.config.models.optional) {
          if (diskUsage > this.config.maxDiskUsage && !keepModels.has(model)) {
            console.log(`🗑️  Removing optional model: ${model}`);
            await this.removeModel(model);
          }
        }
      }

      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  async removeModel(modelName) {
    try {
      console.log(`🗑️  Removing model: ${modelName}`);
      execSync(`${this.ollamaPath} rm ${modelName}`, { stdio: 'inherit' });
      console.log(`✅ Removed ${modelName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to remove ${modelName}:`, error.message);
      return false;
    }
  }

  async getDiskUsage() {
    try {
      if (fs.existsSync(this.modelsDir)) {
        const getDirSize = (dirPath) => {
          let totalSize = 0;

          const items = fs.readdirSync(dirPath);
          for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
              totalSize += getDirSize(itemPath);
            } else {
              totalSize += stats.size;
            }
          }

          return totalSize;
        };

        return getDirSize(this.modelsDir);
      }
      return 0;
    } catch (error) {
      console.error('Failed to get disk usage:', error.message);
      return 0;
    }
  }

  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  async backupModels() {
    console.log('💾 Creating model backup...');

    try {
      // Ensure backup directory exists
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `ollama-backup-${timestamp}`);

      // Copy models directory
      await this.copyDirectory(this.modelsDir, backupPath);

      console.log(`✅ Backup created: ${backupPath}`);

      // Clean old backups
      await this.cleanupOldBackups();

      return backupPath;
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      return null;
    }
  }

  async copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const items = fs.readdirSync(src);
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);

      const stats = fs.statSync(srcPath);

      if (stats.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async cleanupOldBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) return;

      const backups = fs.readdirSync(this.backupDir)
        .map(name => ({
          name,
          path: path.join(this.backupDir, name),
          stats: fs.statSync(path.join(this.backupDir, name))
        }))
        .filter(item => item.stats.isDirectory())
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Keep only last 5 backups
      const toDelete = backups.slice(5);
      for (const backup of toDelete) {
        console.log(`🗑️  Removing old backup: ${backup.name}`);
        fs.rmSync(backup.path, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error.message);
    }
  }

  async healthCheck() {
    console.log('🏥 Performing health check...');

    const results = {
      ollamaRunning: await this.checkOllamaStatus(),
      installedModels: [],
      diskUsage: 0,
      recommendations: []
    };

    if (results.ollamaRunning) {
      results.installedModels = await this.listInstalledModels();
      results.diskUsage = await this.getDiskUsage();

      // Check required models
      const requiredModels = this.config.models.required;
      const missingModels = requiredModels.filter(model =>
        !results.installedModels.some(installed => installed.name === model)
      );

      if (missingModels.length > 0) {
        results.recommendations.push(`Missing required models: ${missingModels.join(', ')}`);
      }

      // Check disk usage
      if (results.diskUsage > this.config.maxDiskUsage) {
        results.recommendations.push(`Disk usage (${this.formatBytes(results.diskUsage)}) exceeds limit (${this.formatBytes(this.config.maxDiskUsage)})`);
      }

      // Performance check
      if (results.installedModels.length > 0) {
        console.log('\n⚡ Quick performance test...');
        try {
          const start = Date.now();
          execSync(`${this.ollamaPath} run ${results.installedModels[0].name} "Hello" --format json`, {
            timeout: 10000,
            stdio: 'pipe'
          });
          const latency = Date.now() - start;
          console.log(`📊 Response time: ${latency}ms`);
        } catch (error) {
          console.log('⚠️  Performance test failed');
        }
      }
    }

    console.log('\n📋 Health Check Summary:');
    console.log(`  Status: ${results.ollamaRunning ? '✅ Healthy' : '❌ Issues'}`);
    console.log(`  Models: ${results.installedModels.length} installed`);
    console.log(`  Disk Usage: ${this.formatBytes(results.diskUsage)}`);

    if (results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      results.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }

    return results;
  }

  async runMaintenance() {
    console.log('🔧 Running automated maintenance...\n');

    // Health check
    await this.healthCheck();

    console.log('\n' + '='.repeat(50));

    // Update models
    console.log('📥 Checking for model updates...');
    await this.updateModels();

    console.log('\n' + '='.repeat(50));

    // Cleanup
    console.log('🧹 Performing cleanup...');
    await this.cleanupOldModels();

    console.log('\n' + '='.repeat(50));

    // Backup (if enabled)
    if (this.config.autoBackup) {
      console.log('💾 Creating backup...');
      await this.backupModels();
    }

    console.log('\n✅ Maintenance completed!');
  }
}

// CLI Interface
async function main() {
  const manager = new OllamaModelManager();
  const command = process.argv[2];

  switch (command) {
    case 'status':
      await manager.checkOllamaStatus();
      break;

    case 'list':
      await manager.listInstalledModels();
      break;

    case 'pull':
      const modelName = process.argv[3];
      const force = process.argv.includes('--force');
      if (!modelName) {
        console.log('Usage: node model-manager.js pull <model-name> [--force]');
        process.exit(1);
      }
      await manager.pullModel(modelName, force);
      break;

    case 'update':
      await manager.updateModels();
      break;

    case 'cleanup':
      await manager.cleanupOldModels();
      break;

    case 'backup':
      await manager.backupModels();
      break;

    case 'health':
      await manager.healthCheck();
      break;

    case 'maintenance':
      await manager.runMaintenance();
      break;

    default:
      console.log('Ollama Model Manager');
      console.log('');
      console.log('Usage: node model-manager.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  status       - Check Ollama status');
      console.log('  list         - List installed models');
      console.log('  pull <model> - Pull a specific model');
      console.log('  update       - Update all required models');
      console.log('  cleanup      - Remove old/unused models');
      console.log('  backup       - Create model backup');
      console.log('  health       - Run health check');
      console.log('  maintenance  - Run full maintenance routine');
      console.log('');
      console.log('Options:');
      console.log('  --force      - Force re-download for pull command');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Model manager failed:', errorMessage);
    process.exit(1);
  });
}

export default OllamaModelManager;

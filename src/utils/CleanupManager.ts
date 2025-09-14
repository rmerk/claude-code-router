import fs from "node:fs/promises";
import path from "node:path";
import { HOME_DIR } from "../constants";
import { existsSync } from "fs";

/**
 * Centralized cleanup manager for all cleanup operations
 * Handles log files, PID files, model backups, and other cleanup tasks
 */
export class CleanupManager {
  private static instance: CleanupManager;
  private readonly pidFilePath: string;
  private readonly logsDir: string;

  private constructor() {
    this.pidFilePath = path.join(HOME_DIR, "ccr.pid");
    this.logsDir = path.join(HOME_DIR, "logs");
  }

  /**
   * Get singleton instance of CleanupManager
   */
  public static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager();
    }
    return CleanupManager.instance;
  }

  /**
   * Cleans up old log files, keeping only the most recent ones
   * @param maxFiles - Maximum number of log files to keep (default: 9)
   */
  async cleanupLogFiles(maxFiles: number = 9): Promise<void> {
    try {
      // Check if logs directory exists
      try {
        await fs.access(this.logsDir);
      } catch {
        // Logs directory doesn't exist, nothing to clean up
        return;
      }

      // Read all files in the logs directory
      const files = await fs.readdir(this.logsDir);

      // Filter for log files (files starting with 'ccr-' and ending with '.log')
      const logFiles = files
        .filter(file => file.startsWith('ccr-') && file.endsWith('.log'))
        .sort()
        .reverse(); // Sort in descending order (newest first)

      // Delete files exceeding the maxFiles limit
      if (logFiles.length > maxFiles) {
        for (let i = maxFiles; i < logFiles.length; i++) {
          const filePath = path.join(this.logsDir, logFiles[i]);
          try {
            await fs.unlink(filePath);
            console.log(`🗑️  Cleaned up old log file: ${logFiles[i]}`);
          } catch (error) {
            console.warn(`Failed to delete log file ${filePath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn("Failed to clean up log files:", error);
    }
  }

  /**
   * Clean up PID file with retry mechanism
   * @param retries - Number of retry attempts (default: 3)
   */
  async cleanupPidFile(retries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (existsSync(this.pidFilePath)) {
          await fs.unlink(this.pidFilePath);
          console.log("🗑️  Cleaned up PID file successfully");
          return;
        }
        return; // File doesn't exist, nothing to clean
      } catch (error) {
        if (attempt === retries) {
          console.warn(`Failed to cleanup PID file after ${retries} attempts:`, error);
        } else {
          console.warn(`PID cleanup attempt ${attempt} failed, retrying...`);
          // Wait briefly before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  }

  /**
   * Clean up old backup directories
   * @param backupDir - Path to backup directory
   * @param maxBackups - Maximum number of backups to keep (default: 5)
   */
  async cleanupOldBackups(backupDir: string, maxBackups: number = 5): Promise<void> {
    try {
      if (!existsSync(backupDir)) return;

      const backups = await fs.readdir(backupDir);
      const backupDirs = [];

      for (const backup of backups) {
        const backupPath = path.join(backupDir, backup);
        const stats = await fs.stat(backupPath);
        if (stats.isDirectory()) {
          backupDirs.push({
            name: backup,
            path: backupPath,
            mtime: stats.mtime
          });
        }
      }

      // Sort by modification time (newest first)
      backupDirs.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Remove old backups
      const toDelete = backupDirs.slice(maxBackups);
      for (const backup of toDelete) {
        console.log(`🗑️  Removing old backup: ${backup.name}`);
        await fs.rm(backup.path, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn("Failed to cleanup old backups:", error);
    }
  }

  /**
   * Comprehensive cleanup - runs all cleanup operations
   * @param options - Cleanup options
   */
  async performFullCleanup(options?: {
    maxLogFiles?: number;
    pidFileRetries?: number;
    backupDir?: string;
    maxBackups?: number;
  }): Promise<void> {
    console.log("🧹 Starting comprehensive cleanup...");

    const {
      maxLogFiles = 9,
      pidFileRetries = 3,
      backupDir,
      maxBackups = 5
    } = options || {};

    try {
      // Clean up log files
      await this.cleanupLogFiles(maxLogFiles);

      // Clean up PID file
      await this.cleanupPidFile(pidFileRetries);

      // Clean up backups if directory specified
      if (backupDir) {
        await this.cleanupOldBackups(backupDir, maxBackups);
      }

      console.log("✅ Comprehensive cleanup completed successfully");
    } catch (error) {
      console.error("❌ Cleanup operation failed:", error);
      throw error;
    }
  }

  /**
   * Schedule periodic cleanup
   * @param intervalMs - Cleanup interval in milliseconds (default: 1 hour)
   */
  schedulePeriodicCleanup(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
    console.log(`⏰ Scheduling periodic cleanup every ${intervalMs / 1000 / 60} minutes`);

    return setInterval(async () => {
      try {
        await this.performFullCleanup();
      } catch (error) {
        console.warn("Scheduled cleanup failed:", error);
      }
    }, intervalMs);
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    logFiles: number;
    pidFileExists: boolean;
    logsDirectorySize: number;
  }> {
    const stats = {
      logFiles: 0,
      pidFileExists: false,
      logsDirectorySize: 0
    };

    try {
      // Check PID file
      stats.pidFileExists = existsSync(this.pidFilePath);

      // Check logs directory
      try {
        await fs.access(this.logsDir);
        const files = await fs.readdir(this.logsDir);
        stats.logFiles = files.filter(file =>
          file.startsWith('ccr-') && file.endsWith('.log')
        ).length;

        // Calculate directory size
        for (const file of files) {
          const filePath = path.join(this.logsDir, file);
          const fileStats = await fs.stat(filePath);
          stats.logsDirectorySize += fileStats.size;
        }
      } catch {
        // Logs directory doesn't exist
      }
    } catch (error) {
      console.warn("Failed to get cleanup stats:", error);
    }

    return stats;
  }
}

// Export singleton instance for convenience
export const cleanupManager = CleanupManager.getInstance();

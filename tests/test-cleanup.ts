#!/usr/bin/env node

/**
 * Test suite for CleanupManager functionality
 */

import fs from 'node:fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { CleanupManager } from '../src/utils/CleanupManager';
import { HOME_DIR } from '../src/constants';

class CleanupTest {
  private testDir: string;
  private cleanupManager: CleanupManager;

  constructor() {
    this.testDir = path.join(process.cwd(), 'test-temp');
    this.cleanupManager = CleanupManager.getInstance();
  }

  async setup() {
    // Create test directory
    await fs.mkdir(this.testDir, { recursive: true });
    console.log('🔧 Test setup completed');
  }

  async teardown() {
    // Clean up test directory
    if (existsSync(this.testDir)) {
      await fs.rm(this.testDir, { recursive: true, force: true });
    }
    console.log('🧹 Test teardown completed');
  }

  async testLogFilesCleanup() {
    console.log('\n📝 Testing log files cleanup...');

    const testLogsDir = path.join(this.testDir, 'logs');
    await fs.mkdir(testLogsDir, { recursive: true });

    // Create test log files
    const logFiles = [
      'ccr-2024-01-01.log',
      'ccr-2024-01-02.log',
      'ccr-2024-01-03.log',
      'ccr-2024-01-04.log',
      'ccr-2024-01-05.log',
      'ccr-2024-01-06.log', // This should be deleted when maxFiles = 5
      'other-file.txt' // This should not be touched
    ];

    for (const file of logFiles) {
      await fs.writeFile(path.join(testLogsDir, file), 'test content');
    }

    // Test with a custom CleanupManager instance for testing
    const testCleanupManager = new (CleanupManager as any)();
    testCleanupManager.logsDir = testLogsDir;

    // Call cleanup with max 5 files
    await testCleanupManager.cleanupLogFiles(5);

    // Check results
    const remainingFiles = await fs.readdir(testLogsDir);
    const remainingLogFiles = remainingFiles.filter(f => f.startsWith('ccr-') && f.endsWith('.log'));

    if (remainingLogFiles.length <= 5) {
      console.log('✅ Log cleanup test passed');
      return true;
    } else {
      console.log('❌ Log cleanup test failed - too many files remain');
      return false;
    }
  }

  async testBackupCleanup() {
    console.log('\n💾 Testing backup cleanup...');

    const testBackupDir = path.join(this.testDir, 'backups');
    await fs.mkdir(testBackupDir, { recursive: true });

    // Create test backup directories with different timestamps
    const backupDirs = [
      'backup-2024-01-01',
      'backup-2024-01-02',
      'backup-2024-01-03',
      'backup-2024-01-04',
      'backup-2024-01-05',
      'backup-2024-01-06' // This should be deleted when maxBackups = 5
    ];

    for (const dir of backupDirs) {
      const dirPath = path.join(testBackupDir, dir);
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'test.txt'), 'backup content');
    }

    // Call cleanup with max 5 backups
    await this.cleanupManager.cleanupOldBackups(testBackupDir, 5);

    // Check results
    const remainingDirs = await fs.readdir(testBackupDir);
    const backupCount = remainingDirs.length;

    if (backupCount <= 5) {
      console.log('✅ Backup cleanup test passed');
      return true;
    } else {
      console.log('❌ Backup cleanup test failed - too many backups remain');
      return false;
    }
  }

  async testCleanupStats() {
    console.log('\n📊 Testing cleanup statistics...');

    try {
      const stats = await this.cleanupManager.getCleanupStats();

      if (typeof stats.logFiles === 'number' &&
          typeof stats.pidFileExists === 'boolean' &&
          typeof stats.logsDirectorySize === 'number') {
        console.log('✅ Cleanup stats test passed');
        console.log(`  Log files: ${stats.logFiles}`);
        console.log(`  PID file exists: ${stats.pidFileExists}`);
        console.log(`  Logs directory size: ${stats.logsDirectorySize} bytes`);
        return true;
      } else {
        console.log('❌ Cleanup stats test failed - invalid return types');
        return false;
      }
    } catch (error) {
      console.log('❌ Cleanup stats test failed:', error);
      return false;
    }
  }

  async testSingletonPattern() {
    console.log('\n🔗 Testing singleton pattern...');

    const instance1 = CleanupManager.getInstance();
    const instance2 = CleanupManager.getInstance();

    if (instance1 === instance2) {
      console.log('✅ Singleton pattern test passed');
      return true;
    } else {
      console.log('❌ Singleton pattern test failed - instances are different');
      return false;
    }
  }

  async runAll() {
    console.log('🚀 Starting CleanupManager Tests');
    console.log('═'.repeat(40));

    let passed = 0;
    let total = 0;

    try {
      await this.setup();

      const tests = [
        () => this.testSingletonPattern(),
        () => this.testLogFilesCleanup(),
        () => this.testBackupCleanup(),
        () => this.testCleanupStats()
      ];

      for (const test of tests) {
        total++;
        try {
          const result = await test();
          if (result) passed++;
        } catch (error) {
          console.log('❌ Test failed with error:', error);
        }
      }

      await this.teardown();

      console.log('\n📊 CleanupManager Test Results');
      console.log('═'.repeat(40));
      console.log(`Passed: ${passed}/${total}`);
      console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

      if (passed === total) {
        console.log('🎉 All CleanupManager tests passed!');
        process.exit(0);
      } else {
        console.log('❌ Some CleanupManager tests failed');
        process.exit(1);
      }

    } catch (error) {
      console.error('Test suite failed:', error);
      await this.teardown();
      process.exit(1);
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new CleanupTest();
  test.runAll();
}

export default CleanupTest;

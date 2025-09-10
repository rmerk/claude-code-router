#!/usr/bin/env node

/**
 * Test Runner for Claude Code Router
 * Runs all test suites and reports results
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions for test runner
interface TestResult {
  file: string;
  status: 'passed' | 'failed';
  error?: string;
}

interface TestResults {
  passed: number;
  failed: number;
  total: number;
  details: TestResult[];
}

class TestRunner {
  private testDir: string;
  private results: TestResults;
  constructor() {
    this.testDir = __dirname;
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  findTestFiles() {
    const files = fs.readdirSync(this.testDir);
    return files.filter(file => file.startsWith('test-') && file.endsWith('.js'));
  }

  async runTest(testFile) {
    const testPath = path.join(this.testDir, testFile);
    console.log(`\n🧪 Running ${testFile}...`);

    try {
      // Run the test file
      execSync(`node "${testPath}"`, {
        stdio: 'inherit',
        timeout: 30000 // 30 second timeout
      });

      console.log(`✅ ${testFile} passed`);
      this.results.passed++;
      this.results.details.push({ file: testFile, status: 'passed' });

    } catch (error) {
      console.log(`❌ ${testFile} failed:`, error.message);
      this.results.failed++;
      this.results.details.push({ file: testFile, status: 'failed', error: error.message });
    }

    this.results.total++;
  }

  async runAll() {
    console.log('🚀 Starting Claude Code Router Test Suite');
    console.log('═'.repeat(50));

    const testFiles = this.findTestFiles();

    if (testFiles.length === 0) {
      console.log('❌ No test files found');
      return;
    }

    console.log(`Found ${testFiles.length} test files:`, testFiles.join(', '));

    for (const testFile of testFiles) {
      await this.runTest(testFile);
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Results Summary');
    console.log('═'.repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.details
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`  - ${test.file}: ${test.error}`);
        });
    }

    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  runner.runAll().catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Test runner failed:', errorMessage);
    process.exit(1);
  });
}

export default TestRunner;

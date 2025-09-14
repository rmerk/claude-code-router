#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BuildOptions {
  watch?: boolean;
  minify?: boolean;
  sourcemap?: boolean;
}

function buildCli(): void {
  console.log('Building CLI application...');
  const esbuildCmd = 'esbuild src/cli.ts --bundle --platform=node --outfile=dist/cli.js';
  execSync(esbuildCmd, { stdio: 'inherit' });
}

function compileTypeScript(): void {
  console.log('Compiling TypeScript files...');
  execSync('tsc --project tsconfig.json', { stdio: 'inherit' });
}

function copyTiktokenWasm(): void {
  console.log('Copying tiktoken WASM file...');
  const wasmPath = path.join(__dirname, '..', 'node_modules', 'tiktoken', 'tiktoken_bg.wasm');
  const destPath = path.join(__dirname, '..', 'dist', 'tiktoken_bg.wasm');

  if (fs.existsSync(wasmPath)) {
    execSync(`shx cp "${wasmPath}" "${destPath}"`, { stdio: 'inherit' });
  } else {
    console.warn('Warning: tiktoken WASM file not found, skipping...');
  }
}

function buildUi(): void {
  console.log('Building UI...');
  const uiDir = path.join(__dirname, '..', 'ui');
  const uiNodeModules = path.join(uiDir, 'node_modules');

  // Check if node_modules exists in ui directory, if not install dependencies
  if (!fs.existsSync(uiNodeModules)) {
    console.log('Installing UI dependencies...');
    execSync('cd ui && npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  }

  execSync('cd ui && npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
}

function copyUiArtifacts(): void {
  console.log('Copying UI build artifacts...');
  const uiDistIndex = path.join(__dirname, '..', 'ui', 'dist', 'index.html');
  const destIndex = path.join(__dirname, '..', 'dist', 'index.html');

  if (fs.existsSync(uiDistIndex)) {
    execSync(`shx cp "${uiDistIndex}" "${destIndex}"`, { stdio: 'inherit' });
  } else {
    console.warn('Warning: UI build artifacts not found, skipping...');
  }
}

function copyTransformers(): void {
  console.log('Copying transformers...');
  const transformersDir = path.join(__dirname, '..', 'src', 'transformers');
  const destDir = path.join(__dirname, '..', 'dist', 'src');

  if (fs.existsSync(transformersDir)) {
    execSync(`shx cp -r "${transformersDir}" "${destDir}/"`, { stdio: 'inherit' });
  } else {
    console.log('No transformers directory found, skipping...');
  }
}

function main(): void {
  console.log('Building Claude Code Router...');

  try {
    compileTypeScript();
    buildCli();
    copyTiktokenWasm();
    buildUi();
    copyUiArtifacts();
    copyTransformers();

    console.log('Build completed successfully!');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Build failed:', errorMessage);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
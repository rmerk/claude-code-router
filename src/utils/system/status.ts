import { getServiceInfo } from '../process/processCheck';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';

export async function showStatus() {
    const info = await getServiceInfo();

    console.log('\n📊 Claude Code Router Status');
    console.log('═'.repeat(60));

    if (info.running) {
        console.log('✅ Status: Running');
        console.log(`🆔 Process ID: ${info.pid}`);
        console.log(`🌐 Port: ${info.port}`);
        console.log(`📡 API Endpoint: ${info.endpoint}`);

        // Show uptime if possible
        if (info.pid) {
            try {
                const processInfo = await getProcessInfo(info.pid);
                if (processInfo) {
                    console.log(`⏱️  Uptime: ${processInfo.uptime}`);
                    console.log(`💾 Memory Usage: ${processInfo.memory} MB`);
                }
            } catch (error) {
                // Ignore uptime errors
            }
        }

        console.log(`📄 PID File: ${info.pidFile}`);
        console.log(`👥 Reference Count: ${info.referenceCount}`);

        console.log('');
        console.log('🚀 Ready to use! Available commands:');
        console.log('   ccr code    # Start coding with Claude');
        console.log('   ccr stop    # Stop the service');
        console.log('   ccr restart # Restart the service');
        console.log('   ccr ui      # Open web interface');
    } else {
        console.log('❌ Status: Not Running');

        // Check for stale PID file
        if (info.pid) {
            console.log(`📄 Stale PID File: ${info.pidFile} (contains PID ${info.pid})`);
            console.log('💡 Run "ccr stop" to clean up stale files');
        }

        console.log('');
        console.log('💡 To start the service:');
        console.log('   ccr start');
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('   • Check logs: tail -20 ~/.claude-code-router/logs/ccr-*.log');
        console.log('   • Verify config: cat ~/.claude-code-router/config.json');
        console.log('   • Check API keys: grep -v "^#" ~/.claude-code-router/.env');
    }

    // Show configuration summary
    await showConfigSummary();

    console.log('');
}

async function getProcessInfo(pid: number) {
    try {
        // Use ps command to get process info
        const { execSync } = require('child_process');
        const output = execSync(`ps -p ${pid} -o pid,ppid,etime,rss | tail -1`, { encoding: 'utf8' });

        const parts = output.trim().split(/\s+/);
        if (parts.length >= 4) {
            const rssKB = parseInt(parts[3]);
            const memoryMB = Math.round(rssKB / 1024);
            const etime = parts[2];

            return {
                uptime: etime,
                memory: memoryMB
            };
        }
    } catch (error) {
        // Process might not exist or ps command failed
    }
    return null;
}

async function showConfigSummary() {
    const configPath = path.join(os.homedir(), '.claude-code-router', 'config.json');
    const envPath = path.join(os.homedir(), '.claude-code-router', '.env');

    console.log('\n⚙️  Configuration Summary:');
    console.log('─'.repeat(40));

    // Check config file
    if (existsSync(configPath)) {
        try {
            const config = JSON.parse(readFileSync(configPath, 'utf8'));
            const providerCount = config.Providers ? config.Providers.length : 0;
            console.log(`✅ Config file: Found (${providerCount} providers)`);
        } catch (error) {
            console.log('❌ Config file: Invalid JSON');
        }
    } else {
        console.log('❌ Config file: Missing');
    }

    // Check env file
    if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf8');
        const apiKeyCount = (envContent.match(/^[^#]*=[^#]*$/gm) || []).length;
        console.log(`✅ Environment file: Found (${apiKeyCount} variables)`);
    } else {
        console.log('❌ Environment file: Missing');
    }

    // Check logs directory
    const logsDir = path.join(os.homedir(), '.claude-code-router', 'logs');
    if (existsSync(logsDir)) {
        console.log('✅ Logs directory: Present');
    } else {
        console.log('⚠️  Logs directory: Missing (will be created on first run)');
    }
}

#!/usr/bin/env node
/**
 * simRunner.js — 《密纹轨迹》自动模拟运行器
 *
 * 用法:
 *   node simRunner.js [目标楼层] [速度] [输出文件]
 *   node simRunner.js 50 5 sim_results.json
 *   node simRunner.js 0 3           # 无限直到死亡
 *
 * 依赖: npm install puppeteer
 */

const fs = require('fs');
const path = require('path');

// ---------- 配置 ----------
const HTML_FILE = path.join(__dirname, '密文轨迹demo9.10.html');
const DEFAULT_FLOOR = 50;
const DEFAULT_SPEED = 5;
const DEFAULT_OUTPUT = path.join(__dirname, 'sim_results.json');
const TIMEOUT_MS = 10 * 60 * 1000; // 10分钟超时

// ---------- CLI 参数 ----------
const args = process.argv.slice(2);
const targetFloor = parseInt(args[0]) || DEFAULT_FLOOR;
const speed = parseInt(args[1]) || DEFAULT_SPEED;
const outputFile = args[2] || DEFAULT_OUTPUT;

// ---------- 主函数 ----------
async function runSimulation() {
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (e) {
        console.error('❌ 需要安装 puppeteer: npm install puppeteer');
        console.error('');
        console.error('💡 或者直接在浏览器中打开游戏:');
        console.error(`   file://${HTML_FILE}?auto=${targetFloor}&speed=${speed}`);
        console.error('   结果会输出到浏览器控制台 (F12 → Console → ===SIM_RESULT===)');
        process.exit(1);
    }

    console.log('🚀 启动模拟引擎...');
    console.log(`   HTML: ${HTML_FILE}`);
    console.log(`   目标楼层: ${targetFloor > 0 ? targetFloor : '无限(直到死亡)'}`);
    console.log(`   速度: ${speed}x`);
    console.log('');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
        ],
    });

    const page = await browser.newPage();

    // 拦截 console 以捕获结果
    let simResult = null;
    let consoleBuffer = '';
    page.on('console', msg => {
        const text = msg.text();
        if (text === '===SIM_RESULT===') {
            consoleBuffer = '';
        } else if (text === '===END_SIM_RESULT===') {
            try {
                simResult = JSON.parse(consoleBuffer.trim());
            } catch (e) {
                console.error('解析结果失败:', e.message);
            }
        } else if (consoleBuffer !== null) {
            consoleBuffer += text + '\n';
        }
    });

    // 加载游戏
    const url = `file://${HTML_FILE}?auto=${targetFloor}&speed=${speed}`;
    console.log(`📂 加载: ${url}`);

    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // 等待模拟完成
    console.log('⏳ 模拟运行中...');
    try {
        await page.waitForFunction(
            () => window.__SIM_RESULT__ !== undefined,
            { timeout: TIMEOUT_MS, polling: 500 }
        );
    } catch (e) {
        console.error('⚠️  超时 — 尝试从页面抓取结果...');
    }

    // 尝试从 DOM 获取结果
    if (!simResult) {
        try {
            simResult = await page.evaluate(() => {
                const el = document.getElementById('simResult');
                return el ? el.textContent : window.__SIM_RESULT__;
            });
            if (typeof simResult === 'string') simResult = JSON.parse(simResult);
        } catch (e) {
            // 忽略
        }
    }

    await browser.close();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!simResult || !simResult.summary) {
        console.error('❌ 模拟失败：未获取到有效结果');
        console.error('   请尝试在浏览器中手动运行:');
        console.error(`   file://${HTML_FILE}?auto=${targetFloor}&speed=${speed}&draw=1`);
        process.exit(1);
    }

    // ---------- 输出摘要 ----------
    const s = simResult.summary;
    console.log('');
    console.log('═══════════════════════════════════');
    console.log('  📊 模拟完成!');
    console.log('═══════════════════════════════════');
    console.log(`  职业: ${s.className}`);
    console.log(`  最终楼层: ${s.finalFloor}`);
    console.log(`  得分: ${s.score.toLocaleString()}`);
    console.log(`  击杀: ${s.kills.toLocaleString()}`);
    console.log(`  难度系数: ×${s.finalDifficulty}`);
    console.log(`  遗物: ${s.relics.join(', ') || '无'}`);
    console.log(`  被动层数: ${s.passiveLayers}`);
    console.log(`  结束原因: ${s.gameOverReason}`);
    console.log(`  终局属性: 攻${s.finalStats.atk} 倍×${s.finalStats.mult} 轨伤${s.finalStats.trailDmg} 轨宽${s.finalStats.trailWidth}`);
    console.log(`  耗时: ${elapsed}s`);
    console.log('═══════════════════════════════════');

    // 保存结果
    fs.writeFileSync(outputFile, JSON.stringify(simResult, null, 2), 'utf-8');
    console.log(`\n💾 结果已保存: ${outputFile}`);

    // 额外保存文本报告
    const reportPath = outputFile.replace('.json', '.txt');
    const textReport = generateTextReport(simResult);
    fs.writeFileSync(reportPath, textReport, 'utf-8');
    console.log(`📋 文本报告: ${reportPath}`);

    return simResult;
}

// ---------- 文本报告生成 ----------
function generateTextReport(result) {
    const s = result.summary;
    let report = [];
    report.push('═══════════════════════════════════');
    report.push('  《密纹轨迹》模拟对局记录  v9.10');
    report.push('═══════════════════════════════════');
    report.push('');
    report.push(`职业: ${s.className}    最终楼层: ${s.finalFloor}    得分: ${s.score}`);
    report.push(`击杀: ${s.kills}    遗物: ${s.relics.join(', ') || '无'}`);
    report.push(`被动层数: ${s.passiveLayers}    难度: ×${s.finalDifficulty}`);
    report.push('');
    report.push('--- 终局属性 ---');
    const fs = s.finalStats;
    report.push(`HP${fs.hp}/${fs.maxHp} 攻${fs.atk} 倍×${fs.mult} 轨伤${fs.trailDmg} 轨宽${fs.trailWidth} 速${fs.speed}`);
    report.push('');
    report.push('--- 事件摘要 ---');
    let lastFloor = 0;
    for (const ev of result.events) {
        if (ev.type === 'floor_clear') {
            const fs2 = ev.data.snapshot;
            report.push(`第${ev.floor}层清场 | HP${fs2.hp}/${fs2.maxHp} 攻${fs2.atk} 倍×${fs2.mult} 轨伤${fs2.trailDmg} 轨宽${fs2.trailWidth}`);
        }
        if (ev.type === 'game_over') {
            report.push(`💀 ${ev.data.reason}`);
        }
        if (ev.type === 'card_combine' && ev.data.chairHit) {
            report.push(`🦽 第${ev.floor}层 · ${ev.data.chairHit}`);
        }
    }
    report.push('');
    report.push('═══════════════════════════════════');
    return report.join('\n');
}

// ---------- 启动 ----------
runSimulation().catch(err => {
    console.error('模拟出错:', err.message);
    process.exit(1);
});

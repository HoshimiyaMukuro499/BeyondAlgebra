#!/usr/bin/env node
/**
 * analyzeSim.js — 《密纹轨迹》模拟结果分析引擎
 *
 * 用法:
 *   node analyzeSim.js sim_results.json
 *   node analyzeSim.js sim_results.json --apply  (应用建议到HTML)
 */

const fs = require('fs');
const path = require('path');

// ---------- 分析配置 ----------
const TARGET_FLOOR_MIN = 30;    // 理想最低存活楼层
const TARGET_FLOOR_MAX = 70;    // 理想最高存活楼层
const HTML_FILE = path.join(__dirname, '密文轨迹demo9.10.html');

// ---------- 主分析函数 ----------
function analyzeResult(simData) {
    const summary = simData.summary;
    const events = simData.events || [];
    const findings = [];
    const recommendations = [];

    // 1. 基础指标
    findings.push({
        metric: '最终楼层',
        value: summary.finalFloor,
        assessment: summary.finalFloor < TARGET_FLOOR_MIN ? '⚠️ 太早死亡'
            : summary.finalFloor > TARGET_FLOOR_MAX ? '📈 过于简单'
            : '✅ 合理范围',
    });

    // 2. 难度曲线分析
    const floorStarts = events.filter(e => e.type === 'floor_start');
    const floorClears = events.filter(e => e.type === 'floor_clear');

    if (floorStarts.length > 0) {
        const firstStart = floorStarts[0].data.snapshot;
        const lastStart = floorStarts[floorStarts.length - 1].data.snapshot;
        findings.push({
            metric: '难度增长',
            value: `×${firstStart.difficulty} → ×${lastStart.difficulty}`,
            assessment: lastStart.difficulty > 500 ? '⚠️ 后期难度指数级飙升' : '✅ 难度增长合理',
        });
    }

    // 3. 攻击力增长分析
    if (floorClears.length >= 2) {
        const atkGrowthRates = [];
        for (let i = 1; i < floorClears.length; i++) {
            const prevAtk = floorClears[i - 1].data.snapshot.atk;
            const currAtk = floorClears[i].data.snapshot.atk;
            atkGrowthRates.push(currAtk - prevAtk);
        }
        const avgAtkPerFloor = atkGrowthRates.reduce((a, b) => a + b, 0) / atkGrowthRates.length;
        const firstAtk = floorClears[0].data.snapshot.atk;
        const lastAtk = floorClears[floorClears.length - 1].data.snapshot.atk;
        const totalGrowth = lastAtk / Math.max(1, firstAtk);

        findings.push({
            metric: '攻击力增长',
            value: `${firstAtk} → ${lastAtk} (${totalGrowth.toFixed(1)}x) 均+${avgAtkPerFloor.toFixed(1)}/层`,
            assessment: totalGrowth > 30 ? '🔴 攻击膨胀严重'
                : totalGrowth > 15 ? '🟡 攻击增长偏快'
                : '✅ 攻击增长合理',
        });

        if (totalGrowth > 20) {
            recommendations.push({
                target: 'STAT_CHOICES.atkUp',
                description: '属性选择攻击加成偏大',
                current: 3,
                suggested: 2,
                reason: `攻击力在${floorClears.length}层中增长了${totalGrowth.toFixed(0)}倍`,
            });
        }

        // 4. 检测力量尖峰
        const meanGrowth = avgAtkPerFloor;
        const stdDev = Math.sqrt(atkGrowthRates.reduce((s, r) => s + (r - meanGrowth) ** 2, 0) / atkGrowthRates.length);
        for (let i = 0; i < atkGrowthRates.length; i++) {
            if (atkGrowthRates[i] > meanGrowth + 3 * stdDev && atkGrowthRates[i] > 10) {
                findings.push({
                    metric: '力量尖峰',
                    value: `第${floorClears[i + 1].floor}层 攻击+${atkGrowthRates[i].toFixed(0)}`,
                    assessment: '🔴 存在异常尖峰 — 可能是轮椅组合触发过多',
                });
                recommendations.push({
                    target: 'CHAIR_COMBOS.bulletHell.bonus',
                    description: '弹幕地狱组合加成过大导致尖峰',
                    current: 0.5,
                    suggested: 0.35,
                    reason: `第${floorClears[i + 1].floor}层出现攻击力尖峰+${atkGrowthRates[i].toFixed(0)}`,
                });
            }
        }
    }

    // 5. 轨迹伤害 vs 攻击力对比
    const finalStats = summary.finalStats;
    if (finalStats.trailDmg > finalStats.atk * 3) {
        findings.push({
            metric: '轨迹vs攻击',
            value: `轨迹${finalStats.trailDmg} : 攻击${finalStats.atk} (${(finalStats.trailDmg / finalStats.atk).toFixed(1)}:1)`,
            assessment: '🔴 轨迹伤害碾压攻击 — E06数值过高',
        });
        recommendations.push({
            target: 'E06.trailDmg',
            description: '轨迹升级每次加成过高',
            current: 1,
            suggested: 0.7,
            reason: `轨迹伤害(${finalStats.trailDmg})远超攻击(${finalStats.atk})`,
        });
    }

    // 6. 轨迹宽度分析
    if (finalStats.trailWidth > 100) {
        findings.push({
            metric: '轨迹宽度',
            value: finalStats.trailWidth,
            assessment: finalStats.trailWidth > 300 ? '🔴 轨迹宽度失控 — 覆盖全场'
                : '🟡 轨迹宽度偏大',
        });
        if (finalStats.trailWidth > 300) {
            recommendations.push({
                target: 'E06.trailWidth',
                description: '轨迹宽度增长过快',
                current: 2,
                suggested: 1,
                reason: `轨迹宽度达到${finalStats.trailWidth}，覆盖全场`,
            });
        }
    }

    // 7. HP 曲线分析
    const hpRatios = floorClears.map(fc => {
        const s = fc.data.snapshot;
        return { floor: fc.floor, ratio: s.hp / s.maxHp };
    });
    const avgHpRatio = hpRatios.reduce((s, h) => s + h.ratio, 0) / Math.max(1, hpRatios.length);
    findings.push({
        metric: '平均HP比例',
        value: `${(avgHpRatio * 100).toFixed(0)}%`,
        assessment: avgHpRatio > 0.9 ? '🟢 长期满血 — 怪物伤害不足'
            : avgHpRatio < 0.4 ? '🔴 长期残血 — 怪物伤害太高'
            : '✅ HP压力合理',
    });

    if (avgHpRatio > 0.9 && summary.finalFloor > TARGET_FLOOR_MIN) {
        recommendations.push({
            target: 'MONSTER.atkCap',
            description: '怪物攻击上限偏低',
            current: 120,
            suggested: 150,
            reason: '玩家长期满血，怪物威胁不足',
        });
    }

    // 8. 治疗使用频率
    const statChoices = events.filter(e => e.type === 'stat_choice');
    const healChoices = statChoices.filter(e => e.data.choice.includes('复苏'));
    const healRatio = statChoices.length > 0 ? healChoices.length / statChoices.length : 0;
    findings.push({
        metric: '治疗选择频率',
        value: `${healChoices.length}/${statChoices.length} (${(healRatio * 100).toFixed(0)}%)`,
        assessment: healRatio > 0.4 ? '🔴 频繁选治疗 — HP压力过大'
            : '✅ 治疗使用合理',
    });

    // 9. 死亡分析
    const gameOverEvt = events.find(e => e.type === 'game_over');
    if (gameOverEvt) {
        findings.push({
            metric: '死亡原因',
            value: gameOverEvt.data.reason,
            assessment: gameOverEvt.data.reason === 'target_floor_reached'
                ? '✅ 主动达到目标' : '⚠️ 核心被毁',
        });

        // 检查死亡时的难度
        const deathSnap = gameOverEvt.data.snapshot;
        if (deathSnap && gameOverEvt.data.reason === 'core_destroyed') {
            const deathDifficulty = deathSnap.difficulty;
            const finalAtk = deathSnap.atk;
            // 估算怪物血量 (粗略)
            const estMonsterHp = Math.min(10000, (36 + 16) * deathDifficulty * 2); // basic + siege
            const estBulletDmg = finalAtk * deathSnap.mult;
            const shotsToKill = estMonsterHp / Math.max(1, estBulletDmg);

            if (shotsToKill < 2) {
                findings.push({
                    metric: '死亡矛盾',
                    value: `约${shotsToKill.toFixed(1)}枪/怪但核心被毁`,
                    assessment: '🔴 伤害足够但防御不足 — HP/速度太低',
                });
                recommendations.push({
                    target: 'G.player.maxHp',
                    description: '初始HP偏低导致后期站不住',
                    current: 100,
                    suggested: 120,
                    reason: '输出充足但防御不足',
                });
            }
        }
    }

    // 10. 轮椅组合使用
    const chairHits = events.filter(e => e.type === 'card_combine' && e.data.chairHit);
    if (chairHits.length > 0) {
        const chairNames = [...new Set(chairHits.map(e => e.data.chairHit))];
        findings.push({
            metric: '轮椅组合',
            value: chairNames.join(' + '),
            assessment: chairHits.length > 3 ? '🟡 多个轮椅组合叠加'
                : '✅ 轮椅使用合理',
        });
    }

    return { findings, recommendations, summary };
}

// ---------- 命令行输出 ----------
function printReport(analysis) {
    console.log('');
    console.log('═══════════════════════════════════');
    console.log('  📊 模拟结果分析');
    console.log('═══════════════════════════════════');
    console.log('');
    console.log(`职业: ${analysis.summary.className}`);
    console.log(`最终楼层: ${analysis.summary.finalFloor}`);
    console.log(`得分: ${analysis.summary.score.toLocaleString()}`);
    console.log(`难度: ×${analysis.summary.finalDifficulty}`);
    console.log('');

    console.log('--- 指标分析 ---');
    for (const f of analysis.findings) {
        const icon = f.assessment.startsWith('✅') ? '✅' : f.assessment.startsWith('🔴') ? '🔴'
            : f.assessment.startsWith('🟡') ? '🟡' : f.assessment.startsWith('⚠️') ? '⚠️'
                : f.assessment.startsWith('📈') ? '📈' : f.assessment.startsWith('🟢') ? '🟢' : '📊';
        console.log(`${icon} ${f.metric}: ${f.value}`);
    }

    if (analysis.recommendations.length > 0) {
        console.log('');
        console.log('--- 调整建议 ---');
        for (const r of analysis.recommendations) {
            console.log(`🔧 ${r.description}`);
            console.log(`   ${r.current} → ${r.suggested} | ${r.reason}`);
        }
    }

    console.log('');
    console.log('═══════════════════════════════════');
}

// ---------- CLI 入口 ----------
if (require.main === module) {
    const args = process.argv.slice(2);
    const jsonFile = args[0];

    if (!jsonFile) {
        console.error('用法: node analyzeSim.js <sim_results.json> [--apply]');
        process.exit(1);
    }

    if (!fs.existsSync(jsonFile)) {
        console.error(`文件不存在: ${jsonFile}`);
        process.exit(1);
    }

    const simData = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    const analysis = analyzeResult(simData);
    printReport(analysis);

    // 保存分析报告
    const reportPath = jsonFile.replace('.json', '_analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2), 'utf-8');
    console.log(`💾 分析报告已保存: ${reportPath}`);

    if (args.includes('--apply') && analysis.recommendations.length > 0) {
        console.log('\n⚠️  --apply 模式需要在 Claude Code 中手动执行调整');
        console.log('   请将以上建议提交给 Claude 进行数值调整');
    }
}

module.exports = { analyzeResult };

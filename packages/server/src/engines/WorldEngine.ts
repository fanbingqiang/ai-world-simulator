import { World } from '@ai-world/shared';
import { WorldService } from '../services/WorldService';

const DAY_PERIODS = ['黎明', '早晨', '中午', '下午', '傍晚', '夜晚'];
const SEASONS = ['春', '夏', '秋', '冬'];

export class WorldEngine {
  // 推进时间，返回新的世界状态
  advance(world: World): { world: World; spontaneousEvents: string[] } {
    const events: string[] = [];
    world.time.tick += 1;

    // 更新昼夜
    const periodIndex = world.time.tick % world.time.ticksPerDay;
    world.time.dayPeriod = DAY_PERIODS[periodIndex] || '白天';

    // 更新季节（每 90 tick 换季）
    const seasonIndex = Math.floor(world.time.tick / 90) % 4;
    const newSeason = SEASONS[seasonIndex];
    if (newSeason !== world.time.season) {
      world.time.season = newSeason;
      events.push(`季节变换：进入${newSeason}天`);
    }

    // 更新年份（每 360 tick 一年）
    world.time.year = 2024 + Math.floor(world.time.tick / 360);

    // 随机世界事件（5%概率）
    if (Math.random() < 0.05) {
      const weatherEvents = ['起风了', '下起了小雨', '阳光明媚', '乌云密布', '飘起了雪花'];
      events.push(weatherEvents[Math.floor(Math.random() * weatherEvents.length)]);
    }

    return { world, spontaneousEvents: events };
  }
}

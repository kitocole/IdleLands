
import { Achievement, AchievementTypes } from '../achievement';

export class Unstoppable extends Achievement {
  static achievementData(player) {

    const value = player.$statistics.getStat('Combat.Give.Damage');
    const baseValue = 1000;

    let tier = 1;
    while(value >= baseValue * Math.pow(10, tier-1)) {
      tier++;
    }

    tier--;

    if(tier === 0) return [];

    const rewards = [{
      type: 'stats',
      hp: (player, baseValue) => baseValue * 0.01,
      hpDisplay: `+${tier}% HP`,
      str: 20*tier
    }];

    if(tier >= 4) {
      rewards.push({ type: 'title', title: 'Unstoppable' });
    }

    return [{
      tier,
      name: 'Unstoppable',
      desc: `Gain +${tier}% HP and +${20*tier} STR for dealing ${baseValue * Math.pow(10, tier-1)} damage.`,
      type: AchievementTypes.COMBAT,
      rewards
    }];
  }
}
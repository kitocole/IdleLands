
import { Achievement, AchievementTypes } from '../achievement';

export class DigitalMagician extends Achievement {
  static achievementData(player) {

    const totalDigitals = player.$statistics.getStat('Combat.Give.Effect.Digital');

    if(totalDigitals < 100000) return [];

    return [{
      tier: 1,
      name: 'Digital Magician',
      desc: 'Gain a special title for 100000 Digital skill uses.',
      type: AchievementTypes.COMBAT,
      rewards: [{
        type: 'title',
        title: 'Digital Magician'
      }]
    }];
  }
}

import _ from 'lodash';
import { Spell, SpellType } from '../spell';

export class Cure extends Spell {
  static element = SpellType.HEAL;
  static tiers = [
    { name: 'cure',       spellPower: 1.0, weight: 40, cost: 10,   level: 1,   profession: 'Cleric' },
    { name: 'heal',       spellPower: 1.5, weight: 40, cost: 450,  level: 25,  profession: 'Cleric' },
    { name: 'restore',    spellPower: 2.5, weight: 40, cost: 2300, level: 65,  profession: 'Cleric' },
    { name: 'revitalize', spellPower: 5.5, weight: 40, cost: 7300, level: 115, profession: 'Cleric',
      collectibles: ['Strand of Fate'] },
    { name: 'mini cure',  spellPower: 1.0, weight: 35, cost: 100,  level: 15,  profession: 'MagicalMonster',
      collectibles: ['Cleric\'s Text'] }
  ];

  static shouldCast(caster) {
    return this.$canTarget.allyBelowMaxHealth(caster);
  }

  calcDamage() {
    const min = this.caster.liveStats.int / 4;
    const max = this.caster.liveStats.int;
    return -this.minMax(min, max) * this.spellPower;
  }

  determineTargets() {
    return this.$targetting.randomAllyBelowMaxHealth;
  }

  preCast() {
    const message = '%player cast %spellName at %targetName and healed %healed hp!';
    const targets = this.determineTargets();

    _.each(targets, target => {
      const damage = this.calcDamage();

      super.cast({
        damage,
        message,
        targets: [target]
      });
    });
  }
}
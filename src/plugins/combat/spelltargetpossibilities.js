
import _ from 'lodash';

export class SpellTargetPossibilities {
  static yes() {
    return true;
  }

  static enemyHasMp(caster) {
    return _(caster.$battle.allPlayers)
        .reject(p => p.hp === 0)
        .reject(p => p.party === caster.party)
        .filter(p => p.mp)
        .value().length > 1;
  }

  static moreThanOneEnemy(caster) {
    return _(caster.$battle.allPlayers)
      .reject(p => p.hp === 0)
      .reject(p => p.party === caster.party)
      .value().length > 1;
  }

  static enemyNotProfession(caster, profession) {
    return _(caster.$battle.allPlayers)
        .reject(p => p.hp === 0)
        .reject(p => p.party === caster.party)
        .reject(p => p.professionName === profession)
        .value().length >= 1;
  }

  static anyEnemyDead(caster) {
    return _(caster.$battle.allPlayers)
        .reject(p => p.hp > 0)
        .reject(p => p.party === caster.party)
        .value().length >= 1;
  }

  static allyWithoutEffect(caster, effect) {
    return _(caster.$battle.allPlayers)
        .reject(p => p.hp === 0)
        .reject(p => p.party !== caster.party)
        .reject(p => p.$effects.hasEffect(effect))
        .value().length >= 1;
  }

  static allyBelowMaxHealth(caster) {
    return _(caster.$battle.allPlayers)
        .reject(p => p.hp === 0)
        .reject(p => p.party !== caster.party)
        .reject(p => p._hp.atMaximum())
        .value().length >= 1;
  }

  static anyAllyDead(caster) {
    return _(caster.$battle.allPlayers)
        .reject(p => p.hp > 0)
        .reject(p => p.party !== caster.party)
        .value().length >= 1;
  }

  static allyBelow50PercentHealth(caster) {
    return _(caster.$battle.allPlayers)
        .reject(p => p.hp === 0)
        .reject(p => p.party !== caster.party)
        .reject(p => p._hp.greaterThanPercent(50))
        .value().length >= 1;
  }

  static enemyWithoutEffect(caster, effect) {
    return _(caster.$battle.allPlayers)
        .reject(p => p.hp === 0)
        .reject(p => p.party === caster.party)
        .reject(p => p.$effects.hasEffect(effect))
        .value().length >= 1;
  }
}
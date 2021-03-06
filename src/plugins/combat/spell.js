
import _ from 'lodash';

import { SpellTargetStrategy } from './spelltargetstrategy';
import { SpellTargetPossibilities } from './spelltargetpossibilities';
import { MessageParser } from '../../plugins/events/messagecreator';

import Chance from 'chance';
const chance = new Chance();

const isValidSpellTierProfession = (tier, caster) => {
  return (tier.profession === caster.professionName
  || (caster.$secondaryProfessions && _.includes(caster.$secondaryProfessions, tier.profession)));
};

export class Spell {
  static get chance() { return chance; }
  static tiers = [];
  static $canTarget = SpellTargetPossibilities;

  static stat = 'mp';
  static oper = 'sub';

  static bestTier(caster) {
    return _.last(_.filter(this.tiers, tier => {
      const meetsCollectibleReqs = tier.collectibles ? _.every(tier.collectibles, c => !caster.$collectibles || caster.$collectibles.hasCollectible(c)) : true;
      return isValidSpellTierProfession(tier, caster) && tier.level <= caster.level && meetsCollectibleReqs;
    }));
  }

  get tier() {
    const tiers = this.constructor.tiers;
    return _.last(_.filter(tiers, tier => {
      const meetsCollectibleReqs = tier.collectibles ? _.every(tier.collectibles, c => !this.caster.$collectibles || this.caster.$collectibles.hasCollectible(c)) : true;
      return isValidSpellTierProfession(tier, this.caster) && tier.level <= this.caster.level && meetsCollectibleReqs;
    }));
  }

  get stat() {
    return this.constructor.stat;
  }

  get oper() {
    return this.constructor.oper;
  }

  get element() {
    return this.constructor.element;
  }

  get spellPower() {
    return this.tier.spellPower;
  }

  get cost() {
    return this.tier.cost;
  }

  constructor(caster) {
    this.caster = caster;
    this.$targetting = new Proxy({}, {
      get: (target, name) => {
        return SpellTargetStrategy[name](this.caster);
      }
    });
  }

  calcDamage() {
    return 0;
  }

  calcDuration() {
    return 0;
  }

  calcPotency() {
    return 0;
  }

  determineTargets() {
    return [];
  }

  _emitMessage(player, message, extraData = {}) {
    return MessageParser.stringFormat(message, player, extraData);
  }

  cast({ damage, targets, message, applyEffect, applyEffectDuration, applyEffectPotency, applyEffectName, applyEffectExtra, messageData = {} }) {

    this.caster.$battle.tryIncrement(this.caster, `Combat.Utilize.${this.element}`);

    damage = Math.round(damage);
    this.caster.$battle.tryIncrement(this.caster, 'Combat.Give.Damage', damage);
    this.caster[`_${this.stat}`][this.oper](this.cost);

    messageData.spellName = this.tier.name;

    if(!targets.length) {
      this.caster.$battle._emitMessage(this._emitMessage(this.caster, message, messageData));
      return;
    }

    _.each(targets, target => {
      this.caster.$battle.tryIncrement(target, 'Combat.Receive.Damage', damage);

      messageData.targetName = target.fullname;

      this.caster.$battle.emitEvents(this.caster, 'Attack');
      this.caster.$battle.emitEvents(target, 'Attacked');

      if(damage !== 0) {
        damage = this.dealDamage(target, damage);

        if(target.hp === 0) {
          this.caster.$battle.tryIncrement(this.caster, `Combat.Kills.${target.isPlayer ? 'Player' : 'Monster'}`);
          this.caster.$battle.tryIncrement(target, `Combat.Deaths.${this.caster.isPlayer ? 'Player' : 'Monster'}`);

          this.caster.$battle.emitEvents(this.caster, 'Kill');
          this.caster.$battle.emitEvents(target, 'Killed');
        }
      }

      messageData.damage = damage;
      messageData.healed = Math.abs(damage);

      // TODO mark an attack as fatal somewhere else in metadata and display metadata on site
      if(message) {
        this.caster.$battle._emitMessage(this._emitMessage(this.caster, message, messageData));
      }

      if(applyEffect) {
        const effect = new applyEffect({ target, extra: applyEffectExtra, potency: applyEffectPotency || this.calcPotency(), duration: applyEffectDuration || this.calcDuration() });
        effect.origin = { name: this.caster.fullname, ref: this.caster, spell: applyEffectName || this.tier.name };
        target.$effects.add(effect);
        effect.affect(target);
        this.caster.$battle.tryIncrement(this.caster, `Combat.Give.Effect.${this.element}`);
        this.caster.$battle.tryIncrement(target, `Combat.Receive.Effect.${this.element}`);
      }
    });
  }

  preCast() {}

  dealDamage(target, damage) {
    return this.caster.$battle.dealDamage(target, damage);
  }

  minMax(min, max) {
    return Math.max(1, Spell.chance.integer({ min: min, max: Math.max(min+1, max) }));
  }

  applyCombatEffects(effects, target) {
    _.each(effects, stat => {
      const properEffect = _.capitalize(stat);
      const effect = require(`./effects/${properEffect}`)[properEffect];

      this.cast({
        damage: 0,
        message: '',
        applyEffect: effect,
        applyEffectName: stat,
        applyEffectDuration: stat === 'prone' ? 1 : this.calcDuration(),
        targets: [target]
      });
    });
  }

}

export const SpellType = {
  PHYSICAL: 'Physical',

  BUFF: 'Buff',
  DEBUFF: 'Debuff',

  HEAL: 'Heal',

  DIGITAL: 'Digital',
  ENERGY: 'Energy',
  HOLY: 'Holy',

  THUNDER: 'Thunder',
  FIRE: 'Fire',
  WATER: 'Water',
  ICE: 'Ice'
};
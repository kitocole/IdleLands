
import _ from 'lodash';
import { Dependencies } from 'constitute';
import { Character } from '../../core/base/character';

import { GameState } from '../../core/game-state';

import { SETTINGS } from '../../static/settings';

import { PlayerDb } from './player.db';
import { PlayerMovement } from './player.movement';
import { ItemGenerator } from '../../shared/item-generator';

import { DataUpdater } from '../../shared/data-updater';
import { EventHandler } from '../events/eventhandler';

import * as Events from '../events/events/_all';
import * as Achievements from '../achievements/achievements/_all';

import { emitter } from './_emitter';

@Dependencies(PlayerDb)
export class Player extends Character {
  constructor(playerDb) {
    super();
    this.$playerDb = playerDb;
    this.$playerMovement = PlayerMovement;
    this.$itemGenerator = ItemGenerator;
    this.$dataUpdater = DataUpdater;
  }

  init(opts) {
    super.init(opts);

    if(!this.joinDate)  this.joinDate = Date.now();
    if(!this.mapRegion) this.mapRegion = 'Wilderness';
    if(!this.gold)      this.gold = 0;
    if(!this.map)       this.map = 'Norkos';
    if(!this.x)         this.x = 10;
    if(!this.y)         this.y = 10;

    if(!this.choices)   this.choices = [];
    if(_.size(this.equipment) < 10) this.generateBaseEquipment();

    this.$updateAchievements = true;
    this.$updateCollectibles = true;

    this.$partyName = null;

    if(this.isMod) {
      this.emitGMData();
    }
  }

  quickLogin() {
    this.$updateAchievements = true;
    this.$updateCollectibles = true;

    if(this.isMod) {
      this.emitGMData();
    }
  }

  emitGMData() {
    const maps = _.keys(GameState.getInstance().world.maps);
    const teleNames = _.map(SETTINGS.allTeleports, 'name');
    const permAchs = _(Achievements)
      .values()
      .filter(ach => ach.permanentProp)
      .map(ach => ({ property: ach.permanentProp, name: ach.name }))
      .value();
    this.$dataUpdater(this.name, 'gmdata', { maps, teleNames, permAchs });
  }

  generateBaseEquipment() {
    const items = this.$itemGenerator.newPlayerEquipment();
    _.each(items, item => this.equip(item));
  }

  get fullname() {
    const viewName = this.nameEdit ? this.nameEdit : this.name;
    if(this.title) return `${viewName}, the ${this.title}`;
    return viewName;
  }

  takeTurn() {
    this.moveAction();
    EventHandler.tryToDoEvent(this);

    if(this.party) {
      this.party.playerTakeStep(this);
    }

    this.save();
  }

  levelUp() {
    if(this.level === SETTINGS.maxLevel) return;
    this._level.add(1);
    this.resetMaxXp();
    this._xp.toMinimum();
    this.recalculateStats();
    emitter.emit('player:levelup', { player: this });
  }

  gainGold(gold = 1) {
    gold += this.liveStats.gold;
    super.gainGold(gold);

    if(gold > 0) {
      this.$statistics.incrementStat('Character.Gold.Gain', gold);
    } else {
      this.$statistics.incrementStat('Character.Gold.Lose', -gold);
    }
  }

  gainXp(xp = 1) {
    xp += this.liveStats.xp;
    super.gainXp(xp);

    if(xp > 0) {
      this.$statistics.incrementStat('Character.XP.Gain', xp);
    } else {
      this.$statistics.incrementStat('Character.XP.Lose', -xp);
    }

    if(this._xp.atMaximum()) this.levelUp();
  }

  addChoice(messageData) {
    this.choices.push(messageData);

    if(this.choices.length > SETTINGS.maxChoices) {
      if(this.$personalities.isAnyActive(['Affirmer', 'Denier', 'Indecisive'])) {
        const choice = this.choices[0];
        if(_.includes(choice.choices, 'Yes') && this.$personalities.isActive('Affirmer')) {
          this.handleChoice({ id: choice.id, response: 'Yes' });

        } else if(_.includes(choice.choices, 'No') && this.$personalities.isActive('Denier')) {
          this.handleChoice({ id: choice.id, response: 'No' });

        } else if(this.$personalities.isActive('Indecisive')) {
          this.handleChoice({ id: choice.id, response: _.sample(choice.choices) });
        }

      } else {
        this.choices.shift();
        this.$statistics.incrementStat('Character.Choice.Ignore');
      }
    }

    this.$statistics.incrementStat('Character.Choices');
  }

  handleChoice({ id, response }) {
    const choice = _.find(this.choices, { id });
    if(!choice) return;
    const result = Events[choice.event].makeChoice(this, id, response);
    if(result === false) return Events[choice.event].feedback(this);
    this.$statistics.batchIncrement(['Character.Choice.Chosen', `Character.Choice.Choose.${response}`]);
    this.removeChoice(id);
    this.update();
  }

  removeChoice(id) {
    this.choices = _.reject(this.choices, { id });
  }

  changeGender(newGender) {
    if(!_.includes(SETTINGS.validGenders, newGender)) return;
    this.gender = newGender;
    emitter.emit('player:changegender', { player: this });
  }

  changeTitle(newTitle) {
    if(newTitle && !_.includes(this.$achievements.titles(), newTitle)) return;
    this.title = newTitle;
    emitter.emit('player:changetitle', { player: this });
  }

  changeName(newName) {
    if(!newName) return;
    this.nameEdit = newName;
    emitter.emit('player:changename', { player: this });
  }

  togglePersonality(personality) {
    if(!_.find(this.$personalities.earnedPersonalities, { name: personality })) return;
    this.$personalities.togglePersonality(this, personality);
    this._updatePersonalities();
  }

  moveAction() {
    let [newLoc, dir] = this.$playerMovement.pickRandomTile(this);
    let tile = this.$playerMovement.getTileAt(this.map, newLoc.x, newLoc.y);

    while(!this.$playerMovement.canEnterTile(this, tile)) {
      [newLoc, dir] = this.$playerMovement.pickRandomTile(this, true);
      tile = this.$playerMovement.getTileAt(this.map, newLoc.x, newLoc.y);
    }

    this.lastDir = dir === 5 ? null : dir;
    this.x = newLoc.x;
    this.y = newLoc.y;

    this.oldRegion = this.mapRegion;
    this.mapRegion = tile.region;

    this.mapPath = tile.path;

    this.$playerMovement.handleTile(this, tile);

    this.stepCooldown--;

    this.$statistics.batchIncrement([
      'Character.Steps',
      `Character.Maps.${this.map}`,
      `Character.Terrains.${tile.terrain}`,
      `Character.Regions.${tile.region}`
    ], false);

    this.gainXp(SETTINGS.xpPerStep);
  }

  buildSaveObject() {
    return _.omitBy(this, (val, key) => _.startsWith(key, '$'));
  }

  buildTransmitObject() {
    const badKeys = ['equipment', 'isOnline', 'stepCooldown', 'userId', 'lastDir'];
    return _.omitBy(this, (val, key) => {
      return _.startsWith(key, '$') || _.includes(key, 'Link') || _.includes(key, 'Steps') || _.includes(badKeys, key);
    });
  }

  save() {
    this.checkAchievements();

    if(!this.saveSteps) this.saveSteps = SETTINGS.saveSteps;
    this.saveSteps--;

    if(this.saveSteps <= 0) {
      this.$playerDb.savePlayer(this);
      this.saveSteps = SETTINGS.saveSteps;
    }
    this.update();
  }

  checkAchievements() {
    if(!this.achievementSteps) this.achievementSteps = SETTINGS.achievementSteps;
    this.achievementSteps--;

    if(this.achievementSteps <= 0) {
      const newAchievements = this.$achievements.checkAchievements(this);
      if(newAchievements.length > 0) {
        emitter.emit('player:achieve', { player: this, achievements: newAchievements });
        this.$personalities.checkPersonalities(this);
      }

      this.achievementSteps = SETTINGS.achievementSteps;
    }
  }

  _updatePlayer() {
    this.$dataUpdater(this.name, 'player', this.buildTransmitObject());
  }

  _updateParty() {
    const transmitObject = this.party ? this.party.buildTransmitObject() : {};
    if(this.$lastPartyObject && _.isEqual(transmitObject, this.$lastPartyObject)) return;
    this.$lastPartyObject = transmitObject;

    this.$dataUpdater(this.name, 'party', transmitObject);
  }

  _updateEquipment() {
    this.$dataUpdater(this.name, 'equipment', this.equipment);
  }

  _updateStatistics() {
    this.$dataUpdater(this.name, 'statistics', this.$statistics.stats);
  }

  _updateAchievements() {
    this.$dataUpdater(this.name, 'achievements', this.$achievements.achievements);
  }

  _updateCollectibles() {
    this.$dataUpdater(this.name, 'collectibles', this.$collectibles.collectibles);
  }

  _updatePersonalities() {
    this.$dataUpdater(this.name, 'personalities', { earned: this.$personalities.earnedPersonalities, active: this.$personalities.activePersonalities });
  }

  update() {
    this._updatePlayer();
    this._updateParty();
    // this._updateStatistics();
    /* if(this.$updateAchievements) {
      this._updateAchievements();
      this.$updateAchievements = false;
    } */
    /* if(this.$updateCollectibles) {
      this._updateCollectibles();
      this.$updateCollectibles = false;
    } */
    // this._updatePersonalities();
  }
}
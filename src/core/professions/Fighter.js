
import { Profession } from '../base/profession';

export class Fighter extends Profession {

  static baseHpPerLevel = Profession.baseHpPerLevel + 25;
  static baseMpPerLevel = Profession.baseMpPerLevel + 3;

  static baseMpPerStr = 1;
  static baseMpPerInt = 1;

  static baseConPerLevel = 2;
  static baseDexPerLevel = 4;
  static baseAgiPerLevel = 3;
  static baseStrPerLevel = 5;
  static baseIntPerLevel = 1;

  static classStats = {
    hpregen: (target) => target._hp.maximum * 0.075,
    prone: 1
  }
}
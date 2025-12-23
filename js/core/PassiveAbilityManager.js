/**
 * PassiveAbilityManager - управление пассивными способностями
 */
import { gameState } from './GameState.js';
import { Logger } from '../utils/helpers.js';

export class PassiveAbilityManager {
  /**
   * Применяет пассивную способность к игроку
   * @param {Object} ability - Объект способности из abilities.json
   */
  static applyPassiveAbility(ability) {
    if (!ability || ability.type !== 'passive') {
      Logger.log('❌ Некорректная пассивная способность');
      return false;
    }

    // Сохраняем исходные значения для отката
    gameState.passiveAbility = ability;
    gameState.passiveAbilityBases = {
      maxHp: gameState.player.maxHp,
      maxMana: gameState.player.maxMana,
      strength: gameState.player.stats.strength,
      agility: gameState.player.stats.agility,
      intelligence: gameState.player.stats.intelligence,
      endurance: gameState.player.stats.endurance
    };

    // Применяем эффекты
    this.applyEffects(ability.effects);

    Logger.log(`✨ Пассивная способность "${ability.name}" активирована!`);
    return true;
  }

  /**
   * Применяет эффекты пассивной способности
   * @param {Object} effects - Эффекты из способности
   */
  static applyEffects(effects) {
    const player = gameState.player;

    // HP бафф
    if (effects.hpBuff) {
      const hpIncrease = gameState.passiveAbilityBases.maxHp * effects.hpBuff;
      player.maxHp = Math.round(gameState.passiveAbilityBases.maxHp * (1 + effects.hpBuff));
      player.hp = Math.min(player.hp + hpIncrease, player.maxHp);
      Logger.log(`❤️ HP увеличена на ${Math.round(hpIncrease)} (${(effects.hpBuff * 100).toFixed(0)}%)`);
    }

    // Mana бафф
    if (effects.manaBuff) {
      const manaIncrease = gameState.passiveAbilityBases.maxMana * effects.manaBuff;
      player.maxMana = Math.round(gameState.passiveAbilityBases.maxMana * (1 + effects.manaBuff));
      player.mana = Math.min(player.mana + manaIncrease, player.maxMana);
      Logger.log(`💙 Мана увеличена на ${Math.round(manaIncrease)} (${(effects.manaBuff * 100).toFixed(0)}%)`);
    }

    // Урон бафф (хранится для использования в расчетах)
    if (effects.damageBuff) {
      Logger.log(`⚡ Урон повышен на ${(effects.damageBuff * 100).toFixed(0)}%`);
    }

    // Защита бафф (хранится для использования в расчетах)
    if (effects.defenceBuff) {
      Logger.log(`🛡️ Защита повышена на ${(effects.defenceBuff * 100).toFixed(0)}%`);
    }

    // Ловкость бафф (прямое добавление)
    if (effects.agilityBuff && typeof effects.agilityBuff === 'number') {
      player.stats.agility += effects.agilityBuff;
      Logger.log(`🎯 Ловкость увеличена на ${effects.agilityBuff}`);
    }

    // Опыт бафф (хранится для использования в расчетах)
    if (effects.experienceBuff) {
      Logger.log(`📈 Опыт будет повышен на ${(effects.experienceBuff * 100).toFixed(0)}%`);
    }
  }

  /**
   * Удаляет текущую пассивную способность
   */
  static removePassiveAbility() {
    if (!gameState.passiveAbility) {
      Logger.log('ℹ️ Нет активной пассивной способности');
      return false;
    }

    const ability = gameState.passiveAbility;
    const bases = gameState.passiveAbilityBases;
    const player = gameState.player;

    // Восстанавливаем исходные значения
    if (bases) {
      player.maxHp = bases.maxHp;
      player.maxMana = bases.maxMana;
      player.stats.strength = bases.strength;
      player.stats.agility = bases.agility;
      player.stats.intelligence = bases.intelligence;
      player.stats.endurance = bases.endurance;

      // Устанавливаем HP и Mana в пределах нового максимума
      player.hp = Math.min(player.hp, player.maxHp);
      player.mana = Math.min(player.mana, player.maxMana);
    }

    Logger.log(`❌ Пассивная способность "${ability.name}" отключена`);
    gameState.passiveAbility = null;
    gameState.passiveAbilityBases = null;

    return true;
  }

  /**
   * Получает модификатор урона от пассивной способности
   * @returns {number} Множитель урона (1.0 - без изменений, 1.1 - +10% и т.д.)
   */
  static getDamageModifier() {
    if (!gameState.passiveAbility || !gameState.passiveAbility.effects.damageBuff) {
      return 1.0;
    }
    return 1 + gameState.passiveAbility.effects.damageBuff;
  }

  /**
   * Получает модификатор защиты от пассивной способности
   * @returns {number} Модификатор защиты (0.05 - 5% снижение урона и т.д.)
   */
  static getDefenceModifier() {
    if (!gameState.passiveAbility || !gameState.passiveAbility.effects.defenceBuff) {
      return 0;
    }
    return gameState.passiveAbility.effects.defenceBuff;
  }

  /**
   * Получает модификатор опыта от пассивной способности
   * @returns {number} Множитель опыта (1.0 - без изменений, 1.15 - +15% и т.д.)
   */
  static getExperienceModifier() {
    if (!gameState.passiveAbility || !gameState.passiveAbility.effects.experienceBuff) {
      return 1.0;
    }
    return 1 + gameState.passiveAbility.effects.experienceBuff;
  }

  /**
   * Возвращает описание эффектов пассивной способности
   * @returns {string} Форматированное описание эффектов
   */
  static getEffectsDescription() {
    if (!gameState.passiveAbility) return '';

    const effects = gameState.passiveAbility.effects;
    const descriptions = [];

    if (effects.hpBuff) {
      descriptions.push(`❤️ +${(effects.hpBuff * 100).toFixed(0)}% к максимальному HP`);
    }
    if (effects.manaBuff) {
      descriptions.push(`💙 +${(effects.manaBuff * 100).toFixed(0)}% к максимальной мане`);
    }
    if (effects.damageBuff) {
      descriptions.push(`⚡ +${(effects.damageBuff * 100).toFixed(0)}% к урону`);
    }
    if (effects.defenceBuff) {
      descriptions.push(`🛡️ -${(effects.defenceBuff * 100).toFixed(0)}% получаемого урона`);
    }
    if (effects.agilityBuff) {
      descriptions.push(`🎯 +${effects.agilityBuff} к ловкости`);
    }
    if (effects.experienceBuff) {
      descriptions.push(`📈 +${(effects.experienceBuff * 100).toFixed(0)}% к опыту`);
    }

    return descriptions.join('\n');
  }
}

export const passiveAbilityManager = new PassiveAbilityManager();

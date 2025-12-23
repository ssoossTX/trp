/**
 * GameState - управляет состоянием игры
 */
import { GAME_CONSTANTS } from '../utils/constants.js';
import { Logger } from '../utils/helpers.js';

class GameState {
  constructor() {
    this.player = {
      class: null,
      classId: null,
      classData: null,
      ability: null,
      stats: {},
      level: 1,
      experience: 0,
      hp: 0,
      maxHp: 0,
      mana: 50,
      maxMana: 50,
      gold: 100
    };

    this.battle = {
      isInBattle: false,
      currentEnemy: null,
      currentLocation: null,
      playerHp: 0,
      playerMaxHp: 0,
      // Активные способности и их состояние
      activeAbilities: [],
      abilityStates: {}, // { "abilityName": { cooldown: 0, isActive: false } }
      buffedAttacks: 0, // Кол-во усиленных атак (для Боевого клича)
      buffMultiplier: 1.5 // Множитель урона при усилении
    };

    this.currentTab = GAME_CONSTANTS.TABS.WORLD;
  }

  /**
   * Инициализирует нового игрока с выбранным классом
   * @param {Object} classData - Данные класса
   * @param {string} abilityName - Выбранная способность
   */
  initializePlayer(classData, abilityName) {
    this.player.classId = classData.id;
    this.player.class = classData.name;
    this.player.classData = classData;
    this.player.ability = abilityName;
    this.player.stats = { ...classData.stats };

    const maxHp = classData.stats.endurance * GAME_CONSTANTS.BASE_HP_MULTIPLIER;
    this.player.maxHp = maxHp;
    this.player.hp = maxHp;

    // Применяем бонусы от выбранной способности
    this.applyAbilityBonus(abilityName);

    Logger.log(`Игрок инициализирован: ${classData.name}, способность: ${abilityName}`);
  }

  /**
   * Применяет бонусы от способности к характеристикам игрока
   * @param {string} abilityName - Имя способности
   */
  applyAbilityBonus(abilityName) {
    if (!abilityName) return;

    switch (abilityName) {
      case 'Усиленный удар':
        // +10% к урону всех атак (применяется через модификатор силы)
        this.player.stats.strength = Math.round(this.player.stats.strength * 1.1);
        Logger.log(`✓ Способность применена: Усиленный удар (+10% урон)`);
        break;

      case 'Крепкое тело':
        // +10% к максимальному HP
        this.player.maxHp = Math.round(this.player.maxHp * 1.1);
        this.player.hp = this.player.maxHp;
        Logger.log(`✓ Способность применена: Крепкое тело (+10% HP: ${this.player.maxHp})`);
        break;

      case 'Магический резерв':
        // +10% к максимальной мане
        this.player.maxMana = Math.round(this.player.maxMana * 1.1);
        this.player.mana = this.player.maxMana;
        Logger.log(`✓ Способность применена: Магический резерв (+10% мана: ${this.player.maxMana})`);
        break;

      case 'Боевая хватка':
        // +5% к ловкости
        this.player.stats.agility = Math.round(this.player.stats.agility * 1.05);
        Logger.log(`✓ Способность применена: Боевая хватка (+5% ловкость)`);
        break;

      case 'Древний артефакт':
        // +15% к выносливости (как защита от магии)
        this.player.stats.endurance = Math.round(this.player.stats.endurance * 1.15);
        Logger.log(`✓ Способность применена: Древний артефакт (+15% выносливость)`);
        break;

      case 'Боевой опыт':
        // +5% к интеллекту (как улучшение опыта)
        this.player.stats.intelligence = Math.round(this.player.stats.intelligence * 1.05);
        Logger.log(`✓ Способность применена: Боевой опыт (+5% интеллект)`);
        break;

      default:
        Logger.log(`Неизвестная способность: ${abilityName}`);
    }
  }

  /**
   * Инициализирует боевое состояние
   * @param {Object} enemy - Враг
   * @param {string} locationId - ID локации
   * @param {Array} activeAbilities - Активные способности персонажа
   */
  initializeBattle(enemy, locationId, activeAbilities = []) {
    this.battle.currentEnemy = {
      ...enemy,
      currentHp: enemy.hp
    };
    this.battle.currentLocation = locationId;
    this.battle.playerHp = this.player.hp;
    this.battle.playerMaxHp = this.player.maxHp;
    this.battle.isInBattle = true;
    
    // Загружаем активные способности
    this.battle.activeAbilities = [...activeAbilities];
    
    // Инициализируем состояние способностей (все доступны в начале боя)
    this.battle.abilityStates = {};
    activeAbilities.forEach(ability => {
      this.battle.abilityStates[ability.name] = {
        cooldown: 0,
        isActive: false
      };
    });
    
    // Сбрасываем усиления
    this.battle.buffedAttacks = 0;
    this.battle.buffMultiplier = 1.0;

    Logger.log(`Бой начался с ${enemy.name} в локации ${locationId}`);
    Logger.log(`Активные способности: ${activeAbilities.map(a => a.name).join(', ')}`);
  }

  /**
   * Завершает боевое состояние и синхронизирует HP
   */
  endBattle() {
    this.player.hp = this.battle.playerHp;
    this.battle.isInBattle = false;
    this.battle.currentEnemy = null;
    this.battle.activeAbilities = [];
    this.battle.abilityStates = {};
    this.battle.buffedAttacks = 0;
    this.battle.buffMultiplier = 1.0;
    Logger.log('Бой завершён');
  }

  /**
   * Восстанавливает HP и mana до максимума (при входе/выходе из локации)
   */
  restoreResources() {
    this.player.hp = this.player.maxHp;
    this.player.mana = this.player.maxMana;
    Logger.log(`Ресурсы восстановлены: HP ${this.player.hp}/${this.player.maxHp}, Mana ${this.player.mana}/${this.player.maxMana}`);
  }

  /**
   * Возвращает дополнительный урон на основе характеристик
   * @returns {number} Урон
   */
  getPlayerBaseDamage() {
    return (this.player.stats.strength + this.player.stats.agility) * 0.5;
  }

  /**
   * Возвращает текущее состояние игрока
   * @returns {Object} Состояние
   */
  getPlayerState() {
    return { ...this.player };
  }

  /**
   * Возвращает текущее состояние боя
   * @returns {Object} Состояние боя
   */
  getBattleState() {
    return { ...this.battle };
  }

  /**
   * Проверяет, доступна ли способность
   * @param {string} abilityName - Название способности
   * @returns {boolean} Доступна ли способность
   */
  isAbilityAvailable(abilityName) {
    if (!this.battle.abilityStates[abilityName]) return false;
    return this.battle.abilityStates[abilityName].cooldown === 0;
  }

  /**
   * Устанавливает кулдаун способности
   * @param {string} abilityName - Название способности
   * @param {number} cooldown - Количество ходов
   */
  setAbilityCooldown(abilityName, cooldown) {
    if (this.battle.abilityStates[abilityName]) {
      this.battle.abilityStates[abilityName].cooldown = cooldown;
      Logger.log(`Способность "${abilityName}" на кулдауне: ${cooldown} ход(а)`);
    }
  }

  /**
   * Уменьшает кулдауны способностей на 1
   */
  decrementAbilityCooldowns() {
    Object.keys(this.battle.abilityStates).forEach(abilityName => {
      if (this.battle.abilityStates[abilityName].cooldown > 0) {
        this.battle.abilityStates[abilityName].cooldown--;
      }
    });
  }

  /**
   * Применяет усиление Боевой клич
   */
  activateBattleCry() {
    this.battle.buffedAttacks = 2;
    this.battle.buffMultiplier = 1.5;
    const ability = this.battle.activeAbilities.find(a => a.name === 'Боевой клич');
    if (ability) {
      this.setAbilityCooldown('Боевой клич', ability.cooldown);
    }
    Logger.log('⚡ Боевой клич! Следующие 2 удара усилены на 50%');
  }

  /**
   * Применяет Мощный удар
   * @returns {number} Множитель урона (200%)
   */
  activatePowerAttack() {
    const ability = this.battle.activeAbilities.find(a => a.name === 'Мощный удар');
    if (ability) {
      this.setAbilityCooldown('Мощный удар', ability.cooldown);
    }
    Logger.log('💥 Мощный удар! Урон: 200%');
    return 2.0; // 200% damage
  }

  /**
   * Уменьшает счётчик усиленных ударов
   */
  decrementBuffedAttacks() {
    if (this.battle.buffedAttacks > 0) {
      this.battle.buffedAttacks--;
      if (this.battle.buffedAttacks === 0) {
        this.battle.buffMultiplier = 1.0;
        Logger.log('Усиление закончилось');
      }
    }
  }
}

export const gameState = new GameState();

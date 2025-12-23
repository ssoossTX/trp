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
      playerMaxHp: 0
    };

    this.currentTab = GAME_CONSTANTS.TABS.WORLD;
  }

  /**
   * Инициализирует нового игрока с выбранным классом
   * @param {Object} classData - Данные класса
   * @param {string} ability - Выбранная способность
   */
  initializePlayer(classData, ability) {
    this.player.classId = classData.id;
    this.player.class = classData.name;
    this.player.classData = classData;
    this.player.ability = ability;
    this.player.stats = { ...classData.stats };

    const maxHp = classData.stats.endurance * GAME_CONSTANTS.BASE_HP_MULTIPLIER;
    this.player.maxHp = maxHp;
    this.player.hp = maxHp;

    Logger.log(`Игрок инициализирован: ${classData.name}, способность: ${ability}`);
  }

  /**
   * Инициализирует боевое состояние
   * @param {Object} enemy - Враг
   * @param {string} locationId - ID локации
   */
  initializeBattle(enemy, locationId) {
    this.battle.currentEnemy = {
      ...enemy,
      currentHp: enemy.hp
    };
    this.battle.currentLocation = locationId;
    this.battle.playerHp = this.player.hp;
    this.battle.playerMaxHp = this.player.maxHp;
    this.battle.isInBattle = true;

    Logger.log(`Бой начался с ${enemy.name} в локации ${locationId}`);
  }

  /**
   * Завершает боевое состояние и синхронизирует HP
   */
  endBattle() {
    this.player.hp = this.battle.playerHp;
    this.battle.isInBattle = false;
    this.battle.currentEnemy = null;
    Logger.log('Бой завершён');
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
}

export const gameState = new GameState();

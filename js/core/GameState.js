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
      selectedAbility: null,
      stats: {},
      level: 1,
      experience: 0,
      requiredExperienceForLevel: 100,
      abilityPoints: 0,
      hp: 0,
      maxHp: 0,
      mana: 50,
      maxMana: 50,
      gold: 0,
      inventory: [],
      dungeonsProgress: {}, // Прогресс по подземельям
      wounds: 0 // Счетчик ранений при бегстве из боев на локации (макс 5)
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
      buffMultiplier: 1.5, // Множитель урона при усилении
      shieldActive: false, // Магический щит/Последний рубеж активен
      shieldTurnsLeft: 0, // Оставшиеся ходы щита
      shieldDamageReduction: 0.25, // Снижение урона (25% для Мага, 50% для Танка)
      // Состояния для Вора
      hasExtraTurn: false, // Есть ли дополнительный ход после Быстрой атаки
      isEvading: false, // Находится ли в режиме Ухода в тень
      evadingTurnsLeft: 0, // Оставшиеся ходы невидимости
      // Состояния для врага (Целитель)
      enemyWeakened: false, // Враг под проклятием слабости
      weaknessTurnsLeft: 0, // Оставшиеся ходы проклятия
      weaknessDamageReduction: 0.5, // Враг наносит 50% урона
      // Зелья
      potionHpUsed: 0, // Кол-во использованных HP зелий в этой битве
      potionManaUsed: 0, // Кол-во использованных Mana зелий в этой битве
      potionHpCooldown: 0, // Кулдаун HP зелья
      potionManaCooldown: 0 // Кулдаун Mana зелья
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

    // Сохраняем выбранную способность ДО расчета ресурсов (для применения бонусов)
    this.player.selectedAbility = abilityName;

    // Применяем бонусы при расчете максимального HP
    const baseMaxHp = classData.stats.endurance * GAME_CONSTANTS.BASE_HP_MULTIPLIER;
    const hpMultiplier = this.getAbilityBonus('hp');
    this.player.maxHp = Math.round(baseMaxHp * hpMultiplier);
    this.player.hp = this.player.maxHp;
    
    // Применяем бонусы при расчете максимальной маны
    const baseMaxMana = classData.stats.intelligence * GAME_CONSTANTS.BASE_MANA_MULTIPLIER;
    const manaMultiplier = this.getAbilityBonus('mana');
    this.player.maxMana = Math.round(baseMaxMana * manaMultiplier);
    this.player.mana = this.player.maxMana;
    
    // Инициализируем систему уровней
    this.player.level = 1;
    this.player.experience = 0;
    this.player.requiredExperienceForLevel = this.calculateRequiredExperience(1);
    this.player.abilityPoints = 0;

    Logger.log(`Игрок инициализирован: ${classData.name}, способность: ${abilityName}`);
  }

  /**
   * Возвращает бонус от выбранной начальной способности
   * @param {string} type - Тип бонуса (damage, hp, mana, agility, damage_reduction, xp)
   * @returns {number} Множитель бонуса (1.0 если нет бонуса)
   */
  getAbilityBonus(type) {
    // Сначала проверяем выбранную способность (для подземелий и обычных боев)
    if (this.player.selectedAbility) {
      const abilityMap = {
        'Усиленный удар': { type: 'damage', multiplier: 1.1 },
        'Крепкое тело': { type: 'hp', multiplier: 1.1 },
        'Магический резерв': { type: 'mana', multiplier: 1.1 },
        'Боевая хватка': { type: 'agility', multiplier: 1.05 },
        'Древний артефакт': { type: 'damage_reduction', multiplier: 0.85 },
        'Боевой опыт': { type: 'xp', multiplier: 1.05 }
      };

      const ability = abilityMap[this.player.selectedAbility];
      if (ability && ability.type === type) {
        return ability.multiplier;
      }
    }
    
    // Если нет выбранной способности, проверяем активные способности боя (для локации)
    if (this.battle && this.battle.activeAbilities && this.battle.activeAbilities.length > 0) {
      const abilityMap = {
        'Усиленный удар': { type: 'damage', multiplier: 1.1 },
        'Крепкое тело': { type: 'hp', multiplier: 1.1 },
        'Магический резерв': { type: 'mana', multiplier: 1.1 },
        'Боевая хватка': { type: 'agility', multiplier: 1.05 },
        'Древний артефакт': { type: 'damage_reduction', multiplier: 0.85 },
        'Боевой опыт': { type: 'xp', multiplier: 1.05 }
      };

      // Проверяем каждую активную способность
      for (const ability of this.battle.activeAbilities) {
        const abilityName = typeof ability === 'string' ? ability : ability.name;
        const abilityData = abilityMap[abilityName];
        if (abilityData && abilityData.type === type) {
          return abilityData.multiplier;
        }
      }
    }
    
    return 1.0;
  }

  /**
   * Инициализирует боевое состояние
   * @param {Object} enemy - Враг
   * @param {string} locationId - ID локации
   * @param {Array} activeAbilities - Активные способности персонажа
   */
  initializeBattle(enemy, locationId, activeAbilities = []) {
    // Определяем правильный параметр HP (hp или maxHp)
    const enemyMaxHp = enemy.hp || enemy.maxHp;
    
    this.battle.currentEnemy = {
      ...enemy,
      hp: enemyMaxHp,
      currentHp: enemyMaxHp
    };
    this.battle.currentLocation = locationId;
    
    // Применяем штраф HP за ранения (-10% за каждое ранение)
    const hpPenaltyMultiplier = Math.max(0, 1 - (this.player.wounds * 0.1));
    const adjustedMaxHp = Math.round(this.player.maxHp * hpPenaltyMultiplier);
    
    // Копируем уже рассчитанные (с бонусами) значения ресурсов
    this.battle.playerMaxHp = adjustedMaxHp;
    this.battle.playerHp = Math.round(this.player.hp * hpPenaltyMultiplier);
    this.battle.playerMaxMana = this.player.maxMana;
    this.battle.playerMana = this.player.mana;
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
    
    // Сбрасываем усиления и защиту
    this.battle.buffedAttacks = 0;
    this.battle.buffMultiplier = 1.0;
    this.battle.shieldActive = false;
    this.battle.shieldTurnsLeft = 0;
    
    // Сбрасываем состояния Вора
    this.battle.hasExtraTurn = false;
    this.battle.isEvading = false;
    this.battle.evadingTurnsLeft = 0;
    
    // Сбрасываем состояния врага (Целитель)
    this.battle.enemyWeakened = false;
    this.battle.weaknessTurnsLeft = 0;
    
    // Сбрасываем счетчики зелий
    this.battle.potionHpUsed = 0;
    this.battle.potionManaUsed = 0;
    this.battle.potionHpCooldown = 0;
    this.battle.potionManaCooldown = 0;

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
    this.battle.shieldActive = false;
    this.battle.shieldTurnsLeft = 0;
    this.battle.hasExtraTurn = false;
    this.battle.isEvading = false;
    this.battle.evadingTurnsLeft = 0;
    this.battle.enemyWeakened = false;
    this.battle.weaknessTurnsLeft = 0;
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
    let agility = this.player.stats.agility;
    // Применяем бонус ловкости от выбранной способности
    agility *= this.getAbilityBonus('agility');
    
    let damage = (this.player.stats.strength + agility) * 0.5;
    // Применяем бонус урона от выбранной способности
    damage *= this.getAbilityBonus('damage');
    return damage;
  }

  /**
   * Возвращает магический урон (для Мага и Целителя)
   * @returns {number} Магический урон
   */
  getPlayerMagicDamage() {
    let agility = this.player.stats.agility;
    // Применяем бонус ловкости от выбранной способности
    agility *= this.getAbilityBonus('agility');
    
    let damage = (this.player.stats.intelligence + agility) * 0.5;
    // Применяем бонус урона от выбранной способности
    damage *= this.getAbilityBonus('damage');
    return damage;
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
   * Проверяет хватает ли маны для использования способности
   * @param {number} manaCost - Стоимость маны
   * @returns {boolean} Есть ли достаточно маны
   */
  hasEnoughMana(manaCost) {
    return this.battle.playerMana >= manaCost;
  }

  /**
   * Вычитает ману при использовании способности
   * @param {number} manaCost - Стоимость маны
   */
  spendMana(manaCost) {
    if (this.hasEnoughMana(manaCost)) {
      this.battle.playerMana -= manaCost;
    }
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

  /**
   * Применяет Огненный шар (Маг)
   * @returns {number} Множитель урона (500%)
   */
  activateFireball() {
    const ability = this.battle.activeAbilities.find(a => a.name === 'Огненный шар');
    if (ability) {
      this.setAbilityCooldown('Огненный шар', ability.cooldown);
    }
    Logger.log('🔥 Огненный шар! Урон: 500%');
    return 5.0; // 500% damage
  }

  /**
   * Применяет Магический щит (Маг)
   */
  activateMagicShield() {
    const ability = this.battle.activeAbilities.find(a => a.name === 'Магический щит');
    if (ability) {
      this.setAbilityCooldown('Магический щит', ability.cooldown);
    }
    this.battle.shieldActive = true;
    this.battle.shieldTurnsLeft = 2;
    Logger.log('🛡️ Магический щит активирован! Урон снижен на 25% на 2 хода');
  }

  /**
   * Уменьшает длительность магического щита
   */
  decrementShieldTurns() {
    if (this.battle.shieldTurnsLeft > 0) {
      this.battle.shieldTurnsLeft--;
      if (this.battle.shieldTurnsLeft === 0) {
        this.battle.shieldActive = false;
        Logger.log('Магический щит исчез');
      }
    }
  }

  /**
   * Применяет защиту магического щита к урону
   * @param {number} damage - Входящий урон
   * @returns {number} Урон после защиты
   */
  applyShieldProtection(damage) {
    if (this.battle.shieldActive) {
      const reducedDamage = Math.round(damage * (1 - this.battle.shieldDamageReduction));
      const blocked = damage - reducedDamage;
      Logger.log(`🛡️ Магический щит заблокировал ${blocked} урона`);
      return reducedDamage;
    }
    return damage;
  }

  /**
   * Активирует способность Щитовой удар (Танк)
   * Наносит урон в зависимости от потеряного HP: потеря% × 2
   */
  activateShieldBash() {
    const ability = this.battle.activeAbilities.find(a => a.name === 'Щитовой удар');
    if (ability && !this.isAbilityAvailable('Щитовой удар')) {
      return null; // На кулдауне
    }
    
    // Вычисляем процент потеряного HP
    const maxHp = this.battle.playerMaxHp;
    const currentHp = this.battle.playerHp;
    const hpLost = maxHp - currentHp;
    const hpLossPercent = hpLost / maxHp;
    
    // Урон = базовый урон × (потеря% + 1.5) × 2
    const baseDamage = this.getPlayerBaseDamage();
    const damage = Math.round(baseDamage * (hpLossPercent + 1.5) * 2);
    
    if (ability) {
      this.setAbilityCooldown('Щитовой удар', ability.cooldown);
    }
    Logger.log(`⚔️ Щитовой удар! Урон: ${damage} (потеряно ${Math.round(hpLossPercent * 100)}% HP)`);
    return damage;
  }

  /**
   * Активирует способность Последний рубеж (Танк)
   * Получает на 50% меньше урона в течение 2 ходов
   */
  activateLastStand() {
    const ability = this.battle.activeAbilities.find(a => a.name === 'Последний рубеж');
    if (ability && !this.isAbilityAvailable('Последний рубеж')) {
      return false; // На кулдауне
    }
    
    if (ability) {
      this.setAbilityCooldown('Последний рубеж', ability.cooldown);
    }
    this.battle.shieldActive = true;
    this.battle.shieldTurnsLeft = 2;
    this.battle.shieldDamageReduction = 0.50; // 50% защиты
    Logger.log('🛡️ Последний рубеж активирован! Урон снижен на 50% на 2 хода');
    return true;
  }

  /**
   * Активирует способность Точный выстрел (Лучник)
   * Критический удар в голову с 500% урона
   */
  activatePreciseShot() {
    const ability = this.battle.activeAbilities.find(a => a.name === 'Точный выстрел');
    if (ability && !this.isAbilityAvailable('Точный выстрел')) {
      return null; // На кулдауне
    }
    
    const baseDamage = this.getPlayerBaseDamage();
    const damage = Math.round(baseDamage * 5); // 500% = 5x
    
    if (ability) {
      this.setAbilityCooldown('Точный выстрел', ability.cooldown);
    }
    Logger.log(`🎯 Точный выстрел! Критический удар в голову: ${damage} урона!`);
    return damage;
  }

  /**
   * Активирует способность Скоростной залп (Лучник)
   * Наносит сразу 3 удара
   */
  activateRapidVolley() {
    const ability = this.battle.activeAbilities.find(a => a.name === 'Скоростной залп');
    if (ability && !this.isAbilityAvailable('Скоростной залп')) {
      return null; // На кулдауне
    }
    
    const baseDamage = this.getPlayerBaseDamage();
    const damage = Math.round(baseDamage * 3); // 3 удара
    
    if (ability) {
      this.setAbilityCooldown('Скоростной залп', ability.cooldown);
    }
    Logger.log(`🏹 Скоростной залп! 3 быстрых удара: ${damage} урона!`);
    return damage;
  }

  /**
   * Активирует способность Быстрая атака (Вор)
   * Наносит 200% урона и получает ещё один ход
   */
  activateFastAttack() {
    const ability = this.battle.activeAbilities.find(a => a.name === 'Быстрая атака');
    if (ability && !this.isAbilityAvailable('Быстрая атака')) {
      return null; // На кулдауне
    }
    
    const baseDamage = this.getPlayerBaseDamage();
    const damage = Math.round(baseDamage * 2); // 200% урона
    
    if (ability) {
      this.setAbilityCooldown('Быстрая атака', ability.cooldown);
    }
    this.battle.hasExtraTurn = true;
    Logger.log(`⚡ Быстрая атака! Урон: ${damage}. Получен ещё один ход!`);
    return damage;
  }

  /**
   * Активирует способность Уход в тень (Вор)
   * На 2 хода враг не видит и не может ударить
   */
  activateShadowEvasion() {
    const ability = this.battle.activeAbilities.find(a => a.name === 'Уход в тень');
    if (ability && !this.isAbilityAvailable('Уход в тень')) {
      return false; // На кулдауне
    }
    
    if (ability) {
      this.setAbilityCooldown('Уход в тень', ability.cooldown);
    }
    this.battle.isEvading = true;
    this.battle.evadingTurnsLeft = 2;
    Logger.log('🌫️ Уход в тень! Враг тебя не видит 2 хода!');
    return true;
  }

  /**
   * Декрементирует длительность ухода в тень
   */
  decrementEvadingTurns() {
    if (this.battle.isEvading && this.battle.evadingTurnsLeft > 0) {
      this.battle.evadingTurnsLeft--;
      if (this.battle.evadingTurnsLeft === 0) {
        this.battle.isEvading = false;
        Logger.log('🌫️ Уход в тень закончился!');
      }
    }
  }

  /**
   * Активирует способность Исцеление (Целитель)
   * Восстанавливает 25% HP
   */
  activateHealing() {
    const ability = this.battle.activeAbilities.find(a => a.name === 'Исцеление');
    if (ability && !this.isAbilityAvailable('Исцеление')) {
      return null; // На кулдауне
    }
    
    const healAmount = Math.round(this.battle.playerMaxHp * 0.25); // 25% HP
    this.battle.playerHp = Math.min(this.battle.playerHp + healAmount, this.battle.playerMaxHp);
    
    if (ability) {
      this.setAbilityCooldown('Исцеление', ability.cooldown);
    }
    Logger.log(`✨ Исцеление! Восстановлено ${healAmount} HP!`);
    return healAmount;
  }

  /**
   * Активирует способность Проклятие слабости (Целитель)
   * Враг наносит в 2 раза меньше урона на 4 хода
   */
  activateWeaknessCurse() {
    const ability = this.battle.activeAbilities.find(a => a.name === 'Проклятие слабости');
    if (ability && !this.isAbilityAvailable('Проклятие слабости')) {
      return false; // На кулдауне
    }
    
    if (ability) {
      this.setAbilityCooldown('Проклятие слабости', ability.cooldown);
    }
    this.battle.enemyWeakened = true;
    this.battle.weaknessTurnsLeft = 4;
    Logger.log('😵 Проклятие слабости! Враг наносит в 2 раза меньше урона на 4 хода!');
    return true;
  }

  /**
   * Декрементирует длительность проклятия слабости
   */
  decrementWeaknessTurns() {
    if (this.battle.enemyWeakened && this.battle.weaknessTurnsLeft > 0) {
      this.battle.weaknessTurnsLeft--;
      if (this.battle.weaknessTurnsLeft === 0) {
        this.battle.enemyWeakened = false;
        Logger.log('😵 Проклятие слабости закончилось!');
      }
    }
  }

  /**
   * Применяет проклятие слабости к урону врага
   */
  applyWeaknessCurse(damage) {
    if (this.battle.enemyWeakened) {
      return Math.round(damage * this.battle.weaknessDamageReduction); // 50% урона
    }
    return damage;
  }

  /**
   * Добавляет золото игроку
   * @param {number} amount - Количество золота
   */
  addGold(amount) {
    this.player.gold += amount;
    Logger.log(`💰 Получено ${amount} золота! Всего: ${this.player.gold}`);
  }

  /**
   * Добавляет предметы в инвентарь (будет реализовано позже)
   * @param {Array} items - Массив предметов
   */
  addItems(items) {
    if (!this.player.inventory) {
      this.player.inventory = [];
    }
    items.forEach(item => {
      this.player.inventory.push(item);
      Logger.log(`📦 Получен предмет: ${item.name}`);
    });
  }

  /**
   * Рассчитывает требуемый опыт для достижения уровня
   * @param {number} level - Уровень для расчета
   * @returns {number} Требуемое количество опыта
   */
  calculateRequiredExperience(level) {
    const baseCost = 100;
    const growthFactor = 1.3;
    return Math.round(baseCost * Math.pow(level, growthFactor));
  }

  /**
   * Добавляет опыт игроку
   * @param {number} amount - Количество опыта
   */
  addExperience(amount) {
    // Применяем бонус от выбранной способности
    const bonusMultiplier = this.getAbilityBonus('xp');
    const finalAmount = Math.round(amount * bonusMultiplier);
    
    this.player.experience += finalAmount;
    if (bonusMultiplier > 1.0) {
      Logger.log(`⭐ Получено ${finalAmount} опыта! (+${Math.round((bonusMultiplier - 1) * 100)}% бонус)`);
    } else {
      Logger.log(`⭐ Получено ${finalAmount} опыта!`);
    }
    
    // Проверяем, достаточно ли опыта для повышения уровня
    while (this.player.experience >= this.player.requiredExperienceForLevel) {
      this.levelUp();
    }
  }

  /**
   * Повышает уровень персонажа
   */
  levelUp() {
    this.player.experience -= this.player.requiredExperienceForLevel;
    this.player.level += 1;
    this.player.abilityPoints += 3; // 3 очка способностей за уровень
    
    // Рассчитываем новое требуемое количество опыта
    this.player.requiredExperienceForLevel = this.calculateRequiredExperience(this.player.level);
    
    // Восстанавливаем HP при повышении уровня
    this.player.hp = this.player.maxHp;
    
    Logger.log(`🎉 Повышение уровня! Уровень: ${this.player.level}, очки способностей: +3`);
  }

  /**
   * Увеличивает характеристику на 1
   * @param {string} statName - Название характеристики (strength, agility, intelligence, endurance)
   * @returns {boolean} Успешно ли распределено очко
   */
  increaseStat(statName) {
    const MAX_STAT_VALUE = 100;
    
    // Проверяем, хватает ли очков
    if (this.player.abilityPoints <= 0) {
      Logger.log(`❌ Недостаточно очков способностей!`);
      return false;
    }
    
    // Проверяем, не превышен ли максимум
    if (this.player.stats[statName] >= MAX_STAT_VALUE) {
      Logger.log(`❌ Максимальное значение характеристики ${statName} достигнуто!`);
      return false;
    }
    
    // Увеличиваем характеристику
    this.player.stats[statName] += 1;
    this.player.abilityPoints -= 1;
    
    // Обновляем HP если увеличена выносливость
    if (statName === 'endurance') {
      const baseMaxHp = this.player.stats.endurance * GAME_CONSTANTS.BASE_HP_MULTIPLIER;
      const hpMultiplier = this.getAbilityBonus('hp');
      const newMaxHp = Math.round(baseMaxHp * hpMultiplier);
      const hpGain = newMaxHp - this.player.maxHp;
      this.player.maxHp = newMaxHp;
      this.player.hp = Math.min(this.player.hp + hpGain, this.player.maxHp);
    }
    
    // Обновляем Mana если увеличен интеллект
    if (statName === 'intelligence') {
      const baseMaxMana = this.player.stats.intelligence * GAME_CONSTANTS.BASE_MANA_MULTIPLIER;
      const manaMultiplier = this.getAbilityBonus('mana');
      const newMaxMana = Math.round(baseMaxMana * manaMultiplier);
      const manaGain = newMaxMana - this.player.maxMana;
      this.player.maxMana = newMaxMana;
      this.player.mana = Math.min(this.player.mana + manaGain, this.player.maxMana);
    }
    
    Logger.log(`⬆️ ${statName} увеличена до ${this.player.stats[statName]}! Осталось очков: ${this.player.abilityPoints}`);
    return true;
  }

  /**
   * Использует зелье HP
   * @param {number} amount - Количество восстанавливаемого HP
   * @returns {number} Количество восстановленного HP
   */
  useHpPotion(amount = GAME_CONSTANTS.POTION_HP_RESTORE) {
    if (!this.battle.isInBattle) return 0;
    
    // Проверяем кулдаун
    if (this.battle.potionHpCooldown > 0) {
      Logger.log(`🩹 Зелье HP на кулдауне! Осталось ${this.battle.potionHpCooldown} ходов`);
      return 0;
    }

    const oldHp = this.battle.playerHp;
    this.battle.playerHp = Math.min(this.battle.playerHp + amount, this.battle.playerMaxHp);
    const healed = this.battle.playerHp - oldHp;
    
    // Устанавливаем кулдаун (4 хода)
    this.battle.potionHpCooldown = 4;
    
    Logger.log(`🩹 Использовано зелье HP! Восстановлено ${healed} HP`);
    return healed;
  }

  /**
   * Использует зелье Маны
   * @param {number} amount - Количество восстанавливаемой маны
   * @returns {number} Количество восстановленной маны
   */
  useManaPotion(amount = GAME_CONSTANTS.POTION_MANA_RESTORE) {
    if (!this.battle.isInBattle) return 0;
    
    // Проверяем кулдаун
    if (this.battle.potionManaCooldown > 0) {
      Logger.log(`💙 Зелье Маны на кулдауне! Осталось ${this.battle.potionManaCooldown} ходов`);
      return 0;
    }

    const oldMana = this.battle.playerMana;
    this.battle.playerMana = Math.min(this.battle.playerMana + amount, this.battle.playerMaxMana);
    const restored = this.battle.playerMana - oldMana;
    
    // Устанавливаем кулдаун (4 хода)
    this.battle.potionManaCooldown = 4;
    
    Logger.log(`💙 Использовано зелье Маны! Восстановлено ${restored} маны`);
    return restored;
  }

  /**
   * Уменьшает кулдауны зелий
   */
  decrementPotionCooldowns() {
    if (this.battle.potionHpCooldown > 0) {
      this.battle.potionHpCooldown--;
    }
    if (this.battle.potionManaCooldown > 0) {
      this.battle.potionManaCooldown--;
    }
  }
}

export const gameState = new GameState();
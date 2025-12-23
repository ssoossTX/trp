/**
 * BattleEngine - логика боевой системы
 */
import { gameState } from '../core/GameState.js';
import { dataLoader } from '../data/DataLoader.js';
import { eventManager } from '../core/EventManager.js';
import { calculateDamage } from '../utils/helpers.js';
import { GAME_CONSTANTS, APP_EVENTS } from '../utils/constants.js';
import { BattleUI } from './BattleUI.js';
import { UIManager } from '../ui/UIManager.js';

export class BattleEngine {
  /**
   * Инициализирует боевую сессию
   * @param {Object} enemy - Враг
   * @param {string} locationId - ID локации
   * @param {Array} activeAbilities - Активные способности
   */
  static initiateBattle(enemy, locationId, activeAbilities = []) {
    gameState.initializeBattle(enemy, locationId, activeAbilities);
    BattleUI.show();
    BattleUI.update();
    BattleUI.renderAbilityButtons(activeAbilities);
    BattleUI.addLog('Боевая встреча началась!', 'neutral');
    BattleUI.addLog(`Вы встретили ${enemy.name}!`, 'neutral');
    eventManager.emit(APP_EVENTS.BATTLE_STARTED);
  }

  /**
   * Обработчик нажатия на атаку
   */
  static playerAttack() {
    if (!gameState.battle.isInBattle) return;

    const enemy = gameState.battle.currentEnemy;
    const baseDamage = gameState.getPlayerBaseDamage();
    let damage = calculateDamage(baseDamage, GAME_CONSTANTS.DAMAGE_RANDOMNESS);

    // Применяем усиления от Боевого клича
    if (gameState.battle.buffedAttacks > 0 && gameState.battle.buffMultiplier > 1) {
      damage = Math.round(damage * gameState.battle.buffMultiplier);
      BattleUI.addLog(`⚡ Усиленный удар! Урон: ${damage}`, 'buff');
      gameState.decrementBuffedAttacks();
    } else {
      BattleUI.addLog(`Вы нанесли ${damage} урона!`, 'player');
    }

    enemy.currentHp -= damage;
    BattleUI.update();

    if (enemy.currentHp <= 0) {
      this.playerWins();
      return;
    }

    setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
  }

  /**
   * Враг атакует игрока
   */
  static enemyAttack() {
    if (!gameState.battle.isInBattle) return;

    // Проверяем, находится ли игрок в режиме эвазии
    if (gameState.battle.isEvading) {
      gameState.decrementEvadingTurns();
      if (gameState.battle.evadingTurnsLeft > 0) {
        BattleUI.addLog('🌫️ Враг не может найти тебя в тени!', 'success');
      }
      gameState.decrementAbilityCooldowns();
      BattleUI.updateAbilityButtons();
      return; // Враг не атакует
    }

    // Стандартная вражеская атака
    const enemy = gameState.battle.currentEnemy;
    let damage = calculateDamage(enemy.attack, GAME_CONSTANTS.ENEMY_DAMAGE_VARIANCE);
    
    // Применяем проклятие слабости (враг наносит в 2 раза меньше урона)
    damage = gameState.applyWeaknessCurse(damage);

    // Применяем защиту магического щита
    damage = gameState.applyShieldProtection(damage);

    gameState.battle.playerHp -= damage;
    BattleUI.addLog(`${enemy.name} нанёс ${damage} урона!`, 'enemy');

    // Уменьшаем длительность магического щита
    gameState.decrementShieldTurns();
    
    // Уменьшаем длительность проклятия слабости
    gameState.decrementWeaknessTurns();
    
    // Уменьшаем кулдауны способностей в конце хода врага
    gameState.decrementAbilityCooldowns();

    if (gameState.battle.playerHp <= 0) {
      this.playerLoses();
      return;
    }

    BattleUI.update();
    BattleUI.updateAbilityButtons();
  }

  /**
   * Игрок побеждает
   */
  static playerWins() {
    gameState.battle.isInBattle = false;
    const enemy = gameState.battle.currentEnemy;

    BattleUI.addLog(`Вы победили ${enemy.name}!`, 'player');
    BattleUI.disableAttackButton();
    BattleUI.update();
    
    // Добавляем опыт и золото
    if (enemy.reward) {
      if (enemy.reward.experience) {
        gameState.addExperience(enemy.reward.experience);
      }
      if (enemy.reward.gold) {
        gameState.addGold(enemy.reward.gold);
      }
    }
    
    // Генерируем дроп
    const loot = this.generateLoot(enemy);
    
    // Показываем модальное окно дропа
    setTimeout(() => {
      BattleUI.showLootModal(enemy.name, loot);
    }, 500);
    
    // Обновляем полоски ресурсов в шапке игры и профиль
    UIManager.updateResources();
    UIManager.updatePlayerProfile();

    eventManager.emit(APP_EVENTS.BATTLE_ENDED, { result: 'win' });
  }

  /**
   * Генерирует дроп от врага
   * @param {Object} enemy - Враг
   * @returns {Object} Объект с дропом
   */
  static generateLoot(enemy) {
    // Золото
    const goldDrop = Math.round(
      (enemy.reward?.gold || 10) * (0.8 + Math.random() * 0.4)
    );

    // Предметы из локации
    const locationId = gameState.battle.currentLocation;
    const location = dataLoader.getLocationById(locationId);
    const itemsDrop = [];

    if (location && location.loot) {
      // Выбираем случайные предметы из возможной добычи
      const lootPool = location.loot;
      
      for (const item of lootPool) {
        // Парсим шанс (может быть "10%", "25%" или число)
        let chance = 0;
        if (typeof item.chance === 'string') {
          chance = parseInt(item.chance) / 100;
        } else if (typeof item.chance === 'number') {
          chance = item.chance / 100;
        }

        // Определяем редкость
        let rarity = 'common';
        if (item.rarity) {
          rarity = item.rarity;
        } else if (chance > 0.3) {
          rarity = 'common';
        } else if (chance > 0.1) {
          rarity = 'uncommon';
        } else if (chance > 0.05) {
          rarity = 'rare';
        } else {
          rarity = 'legendary';
        }

        // Проверяем, выпал ли предмет
        if (Math.random() < chance) {
          itemsDrop.push({
            name: item.name,
            icon: item.icon || '📦',
            image: item.image || null,
            rarity: rarity
          });
        }
      }
    }

    return {
      gold: goldDrop,
      items: itemsDrop
    };
  }

  /**
   * Игрок проигрывает
   */
  static playerLoses() {
    gameState.battle.isInBattle = false;
    const enemy = gameState.battle.currentEnemy;

    BattleUI.addLog(`Вы были побеждены ${enemy.name}...`, 'enemy');
    BattleUI.addLog('Вы теряете сознание...', 'enemy');
    BattleUI.addLog('Нажмите "Покинуть локацию" для возвращения', 'neutral');
    BattleUI.disableAttackButton();
    BattleUI.update();
    
    // Обновляем полоски ресурсов в шапке игры
    UIManager.updateResources();

    eventManager.emit(APP_EVENTS.BATTLE_ENDED, { result: 'loss' });
  }

  /**
   * Выход из боя
   */
  static fleeBattle() {
    gameState.endBattle();
    
    // Восстанавливаем ресурсы при выходе с локации
    gameState.restoreResources();
    
    BattleUI.hide();
    BattleUI.enableAttackButton();
    
    // Обновляем полоски ресурсов в шапке игры
    UIManager.updateResources();
    
    eventManager.emit(APP_EVENTS.BATTLE_ENDED, { result: 'fled' });
  }

  /**
   * Использует активную способность
   * @param {string} abilityName - Название способности
   */
  static useActiveAbility(abilityName) {
    if (!gameState.battle.isInBattle) return;
    
    if (!gameState.isAbilityAvailable(abilityName)) {
      BattleUI.addLog(`❌ Способность "${abilityName}" на кулдауне`, 'error');
      return;
    }

    const enemy = gameState.battle.currentEnemy;

    switch (abilityName) {
      case 'Боевой клич':
        gameState.activateBattleCry();
        BattleUI.addLog('⚡ Вы применили Боевой клич!', 'buff');
        BattleUI.updateAbilityButtons();
        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Мощный удар':
        const baseDamage = gameState.getPlayerBaseDamage();
        const damage = Math.round(calculateDamage(baseDamage, GAME_CONSTANTS.DAMAGE_RANDOMNESS) * 2);
        
        gameState.activatePowerAttack();
        enemy.currentHp -= damage;
        
        BattleUI.addLog(`💥 Мощный удар наносит ${damage} урона!`, 'buff');
        BattleUI.updateAbilityButtons();
        BattleUI.update();

        if (enemy.currentHp <= 0) {
          this.playerWins();
          return;
        }

        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Огненный шар':
        const firebaseDamage = gameState.getPlayerBaseDamage();
        const fireballDamage = Math.round(calculateDamage(firebaseDamage, GAME_CONSTANTS.DAMAGE_RANDOMNESS) * 5);
        
        gameState.activateFireball();
        enemy.currentHp -= fireballDamage;
        
        BattleUI.addLog(`🔥 Огненный шар наносит ${fireballDamage} урона!`, 'buff');
        BattleUI.updateAbilityButtons();
        BattleUI.update();

        if (enemy.currentHp <= 0) {
          this.playerWins();
          return;
        }

        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Магический щит':
        gameState.activateMagicShield();
        BattleUI.addLog('🛡️ Вы активировали Магический щит!', 'buff');
        BattleUI.updateAbilityButtons();
        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Щитовой удар':
        const bashDamage = gameState.activateShieldBash();
        if (bashDamage === null) {
          BattleUI.addLog(`❌ Способность "Щитовой удар" на кулдауне`, 'error');
          return;
        }
        enemy.currentHp -= bashDamage;
        
        BattleUI.addLog(`⚔️ Щитовой удар наносит ${bashDamage} урона!`, 'buff');
        BattleUI.updateAbilityButtons();
        BattleUI.update();

        if (enemy.currentHp <= 0) {
          this.playerWins();
          return;
        }

        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Последний рубеж':
        const lastStandActive = gameState.activateLastStand();
        if (!lastStandActive) {
          BattleUI.addLog(`❌ Способность "Последний рубеж" на кулдауне`, 'error');
          return;
        }
        BattleUI.addLog('🛡️ Вы активировали Последний рубеж!', 'buff');
        BattleUI.updateAbilityButtons();
        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Точный выстрел':
        const preciseDamage = gameState.activatePreciseShot();
        if (preciseDamage === null) {
          BattleUI.addLog(`❌ Способность "Точный выстрел" на кулдауне`, 'error');
          return;
        }
        enemy.currentHp -= preciseDamage;
        
        BattleUI.addLog(`🎯 Точный выстрел наносит ${preciseDamage} урона!`, 'buff');
        BattleUI.updateAbilityButtons();
        BattleUI.update();

        if (enemy.currentHp <= 0) {
          this.playerWins();
          return;
        }

        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Скоростной залп':
        const volleyDamage = gameState.activateRapidVolley();
        if (volleyDamage === null) {
          BattleUI.addLog(`❌ Способность "Скоростной залп" на кулдауне`, 'error');
          return;
        }
        enemy.currentHp -= volleyDamage;
        
        BattleUI.addLog(`🏹 Скоростной залп наносит ${volleyDamage} урона!`, 'buff');
        BattleUI.updateAbilityButtons();
        BattleUI.update();

        if (enemy.currentHp <= 0) {
          this.playerWins();
          return;
        }

        if (gameState.battle.hasExtraTurn) {
          gameState.battle.hasExtraTurn = false;
          BattleUI.addLog('⚡ Ты получил ещё один ход!', 'buff');
        } else {
          setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        }
        break;

      case 'Быстрая атака':
        const fastDamage = gameState.activateFastAttack();
        if (fastDamage === null) {
          BattleUI.addLog(`❌ Способность "Быстрая атака" на кулдауне`, 'error');
          return;
        }
        enemy.currentHp -= fastDamage;
        
        BattleUI.addLog(`⚡ Быстрая атака наносит ${fastDamage} урона!`, 'buff');
        BattleUI.updateAbilityButtons();
        BattleUI.update();

        if (enemy.currentHp <= 0) {
          this.playerWins();
          return;
        }

        if (gameState.battle.hasExtraTurn) {
          gameState.battle.hasExtraTurn = false;
          BattleUI.addLog('⚡ Ты получил ещё один ход!', 'buff');
        } else {
          setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        }
        break;

      case 'Уход в тень':
        const evadeSuccess = gameState.activateShadowEvasion();
        if (!evadeSuccess) {
          BattleUI.addLog(`❌ Способность "Уход в тень" на кулдауне`, 'error');
          return;
        }
        BattleUI.addLog('🌫️ Ты скрылась в тени!', 'buff');
        BattleUI.updateAbilityButtons();
        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Исцеление':
        const healAmount = gameState.activateHealing();
        if (healAmount === null) {
          BattleUI.addLog(`❌ Способность "Исцеление" на кулдауне`, 'error');
          return;
        }
        BattleUI.addLog(`✨ Исцеление восстанавливает ${healAmount} HP!`, 'buff');
        BattleUI.updateAbilityButtons();
        BattleUI.update();
        
        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Проклятие слабости':
        const curseSuccess = gameState.activateWeaknessCurse();
        if (!curseSuccess) {
          BattleUI.addLog(`❌ Способность "Проклятие слабости" на кулдауне`, 'error');
          return;
        }
        BattleUI.addLog('😵 Враг проклят слабостью! Его урон снизился на 50%!', 'buff');
        BattleUI.updateAbilityButtons();
        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      default:
        BattleUI.addLog(`❓ Неизвестная способность: ${abilityName}`, 'error');
    }
  }

  /**
   * Вражеская атака с учётом кулдаунов
   */
  static enemyAttackWithCooldown() {
    gameState.decrementAbilityCooldowns();
    this.enemyAttack();
  }
}

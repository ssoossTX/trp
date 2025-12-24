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
import { DungeonsManager } from '../locations/DungeonsManager.js';

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

    // Применяем бонус уменьшения урона от выбранной способности
    const damageReductionMultiplier = gameState.getAbilityBonus('damage_reduction');
    damage = Math.round(damage * damageReductionMultiplier);

    gameState.battle.playerHp -= damage;
    BattleUI.addLog(`${enemy.name} нанёс ${damage} урона!`, 'enemy');

    // Уменьшаем длительность магического щита
    gameState.decrementShieldTurns();
    
    // Уменьшаем длительность проклятия слабости
    gameState.decrementWeaknessTurns();
    
    // Уменьшаем кулдауны способностей в конце хода врага
    gameState.decrementAbilityCooldowns();
    
    // Уменьшаем кулдауны зелий
    gameState.decrementPotionCooldowns();

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
    // Проверяем, находимся ли мы в подземелье
    if (gameState.dungeonState) {
      // В подземелье не можем просто выйти - это поражение
      if (confirm('Вы собираетесь покинуть подземелье? Это будет считаться поражением.')) {
        // Помечаем поражение
        gameState.battle.isInBattle = false;
        gameState.battle.playerHp = 0;
        
        // Обрабатываем поражение в подземелье с небольшой задержкой
        setTimeout(() => {
          DungeonsManager.onDungeonPlayerDefeated();
        }, 100);
      }
      return;
    }

    // Обычный выход из боя (не подземелье)
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

    // Получаем информацию о способности
    const ability = gameState.battle.activeAbilities.find(a => a.name === abilityName);
    const manaCost = ability?.manaCost || 0;

    // Проверяем ману
    if (manaCost > 0 && !gameState.hasEnoughMana(manaCost)) {
      BattleUI.addLog(`❌ Недостаточно маны! Нужно ${manaCost}, а у вас ${gameState.battle.playerMana}`, 'error');
      return;
    }

    const enemy = gameState.battle.currentEnemy;

    switch (abilityName) {
      case 'Боевой клич':
        gameState.spendMana(manaCost);
        gameState.activateBattleCry();
        BattleUI.addLog('⚡ Вы применили Боевой клич!', 'buff');
        BattleUI.updateAbilityButtons();
        BattleUI.update();
        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Мощный удар':
        gameState.spendMana(manaCost);
        const baseDamage = gameState.getPlayerBaseDamage();
        
        // Проверяем наличие усиления от Боевого клича
        let damageMultiplier = 2; // 200% по умолчанию
        let logMessage = '💥 Мощный удар наносит';
        
        if (gameState.battle.buffedAttacks > 0 && gameState.battle.buffMultiplier > 1) {
          damageMultiplier = 3; // 300% если есть усиление
          logMessage = '⚡💥 Усиленный Мощный удар наносит';
          gameState.decrementBuffedAttacks(); // Используем одно усиление
        }
        
        const damage = Math.round(calculateDamage(baseDamage, GAME_CONSTANTS.DAMAGE_RANDOMNESS) * damageMultiplier);
        
        gameState.activatePowerAttack();
        enemy.currentHp -= damage;
        
        BattleUI.addLog(`${logMessage} ${damage} урона!`, 'buff');
        BattleUI.updateAbilityButtons();
        BattleUI.update();

        if (enemy.currentHp <= 0) {
          this.playerWins();
          return;
        }

        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Огненный шар':
        gameState.spendMana(manaCost);
        const firebaseDamage = gameState.getPlayerMagicDamage();
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
        gameState.spendMana(manaCost);
        gameState.activateMagicShield();
        BattleUI.addLog('🛡️ Вы активировали Магический щит!', 'buff');
        BattleUI.updateAbilityButtons();
        BattleUI.update();
        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Щитовой удар':
        gameState.spendMana(manaCost);
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
        gameState.spendMana(manaCost);
        const lastStandActive = gameState.activateLastStand();
        if (!lastStandActive) {
          BattleUI.addLog(`❌ Способность "Последний рубеж" на кулдауне`, 'error');
          return;
        }
        BattleUI.addLog('🛡️ Вы активировали Последний рубеж!', 'buff');
        BattleUI.updateAbilityButtons();
        BattleUI.update();
        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Точный выстрел':
        gameState.spendMana(manaCost);
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
        gameState.spendMana(manaCost);
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
        gameState.spendMana(manaCost);
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
        gameState.spendMana(manaCost);
        const evadeSuccess = gameState.activateShadowEvasion();
        if (!evadeSuccess) {
          BattleUI.addLog(`❌ Способность "Уход в тень" на кулдауне`, 'error');
          return;
        }
        BattleUI.addLog('🌫️ Ты скрылась в тени!', 'buff');
        BattleUI.updateAbilityButtons();
        BattleUI.update();
        setTimeout(() => this.enemyAttack(), GAME_CONSTANTS.BATTLE_DELAY);
        break;

      case 'Исцеление':
        gameState.spendMana(manaCost);
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
        gameState.spendMana(manaCost);
        const curseSuccess = gameState.activateWeaknessCurse();
        if (!curseSuccess) {
          BattleUI.addLog(`❌ Способность "Проклятие слабости" на кулдауне`, 'error');
          return;
        }
        BattleUI.addLog('😵 Враг проклят слабостью! Его урон снизился на 50%!', 'buff');
        BattleUI.updateAbilityButtons();
        BattleUI.update();
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

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
import { DOMManager } from '../core/DOMManager.js';

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
    BattleUI.enableAttackButton();
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
    const enemyDamage = enemy.attack || enemy.damage || 5; // Fallback на 5 если нет поля
    let damage = calculateDamage(enemyDamage, GAME_CONSTANTS.ENEMY_DAMAGE_VARIANCE);
    
    // Защита от NaN
    if (isNaN(damage)) {
      damage = enemyDamage;
    }
    
    // Применяем проклятие слабости (враг наносит в 2 раза меньше урона)
    damage = gameState.applyWeaknessCurse(damage);

    // Применяем защиту магического щита
    damage = gameState.applyShieldProtection(damage);

    // Применяем бонус уменьшения урона от выбранной способности
    const damageReductionMultiplier = gameState.getAbilityBonus('damage_reduction');
    damage = Math.round(damage * damageReductionMultiplier);
    
    // Еще одна защита от NaN перед вычитанием
    if (isNaN(damage) || damage < 0) {
      damage = 1; // Минимум 1 урон
    }

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
      
      // Проверяем, идет ли бой на локации
      const callbacks = this.getLocationBattleCallbacks();
      if (callbacks.onVictory) {
        setTimeout(() => {
          BattleUI.hide();
          callbacks.onVictory();
        }, 2000);
      }
    }, 500);
    
    // Обновляем только ресурсы на боевом экране
    UIManager.updateResources();
    
    // Обновляем профиль только если НЕ в подземелье и НЕ на локации
    if (!gameState.dungeonState && !this.getLocationBattleCallbacks().onVictory) {
      UIManager.updatePlayerProfile();
    }

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
    
    // Проверяем, идет ли бой на локации
    const callbacks = this.getLocationBattleCallbacks();
    
    if (callbacks.onDefeat) {
      // Бой на локации - возвращаемся в меню
      BattleUI.disableAttackButton();
      BattleUI.update();
      
      setTimeout(() => {
        BattleUI.hide();
        callbacks.onDefeat();
      }, 2000);
    } else if (gameState.dungeonState) {
      // В подземелье - обрабатываем поражение в подземелье
      BattleUI.disableAttackButton();
      BattleUI.update();
      
      setTimeout(() => {
        import('../locations/DungeonsManager.js').then(module => {
          module.DungeonsManager.onDungeonPlayerDefeated();
        });
      }, 1000);
    } else {
      // Обычная локация (из меню)
      BattleUI.addLog('Нажмите "Покинуть локацию" для возвращения', 'neutral');
      BattleUI.disableAttackButton();
      BattleUI.update();
    }
    
    // Обновляем полоски ресурсов в шапке игры
    UIManager.updateResources();

    eventManager.emit(APP_EVENTS.BATTLE_ENDED, { result: 'loss' });
  }

  /**
   * Выход из боя
   */
  static fleeBattle() {
    // Проверяем, идет ли бой на локации
    const callbacks = this.getLocationBattleCallbacks();
    if (callbacks.onFlee) {
      // Боя на локации - возвращаемся на локацию
      gameState.endBattle();
      BattleUI.hide();
      BattleUI.enableAttackButton();
      callbacks.onFlee();
      eventManager.emit(APP_EVENTS.BATTLE_ENDED, { result: 'fled' });
      return;
    }
    
    // Проверяем, находимся ли мы в подземелье
    if (gameState.dungeonState) {
      // Показываем модальное окно подтверждения
      this.showDungeonExitConfirmation();
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
   * Показывает модальное окно подтверждения выхода из подземелья
   */
  static showDungeonExitConfirmation() {
    const modal = DOMManager.getElementById('dungeonExitConfirmModal');
    const confirmBtn = DOMManager.getElementById('confirmExitDungeonBtn');
    const cancelBtn = DOMManager.getElementById('cancelExitDungeonBtn');
    const overlay = modal?.querySelector('.modal__overlay');

    if (!modal || !confirmBtn || !cancelBtn) return;

    // Показываем модаль используя класс active
    DOMManager.openModal('dungeonExitConfirmModal');

    // Удаляем старые обработчики если они есть
    if (confirmBtn._dungeonConfirmHandler) {
      confirmBtn.removeEventListener('click', confirmBtn._dungeonConfirmHandler);
    }
    if (cancelBtn._dungeonCancelHandler) {
      cancelBtn.removeEventListener('click', cancelBtn._dungeonCancelHandler);
    }
    if (overlay && overlay._dungeonOverlayHandler) {
      overlay.removeEventListener('click', overlay._dungeonOverlayHandler);
    }

    // Обработчик подтверждения выхода
    const handleConfirm = () => {
      try {
        // Помечаем поражение
        gameState.battle.isInBattle = false;
        gameState.battle.playerHp = 0;
        
        // Обрабатываем поражение в подземелье
        DungeonsManager.onDungeonPlayerDefeated();
      } catch (error) {
        console.error('Ошибка при подтверждении выхода из подземелья:', error);
      } finally {
        // Закрываем модаль
        DOMManager.closeModal('dungeonExitConfirmModal');
        
        // Удаляем обработчики
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        if (overlay) {
          overlay.removeEventListener('click', handleOverlayClick);
        }
        
        // Очищаем сохраненные ссылки
        confirmBtn._dungeonConfirmHandler = null;
        cancelBtn._dungeonCancelHandler = null;
        if (overlay) {
          overlay._dungeonOverlayHandler = null;
        }
      }
    };

    // Обработчик отмены
    const handleCancel = () => {
      DOMManager.closeModal('dungeonExitConfirmModal');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      if (overlay) {
        overlay.removeEventListener('click', handleOverlayClick);
      }
      
      // Очищаем сохраненные ссылки
      confirmBtn._dungeonConfirmHandler = null;
      cancelBtn._dungeonCancelHandler = null;
      if (overlay) {
        overlay._dungeonOverlayHandler = null;
      }
    };

    // Обработчик клика на overlay
    const handleOverlayClick = () => {
      handleCancel();
    };

    // Сохраняем ссылки на обработчики
    confirmBtn._dungeonConfirmHandler = handleConfirm;
    cancelBtn._dungeonCancelHandler = handleCancel;
    if (overlay) {
      overlay._dungeonOverlayHandler = handleOverlayClick;
    }

    // Прикрепляем обработчики
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    if (overlay) {
      overlay.addEventListener('click', handleOverlayClick);
    }
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

  /**
   * Инициирует боевой поединок на локации
   * @param {Object} enemy - Данные врага
   * @param {Function} onVictory - Callback при победе
   * @param {Function} onDefeat - Callback при поражении
   * @param {Function} onFlee - Callback при бегстве
   */
  static startBattle(enemy, onVictory, onDefeat, onFlee) {
    // Сохраняем callbacks
    this.locationBattleCallbacks = { onVictory, onDefeat, onFlee };
    
    // Получаем активные способности класса
    const playerClass = gameState.player.class;
    const classData = dataLoader.getClassByName(playerClass);
    const activeAbilities = classData && classData.activeAbilities ? classData.activeAbilities : [];
    
    // Восстанавливаем HP и Ману перед боем на локации
    gameState.player.hp = gameState.player.maxHp;
    gameState.player.mana = gameState.player.maxMana;
    
    // Инициализируем боевую сессию с правильными данными игрока
    gameState.initializeBattle(enemy, 'location-encounter', activeAbilities);
    BattleUI.show();
    BattleUI.update();
    BattleUI.renderAbilityButtons(activeAbilities);
    BattleUI.enableAttackButton();
    BattleUI.addLog('Боевая встреча началась!', 'neutral');
    BattleUI.addLog(`Вы встретили ${enemy.name}!`, 'neutral');
    eventManager.emit(APP_EVENTS.BATTLE_STARTED);
  }

  /**
   * Получает callbacks для боя на локации
   */
  static getLocationBattleCallbacks() {
    return this.locationBattleCallbacks || { onVictory: null, onDefeat: null, onFlee: null };
  }
}


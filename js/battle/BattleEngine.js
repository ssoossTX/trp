/**
 * BattleEngine - логика боевой системы
 */
import { gameState } from '../core/GameState.js';
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

    // Уменьшаем кулдауны способностей в конце хода врага
    gameState.decrementAbilityCooldowns();
    BattleUI.updateAbilityButtons();

    const enemy = gameState.battle.currentEnemy;
    const damage = calculateDamage(enemy.attack, GAME_CONSTANTS.ENEMY_DAMAGE_VARIANCE);

    gameState.battle.playerHp -= damage;
    BattleUI.addLog(`${enemy.name} нанёс ${damage} урона!`, 'enemy');

    if (gameState.battle.playerHp <= 0) {
      this.playerLoses();
      return;
    }

    BattleUI.update();
  }

  /**
   * Игрок побеждает
   */
  static playerWins() {
    gameState.battle.isInBattle = false;
    const enemy = gameState.battle.currentEnemy;

    BattleUI.addLog(`Вы победили ${enemy.name}!`, 'player');
    BattleUI.addLog('Нажмите "Покинуть локацию" для возвращения', 'neutral');
    BattleUI.disableAttackButton();
    BattleUI.update();
    
    // Обновляем полоски ресурсов в шапке игры
    UIManager.updateResources();

    eventManager.emit(APP_EVENTS.BATTLE_ENDED, { result: 'win' });
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

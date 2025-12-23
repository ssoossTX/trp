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
   */
  static initiateBattle(enemy, locationId) {
    gameState.initializeBattle(enemy, locationId);
    BattleUI.show();
    BattleUI.update();
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
    const damage = calculateDamage(baseDamage, GAME_CONSTANTS.DAMAGE_RANDOMNESS);

    enemy.currentHp -= damage;
    BattleUI.addLog(`Вы нанесли ${damage} урона!`, 'player');
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
    BattleUI.hide();
    BattleUI.enableAttackButton();
    
    // Обновляем полоски ресурсов в шапке игры
    UIManager.updateResources();
    
    eventManager.emit(APP_EVENTS.BATTLE_ENDED, { result: 'fled' });
  }
}

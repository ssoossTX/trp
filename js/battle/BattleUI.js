/**
 * BattleUI - управление интерфейсом боя
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { calculatePercent } from '../utils/helpers.js';
import { GAME_CONSTANTS } from '../utils/constants.js';

export class BattleUI {
  /**
   * Показывает боевой экран
   */
  static show() {
    // Очищаем старые логи боя перед новым боем
    this.clearLog();
    DOMManager.hideScreen(GAME_CONSTANTS.MAIN_GAME_SCREEN_ID);
    DOMManager.showScreen(GAME_CONSTANTS.BATTLE_SCREEN_ID);
  }

  /**
   * Скрывает боевой экран
   */
  static hide() {
    // Очищаем логи боя при выходе из локации
    this.clearLog();
    DOMManager.hideScreen(GAME_CONSTANTS.BATTLE_SCREEN_ID);
    DOMManager.showScreen(GAME_CONSTANTS.MAIN_GAME_SCREEN_ID);
  }

  /**
   * Обновляет интерфейс боя
   */
  static update() {
    const enemy = gameState.battle.currentEnemy;
    const { playerHp, playerMaxHp } = gameState.battle;

    // Враг - обновляем имя и изображение
    console.log(`[BattleUI] Обновляю интерфейс для врага: ${enemy.name}`);
    DOMManager.setText('enemyName', enemy.name);
    
    // Устанавливаем изображение врага
    if (enemy.image) {
      const enemyImage = DOMManager.getElementById('enemyImage');
      if (enemyImage) {
        enemyImage.src = `/trp/assets/img/enemies/${enemy.image}`;
        enemyImage.alt = enemy.name;
        console.log(`[BattleUI] Изображение врага установлено: ${enemy.image}`);
      }
    }
    
    const enemyPercent = calculatePercent(enemy.currentHp, enemy.hp);
    DOMManager.setWidth('enemyHpFill', enemyPercent + '%');
    DOMManager.setText('enemyHpText', `${Math.max(0, enemy.currentHp)}/${enemy.hp}`);

    // Игрок
    const playerPercent = calculatePercent(playerHp, playerMaxHp);
    DOMManager.setWidth('playerHpFill', playerPercent + '%');
    DOMManager.setText('playerHpText', `${playerHp}/${playerMaxHp}`);
  }

  /**
   * Добавляет запись в лог боя
   */
  static addLog(message, type = 'neutral') {
    const battleLog = DOMManager.getElementById('battleLog');
    if (!battleLog) return;

    const entry = document.createElement('div');
    entry.className = `battle__log-entry battle__log-entry--${type}`;
    entry.textContent = message;
    battleLog.appendChild(entry);

    // Автоскролл вниз
    battleLog.scrollTop = battleLog.scrollHeight;
  }

  /**
   * Очищает лог боя
   */
  static clearLog() {
    DOMManager.clear('battleLog');
  }

  /**
   * Отключает кнопку атаки
   */
  static disableAttackButton() {
    DOMManager.disableButton('attackBtn');
  }

  /**
   * Включает кнопку атаки
   */
  static enableAttackButton() {
    DOMManager.enableButton('attackBtn');
  }
}

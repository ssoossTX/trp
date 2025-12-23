/**
 * BattleUI - управление интерфейсом боя
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { calculatePercent } from '../utils/helpers.js';

export class BattleUI {
  /**
   * Показывает боевой экран
   */
  static show() {
    const contentArea = document.querySelector('#main-game-ui .content-area');
    const battleScreen = DOMManager.getElementById('battle-screen');
    
    if (contentArea) contentArea.style.display = 'none';
    if (battleScreen) {
      battleScreen.classList.remove('hidden');
      battleScreen.classList.add('visible');
    }
  }

  /**
   * Скрывает боевой экран
   */
  static hide() {
    const contentArea = document.querySelector('#main-game-ui .content-area');
    const battleScreen = DOMManager.getElementById('battle-screen');
    
    if (contentArea) contentArea.style.display = 'block';
    if (battleScreen) {
      battleScreen.classList.remove('visible');
      battleScreen.classList.add('hidden');
    }
  }

  /**
   * Обновляет интерфейс боя
   */
  static update() {
    const enemy = gameState.battle.currentEnemy;
    const { playerHp, playerMaxHp } = gameState.battle;

    // Враг
    DOMManager.setText('enemyName', enemy.name);
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

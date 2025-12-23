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
    this.clearAbilityButtons();
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

  /**
   * Отрисовывает кнопки активных способностей
   */
  static renderAbilityButtons(abilities) {
    const abilitiesContainer = DOMManager.getElementById('abilitiesContainer');
    if (!abilitiesContainer) return;

    abilitiesContainer.innerHTML = abilities.map(ability => `
      <button class="btn btn-ability" id="ability-${ability.name}" onclick="window.BattleEngine.useActiveAbility('${ability.name}')">
        <span class="ability-name">${ability.name}</span>
        <span class="ability-cooldown" id="cooldown-${ability.name}"></span>
      </button>
    `).join('');
  }

  /**
   * Обновляет состояние кнопок способностей
   */
  static updateAbilityButtons() {
    const abilities = gameState.battle.activeAbilities;
    
    abilities.forEach(ability => {
      const btn = DOMManager.getElementById(`ability-${ability.name}`);
      const cooldownText = DOMManager.getElementById(`cooldown-${ability.name}`);
      
      if (btn && cooldownText) {
        const cooldown = gameState.battle.abilityStates[ability.name].cooldown;
        
        if (cooldown > 0) {
          btn.disabled = true;
          btn.classList.add('ability--cooldown');
          cooldownText.textContent = cooldown;
        } else {
          btn.disabled = false;
          btn.classList.remove('ability--cooldown');
          cooldownText.textContent = '';
        }
      }
    });
  }

  /**
   * Скрывает кнопки способностей при завершении боя
   */
  static clearAbilityButtons() {
    const abilitiesContainer = DOMManager.getElementById('abilitiesContainer');
    if (abilitiesContainer) {
      abilitiesContainer.innerHTML = '';
    }
  }
}

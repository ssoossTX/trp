/**
 * UIManager - управление пользовательским интерфейсом
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { BattleEngine } from '../battle/BattleEngine.js';
import { GAME_CONSTANTS } from '../utils/constants.js';
import { calculatePercent } from '../utils/helpers.js';

export class UIManager {
  /**
   * Инициализирует основной UI
   */
  static init() {
    this.attachEventListeners();
  }

  /**
   * Инициализирует UI основной игры
   */
  static initGameUI() {
    this.updatePlayerProfile();
    this.initTabs();
    this.attachGameEventListeners();
  }

  /**
   * Обновляет профиль игрока
   */
  static updatePlayerProfile() {
    const player = gameState.getPlayerState();

    DOMManager.setText('charName', player.class);
    DOMManager.setText('charClass', player.class);
    DOMManager.setText('charAbility', player.ability);
    DOMManager.setText('charStrength', player.stats.strength);
    DOMManager.setText('charAgility', player.stats.agility);
    DOMManager.setText('charIntelligence', player.stats.intelligence);
    DOMManager.setText('charEndurance', player.stats.endurance);

    // Обновляем ресурсы
    this.updateResources();

    // Устанавливаем аватар
    const playerAvatar = DOMManager.getElementById('playerAvatar');
    if (playerAvatar && player.classData) {
      playerAvatar.textContent = player.classData.icon;
    }
  }

  /**
   * Обновляет отображение ресурсов
   */
  static updateResources() {
    const player = gameState.getPlayerState();

    // HP
    const hpPercent = calculatePercent(player.hp, player.maxHp);
    DOMManager.setWidth('hpFill', hpPercent + '%');
    DOMManager.setText('hpText', `${Math.max(0, player.hp)}/${player.maxHp}`);

    // Mana
    const manaPercent = calculatePercent(player.mana, player.maxMana);
    DOMManager.setWidth('manaFill', manaPercent + '%');
    DOMManager.setText('manaText', `${player.mana}/${player.maxMana}`);

    // Gold
    DOMManager.setText('goldText', player.gold);
  }

  /**
   * Инициализирует табы
   */
  static initTabs() {
    const tabs = DOMManager.querySelectorAll('#main-game-ui .tab');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        this.switchTab(tabName);
      });
    });
  }

  /**
   * Переключает таб
   */
  static switchTab(tabName) {
    // Удаляем активные классы
    DOMManager.querySelectorAll('#main-game-ui .tab').forEach(t => {
      t.classList.remove('active');
    });
    DOMManager.querySelectorAll('#main-game-ui .tab-content').forEach(c => {
      c.classList.remove('active');
    });

    // Добавляем активные классы
    const activeTab = document.querySelector(`#main-game-ui .tab[data-tab="${tabName}"]`);
    const activeContent = document.querySelector(`#main-game-ui .tab-content[data-tab="${tabName}"]`);

    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');

    // Re-render локаций при переходе на вкладку Мир
    if (tabName === GAME_CONSTANTS.TABS.WORLD) {
      const { LocationsManager } = require('../locations/LocationsManager.js');
      LocationsManager.renderLocations();
    }
  }

  /**
   * Прикрепляет обработчики событий модалей
   */
  static attachEventListeners() {
    // Закрытие модалей по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        DOMManager.closeAllModals();
      }
    });

    // Закрытие лут-модали по крестику (делегирование)
    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'lootCloseBtn') {
        DOMManager.closeModal(GAME_CONSTANTS.MODALS.LOOT);
      }
    });

    // Закрытие модалей по клику на фон
    const lootModal = DOMManager.getElementById(GAME_CONSTANTS.MODALS.LOOT);
    if (lootModal) {
      lootModal.addEventListener('click', (e) => {
        if (e.target === lootModal) {
          DOMManager.closeModal(GAME_CONSTANTS.MODALS.LOOT);
        }
      });
    }
  }

  /**
   * Прикрепляет обработчики боевых действий
   */
  static attachGameEventListeners() {
    const attackBtn = DOMManager.getElementById('attackBtn');
    const fleeBtn = DOMManager.getElementById('fleeBtn');

    if (attackBtn) {
      attackBtn.addEventListener('click', () => BattleEngine.playerAttack());
    }

    if (fleeBtn) {
      fleeBtn.addEventListener('click', () => BattleEngine.fleeBattle());
    }
  }
}

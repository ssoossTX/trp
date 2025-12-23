/**
 * UIManager - управление пользовательским интерфейсом
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { BattleEngine } from '../battle/BattleEngine.js';
import { dataLoader } from '../data/DataLoader.js';
import { LocationsManager } from '../locations/LocationsManager.js';
import { GAME_CONSTANTS } from '../utils/constants.js';

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
    console.log('[UIManager] Initializing game UI');
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

    // Добавляем информацию об активных способностях
    const classData = dataLoader.getClassByName(player.class);
    if (classData && classData.activeAbilities) {
      const abilityList = classData.activeAbilities
        .map(a => `• ${a.name}: ${a.description}`)
        .join('\n');
      
      const abilityElement = document.createElement('div');
      abilityElement.innerHTML = `<strong>Активные способности:</strong><pre>${abilityList}</pre>`;
      const profileContent = document.querySelector('.tab-content[data-tab="profile"]');
      if (profileContent) {
        const existingAbilities = profileContent.querySelector('.active-abilities-info');
        if (existingAbilities) {
          existingAbilities.remove();
        }
        abilityElement.className = 'active-abilities-info';
        profileContent.appendChild(abilityElement);
      }
    }

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

    // Max HP
    DOMManager.setText('maxHpText', `Max HP: ${player.maxHp}`);

    // Max Mana
    DOMManager.setText('maxManaText', `Max MP: ${player.maxMana}`);

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

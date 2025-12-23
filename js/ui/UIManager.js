/**
 * UIManager - управление пользовательским интерфейсом
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { BattleEngine } from '../battle/BattleEngine.js';
import { BattleUI } from '../battle/BattleUI.js';
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
      this.renderActiveAbilities(classData.activeAbilities);
    }

    // Отрисовываем инвентарь
    this.renderInventory(player.inventory || []);

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

    // Обработчики для модала дропа
    const takeLootBtn = DOMManager.getElementById('takeLootBtn');
    const dropCloseBtn = DOMManager.getElementById('dropCloseBtn');
    const dropCloseBtn2 = DOMManager.getElementById('dropCloseBtn2');

    if (takeLootBtn) {
      takeLootBtn.addEventListener('click', () => this.takeLoot());
    }

    if (dropCloseBtn) {
      dropCloseBtn.addEventListener('click', () => this.closeLootModal());
    }

    if (dropCloseBtn2) {
      dropCloseBtn2.addEventListener('click', () => this.closeLootModal());
    }
  }

  /**
   * Забирает дроп и возвращает на карту
   */
  static takeLoot() {
    // Получаем сохранённый дроп из BattleUI
    if (BattleUI.currentLoot) {
      const loot = BattleUI.currentLoot;
      
      // Добавляем золото
      if (loot.gold > 0) {
        gameState.addGold(loot.gold);
      }
      
      // Добавляем предметы
      if (loot.items && loot.items.length > 0) {
        gameState.addItems(loot.items);
      }
      
      // Обновляем отображение ресурсов и инвентаря
      this.updateResources();
      this.renderInventory(gameState.player.inventory || []);
    }
    
    this.closeLootModal();
    BattleEngine.fleeBattle();
  }

  /**
   * Закрывает модал дропа
   */
  static closeLootModal() {
    DOMManager.closeModal('dropModal');
  }

  /**
   * Отрисовывает активные способности в профиле
   * @param {Array} abilities - Массив активных способностей
   */
  static renderActiveAbilities(abilities) {
    const container = DOMManager.getElementById('activeAbilitiesContainer');
    if (!container) return;

    container.innerHTML = abilities.map(ability => `
      <div class="ability-card ability-card--active">
        <div class="ability-card__header">
          <div class="ability-card__icon">⚡</div>
          <h3 class="ability-card__title">${ability.name}</h3>
        </div>
        <p class="ability-card__description">${ability.description}</p>
        <div class="ability-card__stats">
          <div class="ability-stat">
            <span class="ability-stat__label">Кулдаун</span>
            <span class="ability-stat__value">${ability.cooldown} ход(а)</span>
          </div>
          <div class="ability-stat">
            <span class="ability-stat__label">Эффект</span>
            <span class="ability-stat__value">${ability.effect}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Отрисовывает инвентарь игрока
   * @param {Array} inventory - Массив предметов в инвентаре
   */
  static renderInventory(inventory) {
    const container = DOMManager.getElementById('inventoryContainer');
    const emptyMessage = DOMManager.getElementById('inventoryEmpty');
    
    if (!container) return;

    if (!inventory || inventory.length === 0) {
      container.innerHTML = '';
      emptyMessage.classList.remove('hidden');
      return;
    }

    emptyMessage.classList.add('hidden');

    container.innerHTML = inventory.map((item, index) => `
      <div class="inventory-item inventory-item--${item.rarity || 'common'}">
        <div class="inventory-item__icon">${item.image ? `<img src="/trp/assets/img/items/${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : item.icon}</div>
        <div class="inventory-item__name">${item.name}</div>
        <div class="inventory-item__rarity">${this.rarityName(item.rarity || 'common')}</div>
      </div>
    `).join('');
  }

  /**
   * Возвращает название редкости по-русски
   * @param {string} rarity - Редкость
   * @returns {string}
   */
  static rarityName(rarity) {
    const names = {
      'common': 'Обычное',
      'uncommon': 'Редкое',
      'rare': 'Очень редкое',
      'legendary': 'Легендарное'
    };
    return names[rarity] || 'Неизвестно';
  }

  /**
   * Обновляет отображение опыта и уровня в профиле
   */
  static updateExperienceUI() {
    const { level, currentExperience, requiredExperience } = gameState.player;
    
    // Обновляем текст уровня
    const levelEl = document.getElementById('playerLevel');
    if (levelEl) levelEl.textContent = level;
    
    // Обновляем полоску опыта
    const xpBarFill = document.getElementById('xpBarFill');
    if (xpBarFill) {
      const percentage = (currentExperience / requiredExperience) * 100;
      xpBarFill.style.width = percentage + '%';
    }
    
    // Обновляем текст опыта
    const currentXpEl = document.getElementById('currentXp');
    const requiredXpEl = document.getElementById('requiredXp');
    if (currentXpEl) currentXpEl.textContent = currentExperience;
    if (requiredXpEl) requiredXpEl.textContent = requiredExperience;
  }

  /**
   * Показывает модальное окно повышения уровня
   * @param {Array} levelsGained - Массив повышенных уровней
   */
  static showLevelUpNotification(levelsGained) {
    const notification = document.getElementById('levelUpNotification');
    const newLevelEl = document.getElementById('newLevel');
    const statsEl = document.getElementById('levelUpStats');
    
    if (!notification) return;
    
    // Показываем последний повышенный уровень
    const finalLevel = levelsGained[levelsGained.length - 1];
    newLevelEl.textContent = finalLevel;
    
    // Получаем последние улучшения характеристик
    const player = gameState.player;
    const hpBonus = 10 * levelsGained.length;
    
    statsEl.innerHTML = `
      <div class="stat-item">❤️ HP: +${hpBonus}</div>
      <div class="stat-item">📊 Максимальное HP: ${player.maxHp}</div>
      <div class="stat-item">⭐ Характеристики повышены!</div>
    `;
    
    notification.style.display = 'flex';
  }

  /**
   * Закрывает уведомление повышения уровня
   */
  static closeLevelUpNotification() {
    const notification = document.getElementById('levelUpNotification');
    if (notification) {
      notification.style.display = 'none';
    }
  }

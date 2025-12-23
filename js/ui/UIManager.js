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
import { Logger } from '../utils/helpers.js';
import { StatsUI } from './StatsUI.js';

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
    StatsUI.init();
  }

  /**
   * Синхронизирует отображение уровня и опыта в шапке и профиле
   * Обновляет оба места одновременно для избежания рассинхронизации
   */
  static renderLevelAndXP() {
    const player = gameState.getPlayerState();
    
    // Данные для отображения
    const levelText = `Уровень: ${player.level}`;
    const xpText = `${player.experience} / ${player.requiredExperienceForLevel}`;
    const xpPercent = Math.min((player.experience / player.requiredExperienceForLevel) * 100, 100);
    
    // Обновление шапки меню
    DOMManager.setText('header-level', levelText);
    DOMManager.setText('header-xp', xpText);
    const headerXpProgress = DOMManager.getElementById('header-xp-progress');
    if (headerXpProgress) {
      headerXpProgress.style.width = `${xpPercent}%`;
    }
    
    // Обновление профиля
    DOMManager.setText('profile-level', levelText);
    DOMManager.setText('profile-xp', xpText);
    const profileXpProgress = DOMManager.getElementById('profile-xp-progress');
    if (profileXpProgress) {
      profileXpProgress.style.width = `${xpPercent}%`;
    }
    
    Logger.log(`[UIManager] Уровень и опыт синхронизированы: ${levelText}, ${xpText}`);
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
    
    // Синхронизированное обновление уровня и опыта
    this.renderLevelAndXP();
    
    DOMManager.setText('playerAbilityPoints', `Очки способностей: ${player.abilityPoints}`);

    // Обновляем интерфейс прокачки характеристик
    StatsUI.updateStatsDisplay();

    // Добавляем информацию об активных способностях
    const classData = dataLoader.getClassByName(player.class);
    if (classData && classData.activeAbilities) {
      this.renderActiveAbilities(classData.activeAbilities);
    }

    // Обновляем отображение пассивной способности
    this.updatePassiveAbilityDisplay();

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
    
    // Синхронизированное обновление уровня и опыта
    this.renderLevelAndXP();
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
    
    // Обновляем профиль при переходе на вкладку Профиля
    if (tabName === 'profile') {
      this.updatePlayerProfile();
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
      
      // Обновляем отображение ресурсов, профиля и инвентаря
      this.updateResources();
      this.updatePlayerProfile();
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
   * Обновляет отображение пассивной способности в профиле
   */
  static updatePassiveAbilityDisplay() {
    const noneElement = DOMManager.getElementById('passiveAbilityNone');
    const contentElement = DOMManager.getElementById('passiveAbilityContent');
    
    if (!noneElement || !contentElement) return;

    const passiveAbility = gameState.passiveAbility;

    if (!passiveAbility) {
      // Показываем "не выбрано"
      noneElement.style.display = 'block';
      contentElement.style.display = 'none';
      return;
    }

    // Скрываем "не выбрано" и показываем информацию
    noneElement.style.display = 'none';
    contentElement.style.display = 'block';

    // Обновляем информацию о способности
    DOMManager.setText('passiveAbilityName', passiveAbility.name);
    DOMManager.setText('passiveAbilityDesc', passiveAbility.description);
    DOMManager.setText('passiveAbilityIcon', passiveAbility.icon);

    // Формируем текст эффектов
    const effects = passiveAbility.effects;
    const effectsList = [];

    if (effects.damageBuff) {
      effectsList.push(`⚔️ Урон: +${Math.round(effects.damageBuff * 100)}%`);
    }
    if (effects.hpBuff) {
      effectsList.push(`❤️ Здоровье: +${Math.round(effects.hpBuff * 100)}%`);
    }
    if (effects.manaBuff) {
      effectsList.push(`✨ Мана: +${Math.round(effects.manaBuff * 100)}%`);
    }
    if (effects.defenceBuff) {
      effectsList.push(`🛡️ Защита: -${Math.round(effects.defenceBuff * 100)}% урона`);
    }
    if (effects.agilityBuff) {
      effectsList.push(`⚡ Ловкость: +${effects.agilityBuff}`);
    }
    if (effects.experienceBuff) {
      effectsList.push(`📚 Опыт: +${Math.round(effects.experienceBuff * 100)}%`);
    }

    const effectsContainer = DOMManager.getElementById('passiveAbilityEffects');
    if (effectsContainer) {
      effectsContainer.innerHTML = effectsList.length > 0 
        ? effectsList.map(effect => `<div>• ${effect}</div>`).join('')
        : '<div style="color: #aaa;">Нет видимых эффектов</div>';
    }

    // Добавляем обработчик для кнопки изменения
    const changeBtn = DOMManager.getElementById('changePassiveAbilityBtn');
    if (changeBtn) {
      changeBtn.onclick = () => this.showPassiveAbilitySelection();
    }
  }

  /**
   * Показывает окно выбора пассивной способности
   */
  static showPassiveAbilitySelection() {
    // TODO: Реализовать модал выбора пассивной способности
    Logger.log('Выбор пассивной способности - функция будет реализована');
  }
  }
}

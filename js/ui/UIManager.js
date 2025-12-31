/**
 * UIManager - управление пользовательским интерфейсом
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { BattleEngine } from '../battle/BattleEngine.js';
import { BattleUI } from '../battle/BattleUI.js';
import { dataLoader } from '../data/DataLoader.js';
import { LocationsManager } from '../locations/LocationsManager.js';
import { DungeonsManager } from '../locations/DungeonsManager.js';
import { locationUI } from '../locations/LocationUI.js';
import { QuestsManager } from '../quests/QuestsManager.js';
import { CraftsManager } from '../crafts/CraftsManager.js';
import { InventoryManager } from './InventoryManager.js';
import { ProfileTabsManager } from './ProfileTabsManager.js';
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
  static async initGameUI() {
    console.log('[UIManager] Initializing game UI');
    this.updatePlayerProfile();
    this.initTabs();
    this.attachGameEventListeners();
    ProfileTabsManager.init();
    StatsUI.init();
    
    // Инициализируем все системы
    await DungeonsManager.init();
    await QuestsManager.init();
    await CraftsManager.init();
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
    
    // Обновление шапки меню (старая система, на случай если ещё используется)
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

    // Обновление меню
    DOMManager.setText('menu-level', levelText);
    DOMManager.setText('menu-xp', xpText);
    const menuXpProgress = DOMManager.getElementById('menu-xp-progress');
    if (menuXpProgress) {
      menuXpProgress.style.width = `${xpPercent}%`;
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
    DOMManager.setText('menu-maxHp', `Max HP: ${player.maxHp}`);

    // Max Mana
    DOMManager.setText('maxManaText', `Max MP: ${player.maxMana}`);
    DOMManager.setText('menu-maxMana', `Max MP: ${player.maxMana}`);

    // Gold
    DOMManager.setText('goldText', player.gold);
    DOMManager.setText('menu-gold', player.gold);
    
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
    
    // Обновляем представление при открытии вкладок (системы уже инициализированы при загрузке)
    if (tabName === 'dungeons') {
      DungeonsManager.updateStats();
    }

    if (tabName === 'quests') {
      QuestsManager.renderQuestsList();
    }

    if (tabName === 'craft') {
      CraftsManager.renderCraftsList();
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
    const hpPotionBtn = DOMManager.getElementById('hpPotionBtn');
    const manaPotionBtn = DOMManager.getElementById('manaPotionBtn');

    if (attackBtn) {
      attackBtn.addEventListener('click', () => BattleEngine.playerAttack());
    }

    if (fleeBtn) {
      fleeBtn.addEventListener('click', () => BattleEngine.fleeBattle());
    }

    if (hpPotionBtn) {
      hpPotionBtn.addEventListener('click', () => this.useHpPotion());
    }

    if (manaPotionBtn) {
      manaPotionBtn.addEventListener('click', () => this.useManaPotion());
    }

    // Обработчики для модала дропа
    const takeLootBtn = DOMManager.getElementById('takeLootBtn');
    const dropCloseBtn = DOMManager.getElementById('dropCloseBtn');

    if (takeLootBtn) {
      takeLootBtn.addEventListener('click', () => this.takeLoot());
    }

    if (dropCloseBtn) {
      dropCloseBtn.addEventListener('click', () => this.closeLootModal());
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
      
      // Обновляем только ресурсы на боевом экране
      this.updateResources();
    }
    
    this.closeLootModal();
    
    // Проверяем находимся ли мы в подземелье
    if (gameState.dungeonState) {
      // В подземелье переходим к следующему врагу
      import('../locations/DungeonsManager.js').then(module => {
        module.DungeonsManager.onDungeonEnemyDefeated();
      });
    } else {
      // Проверяем, есть ли callback для боя на локации (LocationUI)
      const callbacks = BattleEngine.getLocationBattleCallbacks();
      if (callbacks && callbacks.onVictory) {
        // Бой на боевой локации - вызываем onVictory callback
        // Он закроет BattleUI и вернет игрока в LocationUI для продолжения исследования
        callbacks.onVictory();
      } else {
        // Обычная локация из меню - возвращаемся на карту
        BattleEngine.fleeBattle();
      }
    }
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

    // Маппинг имён способностей на имена файлов
    const abilityImages = {
      // Воин
      'Боевой клич': 'клич.jpg',
      'Мощный удар': 'удар.jpg',
      // Маг
      'Огненный шар': 'огненный_шар.jpg',
      'Магический щит': 'маг_щит.jpg',
      // Лучник
      'Скоростной залп': 'скорост_залп.jpg',
      'Точный выстрел': 'точн_выстрел.jpg',
      // Паладин
      'Щитовой удар': 'щит_удар.jpg',
      'Последний рубеж': 'послед_рубеж.jpg',
      // Жрец
      'Исцеление': 'исц.jpg',
      'Проклятие слабости': 'прокл_слаб.jpg',
      // Убийца
      'Уход в тень': 'уход_тень.jpg',
      'Быстрая атака': 'быстрая_атака.jpg'
    };

    container.innerHTML = abilities.map(ability => {
      const imageName = abilityImages[ability.name] || 'placeholder.jpg';
      const imagePath = `/trp/assets/img/${imageName}`;
      return `
      <div class="ability-card ability-card--active">
        <div class="ability-card__header">
          <div class="ability-card__icon">
            <img src="${imagePath}" alt="${ability.name}" class="ability-card__image">
          </div>
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
    `;
    }).join('');
  }

  /**
   * Отрисовывает инвентарь игрока
   * @param {Array} inventory - Массив предметов в инвентаре
   */
  static renderInventory(inventory) {
    InventoryManager.renderInventory(inventory);
  }

  /**
   * Использует зелье HP
   */
  static useHpPotion() {
    const healed = gameState.useHpPotion();
    if (healed > 0) {
      BattleUI.addLog(`🩹 Использовано зелье HP! Восстановлено ${healed} HP`, 'buff');
      BattleUI.update();
      this.updatePotionButtons();
      BattleEngine.enemyAttack();
    } else if (gameState.battle.potionHpCooldown > 0) {
      BattleUI.addLog(`🩹 Зелье HP на кулдауне! Осталось ${gameState.battle.potionHpCooldown} ходов`, 'error');
    }
  }

  /**
   * Использует зелье Маны
   */
  static useManaPotion() {
    const restored = gameState.useManaPotion();
    if (restored > 0) {
      BattleUI.addLog(`💙 Использовано зелье Маны! Восстановлено ${restored} маны`, 'buff');
      BattleUI.update();
      this.updatePotionButtons();
      BattleEngine.enemyAttack();
    } else if (gameState.battle.potionManaCooldown > 0) {
      BattleUI.addLog(`💙 Зелье Маны на кулдауне! Осталось ${gameState.battle.potionManaCooldown} ходов`, 'error');
    }
  }

  /**
   * Обновляет состояние кнопок зелий
   */
  static updatePotionButtons() {
    const hpBtn = DOMManager.getElementById('hpPotionBtn');
    const manaBtn = DOMManager.getElementById('manaPotionBtn');
    const hpCooldownText = DOMManager.getElementById('hpCooldownText');
    const manaCooldownText = DOMManager.getElementById('manaCooldownText');

    if (hpBtn && hpCooldownText) {
      if (gameState.battle.potionHpCooldown > 0) {
        hpBtn.disabled = true;
        hpCooldownText.textContent = gameState.battle.potionHpCooldown;
      } else {
        hpBtn.disabled = false;
        hpCooldownText.textContent = '';
      }
    }

    if (manaBtn && manaCooldownText) {
      if (gameState.battle.potionManaCooldown > 0) {
        manaBtn.disabled = true;
        manaCooldownText.textContent = gameState.battle.potionManaCooldown;
      } else {
        manaBtn.disabled = false;
        manaCooldownText.textContent = '';
      }
    }
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
   * Переходит на главное меню
   */
  static showMainMenu() {
    this.hideAllScreens();
    const menuScreen = DOMManager.getElementById('main-menu-screen');
    if (menuScreen) {
      menuScreen.classList.remove('hidden');
      menuScreen.classList.add('visible');
    }
    this.updateMenuResources();
  }

  /**
   * Переходит на указанный экран
   * @param {string} screenName - Название экрана (world, dungeons, quests, craft, profile, settings)
   */
  static showGameScreen(screenName) {
    this.hideAllScreens();
    const screenId = `${screenName}-screen`;
    const screen = DOMManager.getElementById(screenId);
    if (screen) {
      screen.classList.remove('hidden');
      screen.classList.add('visible');
    }
    
    // Инициализируем содержимое экрана при первом открытии
    switch(screenName) {
      case 'world':
        LocationsManager.renderLocations();
        break;
      case 'dungeons':
        DungeonsManager.updateStats();
        break;
      case 'quests':
        QuestsManager.renderQuestsList();
        break;
      case 'craft':
        CraftsManager.renderCraftsList();
        break;
      case 'profile':
        StatsUI.updateStatsDisplay();
        const player = gameState.getPlayerState();
        InventoryManager.renderInventory(player.inventory);
        ProfileTabsManager.switchTab('status');
        break;
    }
  }

  /**
   * Скрывает все экраны
   */
  static hideAllScreens() {
    const screens = DOMManager.querySelectorAll('.screen');
    screens.forEach(screen => {
      screen.classList.remove('visible');
      screen.classList.add('hidden');
    });
  }

  /**
   * Обновляет ресурсы на меню
   */
  static updateMenuResources() {
    const player = gameState.getPlayerState();
    
    // Очищаем состояние тестовой генерации локации и ранения
    locationUI.closeLocation();
    gameState.player.wounds = 0;
    
    DOMManager.setText('menu-level', `Уровень: ${player.level}`);
    DOMManager.setText('menu-xp', `${player.experience} / ${player.requiredExperienceForLevel}`);
    DOMManager.setText('menu-maxHp', `Max HP: ${player.maxHp}`);
    DOMManager.setText('menu-maxMana', `Max MP: ${player.maxMana}`);
    DOMManager.setText('menu-gold', player.gold);
    
    const xpPercent = Math.min((player.experience / player.requiredExperienceForLevel) * 100, 100);
    const xpProgress = DOMManager.getElementById('menu-xp-progress');
    if (xpProgress) {
      xpProgress.style.width = `${xpPercent}%`;
    }
  }

  /**
   * Инициализирует обработчики навигации для меню
   */
  static initMenuNavigation() {
    const menuButtons = DOMManager.querySelectorAll('.menu__btn');
    menuButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const screenName = btn.getAttribute('data-screen');
        this.showGameScreen(screenName);
      });
    });

    // Инициализируем кнопки выхода на каждом экране
    const exitButtons = {
      'worldExitBtn': 'main-menu-screen',
      'dungeonsExitBtn': 'main-menu-screen',
      'questsExitBtn': 'main-menu-screen',
      'craftExitBtn': 'main-menu-screen',
      'profileExitBtn': 'main-menu-screen',
      'settingsExitBtn': 'main-menu-screen'
    };

    for (const [btnId, targetScreen] of Object.entries(exitButtons)) {
      const btn = DOMManager.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => {
          this.hideAllScreens();
          const screen = DOMManager.getElementById(targetScreen);
          if (screen) {
            screen.classList.remove('hidden');
            screen.classList.add('visible');
          }
          this.updateMenuResources();
        });
      }
    }

    // Инициализируем кнопку тестирования локации
  }
}

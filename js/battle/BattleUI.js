/**
 * BattleUI - управление интерфейсом боя
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { calculatePercent } from '../utils/helpers.js';
import { GAME_CONSTANTS } from '../utils/constants.js';
import { UIManager } from '../ui/UIManager.js';
import { ImageCache } from '../utils/ImageCache.js';

export class BattleUI {
  static battleLogs = [];

  /**
   * Показывает боевой экран
   */
  static show() {
    this.battleLogs = [];
    // Очищаем старое изображение врага перед началом новой боя
    const enemyImage = DOMManager.getElementById('enemyImage');
    if (enemyImage) {
      enemyImage.src = '';
    }
    DOMManager.hideScreen(GAME_CONSTANTS.MAIN_GAME_SCREEN_ID);
    DOMManager.showScreen(GAME_CONSTANTS.BATTLE_SCREEN_ID);
    this.setupEventListeners();
  }

  /**
   * Скрывает боевой экран
   */
  static hide() {
    this.battleLogs = [];
    this.clearAbilityButtons();
    DOMManager.hideScreen(GAME_CONSTANTS.BATTLE_SCREEN_ID);
    DOMManager.showScreen(GAME_CONSTANTS.MAIN_GAME_SCREEN_ID);
  }

  /**
   * Обновляет интерфейс боя
   */
  static update() {
    const enemy = gameState.battle.currentEnemy;
    const { playerHp, playerMaxHp, playerMana, playerMaxMana } = gameState.battle;

    console.log(`[BattleUI] Обновляю интерфейс для врага: ${enemy.name}`);
    
    let enemyNameDisplay = enemy.name;
    if (gameState.dungeonState) {
      const currentIndex = gameState.dungeonState.currentEnemyIndex + 1;
      const totalEnemies = gameState.dungeonState.dungeonEnemies.length;
      enemyNameDisplay = `${enemy.name} (${currentIndex}/${totalEnemies})`;
    }
    
    DOMManager.setText('enemyName', enemyNameDisplay);
    
    const enemyImage = DOMManager.getElementById('enemyImage');
    if (enemyImage) {
      if (enemy.image) {
        // Используем URL из кеша или прямой путь
        const imageUrl = ImageCache.getImageUrl(enemy.image);
        if (imageUrl) {
          enemyImage.src = imageUrl;
        } else {
          // Fallback к прямому пути, если картинка не в кеше
          enemyImage.src = `/trp/assets/img/enemies/${enemy.image}`;
        }
        enemyImage.alt = enemy.name;
        console.log(`[BattleUI] Изображение врага установлено: ${enemy.image}`);
      } else {
        // Очищаем изображение, если его нет
        enemyImage.src = '';
        enemyImage.alt = enemy.name;
        console.log(`[BattleUI] Изображение врага очищено (враг без картинки)`);
      }
    }
    
    const enemyPercent = calculatePercent(enemy.currentHp, enemy.hp);
    DOMManager.setWidth('enemyHpFill', enemyPercent + '%');
    DOMManager.setText('enemyHpText', `${Math.max(0, enemy.currentHp)}/${enemy.hp}`);

    const playerPercent = calculatePercent(playerHp, playerMaxHp);
    DOMManager.setWidth('playerHpFill', playerPercent + '%');
    DOMManager.setText('playerHpText', `${playerHp}/${playerMaxHp}`);
    
    const playerManaPercent = calculatePercent(playerMana, playerMaxMana);
    DOMManager.setWidth('playerManaFill', playerManaPercent + '%');
    DOMManager.setText('playerManaText', `${playerMana}/${playerMaxMana}`);
    
    // Обновляем кулдауны зелий и способностей
    UIManager.updatePotionButtons();
    this.updateAbilityButtons();
  }

  /**
   * Добавляет запись в лог боя
   */
  static addLog(message, type = 'neutral') {
    this.battleLogs.push({ message, type });
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
   * Отображает логи в модали
   */
  static showBattleLogs() {
    const logsContainer = DOMManager.getElementById('battleLogsContainer');
    if (!logsContainer) return;

    logsContainer.innerHTML = this.battleLogs.map(log => `
      <div class="battle__log-entry battle__log-entry--${log.type}">
        ${log.message}
      </div>
    `).join('');

    DOMManager.openModal('battleLogsModal');
  }

  /**
   * Закрывает модаль логов
   */
  static closeBattleLogs() {
    DOMManager.closeModal('battleLogsModal');
  }

  /**
   * Отрисовывает кнопки активных способностей
   */
  static renderAbilityButtons(abilities) {
    const abilitiesContainer = DOMManager.getElementById('abilitiesContainer');
    if (!abilitiesContainer) return;

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

    let html = abilities.map(ability => {
      const imageName = abilityImages[ability.name] || 'placeholder.jpg';
      const imagePath = `/trp/assets/img/${imageName}`;
      return `
      <button class="battle__btn--ability" id="ability-${ability.name}" onclick="window.BattleEngine.useActiveAbility('${ability.name}')" title="${ability.name}">
        <img src="${imagePath}" alt="${ability.name}" loading="eager">
        <span class="ability-cooldown" id="cooldown-${ability.name}"></span>
        <span class="ability-mana-cost" id="mana-${ability.name}">
          <span class="ability-mana-text">${ability.manaCost}</span>
        </span>
      </button>
    `;
    }).join('');

    // Добавляем 2 пустых слота для будущих способностей
    html += `
      <button class="battle__btn--ability battle__btn--ability-empty" disabled title="Свободный слот">
        <div class="ability-empty-icon">+</div>
      </button>
      <button class="battle__btn--ability battle__btn--ability-empty" disabled title="Свободный слот">
        <div class="ability-empty-icon">+</div>
      </button>
    `;

    abilitiesContainer.innerHTML = html;
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

  /**
   * Показывает модальное окно с дропом
   */
  static showLootModal(enemyName, loot) {
    this.currentLoot = loot;
    DOMManager.setText('dropEnemyName', enemyName);
    DOMManager.setText('dropGold', loot.gold);
    
    const dropItemsContainer = DOMManager.getElementById('dropItems');
    if (dropItemsContainer) {
      dropItemsContainer.innerHTML = loot.items.map(item => `
        <div class="drop-item">
          <div class="drop-item__image">${item.image ? `<img src="/trp/assets/img/items/${item.image}" alt="${item.name}">` : item.icon}</div>
          <div class="drop-item__name">${item.name}</div>
          <div class="drop-item__rarity drop-item__rarity--${item.rarity}">
            ${this.rarityName(item.rarity)}
          </div>
        </div>
      `).join('');
    }
    
    DOMManager.openModal('dropModal');
  }

  /**
   * Возвращает название редкости
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
   * Скрывает модал дропа
   */
  static hideLootModal() {
    DOMManager.closeModal('dropModal');
  }

  /**
   * Устанавливает обработчики событий
   */
  static setupEventListeners() {
    const battleLogsBtn = DOMManager.getElementById('battleLogsBtn');
    const battleLogsCloseBtn = DOMManager.getElementById('battleLogsCloseBtn');
    const closeBattleLogsBtn = DOMManager.getElementById('closeBattleLogsBtn');
    const battleLogsModal = DOMManager.getElementById('battleLogsModal');

    if (battleLogsBtn) {
      battleLogsBtn.addEventListener('click', () => this.showBattleLogs());
    }
    if (battleLogsCloseBtn) {
      battleLogsCloseBtn.addEventListener('click', () => this.closeBattleLogs());
    }
    if (closeBattleLogsBtn) {
      closeBattleLogsBtn.addEventListener('click', () => this.closeBattleLogs());
    }
    
    if (battleLogsModal) {
      battleLogsModal.addEventListener('click', (e) => {
        if (e.target === battleLogsModal) {
          this.closeBattleLogs();
        }
      });
    }
  }
}

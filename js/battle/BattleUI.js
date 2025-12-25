/**
 * BattleUI - управление интерфейсом боя
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { calculatePercent } from '../utils/helpers.js';
import { GAME_CONSTANTS } from '../utils/constants.js';
import { UIManager } from '../ui/UIManager.js';

export class BattleUI {
  static battleLogs = [];

  /**
   * Показывает боевой экран
   */
  static show() {
    this.battleLogs = [];
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

    abilitiesContainer.innerHTML = abilities.map(ability => {
      const manaCostText = ability.manaCost ? `<span class="ability-mana">${ability.manaCost}💙</span>` : '';
      const imageHtml = ability.image 
        ? `<img src="/trp/assets/img/${ability.image}" alt="${ability.name}" class="ability-image">` 
        : '';
      
      return `
      <button class="btn-ability ${ability.image ? 'btn-ability--image' : ''}" id="ability-${ability.name}" 
              onclick="window.BattleEngine.useActiveAbility('${ability.name}')" 
              title="${ability.name}">
        ${imageHtml}
        ${!ability.image ? `<span class="ability-name">${ability.name}</span>` : ''}
        ${!ability.image ? manaCostText : ''}
        <span class="ability-cooldown" id="cooldown-${ability.name}"></span>
      </button>
    `;
    }).join('');
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

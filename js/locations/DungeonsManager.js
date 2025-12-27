/**
 * DungeonsManager - управление системой подземелий
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { dataLoader } from '../data/DataLoader.js';
import { Logger } from '../utils/helpers.js';
import { BattleEngine } from '../battle/BattleEngine.js';
import { BattleUI } from '../battle/BattleUI.js';
import { UIManager } from '../ui/UIManager.js';
import { QuestsManager } from '../quests/QuestsManager.js';
import { ImageCache } from '../utils/ImageCache.js';

export class DungeonsManager {
  static dungeons = [];
  static currentFilter = {
    difficulty: 'all',
    status: 'all'
  };

  /**
   * Инициализирует систему подземелий
   */
  static async init() {
    console.log('[DungeonsManager] Инициализация системы подземелий');
    
    // Загружаем данные подземелий
    this.dungeons = await dataLoader.loadDungeons();
    
    // Инициализируем прогресс подземелий в состоянии игрока если его нет
    if (!gameState.player.dungeonsProgress) {
      gameState.player.dungeonsProgress = {};
    }
    
    // Прикрепляем обработчики событий
    this.attachEventListeners();
    
    // Отображаем список подземелий
    this.renderDungeonsList();
  }

  /**
   * Загружает и отображает список подземелий
   */
  static renderDungeonsList() {
    const container = DOMManager.getElementById('dungeonsGrid');
    if (!container) return;

    // Применяем фильтры
    const filtered = this.applyFilters(this.dungeons);
    
    if (filtered.length === 0) {
      container.innerHTML = '<p class="dungeons-empty">Нет доступных подземелий, соответствующих фильтрам</p>';
      return;
    }

    container.innerHTML = filtered.map(dungeon => this.createDungeonCard(dungeon)).join('');

    // Прикрепляем обработчики к карточкам
    filtered.forEach(dungeon => {
      const card = DOMManager.getElementById(`dungeon-card-${dungeon.id}`);

      if (card) {
        card.addEventListener('click', () => this.showDungeonDetails(dungeon.id));
      }
    });
  }

  /**
   * Создает HTML карточку подземелья
   */
  static createDungeonCard(dungeon) {
    const progress = gameState.player.dungeonsProgress[dungeon.id] || {};
    const statusClass = progress.completed ? 'status-completed' : progress.started ? 'status-in-progress' : 'status-not-started';
    const statusText = progress.completed ? `✓ Пройдено` : progress.started ? `⏱ В процессе` : `○ Не начато`;

    // Маппинг названий подземелий на картинки (названия файлов)
    const dungeonImages = {
      'Развалины в лесу': 'развалины.jpg',
      'Кристальные пещеры': 'пещера.jpg',
      'Храм Тьмы': 'храм1.jpg',
      'Древняя библиотека': 'библиотека.jpg'
    };

    const imageName = dungeonImages[dungeon.name];
    const imagePath = imageName ? ImageCache.getImageUrl(imageName) || `/trp/assets/img/${imageName}` : '';

    return `
      <div class="dungeon-card" id="dungeon-card-${dungeon.id}">
        <div class="dungeon-card-header" style="background: linear-gradient(135deg, ${dungeon.difficultyColor} 0%, #2c3e50 100%); ${imagePath ? `background-image: url('${imagePath}'); background-size: cover; background-position: center;` : ''}">
          <h3 class="dungeon-card-title">${dungeon.name}</h3>
          <div class="difficulty-badge">${dungeon.difficulty}</div>
        </div>
        <div class="dungeon-card-body">
          <div class="dungeon-status ${statusClass}">${statusText}</div>
        </div>
      </div>
    `;
  }

  /**
   * Показывает детальную информацию о подземелье
   */
  static showDungeonDetails(dungeonId) {
    const dungeon = this.dungeons.find(d => d.id === dungeonId);
    if (!dungeon) return;

    const detailsContainer = DOMManager.getElementById('dungeonDetails');
    const isAvailable = gameState.player.level >= dungeon.requiredLevel;

    // Маппинг названий подземелий на картинки
    const dungeonImages = {
      'Развалины в лесу': '/trp/assets/img/развалины.jpg',
      'Кристальные пещеры': '/trp/assets/img/пещера.jpg',
      'Храм Тьмы': '/trp/assets/img/храм1.jpg',
      'Древняя библиотека': '/trp/assets/img/библиотека.jpg'
    };

    const imagePath = dungeonImages[dungeon.name] || '';
    const headerStyle = imagePath ? `background: linear-gradient(135deg, ${dungeon.difficultyColor}99 0%, ${dungeon.difficultyColor}99 100%), url('${imagePath}'); background-size: cover; background-position: center;` : `background: linear-gradient(135deg, ${dungeon.difficultyColor} 0%, #2c3e50 100%);`;

    detailsContainer.innerHTML = `
      <div class="dungeon-details-content">
        <div class="dungeon-details-header" style="${headerStyle}">
          <h1 class="dungeon-details-title">${dungeon.name}</h1>
          <button class="dungeon-close-btn" onclick="DungeonsManager.closeDungeonDetails()">✕</button>
        </div>

        <div class="dungeon-tabs">
          <button class="dungeon-tab active" data-tab="description">Описание</button>
          <button class="dungeon-tab" data-tab="enemies">Враги</button>
          <button class="dungeon-tab" data-tab="rewards">Награды</button>
          <button class="dungeon-tab" data-tab="progress">Прогресс</button>
        </div>

        <div id="tab-description" class="dungeon-tab-content active">
          <div class="dungeon-description-full">${dungeon.description_full}</div>
          <div class="dungeon-requirements" style="margin-bottom: var(--spacing-md);">
            <div class="requirement">
              <span class="requirement-icon">📊</span>
              <span>Рекомендуемый уровень: ${dungeon.requiredLevel}</span>
            </div>
            <div class="requirement">
              <span class="requirement-icon">⏱</span>
              <span>Примерная длительность: ${dungeon.duration}</span>
            </div>
          </div>
          ${dungeon.tips ? `<div class="dungeon-tips">💡 Совет: ${dungeon.tips}</div>` : ''}
        </div>

        <div id="tab-enemies" class="dungeon-tab-content">
          <div class="enemies-list">
            ${dungeon.enemies.map((enemy, idx) => {
              const isBoss = enemy.includes('(босс)');
              return `
                <div class="enemy-item">
                  <div>
                    <div class="enemy-name">${enemy}</div>
                    <div class="enemy-type">${isBoss ? 'Финальный босс' : 'Обычный враг'}</div>
                  </div>
                  ${isBoss ? '<div class="boss-tag">БОСС</div>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div id="tab-rewards" class="dungeon-tab-content">
          <div class="rewards-list">
            ${dungeon.rewards.map(reward => {
              let icon = '⚔️';
              let name = '';
              if (reward.type === 'gold') {
                icon = '💰';
                name = reward.value + ' золота';
              } else if (reward.type === 'item') {
                icon = '⚔️';
                name = reward.name;
              } else if (reward.type === 'experience') {
                icon = '⭐';
                name = reward.value + ' опыта';
              }
              
              return `
                <div class="reward-card">
                  <div class="reward-icon">${icon}</div>
                  <div class="reward-name">${name}</div>
                  <div class="reward-chance">${Math.round(reward.chance * 100)}%</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div id="tab-progress" class="dungeon-tab-content">
          ${this.renderDungeonProgress(dungeonId)}
        </div>

        <div class="dungeon-details-actions">
          <button class="btn-start-dungeon ${!isAvailable ? 'disabled' : ''}" ${!isAvailable ? 'disabled' : ''} onclick="DungeonsManager.startDungeon('${dungeonId}')">
            ${isAvailable ? '🎮 Начать подземелье' : `🔒 Требуется уровень ${dungeon.requiredLevel}`}
          </button>
        </div>
      </div>
    `;

    // Прикрепляем обработчики к вкладкам
    this.attachTabHandlers();

    // Показываем контейнер
    detailsContainer.classList.add('active');
  }

  /**
   * Отрисовывает прогресс подземелья
   */
  static renderDungeonProgress(dungeonId) {
    const progress = gameState.player.dungeonsProgress[dungeonId];
    
    if (!progress || !progress.attempts || progress.attempts.length === 0) {
      return '<div class="progress-empty">Вы еще не начинали это подземелье</div>';
    }

    return `
      <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--spacing-md);">
          ${progress.attempts.map((attempt, idx) => `
            <div class="reward-card">
              <div style="font-weight: bold; color: #2c3e50;">Попытка ${idx + 1}</div>
              <div style="font-size: var(--font-size-sm); color: #95a5a6; margin: var(--spacing-sm) 0;">
                ${new Date(attempt.date).toLocaleDateString('ru-RU')}
              </div>
              <div style="font-size: var(--font-size-sm);">
                ${attempt.completed ? '✓ Пройдено' : '✗ Не пройдено'}
              </div>
              ${attempt.score ? `<div style="margin-top: var(--spacing-sm); font-weight: bold;">Очки: ${attempt.score}</div>` : ''}
            </div>
          `).join('')}
        </div>
        ${progress.bestScore ? `<div style="padding: var(--spacing-md); background-color: #d5f4e6; border-radius: var(--radius-sm); text-align: center; font-weight: bold; color: #27ae60;">Лучший результат: ${progress.bestScore} очков</div>` : ''}
      </div>
    `;
  }

  /**
   * Прикрепляет обработчики к вкладкам
   */
  static attachTabHandlers() {
    const tabs = document.querySelectorAll('.dungeon-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Убираем активный класс со всех вкладок и содержимого
        document.querySelectorAll('.dungeon-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.dungeon-tab-content').forEach(c => c.classList.remove('active'));
        
        // Добавляем активный класс к текущей вкладке и её содержимому
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        const content = document.getElementById(`tab-${tabId}`);
        if (content) {
          content.classList.add('active');
        }
      });
    });
  }

  /**
   * Закрывает детальное окно подземелья
   */
  static closeDungeonDetails() {
    const detailsContainer = DOMManager.getElementById('dungeonDetails');
    detailsContainer.classList.remove('active');
    detailsContainer.innerHTML = '';
  }

  /**
   * Запускает подземелье
   */
  static startDungeon(dungeonId) {
    const dungeon = this.dungeons.find(d => d.id === dungeonId);
    if (!dungeon) return;

    // Проверяем требования
    if (gameState.player.level < dungeon.requiredLevel) {
      alert(`Требуется уровень ${dungeon.requiredLevel}!`);
      return;
    }

    // Инициализируем прогресс если его нет
    if (!gameState.player.dungeonsProgress[dungeonId]) {
      gameState.player.dungeonsProgress[dungeonId] = {
        started: false,
        completed: false,
        attempts: []
      };
    }

    // Отмечаем что подземелье начато
    gameState.player.dungeonsProgress[dungeonId].started = true;

    // Сохраняем текущее состояние игры
    gameState.dungeonState = {
      currentDungeonId: dungeonId,
      startTime: Date.now(),
      currentEnemyIndex: 0,
      dungeonEnemies: this.generateDungeonEnemies(dungeon),
      returnPoint: {
        location: gameState.currentTab,
        playerState: JSON.parse(JSON.stringify(gameState.player))
      }
    };

    Logger.log(`🗺️ Начало подземелья: ${dungeon.name}`);
    
    // Закрываем детали и список
    this.closeDungeonDetails();
    
    // Переходим в режим боевой системы подземелья
    this.startDungeonBattle();
  }

  /**
   * Генерирует врагов для подземелья на основе данных
   */
  static generateDungeonEnemies(dungeon) {
    return dungeon.enemies.map(enemyName => {
      // Удаляем тег (босс) если есть
      const cleanName = enemyName.replace(' (босс)', '');
      const isBoss = enemyName.includes('(босс)');
      
      // Базовые параметры врага зависят от сложности подземелья
      let levelBonus = 0;
      if (dungeon.difficulty === 'L1') levelBonus = 0;
      else if (dungeon.difficulty === 'L2') levelBonus = 4;
      else if (dungeon.difficulty === 'L3') levelBonus = 9;
      
      const enemyLevel = dungeon.requiredLevel + levelBonus;
      const baseMultiplier = 1 + (enemyLevel - 1) * 0.5;
      
      // Для босса применяем множитель 1.5x
      const hpMultiplier = isBoss ? 1.5 : 1;
      const damageMultiplier = isBoss ? 1.3 : 1;
      
      const maxHp = Math.round(30 * baseMultiplier * hpMultiplier);
      
      return {
        id: `${dungeon.id}_${cleanName.toLowerCase().replace(/\s+/g, '_')}`,
        name: cleanName,
        level: enemyLevel,
        isBoss: isBoss,
        maxHp: maxHp,
        hp: maxHp,
        currentHp: maxHp,
        attack: Math.round(5 * baseMultiplier * damageMultiplier),
        defense: Math.round(2 * baseMultiplier),
        reward: {
          gold: Math.round(50 * baseMultiplier * (isBoss ? 2 : 1)),
          experience: Math.round(25 * baseMultiplier * (isBoss ? 3 : 1))
        }
      };
    });
  }

  /**
   * Запускает боевую систему для подземелья
   */
  static startDungeonBattle() {
    if (!gameState.dungeonState || gameState.dungeonState.dungeonEnemies.length === 0) {
      this.completeDungeonBattle();
      return;
    }

    // Получаем текущего врага
    const currentEnemyIndex = gameState.dungeonState.currentEnemyIndex;
    const enemy = gameState.dungeonState.dungeonEnemies[currentEnemyIndex];
    
    if (!enemy) {
      this.completeDungeonBattle();
      return;
    }

    // Инициализируем боевую систему с врагом подземелья
    const dungeonId = gameState.dungeonState.currentDungeonId;
    const dungeon = this.dungeons.find(d => d.id === dungeonId);
    
    Logger.log(`⚔️ Враг в подземелье: ${enemy.name} (${currentEnemyIndex + 1}/${gameState.dungeonState.dungeonEnemies.length})`);
    
    // Получаем активные способности класса
    const playerClass = gameState.player.class;
    const classData = dataLoader.getClassByName(playerClass);
    const activeAbilities = classData && classData.activeAbilities ? classData.activeAbilities : [];
    
    // Инициализируем боевую сессию
    BattleEngine.initiateBattle(enemy, dungeonId, activeAbilities);
  }

  /**
   * Вызывается при победе над врагом в подземелье
   */
  static onDungeonEnemyDefeated() {
    if (!gameState.dungeonState) return;

    gameState.dungeonState.currentEnemyIndex++;
    
    const dungeonId = gameState.dungeonState.currentDungeonId;
    const dungeon = this.dungeons.find(d => d.id === dungeonId);
    
    // Если есть еще враги - переходим к следующему
    if (gameState.dungeonState.currentEnemyIndex < gameState.dungeonState.dungeonEnemies.length) {
      Logger.log(`✓ Враг повергнут! Подготовка к следующему бою...`);
      
      // Небольшое восстановление здоровья и маны между боями (80%)
      gameState.battle.playerHp = Math.round(gameState.player.maxHp * 0.8);
      gameState.battle.playerMana = Math.round(gameState.player.maxMana * 0.8);
      
      // Даем игроку возможность подготовиться
      setTimeout(() => {
        this.startDungeonBattle();
      }, 500);
    } else {
      // Все враги повергнуты - подземелье пройдено!
      Logger.log(`🎉 Подземелье ${dungeon.name} пройдено!`);
      setTimeout(() => {
        this.completeDungeonBattle(true);
      }, 500);
    }
  }

  /**
   * Вызывается при поражении игрока в подземелье
   */
  static onDungeonPlayerDefeated() {
    if (!gameState.dungeonState) return;

    const dungeonId = gameState.dungeonState.currentDungeonId;
    const dungeon = this.dungeons.find(d => d.id === dungeonId);
    
    Logger.log(`💀 Вы были повергнуты! Подземелье не пройдено.`);
    
    this.completeDungeonBattle(false);
  }

  /**
   * Завершает прохождение подземелья и возвращает в основной интерфейс
   */
  static completeDungeonBattle(success = false) {
    if (!gameState.dungeonState) return;

    const dungeonId = gameState.dungeonState.currentDungeonId;
    const dungeon = this.dungeons.find(d => d.id === dungeonId);
    
    if (!dungeon) return;

    // Записываем результат в прогресс
    const progress = gameState.player.dungeonsProgress[dungeonId];
    if (!progress) {
      gameState.player.dungeonsProgress[dungeonId] = {
        started: false,
        completed: false,
        attempts: []
      };
    }

    // Вычисляем очки за подземелье
    let score = 0;
    if (success) {
      const timeBonus = Math.max(0, 1000 - (Date.now() - gameState.dungeonState.startTime) / 100);
      const healthBonus = (gameState.battle.playerHp / gameState.player.maxHp) * 500;
      score = Math.round(500 + timeBonus + healthBonus);
    }

    // Записываем попытку
    progress.attempts.push({
      date: new Date().toISOString(),
      completed: success,
      score: score
    });

    if (success) {
      progress.completed = true;
      
      // Обновляем лучший результат
      if (!progress.bestScore || score > progress.bestScore) {
        progress.bestScore = score;
      }

      // Собираем награды для показа
      let dungeonRewards = {
        gold: 0,
        experience: 0,
        items: []
      };

      // Добавляем награды
      dungeon.rewards.forEach(reward => {
        const chance = Math.random();
        if (chance <= reward.chance) {
          if (reward.type === 'gold') {
            gameState.addGold(reward.value);
            dungeonRewards.gold += reward.value;
          } else if (reward.type === 'experience') {
            gameState.addExperience(reward.value);
            dungeonRewards.experience += reward.value;
          } else if (reward.type === 'item') {
            // Добавляем предмет в инвентарь
            const item = {
              name: reward.name,
              rarity: reward.rarity || 'common',
              icon: '⚔️',
              image: null
            };
            gameState.addItems([item]);
            dungeonRewards.items.push(item);
            Logger.log(`⚔️ Получен предмет: ${reward.name} (${reward.rarity})`);
          }
        }
      });

      // Показываем модальное окно с награднми подземелья
      this.showDungeonCompletionRewards(dungeonRewards, dungeon);
    } else {
      // Очищаем состояние подземелья
      gameState.dungeonState = null;
      // Закрываем боевой интерфейс и возвращаемся на экран подземелий
      this.returnToDungeons();
    }
  }

  showDungeonCompletionRewards(rewards, dungeon) {
    let modal = document.getElementById('dungeonRewardsModal');
    if (!modal) {
      // Создаем модальное окно если его нет
      const newModal = document.createElement('div');
      newModal.id = 'dungeonRewardsModal';
      newModal.className = 'modal modal--reward';
      newModal.innerHTML = `
        <div class="modal__overlay"></div>
        <div class="modal__content modal__content--reward">
          <div class="modal__header modal__header--victory">
            <h2>Подземелье завершено!</h2>
            <p class="modal__subtitle">${dungeon.name}</p>
          </div>
          <div class="modal__body">
            <div class="rewards-container">
              ${rewards.gold > 0 ? `<div class="reward-item reward-gold">💰 Золото: +${rewards.gold}</div>` : ''}
              ${rewards.experience > 0 ? `<div class="reward-item reward-xp">⭐ Опыт: +${rewards.experience}</div>` : ''}
              ${rewards.items.length > 0 ? `
                <div class="reward-items">
                  <h4>Предметы:</h4>
                  ${rewards.items.map(item => `
                    <div class="reward-item reward-item-drop" data-rarity="${item.rarity}">
                      ${item.icon} ${item.name}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
          <div class="modal__footer">
            <button class="btn btn-primary" id="closeRewardsBtn">Продолжить</button>
          </div>
        </div>
      `;
      document.body.appendChild(newModal);
      modal = newModal;
    }
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Обновляем содержимое
    const content = modal.querySelector('.modal__content');
    content.innerHTML = `
      <div class="modal__header modal__header--victory">
        <h2>Подземелье завершено!</h2>
        <p class="modal__subtitle">${dungeon.name}</p>
      </div>
      <div class="modal__body">
        <div class="rewards-container">
          ${rewards.gold > 0 ? `<div class="reward-item reward-gold">💰 Золото: +${rewards.gold}</div>` : ''}
          ${rewards.experience > 0 ? `<div class="reward-item reward-xp">⭐ Опыт: +${rewards.experience}</div>` : ''}
          ${rewards.items.length > 0 ? `
            <div class="reward-items">
              <h4>Предметы:</h4>
              ${rewards.items.map(item => `
                <div class="reward-item reward-item-drop" data-rarity="${item.rarity}">
                  ${item.icon} ${item.name}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
      <div class="modal__footer">
        <button class="btn btn-primary" id="closeRewardsBtn">Продолжить</button>
      </div>
    `;
    
    // Обработчик закрытия
    const closeBtn = document.getElementById('closeRewardsBtn');
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      gameState.dungeonState = null;
      this.returnToDungeons();
    };
  }

  /**
   * Применяет фильтры к списку подземелий
   */
  static applyFilters(dungeons) {
    return dungeons.filter(dungeon => {
      // Фильтр по сложности
      if (this.currentFilter.difficulty !== 'all' && dungeon.difficulty !== this.currentFilter.difficulty) {
        return false;
      }

      // Фильтр по статусу
      if (this.currentFilter.status !== 'all') {
        const progress = gameState.player.dungeonsProgress[dungeon.id];
        if (this.currentFilter.status === 'completed' && (!progress || !progress.completed)) {
          return false;
        }
        if (this.currentFilter.status === 'not-started' && progress && progress.started) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Прикрепляет обработчики событий фильтров
   */
  static attachEventListeners() {
    const difficultyFilter = DOMManager.getElementById('difficultyFilter');
    const statusFilter = DOMManager.getElementById('statusFilter');

    if (difficultyFilter) {
      difficultyFilter.addEventListener('change', (e) => {
        this.currentFilter.difficulty = e.target.value;
        this.renderDungeonsList();
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.currentFilter.status = e.target.value;
        this.renderDungeonsList();
      });
    }
  }

  /**
   * Обновляет статистику подземелий
   */
  static updateStats() {
    const totalCompleted = Object.values(gameState.player.dungeonsProgress || {}).filter(p => p.completed).length;
    const bestScore = Math.max(...Object.values(gameState.player.dungeonsProgress || {})
      .filter(p => p.bestScore)
      .map(p => p.bestScore), 0);

    DOMManager.setText('totalDungeonsCompleted', totalCompleted);
    DOMManager.setText('bestDungeonScore', bestScore > 0 ? bestScore : '-');
  }

  /**
   * Возвращает игрока на экран подземелий из боевой системы
   */
  static returnToDungeons() {
    // Скрываем боевой интерфейс используя BattleUI
    BattleUI.hide();
    
    // Переключаемся на вкладку подземелий
    UIManager.switchTab('dungeons');
    
    // Обновляем список подземелий и статистику
    this.renderDungeonsList();
    this.updateStats();

    // Обновляем интерфейс шапки (ресурсы, опыт, уровень)
    UIManager.updateResources();
    UIManager.updatePlayerProfile();

    // Проверяем условия выполнения квестов
    QuestsManager.checkQuestConditions();

    // Показываем уведомление о завершении
    const dungeonId = gameState.dungeonState?.currentDungeonId;
    if (dungeonId) {
      const dungeon = this.dungeons.find(d => d.id === dungeonId);
      const progress = gameState.player.dungeonsProgress[dungeonId];
      
      if (dungeon && progress) {
        if (progress.attempts && progress.attempts.length > 0) {
          const lastAttempt = progress.attempts[progress.attempts.length - 1];
          if (lastAttempt.completed) {
            Logger.log(`✨ Подземелье ${dungeon.name} успешно пройдено! Очки: ${lastAttempt.score}`);
          } else {
            Logger.log(`⚠️ Подземелье ${dungeon.name} не пройдено. Попробуй еще раз!`);
          }
        }
      }
    }
  }

  /**
   * Показывает модальное окно с наградами за завершение подземелья
   */
  static showDungeonCompletionRewards(rewards, dungeon) {
    let modal = document.getElementById('dungeonRewardsModal');
    if (!modal) {
      // Создаем модальное окно если его нет
      const newModal = document.createElement('div');
      newModal.id = 'dungeonRewardsModal';
      newModal.className = 'modal modal--reward';
      newModal.innerHTML = `
        <div class="modal__overlay"></div>
        <div class="modal__content modal__content--reward">
          <div class="modal__header modal__header--victory">
            <h2>Подземелье завершено!</h2>
            <p class="modal__subtitle">${dungeon.name}</p>
          </div>
          <div class="modal__body">
            <div class="rewards-container">
              ${rewards.gold > 0 ? `<div class="reward-item reward-gold">💰 Золото: +${rewards.gold}</div>` : ''}
              ${rewards.experience > 0 ? `<div class="reward-item reward-xp">⭐ Опыт: +${rewards.experience}</div>` : ''}
              ${rewards.items.length > 0 ? `
                <div class="reward-items">
                  <h4>Предметы:</h4>
                  ${rewards.items.map(item => `
                    <div class="reward-item reward-item-drop" data-rarity="${item.rarity}">
                      ${item.icon} ${item.name}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
          <div class="modal__footer">
            <button class="btn btn-primary" id="closeRewardsBtn">Продолжить</button>
          </div>
        </div>
      `;
      document.body.appendChild(newModal);
      modal = newModal;
    }
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Обновляем содержимое
    const content = modal.querySelector('.modal__content');
    content.innerHTML = `
      <div class="modal__header modal__header--victory">
        <h2>Подземелье завершено!</h2>
        <p class="modal__subtitle">${dungeon.name}</p>
      </div>
      <div class="modal__body">
        <div class="rewards-container">
          ${rewards.gold > 0 ? `<div class="reward-item reward-gold">💰 Золото: +${rewards.gold}</div>` : ''}
          ${rewards.experience > 0 ? `<div class="reward-item reward-xp">⭐ Опыт: +${rewards.experience}</div>` : ''}
          ${rewards.items.length > 0 ? `
            <div class="reward-items">
              <h4>Предметы:</h4>
              ${rewards.items.map(item => `
                <div class="reward-item reward-item-drop" data-rarity="${item.rarity}">
                  ${item.icon} ${item.name}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
      <div class="modal__footer">
        <button class="btn btn-primary" id="closeRewardsBtn">Продолжить</button>
      </div>
    `;
    
    // Обработчик закрытия
    const closeBtn = document.getElementById('closeRewardsBtn');
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      gameState.dungeonState = null;
      this.returnToDungeons();
    };
  }
}


// Экспортируем для глобального доступа
window.DungeonsManager = DungeonsManager;

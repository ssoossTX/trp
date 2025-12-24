/**
 * DungeonsManager - управление системой подземелий
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { dataLoader } from '../data/DataLoader.js';
import { Logger } from '../utils/helpers.js';

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

    // Прикрепляем обработчики к карточкам и кнопкам
    filtered.forEach(dungeon => {
      const card = DOMManager.getElementById(`dungeon-card-${dungeon.id}`);
      const enterBtn = DOMManager.getElementById(`btn-enter-${dungeon.id}`);

      if (card) {
        card.addEventListener('click', () => this.showDungeonDetails(dungeon.id));
      }

      if (enterBtn) {
        enterBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.startDungeon(dungeon.id);
        });
      }
    });
  }

  /**
   * Создает HTML карточку подземелья
   */
  static createDungeonCard(dungeon) {
    const progress = gameState.player.dungeonsProgress[dungeon.id] || {};
    const isAvailable = gameState.player.level >= dungeon.requiredLevel;
    const statusClass = progress.completed ? 'status-completed' : progress.started ? 'status-in-progress' : 'status-not-started';
    const statusText = progress.completed ? `✓ Пройдено` : progress.started ? `⏱ В процессе` : `○ Не начато`;

    return `
      <div class="dungeon-card" id="dungeon-card-${dungeon.id}">
        <div class="dungeon-card-header" style="background: linear-gradient(135deg, ${dungeon.difficultyColor} 0%, #2c3e50 100%);">
          <h3 class="dungeon-card-title">${dungeon.name}</h3>
          <div class="difficulty-badge">${dungeon.difficulty}</div>
        </div>
        <div class="dungeon-card-body">
          <p class="dungeon-description">${dungeon.description}</p>
          
          <div class="dungeon-requirements">
            <div class="requirement">
              <span class="requirement-icon">📊</span>
              <span>Уровень: ${dungeon.requiredLevel}</span>
            </div>
            <div class="requirement">
              <span class="requirement-icon">⏱</span>
              <span>${dungeon.duration}</span>
            </div>
          </div>

          <div class="dungeon-rewards">
            ${dungeon.rewards.map(reward => {
              if (reward.type === 'gold') {
                return `<div class="reward-item">💰 ${reward.value} з.</div>`;
              } else if (reward.type === 'item') {
                return `<div class="reward-item">⚔️ ${reward.name}</div>`;
              } else if (reward.type === 'experience') {
                return `<div class="reward-item">⭐ ${reward.value} опыта</div>`;
              }
            }).join('')}
          </div>

          <div class="dungeon-status ${statusClass}">${statusText}</div>
        </div>
        <div class="dungeon-card-footer">
          <button class="btn-enter ${!isAvailable ? 'disabled' : ''}" id="btn-enter-${dungeon.id}" ${!isAvailable ? 'disabled' : ''}>
            ${isAvailable ? '⚔️ Войти' : `🔒 Уровень ${dungeon.requiredLevel}`}
          </button>
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

    detailsContainer.innerHTML = `
      <div class="dungeon-details-content">
        <div class="dungeon-details-header" style="background: linear-gradient(135deg, ${dungeon.difficultyColor} 0%, #2c3e50 100%);">
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
      returnPoint: {
        location: gameState.currentTab,
        playerState: JSON.parse(JSON.stringify(gameState.player))
      }
    };

    Logger.log(`🗺️ Начало подземелья: ${dungeon.name}`);
    
    // Закрываем детали и список
    this.closeDungeonDetails();
    
    // TODO: Переход в режим подземелья (боевая система или исследование)
    alert(`Начало подземелья: ${dungeon.name}\n\nЭта система будет интегрирована с боевой системой.`);
  }

  /**
   * Завершает подземелье
   */
  static completeDungeon(dungeonId, success, score = 0) {
    const dungeon = this.dungeons.find(d => d.id === dungeonId);
    if (!dungeon) return;

    const progress = gameState.player.dungeonsProgress[dungeonId];
    if (!progress) return;

    // Записываем попытку
    if (!progress.attempts) {
      progress.attempts = [];
    }

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

      // Добавляем награды
      dungeon.rewards.forEach(reward => {
        const chance = Math.random();
        if (chance <= reward.chance) {
          if (reward.type === 'gold') {
            gameState.addGold(reward.value);
          } else if (reward.type === 'experience') {
            gameState.addExperience(reward.value);
          }
          // TODO: Обработка предметов в инвентарь
        }
      });

      Logger.log(`✓ Подземелье ${dungeon.name} пройдено!`);
    }

    // Возвращаемся в основную игру если сохранено состояние
    if (gameState.dungeonState && gameState.dungeonState.returnPoint) {
      // TODO: Восстановить состояние игры
    }
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
}

// Экспортируем для глобального доступа
window.DungeonsManager = DungeonsManager;

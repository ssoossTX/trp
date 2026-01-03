/**
 * QuestsManager - управление системой квестов
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { dataLoader } from '../data/DataLoader.js';
import { Logger } from '../utils/helpers.js';
import { UIManager } from '../ui/UIManager.js';

export class QuestsManager {
  static quests = [];
  static questsCompleted = {};

  /**
   * Инициализирует систему квестов
   */
  static async init() {
    console.log('[QuestsManager] Инициализация системы квестов');
    
    // Загружаем данные квестов
    this.quests = await dataLoader.loadQuests();
    Logger.log(`Загружено квестов: ${this.quests.length}`);
    this.quests.forEach(q => Logger.log(`  - ${q.id}: ${q.title} (требует: ${q.requiredDungeonId})`));
    
    // Инициализируем прогресс квестов в состоянии игрока если его нет
    if (!gameState.player.questsProgress) {
      gameState.player.questsProgress = {};
      this.quests.forEach(quest => {
        gameState.player.questsProgress[quest.id] = {
          completed: false,
          rewardClaimed: false,
          completedDate: null
        };
      });
    }
    
    Logger.log('✅ Система квестов инициализирована');
  }

  /**
   * Получает список всех квестов
   */
  static getQuests() {
    return this.quests.sort((a, b) => a.order - b.order);
  }

  /**
   * Получает квест по ID
   */
  static getQuestById(questId) {
    return this.quests.find(q => q.id === questId);
  }

  /**
   * Получает статус квеста
   */
  static getQuestStatus(questId) {
    return gameState.player.questsProgress[questId] || {
      completed: false,
      rewardClaimed: false,
      completedDate: null
    };
  }

  /**
   * Проверяет и выполняет условия квестов
   */
  static checkQuestConditions() {
    Logger.log('🔍 Проверка условий квестов...');
    this.quests.forEach(quest => {
      const status = this.getQuestStatus(quest.id);
      Logger.log(`  Квест ${quest.id}: completed=${status.completed}`);
      
      // Если квест уже выполнен, не проверяем
      if (status.completed) return;

      let isCompleted = false;

      // Проверяем различные типы квестов
      if (quest.type === 'dungeon') {
        const dungeonProgress = gameState.player.dungeonsProgress[quest.requiredDungeonId];
        Logger.log(`    Требуемое подземелье: ${quest.requiredDungeonId}, progress:`, dungeonProgress);
        if (dungeonProgress && dungeonProgress.completed) {
          isCompleted = true;
        }
      }

      // Если квест выполнен, обновляем статус
      if (isCompleted) {
        Logger.log(`✅ Условие выполнено для квеста: ${quest.id}`);
        this.completeQuest(quest.id);
      }
    });
  }

  /**
   * Завершает квест
   */
  static completeQuest(questId) {
    const quest = this.getQuestById(questId);
    if (!quest) return;

    const status = this.getQuestStatus(questId);
    if (status.completed) return;

    status.completed = true;
    status.completedDate = new Date().toISOString();
    
    Logger.log(`✅ Квест выполнен: ${quest.title}`);
    
    // Показываем уведомление о выполнении квеста
    this.showQuestCompletionNotification(quest);
    
    // Обновляем интерфейс квестов
    this.renderQuestsList();
  }

  /**
   * Показывает всплывающее уведомление о выполнении квеста
   */
  static showQuestCompletionNotification(quest) {
    const notification = document.createElement('div');
    notification.className = 'quest-notification quest-notification--complete';
    notification.innerHTML = `
      <div class="quest-notification__content">
        <div class="quest-notification__header">
          <span class="quest-notification__icon">✨</span>
          <h3>Квест выполнен!</h3>
        </div>
        <div class="quest-notification__quest">
          <p class="quest-notification__title">${quest.title}</p>
        </div>
        <div class="quest-notification__rewards">
          ${quest.rewards.experience > 0 ? `<span class="reward-badge reward-badge--xp">⭐ +${quest.rewards.experience} опыта</span>` : ''}
          ${quest.rewards.gold > 0 ? `<span class="reward-badge reward-badge--gold">💰 +${quest.rewards.gold} золота</span>` : ''}
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
      notification.classList.add('quest-notification--show');
    }, 10);
    
    // Автоматическое удаление через 4 секунды
    setTimeout(() => {
      notification.classList.remove('quest-notification--show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 4000);
  }

  /**
   * Собирает награду за квест
   */
  static claimQuestReward(questId) {
    const quest = this.getQuestById(questId);
    if (!quest) return;

    const status = this.getQuestStatus(questId);
    if (!status.completed || status.rewardClaimed) return;

    // Добавляем награды
    if (quest.rewards.experience > 0) {
      gameState.addExperience(quest.rewards.experience);
    }
    if (quest.rewards.gold > 0) {
      gameState.addGold(quest.rewards.gold);
    }

    status.rewardClaimed = true;
    Logger.log(`💰 Награда за квест собрана: ${quest.title}`);
    
    // Обновляем интерфейс
    this.renderQuestsList();
    
    // Обновляем профиль в шапке
    UIManager.updatePlayerProfile();
  }

  /**
   * Отрисовывает список квестов
   */
  static renderQuestsList() {
    const container = DOMManager.getElementById('questsList');
    if (!container) return;

    const quests = this.getQuests();
    
    container.innerHTML = quests.map(quest => {
      const status = this.getQuestStatus(quest.id);
      return this.createQuestCard(quest, status);
    }).join('');

    // Прикрепляем обработчики клика на карточку
    quests.forEach(quest => {
      const card = DOMManager.getElementById(`questCard-${quest.id}`);
      console.log(`[QuestsManager] Поиск карточки для квеста ${quest.id}:`, card);
      if (card) {
        card.addEventListener('click', () => {
          console.log(`[QuestsManager] Клик по квесту: ${quest.title}`);
          this.showQuestModal(quest);
        });
      }
    });
  }

  /**
   * Создает карточку квеста
   */
  static createQuestCard(quest, status) {
    const isCompleted = status.completed;
    const isRewardClaimed = status.rewardClaimed;
    
    return `
      <div class="quest-card quest-card--${isRewardClaimed ? 'completed' : isCompleted ? 'ready' : 'active'}" data-quest-id="${quest.id}" id="questCard-${quest.id}">
        <div class="quest-card__header">
          <span class="quest-card__icon">${quest.icon}</span>
          <div class="quest-card__title-group">
            <h3 class="quest-card__title">${quest.title}</h3>
            <span class="quest-card__difficulty quest-card__difficulty--${quest.difficulty}">${this.getDifficultyLabel(quest.difficulty)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Получает название сложности на русском
   */
  static getDifficultyLabel(difficulty) {
    const labels = {
      'easy': 'Легко',
      'medium': 'Средне',
      'hard': 'Сложно',
      'nightmare': 'Кошмар'
    };
    return labels[difficulty] || difficulty;
  }

  /**
   * Открывает модальное окно квеста
   */
  static showQuestModal(quest) {
    console.log(`[QuestsManager] Открываю модальное окно для квеста: ${quest.title}`);
    
    const status = this.getQuestStatus(quest.id);
    const isCompleted = status.completed;
    const isRewardClaimed = status.rewardClaimed;

    const modal = DOMManager.getElementById('questModal');
    console.log('[QuestsManager] Поиск элемента questModal:', modal);
    if (!modal) {
      console.error('[QuestsManager] Элемент questModal не найден!');
      return;
    }

    let statusHtml = '';
    if (isRewardClaimed) {
      statusHtml = '<div class="quest-modal__badge quest-modal__badge--claimed">✅ Награда получена</div>';
    } else if (isCompleted) {
      statusHtml = '<div class="quest-modal__badge quest-modal__badge--ready">🎉 Готово к сбору</div>';
    } else {
      statusHtml = '<div class="quest-modal__badge quest-modal__badge--active">⏳ В процессе</div>';
    }

    let buttonHtml = '';
    if (isRewardClaimed) {
      buttonHtml = '<button class="btn btn-secondary" disabled>Награда получена</button>';
    } else if (isCompleted) {
      buttonHtml = `<button class="btn btn-primary" id="claimQuestBtn-modal-${quest.id}">Собрать награду</button>`;
    } else {
      buttonHtml = '<button class="btn btn-secondary" disabled>В процессе</button>';
    }

    modal.innerHTML = `
      <div class="modal__overlay" id="questModalOverlay"></div>
      <div class="modal__content quest-modal__content">
        <button type="button" class="modal__close" id="questModalCloseBtn">✕</button>
        
        <div class="quest-modal__header">
          <span class="quest-modal__icon">${quest.icon}</span>
          <h2 class="quest-modal__title">${quest.title}</h2>
          <span class="quest-modal__difficulty quest-modal__difficulty--${quest.difficulty}">${this.getDifficultyLabel(quest.difficulty)}</span>
        </div>

        <div class="quest-modal__body">
          <p class="quest-modal__description">${quest.description}</p>

          <div class="quest-modal__status">
            ${statusHtml}
          </div>

          <div class="quest-modal__rewards">
            <h3>Награды:</h3>
            <div class="quest-modal__rewards-list">
              ${quest.rewards.experience > 0 ? `<div class="quest-reward quest-reward--xp">⭐ ${quest.rewards.experience} опыта</div>` : ''}
              ${quest.rewards.gold > 0 ? `<div class="quest-reward quest-reward--gold">💰 ${quest.rewards.gold} золота</div>` : ''}
            </div>
          </div>
        </div>

        <div class="quest-modal__footer">
          ${buttonHtml}
          <button class="btn btn-secondary" id="questModalCloseBtn2">Закрыть</button>
        </div>
      </div>
    `;

    console.log('[QuestsManager] HTML установлен в модальное окно');

    // Показываем модальное окно
    modal.classList.remove('hidden');
    console.log('[QuestsManager] Класс hidden удалён. Модальное окно должно быть видно');

    // Закрытие модального окна
    const closeBtn = DOMManager.getElementById('questModalCloseBtn');
    const closeBtn2 = DOMManager.getElementById('questModalCloseBtn2');
    const overlay = DOMManager.getElementById('questModalOverlay');
    
    const closeModal = () => {
      console.log('[QuestsManager] Закрываю модальное окно');
      modal.classList.add('hidden');
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (closeBtn2) closeBtn2.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);

    // Кнопка сбора награды
    const claimBtn = DOMManager.getElementById(`claimQuestBtn-modal-${quest.id}`);
    if (claimBtn) {
      claimBtn.addEventListener('click', () => {
        console.log('[QuestsManager] Собираю награду');
        this.claimQuestReward(quest.id);
        closeModal();
        this.renderQuestsList();
      });
    }
  }
}

// Экспортируем для глобального доступа
window.QuestsManager = QuestsManager;

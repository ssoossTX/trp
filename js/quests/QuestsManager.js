/**
 * QuestsManager - управление системой квестов
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { dataLoader } from '../data/DataLoader.js';
import { Logger } from '../utils/helpers.js';

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

    // Прикрепляем обработчики
    quests.forEach(quest => {
      const claimBtn = DOMManager.getElementById(`claimQuestBtn-${quest.id}`);
      if (claimBtn) {
        claimBtn.addEventListener('click', () => {
          this.claimQuestReward(quest.id);
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
      <div class="quest-card quest-card--${isRewardClaimed ? 'completed' : isCompleted ? 'ready' : 'active'}" data-quest-id="${quest.id}">
        <div class="quest-card__header">
          <span class="quest-card__icon">${quest.icon}</span>
          <div class="quest-card__title-group">
            <h3 class="quest-card__title">${quest.title}</h3>
            <span class="quest-card__difficulty quest-card__difficulty--${quest.difficulty}">${this.getDifficultyLabel(quest.difficulty)}</span>
          </div>
        </div>
        
        <p class="quest-card__description">${quest.description}</p>
        
        <div class="quest-card__status">
          ${isRewardClaimed ? `
            <div class="quest-card__badge quest-card__badge--claimed">✅ Награда получена</div>
          ` : isCompleted ? `
            <div class="quest-card__badge quest-card__badge--ready">🎉 Готово к сбору</div>
          ` : `
            <div class="quest-card__badge quest-card__badge--active">⏳ В процессе</div>
          `}
        </div>
        
        <div class="quest-card__rewards">
          ${quest.rewards.experience > 0 ? `<div class="quest-reward quest-reward--xp">⭐ ${quest.rewards.experience} опыта</div>` : ''}
          ${quest.rewards.gold > 0 ? `<div class="quest-reward quest-reward--gold">💰 ${quest.rewards.gold} золота</div>` : ''}
        </div>
        
        ${isRewardClaimed ? `
          <button class="btn btn-secondary" disabled>Награда получена</button>
        ` : isCompleted ? `
          <button class="btn btn-primary" id="claimQuestBtn-${quest.id}">Собрать награду</button>
        ` : `
          <button class="btn btn-secondary" disabled>В процессе</button>
        `}
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
}

// Экспортируем для глобального доступа
window.QuestsManager = QuestsManager;

/**
 * StatsUI - управление интерфейсом прокачки характеристик
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { Logger } from '../utils/helpers.js';
import { UIManager } from './UIManager.js';

export class StatsUI {
  /**
   * Инициализирует интерфейс прокачки характеристик
   */
  static init() {
    this.attachEventListeners();
    this.updateStatsDisplay();
  }

  /**
   * Прикрепляет обработчики событий к кнопкам прокачки
   */
  static attachEventListeners() {
    const buttons = DOMManager.querySelectorAll('.btn-stat-add');
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        const statName = e.target.getAttribute('data-stat');
        this.handleStatIncrease(statName);
      });
    });
  }

  /**
   * Обрабатывает клик по кнопке увеличения характеристики
   * @param {string} statName - Название характеристики
   */
  static handleStatIncrease(statName) {
    const success = gameState.increaseStat(statName);
    
    if (success) {
      // Обновляем отображение
      this.updateStatsDisplay();
      
      // Если прокачана выносливость, обновляем HP в шапке
      if (statName === 'endurance') {
        UIManager.updateResources();
      }
      
      // Анимация успеха
      const valueElement = DOMManager.getElementById(`stat-${statName}-value`);
      if (valueElement) {
        valueElement.classList.add('boosted');
        setTimeout(() => valueElement.classList.remove('boosted'), 600);
      }
    } else {
      // Анимация ошибки
      const button = document.querySelector(`[data-stat="${statName}"]`);
      if (button) {
        button.classList.add('error');
        setTimeout(() => button.classList.remove('error'), 400);
        
        // Показываем уведомление
        this.showNotification('Недостаточно очков способностей!');
      }
    }
  }

  /**
   * Обновляет отображение всех характеристик и доступных очков
   */
  static updateStatsDisplay() {
    const player = gameState.getPlayerState();
    
    // Обновляем значения характеристик
    const stats = ['strength', 'agility', 'intelligence', 'endurance'];
    const MAX_STAT = 100;
    
    stats.forEach(stat => {
      const value = player.stats[stat] || 0;
      const element = DOMManager.getElementById(`stat-${stat}-value`);
      const row = document.querySelector(`.stat-row:has([data-stat="${stat}"])`);
      const button = document.querySelector(`[data-stat="${stat}"]`);
      
      if (element) {
        element.textContent = value;
      }
      
      // Обновляем состояние кнопки
      if (button) {
        const isMaxed = value >= MAX_STAT;
        const noPoints = player.abilityPoints <= 0;
        
        if (isMaxed) {
          button.disabled = true;
          button.title = `Максимальное значение достигнуто`;
          button.setAttribute('aria-label', `${stat}: максимум`);
          if (row) row.classList.add('maxed');
        } else if (noPoints) {
          button.disabled = true;
          button.setAttribute('aria-label', `${stat}: недостаточно очков`);
        } else {
          button.disabled = false;
          button.title = `Увеличить ${stat}`;
          button.setAttribute('aria-label', `Увеличить ${stat}`);
          if (row) row.classList.remove('maxed');
        }
      }
    });
    
    // Обновляем количество оставшихся очков
    const pointsElement = DOMManager.getElementById('ability-points-left');
    if (pointsElement) {
      pointsElement.textContent = player.abilityPoints;
    }
    
    // Обновляем класс контейнера для стилизации
    const container = DOMManager.getElementById('statsUpgradeContainer');
    if (container) {
      if (player.abilityPoints <= 0) {
        container.classList.add('no-points');
      } else {
        container.classList.remove('no-points');
      }
    }
    
    Logger.log(`[StatsUI] Характеристики обновлены. Очков: ${player.abilityPoints}`);
  }

  /**
   * Показывает всплывающее уведомление
   * @param {string} message - Текст уведомления
   */
  static showNotification(message) {
    // Создаём уведомление
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ff6b6b, #c92a2a);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      font-weight: 600;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Удаляем через 2 секунды
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }
}

// Добавляем стили для анимации уведомления
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

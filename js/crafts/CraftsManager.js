/**
 * CraftsManager - управление системой крафтов
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { dataLoader } from '../data/DataLoader.js';
import { Logger } from '../utils/helpers.js';

export class CraftsManager {
  static crafts = [];

  /**
   * Инициализирует систему крафтов
   */
  static async init() {
    console.log('[CraftsManager] Инициализация системы крафтов');
    
    // Загружаем данные крафтов
    this.crafts = await dataLoader.loadCrafts();
    Logger.log(`Загружено крафтов: ${this.crafts.length}`);
    
    Logger.log('✅ Система крафтов инициализирована');
  }

  /**
   * Получает список всех крафтов
   */
  static getCrafts() {
    return this.crafts.sort((a, b) => a.order - b.order);
  }

  /**
   * Получает крафт по ID
   */
  static getCraftById(craftId) {
    return this.crafts.find(c => c.id === craftId);
  }

  /**
   * Проверяет, может ли игрок создать предмет
   */
  static canCraft(craft) {
    // Проверяем золото
    if (gameState.player.gold < craft.cost.gold) {
      return false;
    }

    // Проверяем ингредиенты
    for (const ingredient of craft.ingredients) {
      const count = this.countItemInInventory(ingredient.name);
      if (count < ingredient.quantity) {
        return false;
      }
    }

    return true;
  }

  /**
   * Подсчитывает количество предмета в инвентаре
   */
  static countItemInInventory(itemName) {
    if (!gameState.player.inventory) return 0;
    return gameState.player.inventory.filter(item => item.name === itemName).length;
  }

  /**
   * Создает предмет через крафт
   */
  static craft(craftId) {
    const craft = this.getCraftById(craftId);
    if (!craft) return false;

    // Проверяем возможность крафта
    if (!this.canCraft(craft)) {
      Logger.warn('❌ Невозможно создать предмет - недостаточно ресурсов');
      return false;
    }

    // Забираем ингредиенты
    for (const ingredient of craft.ingredients) {
      for (let i = 0; i < ingredient.quantity; i++) {
        const index = gameState.player.inventory.findIndex(item => item.name === ingredient.name);
        if (index !== -1) {
          gameState.player.inventory.splice(index, 1);
        }
      }
    }

    // Забираем золото
    gameState.player.gold -= craft.cost.gold;

    // Добавляем результат
    for (let i = 0; i < craft.output.quantity; i++) {
      gameState.player.inventory.push({
        ...craft.output
      });
    }

    Logger.log(`✅ Крафт выполнен: ${craft.name}`);
    this.showCraftCompleteNotification(craft);
    
    return true;
  }

  /**
   * Показывает уведомление о завершении крафта
   */
  static showCraftCompleteNotification(craft) {
    const notification = document.createElement('div');
    notification.className = 'craft-notification craft-notification--complete';
    notification.innerHTML = `
      <div class="craft-notification__content">
        <div class="craft-notification__header">
          <span class="craft-notification__icon">✨</span>
          <h3>Крафт завершен!</h3>
        </div>
        <div class="craft-notification__item">
          <span class="craft-notification__item-icon">${craft.output.icon}</span>
          <p class="craft-notification__item-name">${craft.output.name}</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
      notification.classList.add('craft-notification--show');
    }, 10);
    
    // Автоматическое удаление через 3 секунды
    setTimeout(() => {
      notification.classList.remove('craft-notification--show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  /**
   * Отрисовывает список крафтов
   */
  static renderCraftsList() {
    const container = DOMManager.getElementById('craftsList');
    if (!container) return;

    const crafts = this.getCrafts();
    
    container.innerHTML = crafts.map(craft => {
      const canCraft = this.canCraft(craft);
      return this.createCraftCard(craft, canCraft);
    }).join('');

    // Прикрепляем обработчики
    crafts.forEach(craft => {
      const craftBtn = DOMManager.getElementById(`craftBtn-${craft.id}`);
      if (craftBtn) {
        craftBtn.addEventListener('click', () => {
          if (this.craft(craft.id)) {
            // Обновляем UI после крафта
            this.renderCraftsList();
          } else {
            alert('Недостаточно ресурсов для крафта!');
          }
        });
      }
    });
  }

  /**
   * Создает карточку крафта
   */
  static createCraftCard(craft, canCraft) {
    const ingredientsHtml = craft.ingredients.map(ing => `
      <div class="craft-ingredient">
        <span class="craft-ingredient__icon">${ing.icon}</span>
        <span class="craft-ingredient__name">${ing.name}</span>
        <span class="craft-ingredient__quantity">
          ${this.countItemInInventory(ing.name)}/${ing.quantity}
        </span>
      </div>
    `).join('');

    return `
      <div class="craft-card" data-craft-id="${craft.id}">
        <div class="craft-card__header">
          <h3 class="craft-card__title">${craft.name}</h3>
        </div>

        <div class="craft-card__content">
          <div class="craft-card__ingredients">
            <div class="craft-card__section-label">Ингредиенты:</div>
            ${ingredientsHtml}
          </div>

          <div class="craft-card__arrow">→</div>

          <div class="craft-card__output">
            <div class="craft-card__output-item">
              <span class="craft-card__output-icon">${craft.output.icon}</span>
              <div class="craft-card__output-info">
                <div class="craft-card__output-name">${craft.output.name}</div>
                <div class="craft-card__output-quantity">x${craft.output.quantity}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="craft-card__cost">
          <span class="craft-cost__gold">💰 ${craft.cost.gold}</span>
        </div>

        <button 
          class="btn ${canCraft ? 'btn-primary' : 'btn-secondary'}" 
          id="craftBtn-${craft.id}"
          ${!canCraft ? 'disabled' : ''}
        >
          ${canCraft ? 'Создать' : 'Невозможно'}
        </button>
      </div>
    `;
  }
}

// Экспортируем для глобального доступа
window.CraftsManager = CraftsManager;

/**
 * InventoryManager - управление инвентарем с стакированием и информацией
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { ImageCache } from '../utils/ImageCache.js';

export class InventoryManager {
  /**
   * Группирует одинаковые предметы в стаки
   */
  static groupItems(inventory) {
    const grouped = {};

    inventory.forEach(item => {
      const key = `${item.name}|${item.rarity || 'common'}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          ...item,
          quantity: 0,
          itemKey: key
        };
      }
      
      grouped[key].quantity += 1;
    });

    return Object.values(grouped);
  }

  /**
   * Отрисовывает инвентарь со стакированием
   */
  static renderInventory(inventory) {
    const container = DOMManager.getElementById('inventoryContainer');
    const emptyMessage = DOMManager.getElementById('inventoryEmpty');
    
    if (!container) return;

    if (!inventory || inventory.length === 0) {
      container.innerHTML = '';
      container.classList.add('hidden');
      emptyMessage.classList.remove('hidden');
      return;
    }

    emptyMessage.classList.add('hidden');
    container.classList.remove('hidden');

    // Группируем одинаковые предметы
    const groupedItems = this.groupItems(inventory);
{
      const imagePath = item.image ? (ImageCache.getImageUrl(item.image) || `/trp/assets/img/${item.image}`) : '';
      return `
      <div class="inventory-item inventory-item--${item.rarity || 'common'}" 
           data-item-name="${item.name}" 
           data-item-rarity="${item.rarity || 'common'}"
           style="cursor: pointer;">
        <div class="inventory-item__icon">
          ${item.image ? `<img src="${imagePath}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px; background: rgba(0,0,0,0.1); padding: 4px;">` : item.icon}
        </div>
        <div class="inventory-item__name">${item.name}</div>
        <div class="inventory-item__rarity">${this.rarityName(item.rarity || 'common')}</div>
        ${item.quantity > 1 ? `<div class="inventory-item__quantity">x${item.quantity}</div>` : ''}
      </div>
    `;
    } </div>
    `).join('');

    // Прикрепляем обработчики клика
    groupedItems.forEach(item => {
      const elements = document.querySelectorAll(`[data-item-name="${item.name}"][data-item-rarity="${item.rarity || 'common'}"]`);
      elements.forEach(el => {
        el.addEventListener('click', () => {
          this.showItemInfo(item);
        });
      });
    });
  }

  /**
   * Получает название редкости
   */
  static rarityName(rarity) {
    const rarities = {
      'common': 'Обычный',
      'uncommon': 'Необычный',
      'rare': 'Редкий',
      'epic': 'Эпический',
      'legendary': 'Легендарный'
    };
    return rarities[rarity] || rarity;
  }

  /**
   * Показывает информацию о предмете в модальном окне
   */
  static showItemInfo(item) {
    let modal = document.getElementById('itemInfoModal');
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'itemInfoModal';
      modal.className = 'modal modal--item';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal__overlay"></div>
      <div class="modal__content modal__content--item">
        <button class="modal__close" id="itemInfoClose">&times;</button>
        
        <div class="item-info__header item-info__header--${item.rarity || 'common'}">
          <div class="item-info__icon">
            ${item.image ? `<img src="/trp/assets/img/${item.image}" alt="${item.name}">` : `<span style="font-size: 3rem;">${item.icon}</span>`}
          </div>
          <div class="item-info__title">
            <h2>${item.name}</h2>
            <span class="item-info__rarity item-info__rarity--${item.rarity || 'common'}">
              ${this.rarityName(item.rarity || 'common')}
            </span>
          </div>
        </div>

        <div class="item-info__body">
          <div class="item-info__section">
            <h3>Информация</h3>
            <div class="item-info__details">
              <div class="item-info__row">
                <span class="label">Количество:</span>
                <span class="value">x${item.quantity}</span>
              </div>
              ${item.type ? `
                <div class="item-info__row">
                  <span class="label">Тип:</span>
                  <span class="value">${item.type}</span>
                </div>
              ` : ''}
              ${item.description ? `
                <div class="item-info__row item-info__row--full">
                  <span class="label">Описание:</span>
                  <p class="value">${item.description}</p>
                </div>
              ` : ''}
              ${item.damage ? `
                <div class="item-info__row">
                  <span class="label">Урон:</span>
                  <span class="value item-info__stat--damage">+${item.damage}</span>
                </div>
              ` : ''}
              ${item.defense ? `
                <div class="item-info__row">
                  <span class="label">Защита:</span>
                  <span class="value item-info__stat--defense">+${item.defense}</span>
                </div>
              ` : ''}
              ${item.hp ? `
                <div class="item-info__row">
                  <span class="label">HP:</span>
                  <span class="value item-info__stat--hp">+${item.hp}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="modal__footer">
          <button class="btn btn-secondary" id="itemInfoClose2">Закрыть</button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    
    const closeBtn = document.getElementById('itemInfoClose');
    const closeBtn2 = document.getElementById('itemInfoClose2');
    const overlay = modal.querySelector('.modal__overlay');
    
    const close = () => {
      modal.style.display = 'none';
    };
    
    closeBtn?.addEventListener('click', close);
    closeBtn2?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
  }
}

// Экспортируем для глобального доступа
window.InventoryManager = InventoryManager;

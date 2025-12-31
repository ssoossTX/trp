/**
 * LocationsManager - управление локациями и исследованием
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { dataLoader } from '../data/DataLoader.js';
import { GAME_CONSTANTS } from '../utils/constants.js';

export class LocationsManager {
  /**
   * Инициализирует локации
   */
  static init() {
    this.renderLocations();
    this.initModalHandlers();
  }

  /**
   * Инициализирует обработчики модального окна
   */
  static initModalHandlers() {
    const modal = DOMManager.getElementById('locationModal');
    const closeBtn = DOMManager.getElementById('modalCloseBtn');
    const overlay = DOMManager.getElementById('modalOverlay');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeLocationModal());
    }

    if (overlay) {
      overlay.addEventListener('click', () => this.closeLocationModal());
    }

    if (modal) {
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeLocationModal();
        }
      });
    }
  }

  /**
   * Отрисовывает кнопки локаций
   */
  static renderLocations() {
    const locationsGrid = DOMManager.getElementById('locationsGrid');
    const locations = dataLoader.getLocations();

    const locationImages = {
      'city': '/trp/assets/img/город.jpg',
      'forest': '/trp/assets/img/лес.jpg',
      'mountains': '/trp/assets/img/горы.jpg'
    };

    locationsGrid.innerHTML = Object.entries(locations).map(([key, location]) => {
      const imagePath = locationImages[key] || location.icon;
      return `
        <button class="location-btn" onclick="window.LocationsManager.showLocationModal('${key}')">
          <div class="location-btn__icon"><img src="${imagePath}" alt="${location.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;"></div>
          <div class="location-btn__name">${location.name}</div>
        </button>
      `;
    }).join('');
  }

  /**
   * Показывает модальное окно с деталями локации
   */
  static showLocationModal(locationId) {
    const location = dataLoader.getLocationById(locationId);
    if (!location) {
      alert('Локация не найдена');
      return;
    }

    const dangerStars = '⭐'.repeat(location.dangerLevel);
    const modalBody = DOMManager.getElementById('modalBody');
    
    modalBody.innerHTML = `
      <div class="modal__header">
        <div class="modal__icon">${location.icon}</div>
        <h2 class="modal__title">${location.name}</h2>
      </div>

      <div class="modal__section">
        <p class="modal__section-content">${location.description}</p>
      </div>

      <div class="modal__stats">
        <div class="modal__stat">
          <div class="modal__stat-label">Опасность</div>
          <div class="modal__stat-value">${dangerStars}</div>
        </div>
        <div class="modal__stat">
          <div class="modal__stat-label">Требуемый уровень</div>
          <div class="modal__stat-value">${location.requiredLevel}+</div>
        </div>
        <div class="modal__stat">
          <div class="modal__stat-label">Редкий дроп</div>
          <div class="modal__stat-value">${location.rareLootChance}</div>
        </div>
      </div>

      <div class="modal__section">
        <div class="modal__section-title">Возможная добыча:</div>
        <div class="modal__section-content">
          ${location.loot.map(item => `<p>• ${item.name}</p>`).join('')}
        </div>
      </div>

      <div class="modal__buttons">
        <button class="modal__btn modal__btn-primary" onclick="window.LocationsManager.startExploration('${locationId}')">Исследовать</button>
        <button class="modal__btn modal__btn-secondary" onclick="window.LocationsManager.closeLocationModal()">Закрыть</button>
      </div>
    `;

    const modal = DOMManager.getElementById('locationModal');
    modal.classList.remove('hidden');
    modal.classList.add('visible');
  }

  /**
   * Закрывает модальное окно
   */
  static closeLocationModal() {
    const modal = DOMManager.getElementById('locationModal');
    modal.classList.remove('visible');
    modal.classList.add('hidden');
  }

  /**
   * Запускает исследование локации (генерирует локацию для боя)
   */
  static startExploration(locationId) {
    const location = dataLoader.getLocationById(locationId);
    if (!location || !location.enemies) {
      alert('Нет врагов в этой локации');
      return;
    }

    // Закрываем модальное окно
    this.closeLocationModal();

    // Импортируем locationUI для открытия боевой локации
    import('../locations/LocationUI.js').then(module => {
      const { locationUI } = module;
      
      // Открываем боевую локацию через locationUI
      locationUI.openBattleLocation(
        locationId,
        location.enemies,
        () => {
          // Callback при победе - возврат в меню
          this.onBattleVictory(location);
        },
        () => {
          // Callback при поражении - возврат в меню
          this.onBattleDefeat();
        },
        () => {
          // Callback при бегстве - возврат в меню
          this.onBattleFlee();
        }
      );
    }).catch(err => {
      console.error('Ошибка загрузки LocationUI:', err);
      alert('Ошибка при запуске исследования');
    });
  }

  /**
   * Обработчик победы в боевой локации
   */
  static onBattleVictory(location) {
    // Восстанавливаем ресурсы после боя
    gameState.restoreResources();
    
    // Закрываем экран локации и возвращаемся в меню
    const locationScreen = document.getElementById('location-screen');
    if (locationScreen) {
      locationScreen.classList.add('hidden');
      locationScreen.classList.remove('visible');
    }
    
    const menuScreen = document.getElementById('main-menu-screen');
    if (menuScreen) {
      menuScreen.classList.remove('hidden');
      menuScreen.classList.add('visible');
    }
  }

  /**
   * Обработчик поражения в боевой локации
   */
  static onBattleDefeat() {
    // Закрываем экран локации и возвращаемся в меню
    const locationScreen = document.getElementById('location-screen');
    if (locationScreen) {
      locationScreen.classList.add('hidden');
      locationScreen.classList.remove('visible');
    }
    
    const menuScreen = document.getElementById('main-menu-screen');
    if (menuScreen) {
      menuScreen.classList.remove('hidden');
      menuScreen.classList.add('visible');
    }
  }

  /**
   * Обработчик бегства в боевой локации
   */
  static onBattleFlee() {
    // Закрываем экран локации и возвращаемся в меню
    const locationScreen = document.getElementById('location-screen');
    if (locationScreen) {
      locationScreen.classList.add('hidden');
      locationScreen.classList.remove('visible');
    }
    
    const menuScreen = document.getElementById('main-menu-screen');
    if (menuScreen) {
      menuScreen.classList.remove('hidden');
      menuScreen.classList.add('visible');
    }
  }

  /**
   * Показывает детали добычи локации
   */
  static showLootDetails(locationId) {
    const location = dataLoader.getLocationById(locationId);
    if (!location) return;

    DOMManager.setText('lootModalTitle', location.name);

    const lootList = DOMManager.getElementById('lootList');
    lootList.innerHTML = location.loot.map(item => `
      <li class="loot-modal__item">
        <div class="loot-modal__item-name">${item.name}</div>
        <div class="loot-modal__item-chance">Шанс: ${item.chance}</div>
      </li>
    `).join('');

    DOMManager.openModal(GAME_CONSTANTS.MODALS.LOOT);
  }
}

// Экспортируем для глобального доступа из HTML
window.LocationsManager = LocationsManager;

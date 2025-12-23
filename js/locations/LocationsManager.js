/**
 * LocationsManager - управление локациями и исследованием
 */
import { DOMManager } from '../core/DOMManager.js';
import { gameState } from '../core/GameState.js';
import { dataLoader } from '../data/DataLoader.js';
import { BattleEngine } from '../battle/BattleEngine.js';
import { BattleUI } from '../battle/BattleUI.js';
import { getRandomElement } from '../utils/helpers.js';
import { GAME_CONSTANTS } from '../utils/constants.js';

export class LocationsManager {
  /**
   * Инициализирует локации
   */
  static init() {
    this.renderLocations();
  }

  /**
   * Отрисовывает карточки локаций
   */
  static renderLocations() {
    const locationsGrid = DOMManager.getElementById('locationsGrid');
    const locations = dataLoader.getLocations();

    locationsGrid.innerHTML = Object.entries(locations).map(([key, location]) => {
      const dangerStars = '⭐'.repeat(location.dangerLevel);
      return `
        <div class="card location-card">
          <div class="location-card__icon">${location.icon}</div>
          <h3>${location.name}</h3>
          <p class="location-card__description">${location.description}</p>
          
          <div class="location-card__info">
            <p><span class="danger-level">Опасность:</span> <span class="stars">${dangerStars}</span></p>
            <p><span class="rare-loot">Редкий дроп:</span> ${location.rareLootChance}</p>
            <p><span class="required-level">Уровень:</span> ${location.requiredLevel}+</p>
          </div>

          <div class="location-card__loot-list">
            <strong>Возможная добыча:</strong>
            ${location.loot.slice(0, 3).map(item => `<p>• ${item.name}</p>`).join('')}
          </div>

          <div class="location-card__buttons">
            <button class="btn btn-primary explore-btn" onclick="window.LocationsManager.startExploration('${key}')">Исследовать</button>
            <button class="btn btn-info loot-btn" onclick="window.LocationsManager.showLootDetails('${key}')">Добыча</button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Запускает исследование локации
   */
  static startExploration(locationId) {
    const location = dataLoader.getLocationById(locationId);
    if (!location || !location.enemies) {
      alert('Нет врагов в этой локации');
      return;
    }

    // Восстанавливаем ресурсы при входе на локацию
    gameState.restoreResources();

    const randomEnemy = getRandomElement(location.enemies);
    
    // Получаем активные способности класса
    const playerClass = gameState.player.class;
    const classData = dataLoader.getClassByName(playerClass);
    const activeAbilities = classData && classData.activeAbilities ? classData.activeAbilities : [];
    
    BattleEngine.initiateBattle(randomEnemy, locationId, activeAbilities);
    
    // Показываем экран боя
    BattleUI.show();
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

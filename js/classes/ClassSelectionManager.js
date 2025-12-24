/**
 * ClassSelectionManager - управление выбором класса
 */
import { DOMManager } from '../core/DOMManager.js';
import { eventManager } from '../core/EventManager.js';
import { gameState } from '../core/GameState.js';
import { dataLoader } from '../data/DataLoader.js';
import { shuffleArray } from '../utils/helpers.js';
import { GAME_CONSTANTS, APP_EVENTS } from '../utils/constants.js';

let selectedClass = null;
let selectedAbility = null;

export class ClassSelectionManager {
  /**
   * Инициализирует управление выбором класса
   */
  static async init() {
    this.renderClasses();
    this.attachEventListeners();
  }

  /**
   * Получает путь к картинке класса
   */
  static getClassImagePath(className) {
    // Преобразуем имя класса в название файла
    const fileName = className.toLowerCase().replace(' ', '_');
    return `/trp/assets/img/enemies/${fileName}.jpg`;
  }

  /**
   * Отрисовывает карточки классов (картинки)
   */
  static renderClasses() {
    const classesGrid = DOMManager.getElementById('classesGrid');
    const classes = dataLoader.getClasses();

    classesGrid.innerHTML = classes.map(classData => `
      <div class="class-card" onclick="window.classSelectionManager.openClassDetails('${classData.id}')">
        <img src="${this.getClassImagePath(classData.name)}" alt="${classData.name}" class="class-card__image" onerror="this.src='/trp/assets/img/background.jpg'">
        <div class="class-card__overlay">
          <h3 class="class-card__title">${classData.icon} ${classData.name}</h3>
        </div>
      </div>
    `).join('');
  }

  /**
   * Открывает экран с деталями класса
   */
  static openClassDetails(classId) {
    selectedClass = dataLoader.getClassById(classId);
    if (!selectedClass) return;

    const detailsContent = DOMManager.getElementById('classDetailsContent');
    
    detailsContent.innerHTML = `
      <div class="class-details__content">
        <div class="class-details__header">
          <img src="${this.getClassImagePath(selectedClass.name)}" alt="${selectedClass.name}" class="class-details__image" onerror="this.src='/trp/assets/img/background.jpg'">
          <div class="class-details__title-group">
            <h1 class="class-details__title">${selectedClass.icon} ${selectedClass.name}</h1>
            <p class="class-details__main-desc">${selectedClass.description}</p>
          </div>
        </div>

        <div class="class-details__stats">
          <h3>Характеристики</h3>
          <div class="stats-grid">
            ${this.renderStatsDetails(selectedClass.stats)}
          </div>
        </div>

        <div class="class-details__abilities">
          <h3>Боевые способности</h3>
          <div class="abilities-list">
            ${selectedClass.activeAbilities.map(ability => `
              <div class="ability-card">
                <div class="ability-card__name">${ability.name}</div>
                <div class="ability-card__meta">
                  <span class="ability-card__meta-item">💙 ${ability.manaCost} мана</span>
                  <span class="ability-card__meta-item">⏱️ ${ability.cooldown}с кулдаун</span>
                </div>
                <div class="ability-card__desc">${ability.description}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="class-details__description">
          <h3>Описание класса</h3>
          <p>${selectedClass.details}</p>
        </div>

        <div class="class-details__actions">
          <button class="btn btn-back" onclick="window.classSelectionManager.closeClassDetails()">Вернуться назад</button>
          <button class="btn btn-choose-class" onclick="window.classSelectionManager.openAbilityModal()">Выбрать класс</button>
        </div>
      </div>
    `;

    // Показываем экран деталей, скрываем выбор
    DOMManager.hideElement('class-selection-screen');
    DOMManager.showElement('class-details-screen');
  }

  /**
   * Закрывает экран деталей класса
   */
  static closeClassDetails() {
    selectedClass = null;
    DOMManager.showElement('class-selection-screen');
    DOMManager.hideElement('class-details-screen');
  }

  /**
   * Отрисовывает характеристики класса в деталях
   */
  static renderStatsDetails(stats) {
    const statNames = {
      strength: 'Сила',
      agility: 'Ловкость',
      intelligence: 'Интеллект',
      endurance: 'Выносливость'
    };

    return Object.entries(stats).map(([key, value]) => `
      <div class="stat-item">
        <div class="stat-item__label">${statNames[key]}</div>
        <div class="stat-item__value">${value}</div>
        <div class="stat-item__bar">
          <div class="stat-item__fill" style="width: ${value * 10}%;"></div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Открывает модаль выбора способности
   */
  static openAbilityModal() {
    if (!selectedClass) return;

    selectedAbility = null;

    const abilityOptions = DOMManager.getElementById('abilityOptions');
    const abilities = dataLoader.getAbilities();
    const randomAbilities = shuffleArray(abilities).slice(0, 3);

    abilityOptions.innerHTML = randomAbilities.map((ability, index) => `
      <label class="ability-option">
        <input type="radio" name="ability" value="${index}" onchange="window.classSelectionManager.selectAbility(${index}, '${ability.name}')">
        <div class="ability__name">${ability.name}</div>
        <div class="ability__description">${ability.description}</div>
      </label>
    `).join('');

    DOMManager.disableButton('confirmBtn');
    
    // Создаём модаль если её нет
    let abilityModal = DOMManager.getElementById('abilityModal');
    if (!abilityModal) {
      const container = document.createElement('div');
      container.id = 'abilityModal';
      container.className = 'modal';
      container.innerHTML = `
        <div class="modal__content">
          <button type="button" class="modal__close" id="abilityCloseBtn" aria-label="Закрыть окно">&times;</button>
          <h2>Выберите начальную способность</h2>
          <div class="ability__options" id="abilityOptions"></div>
          <div class="modal__buttons">
            <button class="confirm-btn" id="confirmBtn" disabled>Подтвердить выбор</button>
            <button class="cancel-btn" id="cancelBtn">Отмена</button>
          </div>
        </div>
      `;
      document.body.appendChild(container);
      abilityModal = container;
      
      // Прикрепляем обработчики
      const confirmBtn = abilityModal.querySelector('#confirmBtn');
      const cancelBtn = abilityModal.querySelector('#cancelBtn');
      const closeBtn = abilityModal.querySelector('#abilityCloseBtn');
      
      if (confirmBtn) confirmBtn.addEventListener('click', () => this.confirmSelection());
      if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeAbilityModal());
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeAbilityModal());
    }
    
    DOMManager.openModal('abilityModal');
  }

  /**
   * Выбирает способность
   */
  static selectAbility(index, name) {
    selectedAbility = name;
    const confirmBtn = DOMManager.getElementById('confirmBtn');
    if (confirmBtn) DOMManager.enableButton('confirmBtn');

    document.querySelectorAll('.ability-option').forEach((option, i) => {
      if (i === index) option.classList.add('selected');
      else option.classList.remove('selected');
    });
  }

  /**
   * Подтверждает выбор класса
   */
  static confirmSelection() {
    if (selectedClass && selectedAbility) {
      gameState.initializePlayer(selectedClass, selectedAbility);
      eventManager.emit(APP_EVENTS.CLASS_SELECTED, { 
        class: selectedClass.name,
        ability: selectedAbility 
      });
      this.closeAbilityModal();
    }
  }

  /**
   * Закрывает модаль выбора способности
   */
  static closeAbilityModal() {
    DOMManager.closeModal('abilityModal');
    selectedClass = null;
    selectedAbility = null;
  }

  /**
   * Прикрепляет обработчики событий
   */
  static attachEventListeners() {
    // Основные обработчики будут прикреплены при открытии модалей
  }
}

// Экспортируем для глобального доступа из HTML
window.classSelectionManager = ClassSelectionManager;

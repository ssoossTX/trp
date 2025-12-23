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
   * Отрисовывает карточки классов
   */
  static renderClasses() {
    const classesGrid = DOMManager.getElementById('classesGrid');
    const classes = dataLoader.getClasses();

    classesGrid.innerHTML = classes.map(classData => `
      <div class="class-card">
        <div class="class-card__header">
          <div class="class-card__icon">${classData.icon}</div>
          <h3 class="class-card__title">${classData.name}</h3>
        </div>
        
        <div class="class-card__description">
          <p class="class-card__main-desc">${classData.description}</p>
        </div>
        
        <div class="class-card__stats">
          <h4>Характеристики</h4>
          ${this.renderStats(classData.stats)}
        </div>
        
        <div class="class-card__abilities">
          <h4>Боевые способности</h4>
          ${classData.activeAbilities.map(ability => `
            <div class="ability-item">
              <div class="ability-item__name">${ability.name}</div>
              <div class="ability-item__info">
                <span class="ability-item__mana">💙 ${ability.manaCost}</span>
                <span class="ability-item__cooldown">⏱️ ${ability.cooldown}</span>
              </div>
              <div class="ability-item__desc">${ability.description}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="class-card__details">
          ${classData.details}
        </div>
        
        <div class="class-card__actions">
          <button class="btn btn-primary" onclick="window.classSelectionManager.openAbilityModal('${classData.id}')">Выбрать класс</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Отрисовывает характеристики класса
   */
  static renderStats(stats) {
    const statNames = {
      strength: 'Сила',
      agility: 'Ловкость',
      intelligence: 'Интеллект',
      endurance: 'Выносливость'
    };

    return Object.entries(stats).map(([key, value]) => `
      <div class="stat">
        <div class="stat__label">
          <span>${statNames[key]}</span>
          <span>${value}</span>
        </div>
        <div class="stat__bar">
          <div class="stat__fill stat__fill--${key}" style="width: ${value * 10}%;"></div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Открывает модаль выбора способности
   */
  static openAbilityModal(classId) {
    selectedClass = dataLoader.getClassById(classId);
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
    DOMManager.openModal(GAME_CONSTANTS.MODALS.ABILITY);
  }

  /**
   * Выбирает способность
   */
  static selectAbility(index, name) {
    selectedAbility = name;
    DOMManager.enableButton('confirmBtn');

    document.querySelectorAll('.ability-option').forEach((option, i) => {
      if (i === index) option.classList.add('selected');
      else option.classList.remove('selected');
    });
  }

  /**
   * Открывает модаль деталей класса
   */
  static openDetailsModal(classId) {
    const classData = dataLoader.getClassById(classId);
    const detailsContent = DOMManager.getElementById('detailsContent');
    const detailsTitle = DOMManager.getElementById('detailsTitle');

    detailsTitle.textContent = classData.name;
    detailsContent.innerHTML = `
      <h3>Описание</h3>
      <p>${classData.details}</p>
      
      <h3>Характеристики</h3>
      <p>
        <strong>Сила:</strong> ${classData.stats.strength}/10<br>
        <strong>Ловкость:</strong> ${classData.stats.agility}/10<br>
        <strong>Интеллект:</strong> ${classData.stats.intelligence}/10<br>
        <strong>Выносливость:</strong> ${classData.stats.endurance}/10
      </p>
      
      <h3>Уникальные навыки</h3>
      <p>${classData.abilities.map(ability => `<strong>${ability}</strong>`).join(', ')}</p>
    `;

    DOMManager.openModal(GAME_CONSTANTS.MODALS.DETAILS);
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
    DOMManager.closeModal(GAME_CONSTANTS.MODALS.ABILITY);
    selectedClass = null;
    selectedAbility = null;
  }

  /**
   * Прикрепляет обработчики событий
   */
  static attachEventListeners() {
    const confirmBtn = DOMManager.getElementById('confirmBtn');
    const cancelBtn = DOMManager.getElementById('cancelBtn');
    const closeDetailsBtn = DOMManager.getElementById('closeDetailsBtn');
    const abilityCloseBtn = DOMManager.getElementById('abilityCloseBtn');
    const detailsCloseBtn = DOMManager.getElementById('detailsCloseBtn');

    if (confirmBtn) confirmBtn.addEventListener('click', () => this.confirmSelection());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeAbilityModal());
    if (closeDetailsBtn) closeDetailsBtn.addEventListener('click', () => DOMManager.closeModal(GAME_CONSTANTS.MODALS.DETAILS));
    if (abilityCloseBtn) abilityCloseBtn.addEventListener('click', () => this.closeAbilityModal());
    if (detailsCloseBtn) detailsCloseBtn.addEventListener('click', () => DOMManager.closeModal(GAME_CONSTANTS.MODALS.DETAILS));

    // Закрытие по клику на фон
    const abilityModal = DOMManager.getElementById(GAME_CONSTANTS.MODALS.ABILITY);
    const detailsModal = DOMManager.getElementById(GAME_CONSTANTS.MODALS.DETAILS);

    if (abilityModal) abilityModal.addEventListener('click', (e) => {
      if (e.target === abilityModal) this.closeAbilityModal();
    });

    if (detailsModal) detailsModal.addEventListener('click', (e) => {
      if (e.target === detailsModal) DOMManager.closeModal(GAME_CONSTANTS.MODALS.DETAILS);
    });

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') DOMManager.closeAllModals();
    });
  }
}

// Экспортируем для глобального доступа из HTML
window.classSelectionManager = ClassSelectionManager;

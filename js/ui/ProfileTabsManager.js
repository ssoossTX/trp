/**
 * ProfileTabsManager - управление системой вкладок профиля
 */
import { DOMManager } from '../core/DOMManager.js';

export class ProfileTabsManager {
  /**
   * Инициализирует систему вкладок профиля
   */
  static init() {
    this.attachEventListeners();
    // Показываем первую вкладку по умолчанию
    this.switchTab('status');
  }

  /**
   * Прикрепляет обработчики событий к кнопкам вкладок
   */
  static attachEventListeners() {
    const tabs = DOMManager.querySelectorAll('.profile-tab');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-profile-tab');
        this.switchTab(tabName);
      });
    });
  }

  /**
   * Переключает вкладку профиля
   * @param {string} tabName - Название вкладки (status, stats, abilities, inventory)
   */
  static switchTab(tabName) {
    // Удаляем активный класс со всех кнопок и содержимого
    DOMManager.querySelectorAll('.profile-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    DOMManager.querySelectorAll('.profile-tab-content').forEach(content => {
      content.classList.remove('active');
    });

    // Добавляем активный класс к выбранной вкладке
    const activeTab = document.querySelector(`.profile-tab[data-profile-tab="${tabName}"]`);
    const activeContent = document.querySelector(`.profile-tab-content[data-profile-tab="${tabName}"]`);

    if (activeTab) {
      activeTab.classList.add('active');
    }
    if (activeContent) {
      activeContent.classList.add('active');
    }
  }
}

/**
 * DOMManager - управление DOM элементами
 */
import { Logger } from '../utils/helpers.js';

class DOMManager {
  /**
   * Найти элемент по ID
   */
  static getElementById(id) {
    const el = document.getElementById(id);
    if (!el) Logger.warn(`Элемент с ID "${id}" не найден`);
    return el;
  }

  /**
   * Найти элементы по селектору
   */
  static querySelectorAll(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Показать экран
   */
  static showScreen(screenId) {
    const screen = this.getElementById(screenId);
    if (screen) {
      screen.classList.remove('hidden');
      screen.classList.add('visible');
    }
  }

  /**
   * Скрыть экран
   */
  static hideScreen(screenId) {
    const screen = this.getElementById(screenId);
    if (screen) {
      screen.classList.remove('visible');
      screen.classList.add('hidden');
    }
  }

  /**
   * Открыть модаль
   */
  static openModal(modalId) {
    const modal = this.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  /**
   * Закрыть модаль
   */
  static closeModal(modalId) {
    const modal = this.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  /**
   * Закрыть все модали
   */
  static closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
      modal.classList.remove('active');
    });
  }

  /**
   * Установить текст элемента
   */
  static setText(elementId, text) {
    const el = this.getElementById(elementId);
    if (el) el.textContent = text;
  }

  /**
   * Установить HTML содержимое
   */
  static setHTML(elementId, html) {
    const el = this.getElementById(elementId);
    if (el) el.innerHTML = html;
  }

  /**
   * Очистить элемент
   */
  static clear(elementId) {
    const el = this.getElementById(elementId);
    if (el) el.innerHTML = '';
  }

  /**
   * Добавить класс
   */
  static addClass(elementId, className) {
    const el = this.getElementById(elementId);
    if (el) el.classList.add(className);
  }

  /**
   * Удалить класс
   */
  static removeClass(elementId, className) {
    const el = this.getElementById(elementId);
    if (el) el.classList.remove(className);
  }

  /**
   * Показать элемент
   */
  static show(elementId) {
    const el = this.getElementById(elementId);
    if (el) el.classList.remove('hidden');
  }

  /**
   * Показать элемент (альтернативный метод)
   */
  static showElement(elementId) {
    return this.show(elementId);
  }

  /**
   * Скрыть элемент
   */
  static hide(elementId) {
    const el = this.getElementById(elementId);
    if (el) el.classList.add('hidden');
  }

  /**
   * Скрыть элемент (альтернативный метод)
   */
  static hideElement(elementId) {
    return this.hide(elementId);
  }

  /**
   * Установить стиль ширины
   */
  static setWidth(elementId, width) {
    const el = this.getElementById(elementId);
    if (el) el.style.width = width;
  }

  /**
   * Активировать элемент
   */
  static setActive(elementId) {
    const el = this.getElementById(elementId);
    if (el) el.classList.add('active');
  }

  /**
   * Деактивировать элемент
   */
  static setInactive(elementId) {
    const el = this.getElementById(elementId);
    if (el) el.classList.remove('active');
  }

  /**
   * Отключить кнопку
   */
  static disableButton(elementId) {
    const el = this.getElementById(elementId);
    if (el) el.disabled = true;
  }

  /**
   * Включить кнопку
   */
  static enableButton(elementId) {
    const el = this.getElementById(elementId);
    if (el) el.disabled = false;
  }
}

export { DOMManager };

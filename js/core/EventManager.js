/**
 * EventManager - управление событиями приложения
 */
import { APP_EVENTS } from '../utils/constants.js';
import { Logger } from '../utils/helpers.js';

class EventManager {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Подписаться на событие
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
    Logger.log(`Подписка на событие: ${eventName}`);
  }

  /**
   * Отписаться от события
   */
  off(eventName, callback) {
    if (!this.listeners.has(eventName)) return;
    const listeners = this.listeners.get(eventName);
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  }

  /**
   * Вызвать событие
   */
  emit(eventName, data) {
    if (!this.listeners.has(eventName)) return;
    this.listeners.get(eventName).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        Logger.error(`Ошибка при обработке события ${eventName}:`, error);
      }
    });
  }

  /**
   * Очистить все слушатели события
   */
  clear(eventName) {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }
}

export const eventManager = new EventManager();

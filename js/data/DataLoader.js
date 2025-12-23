/**
 * DataLoader - загружает и кэширует данные игры
 */
import { loadJSON, Logger } from '../utils/helpers.js';

class DataLoader {
  constructor() {
    this.classes = null;
    this.locations = null;
    this.abilities = null;
    this.loaded = false;
  }

  /**
   * Загружает все данные игры
   * @returns {Promise<boolean>} true если успешно загружено
   */
  async load() {
    try {
      Logger.log('Начинаю загрузку данных...');
      
      const [classesData, locationsData, abilitiesData] = await Promise.all([
        loadJSON('data/classes.json'),
        loadJSON('data/locations.json'),
        loadJSON('data/abilities.json')
      ]);

      this.classes = classesData;
      this.locations = locationsData;
      this.abilities = abilitiesData;
      this.loaded = true;

      Logger.log('Все данные успешно загружены');
      return true;
    } catch (error) {
      Logger.error('Ошибка при загрузке данных:', error);
      return false;
    }
  }

  /**
   * Возвращает все классы
   * @returns {Array<Object>} Массив классов
   */
  getClasses() {
    return this.classes || [];
  }

  /**
   * Возвращает класс по ID
   * @param {string} classId - ID класса
   * @returns {Object|null} Объект класса или null
   */
  getClassById(classId) {
    return this.classes?.find(c => c.id === classId) || null;
  }

  /**
   * Возвращает класс по названию
   * @param {string} className - Название класса
   * @returns {Object|null} Объект класса или null
   */
  getClassByName(className) {
    return this.classes?.find(c => c.name === className) || null;
  }

  /**
   * Возвращает все локации
   * @returns {Object} Объект с локациями
   */
  getLocations() {
    return this.locations || {};
  }

  /**
   * Возвращает локацию по ID
   * @param {string} locationId - ID локации
   * @returns {Object|null} Объект локации или null
   */
  getLocationById(locationId) {
    return this.locations?.[locationId] || null;
  }

  /**
   * Возвращает все способности
   * @returns {Array<Object>} Массив способностей
   */
  getAbilities() {
    return this.abilities || [];
  }

  /**
   * Возвращает врагов для локации
   * @param {string} locationId - ID локации
   * @returns {Array<Object>} Массив врагов
   */
  getEnemiesForLocation(locationId) {
    return this.getLocationById(locationId)?.enemies || [];
  }

  /**
   * Возвращает добычу для локации
   * @param {string} locationId - ID локации
   * @returns {Array<Object>} Массив добычи
   */
  getLootForLocation(locationId) {
    return this.getLocationById(locationId)?.loot || [];
  }
}

export const dataLoader = new DataLoader();

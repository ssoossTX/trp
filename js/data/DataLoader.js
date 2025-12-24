/**
 * DataLoader - загружает и кэширует данные игры
 */
import { loadJSON, Logger } from '../utils/helpers.js';

class DataLoader {
  constructor() {
    this.classes = null;
    this.locations = null;
    this.abilities = null;
    this.dungeons = null;
    this.loaded = false;
  }

  /**
   * Загружает все данные игры
   * @returns {Promise<boolean>} true если успешно загружено
   */
  async load() {
    try {
      Logger.log('Начинаю загрузку данных...');
      
      const [classesData, locationsData, abilitiesData, dungeonsData] = await Promise.all([
        loadJSON('data/classes.json'),
        loadJSON('data/locations.json'),
        loadJSON('data/abilities.json'),
        loadJSON('data/dungeons.json')
      ]);

      this.classes = classesData;
      this.locations = locationsData;
      this.abilities = abilitiesData;
      this.dungeons = dungeonsData;
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

  /**
   * Загружает все подземелья
   * @returns {Promise<Array>} Массив подземелий
   */
  async loadDungeons() {
    if (!this.dungeons) {
      this.dungeons = await loadJSON('data/dungeons.json');
    }
    return this.dungeons || [];
  }

  /**
   * Возвращает подземелье по ID
   * @param {string} dungeonId - ID подземелья
   * @returns {Object|null} Данные подземелья или null
   */
  getDungeonById(dungeonId) {
    return this.dungeons?.find(d => d.id === dungeonId) || null;
  }
}

export const dataLoader = new DataLoader();

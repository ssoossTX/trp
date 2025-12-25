/**
 * app.js - точка входа приложения
 * Инициализирует все модули и запускает игру
 */

import { dataLoader } from './data/DataLoader.js';
import { DOMManager } from './core/DOMManager.js';
import { gameState } from './core/GameState.js';
import { eventManager } from './core/EventManager.js';
import { ClassSelectionManager } from './classes/ClassSelectionManager.js';
import { LocationsManager } from './locations/LocationsManager.js';
import { DungeonsManager } from './locations/DungeonsManager.js';
import { UIManager } from './ui/UIManager.js';
import { BattleEngine } from './battle/BattleEngine.js';
import { Logger, delay } from './utils/helpers.js';
import { GAME_CONSTANTS, APP_EVENTS } from './utils/constants.js';

/**
 * Главный класс приложения
 */
class Game {
  /**
   * Инициализирует игру
   */
  async init() {
    try {
      Logger.log('Инициализация игры...');

      // Загружаем данные
      const dataLoaded = await dataLoader.load();
      if (!dataLoaded) {
        Logger.error('Не удалось загрузить данные игры');
        return;
      }

      // Инициализируем UI
      UIManager.init();

      // Инициализируем выбор класса
      await ClassSelectionManager.init();

      // Подписываемся на события
      this.setupEventListeners();

      Logger.log('Игра успешно инициализирована');
    } catch (error) {
      Logger.error('Критическая ошибка при инициализации:', error);
    }
  }

  /**
   * Устанавливает обработчики событий
   */
  setupEventListeners() {
    // Класс выбран
    eventManager.on(APP_EVENTS.CLASS_SELECTED, async (data) => {
      Logger.log(`Класс выбран: ${data.class}`);
      await this.transitionToGame();
    });

    // События боя
    eventManager.on(APP_EVENTS.BATTLE_ENDED, (data) => {
      Logger.log(`Бой завершился: ${data.result}`);
    });
  }

  /**
   * Переход к основной игре
   */
  async transitionToGame() {
    // Показываем экран загрузки
    const loadingScreen = DOMManager.getElementById(GAME_CONSTANTS.LOADING_SCREEN_ID);
    if (loadingScreen) loadingScreen.classList.add('active');

    // Ждём немного
    await delay(GAME_CONSTANTS.SCREEN_TRANSITION_DELAY);

    // Скрываем экран выбора класса
    DOMManager.hideScreen(GAME_CONSTANTS.CLASS_SELECTION_SCREEN_ID);

    // Инициализируем основную игру
    UIManager.initGameUI();
    LocationsManager.init();

    // Показываем главное меню
    UIManager.showMainMenu();
    UIManager.initMenuNavigation();

    // Скрываем экран загрузки
    if (loadingScreen) loadingScreen.classList.remove('active');
  }
}

/**
 * Запускаем игру при загрузке DOM
 */
async function main() {
  const game = new Game();
  await game.init();
}

// Ждём загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

// Экспортируем BattleEngine для глобального доступа из HTML
window.BattleEngine = BattleEngine;

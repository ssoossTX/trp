/**
 * Утилитные функции
 */

/**
 * Загружает JSON данные из файла
 * @param {string} path - Путь к файлу
 * @returns {Promise<Object>} Распарсенные данные
 */
export async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Ошибка загрузки ${path}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Возвращает случайный элемент массива
 * @param {Array} array - Массив
 * @returns {*} Случайный элемент
 */
export function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Перемешивает массив (Fisher-Yates)
 * @param {Array} array - Массив для перемешивания
 * @returns {Array} Новый перемешанный массив
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Форматирует число с заполнением нулями
 * @param {number} num - Число
 * @param {number} places - Количество символов
 * @returns {string} Отформатированная строка
 */
export function padZero(num, places = 2) {
  return String(num).padStart(places, '0');
}

/**
 * Вычисляет урон с учётом случайности
 * @param {number} baseDamage - Базовый урон
 * @param {number} randomness - Максимальное отклонение
 * @returns {number} Итоговый урон
 */
export function calculateDamage(baseDamage, randomness = 0) {
  const variance = Math.floor(Math.random() * randomness) - (randomness / 2);
  return Math.max(1, Math.floor(baseDamage + variance));
}

/**
 * Вычисляет процент
 * @param {number} value - Текущее значение
 * @param {number} max - Максимальное значение
 * @returns {number} Процент (0-100)
 */
export function calculatePercent(value, max) {
  if (max === 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

/**
 * Задержка выполнения
 * @param {number} ms - Миллисекунды
 * @returns {Promise} Проверка после задержки
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Логирование (может быть переопределено для отключения в продакшене)
 */
export const Logger = {
  log: (msg, ...args) => console.log(`[Game] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[Game ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[Game WARN] ${msg}`, ...args),
  info: (msg, ...args) => console.info(`[Game INFO] ${msg}`, ...args)
};

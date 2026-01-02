/**
 * Конфиг объектов для локаций
 * Описание объектов с путями картинок и вероятностями появления
 */

export const LOCATION_OBJECTS_CONFIG = {
  city: {
    name: 'Город',
    objects: [
      { type: 'tree', image: '/trp/assets/img/loc/дерево.png', percentage: 0.10, name: 'Дерево' },
      { type: 'house', image: '/trp/assets/img/loc/дом.png', percentage: 0.05, name: 'Дом' }
    ],
    enemies: 0.05 // 5% для врагов
  },
  forest: {
    name: 'Лес',
    objects: [
      { type: 'tree', image: '/trp/assets/img/loc/дерево.png', percentage: 0.10, name: 'Дерево' },
      { type: 'stone', image: '/trp/assets/img/loc/камень.png', percentage: 0.03, name: 'Камень' },
      { type: 'bush', image: '/trp/assets/img/loc/куст.png', percentage: 0.02, name: 'Куст' },
      { type: 'stump', image: '/trp/assets/img/loc/пень.png', percentage: 0.01, name: 'Пень' }
    ],
    enemies: 0.05 // 5% для врагов
  },
  mountains: {
    name: 'Горы',
    objects: [
      { type: 'cave', image: '/trp/assets/img/loc/пещера.png', percentage: 0.03, name: 'Пещера' },
      { type: 'stones', image: '/trp/assets/img/loc/камни.png', percentage: 0.07, name: 'Камни' },
      { type: 'tree', image: '/trp/assets/img/loc/дерево.png', percentage: 0.05, name: 'Дерево' },
      { type: 'stump', image: '/trp/assets/img/loc/пень.png', percentage: 0.01, name: 'Пень' }
    ],
    enemies: 0.05 // 5% для врагов
  }
};

/**
 * Получает конфиг объектов для локации
 */
export function getLocationObjectsConfig(locationId) {
  return LOCATION_OBJECTS_CONFIG[locationId] || null;
}

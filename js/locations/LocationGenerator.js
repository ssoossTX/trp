/**
 * LocationGenerator - генерирует локации с сеткой, врагами, деревьями и камнями
 */
import { Logger } from '../utils/helpers.js';
import { gameState } from '../core/GameState.js';

class LocationGenerator {
  constructor() {
    this.gridWidth = 45; // 45 клеток в ширину
    this.gridHeight = 45; // 45 клеток в высоту
    this.cellSize = 40; // 40px за клетка
    this.currentLocation = null;
    this.playerPosition = { x: 22, y: 22 }; // Центр сетки (45/2 = 22.5, округляем в меньшую сторону)
    this.isLocationActive = false;
  }

  /**
   * Генерирует новую локацию
   */
  generateLocation() {
    Logger.log('Генерация новой локации...');
    
    this.currentLocation = {
      width: this.gridWidth,
      height: this.gridHeight,
      cellSize: this.cellSize,
      objects: [],
      playerX: 22,
      playerY: 22
    };

    // Генерируем объекты
    this.generateObjects();
    this.isLocationActive = true;
    
    Logger.log(`Локация создана: ${this.gridWidth}x${this.gridHeight}`);
    return this.currentLocation;
  }

  /**
   * Генерирует объекты на локации (враги, деревья, камни)
   * Распределение: 50% пусто, 15% враги, 20% деревья, 15% камни
   */
  generateObjects() {
    const objectTypes = [
      { type: 'enemy', emoji: '👹', weight: 0.15, maxCount: 25 },
      { type: 'tree', emoji: '🌲', weight: 0.20, maxCount: 40 },
      { type: 'stone', emoji: '🪨', weight: 0.15, maxCount: 25 }
    ];

    const occupiedCells = new Set();
    
    // Помечаем клетку с игроком как занятую
    occupiedCells.add(this.getcellKey(45, 45));

    // Для каждого типа объекта генерируем необходимое количество
    objectTypes.forEach(objType => {
      const count = Math.floor(this.gridWidth * this.gridHeight * objType.weight / 100);
      let created = 0;

      while (created < Math.min(count, objType.maxCount)) {
        const x = Math.floor(Math.random() * this.gridWidth);
        const y = Math.floor(Math.random() * this.gridHeight);
        const cellKey = this.getcellKey(x, y);

        if (!occupiedCells.has(cellKey)) {
          this.currentLocation.objects.push({
            type: objType.type,
            x: x,
            y: y,
            emoji: objType.emoji,
            id: `${objType.type}_${x}_${y}`
          });
          occupiedCells.add(cellKey);
          created++;
        }
      }
    });
  }

  /**
   * Получает уникальный ключ для клетки
   */
  getcellKey(x, y) {
    return `${x},${y}`;
  }

  /**
   * Проверяет, занята ли клетка объектом
   */
  isCellOccupied(x, y) {
    if (!this.currentLocation) return false;
    
    const cellKey = this.getcellKey(x, y);
    return this.currentLocation.objects.some(obj => this.getObjectCellKey(obj) === cellKey);
  }

  /**
   * Получает ключ клетки объекта
   */
  getObjectCellKey(obj) {
    return this.getcellKey(obj.x, obj.y);
  }

  /**
   * Проверяет, валидна ли позиция для движения
   */
  isValidMove(x, y) {
    if (!this.currentLocation) return false;
    
    // Проверяем границы (валидные координаты: 0 до 89 включительно для 90x90 сетки)
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return false;
    }

    // Проверяем, не занята ли клетка объектом
    if (this.isCellOccupied(x, y)) {
      return false;
    }

    return true;
  }

  /**
   * Перемещает игрока
   * Возвращает true если движение успешно
   */
  movePlayer(direction) {
    if (!this.currentLocation) return false;

    const { x, y } = this.playerPosition;
    let newX = x;
    let newY = y;

    switch (direction) {
      case 'up':
        newY = y - 1;
        break;
      case 'down':
        newY = y + 1;
        break;
      case 'left':
        newX = x - 1;
        break;
      case 'right':
        newX = x + 1;
        break;
      default:
        return false;
    }

    // Проверяем границы перед попыткой движения
    if (newX < 0 || newX >= this.gridWidth || newY < 0 || newY >= this.gridHeight) {
      return false;
    }

    if (this.isValidMove(newX, newY)) {
      this.playerPosition = { x: newX, y: newY };
      this.currentLocation.playerX = newX;
      this.currentLocation.playerY = newY;
      return true;
    }

    return false;
  }

  /**
   * Получает видимую область вокруг игрока
   * @param {number} viewWidth - количество клеток в ширину
   * @param {number} viewHeight - количество клеток в высоту
   */
  getVisibleArea(viewWidth, viewHeight) {
    const { x: playerX, y: playerY } = this.playerPosition;
    
    // Центрируем камеру на игроке
    let startX = playerX - Math.floor(viewWidth / 2);
    let startY = playerY - Math.floor(viewHeight / 2);

    // Ограничиваем границами карты
    startX = Math.max(0, Math.min(startX, this.gridWidth - viewWidth));
    startY = Math.max(0, Math.min(startY, this.gridHeight - viewHeight));

    const visibleObjects = this.currentLocation.objects.filter(obj => {
      return obj.x >= startX && obj.x < startX + viewWidth &&
             obj.y >= startY && obj.y < startY + viewHeight;
    });

    return {
      startX,
      startY,
      width: viewWidth,
      height: viewHeight,
      objects: visibleObjects,
      playerRelativeX: playerX - startX,
      playerRelativeY: playerY - startY,
      playerAbsoluteX: playerX,
      playerAbsoluteY: playerY
    };
  }

  /**
   * Получает статистику локации
   */
  getLocationStats() {
    if (!this.currentLocation) return null;

    const stats = {
      enemies: 0,
      trees: 0,
      stones: 0
    };

    this.currentLocation.objects.forEach(obj => {
      if (obj.type === 'enemy') stats.enemies++;
      else if (obj.type === 'tree') stats.trees++;
      else if (obj.type === 'stone') stats.stones++;
    });

    return stats;
  }

  /**
   * Заканчивает текущую локацию
   */
  endLocation() {
    this.currentLocation = null;
    this.playerPosition = { x: 22, y: 22 };
    this.isLocationActive = false;
  }
}

export const locationGenerator = new LocationGenerator();

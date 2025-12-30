/**
 * LocationUI - управляет отображением локации
 */
import { locationGenerator } from './LocationGenerator.js';
import { Logger } from '../utils/helpers.js';
import { gameState } from '../core/GameState.js';

class LocationUI {
  constructor() {
    this.canvas = null;
    this.viewWidth = 10; // 10 клеток в ширину
    this.viewHeight = 10; // 10 клеток в высоту
    this.isVisible = false;
    this.currentBattleEnemyPos = null; // Позиция текущего врага в бою
    this.isFleeingBattle = false; // Флаг для предотвращения множественных вызовов бегства
  }

  /**
   * Инициализирует UI локации
   */
  init() {
    // Создаем элементы если их нет
    this.ensureLocationScreenExists();
    this.setupEventListeners();
    Logger.log('LocationUI инициализирован');
  }

  /**
   * Убеждается, что экран локации существует в HTML
   */
  ensureLocationScreenExists() {
    let locationScreen = document.getElementById('location-screen');
    
    if (!locationScreen) {
      locationScreen = document.createElement('div');
      locationScreen.className = 'screen hidden';
      locationScreen.id = 'location-screen';
      locationScreen.innerHTML = `
        <div class="location-screen__container">
          <div class="location-screen__content">
            <!-- Информация о локации -->
            <div class="location-screen__header">
              <button class="game-screen__exit-btn" id="locationExitBtn">
                <img src="/trp/assets/img/выход.png" alt="Назад">
              </button>
              <h2>🗺️ Исследование локации</h2>
              <div class="location-stats" id="locationStats"></div>
            </div>

            <!-- Область отображения локации -->
            <div class="location-screen__viewport" id="locationViewport">
              <!-- Сетка будет отображаться здесь -->
            </div>

            <!-- Управление -->
            <div class="location-screen__controls">
              <div class="controls-grid">
                <button class="control-btn up" id="btnUp" title="Вверх">⭡</button>
                <div class="controls-spacer"></div>
                <button class="control-btn left" id="btnLeft" title="Влево">⭠</button>
                <button class="control-btn down" id="btnDown" title="Вниз">⭣</button>
                <button class="control-btn right" id="btnRight" title="Вправо">⭢</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(locationScreen);
    }
  }

  /**
   * Устанавливает слушатели событий
   */
  setupEventListeners() {
    document.getElementById('locationExitBtn')?.addEventListener('click', () => this.closeLocation());
    document.getElementById('btnUp')?.addEventListener('click', () => this.handleMove('up'));
    document.getElementById('btnDown')?.addEventListener('click', () => this.handleMove('down'));
    document.getElementById('btnLeft')?.addEventListener('click', () => this.handleMove('left'));
    document.getElementById('btnRight')?.addEventListener('click', () => this.handleMove('right'));

    // Клавиатурное управление
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
  }

  /**
   * Обработчик нажатия клавиш
   */
  handleKeyPress(e) {
    if (!this.isVisible) return;

    switch (e.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        e.preventDefault();
        this.handleMove('up');
        break;
      case 'arrowdown':
      case 's':
        e.preventDefault();
        this.handleMove('down');
        break;
      case 'arrowleft':
      case 'a':
        e.preventDefault();
        this.handleMove('left');
        break;
      case 'arrowright':
      case 'd':
        e.preventDefault();
        this.handleMove('right');
        break;
      case 'escape':
        this.closeLocation();
        break;
    }
  }

  /**
   * Обработчик движения
   */
  handleMove(direction) {
    const result = locationGenerator.movePlayer(direction);
    if (result && result.moved) {
      if (result.enemy) {
        // Встреча с врагом - начинаем бой
        this.startBattleWithEnemy(result.enemy);
      } else {
        // Обычное движение
        this.render();
      }
    }
  }

  /**
   * Начинает бой с врагом
   */
  startBattleWithEnemy(enemy) {
    Logger.log(`Встреча с врагом на позиции ${enemy.x}, ${enemy.y}`);
    
    // Сохраняем позицию врага для последующего удаления при победе
    this.currentBattleEnemyPos = { x: enemy.x, y: enemy.y };
    
    // Импортируем нужные модули для боя
    import('../battle/BattleEngine.js').then(module => {
      const { BattleEngine } = module;
      
      // Генерируем враг данные на основе эмодзи
      const enemyData = this.generateEnemyData(enemy);
      
      // Скрываем экран локации
      const locationScreen = document.getElementById('location-screen');
      if (locationScreen) {
        locationScreen.classList.add('hidden');
        locationScreen.classList.remove('visible');
      }
      
      // Запускаем боевой движок
      BattleEngine.startBattle(enemyData, () => {
        // Callback при победе
        this.onBattleVictory();
      }, () => {
        // Callback при поражении
        this.onBattleDefeat();
      }, () => {
        // Callback при бегстве
        this.onBattleFlee();
      });
    }).catch(err => Logger.error('Ошибка загрузки BattleEngine:', err));
  }

  /**
   * Генерирует данные врага для боя
   */
  generateEnemyData(enemy) {
    const baseEnemies = {
      '👹': {
        name: 'Враг',
        hp: 50,
        maxHp: 50,
        attack: 10,
        damage: 10,
        level: 1
      }
    };
    
    const enemyType = baseEnemies[enemy.emoji] || {
      name: 'Неизвестный враг',
      hp: 30,
      maxHp: 30,
      attack: 8,
      damage: 8,
      level: 1
    };
    
    return {
      ...enemyType,
      emoji: enemy.emoji
    };
  }

  /**
   * Победа в бою - враг удаляется с локации
   */
  onBattleVictory() {
    Logger.log('Победа в бою!');
    
    // Удаляем врага с локации по его сохраненной позиции
    if (this.currentBattleEnemyPos && locationGenerator.currentLocation) {
      locationGenerator.currentLocation.objects = locationGenerator.currentLocation.objects.filter(obj =>
        !(obj.type === 'enemy' && obj.x === this.currentBattleEnemyPos.x && obj.y === this.currentBattleEnemyPos.y)
      );
      this.currentBattleEnemyPos = null; // Сбрасываем позицию врага
    }
    
    // Возвращаемся на экран локации
    const locationScreen = document.getElementById('location-screen');
    if (locationScreen) {
      locationScreen.classList.remove('hidden');
      locationScreen.classList.add('visible');
    }
    
    this.render();
  }

  /**
   * Поражение в бою - выход в меню
   */
  onBattleDefeat() {
    Logger.log('Поражение в бою...');
    
    // Завершаем локацию
    locationGenerator.endLocation();
    
    // Скрываем экран локации
    const locationScreen = document.getElementById('location-screen');
    if (locationScreen) {
      locationScreen.classList.add('hidden');
      locationScreen.classList.remove('visible');
    }
    
    // Показываем главное меню
    const menuScreen = document.getElementById('main-menu-screen');
    if (menuScreen) {
      menuScreen.classList.remove('hidden');
      menuScreen.classList.add('visible');
    }
  }

  /**
   * Бегство из боя - возврат на локацию с сохранением позиции
   */
  onBattleFlee() {
    // Защита от множественных вызовов
    if (this.isFleeingBattle) {
      return;
    }
    this.isFleeingBattle = true;
    
    Logger.log('Вы сбежали из боя!');
    
    // Добавляем ранение при бегстве
    gameState.player.wounds = (gameState.player.wounds || 0) + 1;
    Logger.log(`Ранения: ${gameState.player.wounds}/5`);
    
    // Сохраняем позицию врага ДО удаления
    const hadBattleOnLocation = this.currentBattleEnemyPos !== null;
    
    // Удаляем врага с локации по его сохраненной позиции
    if (this.currentBattleEnemyPos && locationGenerator.currentLocation) {
      locationGenerator.currentLocation.objects = locationGenerator.currentLocation.objects.filter(obj =>
        !(obj.type === 'enemy' && obj.x === this.currentBattleEnemyPos.x && obj.y === this.currentBattleEnemyPos.y)
      );
      this.currentBattleEnemyPos = null; // Сбрасываем позицию врага
    }
    
    // Проверяем достигли ли мы 5 ранений ПЕРЕД показом уведомления о бегстве
    if (gameState.player.wounds >= 5) {
      this.showDeathNotification();
      this.isFleeingBattle = false; // Сбрасываем флаг
      return;
    }
    
    // Показываем уведомление о бегстве только если это была боя на локации и не достигли 5 ранений
    if (hadBattleOnLocation) {
      this.showFleeNotification();
    }
    
    const locationScreen = document.getElementById('location-screen');
    if (locationScreen) {
      locationScreen.classList.remove('hidden');
      locationScreen.classList.add('visible');
    }
    
    this.render();
    this.isFleeingBattle = false; // Сбрасываем флаг
  }

  /**
   * Показывает уведомление о смерти при 5 ранениях
   */
  showDeathNotification() {
    const notification = document.createElement('div');
    notification.className = 'flee-notification death-notification';
    notification.innerHTML = `
      <div class="flee-notification__content">
        <h3>💀 Вы умерли и потеряли часть дроппа</h3>
        <p>Ранения: 5/5</p>
      </div>
    `;
    document.body.appendChild(notification);

    // Через 2 секунды возвращаемся в меню
    setTimeout(() => {
      notification.remove();
      this.exitToMenu();
    }, 2000);
  }

  /**
   * Выход в главное меню
   */
  exitToMenu() {
    // Завершаем локацию
    locationGenerator.endLocation();
    
    // Скрываем экран локации
    const locationScreen = document.getElementById('location-screen');
    if (locationScreen) {
      locationScreen.classList.add('hidden');
      locationScreen.classList.remove('visible');
    }
    
    // Показываем главное меню
    const menuScreen = document.getElementById('main-menu-screen');
    if (menuScreen) {
      menuScreen.classList.remove('hidden');
      menuScreen.classList.add('visible');
    }
    
    // Сбрасываем счетчик ранений
    gameState.player.wounds = 0;
  }  /**
   * Показывает уведомление о бегстве
   */
  showFleeNotification() {
    Logger.log('Показываю уведомление о бегстве');
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
      color: white;
      padding: 20px 40px;
      border-radius: 12px;
      font-size: 18px;
      font-weight: bold;
      box-shadow: 0 10px 40px rgba(255, 107, 107, 0.4);
      z-index: 10000;
      text-align: center;
      border: 2px solid #ff8a8f;
      animation: slideIn 0.3s ease-out;
    `;
    
    // Отображаем уведомление с счетчиком ранений
    const wounds = gameState.player.wounds || 0;
    notification.innerHTML = `
      <div>⚔️ Вы сбежали от противника, но не без ранения!</div>
      <div style="margin-top: 10px; font-size: 16px;">Ранения: ${wounds}/5</div>
    `;
    
    // Добавляем CSS анимацию
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translate(-50%, -70%);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }
      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
        to {
          opacity: 0;
          transform: translate(-50%, -30%);
        }
      }
    `;
    if (!document.querySelector('style[data-flee-notification]')) {
      style.setAttribute('data-flee-notification', 'true');
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 2.5 секунды с анимацией исчезновения
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        notification.remove();
        this.isFleeingBattle = false; // Сбрасываем флаг после удаления уведомления
      }, 300);
    }, 2200);
  }

  /**
   * Открывает и показывает локацию
   */
  openLocation() {
    // Очищаем счетчик ранений при входе на локацию
    gameState.player.wounds = 0;
    
    const screen = document.getElementById('location-screen');
    screen?.classList.remove('hidden');
    screen?.classList.add('visible');
    this.isVisible = true;
    this.render();
  }

  /**
   * Закрывает локацию
   */
  closeLocation() {
    locationGenerator.endLocation();
    const screen = document.getElementById('location-screen');
    screen?.classList.add('hidden');
    screen?.classList.remove('visible');
    this.isVisible = false;

    // Возвращаемся в меню
    const menuScreen = document.getElementById('main-menu-screen');
    menuScreen?.classList.add('visible');
    menuScreen?.classList.remove('hidden');
  }

  /**
   * Рендерит текущее состояние локации
   */
  render() {
    if (!locationGenerator.currentLocation) return;

    const visibleArea = locationGenerator.getVisibleArea(this.viewWidth, this.viewHeight);
    const viewport = document.getElementById('locationViewport');
    
    if (!viewport) return;

    // Очищаем viewport
    viewport.innerHTML = '';

    // Создаем контейнер сетки с адаптивными размерами
    const gridContainer = document.createElement('div');
    gridContainer.className = 'location-grid';
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = `repeat(${this.viewWidth}, 1fr)`;
    gridContainer.style.gridTemplateRows = `repeat(${this.viewHeight}, 1fr)`;
    gridContainer.style.gap = '2px';
    gridContainer.style.padding = '10px';
    gridContainer.style.background = '#1a1a1a';
    gridContainer.style.borderRadius = '8px';
    gridContainer.style.width = '100%';
    gridContainer.style.height = '100%';

    const visibilityRadius = 3; // Радиус видимости

    // Создаем все клетки
    for (let y = 0; y < this.viewHeight; y++) {
      for (let x = 0; x < this.viewWidth; x++) {
        const cell = document.createElement('div');
        cell.className = 'location-cell';
        cell.style.background = '#2a2a2a';
        cell.style.border = '1px solid #444';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.style.fontSize = '24px';
        cell.style.borderRadius = '4px';
        cell.style.cursor = 'default';
        cell.style.aspectRatio = '1';
        cell.style.minWidth = '0';

        const absX = visibleArea.startX + x;
        const absY = visibleArea.startY + y;

        // Проверяем, здесь ли игрок
        if (absX === visibleArea.playerAbsoluteX && absY === visibleArea.playerAbsoluteY) {
          cell.textContent = '🧙';
          cell.style.background = '#3a5a7a';
          cell.style.borderColor = '#6ab3ff';
          cell.style.boxShadow = '0 0 8px rgba(106, 179, 255, 0.5)';
        } else {
          // Проверяем расстояние от игрока до этой клетки (используем Евклидово расстояние для круглой видимости)
          const dx = absX - visibleArea.playerAbsoluteX;
          const dy = absY - visibleArea.playerAbsoluteY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Показываем объекты только в радиусе видимости
          if (distance <= visibilityRadius) {
            const objectOnCell = visibleArea.objects.find(obj => obj.x === absX && obj.y === absY);
            if (objectOnCell) {
              cell.textContent = objectOnCell.emoji;
              cell.style.background = '#2a3a2a';
            }
          } else {
            // Скрытые области - серые пустые клетки
            cell.style.background = '#1a1a1a';
            cell.style.borderColor = '#333';
          }
        }

        gridContainer.appendChild(cell);
      }
    }

    viewport.appendChild(gridContainer);
    this.updateStats();
  }

  /**
   * Обновляет статистику локации
   */
  updateStats() {
    const stats = locationGenerator.getLocationStats();
    const statsDiv = document.getElementById('locationStats');
    
    if (statsDiv && stats) {
      const { playerAbsoluteX, playerAbsoluteY } = locationGenerator.getVisibleArea(this.viewWidth, this.viewHeight);
      statsDiv.innerHTML = `
        <div class="stats-info">
          <span>👹 Враги: ${stats.enemies}</span>
          <span>🌲 Деревья: ${stats.trees}</span>
          <span>🪨 Камни: ${stats.stones}</span>
          <span>📍 Позиция: ${playerAbsoluteX},${playerAbsoluteY}</span>
        </div>
      `;
    }
  }

  /**
   * Запускает тестовую локацию
   */
  startTestLocation() {
    Logger.log('Запуск тестовой локации...');
    locationGenerator.generateLocation();
    this.openLocation();
  }
}

export const locationUI = new LocationUI();

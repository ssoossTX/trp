/**
 * LocationUI - управляет отображением локации
 */
import { locationGenerator } from './LocationGenerator.js';
import { Logger } from '../utils/helpers.js';
import { gameState } from '../core/GameState.js';

/**
 * ImageCache - кэширует загруженные картинки
 */
class ImageCache {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Загружает картинку асинхронно и кэширует
   */
  async loadImage(path) {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    if (this.loadingPromises.has(path)) {
      return this.loadingPromises.get(path);
    }

    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(path, img);
        this.loadingPromises.delete(path);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(path);
        reject(new Error(`Failed to load image: ${path}`));
      };
      img.src = path;
    });

    this.loadingPromises.set(path, promise);
    return promise;
  }

  /**
   * Получает картинку из кэша (если загружена)
   */
  getImage(path) {
    return this.cache.get(path) || null;
  }

  /**
   * Очищает кэш
   */
  clear() {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

class LocationUI {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.imageCache = new ImageCache();
    this.viewWidth = 8; // 8 клеток в ширину (вместо 10)
    this.viewHeight = 8; // 8 клеток в высоту (вместо 10)
    this.cellSize = 80; // размер одной ячейки в пиксела (вместо 60)
    this.isVisible = false;
    this.isInBattle = false; // Флаг боевой локации - блокирует движение
    this.currentBattleEnemyPos = null; // Позиция текущего врага в бою
    this.isFleeingBattle = false; // Флаг для предотвращения множественных вызовов бегства
    this.exploredCells = new Map(); // Map для хранения разведанных клеток и их объектов
    this.battleCallbacks = null; // Коллбэки для боевых локаций из мира
    this.externalCallbacks = null; // ВНЕШНИЕ коллбэки для управления переходом в меню из LocationsManager
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
            <!-- Информация о персонаже и статистике -->
            <div class="location-screen__header" id="locationHeader">
              <div class="header-stats">
                <div class="player-portrait">
                  <img id="playerPortraitImg" src="" alt="Character" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;">
                </div>
                <div class="stats-container">
                  <div class="stat-row">
                    <span class="stat-label">HP:</span>
                    <div class="stat-bar hp-bar">
                      <div id="playerHpBar" class="stat-fill" style="background: #e74c3c;"></div>
                    </div>
                    <span id="playerHpTextLocation" class="stat-text">100/100</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Mana:</span>
                    <div class="stat-bar mana-bar">
                      <div id="playerManaBar" class="stat-fill" style="background: #3498db;"></div>
                    </div>
                    <span id="playerManaTextLocation" class="stat-text">50/50</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Lvl <span id="playerLevel">1</span></span>
                    <div class="stat-bar exp-bar">
                      <div id="playerExpBar" class="stat-fill" style="background: #27ae60;"></div>
                    </div>
                    <span id="playerExpText" class="stat-text">0/100</span>
                  </div>
                </div>
                <div class="location-stats" id="locationStats"></div>
              </div>
            </div>

            <!-- Canvas для отображения локации -->
            <div class="location-screen__viewport" id="locationViewport">
              <canvas id="locationCanvas" style="width: 100%; height: 100%; display: block; border-radius: 8px; background: #1a1a1a;"></canvas>
            </div>

            <!-- Управление -->
            <div class="location-screen__controls">
              <div class="controls-grid">
                <button class="control-btn up" id="btnUp" title="Вверх">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2l8 8h-6v12h-4V10H4l8-8z"/></svg>
                </button>
                <div class="controls-spacer"></div>
                <button class="control-btn left" id="btnLeft" title="Влево">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M22 12l-8-8v6H2v4h12v6l8-8z" transform="rotate(180 12 12)"/></svg>
                </button>
                <button class="control-btn down" id="btnDown" title="Вниз">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 22l-8-8h6V2h4v12h6l-8 8z"/></svg>
                </button>
                <button class="control-btn right" id="btnRight" title="Вправо">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M2 12l8-8v6h12v4H10v6l-8-8z"/></svg>
                </button>
              </div>
              <button class="game-screen__exit-btn" id="locationExitBtn">
                <img src="/trp/assets/img/выход.png" alt="Назад">
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(locationScreen);
    }

    // Получаем canvas элемент
    if (!this.canvas) {
      this.canvas = document.getElementById('locationCanvas');
      this.ctx = this.canvas?.getContext('2d');
      this.resizeCanvas();
    }
  }

  /**
   * Пересчитывает размеры canvas
   */
  resizeCanvas() {
    if (!this.canvas) return;

    const viewport = this.canvas.parentElement;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    // Пересчитываем размер ячейки на основе размера canvas
    const availableWidth = this.canvas.width;
    const availableHeight = this.canvas.height;
    
    this.cellSize = Math.min(
      Math.floor(availableWidth / this.viewWidth),
      Math.floor(availableHeight / this.viewHeight)
    );
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
   * Отключает кнопки управления
   */
  disableMovementButtons() {
    const buttons = ['btnUp', 'btnDown', 'btnLeft', 'btnRight'];
    buttons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
    });
  }

  /**
   * Включает кнопки управления
   */
  enableMovementButtons() {
    const buttons = ['btnUp', 'btnDown', 'btnLeft', 'btnRight'];
    buttons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    });
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
    // Блокируем движение если идёт боевая локация
    if (this.isInBattle) {
      Logger.log('Вы не можете двигаться во время боя!');
      return;
    }

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
    
    // Устанавливаем флаг боевой локации
    this.isInBattle = true;
    
    // Отключаем кнопки управления
    this.disableMovementButtons();
    
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
      const locationId = locationGenerator.currentLocation?.locationId || 'location-encounter';
      BattleEngine.startBattle(enemyData, () => {
        // Callback при победе - используем внутренний метод
        this.onBattleVictory();
      }, () => {
        // Callback при поражении - используем внутренний метод
        this.onBattleDefeat();
      }, () => {
        // Callback при бегстве - используем внутренний метод
        this.onBattleFlee();
      }, locationId);
    }).catch(err => Logger.error('Ошибка загрузки BattleEngine:', err));
  }

  /**
   * Очищает врага из разведанных клеток по его позиции
   */
  clearEnemyFromExplored(enemyPos) {
    if (!enemyPos) return;
    
    const cellKey = `${enemyPos.x},${enemyPos.y}`;
    // Если клетка была разведана с врагом, удаляем врага из разведанной памяти
    if (this.exploredCells.has(cellKey)) {
      const exploredObject = this.exploredCells.get(cellKey);
      if (exploredObject.type === 'enemy') {
        // Удаляем врага из разведанных клеток
        this.exploredCells.delete(cellKey);
      }
    }
  }

  /**
   * Генерирует данные врага для боя
   */
  generateEnemyData(enemy) {
    // Если враг имеет templateData из боевой локации, используем его
    if (enemy.templateData) {
      return {
        name: enemy.templateData.name,
        hp: enemy.templateData.hp,
        maxHp: enemy.templateData.hp,
        attack: enemy.templateData.attack,
        damage: enemy.templateData.attack,
        level: enemy.templateData.level || 1,
        image: enemy.templateData.image || null, // Только имя файла
        reward: enemy.templateData.reward // Сохраняем дроп
      };
    }
    
    // Fallback для обычных врагов без templateData
    const baseEnemies = {
      'unknown': {
        name: 'Враг',
        hp: 50,
        maxHp: 50,
        attack: 10,
        damage: 10,
        level: 1,
        image: null
      }
    };
    
    const enemyType = baseEnemies[enemy.type] || {
      name: 'Неизвестный враг',
      hp: 30,
      maxHp: 30,
      attack: 8,
      damage: 8,
      level: 1,
      image: null
    };
    
    return enemyType;
  }

  /**
   * Победа в бою - враг удаляется с локации
   */
  onBattleVictory() {
    Logger.log('Победа в бою!');
    
    // Сбрасываем флаг боевой локации
    this.isInBattle = false;
    this.enableMovementButtons();
    
    // Удаляем врага с локации по его сохраненной позиции
    if (this.currentBattleEnemyPos && locationGenerator.currentLocation) {
      locationGenerator.currentLocation.objects = locationGenerator.currentLocation.objects.filter(obj =>
        !(obj.type === 'enemy' && obj.x === this.currentBattleEnemyPos.x && obj.y === this.currentBattleEnemyPos.y)
      );
      // Очищаем врага из разведанных клеток
      this.clearEnemyFromExplored(this.currentBattleEnemyPos);
      this.currentBattleEnemyPos = null; // Сбрасываем позицию врага
    }
    
    // Закрываем боевой экран
    const battleScreen = document.getElementById('battle-screen');
    if (battleScreen) {
      battleScreen.classList.add('hidden');
      battleScreen.classList.remove('visible');
    }
    
    // Показываем экран локации для продолжения исследования
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
    
    // Сбрасываем флаг боевой локации
    this.isInBattle = false;
    this.enableMovementButtons();
    
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
    
    // Сбрасываем флаг боевой локации при бегстве
    this.isInBattle = false;
    this.enableMovementButtons();
    
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
      // Очищаем врага из разведанных клеток
      this.clearEnemyFromExplored(this.currentBattleEnemyPos);
      this.currentBattleEnemyPos = null; // Сбрасываем позицию врага
    }
    
    // Проверяем достигли ли мы 5 ранений ПЕРЕД показом уведомления о бегстве
    if (gameState.player.wounds >= 5) {
      this.showDeathNotification();
      this.isFleeingBattle = false; // Сбрасываем флаг
      return;
    }
    
    // Закрываем боевой экран
    const battleScreen = document.getElementById('battle-screen');
    if (battleScreen) {
      battleScreen.classList.add('hidden');
      battleScreen.classList.remove('visible');
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

    // Сразу же покидаем генерируемую локацию
    this.exitToMenu();

    // Через 3 секунды очищаем состояние и ранения полностью
    setTimeout(() => {
      notification.remove();
      // Убедительная очистка состояния локации
      locationGenerator.endLocation();
      this.isVisible = false;
      this.exploredCells.clear();
      // Полная очистка ранений
      gameState.player.wounds = 0;
    }, 3000);
  }

  /**
   * Выход в главное меню
   */
  exitToMenu() {
    // Завершаем локацию
    locationGenerator.endLocation();
    
    // Очищаем ранения при выходе из локации
    gameState.player.wounds = 0;
    
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
    
    // Разрешаем движение при входе на локацию
    this.isInBattle = false;
    
    const screen = document.getElementById('location-screen');
    screen?.classList.remove('hidden');
    screen?.classList.add('visible');
    this.isVisible = true;
    this.render();
  }

  /**
   * Открывает боевую локацию из мира (LocationsManager)
   * @param {string} locationId - ID локации (city, forest, mountains)
   * @param {Array} locationEnemies - Враги из этой локации
   * @param {Function} onExternalVictory - Коллбэк из LocationsManager при победе (возврат в меню)
   * @param {Function} onExternalDefeat - Коллбэк из LocationsManager при поражении (возврат в меню)
   * @param {Function} onExternalFlee - Коллбэк из LocationsManager при бегстве (возврат в меню)
   */
  openBattleLocation(locationId, locationEnemies, onExternalVictory, onExternalDefeat, onExternalFlee) {
    // Очищаем счетчик ранений при входе на локацию
    gameState.player.wounds = 0;
    
    // Генерируем боевую локацию с врагами из этой локации
    locationGenerator.generateBattleLocation(locationId, locationEnemies);
    
    // Восстанавливаем ресурсы игрока
    gameState.restoreResources();
    
    // Сохраняем ВНЕШНИЕ коллбэки из LocationsManager для возврата в меню
    this.externalCallbacks = {
      onVictory: onExternalVictory,
      onDefeat: onExternalDefeat,
      onFlee: onExternalFlee
    };
    
    // ВНУТРЕННИЕ коллбэки для управления локацией
    this.battleCallbacks = {
      onVictory: null, // Будет использован внутренний onBattleVictory()
      onDefeat: null,  // Будет использован внутренний onBattleDefeat()
      onFlee: null     // Будет использован внутренний onBattleFlee()
    };
    
    // Очищаем исследованные клетки и флаг бегства
    this.exploredCells.clear();
    this.isFleeingBattle = false;
    
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

    // Очищаем ранения при выходе из локации
    gameState.player.wounds = 0;

    // Возвращаемся в меню
    const menuScreen = document.getElementById('main-menu-screen');
    menuScreen?.classList.add('visible');
    menuScreen?.classList.remove('hidden');
  }

  /**
   * Рендерит текущее состояние локации на canvas
   */
  render() {
    if (!locationGenerator.currentLocation || !this.canvas || !this.ctx) return;

    this.resizeCanvas();

    const visibleArea = locationGenerator.getVisibleArea(this.viewWidth, this.viewHeight);
    const ctx = this.ctx;
    const cellSize = this.cellSize;
    const visibilityRadius = 3;

    // Очищаем canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Рисуем сетку и объекты
    for (let y = 0; y < this.viewHeight; y++) {
      for (let x = 0; x < this.viewWidth; x++) {
        const screenX = x * cellSize;
        const screenY = y * cellSize;

        const absX = visibleArea.startX + x;
        const absY = visibleArea.startY + y;
        const cellKey = `${absX},${absY}`;

        // Рисуем границы клетки
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, cellSize, cellSize);

        // Проверяем, здесь ли игрок
        if (absX === visibleArea.playerAbsoluteX && absY === visibleArea.playerAbsoluteY) {
          // Подсвечиваем клетку игрока
          ctx.fillStyle = '#3a5a7a';
          ctx.fillRect(screenX, screenY, cellSize, cellSize);
          
          ctx.shadowColor = 'rgba(106, 179, 255, 0.5)';
          ctx.shadowBlur = 8;
          ctx.strokeStyle = '#6ab3ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX, screenY, cellSize, cellSize);
          ctx.shadowColor = 'transparent';

          // Рисуем игрока (картинка класса или fallback)
          this.renderPlayerOnCanvas(ctx, screenX, screenY, cellSize);
        } else {
          // Проверяем расстояние от игрока до этой клетки
          const dx = absX - visibleArea.playerAbsoluteX;
          const dy = absY - visibleArea.playerAbsoluteY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Показываем объекты только в радиусе видимости
          if (distance <= visibilityRadius) {
            const objectOnCell = visibleArea.objects.find(obj => obj.x === absX && obj.y === absY);
            if (objectOnCell) {
              ctx.fillStyle = '#2a3a2a';
              ctx.fillRect(screenX, screenY, cellSize, cellSize);
              
              this.renderObjectOnCanvas(ctx, objectOnCell, screenX, screenY, cellSize);
              
              // Сохраняем разведанную клетку
              this.exploredCells.set(cellKey, objectOnCell);
            } else {
              ctx.fillStyle = '#2a2a2a';
              ctx.fillRect(screenX, screenY, cellSize, cellSize);
            }
          } else {
            // Проверяем, разведана ли эта клетка ранее
            if (this.exploredCells.has(cellKey)) {
              const exploredObject = this.exploredCells.get(cellKey);
              ctx.fillStyle = '#1a2a1a';
              ctx.fillRect(screenX, screenY, cellSize, cellSize);
              ctx.globalAlpha = 0.6;
              this.renderObjectOnCanvas(ctx, exploredObject, screenX, screenY, cellSize);
              ctx.globalAlpha = 1;
            } else {
              // Неразведанные области
              ctx.fillStyle = '#1a1a1a';
              ctx.fillRect(screenX, screenY, cellSize, cellSize);
            }
          }
        }
      }
    }

    this.updateStats();
  }

  /**
   * Рисует объект на canvas
   */
  renderObjectOnCanvas(ctx, objectData, x, y, cellSize) {
    if (!objectData) return;

    if (objectData.image) {
      const img = this.imageCache.getImage(objectData.image);
      if (img) {
        // Рисуем картинку в центре клетки с padding
        const padding = 4;
        const imgSize = cellSize - padding * 2;
        ctx.drawImage(img, x + padding, y + padding, imgSize, imgSize);
      } else {
        // Загружаем картинку если ещё не загружена
        this.imageCache.loadImage(objectData.image).then(() => {
          this.render(); // Перерисовываем когда картинка загрузится
        }).catch(() => {
          // Fallback на текст если не смогли загрузить
          ctx.font = 'bold 30px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ccc';
          ctx.fillText('❓', x + cellSize / 2, y + cellSize / 2);
        });
      }
    }
  }

  /**
   * Рисует игрока на canvas (картинка его класса)
   */
  renderPlayerOnCanvas(ctx, x, y, cellSize) {
    const playerClass = gameState.player.class;
    if (!playerClass) {
      // Fallback если класс не установлен
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText('🧙', x + cellSize / 2, y + cellSize / 2);
      return;
    }

    // Генерируем путь к картинке класса
    const fileName = playerClass.toLowerCase().replace(/ /g, '_');
    const imagePath = `/trp/assets/img/enemies/${fileName}.jpg`;

    const img = this.imageCache.getImage(imagePath);
    if (img) {
      // Рисуем картинку игрока с padding
      const padding = 4;
      const imgSize = cellSize - padding * 2;
      ctx.drawImage(img, x + padding, y + padding, imgSize, imgSize);
    } else {
      // Загружаем картинку если ещё не загружена
      this.imageCache.loadImage(imagePath).then(() => {
        this.render(); // Перерисовываем когда картинка загрузится
      }).catch(() => {
        // Fallback на эмодзи если не смогли загрузить
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText('🧙', x + cellSize / 2, y + cellSize / 2);
      });
    }
  }

  /**
   * Обновляет статистику локации
   */
  updateStats() {
    const player = gameState.player;
    const wounds = player.wounds || 0;
    const hpPenalty = wounds * 10;
    
    // Расчет эффективного HP с учетом ранений
    const maxHp = player.maxHp || 100;
    const currentHp = Math.max(1, Math.round(maxHp * (100 - hpPenalty) / 100));
    const maxMana = player.maxMana || 50;
    const currentMana = player.mana || maxMana;
    
    // Обновляем портрет игрока
    const playerClass = player.class;
    if (playerClass) {
      const fileName = playerClass.toLowerCase().replace(/ /g, '_');
      const imgPath = `/trp/assets/img/enemies/${fileName}.jpg`;
      const portraitImg = document.getElementById('playerPortraitImg');
      if (portraitImg) {
        portraitImg.src = imgPath;
      }
    }
    
    // Обновляем HP полоску
    const hpPercent = (currentHp / maxHp) * 100;
    const hpBar = document.getElementById('playerHpBar');
    const hpText = document.getElementById('playerHpTextLocation');
    if (hpBar) hpBar.style.width = Math.max(0, hpPercent) + '%';
    if (hpText) {
      const newValue = `${currentHp}/${maxHp}`;
      hpText.textContent = newValue;
    }
    
    // Обновляем Mana полоску
    const manaPercent = (currentMana / maxMana) * 100;
    const manaBar = document.getElementById('playerManaBar');
    const manaText = document.getElementById('playerManaTextLocation');
    if (manaBar) manaBar.style.width = Math.max(0, manaPercent) + '%';
    if (manaText) manaText.textContent = `${currentMana}/${maxMana}`;
    
    // Обновляем Level
    const levelEl = document.getElementById('playerLevel');
    if (levelEl) levelEl.textContent = player.level || 1;
    
    // Обновляем Experience полоску
    const currentExp = player.experience || 0;
    const requiredExp = player.requiredExperienceForLevel || 100;
    const expPercent = (currentExp / requiredExp) * 100;
    const expBar = document.getElementById('playerExpBar');
    const expText = document.getElementById('playerExpText');
    if (expBar) expBar.style.width = Math.max(0, expPercent) + '%';
    if (expText) expText.textContent = `${currentExp}/${requiredExp}`;
    
    // Обновляем инфо о ранениях
    const statsDiv = document.getElementById('locationStats');
    if (statsDiv) {
      if (wounds > 0) {
        statsDiv.innerHTML = `<span style="color: #e74c3c;">⚠️ Ранения: ${wounds}/5 (-${hpPenalty}% HP)</span>`;
      } else {
        statsDiv.innerHTML = '';
      }
    }
  }

  /**
   * Запускает тестовую локацию
   */
  startTestLocation() {
    Logger.log('Запуск тестовой локации...');
    this.exploredCells.clear(); // Очищаем разведанные клетки для новой локации
    locationGenerator.generateLocation();
    this.openLocation();
  }
}

export const locationUI = new LocationUI();

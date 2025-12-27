/**
 * ImageCache - система кеширования и предзагрузки картинок
 * Загружает все картинки при инициализации и сохраняет их в памяти для быстрого доступа
 */

export class ImageCache {
  static imageCache = {};
  static isLoading = false;
  static isLoaded = false;

  /**
   * Картинки, которые нужно предзагрузить
   */
  static getImagesToPreload() {
    return {
      // Главное меню
      'мир1.jpg': '/trp/assets/img/мир1.jpg',
      'подземелья1.jpg': '/trp/assets/img/подземелья1.jpg',
      'квест1.jpg': '/trp/assets/img/квест1.jpg',
      'профиль1.jpg': '/trp/assets/img/профиль1.jpg',
      'настройки1.jpg': '/trp/assets/img/настройки1.jpg',
      
      // Локации
      'город.jpg': '/trp/assets/img/город.jpg',
      'лес.jpg': '/trp/assets/img/лес.jpg',
      'горы.jpg': '/trp/assets/img/горы.jpg',
      'пещера.jpg': '/trp/assets/img/пещера.jpg',
      'развалины.jpg': '/trp/assets/img/развалины.jpg',
      'библиотека.jpg': '/trp/assets/img/библиотека.jpg',
      'храм1.jpg': '/trp/assets/img/храм1.jpg',
      
      // Подземелья
      'forest_ruins.png': '/trp/assets/img/forest_ruins.png',
      'crystal_caverns.png': '/trp/assets/img/crystal_caverns.png',
      'dark_temple.png': '/trp/assets/img/dark_temple.png',
      'ancient_library.png': '/trp/assets/img/ancient_library.png',
      
      // Враги с локаций
      'воришка.jpg': '/trp/assets/img/enemies/воришка.jpg',
      'стражник.jpg': '/trp/assets/img/enemies/стражник.jpg',
      'наёмник.jpg': '/trp/assets/img/enemies/наёмник.jpg',
      'волк.jpg': '/trp/assets/img/enemies/волк.jpg',
      'разбойник.jpg': '/trp/assets/img/enemies/разбойник.jpg',
      'тень.jpg': '/trp/assets/img/enemies/тень.jpg',
      'гигант.jpg': '/trp/assets/img/enemies/гигант.jpg',
      'ледяной_дух.jpg': '/trp/assets/img/enemies/ледяной_дух.jpg',
      'дракончик.jpg': '/trp/assets/img/enemies/дракончик.jpg',
      
      // Враги из подземелий (по умолчанию нет картинок, но добавляем для полноты)
      'воин.jpg': '/trp/assets/img/enemies/воин.jpg',
      'вор.jpg': '/trp/assets/img/enemies/вор.jpg',
      'лучник.jpg': '/trp/assets/img/enemies/лучник.jpg',
      'маг.jpg': '/trp/assets/img/enemies/маг.jpg',
      'танк.jpg': '/trp/assets/img/enemies/танк.jpg',
      'целитель.jpg': '/trp/assets/img/enemies/целитель.jpg',
      
      // Способности
      'клич.jpg': '/trp/assets/img/клич.jpg',
      'удар.jpg': '/trp/assets/img/удар.jpg',
      'огненный_шар.jpg': '/trp/assets/img/огненный_шар.jpg',
      'маг_щит.jpg': '/trp/assets/img/маг_щит.jpg',
      'скорост_залп.jpg': '/trp/assets/img/скорост_залп.jpg',
      'точн_выстрел.jpg': '/trp/assets/img/точн_выстрел.jpg',
      'щит_удар.jpg': '/trp/assets/img/щит_удар.jpg',
      'послед_рубеж.jpg': '/trp/assets/img/послед_рубеж.jpg',
      'исц.jpg': '/trp/assets/img/исц.jpg',
      'прокл_слаб.jpg': '/trp/assets/img/прокл_слаб.jpg',
      'уход_тень.jpg': '/trp/assets/img/уход_тень.jpg',
      'быстрая_атака.jpg': '/trp/assets/img/быстрая_атака.jpg',
      
      // Предметы
      'здоровья.png': '/trp/assets/img/здоровья.png',
      'маны.png': '/trp/assets/img/маны.png',
      'мана.png': '/trp/assets/img/мана.png',
      
      // Фоны
      'фон.jpg': '/trp/assets/img/фон.jpg',
      'background.jpg': '/trp/assets/img/background.jpg',
      'крафт1.jpg': '/trp/assets/img/крафт1.jpg',
    };
  }

  /**
   * Предзагружает все картинки
   */
  static async preloadImages() {
    if (this.isLoading || this.isLoaded) {
      return Promise.resolve();
    }

    this.isLoading = true;
    const imagesToLoad = this.getImagesToPreload();
    const loadPromises = [];

    console.log('[ImageCache] Начинаю предзагрузку картинок...');

    for (const [name, url] of Object.entries(imagesToLoad)) {
      const promise = this.loadImage(url)
        .then(img => {
          this.imageCache[name] = img;
          console.log(`[ImageCache] Загружена: ${name}`);
        })
        .catch(err => {
          console.warn(`[ImageCache] Ошибка загрузки ${name}:`, err);
          // Продолжаем загрузку остальных картинок даже при ошибке
        });

      loadPromises.push(promise);
    }

    try {
      await Promise.all(loadPromises);
      this.isLoaded = true;
      this.isLoading = false;
      console.log('[ImageCache] Все картинки успешно предзагружены!');
      return true;
    } catch (err) {
      console.error('[ImageCache] Ошибка при предзагрузке картинок:', err);
      this.isLoading = false;
      return false;
    }
  }

  /**
   * Загружает одну картинку
   */
  static loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Не удалось загрузить: ${url}`));
      img.src = url;
    });
  }

  /**
   * Получает путь к картинке по имени
   */
  static getImageUrl(imageName) {
    const imagesToLoad = this.getImagesToPreload();
    return imagesToLoad[imageName] || '';
  }

  /**
   * Проверяет, загружена ли картинка в кеш
   */
  static isCached(imageName) {
    return imageName in this.imageCache;
  }

  /**
   * Возвращает загруженную картинку из кеша
   */
  static getCachedImage(imageName) {
    return this.imageCache[imageName] || null;
  }

  /**
   * Очищает кеш
   */
  static clearCache() {
    this.imageCache = {};
    this.isLoaded = false;
    console.log('[ImageCache] Кеш очищен');
  }
}

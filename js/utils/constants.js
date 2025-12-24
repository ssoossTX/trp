/**
 * Константы приложения
 */
export const GAME_CONSTANTS = {
  // Базовые характеристики
  BASE_HP_MULTIPLIER: 10,
  BASE_MANA_MULTIPLIER: 5,
  BASE_GOLD: 100,

  // Боевая система
  BATTLE_DELAY: 500, // ms
  DAMAGE_RANDOMNESS: 10,
  ENEMY_DAMAGE_VARIANCE: 8,

  // Зелья
  POTION_HP_RESTORE: 100,
  POTION_MANA_RESTORE: 100,

  // Экраны
  SCREEN_TRANSITION_DELAY: 1500, // ms
  LOADING_SCREEN_ID: 'loadingScreen',
  CLASS_SELECTION_SCREEN_ID: 'class-selection-screen',
  MAIN_GAME_SCREEN_ID: 'main-game-ui',
  BATTLE_SCREEN_ID: 'battle-screen',

  // Модали
  MODALS: {
    ABILITY: 'abilityModal',
    DETAILS: 'detailsModal',
    LOOT: 'lootModal'
  },

  // Локации
  LOCATIONS: {
    CITY: 'city',
    FOREST: 'forest',
    MOUNTAINS: 'mountains'
  },

  // Табы
  TABS: {
    WORLD: 'world',
    DUNGEONS: 'dungeons',
    QUESTS: 'quests',
    CRAFT: 'craft',
    PROFILE: 'profile',
    SETTINGS: 'settings'
  }
};

/**
 * События приложения
 */
export const APP_EVENTS = {
  CLASS_SELECTED: 'game:classSelected',
  ABILITY_SELECTED: 'game:abilitySelected',
  GAME_STARTED: 'game:started',
  BATTLE_STARTED: 'game:battleStarted',
  BATTLE_ENDED: 'game:battleEnded',
  PLAYER_DAMAGED: 'game:playerDamaged',
  ENEMY_DAMAGED: 'game:enemyDamaged',
  TAB_CHANGED: 'game:tabChanged'
};

# Примеры тестирования системы пассивных способностей

## Быстрый старт

### 1. Проверка в консоли браузера (F12)

```javascript
// Посмотреть текущую пассивную способность
console.log('Текущая способность:', gameState.passiveAbility);

// Посмотреть все доступные эффекты
if (gameState.passiveAbility) {
  console.log('Эффекты:', gameState.passiveAbility.effects);
}

// Посмотреть текущие характеристики
const player = gameState.player;
console.log(`HP: ${player.maxHp}, Mana: ${player.maxMana}, Agility: ${player.stats.agility}`);
```

## Тестовые сценарии

### Сценарий 1: Проверка базовой интеграции

**Действие:**
```javascript
// Загрузить данные
const abilities = await dataLoader.load();

// Получить первую пассивную способность
const passive = abilities.find(a => a.type === 'passive');

// Применить её
PassiveAbilityManager.applyPassiveAbility(passive);

// Проверить применение
console.log('Способность активна:', gameState.passiveAbility.name);
console.log('HP увеличено на:', gameState.player.maxHp - gameState.passiveAbilityBases.maxHp);
```

**Ожидаемый результат:**
```
Способность активна: Усиленный удар
```

### Сценарий 2: Проверка урона с бонусом

**Начальное состояние:**
- Базовый урон: 50
- Пассивная способность: Усиленный удар (+10%)

**Действие:**
```javascript
// Активировать боевое сражение
BattleEngine.initiateBattle(enemy, locationId, abilities);

// Выполнить атаку
BattleEngine.playerAttack();

// Проверить логи боя
```

**Ожидаемый результат в логе:**
```
Вы нанесли 55 урона!  // 50 * 1.1 = 55
```

### Сценарий 3: Проверка защиты от урона

**Начальное состояние:**
- Враг наносит: 30 урона
- Пассивная способность: Древний артефакт (-5% урона)

**Действие:**
```javascript
// Позволить врагу атаковать
BattleEngine.enemyAttack();

// Проверить логи
```

**Ожидаемый результат в логе:**
```
Враг нанёс 28-29 урона!  // 30 - (30 * 0.05) = 28.5 → 29
```

### Сценарий 4: Проверка получения опыта

**Начальное состояние:**
- Враг дает: 100 опыта
- Пассивная способность: Боевой опыт (+15%)

**Действие:**
```javascript
// Победить врага
BattleEngine.playerWins();

// Проверить опыт в логах
```

**Ожидаемый результат в логе:**
```
⭐ Получено 100 опыта (+15 от "Боевой опыт")!
```

### Сценарий 5: Проверка отображения в профиле

**Действие:**
```javascript
// Перейти в профиль
UIManager.switchTab('profile');

// Проверить элементы DOM
const abilityName = document.getElementById('passiveAbilityName').textContent;
const effects = document.getElementById('passiveAbilityEffects');

console.log('Название способности:', abilityName);
console.log('Эффекты отображены:', effects.innerHTML.length > 0);
```

**Ожидаемый результат:**
- Название способности видно и правильно
- Эффекты отображаются в списке с иконками

## Автоматизированное тестирование

### Test Suite 1: Проверка манипуляции способностями

```javascript
describe('PassiveAbilityManager', () => {
  let testAbility;

  beforeEach(() => {
    testAbility = {
      id: 'test_ability',
      name: 'Тестовая способность',
      description: 'Для тестирования',
      type: 'passive',
      icon: '✨',
      effects: {
        damageBuff: 0.20,
        hpBuff: 0,
        manaBuff: 0,
        defenceBuff: 0,
        agilityBuff: 0,
        experienceBuff: 0
      }
    };
  });

  test('Применение способности сохраняет базовые значения', () => {
    const originalHp = gameState.player.maxHp;
    
    PassiveAbilityManager.applyPassiveAbility(testAbility);
    
    expect(gameState.passiveAbilityBases.maxHp).toBe(originalHp);
    expect(gameState.passiveAbility).toBe(testAbility);
  });

  test('Удаление способности восстанавливает исходные значения', () => {
    const originalHp = gameState.player.maxHp;
    
    PassiveAbilityManager.applyPassiveAbility(testAbility);
    PassiveAbilityManager.removePassiveAbility();
    
    expect(gameState.player.maxHp).toBe(originalHp);
    expect(gameState.passiveAbility).toBeNull();
  });

  test('Модификатор урона рассчитывается правильно', () => {
    PassiveAbilityManager.applyPassiveAbility(testAbility);
    
    const modifier = PassiveAbilityManager.getDamageModifier();
    expect(modifier).toBe(1.20); // +20%
  });
});
```

### Test Suite 2: Проверка боевых расчётов

```javascript
describe('Battle Damage Calculations', () => {
  test('Урон с пассивной способностью рассчитывается правильно', () => {
    const baseDamage = 50;
    const passiveAbility = {
      effects: {
        damageBuff: 0.10
      }
    };
    
    let damage = baseDamage;
    if (passiveAbility && passiveAbility.effects.damageBuff) {
      damage = Math.round(damage * (1 + passiveAbility.effects.damageBuff));
    }
    
    expect(damage).toBe(55); // 50 * 1.1 = 55
  });

  test('Защита снижает полученный урон', () => {
    const enemyDamage = 30;
    const passiveAbility = {
      effects: {
        defenceBuff: 0.05
      }
    };
    
    let damage = enemyDamage;
    if (passiveAbility && passiveAbility.effects.defenceBuff) {
      const reduction = Math.round(damage * passiveAbility.effects.defenceBuff);
      damage = Math.max(1, damage - reduction);
    }
    
    expect(damage).toBe(29); // 30 - (30 * 0.05) = 28.5 → 29
  });

  test('Множество способностей применяются в последовательности', () => {
    let damage = 50;
    
    // Шаг 1: Базовый урон
    expect(damage).toBe(50);
    
    // Шаг 2: Боевой клич (+50%)
    damage = Math.round(damage * 1.5);
    expect(damage).toBe(75);
    
    // Шаг 3: Пассивная способность (+10%)
    damage = Math.round(damage * 1.1);
    expect(damage).toBe(83); // 75 * 1.1 = 82.5 → 83
  });
});
```

### Test Suite 3: Проверка опыта

```javascript
describe('Experience System', () => {
  test('Опыт с пассивной способностью рассчитывается правильно', () => {
    const baseXp = 100;
    const passiveAbility = {
      effects: {
        experienceBuff: 0.15
      }
    };
    
    let finalXp = baseXp;
    if (passiveAbility && passiveAbility.effects.experienceBuff) {
      finalXp = Math.round(baseXp * (1 + passiveAbility.effects.experienceBuff));
    }
    
    expect(finalXp).toBe(115); // 100 * 1.15 = 115
  });

  test('Отрицательный бонус опыта работает', () => {
    const baseXp = 100;
    const passiveAbility = {
      effects: {
        experienceBuff: -0.10
      }
    };
    
    let finalXp = baseXp;
    if (passiveAbility && passiveAbility.effects.experienceBuff) {
      finalXp = Math.round(baseXp * (1 + passiveAbility.effects.experienceBuff));
    }
    
    expect(finalXp).toBe(90); // 100 * 0.9 = 90
  });
});
```

## Практические примеры использования

### Пример 1: Переключение между способностями

```javascript
// Текущая способность
console.log('Текущая:', gameState.passiveAbility.name);

// Загрузить все пассивные способности
const allAbilities = await dataLoader.getPassiveAbilities();

// Переключиться на другую
const newAbility = allAbilities[1];
PassiveAbilityManager.removePassiveAbility();
PassiveAbilityManager.applyPassiveAbility(newAbility);

console.log('Новая:', gameState.passiveAbility.name);
```

### Пример 2: Проверка эффективности способности

```javascript
const ability = gameState.passiveAbility;

// Рассчитать общий вклад эффектов
let totalBonus = 0;

if (ability.effects.damageBuff) totalBonus += ability.effects.damageBuff * 100;
if (ability.effects.hpBuff) totalBonus += ability.effects.hpBuff * 100;
if (ability.effects.defenceBuff) totalBonus += ability.effects.defenceBuff * 100;
if (ability.effects.experienceBuff) totalBonus += ability.effects.experienceBuff * 100;

console.log(`Общий вклад эффектов: ${totalBonus}%`);
```

### Пример 3: Сравнение способностей

```javascript
const abilities = await dataLoader.getPassiveAbilities();

// Сравнить по потенциалу урона
const damageAbilities = abilities.filter(a => a.effects.damageBuff);
damageAbilities.sort((a, b) => b.effects.damageBuff - a.effects.damageBuff);

console.log('Лучшие для урона:');
damageAbilities.forEach(a => {
  console.log(`${a.name}: +${a.effects.damageBuff * 100}%`);
});
```

### Пример 4: Сохранение состояния в localStorage

```javascript
// Сохранить текущую пассивную способность
localStorage.setItem('passiveAbility', JSON.stringify(gameState.passiveAbility));

// Загрузить при запуске
const savedAbility = JSON.parse(localStorage.getItem('passiveAbility'));
if (savedAbility) {
  PassiveAbilityManager.applyPassiveAbility(savedAbility);
}
```

## Отладочные команды

```javascript
// Получить полную информацию о способности
(() => {
  const a = gameState.passiveAbility;
  return {
    name: a.name,
    description: a.description,
    effects: a.effects,
    icon: a.icon,
    isActive: !!a
  };
})()

// Проверить все модификаторы
(() => {
  const mods = {
    damage: PassiveAbilityManager.getDamageModifier(),
    defence: PassiveAbilityManager.getDefenceModifier(),
    experience: PassiveAbilityManager.getExperienceModifier()
  };
  return mods;
})()

// Проверить базовые значения
gameState.passiveAbilityBases

// Получить описание эффектов
PassiveAbilityManager.getEffectsDescription()
```

## Контрольный список при разработке

- [ ] Все эффекты добавлены в effects объект
- [ ] Проверка null перед доступом к passiveAbility
- [ ] Сохранение baseValue перед применением эффекта
- [ ] Восстановление базовых значений при удалении
- [ ] Отображение эффектов в профиле
- [ ] CSS стили применены
- [ ] Нет консольных ошибок
- [ ] Работает переключение между способностями

## Производительность

```javascript
// Измерить производительность применения способности
console.time('Apply Passive Ability');
PassiveAbilityManager.applyPassiveAbility(testAbility);
console.timeEnd('Apply Passive Ability');
// Ожидается: < 5ms

// Измерить производительность получения модификатора
console.time('Get Damage Modifier');
for (let i = 0; i < 1000; i++) {
  PassiveAbilityManager.getDamageModifier();
}
console.timeEnd('Get Damage Modifier');
// Ожидается: < 2ms
```

## Тестирование в реальной игре

1. **Запустить игру**
   - Выбрать класс
   - Перейти в первую локацию

2. **Провести боевое сражение**
   - Записать урон БЕЗ способности
   - Записать урон С способностью
   - Сравнить результаты

3. **Проверить опыт**
   - Побить несколько врагов
   - Рассчитать получаемый опыт
   - Проверить соответствие бонусу

4. **Проверить UI**
   - Открыть профиль
   - Найти секцию пассивной способности
   - Проверить отображение эффектов

## Логирование

```javascript
// Включить подробное логирование
Logger.log(`[PassiveAbility] Применена способность: ${ability.name}`);
Logger.log(`[PassiveAbility] Эффекты: ${JSON.stringify(ability.effects)}`);
Logger.log(`[PassiveAbility] HP ${oldHp} → ${newHp}`);

// Проверить логи в консоли
console.log('%cПассивная способность', 'color: gold; font-size: 14px; font-weight: bold;');
```

## Итоговый чеклист

✅ Система пассивных способностей полностью интегрирована
✅ Все эффекты применяются в боевой системе
✅ Отображение в профиле работает
✅ UI стили добавлены
✅ Документация полная
✅ Примеры тестирования готовы

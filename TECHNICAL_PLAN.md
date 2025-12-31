# Technical Plan: Location-Based Battle Generation Integration

## Overview
Replace the current simple LocationsManager battle flow (random single enemy → BattleUI) with a location-based system (generated location grid → encounter enemy → location-style battle with callbacks).

---

## 1. FILE MODIFICATIONS NEEDED

### A. LocationGenerator.js
**New method to add:**
- `generateLocationBattle(locationId, locationEnemies)`
  - Takes locationId (e.g., 'city', 'forest', 'mountains') and enemy templates array from locations.json
  - Generates 45x45 grid with procedural enemies from that location type
  - **Key change:** Instead of generic `{ type: 'enemy', emoji: '👹' }` objects, enemies should carry:
    - `templateData`: Reference to original enemy template (name, hp, attack, reward)
    - `stats`: Generated instance data merged with template data
    - This preserves loot drops (rewards.gold, rewards.experience)

### B. LocationUI.js
**Modifications:**
- Add parameter to `openLocation(locationId, locationBattleCallbacks)` 
  - Accept locationId and three callbacks: onVictory, onDefeat, onFlee
  - Store these callbacks as instance properties for use in battle resolution
- Modify `startBattleWithEnemy(enemy)`:
  - Pass template-enriched enemy data to BattleEngine.startBattle()
  - Extract reward info from enemy.templateData.reward before battle starts
  - Register the callback handlers with the battle system
- Modify callback handlers:
  - `onBattleVictory()`: Should handle gold/xp from enemy.templateData.reward
  - `onBattleDefeat()`: Currently shows notification; keep as-is
  - `onBattleFlee()`: Currently shows wound notification; keep as-is
- **Remove:** `startTestLocation()` method (or keep as internal dev helper, not exposed)

### C. LocationsManager.js
**Key changes to startExploration():**
- Replace current flow:
  ```
  getRandomEnemy() → BattleEngine.initiateBattle() → BattleUI.show()
  ```
  With:
  ```
  locationGenerator.generateLocationBattle(locationId, location.enemies)
  → locationUI.openLocation(locationId, { onVictory, onDefeat, onFlee })
  ```
- Create three static callback methods:
  - `onLocationBattleVictory()`: Handle rewards + location exit cleanup
  - `onLocationBattleDefeat()`: Return to main menu
  - `onLocationBattleFlee()`: Stay in location, apply wound penalty
- Preserve `restoreResources()` call before starting
- Store locationId reference for callback context

### D. BattleEngine.js
**No major changes to core logic, but:**
- `startBattle(enemy, onVictory, onDefeat, onFlee)` already exists and stores callbacks
- Ensure callbacks are invoked correctly in:
  - `playerWins()` → calls `onVictory`
  - `playerLoses()` → calls `onDefeat`
  - `flee()` → calls `onFlee`
- Verify reward handling in `playerWins()` uses enemy.reward structure

### E. UIManager.js
**Changes:**
- Remove the settings button that triggers `locationUI.startTestLocation()`
- Find and remove the `testLocationBtn` event listener initialization

---

## 2. DATA FLOW CHANGES

### Current Flow (Simple Battle):
```
User clicks "Исследовать" on location modal
    ↓
LocationsManager.startExploration(locationId)
    ↓
Get random enemy from location.enemies
    ↓
BattleEngine.initiateBattle(randomEnemy, locationId, abilities)
    ↓
BattleUI.show() + battle loop
    ↓
OnWin: Reward applied globally
OnLose: Game over
```

### New Flow (Location-Based Battle):
```
User clicks "Исследовать" on location modal
    ↓
LocationsManager.startExploration(locationId)
    ↓
LocationGenerator.generateLocationBattle(locationId, location.enemies)
    ↓
Returns: { location grid, enemy templates embedded in objects }
    ↓
LocationUI.openLocation(locationId, callbacks)
    ↓
User navigates grid, encounters enemy at position
    ↓
LocationUI.startBattleWithEnemy(enemy with templateData)
    ↓
BattleEngine.startBattle(enemyData, onVictory, onDefeat, onFlee)
    ↓
Battle loop with callbacks
    ↓
OnVictory: LocationUI.onBattleVictory() → remove enemy from grid → return to location
OnDefeat: LocationUI.onBattleDefeat() → close location, return to menu
OnFlee: LocationUI.onBattleFlee() → apply wound, show notification, stay in location
```

---

## 3. METHOD SIGNATURES

### LocationGenerator.generateLocationBattle(locationId, locationEnemies)
```javascript
/**
 * @param {string} locationId - Type ID ('city', 'forest', 'mountains')
 * @param {Array} locationEnemies - Array of enemy templates from locations.json
 * @returns {Object} Location object with embedded enemy templates
 * 
 * Returns structure:
 * {
 *   width: 45,
 *   height: 45,
 *   cellSize: 40,
 *   objects: [
 *     { type: 'enemy', x: 10, y: 15, emoji: '👹', 
 *       id: 'enemy_10_15',
 *       templateData: { name, hp, attack, reward: { gold, experience } }
 *     },
 *     { type: 'tree', x: 5, y: 8, emoji: '🌲', id: 'tree_5_8' },
 *     { type: 'stone', x: 20, y: 20, emoji: '🪨', id: 'stone_20_20' }
 *   ],
 *   playerX: 22,
 *   playerY: 22,
 *   locationId: 'city'
 * }
 */
```

### LocationUI.openLocation(locationId, locationBattleCallbacks)
```javascript
/**
 * @param {string} locationId - Current location type
 * @param {Object} locationBattleCallbacks - Battle event handlers
 *   {
 *     onVictory: Function - Called when player wins
 *     onDefeat: Function - Called when player loses
 *     onFlee: Function - Called when player flees
 *   }
 */
```

### LocationUI.startBattleWithEnemy(enemy)
```javascript
/**
 * @param {Object} enemy - Enemy object with embedded templateData
 * {
 *   type: 'enemy',
 *   x: number,
 *   y: number,
 *   emoji: '👹',
 *   id: string,
 *   templateData: {
 *     name: string,
 *     hp: number,
 *     attack: number,
 *     reward: { gold: number, experience: number }
 *   }
 * }
 */
```

### LocationsManager.startExploration(locationId)
```javascript
/**
 * Unchanged signature, but changes internal implementation:
 * - Calls LocationGenerator.generateLocationBattle()
 * - Calls LocationUI.openLocation() with callbacks
 * - LocationUI handles enemy encounters and battle callbacks
 */
```

### LocationsManager callback methods
```javascript
static onLocationBattleVictory() 
// - Extract reward from enemy templateData (already passed by LocationUI)
// - Update gameState with gold/xp
// - Clean up location UI

static onLocationBattleDefeat()
// - Close location
// - Return to main menu
// - Show game over screen

static onLocationBattleFlee()
// - Called by LocationUI when flee callback fires
// - Location remains open, player stays in position
// - Wound counter already managed by LocationUI
```

---

## 4. CALLBACK FLOW

### Battle Callbacks Registration Path:
```
LocationUI.openLocation() stores { onVictory, onDefeat, onFlee } as instance properties
    ↓
User encounters enemy at grid position
    ↓
LocationUI.startBattleWithEnemy() calls:
  BattleEngine.startBattle(enemyData, 
    this.onVictory.bind(this),
    this.onDefeat.bind(this), 
    this.onFlee.bind(this))
    ↓
BattleEngine stores these callbacks internally
    ↓
Battle progresses...
    ↓
BattleEngine.playerWins() → calls callback(onVictory)
  BattleEngine.playerLoses() → calls callback(onDefeat)
  BattleEngine.flee() → calls callback(onFlee)
    ↓
LocationUI methods execute → handle location state cleanup/rewards
```

### Specific Callback Implementations:

**onBattleVictory (in LocationUI):**
```
1. Receive enemy data with templateData.reward
2. (Note: GameState may already have applied rewards in BattleEngine.playerWins())
3. Remove enemy from locationGenerator.currentLocation.objects
4. Clear from exploredCells Map
5. Update location render
6. Continue location exploration
```

**onBattleDefeat (in LocationUI):**
```
1. Show death notification
2. Close location UI
3. Return to main menu
4. Reset location state
```

**onBattleFlee (in LocationUI):**
```
1. Apply wound penalty (gameState.player.wounds++)
2. Reset player position to safe distance
3. Show flee notification with wound counter
4. Keep location open, allow continued exploration
```

---

## 5. MIGRATION PATH

### Phase 1: Prepare LocationGenerator
1. Add `generateLocationBattle(locationId, locationEnemies)` method
2. Modify `generateObjects()` to:
   - Accept locationEnemies array as parameter
   - When placing enemy object, embed the corresponding template from locationEnemies
   - Store: `templateData: selectedEnemyTemplate`
3. Update `generateLocation()` to be called by generateLocationBattle

### Phase 2: Prepare LocationUI
1. Add callback storage properties to constructor
2. Modify `openLocation()` signature to accept locationId and callbacks
3. Modify `startBattleWithEnemy()` to:
   - Store currentBattleEnemyPos with template data preserved
   - Pass callbacks correctly to BattleEngine.startBattle()
4. Verify `onBattleVictory/Defeat/Flee` properly handle rewards and state cleanup

### Phase 3: Refactor LocationsManager
1. Create three callback methods: `onLocationBattleVictory/Defeat/Flee`
2. Modify `startExploration()`:
   ```javascript
   const location = dataLoader.getLocationById(locationId);
   this.closeLocationModal();
   gameState.restoreResources();
   
   locationGenerator.generateLocationBattle(locationId, location.enemies);
   locationUI.openLocation(locationId, {
     onVictory: this.onLocationBattleVictory.bind(this),
     onDefeat: this.onLocationBattleDefeat.bind(this),
     onFlee: this.onLocationBattleFlee.bind(this)
   });
   ```
3. Implement callback methods to handle:
   - Victory: Reward application + location cleanup
   - Defeat: Menu return
   - Flee: Wound application (already handled in LocationUI)

### Phase 4: Clean Up UI
1. Find and remove testLocationBtn from settings HTML
2. Remove corresponding event listener in UIManager.js
3. Keep `startTestLocation()` method in LocationUI as internal dev helper (not exposed)

### Phase 5: Testing & Validation
1. Test full exploration flow: modal → location generation → enemy encounter
2. Verify enemy stats from locations.json are preserved
3. Test win/lose/flee callbacks restore proper game state
4. Confirm rewards (gold, xp) are correctly applied from templateData
5. Verify wounds accumulate during location exploration

---

## 6. EDGE CASES & CONSIDERATIONS

### Enemy Rewards Preservation
- **Problem:** locations.json enemies have `reward: { gold, experience }`
- **Solution:** Embed templateData in generated enemy objects so LocationUI can pass it through to battle system
- **Validation:** After battle win, verify gold/xp match the original enemy template values

### Multiple Enemy Encounters in One Location
- Each enemy is generated as separate object on grid
- BattleEngine should apply reward for each individual enemy defeated
- locationUI removes defeated enemy from grid, continues exploration

### Fled Enemies
- Enemy remains on grid if player flees
- Player gets wound penalty but location continues
- Same enemy can be encountered again

### Level Requirements
- Current location.requiredLevel is checked before entering location
- No changes needed; validation happens at LocationsManager modal level

### Callback Binding
- Must use `.bind(this)` when passing LocationsManager methods as callbacks
- LocationUI stores callbacks and calls them with proper context

---

## 7. QUESTIONS ANSWERED

**Q1: Should we create a new method in LocationGenerator?**
- **A:** Yes. `generateLocationBattle(locationId, enemies)` is cleaner than modifying generateLocation(). Allows reuse and separation of concerns.

**Q2: How should callbacks flow?**
- **A:** LocationUI receives callbacks at openLocation(), stores them, and passes them to BattleEngine.startBattle() during enemy encounter. BattleEngine invokes them on battle end. This preserves LocationUI's post-battle logic (enemy removal, state cleanup).

**Q3: Should LocationsManager.startExploration() call LocationUI.openLocation()?**
- **A:** Yes. After generating location, call `locationUI.openLocation(locationId, callbacks)` where callbacks are LocationsManager methods. This centralizes battle flow control.

**Q4: How to preserve enemy stats from location.enemies?**
- **A:** Embed `templateData: enemyTemplate` directly in generated enemy objects. When battle starts, LocationUI extracts reward info from enemy.templateData.reward. This is the cleanest approach and avoids duplication.

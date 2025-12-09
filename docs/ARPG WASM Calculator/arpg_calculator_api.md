# ARPG Calculator API Guide

A comprehensive guide to using the ARPG Calculator WASM API for game stat calculations.

## Table of Contents

1. [Introduction](#introduction)
2. [Workflow Comparison: Previous vs Current](#workflow-comparison)
3. [API Reference](#api-reference)
4. [Feature Details](#feature-details)
5. [Complete API Schema](#complete-api-schema)
6. [Usage Examples](#usage-examples)
7. [Migration Guide](#migration-guide)

---

## Introduction

The ARPG Calculator is a WebAssembly-based calculation engine for action RPG game mechanics. It processes complex stat calculations including:

- **Entities**: Game objects (players, enemies, summons, bosses) with independent stats
- **Contributions**: Layered values that combine to form final stats (base, add, mult)
- **Flags**: Boolean states that affect calculations (has_weapon, is_critical, etc.)
- **Templates**: Pipelines that define how contributions combine (sum, product, etc.)
- **Formulas**: Named calculations that produce output values
- **Damage Flows**: Complex damage calculations with type conversions

### Documentation Resources

| Document | Description |
|----------|-------------|
| [DSL Language Reference](./dsl_reference.md) | Complete guide to writing DSL game packs |
| [Explanation System Reference](./explanation_reference.md) | UI integration guide for calculation breakdowns |

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Entity** | A game object with its own stats and flags (player, enemy, summon, boss) |
| **Contribution** | A single value added to a stat (e.g., +50 damage from sword) |
| **Consumer ID** | Unique identifier for tracking who added a contribution |
| **Layer** | Determines how a contribution combines (base, add, mult, final) |
| **IsStart** | Protected base values that cannot be removed |
| **Broadcast** | Add contributions to multiple stats based on tag patterns |

---

## Workflow Comparison

### Previous Workflow (Wipe-and-Apply)

```
1. LoadGamePack(pack)           // Load DSL definitions
2. BuildGraph(allEntities)      // Create ALL entities with ALL base data
3. Evaluate({                   // Apply ALL contributions + calculate
     setEntity: {ALL_CONTRIBUTIONS},
     broadcast: {ALL_BROADCASTS},
     outputs: {...}
   })
4. When ANYTHING changes -> repeat steps 2-3 entirely
```

**Problems:**
- Full recalculation on every change
- No way to remove individual contributions
- Had to track and re-send everything
- O(n) work for every update

### Current Workflow (Incremental Updates)

```
1. LoadGamePack(pack)           // Load DSL + build dependency graph
2. BuildGraph(entities)         // Create entities with BASE values only (once)
3. Evaluate({                   // Add contributions incrementally
     setEntity: {
       stats: [{consumer_id: "item_123", ...}]  // Track by ID
     },
     outputs: {...}
   })
4. When something changes -> send ONLY the delta:
   Evaluate({
     setEntity: {
       removeStats: {"StatName": ["item_123"]}, // Remove old
       stats: {"StatName": [{consumer_id: "item_456", ...}]} // Add new
     },
     outputs: {...}
   })
```

**Benefits:**
- O(1) contribution updates
- Selective cache invalidation via dependency graph
- Consumer tracks their own contributions
- Only affected formulas recalculate

### When to Use Each

| Operation | Use BuildGraph | Use Evaluate |
|-----------|----------------|--------------|
| Initial game load | Yes | - |
| Full character reset | Yes | - |
| Equip/Unequip item | - | Yes |
| Apply/Remove buff | - | Yes |
| Level up stat | - | Yes |
| Create summon | - | Yes (entityOps.clone) |
| Switch character | Yes | - |

---

## API Reference

### LoadGamePack(packBytes: Uint8Array)

Loads a DSL pack definition into the engine.

**Parameters:**
- `packBytes`: Uint8Array containing the DSL pack text

**Returns:**
- `null` on success
- `{error: "..."}` on failure

**Side Effects:**
- Creates new engine instance
- Builds dependency graph for optimization
- Detects circular dependencies (fails with error)

**Example:**
```javascript
const packContent = new TextEncoder().encode(dslPackString);
const result = LoadGamePack(packContent);
if (result) {
    const error = JSON.parse(new TextDecoder().decode(result));
    console.error("Load failed:", error.error);
}
```

---

### BuildGraph(entitiesJSON: Uint8Array)

Creates entities with initial base values. **Wipes all existing entities first.**

**Parameters:**
- `entitiesJSON`: Uint8Array containing JSON entity definitions

**Returns:**
- `null` on success
- `{error: "..."}` on failure

**JSON Schema:**
```json
{
  "entities": [{
    "id": "player1",
    "type": "player|enemy|summon|boss",
    "layer": "base",
    "values": {
      "stat_name": {"source": "description", "amount": 100}
    },
    "flags": {
      "flag_name": {"source": "description", "enabled": true, "meta": {}}
    }
  }]
}
```

**Important:**
- All contributions from BuildGraph have `IsStart=true` and are protected from removal
- Use only for initial setup or full reset
- Wipes ALL existing entities before creating new ones

**Example:**
```javascript
const entities = {
    entities: [{
        id: "player1",
        type: "player",
        layer: "base",
        values: {
            "BaseDamage": {source: "Character", amount: 10},
            "BaseHealth": {source: "Character", amount: 100}
        },
        flags: {
            "is_alive": {source: "System", enabled: true}
        }
    }]
};
const bytes = new TextEncoder().encode(JSON.stringify(entities));
BuildGraph(bytes);
```

---

### Evaluate(evalJSON: Uint8Array)

Main API for incremental updates and calculations.

**Parameters:**
- `evalJSON`: Uint8Array containing JSON evaluation request

**Returns:**
- Uint8Array containing JSON results: `{entityID: {formula: value}}`
- Or `{error: "..."}` on failure

**Execution Order:**
1. `entityOps.remove` - Remove entities
2. `entityOps.create` - Create new entities
3. `entityOps.clone` - Clone existing entities
4. `setEntity.removeStats` - Remove contributions by consumer ID
5. `setEntity.removeFlags` - Remove flags entirely
6. `setEntity.stats` - Add contributions (with consumer_id)
7. `setEntity.flags` - Add/replace flags
8. `broadcast.remove` - Remove broadcast contributions
9. `broadcast.add` - Add broadcast contributions
10. `outputs` - Calculate requested formulas

**Example:**
```javascript
const evalData = {
    setEntity: {
        "player1": {
            stats: {
                "BaseDamage": [{
                    consumer_id: "weapon_slot",
                    source: "Iron Sword",
                    amount: 50,
                    layer: "base"
                }]
            }
        }
    },
    outputs: {
        "player1": ["FinalDamage", "DPS"]
    }
};
const bytes = new TextEncoder().encode(JSON.stringify(evalData));
const resultBytes = Evaluate(bytes);
const results = JSON.parse(new TextDecoder().decode(resultBytes));
// results = {"player1": {"FinalDamage": 60, "DPS": 45}}
```

---

### Explain(entityID: string, formulaName: string)

Returns detailed computation trace for debugging.

**Parameters:**
- `entityID`: Entity to explain
- `formulaName`: Formula to trace

**Returns:**
- Uint8Array containing JSON explanation

For detailed documentation of the explanation tree structure, node types, and how to interpret results for UI display, see [Explanation System Reference](./explanation_reference.md).

**Special Formula Names:**
- `__compiler__status` - Returns compilation statistics
- `__compiler__formula:<name>` - Returns bytecode for specific formula

**Example:**
```javascript
const resultBytes = Explain("player1", "FinalDamage");
const result = JSON.parse(new TextDecoder().decode(resultBytes));
// result = {value: 60, debug: {...}, summary: "...", human: ["line1", ...]}
```

---

## Feature Details

### Consumer ID Pattern

The consumer ID system allows you to track and manage your contributions.

**Adding a contribution:**
```javascript
Evaluate({
  setEntity: {
    "player1": {
      stats: {
        "BaseDamage": [{
          consumer_id: "equipment_slot_weapon",  // Your tracking ID
          source: "Iron Sword",
          amount: 50,
          layer: "base"
        }]
      }
    }
  },
  outputs: {"player1": ["FinalDamage"]}
});
```

**Removing a contribution:**
```javascript
Evaluate({
  setEntity: {
    "player1": {
      removeStats: {
        "BaseDamage": ["equipment_slot_weapon"]  // Same ID used to add
      }
    }
  },
  outputs: {"player1": ["FinalDamage"]}
});
```

**Rules:**
- Consumer is responsible for generating unique IDs
- `IsStart=true` contributions (from BuildGraph) are never removed
- Use consistent naming schemes for your IDs

**Recommended ID Patterns:**
| Use Case | Pattern | Example |
|----------|---------|---------|
| Equipment | `equipment_<slot>` | `equipment_weapon` |
| Buffs | `buff_<buffId>` | `buff_strength_123` |
| Masteries | `mastery_<id>_lv<level>` | `mastery_marksman_lv5` |
| Skills | `skill_<skillId>_<effect>` | `skill_fireball_burn` |
| Items | `item_<itemId>` | `item_ring_of_power` |

---

### Entity Operations

**Create a new entity:**
```json
{
  "entityOps": {
    "create": [{
      "id": "enemy_goblin_1",
      "type": "enemy",
      "owner_id": ""
    }]
  }
}
```

**Clone an entity (full deep copy):**
```json
{
  "entityOps": {
    "clone": [{
      "source_id": "player1",
      "new_id": "player1_snapshot"
    }]
  }
}
```

Clone creates a complete copy including:
- All stats and contributions
- All flags
- All properties
- Preserves entity type and owner

**Remove an entity:**
```json
{
  "entityOps": {
    "remove": ["temp_entity", "expired_summon"]
  }
}
```

**Entity Types:**
- `player` - Main character
- `enemy` - Standard enemy
- `summon` - Player-owned creature
- `boss` - Boss enemy

---

### Flag Behavior

Flags have special behavior: **only one contribution is active at a time**.

**Adding/Replacing a flag:**
```json
{
  "setEntity": {
    "player1": {
      "flags": {
        "has_weapon": [{
          "source": "Equipment System",
          "enabled": true,
          "meta": {"weapon_type": "sword"}
        }]
      }
    }
  }
}
```

When you add a flag contribution, it **replaces** any existing contribution for that flag. The previous contribution is discarded.

**Removing a flag entirely:**
```json
{
  "setEntity": {
    "player1": {
      "removeFlags": ["temporary_buff_flag"]
    }
  }
}
```

**Note:** Flags do not use consumer_id because only one contribution exists at a time.

---

### Broadcast with Remove

Broadcast adds contributions to multiple stats based on flag patterns (skill tags).

**Adding broadcast contributions:**
```json
{
  "broadcast": {
    "player1": {
      "add": [{
        "consumer_id": "mastery_marksman_lv5",
        "flag_suffix": "tag_marksman",
        "stat_suffix": "DamageModifier",
        "contribution": {
          "source": "Marksman Mastery Lv5",
          "amount": 0.15,
          "layer": "mult"
        }
      }]
    }
  }
}
```

This finds all flags ending in `_tag_marksman` and adds contributions to corresponding stats ending in `_DamageModifier`.

**Removing broadcast contributions:**
```json
{
  "broadcast": {
    "player1": {
      "remove": [{
        "flag_suffix": "tag_marksman",
        "stat_suffix": "DamageModifier",
        "consumer_ids": ["mastery_marksman_lv4"]
      }]
    }
  }
}
```

**Placeholder replacement:** Use `{skill}` in condition/calculation to get the skill prefix:
```json
{
  "contribution": {
    "condition": "flag(\"{skill}tag_active\")",
    "calculation": "val * {skill}Multiplier"
  }
}
```

---

### Dependency Graph Optimization

The engine builds a dependency graph at pack load time for optimal performance.

**What it tracks:**
- Formula -> Stat dependencies
- Formula -> Formula dependencies
- Formula -> Flag dependencies
- Template phase dependencies

**How it helps:**
- **Entity-scoped caching**: `player1:FinalDamage` cached separately from `enemy1:FinalDamage`
- **Selective invalidation**: Changing `BaseDamage` only invalidates formulas that use it
- **Cycle detection**: Circular dependencies caught at load time with clear error messages

**Example cycle error:**
```
Error: circular dependency detected: formula_a -> formula_b -> formula_c -> formula_a
```

---

## Complete API Schema

### BuildGraph Request

```json
{
  "entities": [{
    "id": "string (required)",
    "type": "player|enemy|summon|boss (required)",
    "layer": "string (optional, default: 'base')",
    "values": {
      "<statName>": {
        "source": "string",
        "amount": "number"
      }
    },
    "flags": {
      "<flagName>": {
        "source": "string",
        "enabled": "boolean",
        "meta": {"key": "value"}
      }
    }
  }]
}
```

### Evaluate Request

```json
{
  "entityOps": {
    "create": [{
      "id": "string",
      "type": "player|enemy|summon|boss",
      "owner_id": "string (optional)"
    }],
    "clone": [{
      "source_id": "string",
      "new_id": "string"
    }],
    "remove": ["entityId1", "entityId2"]
  },
  "setEntity": {
    "<entityID>": {
      "stats": {
        "<statName>": [{
          "consumer_id": "string (recommended)",
          "source": "string",
          "amount": "number",
          "layer": "string",
          "meta": {"key": "value"},
          "condition": "string (DSL expression)",
          "calculation": "string (DSL expression using 'val')"
        }]
      },
      "removeStats": {
        "<statName>": ["consumer_id_1", "consumer_id_2"]
      },
      "flags": {
        "<flagName>": [{
          "source": "string",
          "enabled": "boolean",
          "meta": {"key": "value"}
        }]
      },
      "removeFlags": ["flagName1", "flagName2"]
    }
  },
  "broadcast": {
    "<entityID>": {
      "add": [{
        "consumer_id": "string (recommended)",
        "flag_suffix": "string",
        "stat_suffix": "string",
        "contribution": {
          "source": "string",
          "amount": "number",
          "layer": "string",
          "meta": {"key": "value"},
          "condition": "string",
          "calculation": "string"
        }
      }],
      "remove": [{
        "flag_suffix": "string",
        "stat_suffix": "string",
        "consumer_ids": ["id1", "id2"]
      }]
    }
  },
  "outputs": {
    "<entityID>": ["formula1", "formula2"]
  }
}
```

### Evaluate Response

```json
{
  "<entityID>": {
    "<formulaName>": "number"
  }
}
```

Or on error:
```json
{
  "error": "Error message"
}
```

---

## Usage Examples

### Initial Game Setup

```javascript
// 1. Load game definition
const packContent = await fetch('/gamepacks/rpg.dsl').then(r => r.text());
LoadGamePack(new TextEncoder().encode(packContent));

// 2. Create player with base stats
BuildGraph({
    entities: [{
        id: "player1",
        type: "player",
        layer: "base",
        values: {
            "BaseDamage": {source: "Character", amount: 10},
            "BaseHealth": {source: "Character", amount: 100},
            "CriticalChance": {source: "Character", amount: 0.05}
        },
        flags: {
            "is_alive": {source: "System", enabled: true}
        }
    }]
});
```

### Equipping an Item

```javascript
const result = Evaluate({
    setEntity: {
        "player1": {
            stats: {
                "BaseDamage": [{
                    consumer_id: "equip_weapon",
                    source: "Sword of Fire",
                    amount: 75,
                    layer: "base"
                }],
                "CriticalChance": [{
                    consumer_id: "equip_weapon",
                    source: "Sword of Fire",
                    amount: 0.10,
                    layer: "add"
                }]
            },
            flags: {
                "has_weapon": [{source: "Equipment", enabled: true}],
                "has_fire_weapon": [{source: "Equipment", enabled: true}]
            }
        }
    },
    outputs: {"player1": ["FinalDamage", "CriticalChance"]}
});
// Results: player1.FinalDamage = 85, player1.CriticalChance = 0.15
```

### Unequipping an Item

```javascript
const result = Evaluate({
    setEntity: {
        "player1": {
            removeStats: {
                "BaseDamage": ["equip_weapon"],
                "CriticalChance": ["equip_weapon"]
            },
            removeFlags: ["has_weapon", "has_fire_weapon"]
        }
    },
    outputs: {"player1": ["FinalDamage", "CriticalChance"]}
});
// Results: player1.FinalDamage = 10, player1.CriticalChance = 0.05
```

### Applying a Temporary Buff

```javascript
// Apply buff
Evaluate({
    setEntity: {
        "player1": {
            stats: {
                "BaseDamage": [{
                    consumer_id: "buff_rage_spell",
                    source: "Rage Buff",
                    amount: 0.5,
                    layer: "mult"
                }]
            }
        }
    },
    outputs: {"player1": ["FinalDamage"]}
});

// Later, when buff expires
Evaluate({
    setEntity: {
        "player1": {
            removeStats: {
                "BaseDamage": ["buff_rage_spell"]
            }
        }
    },
    outputs: {"player1": ["FinalDamage"]}
});
```

### Upgrading a Mastery (Replace)

```javascript
// Remove old mastery level, add new one
Evaluate({
    broadcast: {
        "player1": {
            remove: [{
                flag_suffix: "tag_marksman",
                stat_suffix: "DamageModifier",
                consumer_ids: ["mastery_marksman_lv4"]
            }],
            add: [{
                consumer_id: "mastery_marksman_lv5",
                flag_suffix: "tag_marksman",
                stat_suffix: "DamageModifier",
                contribution: {
                    source: "Marksman Mastery Lv5",
                    amount: 0.25,
                    layer: "mult"
                }
            }]
        }
    },
    outputs: {"player1": ["skill_Splitshot_FinalDamage"]}
});
```

### Creating a Summon (Clone Player)

```javascript
Evaluate({
    entityOps: {
        clone: [{source_id: "player1", new_id: "summon_mirror_1"}]
    },
    setEntity: {
        "summon_mirror_1": {
            // Summon deals 50% of player damage
            stats: {
                "BaseDamage": [{
                    consumer_id: "summon_penalty",
                    source: "Summon Scaling",
                    amount: -0.5,
                    layer: "mult"
                }]
            }
        }
    },
    outputs: {
        "player1": ["FinalDamage"],
        "summon_mirror_1": ["FinalDamage"]
    }
});
```

### Creating an Enemy

```javascript
Evaluate({
    entityOps: {
        create: [{id: "enemy_boss_1", type: "boss", owner_id: ""}]
    },
    setEntity: {
        "enemy_boss_1": {
            stats: {
                "BaseHealth": [{
                    consumer_id: "boss_stats",
                    source: "Boss Template",
                    amount: 10000,
                    layer: "base"
                }],
                "BaseDamage": [{
                    consumer_id: "boss_stats",
                    source: "Boss Template",
                    amount: 500,
                    layer: "base"
                }]
            },
            flags: {
                "is_boss": [{source: "System", enabled: true}]
            }
        }
    },
    outputs: {"enemy_boss_1": ["FinalDamage", "MaxHealth"]}
});
```

---

## Migration Guide

### From Wipe-and-Apply to Incremental

**Step 1: Add consumer_id to all contributions**

Before:
```javascript
stats: {
    "BaseDamage": [{source: "Sword", amount: 50, layer: "base"}]
}
```

After:
```javascript
stats: {
    "BaseDamage": [{
        consumer_id: "equipment_weapon",  // Add unique ID
        source: "Sword",
        amount: 50,
        layer: "base"
    }]
}
```

**Step 2: Use BuildGraph only for initial setup**

Before:
```javascript
// Called on every change
BuildGraph(allEntities);
Evaluate({setEntity: allContributions, outputs: {...}});
```

After:
```javascript
// Called once at start
BuildGraph(baseEntities);

// Called on each change - only send delta
Evaluate({
    setEntity: {
        removeStats: {...},  // What to remove
        stats: {...}         // What to add
    },
    outputs: {...}
});
```

**Step 3: Track what you've added**

```javascript
class ContributionTracker {
    constructor() {
        this.contributions = new Map(); // consumer_id -> {entityId, statName}
    }

    add(entityId, statName, consumerId, contribution) {
        this.contributions.set(consumerId, {entityId, statName});
        return Evaluate({
            setEntity: {
                [entityId]: {
                    stats: {
                        [statName]: [{consumer_id: consumerId, ...contribution}]
                    }
                }
            },
            outputs: {...}
        });
    }

    remove(consumerId) {
        const {entityId, statName} = this.contributions.get(consumerId);
        this.contributions.delete(consumerId);
        return Evaluate({
            setEntity: {
                [entityId]: {
                    removeStats: {
                        [statName]: [consumerId]
                    }
                }
            },
            outputs: {...}
        });
    }
}
```

### Best Practices

1. **Keep consumer_ids deterministic** - Don't use random UUIDs. Use patterns like `equipment_weapon` or `buff_strength_123` that you can reconstruct.

2. **Batch related changes** - Put all changes from one action in a single Evaluate call:
   ```javascript
   // Good: One Evaluate for equipping item
   Evaluate({
       setEntity: {
           "player1": {
               stats: {
                   "BaseDamage": [...],
                   "CriticalChance": [...],
                   "AttackSpeed": [...]
               },
               flags: {...}
           }
       },
       outputs: {...}
   });
   ```

3. **Use broadcast for tag systems** - When many skills share tags, broadcast is more efficient than individual stat updates.

4. **Use clone for snapshots** - Need to compare before/after? Clone the entity first.

5. **Remove before add** - When replacing, remove old contributions in the same Evaluate call before adding new ones. The execution order ensures removes happen first.

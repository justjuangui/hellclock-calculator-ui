# DSL Language Reference

Complete reference for the ARPG Calculator Domain-Specific Language (DSL).

## Table of Contents

1. [Introduction](#introduction)
2. [Pack Structure](#pack-structure)
3. [Damage Types](#damage-types)
4. [Group Templates](#group-templates)
5. [Stats](#stats)
6. [Formulas](#formulas)
7. [Damage Flows](#damage-flows)
8. [Expression Reference](#expression-reference)
9. [Troubleshooting](#troubleshooting)
10. [Quick Reference](#quick-reference)

---

## Introduction

The ARPG Calculator DSL is a declarative language for defining game calculation systems. Instead of writing code, you describe your damage types, stats, formulas, and damage flows in a structured format that the engine compiles and executes.

### Why Use the DSL?

- **Declarative**: Describe *what* you want, not *how* to compute it
- **Readable**: Clear syntax designed for game mechanics
- **Efficient**: Compiles to optimized bytecode
- **Safe**: Validates circular dependencies and undefined references

### Quick Start

```dsl
pack "MyGame" {
    group_templates {
        standard {
            layers: [base, add, mult]
        }
    }

    stats {
        Damage: default.stat using standard
    }

    formulas {
        FinalDamage = Damage
    }
}
```

---

## Pack Structure

A pack is the top-level container for all definitions.

### Syntax

```dsl
pack "PackName" {
    damage_types { ... }
    group_templates { ... }
    stats { ... }
    formulas { ... }
    damage_flows { ... }
}
```

### Rules

- Pack name is a quoted string
- All sections are optional
- Sections can appear in any order
- Sections can be empty or omitted

---

## Damage Types

Define custom damage type systems with conversion priority.

### Syntax

```dsl
damage_types {
    TypeName: priority
}
```

### Example

```dsl
damage_types {
    Physical: 1
    Fire: 2
    Lightning: 3
    Plague: 4
}
```

### Rules

| Rule | Description |
|------|-------------|
| Unique names | Each damage type must have a unique name |
| Priority | Integer value; lower numbers processed first in conversions |
| Required for flows | Must be defined if using `damage_flows` section |

---

## Group Templates

Define reusable calculation templates that control how contributions combine.

### Simple Template

```dsl
group_templates {
    standard {
        layers: [base, add, mult]
    }
}
```

### Pipeline Template

Pipeline templates execute phases in sequence, where each phase can reference previous results.

```dsl
group_templates {
    advanced {
        layers: [base, add, mult, override]
        pipeline: [base, add, mult, override]
        phases {
            base = sum_by(group: SELF, layer: "base")
            add = base + sum_by(group: SELF, layer: "add")
            mult = add * prod_by(group: SELF, layer: "mult")
            override = first_by(group: SELF, layer: "override") > 0 ?
                       first_by(group: SELF, layer: "override") : mult
        }
    }
}
```

### Common Layers

| Layer | Purpose |
|-------|---------|
| `base` | Initial/base value |
| `add` | Flat additions |
| `mult` | Multiplicative bonuses |
| `multadd` | Additional multiplicative layer |
| `override` | Override final value |
| `final` | Final flat additions |

### The `SELF` Keyword

In phase expressions, `SELF` references the template's own stat group:

```dsl
base = sum_by(group: SELF, layer: "base")  // Sum this stat's base contributions
```

---

## Stats

Define game statistics that use templates for calculation.

### Syntax

```dsl
stats {
    StatName: category.datatype using TemplateName
}
```

### Example

```dsl
stats {
    BaseDamage: damage.stat using standard
    CritChance: percentage.stat using standard
    Life: health.stat using advanced
}
```

### Rules

| Rule | Description |
|------|-------------|
| Unique names | Stat names must be unique |
| Valid template | Referenced template must exist |
| Category/datatype | Can be any identifier (used for organization) |

---

## Formulas

Define calculations that combine stats and functions.

### Syntax

```dsl
formulas {
    FormulaName = expression
}
```

### Examples

```dsl
formulas {
    total_damage = BaseDamage * DamageMultiplier
    crit_bonus = CritChance > 0.5 ? 1.5 : 1.0
    final_damage = total_damage * crit_bonus
}
```

### Literals and Variables

| Type | Example | Description |
|------|---------|-------------|
| Integer | `42` | Whole numbers |
| Float | `3.14` | Decimal numbers |
| String | `"text"` | Quoted strings (for function args) |
| Stat | `BaseDamage` | Reference to a stat |
| Formula | `total_damage` | Reference to another formula |

### Built-in Functions

#### Math Functions

| Function | Description |
|----------|-------------|
| `min(a, b, ...)` | Minimum of all arguments |
| `max(a, b, ...)` | Maximum of all arguments |
| `sum(a, b, ...)` | Sum of all arguments |
| `prod(a, b, ...)` | Product of all arguments |
| `clamp(val, min, max)` | Clamp value to range |

```dsl
capped_crit = clamp(CritChance, 0, 0.95)
higher_damage = max(PhysicalDamage, FireDamage)
```

#### Flag Function

Check boolean flags on entities:

```dsl
flag("flag_name")           // Check actor flag
flag("flag_name", "target") // Check target flag
flag("flag_name", "actor")  // Explicit actor context
```

Returns `1.0` if flag is enabled, `0.0` otherwise.

```dsl
weapon_bonus = flag("has_weapon") * 50
```

#### Group Total Function

Apply a stat's template to calculate its final value:

```dsl
group_total("StatName")
```

#### Aggregate Functions (*_by)

Filter and aggregate contributions:

| Function | Description |
|----------|-------------|
| `sum_by(...)` | Sum matching contributions |
| `prod_by(...)` | Product of matching contributions |
| `min_by(...)` | Minimum value |
| `max_by(...)` | Maximum value |
| `count_by(...)` | Count of contributions |
| `avg_by(...)` | Average value |
| `first_by(...)` | First non-zero value |
| `last_by(...)` | Last value |

**Filter Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `group: "name"` | Yes | Stat/group name |
| `group: SELF` | Yes | Current template's group |
| `layer: "name"` | No | Filter by layer |
| `unit: "name"` | No | Filter by unit |
| `who: "actor"` | No | Entity context |
| `transform: expr` | No | Transform each value |

**Examples:**

```dsl
sum_by(group: "Damage", layer: "add")
prod_by(group: SELF, layer: "mult")
sum_by(group: SELF, layer: "multadd", transform: val - 1)
```

---

## Damage Flows

Define complex skill damage calculations with type conversions.

### Syntax

```dsl
damage_flows {
    SkillName {
        primary: DamageType
        base_damage: expression
        skill_damage_modifier: expression

        initial_distribution { ... }
        skill_conversions { ... }
        character_conversions { ... }
        initial_additional { ... }
        character_additional { ... }
        apply_modifiers { ... }
        critical_average_formula: expression
    }
}
```

### Components

#### Required Properties

| Property | Description |
|----------|-------------|
| `primary` | Primary damage type |
| `base_damage` | Base damage expression |

#### Optional Properties

| Property | Description |
|----------|-------------|
| `skill_damage_modifier` | Skill-specific multiplier (default: 1) |
| `initial_distribution` | How damage splits across types |
| `skill_conversions` | Skill-specific type conversions |
| `character_conversions` | Character-level type conversions |
| `initial_additional` | Skill-specific flat bonuses |
| `character_additional` | Character-level flat bonuses |
| `apply_modifiers` | Per-type damage modifiers |
| `critical_average_formula` | Critical damage calculation |

### Initial Distribution

Explicit percentages:

```dsl
initial_distribution {
    Physical: 0.5
    Fire: 0.3
    Lightning: 0.2
}
```

Using stats:

```dsl
initial_distribution {
    Physical: skill_PhysicalConversion
    Fire: skill_FireConversion
}
```

### Conversions

Skill conversions (fixed percentages):

```dsl
skill_conversions {
    Physical->Fire: 0.5  // 50% of Physical converts to Fire
}
```

Character conversions (stat-driven):

```dsl
character_conversions {
    Physical->Fire: PhysicalToFireConversion
    Lightning->Fire: LightningToFireConversion
}
```

### Modifiers

Per-type damage modifiers:

```dsl
apply_modifiers {
    Physical: PhysicalDamage * AllDamage
    Fire: FireDamage * SpellDamage * AllDamage
    Lightning: LightningDamage * AllDamage
}
```

### Critical Formula

The `total_damage` variable contains the sum of all damage types:

```dsl
critical_average_formula: total_damage * (1 + CritChance * (CritDamage - 1))
```

### Processing Order

1. Calculate base damage and apply skill modifier
2. Apply initial distribution
3. Apply skill conversions
4. Apply character conversions
5. Normalize distribution
6. Apply skill damage modifier
7. Calculate final damage per type with modifiers
8. Apply critical average formula

### Example

```dsl
damage_flows {
    fireball {
        primary: Fire
        base_damage: BaseDamage
        skill_damage_modifier: 1.5

        initial_distribution {
            Physical: 0.2
            Fire: 0.8
        }

        character_conversions {
            Physical->Fire: PhysToFire
        }

        apply_modifiers {
            Physical: PhysicalDamage
            Fire: FireDamage * SpellDamage
        }

        critical_average_formula: total_damage * (1 + CritChance * (CritDamage - 1))
    }
}
```

---

## Expression Reference

### Operator Precedence

From highest to lowest:

| Priority | Operators | Description | Associativity |
|----------|-----------|-------------|---------------|
| 1 | `()` | Parentheses | - |
| 2 | `-` `!` | Unary negation, NOT | Right |
| 3 | `*` `/` | Multiplication, Division | Left |
| 4 | `+` `-` | Addition, Subtraction | Left |
| 5 | `<` `<=` `>` `>=` | Comparison | Left |
| 6 | `==` `!=` | Equality | Left |
| 7 | `&&` | Logical AND | Left |
| 8 | `||` | Logical OR | Left |
| 9 | `? :` | Ternary conditional | Right |

### Examples

```dsl
1 + 2 * 3           // = 7 (mult before add)
(1 + 2) * 3         // = 9 (parentheses override)
a < b && c > d      // = (a < b) && (c > d)
x > 0 ? a : b       // Conditional
```

### Type System

| Type | Representation |
|------|----------------|
| Numbers | All stored as float64 |
| Booleans | `1.0` = true, `0.0` = false |
| Comparisons | Return `1.0` or `0.0` |

---

## Troubleshooting

### Common Errors and Solutions

#### Missing Template Reference

**Error:**
```
stat 'Damage' references undefined template 'nonexistent'
```

**Cause:** The stat uses a template that doesn't exist.

**Solution:** Define the template in `group_templates` or fix the template name:

```dsl
group_templates {
    nonexistent {  // Add the missing template
        layers: [base]
    }
}
```

#### Undefined Stat or Formula Reference

**Error:**
```
unknown variable: UndefinedStat
```

**Cause:** Formula references a stat or formula that doesn't exist.

**Solution:** Define the stat or check for typos:

```dsl
stats {
    UndefinedStat: default.stat using standard  // Add missing stat
}
```

#### Circular Dependency

**Error:**
```
circular dependency detected: formula_a -> formula_b -> formula_a
```

**Cause:** Formulas reference each other in a cycle.

**Solution:** Restructure formulas to break the cycle:

```dsl
// Before (circular):
formulas {
    a = b + 1
    b = a + 1  // Error: b depends on a, a depends on b
}

// After (fixed):
formulas {
    base = 10
    a = base + 1
    b = a + 1
}
```

#### Invalid Damage Type in Flow

**Error:**
```
unknown damage type: Chaos
```

**Cause:** Damage flow references a type not defined in `damage_types`.

**Solution:** Add the damage type:

```dsl
damage_types {
    Physical: 1
    Chaos: 5  // Add the missing type
}
```

#### Missing Required Field

**Error:**
```
damage_flow 'skill' missing required field 'base_damage'
```

**Cause:** Damage flow is missing a required property.

**Solution:** Add the required field:

```dsl
damage_flows {
    skill {
        primary: Fire
        base_damage: BaseDamage  // Add missing field
    }
}
```

---

## Quick Reference

### Pack Structure

```dsl
pack "Name" {
    damage_types { Type: priority }
    group_templates { Name { layers: [...] } }
    stats { Name: cat.type using Template }
    formulas { Name = expression }
    damage_flows { Name { ... } }
}
```

### Operators

```
Arithmetic:  +  -  *  /
Comparison:  <  <=  >  >=  ==  !=
Logical:     &&  ||  !
Conditional: condition ? true_expr : false_expr
```

### Functions

```
min(a, b, ...)    max(a, b, ...)    sum(a, b, ...)
prod(a, b, ...)   clamp(val, min, max)
flag("name")      flag("name", "context")
group_total("name")
sum_by(group: "name", layer: "layer", transform: expr)
prod_by(...)  min_by(...)  max_by(...)  count_by(...)
avg_by(...)   first_by(...)  last_by(...)
```

### Damage Flow Template

```dsl
damage_flows {
    skill_name {
        primary: Type
        base_damage: expr
        skill_damage_modifier: expr
        initial_distribution { Type: value }
        skill_conversions { From->To: value }
        character_conversions { From->To: StatName }
        initial_additional { Type: StatName }
        character_additional { Type: StatName }
        apply_modifiers { Type: expr }
        critical_average_formula: total_damage * (1 + CritChance * (CritDamage - 1))
    }
}
```

# Explanation System Reference

A comprehensive guide to the ARPG Calculator explanation system for building UIs that display calculation breakdowns.

## Table of Contents

1. [Introduction](#introduction)
2. [API Usage](#api-usage)
3. [ExplanationNode Structure](#explanationnode-structure)
4. [Trace Levels](#trace-levels)
5. [Node Types Reference](#node-types-reference)
6. [Details Keys by Node Type](#details-keys-by-node-type)
7. [UI Implementation Guide](#ui-implementation-guide)
8. [Examples](#examples)

---

## Introduction

The Explanation system provides detailed computation traces that show how formula values are calculated. This allows consumers to build UIs that:

- Display step-by-step calculation breakdowns
- Show which contributions affect a stat
- Debug unexpected calculation results
- Provide transparency to users about how stats are computed

---

## API Usage

### Requesting an Explanation

```javascript
const resultBytes = Explain("player1", "FinalDamage");
const result = JSON.parse(new TextDecoder().decode(resultBytes));
```

### Response Format

The `Explain` function returns a JSON object with four fields:

```json
{
    "value": 450.0,
    "debug": { /* Full ExplanationNode tree */ },
    "summary": "FinalDamage = 450.00",
    "human": [
        "FinalDamage: 450.00",
        "  BaseDamage: 100.00",
        "    [base] Character: 10.00",
        "    [base] Iron Sword: 90.00"
    ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `value` | number | The computed result |
| `debug` | ExplanationNode | Full computation tree (for programmatic processing) |
| `summary` | string | One-line summary of the result |
| `human` | string[] | Human-readable breakdown (indented lines) |

### Special Formula Names

| Formula | Description |
|---------|-------------|
| `__compiler__status` | Returns bytecode compilation statistics |
| `__compiler__formula:<name>` | Returns bytecode instructions for a specific formula |

---

## ExplanationNode Structure

Each node in the computation tree has the following structure:

```typescript
interface ExplanationNode {
    type: string;                    // Node type identifier
    name: string;                    // Name of the evaluated item
    value: number;                   // Computed result
    children?: ExplanationNode[];    // Nested child nodes
    meta?: Record<string, string>;   // String metadata (primarily for errors)
    details?: Record<string, any>;   // Detailed information (any type)
}
```

### Field Descriptions

| Field | Description |
|-------|-------------|
| `type` | Identifies the kind of node (e.g., "formula", "binary_op", "contribution") |
| `name` | The identifier being evaluated (formula name, operator symbol, function name) |
| `value` | The numeric result of this node's computation |
| `children` | Child nodes representing sub-calculations (may be empty or omitted) |
| `meta` | String key-value pairs, primarily used for error messages (`meta.error`) |
| `details` | Rich metadata with typed values specific to each node type |

---

## Trace Levels

The explanation system has two trace levels that control how much detail is captured:

| Level | Nodes Included | Use Case |
|-------|----------------|----------|
| **UserInfo** | formula, stat, damage_flow, template, pipeline, phase, output | Summary view for end users |
| **DebugInfo** | All nodes including literals, operators, variables | Full debugging for developers |

The default trace level is **DebugInfo** which captures all nodes. UIs can filter nodes based on type to show summary vs. detailed views.

### UserInfo Nodes (Summary Level)

These nodes represent high-level concepts users care about:

- `formula` - Named formula evaluation
- `stat` - Stat with template processing
- `damage_flow` - Complete damage flow calculation
- `template` - Template processing wrapper
- `pipeline` - Multi-phase pipeline execution
- `phase` - Individual pipeline phase
- `output` - Top-level output wrapper

### DebugInfo Nodes (Detail Level)

These nodes show low-level computation steps:

- Expression nodes: `literal`, `variable`, `binary_op`, `unary_op`, `conditional`
- Function nodes: `min`, `max`, `sum`, `prod`, `clamp`, `flag`, `group_total`
- Aggregate nodes: `sum_by`, `prod_by`, `min_by`, `max_by`, `count_by`, `avg_by`, `first_by`, `last_by`
- Contribution nodes: `contribution`

---

## Node Types Reference

### Output Nodes

#### `output`
Top-level wrapper for requested output calculations.

| Details Key | Type | Description |
|-------------|------|-------------|
| `type` | string | "formula" or "stat" |
| `formula` | string | Formula name (when type is "formula") |
| `stat` | string | Stat name (when type is "stat") |

#### `formula`
A named formula evaluation.

- **Name**: Formula identifier
- **Value**: Computed formula result
- **Children**: Expression nodes that make up the formula

#### `stat`
A stat evaluation with template processing.

| Details Key | Type | Description |
|-------------|------|-------------|
| `template` | string | Template name used for processing |

---

### Expression Nodes

#### `literal`
A constant numeric value in an expression.

- **Name**: Empty string
- **Value**: The literal number
- **Details**: None

#### `variable`
A reference to a stat or formula variable.

| Details Key | Type | Description |
|-------------|------|-------------|
| `variable` | string | Variable name being referenced |
| `context` | string | Current actor/target context |

#### `binary_op`
Binary arithmetic or comparison operation.

| Details Key | Type | Description |
|-------------|------|-------------|
| `operator` | string | The operator: `+`, `-`, `*`, `/`, `<`, `>`, `<=`, `>=`, `==`, `!=`, `&&`, `\|\|` |
| `left_value` | number | Left operand result |
| `right_value` | number | Right operand result |
| `operation` | string | Formatted operation string (e.g., "100.00 + 50.00 = 150.00") |

- **Name**: The operator symbol
- **Children**: [left_operand, right_operand]

#### `unary_op`
Unary operation (negation or logical not).

| Details Key | Type | Description |
|-------------|------|-------------|
| `operator` | string | The operator: `-` or `!` |
| `operand_value` | number | Operand result |
| `operation` | string | Formatted operation string (e.g., "-50.00 = -50.00") |

- **Name**: The operator symbol
- **Children**: [operand]

#### `conditional`
Ternary conditional expression (`?:`).

| Details Key | Type | Description |
|-------------|------|-------------|
| `type` | string | Always "ternary" |
| `condition_value` | number | Condition evaluation result (0 = false, non-zero = true) |
| `chosen_branch` | string | "then" or "else" |
| `operation` | string | Formatted operation string |

- **Name**: "?:"
- **Children**: [condition, then_expr, else_expr] (only evaluated branch has children)

---

### Function Nodes

#### `min`, `max`, `sum`, `prod`
Mathematical aggregation functions.

| Details Key | Type | Description |
|-------------|------|-------------|
| `function` | string | Function name |
| `values` | number[] | All argument values |
| `operation` | string | Formatted operation (e.g., "min(10.00, 20.00, 5.00) = 5.00") |

- **Name**: Function name
- **Children**: Argument expressions

#### `clamp`
Value clamping function: `clamp(value, min, max)`.

| Details Key | Type | Description |
|-------------|------|-------------|
| `function` | string | "clamp" |
| `original_value` | number | Value before clamping |
| `min_value` | number | Minimum bound |
| `max_value` | number | Maximum bound |
| `operation` | string | Formatted operation |

#### `flag`
Boolean flag check function.

| Details Key | Type | Description |
|-------------|------|-------------|
| `function` | string | "flag" |
| `flag` | string | Flag name being checked |
| `context` | string | Actor/target context ("actor" or "target") |
| `flag_state` | boolean | Whether flag is enabled |
| `operation` | string | Formatted operation |

- **Value**: 1.0 if flag is enabled, 0.0 if disabled

#### `group_total`
Group aggregation using a template.

| Details Key | Type | Description |
|-------------|------|-------------|
| `function` | string | "group_total" |
| `group` | string | Group name |
| `template` | string | Template name used |
| `operation` | string | Formatted operation |
| `self_var` | string | What SELF refers to (for self-referential groups) |

#### `formula_call`
Invocation of a formula as a function.

| Details Key | Type | Description |
|-------------|------|-------------|
| `function` | string | Formula name |
| `type` | string | "formula_call" |
| `arg_count` | number | Number of positional arguments |
| `named_args` | number | Number of named arguments |

---

### Aggregate Function Nodes

These nodes (`sum_by`, `prod_by`, `min_by`, `max_by`, `count_by`, `avg_by`, `first_by`, `last_by`) represent filtered aggregation over contributions.

| Details Key | Type | Description |
|-------------|------|-------------|
| `function` | string | Full function name (e.g., "sum_by") |
| `operation` | string | Base operation (e.g., "sum") |
| `filter_group` | string | Group name being filtered |
| `contribution_count` | number | Number of matching contributions |
| `values` | number[] | All values after transform |
| `has_transform` | boolean | Whether a transform expression was applied |
| `operation_result` | string | Formatted result string |
| `filter_layer` | string | Layer filter (optional) |
| `filter_unit` | string | Unit filter (optional) |
| `filter_who` | string | Context filter (optional) |

- **Children**: `contribution` nodes for each matching contribution

#### `contribution`
Individual contribution within an aggregate.

| Details Key | Type | Description |
|-------------|------|-------------|
| `source` | string | Contribution source (e.g., "Iron Sword") |
| `layer` | string | Contribution layer (base, add, mult, final) |
| `original_value` | number | Raw contribution value |
| `is_start` | boolean | Whether this is a protected base value |
| `has_condition` | boolean | Whether contribution has a condition expression |
| `has_calculation` | boolean | Whether contribution has a calculation expression |
| `condition` | string | Condition DSL expression (if present) |
| `calculation` | string | Calculation DSL expression (if present) |
| `transformed_value` | number | Value after transform (if transform applied) |
| `meta_*` | any | User-provided metadata with "meta_" prefix |

---

### Template Nodes

#### `template`
Template processing wrapper.

- **Name**: Template name
- **Children**: Template processing nodes (pipeline or layer)

#### `pipeline`
Multi-phase pipeline execution.

| Details Key | Type | Description |
|-------------|------|-------------|
| `type` | string | "pipeline" |
| `phase_count` | number | Number of phases |
| `final_phase_value` | number | Value from last phase |
| `phase_values` | object | Map of phase name to computed value |
| `pipeline_steps` | string[] | Phase execution order |

- **Children**: `phase` nodes

#### `phase`
Individual pipeline phase.

- **Name**: Phase name
- **Value**: Phase computation result
- **Children**: Expression nodes for the phase formula

---

### Damage Flow Nodes

#### `damage_flow`
Complete damage flow calculation.

| Details Key | Type | Description |
|-------------|------|-------------|
| `damage_flow` | string | Flow name |
| `base_damage` | number | Base damage value |
| `skill_damage_modifier` | number | Skill modifier applied |
| `total_damage` | number | Total damage result |
| `average_damage` | number | Critical average damage |
| `distribution` | object | Damage type distribution (0.0-1.0 per type) |
| `final_damage` | object | Final damage per type |

- **Children**: `damage_flow_phase` nodes (phases 1-8)

#### `damage_flow_call`
Damage flow function call in a formula.

| Details Key | Type | Description |
|-------------|------|-------------|
| `propertyName` | string | Property being accessed (e.g., "TotalDamage", "FireDamage") |

#### `damage_flow_phase`
Individual damage flow phase (8 total phases).

All phases have these base details:

| Details Key | Type | Description |
|-------------|------|-------------|
| `phase` | number | Phase number (1-8) |
| `name` | string | Phase name |

**Phase-specific details:**

| Phase | Name | Additional Keys |
|-------|------|-----------------|
| 1 | base_damage | `value`: number |
| 2 | initial_distribution | `distribution`: object |
| 3 | skill_conversions | `distribution`: object, `additional_damage`: object |
| 4 | character_conversions | `distribution`: object, `additional_damage`: object |
| 5 | normalize_distribution | `distribution`: object |
| 6 | skill_damage_modifier | `value`: number |
| 7 | final_damage_per_type | `final_damage`: object, `character_additional`: object |
| 8 | critical_average | `total_damage`: number, `average_damage`: number |

---

### Compiler Nodes

These nodes are returned for special `__compiler__*` formula names.

#### `compiler_status`
Overall compilation statistics.

| Details Key | Type | Description |
|-------------|------|-------------|
| `total_formulas` | number | Total formula count |
| `compiled_formulas` | number | Successfully compiled count |
| `compile_errors` | number | Failed compilation count |

#### `compiled_formula`
Individual formula compilation info.

| Details Key | Type | Description |
|-------------|------|-------------|
| `has_bytecode` | boolean | Whether bytecode exists |
| `stack_size` | number | Required stack size |
| `compile_error` | string | Compilation error (if any) |
| `uses_ast_fallback` | boolean | Using AST instead of bytecode |

- **Children**: `bytecode_instruction` nodes

#### `bytecode_instruction`
Single bytecode instruction.

| Details Key | Type | Description |
|-------------|------|-------------|
| `FloatArg` | number | Float argument (if applicable) |
| `StrArg` | string | String argument (if applicable) |
| `IntArg` | number | Integer argument (if applicable) |

---

## UI Implementation Guide

### Tree Traversal

Process the explanation tree recursively:

```javascript
function processNode(node, depth = 0) {
    // Display current node
    const indent = "  ".repeat(depth);
    console.log(`${indent}[${node.type}] ${node.name}: ${node.value}`);

    // Process children
    if (node.children) {
        for (const child of node.children) {
            processNode(child, depth + 1);
        }
    }
}

processNode(result.debug);
```

### Filtering by Trace Level

To show only summary-level nodes:

```javascript
const summaryTypes = new Set([
    'formula', 'stat', 'damage_flow', 'template',
    'pipeline', 'phase', 'output'
]);

function isSummaryNode(node) {
    return summaryTypes.has(node.type);
}

function filterToSummary(node) {
    if (!isSummaryNode(node)) {
        return null;
    }
    return {
        ...node,
        children: node.children
            ?.map(filterToSummary)
            .filter(Boolean)
    };
}
```

### Formatting Suggestions

| Node Type | Suggested Display |
|-----------|-------------------|
| `formula` | Bold name, show value |
| `stat` | Show name with template indicator |
| `contribution` | Indent under parent, show source and layer |
| `binary_op` | Show as "left op right = result" |
| `flag` | Show flag name and state (enabled/disabled) |
| `damage_flow` | Expandable section with per-type breakdown |

### Error Handling

Check for errors in the `meta` field:

```javascript
function hasError(node) {
    return node.meta && node.meta.error;
}

function getError(node) {
    return node.meta?.error;
}

// Display errors prominently
if (hasError(node)) {
    console.error(`Error in ${node.type}: ${getError(node)}`);
}
```

### Contribution Display

For stat breakdowns, find contribution children:

```javascript
function getContributions(node) {
    const contributions = [];

    function findContributions(n) {
        if (n.type === 'contribution') {
            contributions.push({
                source: n.details?.source || 'Unknown',
                layer: n.details?.layer || 'base',
                value: n.details?.original_value || n.value,
                isStart: n.details?.is_start || false
            });
        }
        if (n.children) {
            n.children.forEach(findContributions);
        }
    }

    findContributions(node);
    return contributions;
}
```

---

## Examples

### Simple Stat Breakdown

Request:
```javascript
Explain("player1", "BaseDamage")
```

Response structure:
```json
{
    "type": "output",
    "name": "BaseDamage",
    "value": 160,
    "details": {"type": "stat", "stat": "BaseDamage"},
    "children": [{
        "type": "pipeline",
        "name": "StandardDamage",
        "value": 160,
        "details": {
            "phase_count": 4,
            "phase_values": {"base": 100, "add": 150, "mult": 150, "final": 160}
        },
        "children": [
            {
                "type": "phase",
                "name": "base",
                "value": 100,
                "children": [{
                    "type": "sum_by",
                    "details": {
                        "filter_group": "BaseDamage",
                        "filter_layer": "base",
                        "contribution_count": 2
                    },
                    "children": [
                        {"type": "contribution", "details": {"source": "Character", "layer": "base", "original_value": 10}},
                        {"type": "contribution", "details": {"source": "Iron Sword", "layer": "base", "original_value": 90}}
                    ]
                }]
            }
        ]
    }]
}
```

### Formula with Conditional

Request:
```javascript
Explain("player1", "BerserkerDamage")
```

Response showing conditional evaluation:
```json
{
    "type": "formula",
    "name": "BerserkerDamage",
    "value": 240,
    "children": [{
        "type": "binary_op",
        "name": "*",
        "value": 240,
        "details": {
            "operator": "*",
            "left_value": 160,
            "right_value": 1.5,
            "operation": "160.00 * 1.50 = 240.00"
        },
        "children": [
            {"type": "variable", "name": "BaseDamage", "value": 160},
            {
                "type": "conditional",
                "name": "?:",
                "value": 1.5,
                "details": {
                    "condition_value": 1,
                    "chosen_branch": "then"
                }
            }
        ]
    }]
}
```

### Damage Flow Breakdown

Request:
```javascript
Explain("player1", "damage_flow(\"skill_fireball\")")
```

Response showing damage flow phases:
```json
{
    "type": "damage_flow",
    "name": "skill_fireball",
    "value": 1250,
    "details": {
        "damage_flow": "skill_fireball",
        "base_damage": 100,
        "total_damage": 1000,
        "average_damage": 1250,
        "distribution": {"Fire": 0.8, "Physical": 0.2},
        "final_damage": {"Fire": 800, "Physical": 200}
    },
    "children": [
        {"type": "damage_flow_phase", "details": {"phase": 1, "name": "base_damage", "value": 100}},
        {"type": "damage_flow_phase", "details": {"phase": 2, "name": "initial_distribution", "distribution": {"Fire": 0.8, "Physical": 0.2}}},
        {"type": "damage_flow_phase", "details": {"phase": 8, "name": "critical_average", "total_damage": 1000, "average_damage": 1250}}
    ]
}
```

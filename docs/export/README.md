# Hell Clock Build Export Format Specification

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2025-12-07

## Overview

This document specifies the binary format used to export and import character builds in the Hell Clock Calculator. The format is designed to be:

- **Compact**: Optimized for sharing via text (base64 encoded)
- **Versioned**: Supports future format changes
- **Extensible**: New components can be added without breaking existing exports
- **Forward-compatible**: Old decoders can skip unknown components

## Encoding

The binary data is encoded using **Base64** for text representation, making it easy to copy/paste and share.

Typical export size: ~1,600 bytes raw / ~2,200 base64 characters

---

## Binary Format Structure

```
+--------+--------+--------+--------+
| Header (4 bytes)                  |
+--------+--------+--------+--------+
| Component 0 (if present)          |
|   [2 bytes length][N bytes data]  |
+-----------------------------------+
| Component 1 (if present)          |
|   [2 bytes length][N bytes data]  |
+-----------------------------------+
| ...                               |
+-----------------------------------+
```

---

## Header Format (4 bytes)

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 1 | Magic | `0x48` (ASCII 'H' for HellClock) |
| 1 | 1 | Version | Format version (currently `0x01`) |
| 2 | 1 | Components | Bitmask indicating which components are present |
| 3 | 1 | Reserved | Reserved for future flags (set to `0x00`) |

### Magic Byte

The magic byte `0x48` identifies this as a Hell Clock export. Decoders should reject data that doesn't start with this byte.

### Version

Current version is `1`. Future versions may change the format. Decoders should check the version and handle accordingly.

### Component Bitmask

Each bit indicates whether a component is present in the export:

| Bit | Value | Component |
|-----|-------|-----------|
| 0 | `0x01` | Blessed Gear |
| 1 | `0x02` | Trinket Gear |
| 2 | `0x04` | Skills |
| 3 | `0x08` | Relics |
| 4 | `0x10` | Bells |
| 5 | `0x20` | Constellations |
| 6 | `0x40` | World Tier |
| 7 | `0x80` | Reserved |

Components are written in order of their bit position. For example, if bitmask is `0x15` (bits 0, 2, 4), the data contains: Blessed Gear, Skills, Bells.

---

## Component Data Format

Each component follows this structure:

```
+--------+--------+------------------+
| Length (2 bytes) | Data (N bytes) |
+--------+--------+------------------+
```

- **Length**: Little-endian uint16 indicating the size of the data section
- **Data**: Component-specific binary data

The length prefix allows decoders to skip unknown components for forward compatibility.

---

## Component Specifications

### Component 0 & 1: Gear (Blessed/Trinket)

Encodes equipped gear items.

```
+--------+----------------------------------------+
| Count  | Items                                  |
+--------+----------------------------------------+
| 1 byte | N items (variable size each)           |
+--------+----------------------------------------+
```

**Item Structure (7 bytes each):**

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 1 | Slot | Gear slot enum value |
| 1 | 2 | DefId | Gear definition ID (little-endian uint16) |
| 3 | 1 | VariantIndex | Variant index within definition |
| 4 | 2 | Multiplier | Rarity multiplier * 10000 (little-endian uint16) |

**Gear Slot Enum:**

| Value | Slot |
|-------|------|
| 0 | WEAPON |
| 1 | HELMET |
| 2 | SHOULDERS |
| 3 | ARMOR |
| 4 | BRACERS |
| 5 | PANTS |
| 6 | BOOTS |
| 7 | RING_LEFT |
| 8 | RING_RIGHT |
| 9 | CAPE |
| 10 | TRINKET |
| 11 | ACCESSORY |

---

### Component 2: Skills

Encodes equipped skill slots.

```
+--------+----------------------------------------+
| Count  | Skills                                 |
+--------+----------------------------------------+
| 1 byte | N skills (4 bytes each)                |
+--------+----------------------------------------+
```

**Skill Structure (4 bytes each):**

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 1 | SlotIndex | Skill slot index (0-4) |
| 1 | 2 | SkillId | Skill definition ID (little-endian uint16) |
| 3 | 1 | Level | Selected skill level |

---

### Component 3: Relics

Encodes the relic inventory with all affixes.

```
+--------+--------+----------------------------------+
| Tier   | Count  | Relics                           |
+--------+--------+----------------------------------+
| 1 byte | 1 byte | N relics (variable size each)    |
+--------+--------+----------------------------------+
```

**Relic Structure:**

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | BaseId | Relic base definition ID (little-endian uint16) |
| 2 | 1 | X | Grid position X |
| 3 | 1 | Y | Grid position Y |
| 4 | 1 | Tier | Relic tier (1-5) |
| 5 | 1 | Rank | Upgrade rank (0-5) |
| 6 | 1 | Rarity | Rarity enum (see below) |
| 7 | 1 | Flags | Bit flags (bit 0 = corrupted) |
| 8 | 1 | SpecialCount | Number of special affixes |
| 9 | 1 | PrimaryCount | Number of primary affixes |
| 10 | 1 | SecondaryCount | Number of secondary affixes |
| 11 | 1 | HasDevotion | 1 if devotion affix present, 0 otherwise |
| 12 | 1 | HasCorruption | 1 if corruption affix present, 0 otherwise |
| 13+ | 4*N | Affixes | All affixes in order: special, primary, secondary, devotion, corruption |

**Rarity Enum:**

| Value | Rarity |
|-------|--------|
| 0 | Common |
| 1 | Magic |
| 2 | Rare |
| 3 | Unique |

**Affix Structure (4 bytes each):**

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | AffixId | Affix definition ID (little-endian uint16) |
| 2 | 2 | Roll | Roll value * 10000 (little-endian uint16, 0-10000 for 0.0-1.0) |

---

### Component 4: Bells

Encodes bell skill tree allocations.

```
+--------+--------+----------------------------------+
| Active | Count  | Nodes                            |
+--------+--------+----------------------------------+
| 2 bytes| 2 bytes| N nodes (18 bytes each)          |
+--------+--------+----------------------------------+
```

**Header:**

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | ActiveBellId | Currently active bell ID (little-endian uint16) |
| 2 | 2 | NodeCount | Number of allocated nodes (little-endian uint16) |

**Node Structure (18 bytes each):**

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 1 | BellId | Bell type ID (5=Campaign, 28=Infernal, 72=Oblivion) |
| 1 | 16 | NodeGuid | Node GUID as raw bytes (see GUID encoding) |
| 17 | 1 | Level | Node level |

---

### Component 5: Constellations

Encodes constellation skill tree allocations.

```
+--------+----------------------------------+
| Count  | Nodes                            |
+--------+----------------------------------+
| 2 bytes| N nodes (19 bytes each)          |
+--------+----------------------------------+
```

**Header:**

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | NodeCount | Number of allocated nodes (little-endian uint16) |

**Node Structure (19 bytes each):**

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | ConstellationId | Constellation ID (little-endian uint16) |
| 2 | 16 | NodeGuid | Node GUID as raw bytes (see GUID encoding) |
| 18 | 1 | Level | Node level |

---

### Component 6: World Tier

Encodes the selected world tier.

```
+--------+
| Tier   |
+--------+
| 1 byte |
+--------+
```

**World Tier Enum:**

| Value | World Tier |
|-------|------------|
| 0 | Normal |
| 1 | Abyss |
| 2 | Oblivion |
| 3 | Void |

---

## Data Type Encoding

### Integers

All multi-byte integers use **little-endian** byte order.

- `uint8`: 1 byte, unsigned
- `uint16`: 2 bytes, unsigned, little-endian

### Floating Point Values

Floating point values (multipliers, roll values) are stored as fixed-point integers:

```
stored_value = round(float_value * 10000)
```

This provides 4 decimal places of precision. For example:
- `1.0` is stored as `10000`
- `0.5` is stored as `5000`
- `1.2345` is stored as `12345`

To decode:
```
float_value = stored_value / 10000
```

### GUID Encoding

GUIDs (used for bell/constellation nodes) are 16-byte values derived from the string representation:

1. Remove all dashes from the GUID string (e.g., `"abc12345-def6-7890-abcd-ef1234567890"` becomes `"abc12345def67890abcdef1234567890"`)
2. Parse each pair of hex characters as a byte
3. Store as 16 bytes in sequence

Example:
```
Input:  "abc12345-def6-7890-abcd-ef1234567890"
Output: [0xab, 0xc1, 0x23, 0x45, 0xde, 0xf6, 0x78, 0x90, 0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78, 0x90]
```

---

## Version Compatibility

### Version 1 (Current)

Initial release supporting:
- Blessed and Trinket gear
- Skills (5 slots)
- Relics with all affix types
- Bell skill trees
- Constellation skill trees
- World tier

### Future Versions

When adding new features:

1. Increment the version byte
2. Add new component bits (use reserved bits 7+)
3. Existing decoders can skip unknown components using length prefix

### Decoder Behavior

- **Unknown version**: Warn user, attempt to decode with known format
- **Unknown components**: Skip using length prefix, warn user
- **Corrupted data**: Return error with specific failure point

---

## Size Estimates

| Component | Typical Size |
|-----------|-------------|
| Header | 4 bytes |
| Blessed Gear (8 items) | 2 + 1 + 8*7 = 59 bytes |
| Trinket Gear (4 items) | 2 + 1 + 4*7 = 31 bytes |
| Skills (5 slots) | 2 + 1 + 5*4 = 23 bytes |
| Relics (10 items, 3 affixes avg) | 2 + 2 + 10*(13 + 3*4) = 254 bytes |
| Bells (20 nodes) | 2 + 4 + 20*18 = 366 bytes |
| Constellations (50 nodes) | 2 + 2 + 50*19 = 954 bytes |
| World Tier | 2 + 1 = 3 bytes |
| **Total** | ~1,694 bytes |
| **Base64** | ~2,260 characters |

---

## Example

### Minimal Export (World Tier Only)

Binary (hex):
```
48 01 40 00    # Header: magic=H, version=1, components=0x40 (bit 6), reserved=0
01 00          # World Tier length: 1 byte
02             # World Tier data: Oblivion (2)
```

Base64:
```
SAFAAAEAAg==
```

### Simple Export (Skills + World Tier)

Binary (hex):
```
48 01 44 00    # Header: magic=H, version=1, components=0x44 (bits 2,6), reserved=0
09 00          # Skills length: 9 bytes
02             # Skill count: 2
00 64 00 05    # Skill 1: slot=0, id=100, level=5
01 C8 00 03    # Skill 2: slot=1, id=200, level=3
01 00          # World Tier length: 1 byte
01             # World Tier data: Abyss (1)
```

---

## Implementation Notes

### Encoder

1. Collect data from all context APIs
2. Determine which components have data (build bitmask)
3. Write header
4. For each present component (in bit order):
   - Encode component data to buffer
   - Write length prefix
   - Write data
5. Convert to base64

### Decoder

1. Decode base64 to binary
2. Validate header (magic byte, version)
3. Read component bitmask
4. For each bit set in bitmask:
   - Read length prefix
   - If known component: decode data
   - If unknown component: skip `length` bytes
5. Return parsed build data

import type { CollectionKey, ContentBundle, ContentRecord, JsonValue } from './types';
export interface FieldDefinition {
  key: string; label: string; type: 'text' | 'number' | 'boolean' | 'enum' | 'reference' | 'json' | 'string-array';
  required?: boolean; nullable?: boolean; readOnly?: boolean; defaultValue?: JsonValue;
  min?: number; max?: number; step?: number; sliderMin?: number; sliderMax?: number; unit?: string;
  options?: string[]; pattern?: string; jsonType?: 'object' | 'array';
  reference?: { collection: CollectionKey; valueField?: string; filter?: { field: string; value: JsonValue } };
}
/** DB bounds are separate from the shorter practical range shown by sliders. */
export const schemaFields: Record<CollectionKey, FieldDefinition[]> = {
  "items": [
    {
      "key": "code",
      "label": "Code",
      "type": "text",
      "required": true,
      "pattern": "^[a-z][a-z0-9_]*$"
    },
    {
      "key": "name",
      "label": "Name",
      "type": "text",
      "required": true
    },
    {
      "key": "description",
      "label": "Description",
      "type": "text",
      "required": false,
      "nullable": true,
      "defaultValue": null
    },
    {
      "key": "item_type",
      "label": "Item type",
      "type": "enum",
      "required": true,
      "options": [
        "weapon",
        "ammo",
        "consumable",
        "material",
        "tool",
        "armor",
        "quest_item"
      ],
      "defaultValue": "material"
    },
    {
      "key": "rarity",
      "label": "Rarity",
      "type": "enum",
      "required": true,
      "options": [
        "common",
        "uncommon",
        "rare",
        "epic",
        "legendary"
      ],
      "defaultValue": "common"
    },
    {
      "key": "max_stack",
      "label": "Max stack",
      "type": "number",
      "required": true,
      "min": 1,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 1,
      "sliderMax": 200,
      "defaultValue": 1
    },
    {
      "key": "weight",
      "label": "Weight",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 9999.99,
      "step": 0.01,
      "sliderMin": 0,
      "sliderMax": 20,
      "defaultValue": 0
    },
    {
      "key": "base_value",
      "label": "Base value",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 0,
      "sliderMax": 10000,
      "defaultValue": 0
    },
    {
      "key": "stats",
      "label": "Stats",
      "type": "json",
      "required": true,
      "nullable": false,
      "jsonType": "object",
      "defaultValue": {}
    },
    {
      "key": "icon_key",
      "label": "Icon key",
      "type": "text",
      "required": false,
      "nullable": true,
      "defaultValue": null
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "created_at",
      "label": "Created at",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "updated_at",
      "label": "Updated at",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ],
  "weapons": [
    {
      "key": "item_code",
      "label": "Weapon item",
      "type": "reference",
      "required": true,
      "nullable": false,
      "defaultValue": "",
      "reference": {
        "collection": "items",
        "filter": {
          "field": "item_type",
          "value": "weapon"
        }
      }
    },
    {
      "key": "item_type",
      "label": "Item type",
      "type": "enum",
      "required": true,
      "options": [
        "weapon"
      ],
      "defaultValue": "weapon"
    },
    {
      "key": "weapon_class",
      "label": "Weapon class",
      "type": "enum",
      "required": true,
      "options": [
        "pistol",
        "smg",
        "rifle",
        "shotgun",
        "sniper",
        "melee"
      ],
      "defaultValue": "rifle"
    },
    {
      "key": "damage",
      "label": "Damage",
      "type": "number",
      "required": true,
      "min": 0.01,
      "max": 99999.99,
      "step": 0.01,
      "sliderMin": 0.01,
      "sliderMax": 200,
      "defaultValue": 24,
      "unit": "HP"
    },
    {
      "key": "fire_rate",
      "label": "Fire rate",
      "type": "number",
      "required": true,
      "min": 0.01,
      "max": 9999.99,
      "step": 0.01,
      "sliderMin": 0.01,
      "sliderMax": 30,
      "defaultValue": 6.5,
      "unit": "shots/s"
    },
    {
      "key": "effective_range",
      "label": "Effective range",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 9999.99,
      "step": 0.01,
      "sliderMin": 0,
      "sliderMax": 150,
      "defaultValue": 40,
      "unit": "game units"
    },
    {
      "key": "magazine_size",
      "label": "Magazine size",
      "type": "number",
      "required": true,
      "min": 1,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 1,
      "sliderMax": 150,
      "defaultValue": 30,
      "nullable": true
    },
    {
      "key": "reload_time_s",
      "label": "Reload time",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 999.99,
      "step": 0.01,
      "sliderMin": 0,
      "sliderMax": 15,
      "defaultValue": 2.4,
      "nullable": true,
      "unit": "s"
    },
    {
      "key": "ammo_item_code",
      "label": "Ammo item",
      "type": "reference",
      "required": false,
      "nullable": true,
      "defaultValue": null,
      "reference": {
        "collection": "items",
        "filter": {
          "field": "item_type",
          "value": "ammo"
        }
      }
    },
    {
      "key": "ammo_type",
      "label": "Ammo type",
      "type": "enum",
      "required": true,
      "options": [
        "ammo"
      ],
      "defaultValue": "ammo"
    },
    {
      "key": "max_durability",
      "label": "Max durability",
      "type": "number",
      "required": true,
      "min": 1,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 1,
      "sliderMax": 1000,
      "defaultValue": 100
    },
    {
      "key": "durability_per_use",
      "label": "Durability per use",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 999.999,
      "step": 0.001,
      "sliderMin": 0,
      "sliderMax": 10,
      "defaultValue": 0.12
    },
    {
      "key": "noise_radius",
      "label": "Noise radius",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 9999.99,
      "step": 0.01,
      "sliderMin": 0,
      "sliderMax": 100,
      "defaultValue": 18,
      "unit": "game units"
    },
    {
      "key": "is_suppressed",
      "label": "Suppressed",
      "type": "boolean",
      "required": true,
      "defaultValue": false
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "created_at",
      "label": "Created at",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "updated_at",
      "label": "Updated at",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ],
  "consumables": [
    {
      "key": "item_code",
      "label": "Consumable item",
      "type": "reference",
      "required": true,
      "nullable": false,
      "defaultValue": "",
      "reference": {
        "collection": "items",
        "filter": {
          "field": "item_type",
          "value": "consumable"
        }
      }
    },
    {
      "key": "item_type",
      "label": "Item type",
      "type": "enum",
      "required": true,
      "options": [
        "consumable"
      ],
      "defaultValue": "consumable"
    },
    {
      "key": "heal_hp",
      "label": "Heal HP",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 0,
      "sliderMax": 500,
      "defaultValue": 25,
      "unit": "HP"
    },
    {
      "key": "restore_stamina",
      "label": "Restore stamina",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 0,
      "sliderMax": 500,
      "defaultValue": 0
    },
    {
      "key": "use_time_s",
      "label": "Use time",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 999.99,
      "step": 0.01,
      "sliderMin": 0,
      "sliderMax": 15,
      "defaultValue": 2,
      "unit": "s"
    },
    {
      "key": "cures",
      "label": "Cures",
      "type": "string-array",
      "required": true,
      "defaultValue": []
    },
    {
      "key": "extra_effects",
      "label": "Extra effects",
      "type": "json",
      "required": true,
      "nullable": false,
      "jsonType": "object",
      "defaultValue": {}
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "created_at",
      "label": "Created at",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "updated_at",
      "label": "Updated at",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ],
  "skills": [
    {
      "key": "code",
      "label": "Code",
      "type": "text",
      "required": true,
      "pattern": "^[a-z][a-z0-9_]*$"
    },
    {
      "key": "name",
      "label": "Name",
      "type": "text",
      "required": true
    },
    {
      "key": "skill_type",
      "label": "Skill type",
      "type": "enum",
      "required": true,
      "options": [
        "shooting",
        "engineering",
        "stealth"
      ],
      "defaultValue": "engineering"
    },
    {
      "key": "max_level",
      "label": "Max level",
      "type": "number",
      "required": true,
      "min": 1,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 1,
      "sliderMax": 100,
      "defaultValue": 10
    },
    {
      "key": "xp_curve",
      "label": "XP curve",
      "type": "json",
      "required": true,
      "nullable": false,
      "jsonType": "array",
      "defaultValue": []
    },
    {
      "key": "effects",
      "label": "Effects",
      "type": "json",
      "required": true,
      "nullable": false,
      "jsonType": "object",
      "defaultValue": {}
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "created_at",
      "label": "Created at",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "updated_at",
      "label": "Updated at",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ],
  "loot_tables": [
    {
      "key": "code",
      "label": "Code",
      "type": "text",
      "required": true,
      "pattern": "^[a-z][a-z0-9_]*$"
    },
    {
      "key": "name",
      "label": "Name",
      "type": "text",
      "required": true
    },
    {
      "key": "rolls_min",
      "label": "Min rolls",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 0,
      "sliderMax": 20,
      "defaultValue": 1
    },
    {
      "key": "rolls_max",
      "label": "Max rolls",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 0,
      "sliderMax": 20,
      "defaultValue": 1
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "created_at",
      "label": "Created at",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "updated_at",
      "label": "Updated at",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ],
  "loot_table_entries": [
    {
      "key": "loot_table_code",
      "label": "Loot table",
      "type": "reference",
      "required": true,
      "nullable": false,
      "defaultValue": "",
      "reference": {
        "collection": "loot_tables"
      }
    },
    {
      "key": "item_code",
      "label": "Item",
      "type": "reference",
      "required": true,
      "nullable": false,
      "defaultValue": "",
      "reference": {
        "collection": "items"
      }
    },
    {
      "key": "tier",
      "label": "Tier",
      "type": "number",
      "required": true,
      "min": 1,
      "max": 5,
      "step": 1,
      "sliderMin": 1,
      "sliderMax": 5,
      "defaultValue": 1
    },
    {
      "key": "weight",
      "label": "Drop weight",
      "type": "number",
      "required": true,
      "min": 0.0001,
      "max": 999999.9999,
      "step": 0.0001,
      "sliderMin": 0.0001,
      "sliderMax": 100,
      "defaultValue": 1
    },
    {
      "key": "min_qty",
      "label": "Min quantity",
      "type": "number",
      "required": true,
      "min": 1,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 1,
      "sliderMax": 100,
      "defaultValue": 1
    },
    {
      "key": "max_qty",
      "label": "Max quantity",
      "type": "number",
      "required": true,
      "min": 1,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 1,
      "sliderMax": 100,
      "defaultValue": 1
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ],
  "maps": [
    {
      "key": "code",
      "label": "Code",
      "type": "text",
      "required": true,
      "pattern": "^[a-z][a-z0-9_]*$"
    },
    {
      "key": "name",
      "label": "Name",
      "type": "text",
      "required": true
    },
    {
      "key": "scene_key",
      "label": "Scene key",
      "type": "text",
      "required": true
    },
    {
      "key": "is_safe_camp",
      "label": "Safe camp",
      "type": "boolean",
      "required": true,
      "defaultValue": false
    },
    {
      "key": "sort_order",
      "label": "Sort order",
      "type": "number",
      "required": true,
      "min": -2147483648,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 0,
      "sliderMax": 100,
      "defaultValue": 0
    },
    {
      "key": "nav_graph",
      "label": "Navigation graph",
      "type": "json",
      "required": true,
      "nullable": false,
      "jsonType": "object",
      "defaultValue": {}
    },
    {
      "key": "layout",
      "label": "Layout",
      "type": "json",
      "required": true,
      "nullable": false,
      "jsonType": "object",
      "defaultValue": {}
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "created_at",
      "label": "Created at",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "updated_at",
      "label": "Updated at",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ],
  "map_loot_tables": [
    {
      "key": "map_code",
      "label": "Map",
      "type": "reference",
      "required": true,
      "nullable": false,
      "defaultValue": "",
      "reference": {
        "collection": "maps"
      }
    },
    {
      "key": "loot_table_code",
      "label": "Loot table",
      "type": "reference",
      "required": true,
      "nullable": false,
      "defaultValue": "",
      "reference": {
        "collection": "loot_tables"
      }
    },
    {
      "key": "container_tag",
      "label": "Container tag",
      "type": "text",
      "required": true,
      "defaultValue": "default"
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ],
  "enemy_types": [
    {
      "key": "code",
      "label": "Code",
      "type": "text",
      "required": true,
      "pattern": "^[a-z][a-z0-9_]*$"
    },
    {
      "key": "name",
      "label": "Name",
      "type": "text",
      "required": true
    },
    {
      "key": "archetype",
      "label": "Archetype",
      "type": "text",
      "required": true,
      "defaultValue": "rifleman"
    },
    {
      "key": "is_boss",
      "label": "Boss",
      "type": "boolean",
      "required": true,
      "defaultValue": false
    },
    {
      "key": "max_hp",
      "label": "Max HP",
      "type": "number",
      "required": true,
      "min": 1,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 1,
      "sliderMax": 2000,
      "defaultValue": 80,
      "unit": "HP"
    },
    {
      "key": "move_speed",
      "label": "Move speed",
      "type": "number",
      "required": true,
      "min": 0.01,
      "max": 999.99,
      "step": 0.01,
      "sliderMin": 0.01,
      "sliderMax": 15,
      "defaultValue": 3.5,
      "unit": "game units/s"
    },
    {
      "key": "vision_range",
      "label": "Vision range",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 9999.99,
      "step": 0.01,
      "sliderMin": 0,
      "sliderMax": 100,
      "defaultValue": 15,
      "unit": "game units"
    },
    {
      "key": "vision_angle_deg",
      "label": "Vision angle",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 360,
      "step": 0.01,
      "sliderMin": 0,
      "sliderMax": 360,
      "defaultValue": 90,
      "unit": "°"
    },
    {
      "key": "hearing_range",
      "label": "Hearing range",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 9999.99,
      "step": 0.01,
      "sliderMin": 0,
      "sliderMax": 100,
      "defaultValue": 10,
      "unit": "game units"
    },
    {
      "key": "accuracy",
      "label": "Accuracy",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 1,
      "step": 0.001,
      "sliderMin": 0,
      "sliderMax": 1,
      "defaultValue": 0.5
    },
    {
      "key": "weapon_item_code",
      "label": "Weapon",
      "type": "reference",
      "required": false,
      "nullable": true,
      "defaultValue": null,
      "reference": {
        "collection": "weapons",
        "valueField": "item_code"
      }
    },
    {
      "key": "fsm_params",
      "label": "FSM parameters",
      "type": "json",
      "required": true,
      "nullable": false,
      "jsonType": "object",
      "defaultValue": {}
    },
    {
      "key": "loot_table_code",
      "label": "Loot table",
      "type": "reference",
      "required": false,
      "nullable": true,
      "defaultValue": null,
      "reference": {
        "collection": "loot_tables"
      }
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "created_at",
      "label": "Created at",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "updated_at",
      "label": "Updated at",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ],
  "enemy_placements": [
    {
      "key": "id",
      "label": "Placement ID",
      "type": "text",
      "required": true,
      "readOnly": true
    },
    {
      "key": "map_code",
      "label": "Map",
      "type": "reference",
      "required": true,
      "nullable": false,
      "defaultValue": "",
      "reference": {
        "collection": "maps"
      }
    },
    {
      "key": "enemy_type_code",
      "label": "Enemy type",
      "type": "reference",
      "required": true,
      "nullable": false,
      "defaultValue": "",
      "reference": {
        "collection": "enemy_types"
      }
    },
    {
      "key": "squad_tag",
      "label": "Squad tag",
      "type": "text",
      "required": true,
      "defaultValue": "squad_1"
    },
    {
      "key": "pos_x",
      "label": "Position X",
      "type": "number",
      "required": true,
      "min": -999999.999,
      "max": 999999.999,
      "step": 0.001,
      "sliderMin": -100,
      "sliderMax": 100,
      "defaultValue": 0,
      "unit": "game units"
    },
    {
      "key": "pos_y",
      "label": "Position Y",
      "type": "number",
      "required": true,
      "min": -999999.999,
      "max": 999999.999,
      "step": 0.001,
      "sliderMin": -100,
      "sliderMax": 100,
      "defaultValue": 0,
      "unit": "game units"
    },
    {
      "key": "facing_deg",
      "label": "Facing",
      "type": "number",
      "required": true,
      "min": -999.99,
      "max": 999.99,
      "step": 0.01,
      "sliderMin": 0,
      "sliderMax": 360,
      "defaultValue": 0,
      "unit": "°"
    },
    {
      "key": "patrol_route",
      "label": "Patrol route",
      "type": "json",
      "required": true,
      "nullable": false,
      "jsonType": "array",
      "defaultValue": []
    },
    {
      "key": "spawn_condition",
      "label": "Spawn condition",
      "type": "json",
      "required": false,
      "nullable": true,
      "jsonType": "object",
      "defaultValue": null
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "created_at",
      "label": "Created at",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "updated_at",
      "label": "Updated at",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ],
  "crafting_recipes": [
    {
      "key": "code",
      "label": "Code",
      "type": "text",
      "required": true,
      "pattern": "^[a-z][a-z0-9_]*$"
    },
    {
      "key": "name",
      "label": "Name",
      "type": "text",
      "required": true
    },
    {
      "key": "output_item_code",
      "label": "Output item",
      "type": "reference",
      "required": true,
      "nullable": false,
      "defaultValue": "",
      "reference": {
        "collection": "items"
      }
    },
    {
      "key": "output_quantity",
      "label": "Output quantity",
      "type": "number",
      "required": true,
      "min": 1,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 1,
      "sliderMax": 100,
      "defaultValue": 1
    },
    {
      "key": "craft_time_s",
      "label": "Craft time",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 9999.99,
      "step": 0.01,
      "sliderMin": 0,
      "sliderMax": 60,
      "defaultValue": 0,
      "unit": "s"
    },
    {
      "key": "required_skill_code",
      "label": "Required skill",
      "type": "reference",
      "required": false,
      "nullable": true,
      "defaultValue": null,
      "reference": {
        "collection": "skills"
      }
    },
    {
      "key": "required_skill_level",
      "label": "Required skill level",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 0,
      "sliderMax": 100,
      "defaultValue": 0
    },
    {
      "key": "station",
      "label": "Station",
      "type": "text",
      "required": true,
      "defaultValue": "workbench"
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "created_at",
      "label": "Created at",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "updated_at",
      "label": "Updated at",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ],
  "crafting_recipe_ingredients": [
    {
      "key": "recipe_code",
      "label": "Recipe",
      "type": "reference",
      "required": true,
      "nullable": false,
      "defaultValue": "",
      "reference": {
        "collection": "crafting_recipes"
      }
    },
    {
      "key": "item_code",
      "label": "Ingredient item",
      "type": "reference",
      "required": true,
      "nullable": false,
      "defaultValue": "",
      "reference": {
        "collection": "items"
      }
    },
    {
      "key": "quantity",
      "label": "Quantity",
      "type": "number",
      "required": true,
      "min": 1,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 1,
      "sliderMax": 100,
      "defaultValue": 1
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ],
  "quests": [
    {
      "key": "code",
      "label": "Code",
      "type": "text",
      "required": true,
      "pattern": "^[a-z][a-z0-9_]*$"
    },
    {
      "key": "title",
      "label": "Title",
      "type": "text",
      "required": true
    },
    {
      "key": "description",
      "label": "Description",
      "type": "text",
      "required": false,
      "nullable": true,
      "defaultValue": null
    },
    {
      "key": "is_main",
      "label": "Main quest",
      "type": "boolean",
      "required": true,
      "defaultValue": false
    },
    {
      "key": "sort_order",
      "label": "Sort order",
      "type": "number",
      "required": true,
      "min": -2147483648,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 0,
      "sliderMax": 100,
      "defaultValue": 0
    },
    {
      "key": "objectives",
      "label": "Objectives",
      "type": "json",
      "required": true,
      "nullable": false,
      "jsonType": "array",
      "defaultValue": []
    },
    {
      "key": "prerequisites",
      "label": "Prerequisites",
      "type": "string-array",
      "required": true,
      "defaultValue": [],
      "reference": {
        "collection": "quests"
      }
    },
    {
      "key": "reward_xp",
      "label": "Reward XP",
      "type": "number",
      "required": true,
      "min": 0,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 0,
      "sliderMax": 10000,
      "defaultValue": 0,
      "unit": "XP"
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "created_at",
      "label": "Created at",
      "type": "text",
      "required": false,
      "readOnly": true
    },
    {
      "key": "updated_at",
      "label": "Updated at",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ],
  "quest_rewards": [
    {
      "key": "quest_code",
      "label": "Quest",
      "type": "reference",
      "required": true,
      "nullable": false,
      "defaultValue": "",
      "reference": {
        "collection": "quests"
      }
    },
    {
      "key": "item_code",
      "label": "Reward item",
      "type": "reference",
      "required": true,
      "nullable": false,
      "defaultValue": "",
      "reference": {
        "collection": "items"
      }
    },
    {
      "key": "quantity",
      "label": "Quantity",
      "type": "number",
      "required": true,
      "min": 1,
      "max": 2147483647,
      "step": 1,
      "sliderMin": 1,
      "sliderMax": 100,
      "defaultValue": 1
    },
    {
      "key": "content_version_id",
      "label": "Content version ID",
      "type": "text",
      "required": false,
      "readOnly": true
    }
  ]
};
export const collectionIdentity: Record<CollectionKey, string[]> = {
  "items": [
    "code"
  ],
  "weapons": [
    "item_code"
  ],
  "consumables": [
    "item_code"
  ],
  "skills": [
    "code"
  ],
  "loot_tables": [
    "code"
  ],
  "loot_table_entries": [
    "loot_table_code",
    "item_code",
    "tier"
  ],
  "maps": [
    "code"
  ],
  "map_loot_tables": [
    "map_code",
    "loot_table_code",
    "container_tag"
  ],
  "enemy_types": [
    "code"
  ],
  "enemy_placements": [
    "id"
  ],
  "crafting_recipes": [
    "code"
  ],
  "crafting_recipe_ingredients": [
    "recipe_code",
    "item_code"
  ],
  "quests": [
    "code"
  ],
  "quest_rewards": [
    "quest_code",
    "item_code"
  ]
};

export function recordIdentity(collection: CollectionKey, record: ContentRecord): string {
  return collectionIdentity[collection].map(key => String(record[key] ?? '')).join(' · ');
}
export function recordLabel(collection: CollectionKey, record: ContentRecord, bundle?: ContentBundle): string {
  if (record.name || record.title) return String(record.name || record.title);
  if ((collection === 'weapons' || collection === 'consumables') && bundle) {
    const item = bundle.items.find(item => item.code === record.item_code);
    if (item) return String(item.name);
  }
  return recordIdentity(collection, record);
}
export function createContentRecord(collection: CollectionKey, bundle: ContentBundle): ContentRecord {
  const record: ContentRecord = {};
  for (const field of schemaFields[collection]) {
    if (field.readOnly) {
      if (field.defaultValue !== undefined) record[field.key] = structuredClone(field.defaultValue);
      continue;
    }
    if (field.type === 'reference' && field.reference && !field.nullable) {
      const reference = field.reference;
      const match = bundle[reference.collection].find(value => !reference.filter || value[reference.filter.field] === reference.filter.value);
      record[field.key] = match?.[reference.valueField || 'code'] ?? '';
    } else if (field.defaultValue !== undefined) record[field.key] = structuredClone(field.defaultValue);
    else record[field.key] = '';
  }
  if (collectionIdentity[collection].includes('code')) {
    let counter = 1;
    while (bundle[collection].some(row => row.code === 'new_' + collection + '_' + counter)) counter++;
    record.code = 'new_' + collection + '_' + counter;
    if ('name' in record) record.name = 'New ' + collection.replaceAll('_', ' ');
    if ('title' in record) record.title = 'New quest';
  }
  if (collection === 'enemy_placements') record.id = crypto.randomUUID();
  const identity = collectionIdentity[collection];
  const used = new Set(bundle[collection].map(row => recordIdentity(collection, row)));
  // Pick an available FK combination for new join rows; user can still select another.
  const choose = (index: number): boolean => {
    if (index === identity.length) return !used.has(recordIdentity(collection, record));
    const key = identity[index], field = schemaFields[collection].find(field => field.key === key);
    const reference = field?.reference;
    const options: JsonValue[] = reference ? bundle[reference.collection].filter(row => !reference.filter || row[reference.filter.field] === reference.filter.value).map(row => row[reference.valueField || 'code']) : [record[key]];
    if (key === 'tier') options.splice(0, options.length, 1, 2, 3, 4, 5);
    for (const value of options) { record[key] = value; if (choose(index + 1)) return true; }
    return false;
  };
  if (!identity.includes('code') && !identity.includes('id')) choose(0);
  return record;
}

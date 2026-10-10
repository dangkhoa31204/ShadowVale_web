// Generated from checked-in BE OpenAPI. Run node scripts/sync-api-contract.mjs after changes.
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type AiComparisonRowDto = {
  "contentVersionId": null | string;
  "contentVersionLabel": null | string;
  "groupKey": string;
  "groupLabel": string;
  "family": string;
  "sessions": number | string;
  "encounters": number | string;
  "captures": number | string;
  "escapes": number | string;
  "captureRate": null | number | string;
  "avgEscapeSeconds": null | number | string;
  "medianEscapeSeconds": null | number | string;
  "replans": number | string;
  "avgCoordinationScore": null | number | string;
  "latencyP50Ms": null | number | string;
  "latencyP95Ms": null | number | string;
  "latencyP99Ms": null | number | string;
  "withinBudgetRate": null | number | string;
  "fallbackRate": null | number | string;
};
export type ApiError = {
  "type"?: null | string;
  "title"?: null | string;
  "status"?: null | number | string;
  "detail"?: null | string;
  "instance"?: null | string;
  "errors"?: Record<string, Array<string>>;
  "code"?: string;
  "message"?: string;
  "traceId"?: string;
};
export type AssignedSolver = {
  "configurationId"?: string;
  "code"?: string;
  "variant"?: string;
  "params"?: JsonValue;
  "quboWeights"?: Record<string, number | string>;
  "timeBudgetMs"?: number | string;
};
export type AuthResponse = {
  "accessToken": string;
  "accessTokenExpiresAt": string;
  "refreshToken": string;
  "refreshTokenExpiresAt": string;
  "user": UserDto;
};
export type ChangePasswordRequest = {
  "currentPassword": string;
  "newPassword": string;
};
export type CloneSolverConfigurationRequest = {
  "code": string;
  "name": string;
};
export type ConsumableDto = {
  "healHp": number | string;
  "restoreStamina": number | string;
  "useTimeSeconds": number | string;
  "cures": Array<string>;
  "extraEffects": JsonElement;
};
export type ConsumableRequest = {
  "healHp"?: number | string;
  "restoreStamina"?: number | string;
  "useTimeSeconds"?: number | string;
  "cures"?: null | Array<string>;
  "extraEffects"?: null | JsonElement;
};
export type ContentManifest = {
  "versionId"?: string;
  "versionNo"?: number | string;
  "label"?: string;
  "schemaVersion"?: string;
  "checksum"?: string;
  "publishedAt"?: string;
};
export type CoordinationResultDto = {
  "id"?: string;
  "variant"?: string;
  "usedFallback"?: boolean;
  "taskType"?: string;
  "squadTag"?: null | string;
  "mapCode"?: null | string;
  "numAgents"?: number | string;
  "numNodes"?: number | string;
  "numQuboVars"?: null | number | string;
  "objectiveValue"?: null | number | string;
  "solveLatencyMs"?: number | string;
  "withinBudget"?: boolean;
  "assignment"?: null | JsonValue;
  "coordinationScore"?: null | number | string;
  "triggeredAt"?: string;
};
export type CraftingRecipeDto = {
  "id": string;
  "code": string;
  "name": string;
  "outputItemCode": string;
  "outputQuantity": number | string;
  "craftTimeSeconds": number | string;
  "requiredSkillCode": null | string;
  "requiredSkillLevel": number | string;
  "station": string;
  "ingredients": Array<IngredientDto>;
  "updatedAt": string;
};
export type CreateContentVersionRequest = {
  "label": string;
  "changelog"?: null | string;
  "parentVersionId"?: null | string;
  "schemaVersion": string;
};
export type CreateCraftingRecipeRequest = {
  "code": string;
  "name": string;
  "outputItemCode": string;
  "outputQuantity"?: number | string;
  "craftTimeSeconds"?: number | string;
  "requiredSkillCode"?: null | string;
  "requiredSkillLevel"?: number | string;
  "station": string;
  "ingredients": Array<IngredientRequest>;
};
export type CreateEnemyTypeRequest = {
  "code": string;
  "name": string;
  "archetype": string;
  "isBoss"?: boolean;
  "maxHp"?: number | string;
  "moveSpeed"?: number | string;
  "visionRange"?: number | string;
  "visionAngleDegrees"?: number | string;
  "hearingRange"?: number | string;
  "accuracy"?: number | string;
  "weaponItemCode"?: null | string;
  "lootTableCode"?: null | string;
  "fsmParams"?: null | JsonElement;
};
export type CreateItemRequest = {
  "code": string;
  "name": string;
  "description"?: null | string;
  "type": string;
  "rarity"?: null | string;
  "maxStack"?: number | string;
  "weight"?: number | string;
  "baseValue"?: number | string;
  "stats"?: null | JsonElement;
  "iconKey"?: null | string;
  "weapon"?: null | WeaponRequest;
  "consumable"?: null | ConsumableRequest;
};
export type CreateLootTableRequest = {
  "code": string;
  "name": string;
  "rollsMin"?: number | string;
  "rollsMax"?: number | string;
  "entries": Array<LootEntryRequest>;
};
export type CreateMapRequest = {
  "code": string;
  "name": string;
  "sceneKey": string;
  "isSafeCamp"?: boolean;
  "sortOrder"?: number | string;
  "navGraph"?: null | JsonElement;
  "layout"?: null | JsonElement;
  "enemyPlacements"?: null | Array<EnemyPlacementRequest>;
  "lootTables"?: null | Array<MapLootTableRequest>;
};
export type CreateQuestRequest = {
  "code": string;
  "title": string;
  "description"?: null | string;
  "isMain"?: boolean;
  "sortOrder"?: number | string;
  "objectives"?: null | JsonElement;
  "prerequisites"?: null | Array<string>;
  "rewardXp"?: number | string;
  "rewards"?: null | Array<QuestRewardRequest>;
};
export type CreateSkillRequest = {
  "code": string;
  "name": string;
  "type": string;
  "maxLevel"?: number | string;
  "xpCurve"?: null | JsonElement;
  "effects"?: null | JsonElement;
};
export type CreateSolverConfigurationRequest = {
  "code": string;
  "name": string;
  "algorithm": string;
  "library"?: null | string;
  "params"?: null | JsonValue;
  "quboWeights"?: null | JsonValue;
  "timeBudgetMs"?: number | string;
};
export type CreateUserRequest = {
  "username": string;
  "email": string;
  "fullName"?: null | string;
  "password": string;
  "role": string;
};
export type DailyCountDto = {
  "day": string;
  "sessions": number | string;
};
export type DeleteContentVersionRequest = {
  "revision": null | number | string;
};
export type EncounterStats = {
  "index"?: number | string;
  "outcome"?: string;
  "startedAt"?: string;
  "endedAt"?: string;
  "numAgents"?: number | string;
  "numReplans"?: number | string;
  "numFallbacks"?: number | string;
  "coordinationScore"?: null | number | string;
};
export type EnemyPlacementDto = {
  "enemyTypeCode": string;
  "squadTag": string;
  "posX": number | string;
  "posY": number | string;
  "facingDegrees": number | string;
  "patrolRoute": JsonElement;
  "spawnCondition": null | JsonElement;
};
export type EnemyPlacementRequest = {
  "enemyTypeCode": string;
  "squadTag": string;
  "posX"?: number | string;
  "posY"?: number | string;
  "facingDegrees"?: number | string;
  "patrolRoute"?: null | JsonElement;
  "spawnCondition"?: null | JsonElement;
};
export type EnemyTypeDto = {
  "id": string;
  "code": string;
  "name": string;
  "archetype": string;
  "isBoss": boolean;
  "maxHp": number | string;
  "moveSpeed": number | string;
  "visionRange": number | string;
  "visionAngleDegrees": number | string;
  "hearingRange": number | string;
  "accuracy": number | string;
  "weaponItemCode": null | string;
  "lootTableCode": null | string;
  "fsmParams": JsonElement;
  "updatedAt": string;
};
export type EnumsDto = {
  "solverAlgorithms": Array<string>;
  "solverFamilies": Array<string>;
  "sessionOutcomes": Array<string>;
  "encounterOutcomes": Array<string>;
  "sessionSources": Array<string>;
  "itemTypes": Array<string>;
  "itemRarities": Array<string>;
  "weaponClasses": Array<string>;
  "skillTypes": Array<string>;
  "contentStatuses": Array<string>;
};
export type FunnelDto = {
  "sessionsStarted": number | string;
  "objectives": Array<FunnelStepDto>;
  "missionsCompleted": number | string;
  "completionRate": null | number | string;
};
export type FunnelStepDto = {
  "objectiveIndex": number | string;
  "sessions": number | string;
  "shareOfStarted": null | number | string;
};
export type HeatCellDto = {
  "x": number | string;
  "y": number | string;
  "count": number | string;
};
export type HeatmapDto = {
  "mapCode": string;
  "cellSize": number | string;
  "eventTypes": Array<string>;
  "cells": Array<HeatCellDto>;
};
export type HistogramBucketDto = {
  "from": number | string;
  "to": number | string;
  "sessions": number | string;
};
export type IngredientDto = {
  "itemCode": string;
  "quantity": number | string;
};
export type IngredientRequest = {
  "itemCode": string;
  "quantity"?: number | string;
};
export type ItemCounts = {
  "accepted"?: number | string;
  "duplicate"?: number | string;
  "rejected"?: number | string;
};
export type ItemDto = {
  "id": string;
  "code": string;
  "name": string;
  "description": null | string;
  "type": string;
  "rarity": string;
  "maxStack": number | string;
  "weight": number | string;
  "baseValue": number | string;
  "stats": JsonElement;
  "iconKey": null | string;
  "weapon": null | AuthoringWeaponDto;
  "consumable": null | ConsumableDto;
  "updatedAt": string;
};
export type JsonElement = JsonValue;
export type LoginRequest = {
  "usernameOrEmail": string;
  "password": string;
};
export type LootEntryDto = {
  "itemCode": string;
  "tier": number | string;
  "weight": number | string;
  "minQuantity": number | string;
  "maxQuantity": number | string;
};
export type LootEntryRequest = {
  "itemCode": string;
  "tier"?: number | string;
  "weight"?: number | string;
  "minQuantity"?: number | string;
  "maxQuantity"?: number | string;
};
export type LootTableDto = {
  "id": string;
  "code": string;
  "name": string;
  "rollsMin": number | string;
  "rollsMax": number | string;
  "entries": Array<LootEntryDto>;
  "updatedAt": string;
};
export type MapDto = {
  "id": string;
  "code": string;
  "name": string;
  "sceneKey": string;
  "isSafeCamp": boolean;
  "sortOrder": number | string;
  "navGraph": JsonElement;
  "layout": JsonElement;
  "enemyPlacements": Array<EnemyPlacementDto>;
  "lootTables": Array<MapLootTableDto>;
  "updatedAt": string;
};
export type MapLootTableDto = {
  "lootTableCode": string;
  "containerTag": string;
};
export type MapLootTableRequest = {
  "lootTableCode": string;
  "containerTag": string;
};
export type MapSummaryDto = {
  "id": string;
  "code": string;
  "name": string;
  "sceneKey": string;
  "isSafeCamp": boolean;
  "sortOrder": number | string;
  "enemyCount": number | string;
  "lootTableCount": number | string;
  "updatedAt": string;
};
export type OutcomeShareDto = {
  "outcome": string;
  "sessions": number | string;
  "share": number | string;
};
export type OverviewDto = {
  "sessions": number | string;
  "players": number | string;
  "unfinishedSessions": number | string;
  "avgDurationSeconds": null | number | string;
  "medianDurationSeconds": null | number | string;
  "outcomes": Array<OutcomeShareDto>;
  "sessionsPerDay": Array<DailyCountDto>;
};
export type PagedResultOfUserDto = {
  "items": Array<UserDto>;
  "page": number | string;
  "pageSize": number | string;
  "totalCount": number | string;
  "totalPages"?: number | string;
};
export type PlaystyleDto = {
  "finishedSessions": number | string;
  "sessionsWithoutKills": number | string;
  "avgStealthRatio": null | number | string;
  "medianStealthRatio": null | number | string;
  "avgTimesDetected": null | number | string;
  "medianTimesDetected": null | number | string;
  "stealthRatioHistogram": Array<HistogramBucketDto>;
};
export type ProblemDetails = {
  "type"?: null | string;
  "title"?: null | string;
  "status"?: null | number | string;
  "detail"?: null | string;
  "instance"?: null | string;
};
export type PublishContentVersionRequest = {
  "revision": null | number | string;
  "reason": string;
};
export type QuestDto = {
  "id": string;
  "code": string;
  "title": string;
  "description": null | string;
  "isMain": boolean;
  "sortOrder": number | string;
  "objectives": JsonElement;
  "prerequisites": Array<string>;
  "rewardXp": number | string;
  "rewards": Array<QuestRewardDto>;
  "updatedAt": string;
};
export type QuestRewardDto = {
  "itemCode": string;
  "quantity": number | string;
};
export type QuestRewardRequest = {
  "itemCode": string;
  "quantity"?: number | string;
};
export type RefreshTokenRequest = {
  "refreshToken": string;
};
export type ResetPasswordRequest = {
  "newPassword": string;
};
export type ReviewContentVersionRequest = {
  "revision": null | number | string;
  "reviewNote"?: null | string;
};
export type RollbackContentVersionRequest = {
  "revision": null | number | string;
  "reason": string;
};
export type SaveCraftingRecipeRequest = {
  "name": string;
  "outputItemCode": string;
  "outputQuantity"?: number | string;
  "craftTimeSeconds"?: number | string;
  "requiredSkillCode"?: null | string;
  "requiredSkillLevel"?: number | string;
  "station": string;
  "ingredients": Array<IngredientRequest>;
};
export type SaveEnemyTypeRequest = {
  "name": string;
  "archetype": string;
  "isBoss"?: boolean;
  "maxHp"?: number | string;
  "moveSpeed"?: number | string;
  "visionRange"?: number | string;
  "visionAngleDegrees"?: number | string;
  "hearingRange"?: number | string;
  "accuracy"?: number | string;
  "weaponItemCode"?: null | string;
  "lootTableCode"?: null | string;
  "fsmParams"?: null | JsonElement;
};
export type SaveItemRequest = {
  "name": string;
  "description"?: null | string;
  "type": string;
  "rarity"?: null | string;
  "maxStack"?: number | string;
  "weight"?: number | string;
  "baseValue"?: number | string;
  "stats"?: null | JsonElement;
  "iconKey"?: null | string;
  "weapon"?: null | WeaponRequest;
  "consumable"?: null | ConsumableRequest;
};
export type SaveLootTableRequest = {
  "name": string;
  "rollsMin"?: number | string;
  "rollsMax"?: number | string;
  "entries": Array<LootEntryRequest>;
};
export type SaveMapRequest = {
  "name": string;
  "sceneKey": string;
  "isSafeCamp"?: boolean;
  "sortOrder"?: number | string;
  "navGraph"?: null | JsonElement;
  "layout"?: null | JsonElement;
  "enemyPlacements"?: null | Array<EnemyPlacementRequest>;
  "lootTables"?: null | Array<MapLootTableRequest>;
};
export type SaveQuestRequest = {
  "title": string;
  "description"?: null | string;
  "isMain"?: boolean;
  "sortOrder"?: number | string;
  "objectives"?: null | JsonElement;
  "prerequisites"?: null | Array<string>;
  "rewardXp"?: number | string;
  "rewards"?: null | Array<QuestRewardRequest>;
};
export type SaveSkillRequest = {
  "name": string;
  "type": string;
  "maxLevel"?: number | string;
  "xpCurve"?: null | JsonElement;
  "effects"?: null | JsonElement;
};
export type ScalabilityRowDto = {
  "configurationId": string;
  "code": string;
  "family": string;
  "numAgents": number | string;
  "nodesFrom": number | string;
  "nodesTo": number | string;
  "replans": number | string;
  "latencyP50Ms": null | number | string;
  "latencyP95Ms": null | number | string;
  "avgObjective": null | number | string;
  "withinBudgetRate": null | number | string;
};
export type SessionStats = {
  "eventCounts"?: Record<string, number | string>;
  "shotsByWeapon"?: Record<string, number | string>;
  "killsByWeapon"?: Record<string, number | string>;
  "takedowns"?: number | string;
  "weaponKills"?: number | string;
  "timesDetected"?: number | string;
  "eventsDropped"?: number | string;
  "encounters"?: Array<EncounterStats>;
};
export type SessionUpload = {
  "installId"?: string;
  "source"?: string;
  "contentVersionId"?: null | string;
  "mapCode"?: null | string;
  "clientVersion"?: null | string;
  "platform"?: string;
  "startedAt"?: string;
  "endedAt"?: string;
  "outcome"?: string;
  "stats"?: null | SessionStats;
  "events"?: Array<TelemetryEventDto>;
  "coordinationResults"?: Array<CoordinationResultDto>;
};
export type SessionUploadResponse = {
  "events"?: ItemCounts;
  "coordinationResults"?: ItemCounts;
};
export type SetSolverConfigurationActiveRequest = {
  "isActive"?: boolean;
};
export type SkillDto = {
  "id": string;
  "code": string;
  "name": string;
  "type": string;
  "maxLevel": number | string;
  "xpCurve": JsonElement;
  "effects": JsonElement;
  "updatedAt": string;
};
export type SolverConfigurationDto = {
  "id": string;
  "code": string;
  "name": string;
  "algorithm": string;
  "family": string;
  "variant": string;
  "library": null | string;
  "params": JsonElement;
  "quboWeights": JsonElement;
  "timeBudgetMs": number | string;
  "isActive": boolean;
  "isAbArm": boolean;
  "sessionCount": number | string;
  "resultCount": number | string;
  "createdAt": string;
  "updatedAt": string;
};
export type StartSessionRequest = {
  "sessionId"?: string;
  "installId"?: string;
  "source"?: string;
  "requestedVariant"?: null | string;
  "contentVersionId"?: null | string;
  "mapCode"?: null | string;
  "clientVersion"?: null | string;
  "platform"?: string;
  "startedAt"?: string;
};
export type StartSessionResponse = {
  "solver"?: null | AssignedSolver;
};
export type SubmitContentVersionRequest = {
  "revision": null | number | string;
};
export type TelemetryEventDto = {
  "clientEventId"?: string;
  "eventType"?: string;
  "occurredAt"?: string;
  "mapCode"?: null | string;
  "posX"?: null | number | string;
  "posY"?: null | number | string;
  "payload"?: null | JsonValue;
};
export type UpdateContentVersionRequest = {
  "label": string;
  "changelog"?: null | string;
  "schemaVersion": string;
  "revision": null | number | string;
};
export type UpdateSolverConfigurationRequest = {
  "name": string;
  "library"?: null | string;
  "params"?: null | JsonValue;
  "quboWeights"?: null | JsonValue;
  "timeBudgetMs"?: number | string;
};
export type UpdateUserRequest = {
  "email": string;
  "fullName"?: null | string;
  "role": string;
  "isActive": null | boolean;
};
export type UserDto = {
  "id": string;
  "username": string;
  "email": string;
  "fullName": null | string;
  "role": string;
  "isActive": boolean;
  "lastLoginAt": null | string;
  "createdAt": string;
};
export type ValidateContentVersionRequest = {
  "revision": null | number | string;
};
export type VersionComparisonDto = {
  "a": VersionSnapshotDto;
  "b": VersionSnapshotDto;
};
export type VersionSnapshotDto = {
  "contentVersionId": string;
  "overview": OverviewDto;
  "funnel": FunnelDto;
  "weapons": WeaponUsageDto;
};
export type WeaponDto = {
  "weapon": string;
  "shots": number | string;
  "kills": number | string;
  "killsPerShot": null | number | string;
  "sessionsUsed": number | string;
  "sessionShare": null | number | string;
};
export type WeaponRequest = {
  "class": string;
  "damage"?: number | string;
  "fireRate"?: number | string;
  "effectiveRange"?: number | string;
  "magazineSize"?: null | number | string;
  "reloadTimeSeconds"?: null | number | string;
  "ammoItemCode"?: null | string;
  "maxDurability"?: number | string;
  "durabilityPerUse"?: number | string;
  "noiseRadius"?: number | string;
  "isSuppressed"?: boolean;
};
export type WeaponUsageDto = {
  "finishedSessions": number | string;
  "weapons": Array<WeaponDto>;
};
export type ContentVersionDto = {
  "id": string;
  "versionNo": number;
  "label": string;
  "changelog": null | string;
  "parentVersionId": null | string;
  "status": string;
  "revision": number;
  "schemaVersion": string;
  "authoredById": string;
  "createdAt": string;
  "updatedAt": string;
  "validatedAt": null | string;
  "bundleChecksum": null | string;
  "validationErrors": Array<ContentValidationIssue>;
  "submittedAt": null | string;
  "reviewedById": null | string;
  "reviewedAt": null | string;
  "reviewNote": null | string;
  "publishedById": null | string;
  "publishedAt": null | string;
};
export type ContentVersionDetailsDto = {
  "version": ContentVersionDto;
  "bundle": JsonElement;
};
export type ContentValidationIssue = {
  "path": string;
  "message": string;
};
export type ContentValidationResultDto = {
  "id": string;
  "revision": number;
  "isValid": boolean;
  "validatedAt": string;
  "bundleChecksum": null | string;
  "errors": Array<ContentValidationIssue>;
};
export type ContentDifferenceDto = {
  "path": string;
  "before": null | JsonElement;
  "after": null | JsonElement;
};
export type ContentComparisonDto = {
  "sourceId": string;
  "sourceRevision": number;
  "targetId": string;
  "targetRevision": number;
  "differences": Array<ContentDifferenceDto>;
};
export type ContentPublicationDto = {
  "id": string;
  "contentVersionId": string;
  "previousVersionId": null | string;
  "action": string;
  "actorId": null | string;
  "reason": string;
  "createdAt": string;
  "versionNo": null | number;
  "versionLabel": null | string;
  "previousVersionNo": null | number;
  "actorUsername": null | string;
};
export type AuthoringWeaponDto = {
  "class": string;
  "damage": number | string;
  "fireRate": number | string;
  "effectiveRange": number | string;
  "magazineSize": null | number | string;
  "reloadTimeSeconds": null | number | string;
  "ammoItemCode": null | string;
  "maxDurability": number | string;
  "durabilityPerUse": number | string;
  "noiseRadius": number | string;
  "isSuppressed": boolean;
};

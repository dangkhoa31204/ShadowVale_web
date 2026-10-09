using System.Collections.Generic;

namespace ShadowVale.Contracts.Telemetry
{
    // Event types the game sends. Any other type is rejected. Payload keys listed here are the ones analytics reads;
    // other keys are stored as they are.
    public static class TelemetryEventTypes
    {
        /// <summary>An enemy saw the player. Heat map position: PosX / PosY.</summary>
        public const string PlayerSpotted = "player_spotted";
        public const string EnemyStateChanged = "enemy_state_changed";
        public const string NoiseEmitted = "noise_emitted";
        public const string ShotFired = "shot_fired";
        public const string Takedown = "takedown";
        public const string EnemyKilled = "enemy_killed";

        /// <summary>The player died. Heat map position: PosX / PosY.</summary>
        public const string PlayerDeath = "player_death";
        public const string PlayerPosition = "player_position";

        /// <summary>Mission funnel. Payload: <c>index</c> (int, 0-based order of the objective).</summary>
        public const string ObjectiveCompleted = "objective_completed";

        /// <summary>Mission funnel end. Payload: <c>result</c> ("completed" when the mission was won).</summary>
        public const string MissionResult = "mission_result";
        public const string SquadAlert = "squad_alert";
        public const string CoordinationReplan = "coordination_replan";
        public const string SolverTimeout = "solver_timeout";
        public const string SolverFallback = "solver_fallback";
        public const string PlanDiscarded = "plan_discarded";
        public const string SolverChanged = "solver_changed";
        public const string SidecarStatus = "sidecar_status";
        public const string BossRelocated = "boss_relocated";
        public const string GrenadeThrown = "grenade_thrown";
        public const string GrenadeExploded = "grenade_exploded";
        public const string BossReinforcements = "boss_reinforcements";

        public static readonly IReadOnlyList<string> All = new[]
        {
            PlayerSpotted, EnemyStateChanged, NoiseEmitted, ShotFired, Takedown, EnemyKilled, PlayerDeath,
            PlayerPosition, ObjectiveCompleted, MissionResult, SquadAlert, CoordinationReplan, SolverTimeout,
            SolverFallback, PlanDiscarded, SolverChanged, SidecarStatus, BossRelocated, GrenadeThrown,
            GrenadeExploded, BossReinforcements
        };
    }
}

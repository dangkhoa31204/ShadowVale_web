-- Read-only: weapons stores multiple content versions. Filter a version and join item codes.
-- Draft #15 was synchronized with Unity runtime defaults; publication is a separate review step.
SELECT v.version_no, v.status, v.revision, i.code, i.name, w.class,
       w.damage, w.fire_rate AS shots_per_second, w.fire_rate * 60 AS rounds_per_minute,
       w.effective_range AS range_metres, w.magazine_size, w.reload_time_seconds,
       ammo.code AS ammo_code, w.max_durability, w.durability_per_use, w.noise_radius, w.is_suppressed
FROM shadowvale.weapons w
JOIN shadowvale.items i ON i.id = w.item_id
JOIN shadowvale.content_versions v ON v.id = i.content_version_id
LEFT JOIN shadowvale.items ammo ON ammo.id = w.ammo_item_id
WHERE v.version_no = 15
ORDER BY i.code;

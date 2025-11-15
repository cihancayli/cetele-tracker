-- Update global activities (suggestions for mentors)
-- Run this in Supabase SQL Editor

-- 1. Delete duplicate "Kitab" entry (keep only "Kitap")
DELETE FROM activities
WHERE name = 'Kitab' AND group_id IS NULL;

-- 2. Delete duplicate Risale Sohbet entries (we'll keep just one)
DELETE FROM activities
WHERE name IN ('Risale Sohbet 1', 'Risale Sohbet 2') AND group_id IS NULL;

-- 3. Add back a single "Risale Sohbet" activity
INSERT INTO activities (name, description, type, order_index, response_type, created_at)
SELECT 'Risale Sohbet', 'Weekly risale discussion session', 'discussion', 2, 'boolean', NOW()
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Risale Sohbet' AND group_id IS NULL);

-- 4. Add "Ya-Latif/Dhikr" activity
INSERT INTO activities (name, description, type, order_index, response_type, created_at)
SELECT 'Ya-Latif/Dhikr', '129/day', 'prayer', 8, 'number', NOW()
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Ya-Latif/Dhikr' AND group_id IS NULL);

-- Verify the updated activities
SELECT name, description, type, order_index, response_type,
       CASE WHEN group_id IS NULL THEN 'Global' ELSE 'Group-specific' END as scope
FROM activities
WHERE group_id IS NULL
ORDER BY order_index;

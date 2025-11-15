-- ============================================
-- FIX DUPLICATE ACTIVITIES
-- ============================================
-- This script removes duplicate activity entries

BEGIN;

-- First, let's see what we have
SELECT *
FROM activities
ORDER BY order_index, id;

-- Delete duplicates, keeping only the FIRST occurrence of each activity
DELETE FROM activities
WHERE id IN (
    SELECT a1.id
    FROM activities a1
    INNER JOIN activities a2 ON a1.name = a2.name AND a1.id > a2.id
);

-- Verify we now have unique activities
SELECT *
FROM activities
ORDER BY order_index;

COMMIT;

-- Expected result: 7 unique activities
-- 1. Kitap (35 pages)
-- 2. Risale Sohbet 1 (First session)
-- 3. Risale Sohbet 2 (Second session)
-- 4. Kuran (7 pages)
-- 5. Kaset/Video (60 minutes)
-- 6. Teheccud (3 times)
-- 7. SWB/Dhikr (101/day)

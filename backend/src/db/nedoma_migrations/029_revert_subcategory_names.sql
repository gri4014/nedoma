BEGIN;

UPDATE categories 
SET name = 'Игровой досуг'
WHERE name = 'Квесты';

UPDATE categories 
SET name = 'Клубы, бары, рюмочные'
WHERE name = 'Клубы';

UPDATE categories 
SET name = 'Рестораны, кафе'
WHERE name = 'Кафе';

COMMIT;

// Quick mapping test for voice recognition text → position
const { findPositionFromText } = require('./voice');

const samples = [
  'Lăng Ngư Ông Nam Ô',
  'Lăng Cá Ông',
  'Đình làng Nam Ô',
  'Miếu Bà Huyền Trân',
  'Miếu Bà Liễu Hạnh',
  'Dinh Cô Hồn Nam Ô',
  'Miếu Âm Linh',
  'Giếng Chăm cổ Nam Ô',
  'Giếng Vuông',
  'Ghềnh Nam Ô',
  'Rạn Nam Ô',
  'Làng nghề Nước mắm Nam Ô',
  'Nước mắm Nam Ô',
  'Gỏi cá Nam Ô'
];

for (const s of samples) {
  console.log(s, '=>', findPositionFromText(s));
}

const requiredKeywords = [
  ['Miếu Bà Huyền Trân', 3],
  ['Ghềnh Nam Ô', 6],
  ['Lăng Cá Ông', 1],
  ['Giếng Vuông', 5],
  ['Dinh Âm Hồn', 4],
  ['Nước Mắm Nam Ô', 7],
  ['Đình Làng', 2]
];

for (const [keyword, expected] of requiredKeywords) {
  const actual = findPositionFromText(keyword);
  if (actual !== expected) {
    throw new Error(`${keyword}: expected ${expected}, received ${actual}`);
  }
}

console.log('All required voice keywords mapped correctly.');

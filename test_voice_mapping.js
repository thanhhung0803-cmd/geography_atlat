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
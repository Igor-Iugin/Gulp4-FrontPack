/* 
# Установки окончания в слове в зависимости от числа
# Синтаксис: declOfNum(number, ['минута', 'минуты', 'минут'])
*/
function declOfNum(number, words) {  
  return words[(number % 100 > 4 && number % 100 < 20) ? 2 : [2, 0, 1, 1, 1, 2][(number % 10 < 5) ? number % 10 : 5]];
}
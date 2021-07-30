/*
#  Вычисление разницы дат в днях
*/
function dateDiffInDays(start, end) {
  const msPerDay = 1000 * 60 * 60 * 24
  const utc1 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const utc2 = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  const days = Math.floor((utc2 - utc1) / msPerDay)

  return {
    days: days,
    years: Math.floor(days/365),
    mounths: Math.floor((days - years * 365)/30)
  }
}

export default dateDiffInDays

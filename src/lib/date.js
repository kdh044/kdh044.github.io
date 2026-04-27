import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek.js';

dayjs.extend(isoWeek);

const DOW_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const KOR_WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

export function weekStart(d) {
  return dayjs(d).isoWeekday(1).startOf('day');
}

export function weekEnd(d) {
  return dayjs(d).isoWeekday(7).startOf('day');
}

export function weekNumber(d) {
  return dayjs(d).isoWeek();
}

export function dayKey(d) {
  return dayjs(d).format('YYYY-MM-DD');
}

export function monthKey(d) {
  return dayjs(d).format('YYYY-MM');
}

export function dayOfWeekKey(d) {
  return DOW_KEYS[dayjs(d).isoWeekday() - 1];
}

export function formatDay(d) {
  const day = dayjs(d);
  return `${KOR_WEEKDAYS[day.isoWeekday() - 1]} ${day.month() + 1}/${day.date()}`;
}

export function dDay(targetDate, fromDate = dayjs()) {
  return dayjs(targetDate).startOf('day').diff(dayjs(fromDate).startOf('day'), 'day');
}

export function eachDayOfWeek(d) {
  const start = weekStart(d);
  return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
}

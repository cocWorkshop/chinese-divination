import { calculateBazi } from '../src/lib/baziCalculator'
const p = (pil: { stem: string; branch: string }) => pil.stem + pil.branch
const cases = [
  { name: 'Jack Ma', date: '1964-09-10', time: 'wu', gender: 'male' as const },
  { name: 'Xi Jinping', date: '1953-06-15', time: 'chen', gender: 'male' as const },
  { name: 'Tsai Ing-wen', date: '1956-08-31', time: 'wu', gender: 'female' as const },
  { name: 'Li Ka-shing', date: '1928-07-29', time: 'hai', gender: 'male' as const },
  { name: 'Sun Yat-sen', date: '1866-11-12', time: 'yin', gender: 'male' as const },
]
for (const c of cases) {
  const chart = calculateBazi(c.date, c.time, '未知', c.gender)
  console.log(`${c.name}: 年=${p(chart.yearPillar)} 月=${p(chart.monthPillar)} 日=${p(chart.dayPillar)} 時=${p(chart.hourPillar)}`)
}

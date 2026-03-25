# Paipan Test References

## Verification Sources

### BaZi Four Pillars
- **lunar-typescript library** — Used internally by `calculateBazi()`. The library itself is the primary source for Gan-Zhi calculations.
- **元亨利贞网** — https://www.china95.net/paipan/ (popular Chinese BaZi calculator)
- **易灵在线排盘** — https://bazi.yiling.cn
- **易奇八字排盘** — https://m-mfsm.kvov.com/
- **奇门遁甲网** — https://qimen.yi958.com

### Famous People BaZi (verified values)
| Person | Birth Date | Birth Time | Four Pillars | Source |
|--------|-----------|------------|--------------|--------|
| 毛泽东 Mao Zedong | 1893-12-26 | 辰时 | 癸巳 甲子 丁酉 甲辰 | 《毛泽东家世》(李湘文), qimen.yi958.com |
| 邓小平 Deng Xiaoping | 1904-08-22 | 巳时 | 甲辰 壬申 戊子 丁巳 | lunar-typescript verified |
| 孙中山 Sun Yat-sen | 1866-11-12 | 寅时 | 丙寅 己亥 辛卯 庚寅 | lunar-typescript verified |
| 李小龙 Bruce Lee | 1940-11-27 | 辰时 | 庚辰 丁亥 甲戌 戊辰 | lunar-typescript verified |
| 周恩来 Zhou Enlai | 1898-03-05 | 卯时 | 戊戌 甲寅 丁卯 癸卯 | lunar-typescript verified |
| 蒋介石 Chiang Kai-shek | 1887-10-31 | 午时 | 丁亥 庚戌 己巳 庚午 | lunar-typescript verified |
| 习近平 Xi Jinping | 1953-06-15 | 未时 | 癸巳 戊午 丁酉 丁未 | lunar-typescript verified |
| Elvin (张伟) | 1988-09-17 | 午时 | 戊辰 辛酉 乙亥 壬午 | lunar-typescript verified |
| 马云 Jack Ma | 1964-09-10 | 未时 | 甲辰 癸酉 壬戌 丁未 | lunar-typescript verified |

### Solar Term Dates (2024)
- 立春 2024: Feb 4, ~16:27 CST — Source: Hong Kong Observatory, timeanddate.com
- 惊蛰 2024: Mar 5 — Source: lunar-typescript
- 清明 2024: Apr 4 — Source: lunar-typescript

### True Solar Time References
- Equation of Time values: NOAA Solar Calculator (https://gml.noaa.gov/grad/solcalc/)
- City longitudes: Standard geographic coordinates
  - Urumqi: 87.6°E
  - Shanghai: 121.5°E
  - Wuhan: 114.3°E

### ZiWei References
- **iztro library** — Used internally by `calculateZiwei()`. Primary source for ZiWei calculations.
- **紫微斗数在线排盘** — https://ziwei.911cha.com/
- **元亨利贞紫微排盘** — https://www.china95.net/ziwei/

### 四化 (Si Hua) Standard Values
| Year Stem | 化禄 | 化权 | 化科 | 化忌 |
|-----------|------|------|------|------|
| 甲 | 廉贞 | 破军 | 武曲 | 太阳 |
| 乙 | 天机 | 天梁 | 紫微 | 太阴 |
| 丙 | 天同 | 天机 | 文昌 | 廉贞 |
| 丁 | 太阴 | 天同 | 天机 | 巨门 |
| 戊 | 贪狼 | 太阴 | 右弼 | 天机 |
| 己 | 武曲 | 贪狼 | 天梁 | 文曲 |
| 庚 | 太阳 | 武曲 | 太阴 | 天同 |
| 辛 | 巨门 | 太阳 | 文曲 | 文昌 |
| 壬 | 天梁 | 紫微 | 左辅 | 武曲 |
| 癸 | 破军 | 巨门 | 太阴 | 贪狼 |

### Equation of Time Reference Values
| Day of Year | Approx Date | Expected EoT (min) | Source |
|-------------|-------------|---------------------|--------|
| 43 | Feb 12 | -14.2 | NOAA |
| 135 | May 15 | +3.8 | NOAA |
| 207 | Jul 26 | -6.5 | NOAA |
| 307 | Nov 3 | +16.4 | NOAA |

### Da Yun Direction Rules
- 阳干: 甲丙戊庚壬 (index 0,2,4,6,8)
- 阴干: 乙丁己辛癸 (index 1,3,5,7,9)
- 阳年男/阴年女 → 顺排 (forward)
- 阴年男/阳年女 → 逆排 (reverse)

### Year-to-Stem Mapping (for test cases)
| Year | Stem | Yin/Yang |
|------|------|----------|
| 1893 | 癸 | 阴 |
| 1904 | 甲 | 阳 |
| 1940 | 庚 | 阳 |
| 1945 | 乙 | 阴 |
| 1953 | 癸 | 阴 |
| 1964 | 甲 | 阳 |
| 1988 | 戊 | 阳 |
| 2024 | 甲 | 阳 |

## Notes
- All BaZi four-pillar expected values were initially computed using lunar-typescript library and then cross-referenced against online calculators where possible.
- ZiWei expected values rely on the iztro library (used by calculateZiwei) and cross-checked against 911cha.com.
- True solar time EoT values are approximate — the formula used is a simplified harmonic approximation, not a full astronomical calculation.

# Paipan Test References

## Verification Sources

### BaZi Four Pillars
- **lunar-typescript library** — Used internally by `calculateBazi()`. The library itself is the primary source for Gan-Zhi calculations.
- **Yuan Heng Li Zhen** — https://www.china95.net/paipan/ (popular Chinese BaZi calculator)
- **Yi Ling Online Paipan** — https://bazi.yiling.cn
- **Yi Qi BaZi Paipan** — https://m-mfsm.kvov.com/
- **Qi Men Dun Jia Network** — https://qimen.yi958.com

### Famous People BaZi (Verified Reference Values)
| Person | Birth Date | Birth Hour | Four Pillars (Stem-Branch) | Source |
|--------|-----------|------------|----------------------------|--------|
| Mao Zedong | 1893-12-26 | Chen (07:00-09:00) | Gui-Si Jia-Zi Ding-You Jia-Chen | Mao Zedong Family History (Li Xiangwen), qimen.yi958.com |
| Deng Xiaoping | 1904-08-22 | Si (09:00-11:00) | Jia-Chen Ren-Shen Wu-Zi Ding-Si | lunar-typescript verified |
| Sun Yat-sen | 1866-11-12 | Yin (03:00-05:00) | Bing-Yin Ji-Hai Xin-Mao Geng-Yin | lunar-typescript verified |
| Bruce Lee | 1940-11-27 | Chen (07:00-09:00) | Geng-Chen Ding-Hai Jia-Xu Wu-Chen | lunar-typescript verified |
| Zhou Enlai | 1898-03-05 | Mao (05:00-07:00) | Wu-Xu Jia-Yin Ding-Mao Gui-Mao | lunar-typescript verified |
| Chiang Kai-shek | 1887-10-31 | Wu (11:00-13:00) | Ding-Hai Geng-Xu Ji-Si Geng-Wu | lunar-typescript verified |
| Xi Jinping | 1953-06-15 | Wei (13:00-15:00) | Gui-Si Wu-Wu Ding-You Ding-Wei | lunar-typescript verified |
| Elvin (Zhang Wei) | 1988-09-17 | Wu (11:00-13:00) | Wu-Chen Xin-You Yi-Hai Ren-Wu | lunar-typescript verified |
| Jack Ma | 1964-09-10 | Wei (13:00-15:00) | Jia-Chen Gui-You Ren-Xu Ding-Wei | lunar-typescript verified |

### Solar Term Dates (2024)
- Lichun (Start of Spring) 2024: Feb 4, ~16:27 CST — Source: Hong Kong Observatory, timeanddate.com
- Jingzhe (Awakening of Insects) 2024: Mar 5 — Source: lunar-typescript
- Qingming (Tomb Sweeping) 2024: Apr 4 — Source: lunar-typescript

### True Solar Time References
- Equation of Time values: NOAA Solar Calculator (https://gml.noaa.gov/grad/solcalc/)
- City longitudes: Standard geographic coordinates
  - Urumqi: 87.6°E
  - Shanghai: 121.5°E
  - Wuhan: 114.3°E

### ZiWei References
- **iztro library** — Used internally by `calculateZiwei()`. Primary source for ZiWei calculations.
- **Zi Wei Dou Shu Online Paipan** — https://ziwei.911cha.com/
- **Yuan Heng Li Zhen ZiWei Paipan** — https://www.china95.net/ziwei/

### Four Mutagens (Si Hua) Standard Values
| Year Stem | Hua Lu (Prosperity) | Hua Quan (Authority) | Hua Ke (Fame) | Hua Ji (Clouded) |
|-----------|---------------------|----------------------|---------------|------------------|
| Jia | Lianzhen | Pojun | Wuqu | Taiyang |
| Yi | Tianji | Tianliang | Ziwei | Taiyin |
| Bing | Tiantong | Tianji | Wenchang | Lianzhen |
| Ding | Taiyin | Tiantong | Tianji | Jumen |
| Wu | Tanlang | Taiyin | Youbi | Tianji |
| Ji | Wuqu | Tanlang | Tianliang | Wenqu |
| Geng | Taiyang | Wuqu | Taiyin | Tiantong |
| Xin | Jumen | Taiyang | Wenqu | Wenchang |
| Ren | Tianliang | Ziwei | Zuofu | Wuqu |
| Gui | Pojun | Jumen | Taiyin | Tanlang |

### Equation of Time Reference Values
| Day of Year | Approx Date | Expected EoT (min) | Source |
|-------------|-------------|---------------------|--------|
| 43 | Feb 12 | -14.2 | NOAA |
| 135 | May 15 | +3.8 | NOAA |
| 207 | Jul 26 | -6.5 | NOAA |
| 307 | Nov 3 | +16.4 | NOAA |

### Da Yun Direction Rules
- Yang Stems: Jia, Bing, Wu, Geng, Ren (index 0, 2, 4, 6, 8)
- Yin Stems: Yi, Ding, Ji, Xin, Gui (index 1, 3, 5, 7, 9)
- Yang Year Male / Yin Year Female -> Forward order
- Yin Year Male / Yang Year Female -> Reverse order

### Year-to-Stem Mapping (for test cases)
| Year | Stem | Polarity (Yin/Yang) |
|------|------|---------------------|
| 1893 | Gui | Yin |
| 1904 | Jia | Yang |
| 1940 | Geng | Yang |
| 1945 | Yi | Yin |
| 1953 | Gui | Yin |
| 1964 | Jia | Yang |
| 1988 | Wu | Yang |
| 2024 | Jia | Yang |

## Notes
- All BaZi four-pillar expected values were initially computed using lunar-typescript library and then cross-referenced against online calculators where possible.
- ZiWei expected values rely on the iztro library (used by calculateZiwei) and cross-checked against 911cha.com.
- True solar time EoT values are approximate — the formula used is a simplified harmonic approximation, not a full astronomical calculation.

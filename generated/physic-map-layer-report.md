# Физическая карта: слои и перекрытия

SVG SHA-256: `fb7da5eeca5634ee8028942744de099fe47bbbf4dd57cf413a26cd3b00410dc4`. Источник: `/api/map-svg?path=physic%2Fwonders_colored.svg&policy=2`. Площади приближённые, в единицах viewBox²: маски закрашенных path получены при 2× разрешении; альфа > 0 считается закрашенной. Для перекрытия требуются общие закрашенные пиксели, одного пересечения bbox недостаточно.

## Painter order

Все 295 индивидуальных `Island` имеют индексы 0–637; все 160 `Island group` — 638–797. Поэтому любая пересекающаяся группа находится **над** отдельным островом. Семь `Continent` идут последними, 798–804, полупрозрачной заливкой. Все Island имеют `fill=#ffe5b4`, все Island group — `fill=#ffffcc`; у всех 455 вычисленная opacity равна 1. Составных path: 31 Island и 8 Island group. Для каждого целевого path порядок относительно пересечений записан в JSON (`aboveOverlapKeys`, `belowOverlapKeys`).

## Перекрытия

- Целевые path: 455; пар после проверки bbox: 1176; реальных растровых перекрытий: 508.
- Island/Island: 19; Island/Island group: 329; Island group/Island group: 160.
- 199 из 295 островов перекрыты более поздней группой на 99,9–100% площади; 199 — не менее чем на 90%; 93 не перекрыты группами. У 113 островов две и более группы сверху.
- Доли взаимного покрытия и индекс верхнего path для каждой из 508 пар находятся в `physic-map-layer-overlaps.json`.

## Крупные группы

В столбце «ниже/выше» указано число геометрически пересекающихся целевых path, отрисованных соответственно до и после группы. «Contains» означает ≥90% закрашенной площади отдельного острова попало в группу; это эвристическая геометрическая вложенность, не SVG-иерархия.

| Group | Index | Bbox area | Filled area | Overlaps | Contains islands | Outside individual-island union | Below/above | Level |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| POLYNESIA | 797 | 132,468 | 14,463.0 | 68 | 38 | 98.7% | 68/0 | regional |
| MELANESIA | 776 | 58,653 | 3,917.5 | 54 | 27 | 89.2% | 52/2 | regional |
| MALAY ARCHIPELAGO | 790 | 5,475 | 1,754.5 | 43 | 30 | 47.3% | 42/1 | regional |
| MICRONESIA | 777 | 6,325 | 3,652.8 | 21 | 11 | 99.9% | 21/0 | regional |
| FIJI | 700 | 17,157 | 155.8 | 7 | 2 | 99.0% | 4/3 | local |
| ALEUTIAN ISLANDS | 763 | 8,778 | 176.2 | 3 | 3 | 94.3% | 3/0 | local |
| KIRIBATI | 766 | 35,112 | 1,206.0 | 10 | 5 | 99.9% | 7/3 | regional |

## Региональные overlay-кандидаты

Эвристика: заполненная площадь ≥500, не менее пяти островов с покрытием ≥90%, и площадь группы ≥3× медианной площади этих островов. Bbox сам по себе не используется: у FIJI/ALEUTIAN ISLANDS он охватывает разрыв карты, хотя их заполненная площадь невелика.

- Island group SVALBARD (index 749, 5 островов)
- Island group WEST INDIES (index 764, 7 островов)
- Island group QUEEN ELIZABETH ISLANDS (index 765, 7 островов)
- Island group KIRIBATI (index 766, 5 островов)
- Island group GREATER SUNDA ISLANDS (index 772, 7 островов)
- Island group PHILIPPINES (index 773, 9 островов)
- Island group ARCTIC ARCHIPELAGO (index 775, 18 островов)
- Island group MELANESIA (index 776, 27 островов)
- Island group MICRONESIA (index 777, 11 островов)
- Island group MALAY ARCHIPELAGO (index 790, 30 островов)
- Island group POLYNESIA (index 797, 38 островов)

Это визуальная классификация для диагностики, не утверждение о семантической вложенности или о том, что все эти группы следует одинаково менять в приложении.

## Острова под группами

Примеры полностью покрытых островов: Island Pentecost, Island Anatom, Island Gaua, Island Vanikolo, Island Adak, Island Unimak I., Island Lanzarote, Island Mahé I., Island Mohéli, Island Mayotte, Island Anjouan, Island Flores, Island Pico, Island Terceira, Island Santa Maria, Island Fogo, Island São Nicolau, Island Santo Antão. Полный список и процент покрытия доступны в `coveredIslands` JSON. Сами группы также красят области **вне** объединения индивидуальных островов: POLYNESIA — 98,7% собственной площади, MICRONESIA — 99,9%, MELANESIA — 89,2%, MALAY ARCHIPELAGO — 47,3%. Поэтому простая перестановка path покажет контуры островов поверх групп, но не уберёт широкие региональные заливки вокруг них. При статическом рендере 1400×679 перенос Island над Island group изменил лишь около 1,6% пикселей. Площадь «вне Island» не обязательно является морем: там могут быть контуры суши, не представленные отдельным Island path.

## Hit-testing

`physic` проверяет все интерактивные path через `isPointInFill/isPointInStroke` и выбирает совпавший path с минимальной площадью `getBBox()`. В точке геометрического пересечения острова и группы оба входят в кандидаты; для широких групп bbox обычно больше, поэтому выбирается остров, хотя на экране его может закрывать заливка группы. В этой растровой выборке найдено 7 пересечений Island/Island group, где bbox группы меньше bbox острова; в таких местах эвристика может предпочесть группу. Примеры: Island Pelopónnisos / Island group Ionian Is. (1.47% острова), Island MINDANAO / Island group Sulu Archipelago (0.50% острова), Island LUZON / Island group Babuyan Is. (0.42% острова), Island NEW GUINEA / Island group D’Entrecasteaux Islands (0.07% острова), Island NEW GUINEA / Island group Bismarck Archipelago (0.14% острова). Это приближение к браузерному `getBBox()`, не испытание кликом в браузере. Важно: по SVG 2 `isPointInFill()` зависит от геометрии и `fill-rule`, но не от визуального `fill` или `opacity`. Поэтому `fill:none`/opacity:0 без согласованного изменения кастомного hit-test не гарантирует, что невидимая группа перестанет попадать в `hits` (https://www.w3.org/TR/2018/CR-SVG2-20180807/types.html#InterfaceSVGGeometryElement). `pointer-events:visiblePainted` отдельно влияет на обычное событие указателя (https://www.w3.org/TR/SVG/interact.html#PointerEventsProperty).

## Ограничения

Маски измеряют геометрическое перекрытие, а не конечный цвет после наложения всех 805 path. У скрытых последующими группами или континентами частей форма всё равно считается. Небольшие контуры чувствительны к разрешению 2× и антиалиасингу. В SVG нет вложенных `<g>` для архипелагов: «parent-like» связи рассчитаны по покрытию и размеру.

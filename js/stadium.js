// Stadion ülésrend: lekerekített téglalap alakú lelátó, alsó (101–108) és felső (201–208) szinttel.
// Minden szék külön pont. A térkép két módban működik:
//   buy (alapértelmezett): főoldali eseménykártyák. Először egy szektort kell kiválasztani,
//       arra a térkép ráközelít, utána lehet kiválasztani a székeket.
//   assign (data-mode="assign"): Árazás oldal. Széket, sort, szektort vagy téglalappal kijelölt
//       székcsoportot lehet VIP, Premium, Normal vagy Early Bird kategóriába tenni.
// A székek száma a data-seat-capacity attribútumból jön (legfeljebb 5000 szék rajzolódik).
// Kevés széknél a stadion összezsugorodik, hogy a székek sűrűn egymás mellett maradjanak.
// A data-active-sectors indexei: 0–7 az alsó szint (101–108), 8–15 a felső szint (201–208).
(() => {
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const loop = 16;
    const sectionInset = 0.05;
    const shapeInset = 0.02;
    const maxSelectedSeats = 8;
    const maxDrawnSeats = 5000;
    const denseSpacing = 10.5;
    const minScale = 0.1;
    const baseView = { x: -380, y: -302, w: 760, h: 604 };
    const aspect = baseView.w / baseView.h;
    const CATEGORY_STORAGE_KEY = 'jegykezelo-szekkategoriak';
    const PRICE_STORAGE_KEY = 'jegykezelo-kategoriarak';
    const BOOKED_STORAGE_KEY = 'jegykezelo-foglalt-szekek';
    const PENDING_STORAGE_KEY = 'jegykezelo-kivalasztott-szekek';

    const categories = [
        { key: 'normal', label: 'Normal', priceInput: 'normal-price' },
        { key: 'premium', label: 'Premium', priceInput: 'premium-price' },
        { key: 'vip', label: 'VIP', priceInput: 'vip-price' },
        { key: 'earlybird', label: 'Early Bird', priceInput: 'early-bird-price' }
    ];
    const categoryByKey = new Map(categories.map(category => [category.key, category]));
    const tierNames = { lower: 'Alsó szint', upper: 'Felső szint' };
    const segments = [
        [2, 'topRight'], [1, 'cornerTopRight'], [2, 'right'], [1, 'cornerBottomRight'],
        [4, 'bottom'], [1, 'cornerBottomLeft'], [2, 'left'], [1, 'cornerTopLeft'], [2, 'topLeft']
    ];
    const tierDefs = [
        {
            key: 'lower', base: 100, labelShift: -15,
            inner: { a: 176, b: 122, r: 40 }, outer: { a: 236, b: 174, r: 96 }
        },
        {
            key: 'upper', base: 200, labelShift: 16,
            inner: { a: 250, b: 188, r: 110 }, outer: { a: 338, b: 262, r: 196 }
        }
    ];
    const blocks = [
        { number: 1, from: 14, to: 18 }, { number: 2, from: 2, to: 3 },
        { number: 3, from: 3, to: 5 }, { number: 4, from: 5, to: 6 },
        { number: 5, from: 6, to: 10 }, { number: 6, from: 10, to: 11 },
        { number: 7, from: 11, to: 13 }, { number: 8, from: 13, to: 14 }
    ];

    const lerp = (start, end, ratio) => start + (end - start) * ratio;
    const toRadians = degrees => degrees * Math.PI / 180;
    const scaleBox = (box, scale) => ({ a: box.a * scale, b: box.b * scale, r: box.r * scale });
    const formatNumber = value => value.toLocaleString('hu-HU');

    // Pont a lekerekített téglalap kerületén. A position 0–16 között halad, a szegmensek
    // hossza minden gyűrűn ugyanannyi egység, így a szektorhatárok sugárirányban egymás alá esnek.
    const pointOnRing = (position, halfWidth, halfHeight, radius) => {
        const wrapped = ((position % loop) + loop) % loop;
        let start = 0;
        let ratio = 0;
        let name = 'topLeft';
        for (const [length, segmentName] of segments) {
            if (wrapped <= start + length + 1e-9) {
                ratio = (wrapped - start) / length;
                name = segmentName;
                break;
            }
            start += length;
        }
        let angle;
        switch (name) {
            case 'topRight':
                return [ratio * (halfWidth - radius), -halfHeight];
            case 'cornerTopRight':
                angle = toRadians(-90 + 90 * ratio);
                return [halfWidth - radius + radius * Math.cos(angle), -halfHeight + radius + radius * Math.sin(angle)];
            case 'right':
                return [halfWidth, -halfHeight + radius + ratio * (2 * halfHeight - 2 * radius)];
            case 'cornerBottomRight':
                angle = toRadians(90 * ratio);
                return [halfWidth - radius + radius * Math.cos(angle), halfHeight - radius + radius * Math.sin(angle)];
            case 'bottom':
                return [halfWidth - radius - ratio * (2 * halfWidth - 2 * radius), halfHeight];
            case 'cornerBottomLeft':
                angle = toRadians(90 + 90 * ratio);
                return [-halfWidth + radius + radius * Math.cos(angle), halfHeight - radius + radius * Math.sin(angle)];
            case 'left':
                return [-halfWidth, halfHeight - radius - ratio * (2 * halfHeight - 2 * radius)];
            case 'cornerTopLeft':
                angle = toRadians(180 + 90 * ratio);
                return [-halfWidth + radius + radius * Math.cos(angle), -halfHeight + radius + radius * Math.sin(angle)];
            default:
                return [-halfWidth + radius + ratio * (halfWidth - radius), -halfHeight];
        }
    };

    const ringPath = (halfWidth, halfHeight, radius) => {
        const points = [];
        for (let step = 0; step <= 96; step += 1) {
            const [x, y] = pointOnRing(loop * step / 96, halfWidth, halfHeight, radius);
            points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        return `M${points.join(' L')} Z`;
    };

    const hashUnit = text => {
        let hash = 1779033703 ^ text.length;
        for (let index = 0; index < text.length; index += 1) {
            hash = Math.imul(hash ^ text.charCodeAt(index), 3432918353);
            hash = (hash << 13) | (hash >>> 19);
        }
        hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
        hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
        hash ^= hash >>> 16;
        return (hash >>> 0) / 4294967296;
    };

    const rowLabel = index => {
        let label = '';
        let value = index;
        do {
            label = String.fromCharCode(65 + (value % 26)) + label;
            value = Math.floor(value / 26) - 1;
        } while (value >= 0);
        return label;
    };

    const readStore = key => {
        try {
            const raw = localStorage.getItem(key);
            const value = raw ? JSON.parse(raw) : null;
            return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        } catch (error) {
            return {};
        }
    };
    const writeStore = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    };

    // ---------------------------------------------------------------- elrendezés
    const rowGeometry = (tier, rows, block, row) => {
        const ratio = (row + 0.5) / rows;
        const halfWidth = lerp(tier.inner.a, tier.outer.a, ratio);
        const halfHeight = lerp(tier.inner.b, tier.outer.b, ratio);
        const radius = lerp(tier.inner.r, tier.outer.r, ratio);
        const steps = 80;
        const points = [];
        const lengths = [0];
        for (let step = 0; step <= steps; step += 1) {
            const position = block.from + sectionInset +
                (block.to - block.from - 2 * sectionInset) * step / steps;
            const point = pointOnRing(position, halfWidth, halfHeight, radius);
            points.push(point);
            if (step > 0) {
                lengths.push(lengths[step - 1] +
                    Math.hypot(point[0] - points[step - 1][0], point[1] - points[step - 1][1]));
            }
        }
        return { points, lengths, steps, rowLength: lengths[steps] };
    };

    // A sorok hossza arányosan nő a méretezéssel, ezért 1-es méretnél egyszer számoljuk ki.
    const unitLengthCache = new Map();
    const unitLengths = (tierKeys, rows) => {
        const cacheKey = `${tierKeys.join('+')}|${rows.lower || 0}|${rows.upper || 0}`;
        if (!unitLengthCache.has(cacheKey)) {
            const lengths = [];
            tierDefs.filter(tier => tierKeys.includes(tier.key)).forEach(tier => {
                blocks.forEach(block => {
                    for (let row = 0; row < rows[tier.key]; row += 1) {
                        lengths.push(rowGeometry(tier, rows[tier.key], block, row).rowLength);
                    }
                });
            });
            unitLengthCache.set(cacheKey, lengths);
        }
        return unitLengthCache.get(cacheKey);
    };

    const makeLayout = (tierKeys, scale, spacing) => {
        const rows = {};
        tierDefs.filter(tier => tierKeys.includes(tier.key)).forEach(tier => {
            rows[tier.key] = Math.max(1, Math.round((tier.outer.b - tier.inner.b) * scale / spacing));
        });
        return {
            tierKeys, scale, spacing, rows, minPerRow: 1,
            radius: Math.min(6, Math.max(1.1, spacing * 0.33))
        };
    };

    const defaultLayout = {
        tierKeys: ['lower', 'upper'], scale: 1, spacing: denseSpacing,
        rows: { lower: 6, upper: 8 }, minPerRow: 2, radius: 3.5
    };

    const countSeats = layout => unitLengths(layout.tierKeys, layout.rows).reduce(
        (sum, length) => sum + Math.max(layout.minPerRow, Math.floor(length * layout.scale / layout.spacing)), 0
    );

    // Kevés széknél a stadion kisebb lesz (sűrű ülésköz marad), sok széknél az ülésköz csökken.
    const layoutForTarget = target => {
        const both = ['lower', 'upper'];
        const searchScale = tierKeys => {
            let low = minScale;
            let high = 1;
            for (let iteration = 0; iteration < 30; iteration += 1) {
                const middle = (low + high) / 2;
                if (countSeats(makeLayout(tierKeys, middle, denseSpacing)) >= target) high = middle; else low = middle;
            }
            return makeLayout(tierKeys, high, denseSpacing);
        };
        if (target <= countSeats(makeLayout(['lower'], 1, denseSpacing))) return searchScale(['lower']);
        if (target <= countSeats(makeLayout(both, 1, denseSpacing))) return searchScale(both);

        let low = 2.5;
        let high = denseSpacing;
        for (let iteration = 0; iteration < 30; iteration += 1) {
            const middle = (low + high) / 2;
            if (countSeats(makeLayout(both, 1, middle)) >= target) low = middle; else high = middle;
        }
        let guard = 0;
        while (countSeats(makeLayout(both, 1, low)) < target && guard < 80) {
            low *= 0.985;
            guard += 1;
        }
        return makeLayout(both, 1, low);
    };

    const computeView = scaledTiers => {
        const halfA = Math.max(...scaledTiers.map(tier => tier.outer.a));
        const halfB = Math.max(...scaledTiers.map(tier => tier.outer.b));
        const scale = scaledTiers[0].outer.a / tierDefs[0].outer.a;
        const margin = Math.max(16, (scaledTiers.some(tier => tier.key === 'upper') ? 40 : 28) * Math.min(1, scale * 1.5));
        let halfWidth = halfA + margin;
        let halfHeight = halfB + margin;
        if (halfWidth / halfHeight < aspect) halfWidth = halfHeight * aspect; else halfHeight = halfWidth / aspect;
        return { x: -halfWidth, y: -halfHeight, w: 2 * halfWidth, h: 2 * halfHeight };
    };

    // ---------------------------------------------------------------- egy térkép
    const initStadium = stadium => {
        const mode = stadium.dataset.mode === 'assign' ? 'assign' : 'buy';
        stadium.dataset.mode = mode;
        let tool = 'seat';
        stadium.dataset.tool = tool;

        // A foglaltság az esemény kártyáján látható eladási sávból jön.
        const eventCard = stadium.closest('.event-card');
        const salesBar = eventCard ? eventCard.querySelector('.event-sales-progress span') : null;
        const salesWidth = salesBar ? parseFloat(salesBar.style.width) : NaN;
        const soldRatio = mode === 'assign' ? 0 : (Number.isFinite(salesWidth) ? salesWidth / 100 : 0.4);
        const eventHeading = eventCard ? eventCard.querySelector('h5') : null;
        const headingText = eventHeading ? eventHeading.textContent.trim() : '';
        const seedKey = headingText || stadium.dataset.eventKey || 'event';
        const storageKey = stadium.dataset.eventKey || (headingText ? `name:${headingText}` : 'general');
        const eventPrice = eventCard && eventCard.dataset.price !== '' ? Number(eventCard.dataset.price) : NaN;

        const requestedCapacity = Number(stadium.dataset.seatCapacity);
        const hasSeatCapacity = Number.isInteger(requestedCapacity) && requestedCapacity > 0;
        const seatTarget = hasSeatCapacity ? Math.min(requestedCapacity, maxDrawnSeats) : 0;
        const layout = hasSeatCapacity ? layoutForTarget(seatTarget) : defaultLayout;

        const scaledTiers = tierDefs.filter(tier => layout.tierKeys.includes(tier.key)).map(tier => ({
            ...tier,
            rows: layout.rows[tier.key],
            inner: scaleBox(tier.inner, layout.scale),
            outer: scaleBox(tier.outer, layout.scale)
        }));
        const fullView = computeView(scaledTiers);
        const minZoomWidth = Math.min(110, fullView.w * 0.45);

        const activeSections = new Set(
            (stadium.dataset.activeSectors || '')
                .split(',')
                .map(value => Number(value.trim()))
                .filter(Number.isInteger)
                .map(index => (index < 8 ? 101 + index : 201 + index - 8))
        );

        // ---- székek
        const candidates = [];
        scaledTiers.forEach(tier => {
            blocks.forEach(block => {
                const section = tier.base + block.number;
                for (let row = 0; row < tier.rows; row += 1) {
                    const { points, lengths, steps, rowLength } = rowGeometry(tier, tier.rows, block, row);
                    const seatCount = Math.max(layout.minPerRow, Math.floor(rowLength / layout.spacing));
                    let segmentIndex = 0;
                    for (let seatIndex = 0; seatIndex < seatCount; seatIndex += 1) {
                        const target = (seatIndex + 0.5) * rowLength / seatCount;
                        while (segmentIndex < steps - 1 && lengths[segmentIndex + 1] < target) segmentIndex += 1;
                        const span = lengths[segmentIndex + 1] - lengths[segmentIndex] || 1;
                        const along = (target - lengths[segmentIndex]) / span;
                        candidates.push({
                            tier,
                            section,
                            row,
                            x: lerp(points[segmentIndex][0], points[segmentIndex + 1][0], along),
                            y: lerp(points[segmentIndex][1], points[segmentIndex + 1][1], along)
                        });
                    }
                }
            });
        });

        // Ha a rács a kért számnál több széket adna, a felesleget egyenletesen elosztva hagyjuk ki.
        const removed = new Set();
        if (hasSeatCapacity && candidates.length > seatTarget) {
            const extra = candidates.length - seatTarget;
            for (let index = 0; index < extra; index += 1) {
                removed.add(Math.floor((index + 0.5) * candidates.length / extra));
            }
        }

        const assignments = readStore(CATEGORY_STORAGE_KEY)[storageKey] || {};
        const bookedList = readStore(BOOKED_STORAGE_KEY)[storageKey];
        const booked = new Set(mode === 'buy' && Array.isArray(bookedList) ? bookedList : []);
        const seats = [];
        const sections = new Map();
        const rowGroups = new Map();
        const rowCounters = new Map();
        const labelMarkup = [];
        const labelScale = Math.max(0.35, Math.min(1, layout.scale));

        scaledTiers.forEach(tier => {
            blocks.forEach(block => {
                const section = tier.base + block.number;
                const outerPoints = [];
                const innerPoints = [];
                for (let step = 0; step <= 20; step += 1) {
                    const position = block.from + shapeInset + (block.to - block.from - 2 * shapeInset) * step / 20;
                    outerPoints.push(pointOnRing(position, tier.outer.a, tier.outer.b, tier.outer.r));
                    innerPoints.push(pointOnRing(position, tier.inner.a, tier.inner.b, tier.inner.r));
                }
                const shape = [...outerPoints, ...innerPoints.reverse()]
                    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
                    .join(' ') + ' Z';
                sections.set(section, {
                    tierKey: tier.key,
                    shape,
                    markup: [],
                    seatIndexes: [],
                    bounds: { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
                    bias: (hashUnit(`${seedKey}-${section}`) - 0.5) * 0.2
                });

                const shift = tier.labelShift * labelScale;
                const middle = (block.from + block.to) / 2;
                const base = tier.key === 'lower' ? tier.inner : tier.outer;
                const [labelX, labelY] = pointOnRing(middle, base.a + shift, base.b + shift, base.r + shift);
                labelMarkup.push(
                    `<text class="stadium-map__label" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}">${section}</text>`
                );
            });
        });

        candidates.forEach((candidate, candidateIndex) => {
            if (removed.has(candidateIndex)) return;
            const { tier, section, row, x, y } = candidate;
            const counterKey = `${section}-${row}`;
            const number = (rowCounters.get(counterKey) || 0) + 1;
            rowCounters.set(counterKey, number);

            const premiumRows = tier.rows >= 3 ? Math.round(tier.rows / 3) : 0;
            const defaultCategory = tier.key === 'lower' && row < premiumRows ? 'premium' : 'normal';
            const rowName = rowLabel(row);
            const key = `${section}-${rowName}-${number}`;
            const category = categoryByKey.has(assignments[key]) ? assignments[key] : defaultCategory;
            const tierFactor = category === 'premium' || category === 'vip' ? 1.1 : 1;
            const info = sections.get(section);
            const soldChance = Math.min(0.97, Math.max(0.02, soldRatio * tierFactor + info.bias));
            const isBooked = booked.has(key);
            const sold = isBooked ||
                (soldRatio > 0 && hashUnit(`${seedKey}-${section}-${rowName}-${number}`) < soldChance);

            const index = seats.length;
            seats.push({ key, section, row: rowName, number, x, y, tierKey: tier.key, defaultCategory, category, sold });
            info.seatIndexes.push(index);
            info.markup.push(
                `<circle class="stadium-map__seat stadium-map__seat--cat-${category}${sold ? ' is-sold' : ''}${isBooked ? ' is-booked' : ''}"` +
                ` cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${layout.radius.toFixed(2)}" data-seat="${index}"/>`
            );
            const groupKey = `${section}-${rowName}`;
            if (!rowGroups.has(groupKey)) rowGroups.set(groupKey, []);
            rowGroups.get(groupKey).push(index);
            info.bounds.minX = Math.min(info.bounds.minX, x);
            info.bounds.maxX = Math.max(info.bounds.maxX, x);
            info.bounds.minY = Math.min(info.bounds.minY, y);
            info.bounds.maxY = Math.max(info.bounds.maxY, y);
        });

        const freeInSection = section => sections.get(section).seatIndexes.filter(index => !seats[index].sold).length;

        // ---- árak
        const storedPrices = readStore(PRICE_STORAGE_KEY)[storageKey] || {};
        const readInputPrice = category => {
            const element = document.getElementById(category.priceInput);
            if (!element || element.value.trim() === '') return null;
            const value = Number(element.value);
            return Number.isFinite(value) ? value : null;
        };
        const priceOf = categoryKey => {
            if (mode === 'assign') return readInputPrice(categoryByKey.get(categoryKey));
            if (Number.isFinite(storedPrices[categoryKey])) return storedPrices[categoryKey];
            return Number.isFinite(eventPrice) ? eventPrice : null;
        };
        const priceText = categoryKey => {
            const price = priceOf(categoryKey);
            return price === null ? 'Jegyár nincs megadva' : `${formatNumber(price)} Ft / jegy`;
        };

        // ---- SVG
        const svg = document.createElementNS(svgNamespace, 'svg');
        svg.setAttribute('viewBox', `${fullView.x} ${fullView.y} ${fullView.w} ${fullView.h}`);
        svg.setAttribute('role', 'group');
        svg.setAttribute('aria-label', 'Stadion ülésrendje, minden pont egy szék');
        svg.setAttribute('focusable', 'false');

        const sectionMarkup = Array.from(sections.entries()).map(([section, info]) => {
            const state = activeSections.has(section) ? 'active' : 'idle';
            return `<g data-sector="${section}" data-state="${state}" tabindex="0" role="button"` +
                ` aria-label="${section} szektor, nagyítás"><path class="stadium-map__sector-shape" d="${info.shape}"/>` +
                `${info.markup.join('')}</g>`;
        }).join('');

        const k = layout.scale;
        const pitchFont = (14 * Math.max(0.5, Math.min(1, k * 1.5))).toFixed(1);
        svg.innerHTML =
            `<rect class="stadium-map__background" x="${(fullView.x + 4).toFixed(1)}" y="${(fullView.y + 4).toFixed(1)}"` +
            ` width="${(fullView.w - 8).toFixed(1)}" height="${(fullView.h - 8).toFixed(1)}" rx="28"/>` +
            `<path class="stadium-map__pitch" d="${ringPath(140 * k, 92 * k, 26 * k)}"/>` +
            `<rect class="stadium-map__stage" x="${-134 * k}" y="${-38 * k}" width="${22 * k}" height="${76 * k}" rx="${4 * k}"/>` +
            `<rect class="stadium-map__stage-runway" x="${-112 * k}" y="${-5 * k}" width="${70 * k}" height="${10 * k}" rx="${3 * k}"/>` +
            `<circle class="stadium-map__pitch-circle" cx="${-34 * k}" cy="0" r="${10 * k}"/>` +
            `${k >= 0.5 ? `<text class="stadium-map__pitch-label" style="font-size:${pitchFont}px" x="${40 * k}" y="0">ÁLLÓHELY</text>` : ''}` +
            sectionMarkup + labelMarkup.join('');

        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.className = 'stadium-map__reset';
        resetButton.textContent = 'Teljes kép';
        resetButton.hidden = true;

        const canvas = document.createElement('div');
        canvas.className = 'stadium-map__canvas';
        canvas.append(svg, resetButton);

        const info = document.createElement('p');
        info.className = 'stadium-map__info';
        info.setAttribute('aria-live', 'polite');
        const hintLine = document.createElement('span');
        const selectionLine = document.createElement('span');
        info.append(hintLine, selectionLine);
        if (hasSeatCapacity) {
            const noteLine = document.createElement('span');
            noteLine.className = 'stadium-map__note';
            noteLine.textContent = requestedCapacity > seats.length
                ? `Székek a térképen: ${formatNumber(seats.length)} (a létszám ${formatNumber(requestedCapacity)} fő)`
                : `Székek száma: ${formatNumber(seats.length)}`;
            info.append(noteLine);
        }

        const proceedButton = document.createElement('button');
        proceedButton.type = 'button';
        proceedButton.className = 'stadium-map__proceed';
        proceedButton.hidden = true;
        proceedButton.textContent = 'Tovább a jegyekhez';

        stadium.append(canvas, info);
        if (mode === 'buy') stadium.append(proceedButton);
        const seatElements = Array.from(svg.querySelectorAll('.stadium-map__seat'));
        const sectorElements = new Map(
            Array.from(svg.querySelectorAll('[data-sector]')).map(element => [Number(element.dataset.sector), element])
        );

        // ---- állapot
        let view = { ...fullView };
        let currentSection = null;
        let selected = [];
        const selectedSet = new Set();
        let frame = 0;
        let drag = null;
        let wasDragged = false;
        let marquee = null;
        let hoveredRow = null;
        const reduceMotion = Boolean(window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches);

        const isZoomed = () => view.w < fullView.w - 1;
        const seatLabel = seat => `${seat.section} · ${seat.row} sor · ${seat.number}. szék`;
        const sectorText = section => {
            const sectionInfo = sections.get(section);
            const total = sectionInfo.seatIndexes.length;
            if (mode === 'assign') return `${section} szektor · ${tierNames[sectionInfo.tierKey]} · ${formatNumber(total)} szék`;
            return `${section} szektor · ${tierNames[sectionInfo.tierKey]} · ${formatNumber(freeInSection(section))} szabad hely ` +
                `${total ? `a ${formatNumber(total)} székből` : ''}`.trim();
        };

        const assignHint = {
            seat: ['Kattints egy szektorra a nagyításhoz', 'Kattints a székekre a kijelöléshez, húzással mozgathatod a térképet'],
            row: ['Kattints egy szektorra a nagyításhoz', 'Kattints egy székre, és a teljes sor kijelölődik'],
            sector: ['Kattints egy szektorra a kijelöléséhez', 'Kattints egy szektorra a kijelöléséhez'],
            rect: ['Húzz egy téglalapot a székcsoport kijelöléséhez', 'Húzz egy téglalapot a székcsoport kijelöléséhez']
        };

        let assignPanel = null;

        const renderInfo = hover => {
            if (hover) {
                hintLine.textContent = hover;
            } else if (mode === 'assign') {
                hintLine.textContent = assignHint[tool][isZoomed() ? 1 : 0];
            } else if (isZoomed()) {
                hintLine.textContent = currentSection
                    ? `${currentSection} szektor · kattints egy szabad székre a kiválasztáshoz`
                    : 'Kattints egy szabad székre a kiválasztáshoz';
            } else {
                hintLine.textContent = 'Kattints egy szektorra a nagyításhoz';
            }
            if (mode === 'assign') {
                selectionLine.textContent = selectedSet.size
                    ? `Kijelölve: ${formatNumber(selectedSet.size)} szék`
                    : 'Nincs kijelölt szék';
            } else {
                selectionLine.textContent = selected.length
                    ? `Kiválasztva (${selected.length}): ${selected.map(index => {
                        const seat = seats[index];
                        return `${seat.section}·${seat.row}·${seat.number}`;
                    }).join(', ')}`
                    : 'Nincs kiválasztott szék';
            }
        };

        const clampView = target => {
            if (target.w >= fullView.w) return { ...fullView };
            return {
                x: Math.min(Math.max(target.x, fullView.x), fullView.x + fullView.w - target.w),
                y: Math.min(Math.max(target.y, fullView.y), fullView.y + fullView.h - target.h),
                w: target.w,
                h: target.h
            };
        };

        const applyView = () => {
            svg.setAttribute('viewBox', `${view.x.toFixed(2)} ${view.y.toFixed(2)} ${view.w.toFixed(2)} ${view.h.toFixed(2)}`);
            svg.classList.toggle('is-zoomed', isZoomed());
            resetButton.hidden = !isZoomed();
        };

        const markCurrent = section => {
            currentSection = section;
            sectorElements.forEach((element, number) => {
                if (number === section) element.setAttribute('data-current', 'true');
                else element.removeAttribute('data-current');
            });
        };

        const moveTo = rawTarget => {
            const target = clampView(rawTarget);
            cancelAnimationFrame(frame);
            if (reduceMotion) {
                view = target;
                applyView();
                renderInfo();
                return;
            }
            const origin = { ...view };
            const startedAt = performance.now();
            const step = now => {
                const progress = Math.min(1, (now - startedAt) / 260);
                const eased = 1 - Math.pow(1 - progress, 3);
                view = {
                    x: lerp(origin.x, target.x, eased),
                    y: lerp(origin.y, target.y, eased),
                    w: lerp(origin.w, target.w, eased),
                    h: lerp(origin.h, target.h, eased)
                };
                applyView();
                if (progress < 1) {
                    frame = requestAnimationFrame(step);
                } else {
                    renderInfo();
                }
            };
            frame = requestAnimationFrame(step);
        };

        const zoomToSection = section => {
            const sectionInfo = sections.get(section);
            if (!sectionInfo || !Number.isFinite(sectionInfo.bounds.minX)) return;
            const { bounds } = sectionInfo;
            const margin = 26;
            const width = Math.max(
                bounds.maxX - bounds.minX + 2 * margin,
                (bounds.maxY - bounds.minY + 2 * margin) * aspect,
                minZoomWidth
            );
            const height = width / aspect;
            markCurrent(section);
            moveTo({
                x: (bounds.minX + bounds.maxX) / 2 - width / 2,
                y: (bounds.minY + bounds.maxY) / 2 - height / 2,
                w: width,
                h: height
            });
        };

        const showFullView = () => {
            markCurrent(null);
            moveTo({ ...fullView });
        };

        // ---- vásárlás mód: székek kiválasztása
        const renderSelection = () => {
            seatElements.forEach(element => element.classList.remove('is-selected'));
            selected.forEach(index => seatElements[index].classList.add('is-selected'));
            renderInfo();
            proceedButton.hidden = selected.length === 0;
            proceedButton.textContent = `Tovább a jegyekhez (${selected.length} szék)`;
            stadium.dispatchEvent(new CustomEvent('stadiumselectionchange', {
                bubbles: true,
                detail: { seats: selected.map(index => seatLabel(seats[index])) }
            }));
        };

        const seatInfoText = (index, includeStatus) => {
            const seat = seats[index];
            const parts = [seatLabel(seat), categoryByKey.get(seat.category).label, priceText(seat.category)];
            if (includeStatus) {
                parts.push(seat.sold ? 'foglalt' : (selected.indexOf(index) >= 0 ? 'kiválasztva' : 'szabad'));
            }
            return parts.join(' · ');
        };

        // A kiválasztott székek az Árazás oldalon kapnak jegytípust.
        proceedButton.addEventListener('click', () => {
            if (!selected.length) return;
            const pending = {
                key: storageKey,
                seats: selected.map(index => {
                    const seat = seats[index];
                    return {
                        key: seat.key, section: seat.section, row: seat.row,
                        number: seat.number, category: seat.category
                    };
                })
            };
            if (!writeStore(PENDING_STORAGE_KEY, pending)) {
                renderInfo('A kiválasztás mentése nem sikerült. Ellenőrizd a böngésző tárhelyét.');
                return;
            }
            const pricingLink = eventCard ? eventCard.querySelector('.event-card-action--secondary') : null;
            window.location.href = pricingLink ? pricingLink.href : 'Arazas.html';
        });

        // ---- kategória-kiosztás mód
        const categoryCounts = () => {
            const counts = new Map(categories.map(category => [category.key, 0]));
            seats.forEach(seat => counts.set(seat.category, counts.get(seat.category) + 1));
            return counts;
        };

        const updateAssignPanel = () => {
            if (!assignPanel) return;
            const counts = categoryCounts();
            assignPanel.count.textContent = formatNumber(selectedSet.size);
            assignPanel.clear.disabled = selectedSet.size === 0;
            assignPanel.resetSelected.disabled = selectedSet.size === 0;
            categories.forEach(category => {
                const button = assignPanel.buttons.get(category.key);
                const price = priceOf(category.key);
                button.meta.textContent =
                    `${price === null ? 'nincs ár' : `${formatNumber(price)} Ft`} · ${formatNumber(counts.get(category.key))} szék`;
                button.element.disabled = selectedSet.size === 0;
            });
            renderInfo();
        };

        const setSeatSelected = (index, on) => {
            if (on) selectedSet.add(index); else selectedSet.delete(index);
            seatElements[index].classList.toggle('is-selected', on);
        };
        const toggleGroup = indexes => {
            const allSelected = indexes.length > 0 && indexes.every(index => selectedSet.has(index));
            indexes.forEach(index => setSeatSelected(index, !allSelected));
            updateAssignPanel();
        };
        const clearSelection = () => {
            Array.from(selectedSet).forEach(index => setSeatSelected(index, false));
            updateAssignPanel();
        };

        const saveAssignments = () => {
            const store = readStore(CATEGORY_STORAGE_KEY);
            const overrides = {};
            seats.forEach(seat => {
                if (seat.category !== seat.defaultCategory) overrides[seat.key] = seat.category;
            });
            if (Object.keys(overrides).length) store[storageKey] = overrides; else delete store[storageKey];
            return writeStore(CATEGORY_STORAGE_KEY, store);
        };

        const setStatus = text => {
            if (assignPanel) assignPanel.status.textContent = text;
        };

        const applyCategory = (indexes, categoryKey, useDefault) => {
            indexes.forEach(index => {
                const seat = seats[index];
                const next = useDefault ? seat.defaultCategory : categoryKey;
                seatElements[index].classList.remove(`stadium-map__seat--cat-${seat.category}`);
                seat.category = next;
                seatElements[index].classList.add(`stadium-map__seat--cat-${next}`);
            });
        };

        const assignSelected = (categoryKey, useDefault) => {
            if (!selectedSet.size) {
                setStatus('Előbb jelölj ki székeket.');
                return;
            }
            const indexes = Array.from(selectedSet);
            applyCategory(indexes, categoryKey, useDefault);
            const saved = saveAssignments();
            const label = useDefault ? 'alapértelmezett kategória' : categoryByKey.get(categoryKey).label;
            setStatus(saved
                ? `${formatNumber(indexes.length)} szék beállítva: ${label}.`
                : 'A kategóriák mentése nem sikerült. Ellenőrizd a böngésző tárhelyét.');
            clearSelection();
            stadium.dispatchEvent(new CustomEvent('stadiumcategorieschange', { bubbles: true }));
        };

        const buildAssignUi = () => {
            const toolDefs = [
                ['seat', 'Szék', 'Egyes székek kijelölése'],
                ['row', 'Sor', 'Egy teljes sor kijelölése'],
                ['sector', 'Szektor', 'Egy teljes szektor kijelölése'],
                ['rect', 'Téglalap', 'Székcsoport kijelölése húzással']
            ];
            const toolbar = document.createElement('div');
            toolbar.className = 'stadium-assign__tools';
            toolbar.setAttribute('role', 'group');
            toolbar.setAttribute('aria-label', 'Kijelölés módja');
            const toolButtons = new Map();
            toolDefs.forEach(([key, label, title]) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'stadium-assign__tool';
                button.textContent = label;
                button.title = title;
                button.setAttribute('aria-pressed', String(key === tool));
                button.addEventListener('click', () => {
                    tool = key;
                    stadium.dataset.tool = key;
                    toolButtons.forEach((element, toolKey) => element.setAttribute('aria-pressed', String(toolKey === key)));
                    renderInfo();
                });
                toolButtons.set(key, button);
                toolbar.appendChild(button);
            });

            const panel = document.createElement('div');
            panel.className = 'stadium-assign__panel';

            const selectionRow = document.createElement('p');
            selectionRow.className = 'stadium-assign__selection';
            const count = document.createElement('strong');
            count.textContent = '0';
            const clear = document.createElement('button');
            clear.type = 'button';
            clear.className = 'stadium-assign__link';
            clear.textContent = 'Kijelölés törlése';
            clear.addEventListener('click', clearSelection);
            selectionRow.append(count, ' szék kijelölve ', clear);

            const title = document.createElement('p');
            title.className = 'stadium-assign__title';
            title.textContent = 'Kategória a kijelölt székeknek';

            const group = document.createElement('div');
            group.className = 'stadium-assign__categories';
            group.setAttribute('role', 'group');
            group.setAttribute('aria-label', 'Kategória hozzárendelése');
            const buttons = new Map();
            categories.forEach(category => {
                const element = document.createElement('button');
                element.type = 'button';
                element.className = `stadium-assign__category stadium-assign__category--${category.key}`;
                const dot = document.createElement('i');
                dot.className = 'stadium-assign__dot';
                const name = document.createElement('span');
                name.className = 'stadium-assign__name';
                name.textContent = category.label;
                const meta = document.createElement('span');
                meta.className = 'stadium-assign__meta';
                element.append(dot, name, meta);
                element.addEventListener('click', () => assignSelected(category.key, false));
                buttons.set(category.key, { element, meta });
                group.appendChild(element);
            });

            const resetRow = document.createElement('div');
            resetRow.className = 'stadium-assign__resets';
            const resetSelected = document.createElement('button');
            resetSelected.type = 'button';
            resetSelected.className = 'stadium-assign__link';
            resetSelected.textContent = 'Kijelöltek vissza az alapra';
            resetSelected.addEventListener('click', () => assignSelected('normal', true));
            const resetAll = document.createElement('button');
            resetAll.type = 'button';
            resetAll.className = 'stadium-assign__link';
            resetAll.textContent = 'Minden szék vissza az alapra';
            let resetTimer = 0;
            resetAll.addEventListener('click', () => {
                if (!resetAll.dataset.confirm) {
                    resetAll.dataset.confirm = 'true';
                    resetAll.textContent = 'Biztosan? Kattints még egyszer';
                    resetTimer = window.setTimeout(() => {
                        delete resetAll.dataset.confirm;
                        resetAll.textContent = 'Minden szék vissza az alapra';
                    }, 3500);
                    return;
                }
                window.clearTimeout(resetTimer);
                delete resetAll.dataset.confirm;
                resetAll.textContent = 'Minden szék vissza az alapra';
                applyCategory(seats.map((seat, index) => index), 'normal', true);
                const saved = saveAssignments();
                clearSelection();
                setStatus(saved ? 'Minden szék visszaállt az alapértelmezett kategóriára.'
                    : 'A kategóriák mentése nem sikerült. Ellenőrizd a böngésző tárhelyét.');
                stadium.dispatchEvent(new CustomEvent('stadiumcategorieschange', { bubbles: true }));
            });
            resetRow.append(resetSelected, resetAll);

            const status = document.createElement('p');
            status.className = 'stadium-assign__status';
            status.setAttribute('aria-live', 'polite');

            panel.append(selectionRow, title, group, resetRow, status);
            stadium.insertBefore(toolbar, canvas);
            stadium.append(panel);
            assignPanel = { count, clear, resetSelected, buttons, status };

            // Az árak az Árazás oldal mezőiből jönnek, és eseményenként megmaradnak.
            categories.forEach(category => {
                const element = document.getElementById(category.priceInput);
                if (element && Number.isFinite(storedPrices[category.key])) element.value = String(storedPrices[category.key]);
            });
            document.addEventListener('input', event => {
                const category = categories.find(item => item.priceInput === event.target.id);
                if (!category) return;
                const price = readInputPrice(category);
                const store = readStore(PRICE_STORAGE_KEY);
                const eventPrices = { ...(store[storageKey] || {}) };
                if (price === null) delete eventPrices[category.key]; else eventPrices[category.key] = price;
                if (Object.keys(eventPrices).length) store[storageKey] = eventPrices; else delete store[storageKey];
                writeStore(PRICE_STORAGE_KEY, store);
                updateAssignPanel();
            });

            const capacityLabel = document.getElementById('seat-capacity');
            if (capacityLabel) {
                capacityLabel.textContent = requestedCapacity > seats.length
                    ? `Összesen ${formatNumber(seats.length)} szék a térképen (a létszám ${formatNumber(requestedCapacity)} fő)`
                    : `Összesen ${formatNumber(seats.length)} szék`;
            }
            updateAssignPanel();
        };

        // ---- jelmagyarázat a kártyán
        if (mode === 'buy' && eventCard) {
            const legend = eventCard.querySelector('.event-seat-legend');
            if (legend) {
                const priceItem = legend.querySelector('.event-seat-legend__price');
                legend.replaceChildren();
                const addItem = (itemKey, text) => {
                    const item = document.createElement('span');
                    item.className = `event-seat-legend__item event-seat-legend__item--${itemKey}`;
                    item.textContent = text;
                    legend.appendChild(item);
                };
                if (activeSections.size) addItem('active', 'Aktív szektor');
                const counts = categoryCounts();
                categories.forEach(category => {
                    if (counts.get(category.key) > 0) addItem(category.key, category.label);
                });
                addItem('sold', 'Foglalt');
                if (booked.size) addItem('booked', 'Lefoglalva');
                addItem('selected', 'Kiválasztva');
                if (priceItem) legend.appendChild(priceItem);
            }
        }

        // ---- események
        const toSvgPoint = (clientX, clientY) => {
            const rect = svg.getBoundingClientRect();
            return {
                x: view.x + (clientX - rect.left) / (rect.width || 1) * view.w,
                y: view.y + (clientY - rect.top) / (rect.height || 1) * view.h
            };
        };

        const clearRowHover = () => {
            if (hoveredRow) hoveredRow.forEach(index => seatElements[index].classList.remove('is-row-hover'));
            hoveredRow = null;
        };

        svg.addEventListener('click', event => {
            if (wasDragged) {
                wasDragged = false;
                return;
            }
            const seatElement = event.target.closest('.stadium-map__seat');
            const sectorElement = event.target.closest('[data-sector]');
            const section = sectorElement ? Number(sectorElement.dataset.sector) : null;

            if (mode === 'assign') {
                if (tool === 'sector') {
                    if (section !== null) toggleGroup(sections.get(section).seatIndexes);
                    return;
                }
                if (tool === 'rect') return;
                if (seatElement && isZoomed()) {
                    const index = Number(seatElement.dataset.seat);
                    if (tool === 'row') {
                        toggleGroup(rowGroups.get(`${seats[index].section}-${seats[index].row}`));
                    } else {
                        toggleGroup([index]);
                    }
                    return;
                }
                if (section !== null && (!isZoomed() || section !== currentSection)) zoomToSection(section);
                return;
            }

            if (seatElement && isZoomed()) {
                const index = Number(seatElement.dataset.seat);
                const seat = seats[index];
                if (seat.sold) {
                    renderInfo(`${seatInfoText(index, true)}`);
                    return;
                }
                const position = selected.indexOf(index);
                if (position >= 0) {
                    selected.splice(position, 1);
                } else if (selected.length >= maxSelectedSeats) {
                    renderInfo(`Egyszerre legfeljebb ${maxSelectedSeats} szék választható`);
                    return;
                } else {
                    selected.push(index);
                }
                renderSelection();
                return;
            }
            if (section !== null && (!isZoomed() || section !== currentSection)) zoomToSection(section);
        });

        svg.addEventListener('pointerover', event => {
            const seatElement = event.target.closest('.stadium-map__seat');
            if (seatElement && isZoomed() && tool !== 'sector' && tool !== 'rect') {
                const index = Number(seatElement.dataset.seat);
                if (mode === 'assign' && tool === 'row') {
                    const rowIndexes = rowGroups.get(`${seats[index].section}-${seats[index].row}`);
                    if (rowIndexes !== hoveredRow) {
                        clearRowHover();
                        hoveredRow = rowIndexes;
                        rowIndexes.forEach(rowIndex => seatElements[rowIndex].classList.add('is-row-hover'));
                    }
                }
                renderInfo(seatInfoText(index, mode === 'buy'));
                return;
            }
            clearRowHover();
            const sectorElement = event.target.closest('[data-sector]');
            if (sectorElement) {
                renderInfo(sectorText(Number(sectorElement.dataset.sector)));
            }
        });
        svg.addEventListener('pointerleave', () => {
            clearRowHover();
            renderInfo();
        });

        svg.addEventListener('keydown', event => {
            const sector = event.target.closest('[data-sector]');
            if (!sector || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            const section = Number(sector.dataset.sector);
            if (mode === 'assign' && tool === 'sector') toggleGroup(sections.get(section).seatIndexes);
            else zoomToSection(section);
        });
        stadium.addEventListener('keydown', event => {
            if (event.key === 'Escape' && isZoomed()) showFullView();
        });
        resetButton.addEventListener('click', showFullView);

        const updateMarquee = point => {
            const x = Math.min(marquee.start.x, point.x);
            const y = Math.min(marquee.start.y, point.y);
            marquee.element.setAttribute('x', x.toFixed(1));
            marquee.element.setAttribute('y', y.toFixed(1));
            marquee.element.setAttribute('width', Math.abs(point.x - marquee.start.x).toFixed(1));
            marquee.element.setAttribute('height', Math.abs(point.y - marquee.start.y).toFixed(1));
            marquee.end = point;
        };

        svg.addEventListener('pointerdown', event => {
            wasDragged = false;
            if (event.button !== undefined && event.button !== 0) return;
            if (mode === 'assign' && tool === 'rect') {
                const element = document.createElementNS(svgNamespace, 'rect');
                element.setAttribute('class', 'stadium-map__marquee');
                svg.appendChild(element);
                marquee = { start: toSvgPoint(event.clientX, event.clientY), end: null, element };
                updateMarquee(marquee.start);
                return;
            }
            if (!isZoomed()) return;
            drag = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y, moved: false };
        });
        window.addEventListener('pointermove', event => {
            if (marquee) {
                updateMarquee(toSvgPoint(event.clientX, event.clientY));
                return;
            }
            if (!drag) return;
            const deltaX = event.clientX - drag.x;
            const deltaY = event.clientY - drag.y;
            if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return;
            drag.moved = true;
            wasDragged = true;
            const width = svg.getBoundingClientRect().width || 1;
            const scale = view.w / width;
            cancelAnimationFrame(frame);
            view = clampView({ x: drag.viewX - deltaX * scale, y: drag.viewY - deltaY * scale, w: view.w, h: view.h });
            applyView();
        });
        const finishPointer = () => {
            drag = null;
            if (!marquee) return;
            const { start, end, element } = marquee;
            marquee = null;
            element.remove();
            if (!end) return;
            const minX = Math.min(start.x, end.x);
            const maxX = Math.max(start.x, end.x);
            const minY = Math.min(start.y, end.y);
            const maxY = Math.max(start.y, end.y);
            if (maxX - minX < 2 && maxY - minY < 2) return;
            wasDragged = true;
            const inside = [];
            seats.forEach((seat, index) => {
                if (seat.x >= minX && seat.x <= maxX && seat.y >= minY && seat.y <= maxY) inside.push(index);
            });
            inside.forEach(index => setSeatSelected(index, true));
            updateAssignPanel();
        };
        window.addEventListener('pointerup', finishPointer);
        window.addEventListener('pointercancel', finishPointer);

        if (mode === 'assign') buildAssignUi();
        renderInfo();
    };

    document.querySelectorAll('.event-stadium-preview').forEach(initStadium);
})();

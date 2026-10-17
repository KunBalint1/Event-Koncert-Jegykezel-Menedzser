// Stadion ülésrend: lekerekített téglalap alakú lelátó, két szinttel (alsó 101–108, felső 201–208).
// Minden szék külön pont. Teljes nézetben egy székre vagy szektorra kattintva a szektorra nagyít,
// nagyítva egy szabad székre kattintva kiválasztja azt.
// A data-active-sectors indexei: 0–7 az alsó szint (101–108), 8–15 a felső szint (201–208).
document.querySelectorAll('.event-stadium-preview').forEach(stadium => {
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const fullView = { x: -380, y: -302, w: 760, h: 604 };
    const aspect = fullView.w / fullView.h;
    const loop = 16;
    const seatSpacing = 10.5;
    const sectionInset = 0.05;
    const maxSelectedSeats = 8;
    const rowLetters = 'ABCDEFGH';
    const tierNames = { premium: 'Prémium', lower: 'Alsó szint', upper: 'Felső szint' };
    const segments = [
        [2, 'topRight'], [1, 'cornerTopRight'], [2, 'right'], [1, 'cornerBottomRight'],
        [4, 'bottom'], [1, 'cornerBottomLeft'], [2, 'left'], [1, 'cornerTopLeft'], [2, 'topLeft']
    ];
    const tiers = [
        {
            key: 'lower', base: 100, rows: 6, labelShift: -15,
            inner: { a: 176, b: 122, r: 40 }, outer: { a: 236, b: 174, r: 96 }
        },
        {
            key: 'upper', base: 200, rows: 8, labelShift: 16,
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

    // A foglaltság az esemény kártyáján látható eladási sávból jön.
    const eventCard = stadium.closest('.event-card');
    const salesBar = eventCard ? eventCard.querySelector('.event-sales-progress span') : null;
    const salesWidth = salesBar ? parseFloat(salesBar.style.width) : NaN;
    const soldRatio = Number.isFinite(salesWidth) ? salesWidth / 100 : 0.4;
    const eventHeading = eventCard ? eventCard.querySelector('h5') : null;
    const eventKey = eventHeading ? eventHeading.textContent.trim() : 'event';
    const eventPrice = eventCard ? Number(eventCard.dataset.price) : NaN;
    const formattedEventPrice = Number.isInteger(eventPrice) && eventPrice >= 0
        ? `${eventPrice.toLocaleString('hu-HU')} Ft / jegy`
        : 'Jegyár nincs megadva';

    const activeIndexes = new Set(
        (stadium.dataset.activeSectors || '')
            .split(',')
            .map(value => Number(value.trim()))
            .filter(Number.isInteger)
    );
    const activeSections = new Set(
        Array.from(activeIndexes).map(index => (index < 8 ? 101 + index : 201 + index - 8))
    );

    const seats = [];
    const sectionBounds = new Map();
    const sectionSeatMarkup = new Map();
    const labelMarkup = [];

    tiers.forEach(tier => {
        blocks.forEach(block => {
            const section = tier.base + block.number;
            const sectionBias = (hashUnit(`${eventKey}-${section}`) - 0.5) * 0.2;
            const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
            const markup = [];

            for (let row = 0; row < tier.rows; row += 1) {
                const ratio = (row + 0.5) / tier.rows;
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
                const rowLength = lengths[steps];
                const seatCount = Math.max(2, Math.floor(rowLength / seatSpacing));
                const seatTier = tier.key === 'upper' ? 'upper' : (row < 2 ? 'premium' : 'lower');
                const tierFactor = seatTier === 'premium' ? 1.1 : seatTier === 'upper' ? 0.9 : 1;
                const soldChance = Math.min(0.97, Math.max(0.02, soldRatio * tierFactor + sectionBias));
                let segmentIndex = 0;

                for (let seatIndex = 0; seatIndex < seatCount; seatIndex += 1) {
                    const target = (seatIndex + 0.5) * rowLength / seatCount;
                    while (segmentIndex < steps - 1 && lengths[segmentIndex + 1] < target) segmentIndex += 1;
                    const span = lengths[segmentIndex + 1] - lengths[segmentIndex] || 1;
                    const along = (target - lengths[segmentIndex]) / span;
                    const x = lerp(points[segmentIndex][0], points[segmentIndex + 1][0], along);
                    const y = lerp(points[segmentIndex][1], points[segmentIndex + 1][1], along);
                    const number = seatIndex + 1;
                    const seatId = `${section}-${rowLetters[row]}-${number}`;
                    const sold = soldRatio > 0 && hashUnit(`${eventKey}-${seatId}`) < soldChance;
                    seats.push({ section, row: rowLetters[row], number, x, y, tier: seatTier, sold });
                    markup.push(
                        `<circle class="stadium-map__seat stadium-map__seat--${seatTier}${sold ? ' is-sold' : ''}"` +
                        ` cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" data-seat="${seats.length - 1}"/>`
                    );
                    bounds.minX = Math.min(bounds.minX, x);
                    bounds.maxX = Math.max(bounds.maxX, x);
                    bounds.minY = Math.min(bounds.minY, y);
                    bounds.maxY = Math.max(bounds.maxY, y);
                }
            }

            sectionBounds.set(section, bounds);
            sectionSeatMarkup.set(section, markup.join(''));

            const middle = (block.from + block.to) / 2;
            const [labelX, labelY] = pointOnRing(
                middle,
                tier.key === 'lower' ? tier.inner.a + tier.labelShift : tier.outer.a + tier.labelShift,
                tier.key === 'lower' ? tier.inner.b + tier.labelShift : tier.outer.b + tier.labelShift,
                tier.key === 'lower' ? tier.inner.r + tier.labelShift : tier.outer.r + tier.labelShift
            );
            labelMarkup.push(
                `<text class="stadium-map__label" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}">${section}</text>`
            );
        });
    });

    const svg = document.createElementNS(svgNamespace, 'svg');
    svg.setAttribute('viewBox', `${fullView.x} ${fullView.y} ${fullView.w} ${fullView.h}`);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Stadion ülésrendje, minden pont egy szék');
    svg.setAttribute('focusable', 'false');

    const sectionMarkup = Array.from(sectionSeatMarkup.entries()).map(([section, seatMarkup]) => {
        const state = activeSections.has(section) ? 'active' : 'idle';
        return `<g data-sector="${section}" data-state="${state}" tabindex="0" role="button"` +
            ` aria-label="${section} szektor, nagyítás">${seatMarkup}</g>`;
    }).join('');

    svg.innerHTML =
        '<rect class="stadium-map__background" x="-376" y="-298" width="752" height="596" rx="28"/>' +
        `<path class="stadium-map__pitch" d="${ringPath(140, 92, 26)}"/>` +
        '<rect class="stadium-map__stage" x="-134" y="-38" width="22" height="76" rx="4"/>' +
        '<rect class="stadium-map__stage-runway" x="-112" y="-5" width="70" height="10" rx="3"/>' +
        '<circle class="stadium-map__pitch-circle" cx="-34" cy="0" r="10"/>' +
        '<text class="stadium-map__pitch-label" x="40" y="0">ÁLLÓHELY</text>' +
        sectionMarkup + labelMarkup.join('');

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'stadium-map__reset';
    resetButton.textContent = 'Teljes kép';
    resetButton.hidden = true;

    const info = document.createElement('p');
    info.className = 'stadium-map__info';
    info.setAttribute('aria-live', 'polite');
    const hintLine = document.createElement('span');
    const selectionLine = document.createElement('span');
    info.append(hintLine, selectionLine);

    stadium.append(svg, resetButton, info);
    const seatElements = svg.querySelectorAll('.stadium-map__seat');

    let view = { ...fullView };
    let selected = [];
    let frame = 0;
    let drag = null;
    let wasDragged = false;
    const reduceMotion = Boolean(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    const isZoomed = () => view.w < fullView.w - 1;
    const seatLabel = seat =>
        `${seat.section} · ${seat.row} sor · ${seat.number}. szék · ${formattedEventPrice}`;

    const renderInfo = hover => {
        hintLine.textContent = hover ||
            (isZoomed() ? 'Kattints egy szabad székre a kiválasztáshoz' : 'Kattints egy szektorra a nagyításhoz');
        selectionLine.textContent = selected.length
            ? `Kiválasztva (${selected.length}): ${selected.map(index => {
                const seat = seats[index];
                return `${seat.section}·${seat.row}·${seat.number}`;
            }).join(', ')}`
            : 'Nincs kiválasztott szék';
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
        const bounds = sectionBounds.get(section);
        if (!bounds) return;
        const margin = 26;
        const width = Math.max(
            bounds.maxX - bounds.minX + 2 * margin,
            (bounds.maxY - bounds.minY + 2 * margin) * aspect,
            110
        );
        const height = width / aspect;
        moveTo({
            x: (bounds.minX + bounds.maxX) / 2 - width / 2,
            y: (bounds.minY + bounds.maxY) / 2 - height / 2,
            w: width,
            h: height
        });
    };

    const showFullView = () => moveTo({ ...fullView });

    const renderSelection = () => {
        seatElements.forEach(element => element.classList.remove('is-selected'));
        selected.forEach(index => seatElements[index].classList.add('is-selected'));
        renderInfo();
        stadium.dispatchEvent(new CustomEvent('stadiumselectionchange', {
            bubbles: true,
            detail: { seats: selected.map(index => seatLabel(seats[index])) }
        }));
    };

    svg.addEventListener('click', event => {
        if (wasDragged) {
            wasDragged = false;
            return;
        }
        const seatElement = event.target.closest('.stadium-map__seat');
        if (!seatElement) return;
        const index = Number(seatElement.dataset.seat);
        const seat = seats[index];
        if (!isZoomed()) {
            zoomToSection(seat.section);
            return;
        }
        if (seat.sold) {
            renderInfo(`${seatLabel(seat)} · foglalt`);
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
    });

    svg.addEventListener('pointerover', event => {
        const seatElement = event.target.closest('.stadium-map__seat');
        if (!seatElement) return;
        const seat = seats[Number(seatElement.dataset.seat)];
        const status = seat.sold ? 'foglalt' : (selected.indexOf(Number(seatElement.dataset.seat)) >= 0 ? 'kiválasztva' : 'szabad');
        renderInfo(`${seatLabel(seat)} · ${tierNames[seat.tier]} · ${status}`);
    });
    svg.addEventListener('pointerleave', () => renderInfo());

    svg.addEventListener('keydown', event => {
        const sector = event.target.closest('[data-sector]');
        if (!sector || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        zoomToSection(Number(sector.dataset.sector));
    });
    stadium.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isZoomed()) showFullView();
    });
    resetButton.addEventListener('click', showFullView);

    svg.addEventListener('pointerdown', event => {
        wasDragged = false;
        if (!isZoomed()) return;
        drag = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y, moved: false };
    });
    window.addEventListener('pointermove', event => {
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
    window.addEventListener('pointerup', () => { drag = null; });
    window.addEventListener('pointercancel', () => { drag = null; });

    renderInfo();
});

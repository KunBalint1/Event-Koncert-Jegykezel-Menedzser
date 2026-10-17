/*
 * AI (Claude) által készítve: a naptár megjelenítése és működése
 * (hónapok és napnevek, hétfői hétkezdés, 42 cellás rács, mai nap kiemelése,
 * hónapváltás az előző/következő gombokkal).
 */

const MONTHS = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június',
    'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
const WEEKDAYS = ['Hé', 'Ke', 'Sze', 'Csü', 'Pé', 'Szo', 'Va'];

const pad = n => String(n).padStart(2, '0');
const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const CALENDAR_STORAGE_KEY = 'jegykezelo-esemenyek';
const calendarEventStatus = document.getElementById('calendar-event-status');
const eventForm = document.getElementById('event-form');
const deleteEventButton = document.getElementById('delete-event-button');
const confirmDeleteEventButton = document.getElementById('confirm-delete-event');
const deleteEventConfirmation = document.getElementById('delete-event-confirmation');
let selectedCalendarEventId = null;

function isCalendarEvent(event) {
    return event && typeof event.id === 'string' &&
        typeof event.name === 'string' && typeof event.location === 'string' &&
        typeof event.description === 'string' && typeof event.date === 'string' &&
        typeof event.time === 'string' && Number.isInteger(event.capacity) &&
        event.capacity > 0 && /^\d{4}-\d{2}-\d{2}$/.test(event.date) &&
        /^\d{2}:\d{2}$/.test(event.time) &&
        (event.soldTickets === undefined ||
            (Number.isInteger(event.soldTickets) && event.soldTickets >= 0)) &&
        (event.price === undefined ||
            (Number.isInteger(event.price) && event.price >= 0)) &&
        (event.revenue === undefined ||
            (Number.isFinite(event.revenue) && event.revenue >= 0)) &&
        !Number.isNaN(new Date(`${event.date}T${event.time}`).getTime());
}

function loadCalendarEvents() {
    try {
        const savedEvents = localStorage.getItem(CALENDAR_STORAGE_KEY);
        if (savedEvents === null) return [];

        const parsedEvents = JSON.parse(savedEvents);
        if (!Array.isArray(parsedEvents) || !parsedEvents.every(isCalendarEvent)) {
            throw new Error('A mentett eseményadatok formátuma érvénytelen.');
        }
        return parsedEvents;
    } catch (error) {
        console.error('Nem sikerült betölteni a naptáreseményeket.', error);
        if (calendarEventStatus) {
            calendarEventStatus.textContent =
                'A mentett események nem tölthetők be. Ellenőrizd a böngésző tárhelyét.';
        }
        return [];
    }
}

let calendarEvents = loadCalendarEvents();

const statisticsChartElement = document.getElementById('OsszBevetel');
const statisticsEventId = statisticsChartElement
    ? new URLSearchParams(window.location.search).get('eventId')
    : null;
const selectedStatisticsEvent = statisticsEventId
    ? calendarEvents.find(event => event.id === statisticsEventId)
    : null;

function showSelectedEventStatistics(event) {
    const soldTickets = event.soldTickets || 0;
    const revenue = event.revenue || 0;
    const capacity = event.capacity;
    const salesRate = Math.min(100, Math.round((soldTickets / capacity) * 100));
    const formatNumber = value => value.toLocaleString('hu-HU');

    const pageHeading = document.querySelector('main h2');
    if (pageHeading) pageHeading.textContent = `Statisztika · ${event.name}`;

    const ticketCountCard = document.getElementById('JegyekDb').parentElement;
    const ticketCountHeading = ticketCountCard.querySelector('h5');
    const ticketCountLabel = ticketCountCard.querySelector('p');
    if (ticketCountHeading) ticketCountHeading.textContent = formatNumber(soldTickets);
    if (ticketCountLabel) ticketCountLabel.textContent = `Eladott jegyek · ${event.name}`;
    const ticketSalesRate = ticketCountCard.querySelector('.text-fg-success');
    if (ticketSalesRate && ticketSalesRate.lastChild) {
        ticketSalesRate.lastChild.textContent = `${salesRate}%`;
    }

    const visitorCard = document.getElementById('SzemelyDb').parentElement;
    const visitorHeading = visitorCard.querySelector('h5');
    const visitorLabel = visitorCard.querySelector('p');
    if (visitorHeading) visitorHeading.textContent = formatNumber(capacity);
    if (visitorLabel) visitorLabel.textContent = `Férőhelyek · ${event.name}`;
    const visitorRate = visitorCard.querySelector('.text-fg-success');
    if (visitorRate && visitorRate.lastChild) visitorRate.lastChild.textContent = `${salesRate}%`;

    const revenueCard = statisticsChartElement.parentElement;
    const revenueHeading = revenueCard.querySelector('h5');
    const revenueTotal = revenueCard.querySelector('p');
    if (revenueHeading) revenueHeading.textContent = `Összbevétel · ${event.name}`;
    if (revenueTotal) {
        if (revenueTotal.firstChild) {
            revenueTotal.firstChild.textContent = `${formatNumber(revenue)} Ft `;
        }
        const revenueDetail = revenueTotal.querySelector('span');
        if (revenueDetail) {
            revenueDetail.textContent = `(${formatNumber(soldTickets)} eladott jegy)`;
        }
    }

    const eventDescriptionCard = Array.from(document.querySelectorAll('main h5'))
        .find(heading => heading.textContent.trim() === 'Esemény leírás:');
    if (eventDescriptionCard) {
        const description = eventDescriptionCard.parentElement.querySelector('p');
        if (description) {
            description.textContent =
                `${event.name} · ${event.location} · ${event.date} ${event.time} · ` +
                `${formatNumber(Math.max(0, capacity - soldTickets))} szabad férőhely. ` +
                (event.description || '');
        }
    }

    const ticketTypesHeading = Array.from(document.querySelectorAll('main h5'))
        .find(heading => heading.textContent.includes('Eladott') &&
            heading.textContent.includes('jegyek száma'));
    if (ticketTypesHeading) {
        ticketTypesHeading.textContent = `Jegyeladások · ${event.name}`;
        const ticketTypesGrid = ticketTypesHeading.parentElement.querySelector('div.grid');
        if (ticketTypesGrid) {
            const remaining = Math.max(0, capacity - soldTickets);
            const ticketStats = [
                ['Eladott jegy: ', `${formatNumber(soldTickets)} db`],
                ['Szabad férőhely: ', `${formatNumber(remaining)} db`],
                ['Eladási arány: ', `${salesRate}%`],
                ['Jegytípus bontás: ', 'nincs rögzítve']
            ];
            Array.from(ticketTypesGrid.querySelectorAll('p')).forEach((item, index) => {
                if (!ticketStats[index]) return;
                if (item.firstChild) item.firstChild.textContent = ticketStats[index][0];
                const detail = item.querySelector('span');
                if (detail) detail.textContent = ticketStats[index][1];
            });
        }
    }
}

if (statisticsEventId && selectedStatisticsEvent) {
    showSelectedEventStatistics(selectedStatisticsEvent);
} else if (statisticsEventId) {
    console.warn(`A kért naptáresemény nem található: ${statisticsEventId}`);
}

function saveCalendarEvents(events) {
    try {
        localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events));
        return true;
    } catch (error) {
        console.error('Nem sikerült elmenteni a naptáreseményeket.', error);
        if (calendarEventStatus) {
            calendarEventStatus.textContent =
                'Az esemény mentése nem sikerült. Ellenőrizd a böngésző tárhelyét.';
        }
        return false;
    }
}

const nextEventNameElement = document.getElementById('next-event-name');
const countdownParts = {
    days: document.querySelector('.timer .day'),
    hours: document.querySelector('.timer .hour'),
    minutes: document.querySelector('.timer .min'),
    seconds: document.querySelector('.timer .sec')
};
const countdownIsAvailable = nextEventNameElement &&
    Object.values(countdownParts).every(element => element);
let countdownIntervalId = null;

function updateNextEventCountdown() {
    if (!countdownIsAvailable) return;
    const nextEvent = calendarEvents
        .map(event => ({ ...event, startsAt: new Date(`${event.date}T${event.time}`) }))
        .filter(event => event.startsAt.getTime() > Date.now())
        .sort((first, second) => first.startsAt - second.startsAt)[0];

    if (nextEvent) {
        nextEventNameElement.textContent =
            `${nextEvent.name} · ${new Intl.DateTimeFormat('hu-HU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(nextEvent.startsAt)}`;

        const updateCountdown = () => {
            const remainingSeconds = Math.max(
                0,
                Math.floor((nextEvent.startsAt.getTime() - Date.now()) / 1000)
            );
            countdownParts.days.textContent = String(Math.floor(remainingSeconds / 86400)).padStart(3, '0');
            countdownParts.hours.textContent = pad(Math.floor((remainingSeconds % 86400) / 3600));
            countdownParts.minutes.textContent = pad(Math.floor((remainingSeconds % 3600) / 60));
            countdownParts.seconds.textContent = pad(remainingSeconds % 60);
            if (remainingSeconds === 0) {
                window.clearInterval(countdownIntervalId);
                countdownIntervalId = null;
                window.setTimeout(updateNextEventCountdown, 1000);
            }
        };

        updateCountdown();
        if (countdownIntervalId !== null) window.clearInterval(countdownIntervalId);
        countdownIntervalId = window.setInterval(updateCountdown, 1000);
    } else {
        nextEventNameElement.textContent = 'Nincs közelgő esemény';
        Object.values(countdownParts).forEach(element => {
            element.textContent = '000';
        });
        if (countdownIntervalId !== null) {
            window.clearInterval(countdownIntervalId);
            countdownIntervalId = null;
        }
    }
}

updateNextEventCountdown();

const weekdaysElement = document.getElementById('weekdays');
const monthTitleElement = document.getElementById('month-title');
const calendarGridElement = document.getElementById('calendar-grid');
const previousMonthButton = document.getElementById('prev-month');
const nextMonthButton = document.getElementById('next-month');
let refreshCalendar = () => {};

if (weekdaysElement && monthTitleElement && calendarGridElement &&
    previousMonthButton && nextMonthButton) {
    let view = new Date();
    view.setDate(1);

    weekdaysElement.innerHTML = WEEKDAYS
        .map(d => `<div>${d}</div>`).join('');

    function renderCalendar() {
        calendarGridElement.replaceChildren();
        const y = view.getFullYear();
        const m = view.getMonth();
        monthTitleElement.textContent = `${y}. ${MONTHS[m]}`;

        const offset = (new Date(y, m, 1).getDay() + 6) % 7; // hétfő = 0
        const todayKey = toKey(new Date());

        for (let i = 0; i < 42; i++) {
            const d = new Date(y, m, 1 - offset + i);
            const key = toKey(d);
            const inMonth = d.getMonth() === m;
            const isToday = key === todayKey;
            const cell = document.createElement('div');
            cell.dataset.date = key;
            cell.className = `calendar-day rounded-base p-2 text-sm overflow-hidden
                ${inMonth ? 'bg-neutral-secondary-medium text-heading' : 'bg-neutral-primary-soft text-body opacity-50'}
                ${isToday ? 'ring-2 ring-brand font-bold' : ''}`;

            const dayNumber = document.createElement('span');
            dayNumber.className = 'calendar-day__number';
            dayNumber.textContent = String(d.getDate());
            cell.appendChild(dayNumber);

            const dayEventsContainer = document.createElement('div');
            dayEventsContainer.className = 'calendar-day__events';
            const dayEvents = calendarEvents.filter(event => event.date === key);
            dayEvents.forEach(event => {
                const eventRow = document.createElement('div');
                eventRow.className = 'calendar-event-row';

                const eventLink = document.createElement('a');
                eventLink.className = 'calendar-event-chip';
                eventLink.dataset.eventId = event.id;
                eventLink.href = `Statisztika.html?eventId=${encodeURIComponent(event.id)}`;
                eventLink.textContent = event.name;
                eventLink.title =
                    `${event.name} · ${event.location} · ${event.time} · ${event.capacity} fő\n${event.description}`;
                eventLink.setAttribute('aria-label',
                    `${event.name}, ${event.location}, ${event.time}. Leírás: ${event.description}`);
                if (event.id === selectedCalendarEventId) {
                    eventLink.classList.add('calendar-event-chip--selected');
                }
                eventRow.appendChild(eventLink);

                const deleteSelectButton = document.createElement('button');
                deleteSelectButton.type = 'button';
                deleteSelectButton.className = 'calendar-event-delete-select';
                deleteSelectButton.textContent = '×';
                deleteSelectButton.setAttribute('aria-label',
                    `Törlés kijelölése: ${event.name}`);
                deleteSelectButton.title = `Törlés kijelölése: ${event.name}`;
                deleteSelectButton.addEventListener('click', () => {
                    selectedCalendarEventId = event.id;
                    if (deleteEventButton) deleteEventButton.disabled = false;
                    if (calendarEventStatus) {
                        calendarEventStatus.textContent =
                            `Kiválasztva törléshez: ${event.name} (${event.date}, ${event.time}).`;
                    }
                    renderCalendar();
                });
                eventRow.appendChild(deleteSelectButton);
                dayEventsContainer.appendChild(eventRow);
            });
            cell.appendChild(dayEventsContainer);
            calendarGridElement.appendChild(cell);
        }
    }

    refreshCalendar = renderCalendar;

    if (deleteEventButton) {
        deleteEventButton.addEventListener('click', () => {
            const eventToDelete = calendarEvents.find(
                event => event.id === selectedCalendarEventId
            );
            if (eventToDelete && deleteEventConfirmation) {
                deleteEventConfirmation.textContent =
                    `Biztosan törölni szeretnéd ezt az eseményt: ${eventToDelete.name}?`;
            }
        });
    }

    previousMonthButton.addEventListener('click', () => {
        view.setMonth(view.getMonth() - 1); renderCalendar();
    });
    nextMonthButton.addEventListener('click', () => {
        view.setMonth(view.getMonth() + 1); renderCalendar();
    });

    if (eventForm) {
        eventForm.addEventListener('submit', event => {
            event.preventDefault();
            if (!eventForm.reportValidity()) return;

            const nameInput = document.getElementById('event-name');
            const locationInput = document.getElementById('event-location');
            const capacityInput = document.getElementById('event-capacity');
            const priceInput = document.getElementById('event-price');
            const descriptionInput = document.getElementById('event-description');
            const dateInput = document.getElementById('event-date');
            const timeInput = document.getElementById('event-time');
            const name = nameInput.value.trim();
            const location = locationInput.value.trim();
            const description = descriptionInput.value.trim();
            const capacity = Number(capacityInput.value);
            const price = Number(priceInput.value);

            if (!name || !location || !description || !Number.isInteger(capacity) || capacity < 1 ||
                !priceInput.value.trim() || !Number.isInteger(price) || price < 0) {
                if (calendarEventStatus) {
                    calendarEventStatus.textContent =
                        'Töltsd ki az összes mezőt, és adj meg pozitív létszámot, valamint 0 vagy nagyobb egész jegyárat.';
                }
                return;
            }

            const newEvent = {
                id: window.crypto && window.crypto.randomUUID
                    ? window.crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name,
                location,
                capacity,
                price,
                soldTickets: 0,
                revenue: 0,
                description,
                date: dateInput.value,
                time: timeInput.value
            };
            const updatedEvents = [...calendarEvents, newEvent];
            if (!saveCalendarEvents(updatedEvents)) return;

            calendarEvents = updatedEvents;
            view = new Date(`${newEvent.date}T12:00:00`);
            view.setDate(1);
            selectedCalendarEventId = null;
            if (deleteEventButton) deleteEventButton.disabled = true;
            if (calendarEventStatus) {
                calendarEventStatus.textContent = `${newEvent.name} esemény elmentve.`;
            }
            eventForm.reset();
            const drawerCloseButton = document.querySelector(
                '#drawer-navigation [data-drawer-hide="drawer-navigation"]'
            );
            if (drawerCloseButton) drawerCloseButton.click();
            updateNextEventCountdown();
            renderCalendar();
        });
    }

    if (confirmDeleteEventButton) {
        confirmDeleteEventButton.addEventListener('click', () => {
            const eventToDelete = calendarEvents.find(
                event => event.id === selectedCalendarEventId
            );
            if (!eventToDelete) {
                if (calendarEventStatus) {
                    calendarEventStatus.textContent = 'Előbb válassz ki egy törlendő eseményt.';
                }
                return;
            }

            const updatedEvents = calendarEvents.filter(
                event => event.id !== selectedCalendarEventId
            );
            if (!saveCalendarEvents(updatedEvents)) return;

            calendarEvents = updatedEvents;
            selectedCalendarEventId = null;
            if (deleteEventButton) deleteEventButton.disabled = true;
            if (calendarEventStatus) {
                calendarEventStatus.textContent = `${eventToDelete.name} esemény törölve.`;
            }
            if (deleteEventConfirmation) {
                deleteEventConfirmation.textContent =
                    'Biztosan törölni szeretnéd a kiválasztott eseményt?';
            }
            updateNextEventCountdown();
            renderCalendar();
            const closeModalButton = document.querySelector(
                '#popup-modal [data-modal-hide="popup-modal"]'
            );
            if (closeModalButton) closeModalButton.click();
        });
    }

    renderCalendar();
}

window.addEventListener('storage', event => {
    if (event.key !== CALENDAR_STORAGE_KEY && event.key !== null) return;
    calendarEvents = loadCalendarEvents();
    selectedCalendarEventId = null;
    if (deleteEventButton) deleteEventButton.disabled = true;
    updateNextEventCountdown();
    refreshCalendar();
});

document.querySelectorAll('.scrollmenu').forEach((menu) => {
    menu.addEventListener('wheel', (e) => {
        e.preventDefault();
        menu.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    }, { passive: false });
});

// Get the CSS variable --color-brand and convert it to hex for ApexCharts
const getBrandColor = () => {
  // Get the computed style of the document's root element
  const computedStyle = getComputedStyle(document.documentElement);
  
  // Get the value of the --color-brand CSS variable
  return computedStyle.getPropertyValue('--color-fg-brand').trim() || "#1447E6";
};

const brandColor = getBrandColor();

const options = {
  chart: {
    height: 260,
    maxWidth: "100%",
    type: "area",
    fontFamily: "Inter, sans-serif",
    dropShadow: {
      enabled: false,
    },
    toolbar: {
      show: false,
    },
  },
  tooltip: {
    enabled: true,
    x: {
      show: false,
    },
  },
  fill: {
    type: "gradient",
    gradient: {
      opacityFrom: 0.55,
      opacityTo: 0,
      shade: brandColor,
      gradientToColors: [brandColor],
    },
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    width: 6,
  },
  grid: {
    show: false,
    strokeDashArray: 4,
    padding: {
      left: 2,
      right: 2,
      top: 0
    },
  },
  series: [
    {
      name: "Eladott jegyek",
      data: selectedStatisticsEvent ? [] : [3650, 4120, 3890, 4540, 4720, 5260, 6220],
      color: brandColor,
    },
  ],
  noData: {
    text: selectedStatisticsEvent ? "Nincs rögzített napi jegyeladási adat" : "Nincs megjeleníthető adat"
  },
  xaxis: {
    categories: ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'],
    labels: {
      show: false,
    },
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
  },
  yaxis: {
    show: false,
  },
}

if (document.getElementById("JegyekDb") && typeof ApexCharts !== 'undefined') {
  const chart = new ApexCharts(document.getElementById("JegyekDb"), options);
  chart.render();
}

const visitorsChartElement = document.getElementById('SzemelyDb');
if (visitorsChartElement && typeof ApexCharts !== 'undefined') {
    const visitorsChart = new ApexCharts(visitorsChartElement, {
        chart: {
            type: 'area',
            height: 260,
            fontFamily: 'Inter, sans-serif',
            toolbar: { show: false },
            foreColor: '#aeb8b2'
        },
        series: [
            {
                name: 'Látogatók',
                data: selectedStatisticsEvent ? [] : [2840, 3120, 2980, 3710, 4260, 5080, 6760]
            }
        ],
        noData: {
            text: selectedStatisticsEvent
                ? 'Ehhez az eseményhez nincs napi látogatottsági adat'
                : 'Nincs megjeleníthető adat'
        },
        colors: ['#9b59b6'],
        stroke: { curve: 'smooth', width: 3 },
        fill: {
            type: 'gradient',
            gradient: { opacityFrom: 0.35, opacityTo: 0.02 }
        },
        dataLabels: { enabled: false },
        grid: { borderColor: '#343a37', strokeDashArray: 4 },
        xaxis: {
            categories: ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'],
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: { formatter: value => Math.round(value / 100) / 10 + 'k' }
        },
        tooltip: { theme: 'dark' }
    });
    visitorsChart.render();
}

const revenueChartElement = document.getElementById('OsszBevetel');
if (revenueChartElement && typeof ApexCharts !== 'undefined') {
    const revenueChart = new ApexCharts(revenueChartElement, {
        chart: {
            type: 'bar',
            height: 230,
            fontFamily: 'Inter, sans-serif',
            toolbar: { show: false },
            foreColor: '#aeb8b2'
        },
        series: [
            {
                name: 'Bevétel',
                data: selectedStatisticsEvent ? [] : [8, 8.5, 9, 9.4, 10, 10.5, 11, 11.4, 12, 12.4, 12.8, 13.64]
            }
        ],
        noData: {
            text: selectedStatisticsEvent
                ? 'Ehhez az eseményhez nincs havi bevételi bontás'
                : 'Nincs megjeleníthető adat'
        },
        colors: ['#19c987'],
        plotOptions: {
            bar: { borderRadius: 4, columnWidth: '52%' }
        },
        dataLabels: { enabled: false },
        grid: { borderColor: '#343a37', strokeDashArray: 4 },
        xaxis: {
            categories: ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'],
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: { formatter: value => `${value} M` }
        },
        tooltip: {
            theme: 'dark',
            y: { formatter: value => `${value.toLocaleString('hu-HU')} millió Ft` }
        }
    });
    revenueChart.render();
}

const dashboardChartElement = document.getElementById('area-chart');
if (dashboardChartElement && typeof ApexCharts !== 'undefined') {
    const dashboardChart = new ApexCharts(dashboardChartElement, {
        chart: {
            type: 'line',
            height: 130,
            toolbar: { show: false },
            sparkline: { enabled: true }
        },
        series: [
            { name: 'Jegyeladás', data: [12, 18, 15, 29, 22, 34, 27] },
            { name: 'Bevétel', data: [8, 14, 12, 18, 16, 24, 31] }
        ],
        colors: ['#19c987', '#9b59b6'],
        stroke: { curve: 'smooth', width: 3 },
        tooltip: { theme: 'dark', x: { show: false } },
        xaxis: {
            categories: ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'],
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: { show: false },
        grid: { show: false },
        legend: { show: false }
    });
    dashboardChart.render();
}

const eventSearchForm = document.getElementById('event-search-form');
if (eventSearchForm) {
    const eventCardsContainer = document.querySelector('.scrollmenu');
    const locationFilter = document.getElementById('filter-location');
    const typeFilter = document.getElementById('filter-type');

    const normalizeEventSearch = value => value
        .toLocaleLowerCase('hu')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const addFilterOption = (select, value, label) => {
        if (Array.from(select.options).some(option => option.value === value)) return;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
    };

    const renderSavedEventCard = event => {
        const card = document.createElement('article');
        const soldTickets = event.soldTickets || 0;
        const soldPercent = Math.min(100, Math.round(soldTickets / event.capacity * 100));
        const normalizedLocation = normalizeEventSearch(event.location);
        const hasTicketPrice = Number.isInteger(event.price) && event.price >= 0;
        const ticketPrice = hasTicketPrice
            ? `${event.price.toLocaleString('hu-HU')} Ft / jegy`
            : 'Jegyár nincs megadva';
        const name = document.createElement('h5');
        const location = document.createElement('h5');
        const date = document.createElement('h5');
        const details = document.createElement('p');
        const description = document.createElement('p');
        const salesProgress = document.createElement('div');
        const progressFill = document.createElement('span');
        const stadium = document.createElement('div');
        const legend = document.createElement('div');
        const actions = document.createElement('div');
        const statisticsLink = document.createElement('a');
        const pricingLink = document.createElement('a');

        card.className = 'scroll-card event-card bg-neutral-primary-soft block p-6 border border-default rounded-base shadow-xs hover:bg-neutral-secondary-medium';
        card.dataset.createdEventId = event.id;
        card.dataset.category = 'other';
        card.dataset.location = normalizedLocation;
        card.dataset.date = event.date;
        card.dataset.price = hasTicketPrice ? String(event.price) : '';
        card.dataset.search = normalizeEventSearch(
            `${event.name} ${event.location} ${event.description}`
        );

        name.className = 'mb-3 text-2xl font-semibold tracking-tight text-heading leading-8';
        name.textContent = event.name;
        location.className = 'mb-3 text-lg font-semibold tracking-tight text-heading leading-8';
        location.textContent = event.location;
        date.className = 'mb-3 text-base tracking-tight text-heading leading-8';
        date.textContent = `${new Intl.DateTimeFormat('hu-HU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(`${event.date}T12:00:00`))} · ${event.time}`;
        details.className = 'mb-2 text-sm text-body';
        details.textContent =
            `Jegyek: ${soldTickets.toLocaleString('hu-HU')} / ${event.capacity.toLocaleString('hu-HU')} · ${ticketPrice}`;
        description.className = 'event-created-description text-sm text-body';
        description.textContent = event.description;

        salesProgress.className = 'event-sales-progress';
        salesProgress.setAttribute('role', 'img');
        salesProgress.setAttribute('aria-label', `A jegyek ${soldPercent} százaléka elkelt`);
        progressFill.style.width = `${soldPercent}%`;
        salesProgress.appendChild(progressFill);

        stadium.className = 'event-stadium-preview';
        stadium.setAttribute('role', 'group');
        stadium.setAttribute('aria-label', 'Interaktív stadion ülésrend');
        legend.className = 'event-seat-legend';
        ['Aktív szektor', 'Prémium', 'Alsó szint', 'Felső szint', 'Foglalt', 'Kiválasztva']
            .forEach(label => {
                const item = document.createElement('span');
                item.textContent = label;
                legend.appendChild(item);
            });

        actions.className = 'event-card-actions';
        statisticsLink.className = 'event-card-action';
        statisticsLink.href = `Statisztika.html?eventId=${encodeURIComponent(event.id)}`;
        statisticsLink.textContent = 'Statisztika megnyitása';
        pricingLink.className = 'event-card-action event-card-action--secondary';
        pricingLink.href = 'Arazas.html';
        pricingLink.textContent = 'Árak & jegyek kezelése';
        actions.append(statisticsLink, pricingLink);

        card.append(name, location, date, details, description, salesProgress, stadium, legend, actions);
        eventCardsContainer.prepend(card);

        addFilterOption(locationFilter, normalizedLocation, event.location);
        addFilterOption(typeFilter, 'other', 'Egyéb esemény');
    };

    if (eventCardsContainer) {
        calendarEvents.forEach(renderSavedEventCard);
    }

    const eventCards = Array.from(document.querySelectorAll('.event-card'));
    eventCards.forEach(card => {
        const pricingLink = card.querySelector('.event-card-action--secondary');
        if (pricingLink) {
            if (card.dataset.createdEventId) {
                pricingLink.href =
                    `Arazas.html?eventId=${encodeURIComponent(card.dataset.createdEventId)}`;
            } else {
                const eventName = card.querySelector('h5')?.textContent.trim() || '';
                const params = new URLSearchParams({
                    name: eventName,
                    price: card.dataset.price || ''
                });
                pricingLink.href = `Arazas.html?${params.toString()}`;
            }
        }

        const legend = card.querySelector('.event-seat-legend');
        if (!legend || legend.querySelector('.event-seat-legend__price')) return;

        const price = Number(card.dataset.price);
        const priceLegend = document.createElement('span');
        priceLegend.className = 'event-seat-legend__price';
        priceLegend.textContent = card.dataset.price !== '' && Number.isFinite(price)
            ? `${price.toLocaleString('hu-HU')} Ft${card.dataset.createdEventId ? ' / jegy' : '-tól'}`
            : 'Jegyár nincs megadva';
        legend.appendChild(priceLegend);
    });

    const searchInput = document.getElementById('search');
    const dateFilter = document.getElementById('filter-date');
    const priceFilter = document.getElementById('filter-price');
    const clearFiltersButton = document.getElementById('clear-event-filters');
    const resultsMessage = document.getElementById('event-results');
    const emptyMessage = document.getElementById('event-empty');

    function filterDashboardEvents() {
        const query = normalizeEventSearch(searchInput.value);
        const selectedDays = dateFilter.value === 'all' ? null : Number(dateFilter.value);
        const selectedLocation = locationFilter.value;
        const selectedType = typeFilter.value;
        const selectedPrice = priceFilter.value;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastDate = selectedDays === null ? null : new Date(today);
        if (lastDate) lastDate.setDate(lastDate.getDate() + selectedDays);
        let visibleCount = 0;

        eventCards.forEach(card => {
            const eventDate = new Date(`${card.dataset.date}T00:00:00`);
            const price = Number(card.dataset.price);
            const matchesQuery = !query || normalizeEventSearch(
                `${card.dataset.search} ${card.textContent}`
            ).includes(query);
            const matchesLocation = selectedLocation === 'all' ||
                card.dataset.location === selectedLocation;
            const matchesType = selectedType === 'all' ||
                card.dataset.category === selectedType;
            const matchesDate = !lastDate || (eventDate >= today && eventDate <= lastDate);
            const hasPrice = card.dataset.price !== '' && Number.isFinite(price);
            const matchesPrice = selectedPrice === 'all' ||
                (hasPrice && selectedPrice === '5000' && price <= 5000) ||
                (hasPrice && selectedPrice === '10000' && price > 5000 && price <= 10000) ||
                (hasPrice && selectedPrice === '10001' && price > 10000);
            const visible = matchesQuery && matchesLocation && matchesType &&
                matchesDate && matchesPrice;

            card.hidden = !visible;
            if (visible) visibleCount += 1;
        });

        resultsMessage.textContent = `${visibleCount} esemény`;
        emptyMessage.classList.toggle('hidden', visibleCount !== 0);
    }

    eventSearchForm.addEventListener('submit', event => {
        event.preventDefault();
        filterDashboardEvents();
    });
    eventSearchForm.addEventListener('input', filterDashboardEvents);
    [dateFilter, locationFilter, typeFilter, priceFilter].forEach(filter => {
        filter.addEventListener('change', filterDashboardEvents);
    });
    clearFiltersButton.addEventListener('click', () => {
        searchInput.value = '';
        dateFilter.value = 'all';
        locationFilter.value = 'all';
        typeFilter.value = 'all';
        priceFilter.value = 'all';
        filterDashboardEvents();
    });
    filterDashboardEvents();
}

const seatMap = document.getElementById('seat-map');
const pricingEventContext = document.getElementById('pricing-event-context');
if (pricingEventContext) {
    const pricingEventParams = new URLSearchParams(window.location.search);
    const pricingEventId = pricingEventParams.get('eventId');
    const pricingEvent = pricingEventId
        ? calendarEvents.find(event => event.id === pricingEventId)
        : null;
    const eventNameElement = document.getElementById('pricing-event-name');
    const eventDetailsElement = document.getElementById('pricing-event-details');
    const normalPriceInput = document.getElementById('normal-price');

    if (pricingEventId && !pricingEvent) {
        pricingEventContext.classList.remove('hidden');
        pricingEventContext.textContent = 'A kiválasztott esemény nem található a mentett események között.';
    } else if (pricingEvent) {
        eventNameElement.textContent = pricingEvent.name;
        eventDetailsElement.textContent =
            `${pricingEvent.location} · ${Number.isInteger(pricingEvent.price)
                ? `${pricingEvent.price.toLocaleString('hu-HU')} Ft / jegy`
                : 'Jegyár nincs megadva'}`;
        if (normalPriceInput && Number.isInteger(pricingEvent.price)) {
            normalPriceInput.value = String(pricingEvent.price);
        }
        pricingEventContext.classList.remove('hidden');
    } else if (pricingEventParams.has('name')) {
        const eventName = pricingEventParams.get('name');
        const eventPrice = pricingEventParams.get('price');
        const parsedPrice = eventPrice === '' ? null : Number(eventPrice);
        eventNameElement.textContent = eventName || 'Kiválasztott esemény';
        eventDetailsElement.textContent =
            parsedPrice !== null && Number.isInteger(parsedPrice) && parsedPrice >= 0
                ? `Kártyán jelzett kezdő jegyár: ${parsedPrice.toLocaleString('hu-HU')} Ft`
                : 'Jegyár nincs megadva';
        if (normalPriceInput && parsedPrice !== null &&
            Number.isInteger(parsedPrice) && parsedPrice >= 0) {
            normalPriceInput.value = String(parsedPrice);
        }
        pricingEventContext.classList.remove('hidden');
    }
}

if (seatMap) {
    const reservedSeats = new Set(['A3', 'A12', 'B6', 'C2', 'C11', 'D7', 'D14']);
    const selectedSeats = new Set();
    const selectedSeatsLabel = document.getElementById('selected-seats');
    const seatCountLabel = document.getElementById('selected-seat-count');

    for (let row = 0; row < 4; row += 1) {
        const rowLetter = String.fromCharCode(65 + row);
        for (let seatNumber = 1; seatNumber <= 15; seatNumber += 1) {
            const seatId = `${rowLetter}${seatNumber}`;
            const seat = document.createElement('button');
            seat.type = 'button';
            seat.className = 'seat-map__seat';
            seat.textContent = seatNumber;
            seat.setAttribute('aria-label', `Sor ${rowLetter}, ${seatNumber}. szék`);

            if (reservedSeats.has(seatId)) {
                seat.disabled = true;
                seat.classList.add('seat-map__seat--reserved');
                seat.setAttribute('aria-label', `Sor ${rowLetter}, ${seatNumber}. szék, foglalt`);
            } else {
                seat.setAttribute('aria-pressed', 'false');
                seat.addEventListener('click', () => {
                    const isSelected = selectedSeats.has(seatId);
                    if (isSelected) {
                        selectedSeats.delete(seatId);
                        seat.classList.remove('seat-map__seat--selected');
                    } else {
                        selectedSeats.add(seatId);
                        seat.classList.add('seat-map__seat--selected');
                    }
                    seat.setAttribute('aria-pressed', String(!isSelected));
                    selectedSeatsLabel.textContent = selectedSeats.size
                        ? Array.from(selectedSeats).join(', ')
                        : 'Nincs kiválasztott szék';
                    seatCountLabel.textContent = String(selectedSeats.size);
                });
            }
            seatMap.appendChild(seat);
        }
    }

    const totalSeats = seatMap.querySelectorAll('.seat-map__seat').length;
    const reservedSeatCount = seatMap.querySelectorAll('.seat-map__seat--reserved').length;
    const seatCapacityLabel = document.getElementById('seat-capacity');
    if (seatCapacityLabel) {
        const availableSeats = totalSeats - reservedSeatCount;
        seatCapacityLabel.textContent =
            `Összesen ${totalSeats} ülőhely · ${reservedSeatCount} foglalt · ${availableSeats} szabad`;
    }
}

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

const naptar = new Naptar(CALENDAR_STORAGE_KEY);
if (naptar.getHiba() && calendarEventStatus) {
    calendarEventStatus.textContent =
        'A mentett események nem tölthetők be. Ellenőrizd a böngésző tárhelyét.';
}

function showCalendarSaveError() {
    if (calendarEventStatus) {
        calendarEventStatus.textContent =
            'Az esemény mentése nem sikerült. Ellenőrizd a böngésző tárhelyét.';
    }
}

const statisticsChartElement = document.getElementById('OsszBevetel');
const statisticsEventId = statisticsChartElement
    ? new URLSearchParams(window.location.search).get('eventId')
    : null;
const selectedStatisticsEvent = statisticsEventId
    ? naptar.keres(statisticsEventId)
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
        .find(heading => heading.textContent.replace(/\s+/g, ' ').trim() === 'Esemény leírás:');
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
        const breakdown = ticketTypesHeading.parentElement.querySelector('.statistics-ticket-breakdown');
        if (breakdown) {
            // A kártya sorrendje: EB, Normal, VIP, Prémium. Csak a ténylegesen rögzített eladások látszanak.
            const types = ['earlyBird', 'normal', 'vip', 'premium'];
            const soldByType = event.soldByType || {};
            Array.from(breakdown.querySelectorAll('p')).forEach((item, index) => {
                const count = soldByType[types[index]] || 0;
                const share = soldTickets > 0 ? Math.round(count / soldTickets * 1000) / 10 : 0;
                const detail = item.querySelector('span');
                if (detail) detail.textContent = `${formatNumber(count)} db · ${share.toLocaleString('hu-HU')}%`;
            });
        }
    }
}
if (statisticsEventId && selectedStatisticsEvent) {
    showSelectedEventStatistics(selectedStatisticsEvent);
} else if (statisticsEventId) {
    console.warn(`A kért naptáresemény nem található: ${statisticsEventId}`);
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
    const nextEvent = naptar.osszes()
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
            const dayEvents = naptar.napEsemenyei(d.getFullYear(), d.getMonth() + 1, d.getDate());
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

                const editButton = document.createElement('button');
                editButton.type = 'button';
                editButton.className = 'calendar-event-edit-select';
                editButton.textContent = '✎';
                editButton.setAttribute('aria-label', `Szerkesztés: ${event.name}`);
                editButton.title = `Szerkesztés: ${event.name}`;
                editButton.addEventListener('click', () => startEditingEvent(event.id));
                eventRow.appendChild(editButton);

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

    // Meglévő esemény szerkesztése: ugyanaz az oldalsó űrlap nyílik meg, kitöltve az esemény adataival.
    const eventFormTitle = document.getElementById('event-form-title');
    const eventFormSubmit = eventForm ? eventForm.querySelector('button[type="submit"]') : null;
    const openDrawerButton = document.querySelector('[data-drawer-show="drawer-navigation"]');
    const capacityField = document.getElementById('event-capacity');
    const priceField = document.getElementById('event-price');
    let editingEventId = null;
    let openingForEdit = false;

    function leaveEditMode(resetForm) {
        editingEventId = null;
        if (eventFormTitle) eventFormTitle.textContent = 'Esemény Kezelés';
        if (eventFormSubmit) eventFormSubmit.textContent = 'Mentés';
        if (capacityField) capacityField.min = '1';
        if (priceField) priceField.required = true;
        if (resetForm && eventForm) eventForm.reset();
    }

    function startEditingEvent(eventId) {
        const eventToEdit = naptar.keres(eventId);
        if (!eventToEdit || !eventForm) return;

        eventForm.reset();
        editingEventId = eventToEdit.id;
        document.getElementById('event-name').value = eventToEdit.name;
        document.getElementById('event-location').value = eventToEdit.location;
        document.getElementById('event-description').value = eventToEdit.description;
        document.getElementById('event-date').value = eventToEdit.date;
        document.getElementById('event-time').value = eventToEdit.time;
        if (capacityField) {
            capacityField.value = String(eventToEdit.capacity);
            capacityField.min = String(Math.max(1, eventToEdit.soldTickets || 0));
        }
        if (priceField) {
            priceField.value = eventToEdit.price === undefined ? '' : String(eventToEdit.price);
            priceField.required = eventToEdit.price !== undefined;
        }
        if (eventFormTitle) eventFormTitle.textContent = 'Esemény szerkesztése';
        if (eventFormSubmit) eventFormSubmit.textContent = 'Módosítás';
        if (calendarEventStatus) {
            calendarEventStatus.textContent = `Szerkesztés alatt: ${eventToEdit.name}.`;
        }

        if (openDrawerButton) {
            openingForEdit = true;
            openDrawerButton.click();
            openingForEdit = false;
        }
    }

    if (openDrawerButton) {
        openDrawerButton.addEventListener('click', () => {
            if (!openingForEdit) leaveEditMode(true);
        });
    }

    if (deleteEventButton) {
        deleteEventButton.addEventListener('click', () => {
            const eventToDelete = naptar.keres(selectedCalendarEventId);
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
            const priceText = priceInput.value.trim();
            const price = Number(priceText);
            const editedEvent = editingEventId
                ? naptar.keres(editingEventId)
                : null;
            const priceMayBeEmpty = Boolean(editedEvent) && editedEvent.price === undefined;
            const priceIsValid = priceText === ''
                ? priceMayBeEmpty
                : Number.isInteger(price) && price >= 0;

            if (!name || !location || !description || !Number.isInteger(capacity) || capacity < 1 ||
                !priceIsValid) {
                if (calendarEventStatus) {
                    calendarEventStatus.textContent =
                        'Töltsd ki az összes mezőt, és adj meg pozitív létszámot, valamint 0 vagy nagyobb egész jegyárat.';
                }
                return;
            }
            if (editedEvent && capacity < (editedEvent.soldTickets || 0)) {
                if (calendarEventStatus) {
                    calendarEventStatus.textContent =
                        `A létszám nem lehet kevesebb az eladott jegyeknél (${editedEvent.soldTickets} db).`;
                }
                return;
            }

            const eventData = {
                name,
                location,
                capacity,
                ...(priceText === '' ? {} : { price }),
                description,
                date: dateInput.value,
                time: timeInput.value
            };
            const newEvent = editedEvent
                ? naptar.modosit(editedEvent.id, eventData)
                : naptar.hozzaad({ ...eventData, soldTickets: 0, revenue: 0 });
            if (!newEvent) {
                showCalendarSaveError();
                return;
            }

            view = new Date(`${newEvent.date}T12:00:00`);
            view.setDate(1);
            selectedCalendarEventId = null;
            if (deleteEventButton) deleteEventButton.disabled = true;
            if (calendarEventStatus) {
                calendarEventStatus.textContent = editedEvent
                    ? `${newEvent.name} esemény módosítva.`
                    : `${newEvent.name} esemény elmentve.`;
            }
            leaveEditMode(true);
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
            const eventToDelete = naptar.keres(selectedCalendarEventId);
            if (!eventToDelete) {
                if (calendarEventStatus) {
                    calendarEventStatus.textContent = 'Előbb válassz ki egy törlendő eseményt.';
                }
                return;
            }

            if (!naptar.torol(selectedCalendarEventId)) {
                showCalendarSaveError();
                return;
            }

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
    naptar.betolt();
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
        stadium.dataset.seatCapacity = String(event.capacity);
        stadium.dataset.eventKey = `event:${event.id}`;
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
        naptar.osszes().forEach(renderSavedEventCard);
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
        ? naptar.keres(pricingEventId)
        : null;
    const eventNameElement = document.getElementById('pricing-event-name');
    const eventDetailsElement = document.getElementById('pricing-event-details');
    const normalPriceInput = document.getElementById('normal-price');
    const pricingStadium = document.getElementById('pricing-stadium');

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
        if (pricingStadium) {
            pricingStadium.dataset.eventKey = `event:${pricingEvent.id}`;
            pricingStadium.dataset.seatCapacity = String(pricingEvent.capacity);
        }
        pricingEventContext.classList.remove('hidden');
    } else if (pricingEventParams.has('name')) {
        const eventName = pricingEventParams.get('name');
        const eventPrice = pricingEventParams.get('price');
        const parsedPrice = eventPrice === '' ? null : Number(eventPrice);
        if (pricingStadium && eventName) pricingStadium.dataset.eventKey = `name:${eventName.trim()}`;
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

// Jegyvásárlás szimulálása az Árazás oldalon: a +/- gombokkal jegyeket gyűjtünk kategóriánként,
// a "Jegyek rögzítése" gomb pedig hozzáadja őket az esemény eladásaihoz és bevételéhez.
// Az árakat és a jegyszámokat az Arazas osztály, az eseményeket a Naptar osztály kezeli.
const PRICE_INPUT_IDS = {
    normal: 'normal-price',
    premium: 'premium-price',
    vip: 'vip-price',
    earlyBird: 'early-bird-price'
};
const readPriceInputs = () => {
    const prices = {};
    Object.entries(PRICE_INPUT_IDS).forEach(([key, id]) => {
        prices[key] = document.getElementById(id).value;
    });
    return prices;
};
const formatFt = value => `${value.toLocaleString('hu-HU')} Ft`;

const ticketRows = document.querySelectorAll('[data-ticket-row]');
if (ticketRows.length) {
    const PENDING_KEY = 'jegykezelo-kivalasztott-szekek';
    const BOOKED_KEY = 'jegykezelo-foglalt-szekek';
    const STATIC_SALES_KEY = 'jegykezelo-beepitett-eladasok';
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    const hasEvent = Boolean(eventId && naptar.keres(eventId));
    const stadiumElement = document.getElementById('pricing-stadium');
    const stadiumKey = (stadiumElement && stadiumElement.dataset.eventKey) || 'general';
    const summary = document.getElementById('ticket-summary');
    const commitButton = document.getElementById('ticket-commit');
    const statusLine = document.getElementById('ticket-status');
    const seatOrder = document.getElementById('seat-order');
    const seatList = document.getElementById('seat-order-list');
    const readJson = key => {
        try {
            return JSON.parse(localStorage.getItem(key)) || {};
        } catch (error) {
            return {};
        }
    };

    // A főoldalon kiválasztott, még le nem foglalt székek.
    const bookedStore = readJson(BOOKED_KEY);
    const alreadyBooked = new Set(Array.isArray(bookedStore[stadiumKey]) ? bookedStore[stadiumKey] : []);
    const pending = readJson(PENDING_KEY);
    let seats = pending.key === stadiumKey && Array.isArray(pending.seats)
        ? pending.seats.filter(seat => !alreadyBooked.has(seat.key))
        : [];
    const assigned = new Map(); // székkulcs -> jegytípus
    const confirmed = []; // az ebben a munkamenetben lefoglalt székek

    const pricing = new Arazas(undefined, { earlyBird: 0, vip: 0, normal: 0, premium: 0 });
    pricing.arakFrissit(readPriceInputs());
    const freeTickets = () => (hasEvent ? naptar.szabadHelyek(eventId) : Infinity);
    const seatName = seat => `${seat.section} · ${seat.row} sor · ${seat.number}. szék`;
    const nextSeatFor = type => seats.find(seat =>
        !assigned.has(seat.key) && Arazas.engedettTipusok(seat.category).includes(type));

    const render = () => {
        const seatMode = seats.length > 0;
        const tickets = pricing.getJegyek();
        const count = pricing.jegyDarab();
        seatOrder.hidden = !seatMode && confirmed.length === 0;
        seatList.replaceChildren();
        seats.forEach(seat => {
            const row = document.createElement('div');
            row.className = 'seat-order__row';
            const name = document.createElement('span');
            name.textContent = seatName(seat);
            const type = document.createElement('span');
            type.className = 'seat-order__type';
            type.textContent = assigned.has(seat.key)
                ? `${Arazas.NEVEK[assigned.get(seat.key)]} · ${formatFt(pricing.ar(assigned.get(seat.key)))}`
                : 'Válassz jegytípust lent';
            row.append(name, type);
            seatList.appendChild(row);
        });
        confirmed.forEach(item => {
            const row = document.createElement('div');
            row.className = 'seat-order__row seat-order__row--booked';
            const name = document.createElement('span');
            name.textContent = item.name;
            const type = document.createElement('strong');
            type.textContent = `Lefoglalva ✓ · ${Arazas.NEVEK[item.type]} · ${formatFt(item.price)}`;
            row.append(name, type);
            seatList.appendChild(row);
        });

        ticketRows.forEach(row => {
            const key = row.dataset.ticketRow;
            row.querySelector('[data-ticket-count]').textContent = String(tickets[key]);
            const minus = row.querySelector('[data-ticket-step="-1"]');
            const plus = row.querySelector('[data-ticket-step="1"]');
            minus.disabled = tickets[key] === 0;
            plus.disabled = seatMode ? !nextSeatFor(key) : false;
        });

        if (seatMode) {
            summary.textContent = `${seats.length} szék kiválasztva · ${count} jegytípus megadva · ${formatFt(pricing.jegyOsszeg())}`;
            commitButton.textContent = 'Székek lefoglalása';
        } else {
            summary.textContent = hasEvent
                ? `Összesen ${count} jegy · ${formatFt(pricing.jegyOsszeg())} · még ${freeTickets() - count} szabad hely`
                : 'Jegyek rögzítéséhez válassz egy mentett eseményt a főoldalon.';
            commitButton.textContent = 'Jegyek rögzítése';
        }
        commitButton.disabled = count === 0 || (!seatMode && !hasEvent);
    };

    Object.values(PRICE_INPUT_IDS).forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            pricing.arakFrissit(readPriceInputs());
            render();
        });
    });

    ticketRows.forEach(row => {
        row.querySelectorAll('[data-ticket-step]').forEach(button => {
            button.addEventListener('click', () => {
                const key = row.dataset.ticketRow;
                const step = Number(button.dataset.ticketStep);
                statusLine.textContent = '';
                if (seats.length) {
                    if (step > 0) {
                        const seat = nextSeatFor(key);
                        if (!seat || freeTickets() - pricing.jegyDarab() < 1) {
                            statusLine.textContent = 'Nincs több szabad hely az eseményen.';
                            return;
                        }
                        assigned.set(seat.key, key);
                    } else {
                        const last = [...seats].reverse().find(seat => assigned.get(seat.key) === key);
                        if (last) assigned.delete(last.key);
                    }
                    pricing.jegyLeptet(key, step);
                } else if (!pricing.jegyLeptet(key, step, freeTickets() - pricing.jegyDarab())) {
                    statusLine.textContent = 'Nincs több szabad hely az eseményen.';
                }
                render();
            });
        });
    });

    document.getElementById('seat-order-clear').addEventListener('click', () => {
        try {
            localStorage.removeItem(PENDING_KEY);
        } catch (error) {
            // A kiválasztás elvetése mentés nélkül is működik.
        }
        seats = [];
        assigned.clear();
        confirmed.length = 0;
        pricing.jegyekNullaz();
        statusLine.textContent = '';
        render();
    });

    commitButton.addEventListener('click', () => {
        const count = pricing.jegyDarab();
        const amount = pricing.jegyOsszeg();
        if (count === 0) return;
        const tickets = pricing.getJegyek();
        const parts = Arazas.KATEGORIAK.filter(key => tickets[key] > 0)
            .map(key => `${tickets[key]} × ${Arazas.NEVEK[key]}`);

        if (seats.length) {
            if (hasEvent && !naptar.elad(eventId, count, amount, pricing.getJegyek())) {
                statusLine.textContent = 'A foglalás nem sikerült: nincs elég szabad hely, vagy a mentés hibás.';
                return;
            }
            const bookedKeys = seats.filter(seat => assigned.has(seat.key)).map(seat => seat.key);
            const rest = seats.filter(seat => !assigned.has(seat.key));
            bookedStore[stadiumKey] = [...alreadyBooked, ...bookedKeys];
            try {
                localStorage.setItem(BOOKED_KEY, JSON.stringify(bookedStore));
                if (rest.length) {
                    localStorage.setItem(PENDING_KEY, JSON.stringify({ key: stadiumKey, seats: rest }));
                } else {
                    localStorage.removeItem(PENDING_KEY);
                }
            } catch (error) {
                statusLine.textContent = 'A foglalás mentése nem sikerült. Ellenőrizd a böngésző tárhelyét.';
                return;
            }
            seats.filter(seat => assigned.has(seat.key)).forEach(seat => {
                const type = assigned.get(seat.key);
                confirmed.push({ name: seatName(seat), type, price: pricing.ar(type) });
            });
            if (!hasEvent) {
                const staticSales = readJson(STATIC_SALES_KEY);
                const previous = staticSales[stadiumKey] || { darab: 0, bevetel: 0 };
                staticSales[stadiumKey] = { darab: previous.darab + count, bevetel: previous.bevetel + amount };
                try {
                    localStorage.setItem(STATIC_SALES_KEY, JSON.stringify(staticSales));
                } catch (error) {
                    statusLine.textContent = 'A foglalás mentése nem sikerült. Ellenőrizd a böngésző tárhelyét.';
                }
            }
            bookedKeys.forEach(key => alreadyBooked.add(key));
            seats = rest;
            assigned.clear();
        } else if (!naptar.elad(eventId, count, amount, pricing.getJegyek())) {
            statusLine.textContent = 'A rögzítés nem sikerült: nincs elég szabad hely, vagy a mentés hibás.';
            return;
        }
        pricing.jegyekNullaz();
        render();
        statusLine.textContent = `Rögzítve: ${parts.join(', ')} · ${formatFt(amount)}`;
        statusLine.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    render();
}

// Főoldali összegzés: a beépített események alapértékéhez hozzáadjuk az összes mentett esemény
// eladásait és a beépített eseményekre foglalt székeket. Minden betöltéskor újraszámolódik.
const summaryRevenue = document.getElementById('summary-revenue');
const summaryTickets = document.getElementById('summary-tickets');
const summaryTicketsShort = document.getElementById('summary-tickets-short');
if (summaryRevenue && summaryTickets) {
    const updateDashboardSummary = () => {
        naptar.betolt();
        let revenue = Number(summaryRevenue.dataset.base) || 0;
        let tickets = Number(summaryTickets.dataset.base) || 0;
        naptar.osszes().forEach(event => {
            revenue += event.revenue || 0;
            tickets += event.soldTickets || 0;
        });
        try {
            Object.values(JSON.parse(localStorage.getItem('jegykezelo-beepitett-eladasok')) || {})
                .forEach(sale => {
                    revenue += Number(sale.bevetel) || 0;
                    tickets += Number(sale.darab) || 0;
                });
        } catch (error) {
            // Hibás tárolt adat esetén az alapértékek maradnak.
        }
        summaryRevenue.textContent = `${revenue.toLocaleString('hu-HU')} Ft`;
        summaryTickets.textContent = `${tickets.toLocaleString('hu-HU')} db`;
        if (summaryTicketsShort) {
            summaryTicketsShort.textContent = tickets >= 1000
                ? `${(tickets / 1000).toLocaleString('hu-HU', { maximumFractionDigits: 1 })}k`
                : String(tickets);
        }
    };
    updateDashboardSummary();
    window.addEventListener('pageshow', event => {
        if (event.persisted) updateDashboardSummary();
    });
    window.addEventListener('storage', updateDashboardSummary);
}

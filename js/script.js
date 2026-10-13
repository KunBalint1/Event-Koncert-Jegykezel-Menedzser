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

const weekdaysElement = document.getElementById('weekdays');
const monthTitleElement = document.getElementById('month-title');
const calendarGridElement = document.getElementById('calendar-grid');
const previousMonthButton = document.getElementById('prev-month');
const nextMonthButton = document.getElementById('next-month');

if (weekdaysElement && monthTitleElement && calendarGridElement &&
    previousMonthButton && nextMonthButton) {
    let view = new Date();
    view.setDate(1);

    weekdaysElement.innerHTML = WEEKDAYS
        .map(d => `<div>${d}</div>`).join('');

    function render() {
        const y = view.getFullYear();
        const m = view.getMonth();
        monthTitleElement.textContent = `${y}. ${MONTHS[m]}`;

        const offset = (new Date(y, m, 1).getDay() + 6) % 7; // hétfő = 0
        const todayKey = toKey(new Date());
        let html = '';

        for (let i = 0; i < 42; i++) {
            const d = new Date(y, m, 1 - offset + i);
            const key = toKey(d);
            const inMonth = d.getMonth() === m;
            const isToday = key === todayKey;

            html += `<div data-date="${key}" class="rounded-base p-2 text-sm overflow-hidden
                ${inMonth ? 'bg-neutral-secondary-medium text-heading' : 'bg-neutral-primary-soft text-body opacity-50'}
                ${isToday ? 'ring-2 ring-brand font-bold' : ''}">${d.getDate()}</div>`;
        }
        calendarGridElement.innerHTML = html;
    }

    previousMonthButton.addEventListener('click', () => {
        view.setMonth(view.getMonth() - 1); render();
    });
    nextMonthButton.addEventListener('click', () => {
        view.setMonth(view.getMonth() + 1); render();
    });

    render();
}


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
      name: "New users",
      data: [6500, 6418, 6456, 6526, 6356, 6456],
      color: brandColor,
    },
  ],
  xaxis: {
    categories: ['01 February', '02 February', '03 February', '04 February', '05 February', '06 February'],
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

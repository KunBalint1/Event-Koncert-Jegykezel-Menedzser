/*
 * AI (Claude) által készítve: a naptár megjelenítése és működése
 * (hónapok és napnevek, hétfői hétkezdés, 42 cellás rács, mai nap kiemelése,
 * hónapváltás az előző/következő gombokkal).
 */

const MONTHS = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június',
    'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
const WEEKDAYS = ['Hé', 'Ke', 'Sze', 'Csü', 'Pé', 'Szo', 'Va'];

let view = new Date();
view.setDate(1);

const pad = n => String(n).padStart(2, '0');
const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

document.getElementById('weekdays').innerHTML = WEEKDAYS
    .map(d => `<div>${d}</div>`).join('');

function render() {
    const y = view.getFullYear();
    const m = view.getMonth();
    document.getElementById('month-title').textContent = `${y}. ${MONTHS[m]}`;

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
    document.getElementById('calendar-grid').innerHTML = html;
}

document.getElementById('prev-month').addEventListener('click', () => {
    view.setMonth(view.getMonth() - 1); render();
});
document.getElementById('next-month').addEventListener('click', () => {
    view.setMonth(view.getMonth() + 1); render();
});

render();


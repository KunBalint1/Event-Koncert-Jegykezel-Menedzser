// Az események tárolója: a naptár, a főoldal, a statisztika és az árazás oldal is ezt használja.
// Az események a böngésző localStorage-ában maradnak meg. Minden módosító metódus azonnal ment,
// és ha a mentés nem sikerül, visszaállítja az előző állapotot, majd false (vagy null) értéket ad.
class Naptar {
    #esemenyek;
    #tarolokulcs;
    #hiba;

    constructor(tarolokulcs = 'jegykezelo-esemenyek') {
        this.#tarolokulcs = tarolokulcs;
        this.#esemenyek = [];
        this.#hiba = null;
        this.betolt();
    }

    static ervenyes(esemeny) {
        return Boolean(esemeny) && typeof esemeny.id === 'string' &&
            typeof esemeny.name === 'string' && typeof esemeny.location === 'string' &&
            typeof esemeny.description === 'string' && typeof esemeny.date === 'string' &&
            typeof esemeny.time === 'string' && Number.isInteger(esemeny.capacity) &&
            esemeny.capacity > 0 && /^\d{4}-\d{2}-\d{2}$/.test(esemeny.date) &&
            /^\d{2}:\d{2}$/.test(esemeny.time) &&
            (esemeny.soldTickets === undefined ||
                (Number.isInteger(esemeny.soldTickets) && esemeny.soldTickets >= 0)) &&
            (esemeny.price === undefined ||
                (Number.isInteger(esemeny.price) && esemeny.price >= 0)) &&
            (esemeny.revenue === undefined ||
                (Number.isFinite(esemeny.revenue) && esemeny.revenue >= 0)) &&
            (esemeny.soldByType === undefined ||
                (esemeny.soldByType !== null && typeof esemeny.soldByType === 'object' &&
                    Object.values(esemeny.soldByType).every(db => Number.isInteger(db) && db >= 0))) &&
            !Number.isNaN(new Date(`${esemeny.date}T${esemeny.time}`).getTime());
    }

    static ujId() {
        return window.crypto && window.crypto.randomUUID
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    // A betöltés hibája (ha volt), különben null.
    getHiba() {
        return this.#hiba;
    }

    betolt() {
        this.#hiba = null;
        try {
            const mentett = localStorage.getItem(this.#tarolokulcs);
            if (mentett === null) {
                this.#esemenyek = [];
                return true;
            }
            const adatok = JSON.parse(mentett);
            if (!Array.isArray(adatok) || !adatok.every(Naptar.ervenyes)) {
                throw new Error('A mentett eseményadatok formátuma érvénytelen.');
            }
            this.#esemenyek = adatok;
            return true;
        } catch (hiba) {
            console.error('Nem sikerült betölteni a naptáreseményeket.', hiba);
            this.#hiba = hiba;
            this.#esemenyek = [];
            return false;
        }
    }

    ment() {
        try {
            localStorage.setItem(this.#tarolokulcs, JSON.stringify(this.#esemenyek));
            return true;
        } catch (hiba) {
            console.error('Nem sikerült elmenteni a naptáreseményeket.', hiba);
            return false;
        }
    }

    #csere(ujLista) {
        const regi = this.#esemenyek;
        this.#esemenyek = ujLista;
        if (this.ment()) return true;
        this.#esemenyek = regi;
        return false;
    }

    osszes() {
        return this.#esemenyek.map(esemeny => ({ ...esemeny }));
    }

    keres(id) {
        const esemeny = this.#esemenyek.find(elem => elem.id === id);
        return esemeny ? { ...esemeny } : null;
    }

    hozzaad(esemeny) {
        const ujEsemeny = { ...esemeny, id: esemeny.id || Naptar.ujId() };
        return this.#csere([...this.#esemenyek, ujEsemeny]) ? { ...ujEsemeny } : null;
    }

    modosit(id, valtozas) {
        const regi = this.#esemenyek.find(elem => elem.id === id);
        if (!regi) return null;
        const uj = { ...regi, ...valtozas, id };
        const lista = this.#esemenyek.map(elem => (elem.id === id ? uj : elem));
        return this.#csere(lista) ? { ...uj } : null;
    }

    torol(id) {
        const index = this.#esemenyek.findIndex(esemeny => esemeny.id === id);
        if (index === -1) {
            return false;
        }
        return this.#csere(this.#esemenyek.filter(esemeny => esemeny.id !== id));
    }

    // -- AI -- / 20% / -- Bálint --  //
    napEsemenyei(ev, honap, nap) {
        const keresettDatum = `${ev}-${String(honap).padStart(2, '0')}-${String(nap).padStart(2, '0')}`;
        return this.#esemenyek.filter(es => es.date === keresettDatum).map(es => ({ ...es }));
    }

    szabadHelyek(id) {
        const esemeny = this.#esemenyek.find(elem => elem.id === id);
        return esemeny ? Math.max(0, esemeny.capacity - (esemeny.soldTickets || 0)) : null;
    }

    // Jegyeladás rögzítése: növeli az eladott jegyek számát és a bevételt.
    // A tipusDarab (pl. { vip: 2, normal: 1 }) jegytípusonként is megőrzi az eladásokat.
    elad(id, darab, bevetel, tipusDarab = null) {
        const esemeny = this.#esemenyek.find(elem => elem.id === id);
        if (!esemeny || !Number.isInteger(darab) || darab < 1 || darab > this.szabadHelyek(id)) return null;
        const valtozas = {
            soldTickets: (esemeny.soldTickets || 0) + darab,
            revenue: (esemeny.revenue || 0) + bevetel
        };
        if (tipusDarab) {
            const tipusok = { ...(esemeny.soldByType || {}) };
            Object.entries(tipusDarab).forEach(([tipus, db]) => {
                if (db > 0) tipusok[tipus] = (tipusok[tipus] || 0) + db;
            });
            valtozas.soldByType = tipusok;
        }
        return this.modosit(id, valtozas);
    }
}

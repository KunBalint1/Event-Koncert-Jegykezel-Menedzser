class Arazas {
    #arak;
    #jegyek;
    #kovetkezoId;

    constructor(
        arak = {
            earlyBird: 0,
            vip: 0,
            normal: 0,
            premium: 0
        },
        jegyek = {
            earlyBird: 1,
            vip: 1,
            normal: 1,
            premium: 1
        },
        kovetkezoId = 1
    ) {
        this.setArak(arak);
        this.setJegyek(jegyek);
        this.setKovetkezoId(kovetkezoId);
    }
    getArak(){
        return this.#arak;
    }

    getJegyek(){
        return this.#jegyek;
    }

    getKovetkezoId(){
        return this.#kovetkezoId;
    }

    setArak(arak){
        this.#arak = arak;
    }

    setJegyek(jegyek){
        this.#jegyek = jegyek;
    }

    setKovetkezoId(kovetkezoId){
        this.#kovetkezoId = kovetkezoId;
    }

    // --- árak és jegyszámok kezelése (az Árazás oldal használja) ---
    static KATEGORIAK = ['normal', 'premium', 'vip', 'earlyBird'];
    static NEVEK = { normal: 'Normal', premium: 'Premium', vip: 'VIP', earlyBird: 'Early Bird' };

    // Egy szék kategóriájához választható jegytípusok (a VIP szék csak VIP jegy lehet).
    static engedettTipusok(szekKategoria) {
        const tipusok = {
            normal: ['normal', 'earlyBird'],
            premium: ['premium'],
            vip: ['vip'],
            earlybird: ['earlyBird']
        };
        return tipusok[String(szekKategoria).toLowerCase()] || ['normal'];
    }

    arakFrissit(ertekek) {
        const arak = {};
        Arazas.KATEGORIAK.forEach(kategoria => {
            const ertek = Number(ertekek[kategoria]);
            arak[kategoria] = Number.isFinite(ertek) && ertek >= 0 ? ertek : 0;
        });
        this.setArak(arak);
    }

    ar(kategoria) {
        return this.#arak[kategoria] || 0;
    }

    // A jegyszám lépésenként változik, nem mehet nulla alá, és legfeljebb `hely` darabbal nőhet.
    jegyLeptet(kategoria, lepes, hely = Infinity) {
        if (!(kategoria in this.#jegyek)) return false;
        if (lepes > 0 && hely < lepes) return false;
        this.#jegyek = { ...this.#jegyek, [kategoria]: Math.max(0, this.#jegyek[kategoria] + lepes) };
        return true;
    }

    jegyekNullaz() {
        const nullak = {};
        Object.keys(this.#jegyek).forEach(kategoria => { nullak[kategoria] = 0; });
        this.#jegyek = nullak;
    }

    jegyDarab() {
        return Object.values(this.#jegyek).reduce((osszeg, darab) => osszeg + darab, 0);
    }

    jegyOsszeg() {
        return Object.keys(this.#jegyek)
            .reduce((osszeg, kategoria) => osszeg + this.#jegyek[kategoria] * this.ar(kategoria), 0);
    }
}

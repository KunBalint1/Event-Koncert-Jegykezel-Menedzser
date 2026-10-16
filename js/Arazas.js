class Arazas{
    #arak;
    #jegyek;
    #kovetkezoId;

     constructor(arak, jegyek, kovetkezoId) {
        this.setArak(arak) = {
            earlyBird: 0,
            vip: 0,
            normal: 0,
            premium: 0
        };

        this.setJegyek(jegyek) = {
            earlyBird: 1,
            vip: 1,
            normal: 1,
            premium: 1
        };

        this.#kovetkezoId(kovetkezoId) = 1;
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



}
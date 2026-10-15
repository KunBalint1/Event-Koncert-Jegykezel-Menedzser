class Naptar{
    #esemenyek
    #kovetkezoId

    constructor (){
        this.#esemenyek = []
        this.#kovetkezoId = 1
    }

    hozzaad(esemeny){
        var ujEsemeny = {
            ...esemeny,
            id: this.#kovetkezoId
        }
        
        this.#esemenyek.push(ujEsemeny)
        this.#kovetkezoId++

        return ujEsemeny
    }

    torol(id){
        var index = this.#esemenyek.findIndex(esemeny => esemeny.id === id);

        if (index === -1){
            return false
        } else {
            this.#esemenyek.splice(index, 1)
            return true
        }
    }
    
    // -- AI -- / 20% / -- Bálint --  //
    napEsemenyei(ev, honap, nap){
        var keresettDatum = `${ev}-${String(honap).padStart(2, '0')}-${String(nap).padStart(2, '0')}`;
        return this.#esemenyek.filter(es => es.datum === keresettDatum)
    }


}
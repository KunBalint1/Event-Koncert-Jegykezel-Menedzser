class Naptar{
    #hely
    #ev
    #honap
    #nap
    #ido

    constructor(hely, ev, honap, nap, ido){
        this.setHely(hely)
        this.setEv(ev)
        this.setHonap(honap)
        this.setNap(nap)
        this.setIdo(ido)
    }

    setHely(hely){
        this.#hely = hely
    }

    setEv(ev){
        this.#ev = ev
    }

    setHonap(honap){
        this.#honap = honap
    }

    setNap(nap){
        this.#nap = nap
    }

    setIdo(ido){
        this.#ido = ido
    }
}
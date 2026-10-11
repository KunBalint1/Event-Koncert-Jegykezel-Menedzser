class Naptar{
    #hely
    #ev
    #honap
    #nap

    constructor(hely, ev, honap, nap){
        this.setHely(hely)
        this.setEv(ev)
        this.setHonap(honap)
        this.setNap(nap)
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

    getHely(){
        return this.#hely
    }

    getEv(){
        return this.#ev
    }

    getHonap(){
        return this.#honap
    }

    getNap(){
        return this.#nap
    }


}
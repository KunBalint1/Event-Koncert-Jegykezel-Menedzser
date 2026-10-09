class Arak {
    #vip
    #eb
    #premium
    #normal

    constructor(vip,eb,premium,normal){
        this.setVip(vip)
        this.setEb(eb)
        this.setPremium(premium)
        this.setNormal(normal)
    }

    setVip(vip){
        if (vip < 0)
            this.#vip = 0
        this.#vip = vip
    }

    setPremium(premium){
        if (premium < 0)
            this.#premium = 0
        this.#premium = premium
    }

    
    setEb(eb){
        if (eb < 0)
            this.#eb = 0
        this.#eb = eb
    }

    setNormal(normal){
        if (normal < 0)
            this.#normal = 0
        this.#normal = normal
    }

    getVip(){
        return this.#vip
    }

    
    getPremium(){
        return this.#premium
    }

    
    getEb(){
        return this.#eb
    }

    
    getNormal(){
        return this.#normal
    }

}
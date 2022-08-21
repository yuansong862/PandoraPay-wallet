import JSONParse from 'src/utils/custom-json/json-parse'
import  JSONStringify from 'src/utils/custom-json/json-stringify'

class Main {

    constructor(){

        const decoder = new TextDecoder("utf-8")
        const encoder = new TextEncoder("utf-8")

        global.MyTextDecode = a => a ? decoder.decode(a) : null
        global.MyTextEncode = a => a ? encoder.encode(a) : null

        global.JSONStringify = JSONStringify
        global.JSONParse = JSONParse

        window.addEventListener("load", () => {
            this.initialize()
        } );

    }

    initialize(){

        if (typeof PandoraPayWalletOptions === "undefined") global.PandoraPayWalletOptions = {}

        const options = PandoraPayWalletOptions

        if (!options.router) options.router = {}
        if (typeof options.resPrefix === "undefined") options.resPrefix = '/'

        if (!options.wallet)
            options.wallet = {
                appId: '#wallet',
                defaultTheme: 'true',
                startAutomatically: true,
            }

        if (!options.intro)
            options.intro = {
                appId: '#wallet-loading',
                startAutomatically: true,
            }

        this.options = options

        /**
         * On Window Load
         */

        return this.start()

    }

    async start(){
        const introAppVue = require('./intro-app/intro-app').default;
        this.introAppVue = introAppVue(this.options);
    }

    async loadApp(){

        if (this.introAppVue) {
            this.introAppVue.unmount()
            document.getElementById(this.options.intro.appId.slice(1)).remove()
        }

        const mainVue = require('./app/main-vue').default;
        this.walletAppVue = await mainVue(this.options.wallet);
    }

}

const main = new Main();

if ( typeof window !== 'undefined')
    window.PandoraPayWallet = main;

export default main;

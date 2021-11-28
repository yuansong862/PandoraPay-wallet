const promises = {
    accounts: {},
    unsubscribed: {},
    subscribed: {},
}

export default {

    async _downloadAccount({state, dispatch, commit, getters}, publicKey){

        if (state.subscribed[publicKey] && state.list[publicKey])
            return state.list[publicKey]

        if (promises.accounts[publicKey]) return promises.accounts[publicKey]
        return promises.accounts[publicKey] = new Promise( async (resolve, reject) => {
            try{

                const result = await Promise.all([
                    PandoraPay.network.getNetworkAccount(MyTextEncode( JSON.stringify( {publicKey} )) ),
                    PandoraPay.network.getNetworkAccountMempool( MyTextEncode( JSON.stringify( {publicKey} ) ) ),
                ])

                if ( !result[0] ) throw "Account was not received"
                const accountData = result[0]

                let account = JSON.parse(MyTextDecode(accountData))
                const pendingTxsList = JSON.parse( MyTextDecode(result[1]) )

                if ( !Object.keys(account).length ){
                    account = null
                    result[0] = null
                }

                if (account){

                    if (account.accounts)
                        await Promise.all( account.accountsExtra.map( accExtra => dispatch('getAssetByHash', accExtra.asset ) ) )

                    if (account.plainAccount)
                        await dispatch('getAssetByHash', PandoraPay.config.coins.NATIVE_ASSET_FULL_STRING_HEX )
                }

                await dispatch('processAccountPendingTransactions', {publicKey, list: pendingTxsList.list })

                commit('setAccount', { publicKey, account })

                resolve(account)
            }catch(err){
                console.error(err)
                reject(err)
            }finally{
                delete promises.accounts[publicKey];
            }
        })
    },

    async subscribeAccount({state, dispatch, commit}, publicKey){

        if (state.subscribed[publicKey])
            return dispatch('_downloadAccount', publicKey)

        if (promises.subscribed[publicKey]) return promises.subscribed[publicKey];
        return promises.subscribed[publicKey] = new Promise( async (resolve, reject) => {

            try{

                await Promise.all([
                    PandoraPay.network.subscribeNetwork( publicKey, PandoraPay.enums.api.websockets.subscriptionType.SUBSCRIPTION_ACCOUNT ),
                    PandoraPay.network.subscribeNetwork( publicKey, PandoraPay.enums.api.websockets.subscriptionType.SUBSCRIPTION_ACCOUNT_TRANSACTIONS ),
                ])

                commit('setSubscribedAccountStatus', {publicKey, status: true})

                resolve( await dispatch('_downloadAccount', publicKey) )

            }catch(err){
                console.error("subscribeAccount", err)
                reject(err)
            }finally{
                delete promises.subscribed[publicKey];
            }

        })
    },

    async unsubscribeAccount({state, dispatch, commit}, publicKey){

        if (!state.subscribed[publicKey])
            return false

        if (promises.unsubscribed[publicKey]) return promises.unsubscribed[publicKey]
        return promises.unsubscribed[publicKey] = new Promise( async(resolve, reject)=>{
            try{

                await Promise.all([
                    PandoraPay.network.unsubscribeNetwork( publicKey, PandoraPay.enums.api.websockets.subscriptionType.SUBSCRIPTION_ACCOUNT ),
                    PandoraPay.network.unsubscribeNetwork( publicKey, PandoraPay.enums.api.websockets.subscriptionType.SUBSCRIPTION_ACCOUNT_TRANSACTIONS)
                ]);

                commit('removeAccount', { publicKey })

                commit('setSubscribedAccountStatus', {publicKey, status: false})

                resolve(true)
            }catch(err){
                reject(err)
            }finally{
                delete promises.unsubscribed[publicKey]
            }
        })

    },

    async accountUpdateNotification( {state, dispatch, commit, getters}, {publicKey, type, data, extraInfo }){

        let account = { ... ( state.list[publicKey] || {} ) }

        if (type === PandoraPay.enums.api.websockets.subscriptionType.SUBSCRIPTION_ACCOUNT){

            const {asset, index} = extraInfo

            if (data === null ){

                if (account.accounts ) {
                    for (let i = 0; i < account.accounts.length; i++)
                        if (account.accounts[i].asset === asset) {
                            account.accounts.slice(i, 1)
                            break
                        }
                    if (!account.accounts.length)
                        delete account.accounts
                }

            } else {

                if (!account.accounts)
                    account.accounts = []

                let found = false
                for (let i = 0; i < account.accounts.length; i++)
                    if (account.accounts[i].asset === asset) {
                        account.accounts[i] = {...data, asset, index }
                        found = true
                        break
                    }

                if (!found){
                    account.accounts.push({...data, asset, index })
                }

            }

        } else if (type === PandoraPay.enums.api.websockets.subscriptionType.SUBSCRIPTION_PLAIN_ACCOUNT){

            if (data === null )
                delete account.plainAccount
            else
                account.plainAccount = {...data, index: extraInfo.index }

        }else if (type === PandoraPay.enums.api.websockets.subscriptionType.SUBSCRIPTION_REGISTRATION){
            if (data === null ) {
                delete account.registration
            }else
                account.registration = {...data, index: extraInfo.index }
        }

        if (!Object.keys(account).length)
            account = null

        commit('setAccount', {publicKey, account})

    },

}

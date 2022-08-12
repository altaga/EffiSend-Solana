import React, { Component } from 'react';
import { View, StyleSheet, Dimensions, Text, Pressable, TextInput } from 'react-native';
import { FormItem } from 'react-native-form-component';
import { Icon } from 'react-native-elements'
import ContextModule from '../utils/contextModule';
import { LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js';

function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

class Tab2 extends Component {
    constructor(props) {
        super(props);
        this.state = {
            number: "0",
            conv: "0",
            label1: 'Fiat Wallet',
            label2: 'Crypto Wallet',
            price: 0,
            converting: true,
            loading: false
        };
        this.axios = require('axios');
        this.CancelToken = require('axios').CancelToken;
        this.source = this.CancelToken.source();
        this.fromCrypto = this.fromCrypto.bind(this);
        this.fromFiat = this.fromFiat.bind(this);
        this.mounted = true
    }

    static contextType = ContextModule;

    syncAccount() {
        var config = {
            method: 'get',
            url: `https://api.stripe.com/v1/customers/${this.context.value.fiatWallet}`,
            headers: {
                'Authorization': this.context.value.fiatBearer
            },
            cancelToken: this.source.token
        };
        this.axios(config)
            .then((response) => {
                this.context.setValue({
                    fiatBalance: parseFloat(response.data.balance) / 100
                })
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    async componentDidMount() {
        var config = {
            method: 'get',
            url: 'https:///sol-price',
            cancelToken: this.source.token
        };

        this.axios(config)
            .then((response) => {
                this.context.setValue({
                    fiatPrice: response.data
                })
                this.mounted && this.setState({
                    converting: false,
                    loading: true
                })
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    componentWillUnmount() {
        this.mounted = false
        this.source.cancel("Component got unmounted");
    }

    async createIntentFromFiat() {
        var qs = require('qs');
        var data = qs.stringify({
            'amount': (parseFloat(this.state.number) * 100).toString(),
            'currency': 'usd',
            'payment_method_types[]': 'card',
            'customer': this.context.value.fiatWallet,
            'confirm': 'true',
            'description': `${this.context.value.fiatWallet},1`
        });
        var config = {
            method: 'post',
            url: 'https://api.stripe.com/v1/payment_intents',
            headers: {
                'Authorization': this.context.value.fiatBearer,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data,
            cancelToken: this.source.token
        };

        this.axios(config)
            .then(function (response) {
                console.log(JSON.stringify(response.data));
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    async fromFiat() {
        this.createIntentFromFiat()
        var qs = require('qs');
        let newBalance = parseFloat(this.context.value.fiatBalance) - parseFloat(this.state.number)
        var data = qs.stringify({
            'balance': parseInt(newBalance * 100).toString()
        });
        var config = {
            method: 'post',
            url: `https://api.stripe.com/v1/customers/${this.context.value.fiatWallet}`,
            headers: {
                'Authorization': this.context.value.fiatBearer,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data,
            cancelToken: this.source.token
        };
        this.axios(config)
            .then((response) => {
                this.syncAccount()
                this.mounted && this.setState({
                    converting: false,
                    number: "0",
                    conv: "0",
                })
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    async createIntentFromCrypto() {
        var qs = require('qs');
        var data = qs.stringify({
            'amount': parseInt(parseFloat(this.state.conv) * 100).toString(),
            'currency': 'usd',
            'payment_method_types[]': 'card',
            'customer': this.context.value.fiatWallet,
            'confirm': 'true',
            'description': `${this.context.value.fiatWallet},0`
        });
        var config = {
            method: 'post',
            url: 'https://api.stripe.com/v1/payment_intents',
            headers: {
                'Authorization': this.context.value.fiatBearer,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data,
            cancelToken: this.source.token
        };

        this.axios(config)
            .then(function (response) {
                console.log(JSON.stringify(response.data));
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    async fromCrypto() {
        this.createIntentFromCrypto()
        var qs = require('qs');
        let newBalance = parseFloat(this.context.value.fiatBalance) + parseFloat(this.state.conv)
        var data = qs.stringify({
            'balance': parseInt(newBalance * 100).toString()
        });
        var config = {
            method: 'post',
            url: `https://api.stripe.com/v1/customers/${this.context.value.fiatWallet}`,
            headers: {
                'Authorization': this.context.value.fiatBearer,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data,
            cancelToken: this.source.token
        };
        this.axios(config)
            .then(async (response) => {
                var transaction = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: this.context.value.wallet.publicKey,
                        toPubkey: new PublicKey(this.context.value.effisendWallet),
                        lamports: Math.round(LAMPORTS_PER_SOL * parseFloat(this.state.number)),
                    })
                );
                let signature = await sendAndConfirmTransaction(this.context.value.connection, transaction, [this.context.value.wallet]);
                const latestBlockHash = await this.context.value.connection.getLatestBlockhash();
                await this.context.value.connection.confirmTransaction({
                    blockhash: latestBlockHash.blockhash,
                    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                    signature
                });
                this.syncAccount()
                this.mounted && this.setState({
                    converting: false,
                    number: "0",
                    conv: "0",
                })
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    render() {
        const hr = function () {
            return <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 24, paddingBottom: 20 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#d820f9' }} />
                <View>
                    <Text style={{ width: 50, textAlign: 'center', color: "#d820f9" }}>•</Text>
                </View>
                <View style={{ flex: 1, height: 1, backgroundColor: '#d820f9' }} />
            </View>
        }
        const styles = StyleSheet.create({
            input: {
                fontSize: 24,
                width: Dimensions.get('window').width * 0.9,
                borderRadius: 5,
                borderColor: '#00e599',
                borderWidth: 1,
            },
            input2: {
                width: Dimensions.get('window').width * 0.9,
                borderRadius: 5,
                borderColor: '#00e599',
                borderWidth: 1,
                backgroundColor: '#fff',
                color: 'black',
                paddingLeft: 12,
            },
            text: {
                fontSize: 24,
                textAlign: 'center',
                color: 'white',
                paddingVertical: 20
            },
            text2: {
                fontSize: 24,
                textAlign: 'center',
                color: 'white',
            },
            inputText: {
                color: 'black',
            },
        });
        const button = {
            borderColor: "black",
            backgroundColor: `#00e599`,
            borderWidth: 2,
            borderRadius: 50,
        };

        return (
            <View>
                <Text style={styles.text}>
                    {this.state.label1}
                </Text>
                <TextInput
                    style={[styles.input2, { color: "#000" }]}
                    keyboardType="number-pad"
                    value={this.state.number}
                    onChangeText={(text) => {
                        if (isNumeric(text) || text === "" || text === "0." || text === "0..") {
                            if (text === "") {
                                this.mounted && this.setState({
                                    number: "0",
                                    conv: "0"
                                });
                            }
                            else if (text === "0.") {
                                this.mounted && this.setState({
                                    number: "0.",
                                    conv: "0"
                                });
                            }
                            else if (text === "0..") {
                                this.mounted && this.setState({
                                    number: "0.",
                                    conv: "0"
                                });
                            }
                            else if (text.substring(text.length - 1) === ".") {
                                this.mounted && this.setState({
                                    number: text,
                                    conv: text
                                });
                            }
                            else {
                                if (this.state.label1 === "Fiat Wallet") {
                                    if (parseFloat(text) >= parseFloat(this.context.value.fiatBalance)) {
                                        let temp = parseFloat(this.context.value.fiatBalance) / this.context.value.fiatPrice;
                                        this.mounted && this.setState({
                                            number: parseFloat(this.context.value.fiatBalance).toString(),
                                            conv: temp.toString()
                                        });
                                    }
                                    else {
                                        let temp = parseFloat(text) / this.context.value.fiatPrice;
                                        this.mounted && this.setState({
                                            number: parseFloat(text).toString(),
                                            conv: temp.toString()
                                        });
                                    }
                                }
                                else {
                                    if (parseFloat(text) >= parseFloat(this.context.value.cryptoBalances.sol)) {
                                        let temp = parseFloat(this.context.value.cryptoBalances.sol) * this.context.value.fiatPrice;
                                        this.mounted && this.setState({
                                            number: parseFloat(this.context.value.cryptoBalances.sol - 0.000005).toString(),
                                            conv: temp.toString()
                                        });
                                    }
                                    else {
                                        let temp = parseFloat(text) * this.context.value.fiatPrice;
                                        this.mounted && this.setState({
                                            number: parseFloat(text).toString(),
                                            conv: temp.toString()
                                        });
                                    }
                                }
                            }
                        }
                    }}
                />
                <Text />
                <View style={{ fontSize: 20, flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                    <Pressable style={button}
                        onPress={() => {
                            if (this.state.label1 === "Fiat Wallet") {
                                this.mounted && this.setState({
                                    label1: "Crypto Wallet",
                                    label2: "Fiat Wallet",
                                    number: "0",
                                    conv: "0"
                                });
                            }
                            else {
                                this.mounted && this.setState({
                                    label1: "Fiat Wallet",
                                    label2: "Crypto Wallet",
                                    number: "0",
                                    conv: "0"
                                });
                            }
                        }}>
                        <Icon
                            name="import-export"
                            type="material"
                            color="white"
                            size={50}
                        />
                    </Pressable>
                </View>
                <View style={{ paddingTop: 20 }} />
                <FormItem
                    style={styles.input}
                    textInputStyle={styles.inputText}
                    isRequired
                    value={this.state.conv}
                    floatingLabel
                    disabled
                />
                <Text style={styles.text2}>
                    {this.state.label2}
                </Text>
                {
                    hr()
                }
                <Pressable
                    disabled={!(
                        !this.state.converting &&
                        this.context.value.fiatBalance >= 0 &&
                        this.context.value.cryptoBalances.sol >= 0)}
                    style={button}
                    onPress={() => {
                        this.mounted && this.setState({
                            converting: true
                        }, () => {
                            if (this.state.label1 === "Fiat Wallet") {
                                this.fromFiat(this.state.conv);
                            }
                            else if (this.state.label1 !== "Fiat Wallet" && parseFloat(this.state.conv) > .5) {
                                this.fromCrypto(this.state.number);
                            }
                            else {
                                this.mounted && this.setState({
                                    converting: false
                                })
                            }
                        });
                    }}
                >
                    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ color: "white", fontSize: 24, padding: 8 }}>
                            {
                                (this.context.value.fiatBalance > .5 && this.context.value.cryptoBalances.sol >= 0) ?
                                    <>
                                        {
                                            !this.state.converting ? "Convert" : !this.state.loading ? "Loading..." : "Converting..."
                                        }
                                    </> : "Loading..."

                            }
                        </Text>
                    </View>
                </Pressable>
            </View>
        );
    }
}

export default Tab2;
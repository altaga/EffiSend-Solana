import React, { Component } from 'react';
import { View, Text, Dimensions, Pressable, StyleSheet, Image, Linking, Alert } from 'react-native';
import ContextModule from '../utils/contextModule';
import QRCodeScanner from 'react-native-qrcode-scanner';
import VirtualKeyboard from 'react-native-virtual-keyboard';
import { parseURL, createTransfer } from '@solana/pay';
import solana from "../assets/solana-token.png"
import checkMark from "../assets/checkMark.png"
import HCESession, { NFCContentType, NFCTagType4 } from 'react-native-hce';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ReactNativeBiometrics from 'react-native-biometrics';
import { sendAndConfirmTransaction, LAMPORTS_PER_SOL, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

const rnBiometrics = new ReactNativeBiometrics()

function findJSON(array, key, value) {
    for (let index = 0; index < array.length; index++) {
        if (array[index][key] === value) {
            return array[index]
        }
    }
    return []
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const logoSize = 24

class WithdrawCrypto extends Component {
    constructor(props) {
        super(props);
        this.state = {
            scan: false,
            ScanResult: false,
            stage: 0, //0
            text: "",
            sendText: "Send",
            fee: null,
            reviewState: false,
            processing: false,
            solana: {},
            solanaPay: {},
            solanaPayTX: null,
            payLabel: "Pay",
            signature: "",
            to: "",
            clear: false,
            texts: "",
            toAccount: ""
        };
        this.axios = require('axios');
        this.CancelToken = require('axios').CancelToken;
        this.source = this.CancelToken.source();
        this.checkPayment = null
        this.flag = true
        this.simulation = null
    }

    static contextType = ContextModule;

    async requestAxios() {
        return new Promise((resolve, reject) => {
            var config = {
                method: 'get',
                url: 'https:///get-transaction',
                headers: {
                    'accounts': this.context.value.wallet.publicKey.toBase58()
                },
                cancelToken: this.source.token
            };
            this.axios(config)
                .then((response) => {
                    if (response.data.length > 0) {
                        resolve(response.data)
                    }
                    else {
                        resolve(false)
                    }
                })
                .catch(function (error) {
                    console.log(error);
                });
        })
    }

    async delAxios() {
        return new Promise((resolve, reject) => {
            var config = {
                method: 'get',
                url: 'https:///del-transaction',
                headers: {
                    'accounts': this.context.value.wallet.publicKey.toBase58()
                },
                cancelToken: this.source.token
            };
            this.axios(config)
                .then((response) => {
                    resolve(true)
                })
                .catch(function (error) {
                    reject(true)
                });
        })
    }
    async componentDidMount() {
        this.checkPayment = setInterval(async () => {
            if (this.flag) {
                this.flag = false
                let res = await this.requestAxios()
                if (res.length > 0) {
                    let e = {
                        data: res[0].payload
                    }
                    await this.delAxios()
                    this.onSuccess(e)
                }
                else {
                    this.flag = true
                }
            }
        }, 1000);
        const tag = new NFCTagType4(NFCContentType.Text, this.context.value.wallet.publicKey.toBase58());
        this.simulation = await (new HCESession(tag)).start();
    }

    async createTransfer(connection, pubkey, object) {
        return new Promise((resolve, reject) => {
            let result = {
                error: false,
                errorString: "",
                tx: null
            }
            createTransfer(connection, pubkey, object).then((tx) => {
                result.tx = tx
                resolve(result)
            }).catch((error) => {
                result.error = true
                result.errorString = error.toString()
                resolve(result)
            })
        })
    }

    onSuccess = async (e) => {
        this.setState({
            processing: true
        }, async () => {
            if (e.data.substring(0, 6) === "solana") {
                const { recipient, amount, splToken, reference, label, message, memo } = parseURL(e.data);
                const tx = await this.createTransfer(this.context.value.connection, this.context.value.wallet.publicKey, { recipient, amount, splToken, reference, memo });
                if (tx.error) {
                    Alert.alert("Transaction error", capitalizeFirstLetter(tx.errorString.split(": ")[1]))
                    this.setState({
                        processing: false,
                    })
                }
                else {
                    await this.simulation.terminate();
                    clearInterval(this.checkPayment)
                    const feeForMessage = await this.context.value.connection.getFeeForMessage(
                        tx.tx.compileMessage(),
                        'confirmed'
                    );
                    const feeInLamports = feeForMessage.value;
                    const fee = feeInLamports / LAMPORTS_PER_SOL;
                    let solanaPay = {
                        recipient: recipient.toBase58(),
                        amount: amount.toString(),
                        splToken: splToken ? findJSON(this.context.value.splTokens, "publicKey", splToken.toBase58()).label : "SOL",
                        label,
                        message,
                        memo,
                        fee,
                        icon: splToken ? findJSON(this.context.value.splTokens, "publicKey", splToken.toBase58()).icon : findJSON(this.context.value.splTokens, "label", "SOL").icon,
                    }
                    this.setState({
                        stage: 2,
                        solanaPay,
                        solanaPayTX: tx.tx,
                        processing: false,
                    })
                }
            }
            else if (e.data.length === 44) {
                await this.simulation.terminate();
                clearInterval(this.checkPayment)
                this.setState({
                    stage: 1,
                    processing: false,
                    to: e.data
                })
            }
            else if (e.data.substring(0, 4) === "cus_") {
                this.setState({
                    processing: false,
                    toAccount: e.data,
                    stage: 6,
                })
            }
            else {
                this.setState({
                    processing: false
                })
            }
        })
    }

    changeText = (val) => {
        this.setState({
            text: val
        });
    }

    async confirmTransaction() {
        let signature = await sendAndConfirmTransaction(this.context.value.connection, this.state.solanaPayTX, [this.context.value.wallet]);
        const latestBlockHash = await this.context.value.connection.getLatestBlockhash();
        await this.context.value.connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature
        });
        this.setState({
            payLabel: "Pay",
            sendText: "Send",
            signature,
            stage: 3
        })
    }

    changeTextCheck = (val) => {
        if (val.length < 5) {
            this.setState({
                texts: val
            }, () => {
                if (this.state.texts.length === 4) {
                    if (this.context.value.pin === this.state.texts) {
                        this.setState({
                            texts: "",
                            stage: 1
                        }, async () => {
                            await this.confirmTransaction()
                        })
                        this.setState({
                            clear: true
                        }, () => {
                            this.setState({
                                clear: false
                            })
                        })
                    }
                    else {
                        this.setState({
                            texts: "",
                            clear: true
                        }, () => {
                            this.setState({
                                clear: false
                            })
                        })
                    }
                }
            });
        }
    }

    changeTextCheck2 = (val) => {
        if (val.length < 5) {
            this.setState({
                texts: val
            }, () => {
                if (this.state.texts.length === 4) {
                    if (this.context.value.pin === this.state.texts) {
                        this.setState({
                            texts: "",
                            stage: 2,
                        }, async () => {
                            await this.confirmTransaction()
                        })
                        this.setState({
                            clear: true
                        }, () => {
                            this.setState({
                                clear: false
                            })
                        })
                    }
                    else {
                        this.setState({
                            texts: "",
                            clear: true
                        }, () => {
                            this.setState({
                                clear: false
                            })
                        })
                    }
                }
            });
        }
    }

    changeTextCheck3 = (val) => {
        if (val.length < 5) {
            this.setState({
                texts: val
            }, () => {
                if (this.state.texts.length === 4) {
                    if (this.context.value.pin === this.state.texts) {
                        this.setState({
                            texts: "",
                        }, async () => {
                            this.toFiat(this.state.toAccount, this.state.text)
                            this.fromFiat(this.context.value.fiatWallet, this.state.text)
                        })
                        this.setState({
                            clear: true
                        }, () => {
                            this.setState({
                                clear: false
                            })
                        })
                    }
                    else {
                        this.setState({
                            texts: "",
                            clear: true
                        }, () => {
                            this.setState({
                                clear: false
                            })
                        })
                    }
                }
            });
        }
    }

    async payNormal() {
        this.setState({
            reviewState: true,
            sendText: "Sending..."
        })
        var transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: this.context.value.wallet.publicKey,
                toPubkey: new PublicKey(this.state.to),
                lamports: Math.round(LAMPORTS_PER_SOL * parseFloat(this.state.text)),
            })
        );
        this.setState({
            stage: 4,
            solanaPayTX: transaction
        })
    }

    async confirm() {
        this.setState({
            reviewState: true
        })
        var transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: this.context.value.wallet.publicKey,
                toPubkey: new PublicKey(this.state.to),
                lamports: Math.round(LAMPORTS_PER_SOL * parseFloat(this.state.text)),
            })
        );
        let signature = await sendAndConfirmTransaction(this.context.value.connection, transaction, [this.context.value.wallet]);
        const latestBlockHash = await this.context.value.connection.getLatestBlockhash();
        await this.context.value.connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature
        });
        this.setState({
            payLabel: "Pay",
            signature,
            stage: 3
        })
    }

    async componentWillUnmount() {
        this.source.cancel("Component got unmounted");
        clearInterval(this.checkPayment)
        await this.simulation.terminate();
    }

    startAgain() {
        this.setState({
            scan: false,
            ScanResult: false,
            stage: 0, //0
            text: "",
            reviewText: "Review",
            fee: null,
            reviewState: false,
            processing: false,
            solana: {},
            solanaPay: {},
            solanaPayTX: null,
            payLabel: "Pay",
            signature: "",
            to: "",
            toAccount: ""
        }, async () => {
            this.flag = true
            const tag = new NFCTagType4(NFCContentType.Text, this.context.value.wallet.publicKey.toBase58());
            this.simulation = await (new HCESession(tag)).start();
            this.checkPayment = setInterval(async () => {
                if (this.flag) {
                    this.flag = false
                    let res = await this.requestAxios()
                    if (res.length > 0) {
                        let e = {
                            data: res[0].payload
                        }
                        await this.delAxios()
                        this.onSuccess(e)
                    }
                    else {
                        this.flag = true
                    }
                }
            }, 1000);
        })
    }

    // Fiat

    async createIntentFromFiat(account, number) {
        var qs = require('qs');
        var data = qs.stringify({
            'amount': (parseFloat(number) * 100).toString(),
            'currency': 'usd',
            'payment_method_types[]': 'card',
            'customer': account,
            'confirm': 'true',
            'description': `${account},1`
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
                console.log("Ok Intent From");
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    async fromFiat(account, number) {
        var qs = require('qs');
        let newBalance = parseFloat(this.context.value.fiatBalance) - parseFloat(number)
        var data = qs.stringify({
            'balance': parseInt(newBalance * 100).toString()
        });
        this.createIntentFromFiat(account, number)
        var config = {
            method: 'post',
            url: `https://api.stripe.com/v1/customers/${account}`,
            headers: {
                'Authorization': this.context.value.fiatBearer,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data,
            cancelToken: this.source.token
        };
        this.axios(config)
            .then((response) => {
                this.setState({
                    reviewState: false,
                    sendText: "Send",
                    text: "0",
                    stage: 8
                })
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    async createIntentToFiat(account, number) {
        var qs = require('qs');
        var data = qs.stringify({
            'amount': (parseFloat(number) * 100).toString(),
            'currency': 'usd',
            'payment_method_types[]': 'card',
            'customer': account,
            'confirm': 'true',
            'description': `${account},0`
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
                console.log("Ok Intent To");
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    async getBalance(account) {
        var config = {
            method: 'get',
            url: `https://api.stripe.com/v1/customers/${account}`,
            headers: {
                'Authorization': this.context.value.fiatBearer,
            },
            cancelToken: this.source.token
        };
        return new Promise((resolve, reject) => {
            this.axios(config)
                .then((response) => {
                    console.log("Ok Balance");
                    resolve(response.data.balance);
                })
                .catch(function (error) {
                    console.log(error);
                });
        })
    }

    async toFiat(account, number) {
        this.createIntentToFiat(account, number)
        let res = await this.getBalance(account)
        var qs = require('qs');
        let newBalance = parseFloat(res) / 100 + parseFloat(number)
        var data = qs.stringify({
            'balance': parseInt(newBalance * 100).toString()
        });
        var config = {
            method: 'post',
            url: `https://api.stripe.com/v1/customers/${account}`,
            headers: {
                'Authorization': this.context.value.fiatBearer,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data,
            cancelToken: this.source.token
        };
        this.axios(config)
            .then((response) => {
                console.log("Ok To")
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    render() {
        const styles = StyleSheet.create({
            buttonStyle: {
                backgroundColor: '#00e599',
                borderRadius: 50,
                padding: 8,
                marginTop: 8,
                width: Dimensions.get('window').width * .8,
                alignItems: 'center',
                fontSize: 24,
            },
            buttonStyleDisabled: {
                backgroundColor: '#5c8074',
                borderRadius: 50,
                padding: 8,
                marginTop: 8,
                width: Dimensions.get('window').width * .8,
                alignItems: 'center',
                fontSize: 24,
            },
            bottomContent: {
                position: 'absolute',
                bottom: "20%"
            }
        });
        return (
            <View>
                {
                    this.state.stage === 0 &&
                    <>
                        <Text style={{
                            fontSize: 30,
                            fontWeight: 'bold',
                            textAlign: 'center',
                            paddingTop: 40,
                            color: "#00e599"
                        }}>Scan QR or NFC</Text>
                        {
                            !this.state.processing ?
                                <QRCodeScanner
                                    containerStyle={{ marginTop: -40 }}
                                    showMarker={false}
                                    reactivate={true}
                                    ref={(node) => { this.scanner = node }}
                                    onRead={this.onSuccess}
                                    topContent={<></>}
                                    bottomContent={<></>}
                                />
                                :
                                <Text style={{
                                    fontSize: 30,
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    marginTop: 220,
                                    color: "#00e599"
                                }}>
                                    Processing...
                                </Text>
                        }
                    </>
                }
                {
                    this.state.stage === 1 &&
                    <View style={{ flex: 1 }}>
                        <Text style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            textAlign: 'center',
                            color: 'white',
                            marginTop: 20,
                            marginBottom: 20
                        }}>
                            to {"\n"}
                            {this.state.to.substring(0, 22)} {"\n"}
                            {this.state.to.substring(22, 44)}
                        </Text>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: "space-between",
                            alignItems: 'center',
                            width: Dimensions.get("window").width
                        }}>
                            <Text
                                style={{
                                    fontSize: 30,
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    color: 'white'
                                }}>
                                {"                "}
                            </Text>
                            <Text style={{
                                fontSize: 30,
                                fontWeight: 'bold',
                                color: 'white'
                            }}>
                                {this.state.text === "" ?
                                    0 : this.state.text} SOL
                            </Text>
                            <Pressable
                                onPress={() => this.setState({
                                    text: (this.context.value.cryptoBalances.sol - 0.000005).toString()
                                })}
                            >
                                <Text
                                    style={{
                                        fontSize: 20,
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        color: 'white'
                                    }}>
                                    Max
                                </Text>
                            </Pressable>
                        </View>
                        <VirtualKeyboard
                            decimal={true}
                            rowStyle={{
                                width: Dimensions.get('window').width,
                                borderRadius: 5,
                                margin: 10,
                            }}
                            cellStyle={
                                {
                                    height: Dimensions.get('window').width / 7,
                                    borderWidth: 0,
                                    margin: 1,
                                }
                            }
                            colorBack={'black'}
                            color='white' pressMode='string' onPress={(val) => this.changeText(val)}
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 30 }}>
                            <Pressable
                                disabled={this.state.reviewState}
                                style={this.state.reviewState ? styles.buttonStyleDisabled : styles.buttonStyle} onPress={() => this.payNormal()}>
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                    {this.state.sendText}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                }
                {
                    this.state.stage === 2 &&
                    <View style={{ flex: 1 }}>
                        <Text style={{
                            fontSize: 18,
                            textAlign: 'center',
                            color: 'white',
                            marginTop: 30,
                        }}>
                            You are sending
                        </Text>
                        <Text style={{
                            fontSize: 22,
                            fontWeight: 'bold',
                            textAlign: 'center',
                            color: 'white',
                            marginTop: 10,
                        }}>
                            {this.state.solanaPay.icon}
                            {" | "}
                            {this.state.solanaPay.amount.toString()}
                            {" | "}
                            {this.state.solanaPay.splToken}
                        </Text>
                        <Text style={{
                            fontSize: 18,
                            textAlign: 'center',
                            color: 'white',
                            marginTop: 10,
                        }}>
                            to
                        </Text>
                        <Text style={{
                            fontSize: 22,
                            fontWeight: 'bold',
                            textAlign: 'center',
                            color: 'white',
                            marginTop: 10,
                        }}>
                            {this.state.solanaPay.recipient.substring(0, 22)} {"\n"}
                            {this.state.solanaPay.recipient.substring(22, 44)}
                        </Text>
                        <Text style={{
                            fontSize: 18,
                            textAlign: 'center',
                            color: 'white',
                            marginTop: 10,
                        }}>
                            GAS fees
                        </Text>
                        <Text style={{
                            fontSize: 22,
                            fontWeight: 'bold',
                            textAlign: 'center',
                            color: 'white',
                            marginTop: 10,
                        }}>
                            <Image style={{ width: logoSize, height: logoSize }} source={solana} />
                            {" | "}
                            {this.state.solanaPay.fee}
                            {" | "}
                            SOL
                        </Text>
                        {
                            this.state.solanaPay.label &&
                            <>
                                <Text style={{
                                    fontSize: 18,
                                    textAlign: 'center',
                                    color: 'white',
                                    marginTop: 10,
                                }}>
                                    label
                                </Text>
                                <Text style={{
                                    fontSize: 22,
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    color: 'white',
                                    marginTop: 10,
                                }}>
                                    {this.state.solanaPay.label}
                                </Text>
                            </>
                        }
                        {
                            this.state.solanaPay.message &&
                            <>
                                <Text style={{
                                    fontSize: 18,
                                    textAlign: 'center',
                                    color: 'white',
                                    marginTop: 10,
                                }}>
                                    message
                                </Text>
                                <Text style={{
                                    fontSize: 22,
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    color: 'white',
                                    marginTop: 10,
                                }}>
                                    {this.state.solanaPay.message}
                                </Text>
                            </>

                        }
                        {
                            this.state.solanaPay.memo &&
                            <>
                                <Text style={{
                                    fontSize: 18,
                                    textAlign: 'center',
                                    color: 'white',
                                    marginTop: 10,
                                }}>
                                    memo
                                </Text>
                                <Text style={{
                                    fontSize: 22,
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    color: 'white',
                                    marginTop: 10,
                                }}>
                                    {this.state.solanaPay.memo}
                                </Text>
                            </>
                        }
                        <View style={styles.bottomContent}>
                            <Pressable disabled={this.state.payLabel === "Paying..."} style={[this.state.payLabel === "Paying..." ? styles.buttonStyleDisabled : styles.buttonStyle]} onPress={async () => {
                                this.setState({
                                    stage: 5,
                                    payLabel: "Paying..."
                                })
                            }
                            }>
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                    {this.state.payLabel}
                                </Text>
                            </Pressable>
                            <Pressable disabled={this.state.payLabel === "Paying..."} style={[this.state.payLabel === "Paying..." ? styles.buttonStyleDisabled : styles.buttonStyle]} onPress={() =>
                                this.startAgain()
                            }>
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                    Cancel
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                }
                {
                    this.state.stage === 3 &&
                    <View style={{ justifyContent: "center", alignItems: "center", paddingTop: 50, paddingBottom: 50 }}>
                        <View>
                            <Image source={checkMark} alt="check"
                                style={{ width: 240, height: 240 }}
                            />
                        </View>
                        <View>
                            <Text style={{
                                fontSize: 24, fontWeight: "bold", color: "white", paddingTop: 20, textAlign: "center"
                            }}>
                                {
                                    this.state.signature.substring(0, 22) + "\n" +
                                    this.state.signature.substring(22, 44) + "\n" +
                                    this.state.signature.substring(44, 66) + "\n" +
                                    this.state.signature.substring(66, 88) + "\n"
                                }
                            </Text>
                        </View>
                        <View>
                            <Pressable onPress={() => Linking.openURL("https://solscan.io/tx/" + this.state.signature)}>
                                <Text style={{
                                    fontSize: 36, fontWeight: "bold", color: "#00e599", paddingTop: 20
                                }}>
                                    View on Explorer
                                </Text>
                            </Pressable>
                        </View>
                        <View style={{
                            fontSize: 36, fontWeight: "bold", color: "#00e599", paddingTop: 20
                        }}>
                            <Pressable style={styles.buttonStyle} onPress={() =>
                                this.startAgain()
                            }>
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                    Done
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                }
                {
                    this.state.stage === 4 &&
                    <View style={{
                        paddingTop: 0,
                        paddingBottom: 30,
                        alignItems: 'center',
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: "center",
                            marginBottom: 30,
                            marginTop: 30,
                        }}>
                            <Text style={{
                                color: 'white',
                                width: Dimensions.get("window").width * .20,
                                textAlign: "center",
                                fontSize: 24
                            }}>
                                {
                                    this.state.texts.substring(0, 1) !== "" ? "•" : "."
                                }
                            </Text>
                            <Text style={{
                                color: 'white',
                                width: Dimensions.get("window").width * .20,
                                textAlign: "center",
                                fontSize: 24
                            }}>
                                {
                                    this.state.texts.substring(1, 2) !== "" ? "•" : "."
                                }
                            </Text>
                            <Text style={{
                                color: 'white',
                                width: Dimensions.get("window").width * .20,
                                textAlign: "center",
                                fontSize: 24
                            }}>
                                {
                                    this.state.texts.substring(2, 3) !== "" ? "•" : "."
                                }
                            </Text>
                            <Text style={{
                                color: 'white',
                                width: Dimensions.get("window").width * .20,
                                textAlign: "center",
                                fontSize: 24
                            }}>
                                {
                                    this.state.texts.substring(3, 4) !== "" ? "•" : "."
                                }
                            </Text>
                        </View>
                        <VirtualKeyboard
                            rowStyle={{
                                width: Dimensions.get('window').width,
                                borderRadius: 5,
                                margin: 10,
                            }}
                            cellStyle={
                                {
                                    height: Dimensions.get('window').width / 7,
                                    borderWidth: 0,
                                    margin: 1,
                                }
                            }
                            colorBack={'black'}
                            color='white'
                            pressMode='string'
                            onPress={(val) => this.changeTextCheck(val)}
                            clear={this.state.clear}
                        />
                        {
                            this.context.value.biometrics &&
                            <Pressable style={{ marginTop: 30 }} onPress={() => {
                                rnBiometrics.simplePrompt({ promptMessage: 'Confirm fingerprint' })
                                    .then((resultObject) => {
                                        this.setState({
                                            texts: ""
                                        }, () => {
                                            const { success } = resultObject
                                            if (success) {
                                                this.setState({
                                                    stage: 1
                                                })
                                                this.confirmTransaction()
                                            } else {
                                                console.log('user cancelled biometric prompt')
                                            }
                                        })
                                    })
                                    .catch(() => {
                                        console.log('biometrics failed')
                                    })
                            }}>
                                <Icon name="fingerprint" size={100} color={this.state.number === 2 ? "black" : "white"} />
                            </Pressable>
                        }
                    </View>
                }
                {
                    this.state.stage === 5 &&
                    <View style={{
                        paddingTop: 0,
                        paddingBottom: 30,
                        marginTop: 30,
                        alignItems: 'center',
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: "center",
                            marginBottom: 30,
                        }}>
                            <Text style={{
                                color: 'white',
                                width: Dimensions.get("window").width * .20,
                                textAlign: "center",
                                fontSize: 24
                            }}>
                                {
                                    this.state.texts.substring(0, 1) !== "" ? "•" : "."
                                }
                            </Text>
                            <Text style={{
                                color: 'white',
                                width: Dimensions.get("window").width * .20,
                                textAlign: "center",
                                fontSize: 24
                            }}>
                                {
                                    this.state.texts.substring(1, 2) !== "" ? "•" : "."
                                }
                            </Text>
                            <Text style={{
                                color: 'white',
                                width: Dimensions.get("window").width * .20,
                                textAlign: "center",
                                fontSize: 24
                            }}>
                                {
                                    this.state.texts.substring(2, 3) !== "" ? "•" : "."
                                }
                            </Text>
                            <Text style={{
                                color: 'white',
                                width: Dimensions.get("window").width * .20,
                                textAlign: "center",
                                fontSize: 24
                            }}>
                                {
                                    this.state.texts.substring(3, 4) !== "" ? "•" : "."
                                }
                            </Text>
                        </View>
                        <VirtualKeyboard
                            rowStyle={{
                                width: Dimensions.get('window').width,
                                borderRadius: 5,
                                margin: 10,
                            }}
                            cellStyle={
                                {
                                    height: Dimensions.get('window').width / 7,
                                    borderWidth: 0,
                                    margin: 1,
                                }
                            }
                            colorBack={'black'}
                            color='white'
                            pressMode='string'
                            onPress={(val) => this.changeTextCheck2(val)}
                            clear={this.state.clear}
                        />
                        {
                            this.context.value.biometrics &&
                            <Pressable style={{ marginTop: 30 }} onPress={() => {
                                rnBiometrics.simplePrompt({ promptMessage: 'Confirm fingerprint' })
                                    .then((resultObject) => {
                                        this.setState({
                                            texts: ""
                                        }, () => {
                                            const { success } = resultObject
                                            if (success) {
                                                this.setState({
                                                    stage: 2
                                                })
                                                this.confirmTransaction()
                                            } else {
                                                console.log('user cancelled biometric prompt')
                                            }
                                        })
                                    })
                                    .catch(() => {
                                        console.log('biometrics failed')
                                    })
                            }}>
                                <Icon name="fingerprint" size={100} color={this.state.number === 2 ? "black" : "white"} />
                            </Pressable>
                        }
                    </View>
                }
                {
                    this.state.stage === 6 &&
                    <View style={{ flex: 1 }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: "space-between",
                            alignItems: 'center',
                            width: Dimensions.get("window").width
                        }}>
                            <Text
                                style={{
                                    fontSize: 30,
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    color: 'white'
                                }}>
                                {"                "}
                            </Text>
                            <Text style={{
                                fontSize: 30,
                                fontWeight: 'bold',
                                color: 'white',
                                marginTop:30
                            }}>
                                {this.state.text === "" ?
                                    0 : this.state.text} USD
                            </Text>
                            <Pressable
                                onPress={() => this.setState({
                                    text: (this.context.value.fiatBalance).toString()
                                })}
                            >
                                <Text
                                    style={{
                                        fontSize: 20,
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        color: 'white',
                                        marginTop:30
                                    }}>
                                    Max
                                </Text>
                            </Pressable>
                        </View>
                        <VirtualKeyboard
                            decimal={true}
                            rowStyle={{
                                width: Dimensions.get('window').width,
                                borderRadius: 5,
                                margin: 10,
                            }}
                            cellStyle={
                                {
                                    height: Dimensions.get('window').width / 7,
                                    borderWidth: 0,
                                    margin: 1,
                                }
                            }
                            colorBack={'black'}
                            color='white' pressMode='string' onPress={(val) => this.changeText(val)}
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 30 }}>
                            <Pressable
                                disabled={this.state.reviewState}
                                style={this.state.reviewState ? styles.buttonStyleDisabled : styles.buttonStyle} onPress={() => {
                                    this.setState({
                                        reviewState: true,
                                        sendText: "Sending...",
                                        stage: 7
                                    })
                                }}>
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                    {this.state.sendText}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                }
                {
                    this.state.stage === 7 &&
                    <View style={{
                        paddingTop: 0,
                        paddingBottom: 30,
                        marginTop: 30,
                        alignItems: 'center',
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: "center",
                            marginBottom: 30,
                        }}>
                            <Text style={{
                                color: 'white',
                                width: Dimensions.get("window").width * .20,
                                textAlign: "center",
                                fontSize: 24
                            }}>
                                {
                                    this.state.texts.substring(0, 1) !== "" ? "•" : "."
                                }
                            </Text>
                            <Text style={{
                                color: 'white',
                                width: Dimensions.get("window").width * .20,
                                textAlign: "center",
                                fontSize: 24
                            }}>
                                {
                                    this.state.texts.substring(1, 2) !== "" ? "•" : "."
                                }
                            </Text>
                            <Text style={{
                                color: 'white',
                                width: Dimensions.get("window").width * .20,
                                textAlign: "center",
                                fontSize: 24
                            }}>
                                {
                                    this.state.texts.substring(2, 3) !== "" ? "•" : "."
                                }
                            </Text>
                            <Text style={{
                                color: 'white',
                                width: Dimensions.get("window").width * .20,
                                textAlign: "center",
                                fontSize: 24
                            }}>
                                {
                                    this.state.texts.substring(3, 4) !== "" ? "•" : "."
                                }
                            </Text>
                        </View>
                        <VirtualKeyboard
                            rowStyle={{
                                width: Dimensions.get('window').width,
                                borderRadius: 5,
                                margin: 10,
                            }}
                            cellStyle={
                                {
                                    height: Dimensions.get('window').width / 7,
                                    borderWidth: 0,
                                    margin: 1,
                                }
                            }
                            colorBack={'black'}
                            color='white'
                            pressMode='string'
                            onPress={(val) => this.changeTextCheck3(val)}
                            clear={this.state.clear}
                        />
                        {
                            this.context.value.biometrics &&
                            <Pressable style={{ marginTop: 30 }} onPress={() => {
                                rnBiometrics.simplePrompt({ promptMessage: 'Confirm fingerprint' })
                                    .then((resultObject) => {
                                        this.setState({
                                            texts: ""
                                        }, () => {
                                            const { success } = resultObject
                                            if (success) {
                                                this.toFiat(this.state.toAccount, this.state.text)
                                                this.fromFiat(this.context.value.fiatWallet, this.state.text)
                                            } else {
                                                console.log('user cancelled biometric prompt')
                                            }
                                        })
                                    })
                                    .catch(() => {
                                        console.log('biometrics failed')
                                    })
                            }}>
                                <Icon name="fingerprint" size={100} color={this.state.number === 2 ? "black" : "white"} />
                            </Pressable>
                        }
                    </View>
                }
                {
                    this.state.stage === 8 &&
                    <View style={{flexDirection:"column", justifyContent: "space-evenly", alignItems: "center", paddingTop: 50, paddingBottom: 50 }}>
                        <View>
                            <Image source={checkMark} alt="check"
                                style={{ width: 240, height: 240 }}
                            />
                        </View>
                        <Text style={{
                            color: 'white',
                            width: Dimensions.get("window").width * .8,
                            textAlign: "center",
                            fontSize: 24,
                            marginTop:30
                        }}>
                            Transaction Complete
                        </Text>
                        <View style={{
                            fontSize: 36, fontWeight: "bold", color: "#00e599", paddingTop: 20
                        }}>
                            <Pressable style={styles.buttonStyle} onPress={() =>
                                this.startAgain()
                            }>
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                    Done
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                }
            </View >
        );
    }
}

export default WithdrawCrypto;
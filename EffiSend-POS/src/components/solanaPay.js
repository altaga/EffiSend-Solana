import React, { Component } from 'react';
import { Alert, Dimensions, Linking, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, Image, Keyboard } from 'react-native';
import ContextModule from '../utils/contextModule';
import QRCode from 'react-native-qrcode-svg';
import { Keypair, Cluster, clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { encodeURL, createQR, findReference, validateTransfer } from '@solana/pay';
import { FormItem, Picker } from 'react-native-form-component';
import BigNumber from 'bignumber.js';
import reactAutobind from 'react-autobind';
import { withHooksHOC } from '../utils/hooks';
import checkMark from "../assets/checkMark.png"
import {logo} from "../components/logo"
import GlobalStyles from '../styles/styles';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNPrint from 'react-native-print';
import NfcManager, { Ndef, NfcEvents, NfcTech } from 'react-native-nfc-manager';

class SolanaPay extends Component {
    constructor(props) {
        super(props);
        this.state = {
            qr: "",
            splToken: {
                value: null,
                label: "SOL"
            },
            amount: "",
            label: "",
            message: "",
            memo: "",
            paymentStatus: "Pending...",
            signature: "",
            keyboardOffset: 0,
            stage: 0,
            printData: ""
        }
        reactAutobind(this)
        this.interval = null
        this.svg = null
        this.NfcManager = NfcManager
        this.axios = require("axios")
    }

    static contextType = ContextModule;

    componentDidMount(){
        console.log(logo)
    }

    async getDataURL() {
        return new Promise(async (resolve, reject) => {
            this.svg.toDataURL(async (data) => {
                this.setState({
                    printData: "data:image/png;base64," + data
                }, () => resolve("ok"))
            });
        })
    }

    NFCreadData(data) {
        let decoded = Ndef.text.decodePayload(data.ndefMessage[0].payload)
        console.log(decoded)
        if (decoded.length === 44) {
            var config = {
                method: 'get',
                url: 'https:///add-transaction',
                headers: {
                    'accounts': decoded,
                    'payload': this.state.qr
                }
            };
            this.axios(config)
                .then((response) => {
                    console.log(response.data);
                })
                .catch(function (error) {
                    console.log(error);
                });
        }
    }

    async createTransaction() {
        this.setState({ paymentStatus: "Creating..." })
        this.NfcManager.start()
        const connection = this.context.value.connection
        const recipient = new PublicKey(this.context.value.wallet.publicKey.toBase58());
        const splToken = this.state.splToken.value;
        const amount = new BigNumber(parseFloat(this.state.amount));
        const reference = new Keypair().publicKey;
        const label = this.state.label;
        const message = this.state.message;
        const memo = this.state.memo;
        const url = this.state.splToken.label === "SOL" ? encodeURL({ recipient, amount, reference, label, message, memo }) : encodeURL({ recipient, amount, reference, label, message, memo, splToken })
        console.log({ recipient, amount, reference, label, message, memo, splToken })
        this.setState({
            qr: url.toString(),
            paymentStatus: "Pending...",
            stage: 1
        })
        console.log("Pending...")
        let signatureInfo;
        this.NfcManager.setEventListener(NfcEvents.DiscoverTag, this.NFCreadData);
        this.NfcManager.registerTagEvent()
        const { signature } = await new Promise((resolve, reject) => {
            this.interval = setInterval(async () => {
                try {
                    console.log(".")
                    signatureInfo = await findReference(connection, reference, { finality: 'confirmed' });
                    clearInterval(this.interval);
                    resolve(signatureInfo);
                } catch (error) {
                    //console.log(error)
                }
            }, 1000);
        });
        this.setState({ paymentStatus: "Confirmed..." })
        console.log("Confirmed...")
        try {
            const latestBlockHash = await connection.getLatestBlockhash();
            let res = await connection.confirmTransaction({
                blockhash: latestBlockHash.blockhash,
                lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                signature
            });
            console.log(res)
            this.setState({
                paymentStatus: "Validated",
                signature,
                qr: null,
                stage: 2
            })
        } catch (error) {
            console.error('Payment failed', error);
            this.setState({
                paymentStatus: "failed"
            })
        }
    }

    componentWillUnmount() {
        clearInterval(this.interval);
        this.NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
        this.NfcManager.unregisterTagEvent();
    }

    render() {
        const styles = StyleSheet.create({
            input: {
                width: Dimensions.get('window').width * .8,
                paddingHorizontal: 12,
                marginBottom: 6,
                marginTop: 6,
                borderRadius: 5,
                borderColor: '#00e599',
                borderWidth: 1,
                backgroundColor: '#fff',
                color: 'black',
                fontSize: 24,
                textAlign: "center"
            },
            inputText: {
                fontSize: 24,
                color: "black",
                textAlign: "center"
            },
            buttonStyle: {
                backgroundColor: '#00e599',
                borderRadius: 50,
                padding: 8,
                marginTop: 8,
                width: Dimensions.get('window').width * .8,
                alignItems: 'center',
                fontSize: 24,
            }
        })
        return (
            <>
                {
                    this.state.stage === 0 &&
                    <SafeAreaView style={GlobalStyles.main}>
                        <ScrollView
                            contentContainerStyle={{
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingTop: 5,
                                width: Dimensions.get("window").width
                            }}
                            showsVerticalScrollIndicator={false}
                        >
                            <Picker
                                isRequired
                                buttonStyle={styles.input}
                                itemLabelStyle={styles.inputText}
                                labelStyle={[styles.inputText, { color: "white" }]}
                                selectedValueStyle={styles.inputText}
                                items={this.context.value.splTokens.map((item, index) => ({ label: item.label, value: item.value }))}
                                label=" SPL Token"
                                selectedValue={this.state.splToken.value}
                                onSelection={
                                    (item) => {
                                        this.setState({
                                            splToken: item
                                        });
                                    }
                                }
                            />
                            <Text style={{
                                fontSize: 24,
                                color: '#FFF',
                                fontWeight: 'bold',
                            }}>
                                Amount
                            </Text>
                            <TextInput
                                style={[styles.input, { color: "#000" }]}
                                keyboardType="number-pad"
                                value={this.state.amount}
                                onChangeText={(value) => this.setState({ amount: value })}
                            />
                            <FormItem
                                style={styles.input}
                                textInputStyle={styles.inputText}
                                labelStyle={[styles.inputText, { color: "white" }]}
                                label="Label"
                                value={this.state.label}
                                onChangeText={(value) => this.setState({ label: value })}
                            />
                            <FormItem
                                style={styles.input}
                                textInputStyle={styles.inputText}
                                labelStyle={[styles.inputText, { color: "white" }]}
                                label="Message"
                                value={this.state.message}
                                onChangeText={(value) => this.setState({ message: value })}
                            />
                            <FormItem
                                style={styles.input}
                                textInputStyle={styles.inputText}
                                labelStyle={[styles.inputText, { color: "white" }]}
                                label="Memo"
                                value={this.state.memo}
                                onChangeText={(value) => this.setState({ memo: value })}
                            />
                            <Pressable style={styles.buttonStyle} onPress={() => {
                                this.createTransaction()
                            }}>
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                    Create Payment
                                </Text>
                            </Pressable>
                            <Pressable style={styles.buttonStyle} onPress={() => {
                                this.props.callback()
                            }}>
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                    Cancel
                                </Text>
                            </Pressable>
                            <View style={{
                                height: 4
                            }} />
                            <View style={{
                                height: this.props.keyboardHeight
                            }} />
                        </ScrollView>
                    </SafeAreaView>
                }
                {
                    this.state.stage === 1 &&
                    <SafeAreaView style={GlobalStyles.main}>
                        <View style={{ flex: 1, flexDirection: 'column', justifyContent: "space-evenly", alignItems: "center" }}>
                            <View>
                                <Text style={{ fontSize: 28, fontWeight: "bold", color: "white", textAlign: "center" }}>
                                    {
                                        this.state.splToken.label === "SOL" ?
                                            "Receive Solana (SOL)"
                                            :
                                            "Receive " + this.state.splToken.label + " Token"
                                    }
                                </Text>
                            </View>
                            <QRCode
                                value={this.state.qr}
                                size={Dimensions.get("window").height / 2.3}
                                quietZone={10}
                                ecl="H"
                            />
                            <View>
                                <Text style={{
                                    textShadowRadius: 1,
                                    fontSize: 28, fontWeight: "bold", color: this.state.paymentStatus === "Pending..." ? "#d820f9" : "#00e599", paddingTop: 10
                                }}>
                                    {
                                        this.state.paymentStatus
                                    }
                                </Text>
                            </View>
                            <Pressable style={styles.buttonStyle} onPress={() => {
                                this.props.callback()
                            }}>
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                    Cancel
                                </Text>
                            </Pressable>
                        </View>
                    </SafeAreaView>
                }
                {
                    this.state.stage === 2 &&
                    <SafeAreaView style={GlobalStyles.main}>
                        <View style={{ flex: 1, flexDirection: 'column', justifyContent: "space-evenly", alignItems: "center" }}>
                            <Image source={checkMark} alt="check"
                                style={{ width: 200, height: 200 }}
                            />
                            <Text style={{
                                textShadowRadius: 1,
                                fontSize: 28, fontWeight: "bold", color: this.state.paymentStatus === "Pending..." ? "#d820f9" : "#00e599", paddingTop: 10
                            }}>
                                {
                                    this.state.paymentStatus
                                }
                            </Text>
                            <Pressable onPress={() => Linking.openURL("https://solscan.io/tx/" + this.state.signature)}>
                                <Text style={{
                                    fontSize: 24, fontWeight: "bold", color: "#00e599", textAlign: "center"
                                }}>
                                    View on Explorer
                                </Text>
                            </Pressable>
                            <Pressable style={styles.buttonStyle} onPress={async () => {
                                await this.getDataURL()
                                const results = await RNHTMLtoPDF.convert({
                                    html: (`
                                    <div style="text-align: center;">
                                        <img src='${logo}' width="500px"></img>
                                        <h1 style="font-size: 3rem;">--------- Original Reciept ---------</h1>
                                        <h1 style="font-size: 3rem;">Date: ${new Date().toLocaleDateString()}</h1>
                                        <h1 style="font-size: 3rem;">------------------ • ------------------</h1>
                                        <h1 style="font-size: 3rem;">Solana Pay</h1>
                                        <h1 style="font-size: 3rem;">Amount: ${this.state.amount.toString() + " " + this.state.splToken.label}</h1>
                                        ${this.state.label ?
                                            `<h1 style="font-size: 3rem;">Label: ${this.state.label}</h1>` : ``
                                        }
                                        ${this.state.message ?
                                            `<h1 style="font-size: 3rem;">Message: ${this.state.message}</h1>` : ``
                                        }
                                        ${this.state.memo ?
                                            `<h1 style="font-size: 3rem;">Memo: ${this.state.memo}</h1>` : ``
                                        }
                                        <h1 style="font-size: 3rem;">------------------ • ------------------</h1>
                                        <img src='${this.state.printData}'></img>
                                    </div>
                                    `),
                                    fileName: 'print',
                                    base64: true,
                                })
                                await RNPrint.print({ filePath: results.filePath })
                            }}>
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                    Print Receipt
                                </Text>
                            </Pressable>
                            <Pressable style={styles.buttonStyle} onPress={() =>
                                this.props.callback()
                            }>
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                    Done
                                </Text>
                            </Pressable>
                        </View>
                    </SafeAreaView>
                }
                <View style={{ marginTop: Dimensions.get("window").height }}>
                    <QRCode
                        value={"https://solscan.io/tx/" + this.state.signature}
                        size={Dimensions.get("window").width * 0.7}
                        ecl="L"
                        getRef={(c) => (this.svg = c)}
                    />
                </View>
            </>
        );
    }
}

export default withHooksHOC(SolanaPay);
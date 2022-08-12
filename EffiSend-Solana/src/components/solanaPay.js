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

class SolanaPay extends Component {
    constructor(props) {
        super(props);
        this.state = {
            qr: null,
            splToken: {
                value: null,
                label: "SOL"
            },
            amount: "",
            label: "",
            message: "",
            memo: "",
            paymentStatus: "",
            signature: "",
            keyboardOffset: 0,
            stage:0
        }
        reactAutobind(this)
        this.interval = null
    }

    static contextType = ContextModule;
    async createTransaction() {
        this.setState({ paymentStatus: "Creating..." })
        const connection = this.context.value.connection
        const recipient = new PublicKey(this.context.value.wallet.publicKey.toBase58());
        const splToken = this.state.splToken.value;
        const amount = new BigNumber(parseFloat(this.state.amount));
        const reference = new Keypair().publicKey;
        const label = this.state.label;
        const message = this.state.message;
        const memo = this.state.memo;
        const url = this.state.splToken.label === "SOL" ? encodeURL({ recipient, amount, reference, label, message, memo }) : encodeURL({ recipient, amount, reference, label, message, memo, splToken })
        this.setState({
            qr: url.toString(),
            paymentStatus: "Pending...",
            stage:1
        })
        console.log("Pending...")
        let signatureInfo;
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
                stage:1
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
    }

    render() {
        const styles = StyleSheet.create({
            input: {
                width: Dimensions.get('window').width * .8,
                margin: 12,
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
            },
            container: {
                marginTop: 20,
                height: Dimensions.get('window').height * .7,
                width: Dimensions.get('window').width
            },
        })
        return (
            <>
                {
                    this.state.stage ?
                        <View style={{ justifyContent: "center", alignItems: "center", paddingTop: 50, paddingBottom: 50 }}>
                            <View>
                                <Text style={{ fontSize: 30, fontWeight: "bold", color: "white", paddingBottom: 30 }}>
                                    {
                                        this.state.splToken.label === "SOL" ?
                                            "Recieve Solana (SOL)"
                                            :
                                            "Recieve " + this.state.splToken.label + " Token"
                                    }
                                </Text>
                            </View>
                            {
                                this.state.qr &&
                                <QRCode
                                    value={this.state.qr}
                                    size={300}
                                    quietZone={10}
                                />
                            }
                            {
                                this.state.paymentStatus === "Validated" &&
                                <View>
                                    <Image source={checkMark} alt="check"
                                        style={{ width: 240, height: 240 }}
                                    />
                                </View>
                            }
                            <View>
                                <Text style={{
                                    textShadowColor: this.state.paymentStatus === "Pending..." ? "#00e599" : "#d820f9",
                                    textShadowOffset: { width: -2, height: 1 },
                                    textShadowRadius: 1,
                                    fontSize: 36, fontWeight: "bold", color: this.state.paymentStatus === "Pending..." ? "#d820f9" : "#00e599", paddingTop: 10
                                }}>
                                    {
                                        this.state.paymentStatus
                                    }
                                </Text>
                            </View>
                            <View>
                                {
                                    this.state.paymentStatus === "Validated" &&
                                    <Pressable onPress={() => Linking.openURL("https://solscan.io/tx/" + this.state.signature)}>
                                        <Text style={{
                                            fontSize: 36, fontWeight: "bold", color: "#00e599", paddingTop: 30
                                        }}>
                                            View on Explorer
                                        </Text>
                                    </Pressable>
                                }
                            </View>
                            {
                                this.state.paymentStatus === "Validated" &&
                                <View style={{
                                    fontSize: 36, fontWeight: "bold", color: "#00e599", paddingTop: 20
                                }}>
                                    <Pressable style={styles.buttonStyle} onPress={() =>
                                        this.setState({
                                            qr: null,
                                            splToken: {
                                                value: null,
                                                label: "SOL"
                                            },
                                            amount: "",
                                            label: "",
                                            message: "",
                                            memo: "",
                                            paymentStatus: "",
                                            signature: "",
                                            keyboardOffset: 0,
                                            stage:0
                                        })
                                    }>
                                        <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                            Done
                                        </Text>
                                    </Pressable>
                                </View>
                            }
                        </View>
                        :
                        <SafeAreaView style={styles.container}>
                            <ScrollView
                                contentContainerStyle={{
                                    alignItems: 'center',
                                    justifyContent: 'center'
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
                                    paddingLeft: 8,
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
                                <View style={{
                                    height: this.props.keyboardHeight
                                }} />
                            </ScrollView>
                        </SafeAreaView>
                }
            </>
        );
    }
}

export default withHooksHOC(SolanaPay);
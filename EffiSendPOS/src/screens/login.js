import React, { Component } from 'react';
// Modules
import { StatusBar, SafeAreaView, StyleSheet, TextInput, Text, Image, Pressable, View, Dimensions, ScrollView } from 'react-native';
import { FormItem } from 'react-native-form-component';
// Utils
import ContextModule from '../utils/contextModule';
// Assets
import Renders from "../assets/logo.png"
import LogoSplash from "../assets/logoSplash.png"
// Styles
import GlobalStyles from '../styles/styles';
import reactAutobind from 'react-autobind';
// Sensors
import EncryptedStorage from 'react-native-encrypted-storage';
import VirtualKeyboard from 'react-native-virtual-keyboard';
import ThemedListItem from 'react-native-elements/dist/list/ListItem';
import { Keypair } from '@solana/web3.js';
import Icon from 'react-native-vector-icons/MaterialIcons';

class Login extends Component {
    constructor(props) {
        super(props);
        this.state = {
            stage: 4,
            biometric: false,
            clear: false,
            text: "",
        };
        reactAutobind(this)
        this.axios = require('axios');
    }

    static contextType = ContextModule;

    async storeUserPIN() {
        try {
            await EncryptedStorage.setItem(
                "userPIN",
                JSON.stringify({
                    pin: this.state.text.substring(0, 4)
                })
            );
            this.context.setValue({
                pin: this.state.text.substring(0, 4)
            })
            this.setState({
                stage: 2
            })
        } catch (error) {
            // There was an error on the native side
        }
    }

    async storeUserWallet(wallet) {
        try {
            await EncryptedStorage.setItem(
                "userWallet",
                JSON.stringify({
                    wallet
                })
            );
            this.context.setValue({
                wallet: Keypair.fromSecretKey(Uint8Array.from(wallet.split(',')))
            })
        } catch (error) {
            // There was an error on the native side
        }
    }

    async componentDidMount() {
        //await this.erase()
        try {
            const session = await EncryptedStorage.getItem("userPIN");
            if (session !== undefined) {
                this.context.setValue({
                    pin: JSON.parse(session).pin
                })
            }
            else {
                console.log("nothing yet")
            }
        } catch (error) {
            // There was an error on the native side
        }
        try {
            const session = await EncryptedStorage.getItem("userWallet");
            if (session !== undefined) {
                this.context.setValue({
                    wallet: Keypair.fromSecretKey(Uint8Array.from(JSON.parse(session).wallet.split(',')))
                })
            }
            else {
                console.log("nothing yet")
            }
        } catch (error) {
            // There was an error on the native side
        }

        if ((this.context.value.wallet ? true : false) && (this.context.value.pin ? true : false)) {
            this.setState({
                stage: 2
            })
        } else {
            this.setState({
                stage: 0
            })
        }
    }

    componentWillUnmount() {

    }

    changeText = (val) => {
        if (val.length <= 4) {
            this.setState({
                text: val
            });
        }
    }

    changeTextCheck = (val) => {
        if (val.length < 5) {
            this.setState({
                text: val
            }, () => {
                if (this.state.text.length === 4) {
                    if (this.context.value.pin === this.state.text) {
                        this.props.navigation.navigate('Main')
                        this.setState({
                            text: "",
                            clear: true
                        }, () => {
                            this.setState({
                                clear: false
                            })
                        })
                    }
                    else {
                        this.setState({
                            text: "",
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

    async erase() {
        try {
            await EncryptedStorage.clear();
            // Congrats! You've just cleared the device storage!
        } catch (error) {
            // There was an error on the native side
        }
    }

    render() {
        return (
            <SafeAreaView style={[GlobalStyles.container, {
                paddingTop: StatusBar.currentHeight,
                backgroundColor: "#1E2423"
            }]}>
                <View>
                    {
                        this.state.stage === 0 &&
                        <View style={{
                            alignItems: 'center',
                        }}>
                            <Image source={Renders} alt="Cat"
                                style={{ width: Dimensions.get("window").width * 0.5, height: Dimensions.get("window").width * 0.5 }}
                            />
                            <Text style={{
                                fontSize: 36,
                                textAlign: "center",
                                color: "white",
                                paddingLeft: 10,
                                paddingRight: 10,
                                marginTop: Dimensions.get("window").height * 0.05,
                                marginBottom: Dimensions.get("window").height * 0.1,
                            }}>
                                Effisend{"\n"}Solana POS
                            </Text>
                            <Pressable style={GlobalStyles.buttonStyleLogin} onPress={async () => {
                                let keypair = Keypair.generate();
                                await this.storeUserWallet(keypair._keypair.secretKey.toString())
                                this.setState({ stage: 1 })
                            }}>
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                    Create a new wallet
                                </Text>
                            </Pressable>
                        </View>
                    }
                    {
                        this.state.stage === 1 &&
                        <View style={{
                            paddingTop: 0,
                            alignItems: 'center',
                        }}>
                            <Text style={{
                                fontSize: 24,
                                textAlign: "center",
                                color: "white",
                                padding: 10,
                                marginBottom: Dimensions.get("window").height * 0.03,
                                width: Dimensions.get("window").width * 0.8
                            }}>
                                Protect POS with a pincode
                            </Text>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: "center",
                            }}>
                                <Text style={{
                                    color: 'white',
                                    width: Dimensions.get("window").width * .20,
                                    textAlign: "center",
                                    fontSize: 24
                                }}>
                                    {
                                        this.state.text.substring(0, 1) !== "" ? this.state.text.substring(0, 1) : "•"
                                    }
                                </Text>
                                <Text style={{
                                    color: 'white',
                                    width: Dimensions.get("window").width * .20,
                                    textAlign: "center",
                                    fontSize: 24
                                }}>
                                    {
                                        this.state.text.substring(1, 2) !== "" ? this.state.text.substring(1, 2) : "•"
                                    }
                                </Text>
                                <Text style={{
                                    color: 'white',
                                    width: Dimensions.get("window").width * .20,
                                    textAlign: "center",
                                    fontSize: 24
                                }}>
                                    {
                                        this.state.text.substring(2, 3) !== "" ? this.state.text.substring(2, 3) : "•"
                                    }
                                </Text>
                                <Text style={{
                                    color: 'white',
                                    width: Dimensions.get("window").width * .20,
                                    textAlign: "center",
                                    fontSize: 24
                                }}>
                                    {
                                        this.state.text.substring(3, 4) !== "" ? this.state.text.substring(3, 4) : "•"
                                    }
                                </Text>
                            </View>
                            <VirtualKeyboard
                                rowStyle={{
                                    width: Dimensions.get('window').width,
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
                                onPress={(val) => this.changeText(val)}
                            />
                            <Pressable disabled={this.state.text.length !== 4} style={[this.state.text.length !== 4 ? GlobalStyles.buttonStyleLoginDisabel : GlobalStyles.buttonStyleLogin, { marginTop: 30 }]} onPress={async () => this.storeUserPIN()}>
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                                    Set Pincode
                                </Text>
                            </Pressable>
                        </View>
                    }
                    {
                        this.state.stage === 2 &&
                        <View style={{
                            alignItems: 'center',
                        }}>
                            <Text style={{
                                fontSize: 36,
                                textAlign: "center",
                                color: "white",
                                padding: 10,
                                marginBottom: Dimensions.get("window").height * 0.05,
                                width: Dimensions.get("window").width * 0.8
                            }}>
                                Unlock POS
                            </Text>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: "center",
                            }}>
                                <Text style={{
                                    color: 'white',
                                    width: Dimensions.get("window").width * .20,
                                    textAlign: "center",
                                    fontSize: 24
                                }}>
                                    {
                                        this.state.text.substring(0, 1) !== "" ? "•" : "."
                                    }
                                </Text>
                                <Text style={{
                                    color: 'white',
                                    width: Dimensions.get("window").width * .20,
                                    textAlign: "center",
                                    fontSize: 24
                                }}>
                                    {
                                        this.state.text.substring(1, 2) !== "" ? "•" : "."
                                    }
                                </Text>
                                <Text style={{
                                    color: 'white',
                                    width: Dimensions.get("window").width * .20,
                                    textAlign: "center",
                                    fontSize: 24
                                }}>
                                    {
                                        this.state.text.substring(2, 3) !== "" ? "•" : "."
                                    }
                                </Text>
                                <Text style={{
                                    color: 'white',
                                    width: Dimensions.get("window").width * .20,
                                    textAlign: "center",
                                    fontSize: 24
                                }}>
                                    {
                                        this.state.text.substring(3, 4) !== "" ? "•" : "."
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
                        </View>
                    }
                    {
                        this.state.stage === 4 &&
                        <View style={{
                            paddingTop: Dimensions.get("window").height * 0.2,
                            paddingBottom: 50,
                            alignItems: 'center',
                        }}>
                            <Image source={LogoSplash} alt="Cat"
                                style={{ width: 372 * 2 / 3, height: 307 * 2 / 3 }}
                            />
                        </View>
                    }
                </View>
            </SafeAreaView>
        );
    }
}

export default Login;
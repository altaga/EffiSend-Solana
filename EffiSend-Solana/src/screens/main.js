import React, { Component } from 'react';
import { SafeAreaView, StyleSheet, ScrollView, TextInput, Text, Image, Pressable, View, Dimensions } from 'react-native';
import { Keypair, Cluster, clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { encodeURL, createQR, findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';
import { Header } from 'react-native-elements';
import Renders from "../assets/logo.png"
import QR from "../assets/qr.png"
import ContextModule from '../utils/contextModule';
import reactAutobind from 'react-autobind';
import GlobalStyles from '../styles/styles';
import QRCode from 'react-native-qrcode-svg';
import qrImage from "../assets/qrImage.png"
import Icon from 'react-native-vector-icons/MaterialIcons';

// Tabs
import Tab1 from '../tabs/tab1';
import Tab3 from "../tabs/tab3";
import AppStateListener from '../utils/appStateListener';
import Tab2 from '../tabs/tab2';
/*

import Tab2 from '../tabs/tab2';
import Tab3 from '../tabs/tab3';
*/

class Main extends Component {
    constructor(props) {
        super(props);
        this.state = {
            qr: null,
            text: '',
            number: 0,
            selectorSytle1: {
                borderColor: "#00e599",
                backgroundColor: "white",
                paddingTop: 4,
                borderTopWidth: 2,
                borderLeftWidth: 2,
                borderRightWidth: 2,
                width: Dimensions.get('window').width * .3333,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
            },
            selectorSytle2: {
                borderColor: "#00e599",
                backgroundColor: `#00e599`,
                paddingTop: 4,
                borderTopWidth: 0,
                borderLeftWidth: 0,
                borderRightWidth: 0,
                width: Dimensions.get('window').width * .3333,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
            },
            selectorSytle3: {
                borderColor: "#00e599",
                backgroundColor: `#00e599`,
                paddingTop: 4,
                borderTopWidth: 0,
                borderLeftWidth: 0,
                borderRightWidth: 0,
                width: Dimensions.get('window').width * .3333,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
            },
            selectorText1: {
                fontSize: 20,
                color: 'black',
                marginBottom: 4,
                textAlign: 'center'
            },
            selectorText2: {
                fontSize: 20,
                color: 'white',
                marginBottom: 4,
                textAlign: 'center'
            },
            selectorText3: {
                fontSize: 20,
                color: 'white',
                marginBottom: 4,
                textAlign: 'center'
            }
        };
        reactAutobind(this)
    }

    static contextType = ContextModule;

    componentWillUnmount() {

    }

    onChangeText = (event) => {
    }

    componentDidMount() {
        this.selector(0); 
    }

    selector(number) {
        switch (number) {
            case 0:
                this.setState({
                    number: 0,
                    selectorSytle1: {
                        ...this.state.selectorSytle1,
                        backgroundColor: "white",
                        borderTopWidth: 2,
                        borderLeftWidth: 2,
                        borderRightWidth: 2,
                    },
                    selectorSytle2: {
                        ...this.state.selectorSytle2,
                        backgroundColor: `#00e599`,
                        borderTopWidth: 0,
                        borderLeftWidth: 0,
                        borderRightWidth: 0,
                    },
                    selectorSytle3: {
                        ...this.state.selectorSytle3,
                        backgroundColor: `#00e599`,
                        borderTopWidth: 0,
                        borderLeftWidth: 0,
                        borderRightWidth: 0,
                    },
                    selectorText1: {
                        ...this.state.selectorText1,
                        color: 'black',
                        fontWeight: 'bold',
                    },
                    selectorText2: {
                        ...this.state.selectorText2,
                        color: 'white',
                        fontWeight: 'bold',
                    },
                    selectorText3: {
                        ...this.state.selectorText3,
                        color: 'white',
                        fontWeight: 'bold',
                    }
                })
                break;
            case 1:
                this.setState({
                    number: 1,
                    selectorSytle1: {
                        ...this.state.selectorSytle1,
                        backgroundColor: `#00e599`,
                        borderTopWidth: 0,
                        borderLeftWidth: 0,
                        borderRightWidth: 0,
                    },
                    selectorSytle2: {
                        ...this.state.selectorSytle2,
                        backgroundColor: "white",
                        borderTopWidth: 2,
                        borderLeftWidth: 2,
                        borderRightWidth: 2,
                    },
                    selectorSytle3: {
                        ...this.state.selectorSytle3,
                        backgroundColor: `#00e599`,
                        borderTopWidth: 0,
                        borderLeftWidth: 0,
                        borderRightWidth: 0,
                    },
                    selectorText1: {
                        ...this.state.selectorText1,
                        color: 'white',
                        fontWeight: 'bold',
                    },
                    selectorText2: {
                        ...this.state.selectorText2,
                        color: 'black',
                        fontWeight: 'bold',
                    },
                    selectorText3: {
                        ...this.state.selectorText3,
                        color: 'white',
                        fontWeight: 'bold',
                    }
                })
                break;
            case 2:
                this.setState({
                    number: 2,
                    selectorSytle1: {
                        ...this.state.selectorSytle1,
                        backgroundColor: `#00e599`,
                        borderTopWidth: 0,
                        borderLeftWidth: 0,
                        borderRightWidth: 0,
                    },
                    selectorSytle2: {
                        ...this.state.selectorSytle2,
                        backgroundColor: `#00e599`,
                        borderTopWidth: 0,
                        borderLeftWidth: 0,
                        borderRightWidth: 0,
                    },
                    selectorSytle3: {
                        ...this.state.selectorSytle3,
                        backgroundColor: "white",
                        borderTopWidth: 2,
                        borderLeftWidth: 2,
                        borderRightWidth: 2,
                    },
                    selectorText1: {
                        ...this.state.selectorText1,
                        color: 'white',
                        fontWeight: 'bold',
                    },
                    selectorText2: {
                        ...this.state.selectorText2,
                        color: 'white',
                        fontWeight: 'bold',
                    },
                    selectorText3: {
                        ...this.state.selectorText3,
                        color: 'black',
                        fontWeight: 'bold',
                    }
                })
                break;
            default:
                break;
        }
    }

    render() {
        return (
            <>
                <AppStateListener navigation={this.props.navigation} />
                <View style={GlobalStyles.container}>
                    <View style={[GlobalStyles.header, { flexDirection: "row", justifyContent: "space-between", alignContent: "center" }]}>
                        <View style={GlobalStyles.headerItem}>
                            <Image source={Renders} alt="Cat"
                                style={{ width: 304 / 8, height: 342 / 8, marginLeft: 20 }}
                            />
                        </View>
                        <View style={GlobalStyles.headerItem}>
                            <Pressable onPress={() => this.props.navigation.navigate('DW')}>
                                <Image source={QR} alt="Cat" style={{ width: 304 / 8, height: 342 / 8 }} />
                            </Pressable>
                        </View>
                        <View style={GlobalStyles.headerItem}>
                            <Pressable style={GlobalStyles.buttonLogoutStyle} onPress={() => this.props.navigation.navigate('Login')}>
                                <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>
                                    Lock
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                    <View style={GlobalStyles.main}>
                        {
                            this.state.number === 0 &&
                            <View style={{ marginHorizontal: 20 }}>
                                {
                                    <Tab1 />
                                }
                            </View>
                        }
                        {
                            this.state.number === 1 &&
                            <View style={{ marginHorizontal: 20 }}>
                                {
                                    <Tab2 />
                                }
                            </View>
                        }
                        {
                            this.state.number === 2 &&
                            <View style={{ marginHorizontal: 20 }}>
                                {
                                    <Tab3 />
                                }
                            </View>
                        }
                    </View>
                    <View style={GlobalStyles.footer}>
                        <Pressable style={[this.state.selectorSytle1, { alignItems: "center" }]}
                            onPress={() => this.selector(0)}>
                            <Icon name="home" size={30} color={this.state.number === 0 ? "black" : "white"} />
                            <Text style={this.state.selectorText1}>
                                Home
                            </Text>
                        </Pressable>
                        <Pressable style={[this.state.selectorSytle2, { alignItems: "center" }]}
                            onPress={() => this.selector(1)}>
                            <Icon name="swap-vert" size={30} color={this.state.number === 1 ? "black" : "white"} />
                            <Text style={this.state.selectorText2}>
                                Swap
                            </Text>
                        </Pressable>
                        <Pressable style={[this.state.selectorSytle3, { alignItems: "center" }]}
                            onPress={() => this.selector(2)}>
                            <Icon name="attach-money" size={30} color={this.state.number === 2 ? "black" : "white"} />
                            <Text style={this.state.selectorText3}>
                                Cash Out
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </>
        );
    }
}

export default Main;
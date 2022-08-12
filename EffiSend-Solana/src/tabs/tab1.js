import React, { Component } from 'react';
import { View, Pressable, Text, Dimensions, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Crypto from '../components/crypto';
import Fiat from '../components/fiat';
import Verify from '../components/verify';
import GlobalStyles from '../styles/styles';
import ContextModule from '../utils/contextModule';
import QR from "../assets/qrImageB.png";
import Icon from 'react-native-vector-icons/MaterialIcons';

class Tab1 extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fiatSelected: "none", // none
            cryptoSelected: "flex", // flex
            depositSelected: "none",
            withdrawSelected: "none",
            verifySelected: "none",
        };
    }
    static contextType = ContextModule;

    async componentDidMount() {

    }

    componentWillUnmount() {

    }

    callback() {

    }

    render() {
        const styles = StyleSheet.create({
            buttonLogoutStyle: {
                backgroundColor: `#00e599`,
                borderRadius: 50,
                padding: 10,
                width: Dimensions.get('window').width * .3,
                alignItems: 'center',
                borderColor: "black",
                borderWidth: 2
            },
            buttonStyle: {
                backgroundColor: '#00e599',
                borderRadius: 0,
                padding: 8,
                marginTop: 8,
                width: Dimensions.get('window').width * .4,
                alignItems: 'center',
            },
            content: {
                alignItems: 'center',
                flex: 1,
                justifyContent: 'flex-start',
                backgroundColor: "#1E2423",
                borderTopWidth: 1,
                borderTopColor: `#00e599`,
            }
        });
        return (
            <SafeAreaView style={{ paddingTop: 10 }}>
                <View style={{ flexDirection: "row", alignItems:"center" }}>
                    <Pressable style={[styles.buttonStyle, {
                        borderTopLeftRadius: 50,
                        borderBottomLeftRadius: 50,
                        borderRightColor:"gray",
                        borderRightWidth:0.5,
                        height:60
                    }]} onPress={() => {
                        if (this.state.cryptoSelected === "none") {
                            this.setState({
                                fiatSelected: "none",
                                cryptoSelected: "flex",
                                depositSelected: "none",
                                withdrawSelected: "none",
                                verifySelected: "none",
                            });
                        }
                        else {
                            this.setState({
                                cryptoSelected: "none",
                            });
                        }
                    }}>
                        <Image source={QR} alt="Cat" style={{ width: 32 * 0.8, height: 26 * 0.8 }} />
                        <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>
                            Crypto
                        </Text>
                    </Pressable>
                    <Pressable style={[styles.buttonStyle, {
                        borderTopRightRadius: 50,
                        borderBottomRightRadius: 50,
                        borderLeftColor:"gray",
                        borderLeftWidth:0.5,
                        height:60
                    }]} onPress={() => {
                        if (this.state.fiatSelected === "none") {
                            this.setState({
                                fiatSelected: "flex",
                                cryptoSelected: "none",
                                depositSelected: "none",
                                withdrawSelected: "none",
                                verifySelected: "none",
                            });
                        }
                        else {
                            this.setState({
                                fiatSelected: "none"
                            });
                        }
                    }}>
                        <Icon name="money" size={24} color={"white"} />
                        <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>
                            Fiat
                        </Text>
                    </Pressable>
                </View>
                <View style={{ display: this.state.fiatSelected }}>
                    {
                        <Fiat />
                    }
                </View>
                <View style={{ display: this.state.cryptoSelected }}>
                    {
                        <Crypto />
                    }
                </View>
                {
                    /*
<Pressable style={GlobalStyles.buttonStyle}
                    onPress={() => {
                        if (this.state.verifySelected === "none") {
                            this.setState({
                                depositSelected: "none",
                                withdrawSelected: "none",
                                fiatSelected: "none",
                                cryptoSelected: "none",
                                verifySelected: "flex",
                            });
                        }
                        else {
                            this.setState({
                                verifySelected: "none",
                            });
                        }
                    }}>
                    <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                        Verify
                    </Text>
                </Pressable>
                <View style={{ display: this.state.verifySelected }}>
                    {
                        //<Verify />
                    }
                </View>
                    */
                }
            </SafeAreaView>
        );
    }
}

export default Tab1;
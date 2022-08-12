import React, { Component } from 'react';
import { View, Pressable, Text, Dimensions } from 'react-native';
import Crypto from '../components/crypto';
import Fiat from '../components/fiat';
import Verify from '../components/verify';
import ContextModule from '../utils/contextModule';

const button = {
    borderColor: "black",
    borderWidth: 2,
    backgroundColor: `#00e599`,
    borderRadius: 50,
    margin: 1,
};

class Tab1 extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fiatSelected: "none",
            cryptoSelected: "none",
            depositSelected: "none",
            withdrawSelected: "flex",
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
        const input = {
            borderRadius: 5,
            borderColor: '#353abf',
            borderWidth: 1,
        }
        return (
            <View style={{ paddingTop: 10 }}>
                <Pressable style={button}
                    onPress={() => {
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
                    <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ color: "white", fontSize: 24, padding: 8, fontWeight: "bold" }}>
                            Fiat Account
                        </Text>
                    </View>
                </Pressable>
                <View style={{ display: this.state.fiatSelected }}>
                    {
                        //<Fiat />
                    }
                </View>
                <Pressable style={button}
                    onPress={() => {
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
                    <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ color: "white", fontSize: 24, padding: 8, fontWeight: "bold" }}>
                            Crypto Account
                        </Text>
                    </View>
                </Pressable>
                <View style={{ display: this.state.cryptoSelected }}>
                    {
                        <Crypto />
                    }
                </View>
                <Pressable style={button}
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
                    <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ color: "white", fontSize: 24, padding: 8, fontWeight: "bold" }}>
                            Verify
                        </Text>
                    </View>
                </Pressable>
                <View style={{ display: this.state.verifySelected }}>
                    {
                        //<Verify />
                    }
                </View>
            </View>
        );
    }
}

export default Tab1;
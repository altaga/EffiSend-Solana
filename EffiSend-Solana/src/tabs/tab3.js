import React, { Component } from 'react';
import { View, Pressable, Dimensions, Linking, TextInput, StyleSheet } from 'react-native';
import { Text } from 'react-native-elements';
import ContextModule from '../utils/contextModule';
import front from "../assets/card-front.png"
import back from "../assets/card-back.png"
import CreditCardDisplay from 'react-native-credit-card-display';
import reactAutobind from 'react-autobind';

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

class Tab3 extends Component {
    constructor(props) {
        super(props);
        this.state = {
            cvc: randomNumber(111, 999),
            expiry: ' ',
            name: 'EffiSendCard',
            number: "400005665566",
            imageFront: front,
            imageBack: back,
            cardHolder: true,
            amount: '',
            redirect_url: '',
            creating: false,
            names: '',
            clabe: '',
            focused: false,
        }
        this.axios = require('axios');
        this.CancelToken = require('axios').CancelToken;
        this.source = this.CancelToken.source();
        reactAutobind(this)
    }

    static contextType = ContextModule;

    componentDidMount() {
        var config = {
            method: 'get',
            url: `https://api.stripe.com/v1/customers/${this.context.value.fiatWallet}/payment_methods?type=card`,
            headers: {
                'Authorization': this.context.value.fiatBearer
            },
            cancelToken: this.source.token
        };

        this.axios(config)
            .then((response) => {
                console.log(response.data.data[0].card);
                this.setState({
                    expiry: response.data.data[0].card.exp_month.toString() + "/" + response.data.data[0].card.exp_year.toString().substring(2, 4),
                    number: this.state.number + response.data.data[0].card.last4
                })
            })
            .catch(function (error) {
                console.log(error);
            });

    }

    componentWillUnmount() {
        this.source.cancel("Component got unmounted");
    }

    createTransfer() {
        var qs = require('qs');
        var data = qs.stringify({
            'success_url': 'https://example.com/success',
            'cancel_url': 'https://example.com/cancel',
            'mode': 'setup',
            'payment_method_types[]': 'card'
        });
        var config = {
            method: 'post',
            url: 'https://api.stripe.com/v1/checkout/sessions',
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
                    redirect_url: response.data.url,
                    creating: false
                });
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
        const button = {
            borderColor: "black",
            backgroundColor: `#00e599`,
            borderRadius: 50,
            borderWidth: 2,
        };

        const input = {
            borderRadius: 5,
            borderColor: '#00e599',
            borderWidth: 1,
        }

        const inputText = {
            color: 'black',
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
                color: 'black',
            },
            text2: {
                fontSize: 24,
                textAlign: 'center',
                color: 'black',
            },
            inputText: {
                color: 'black',
            },
        });

        return (
            <View style={{ paddingTop: 32, width: Dimensions.get('window').width * 0.9, flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                {
                    this.state.cardHolder ?
                        <View style={{ height: Dimensions.get("window").height * 0.24 }}>
                            <View style={{ flex: 1 }}>
                                <CreditCardDisplay
                                    number={this.state.number}
                                    cvc={this.state.cvc}
                                    expiration={this.state.expiry}
                                    name={this.state.name}
                                    since="2004"
                                />
                            </View>
                        </View>
                        :
                        <Pressable style={button}
                            onPress={() => {
                                this.setState({ cardHolder: true });
                            }}>
                            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                                <Text style={{ color: "white", fontSize: 24, padding: 8 }}>
                                    Issue Virtual Card
                                </Text>
                            </View>
                        </Pressable>
                }
                {
                    hr()
                }
                <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "white", fontSize: 24, padding: 8 }}>
                        Card Transfer
                    </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "white", fontSize: 24, padding: 8 }}>
                        Amount
                    </Text>
                </View>
                <TextInput
                    placeholder='Amount USD'
                    style={[styles.input2, { color: "#000" }]}
                    keyboardType="number-pad"
                    value={this.state.amount}
                    onChangeText={(text) => {
                        if (isNumeric(text) || text === "" || text === "0." || text === "0..") {
                            if (text === "") {
                                this.setState({
                                    amount: "0",
                                });
                            }
                            else if (text === "0.") {
                                this.setState({
                                    amount: "0.",
                                });
                            }
                            else if (text === "0..") {
                                this.setState({
                                    amount: "0",
                                });
                            }
                            else if (text.substring(text.length - 1) === ".") {
                                this.setState({
                                    amount: text,
                                });
                            }
                            else {
                                if (parseFloat(text) >= parseFloat(this.context.value.ewalletBalance)) {
                                    this.setState({
                                        amount: parseFloat(this.context.value.ewalletBalance).toString(),
                                    });
                                }
                                else {
                                    this.setState({
                                        amount: parseFloat(text).toString(),
                                    });
                                }
                            }
                        }
                    }}
                />
                <Text>
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                    <Pressable
                        disabled={this.state.creating}
                        style={button}
                        onPress={() => {
                            if (this.state.redirect_url === '') {
                                this.setState({ creating: true });
                                this.createTransfer();
                            } else {
                                console.log("redirecting");
                                Linking.openURL(this.state.redirect_url);
                            }
                        }}>
                        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                            <Text style={{ color: "white", fontSize: 24, padding: 8 }}>
                                {
                                    this.state.redirect_url === '' ?
                                        <>
                                            {
                                                !this.state.creating ? "Create Transfer URL" : "Creating..."
                                            }
                                        </>
                                        :
                                        <>
                                            {
                                                "Open Transfer URL"
                                            }
                                        </>
                                }
                            </Text>
                        </View>
                    </Pressable>
                </View>
            </View>
        );
    }
}

export default Tab3;
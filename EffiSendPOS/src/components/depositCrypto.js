import React, { Component } from 'react';
import { Dimensions, Text, View, Pressable } from 'react-native';
import ContextModule from '../utils/contextModule';
import QRCode from 'react-native-qrcode-svg';
import GlobalStyles from '../styles/styles';

class DepositCrypto extends Component {
    static contextType = ContextModule;
    render() {
        return (
            <>
                <View style={{ flex: 1, flexDirection: 'column', justifyContent: "space-evenly", alignItems: "center" }}>
                    <View>
                        <Text style={{ fontSize: 24, fontWeight: "bold", color: "white", textAlign: "center" }}>
                            Receive Solana{"\n"}or SPL Token
                        </Text>
                    </View>
                    <QRCode
                        value={this.context.value.wallet.publicKey.toBase58()}
                        size={Dimensions.get("window").height / 3}
                        quietZone={10}
                        ecl="H"
                    />
                    <Text style={{ fontSize: 24, fontWeight: "bold", color: "white", textAlign: "center" }}>
                            {
                                this.context.value.wallet.publicKey.toBase58().substring(0, 17) + "\n" + this.context.value.wallet.publicKey.toBase58().substring(this.context.value.wallet.publicKey.toBase58().length - 17, this.context.value.wallet.publicKey.toBase58().length)
                            }
                        </Text>
                    <Pressable style={GlobalStyles.buttonStyle} onPress={() => {
                        this.props.callback()
                    }}>
                        <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                            Cancel
                        </Text>
                    </Pressable>
                </View>
            </>
        );
    }
}

export default DepositCrypto;
import React, { Component } from 'react';
import { Dimensions, Text, View, Pressable } from 'react-native';
import ContextModule from '../utils/contextModule';
import QRCode from 'react-native-qrcode-svg';
import GlobalStyles from '../styles/styles';

class DepositFiat extends Component {
    static contextType = ContextModule;
    render() {
        return (
            <>
                <View style={{ flex: 1, flexDirection: 'column', justifyContent: "space-evenly", alignItems: "center" }}>
                    <View>
                        <Text style={{ fontSize: 24, fontWeight: "bold", color: "white", textAlign: "center" }}>
                            Receive USD
                        </Text>
                    </View>
                    <QRCode
                        value={this.context.value.fiatWallet}
                        size={Dimensions.get("window").height / 3}
                        quietZone={10}
                        ecl="H"
                    />
                    <Text style={{ fontSize: 24, fontWeight: "bold", color: "white", textAlign: "center" }}>
                        Pay with QR
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

export default DepositFiat;
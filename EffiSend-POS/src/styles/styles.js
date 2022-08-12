import { Dimensions, StyleSheet } from 'react-native';

const GlobalStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    input: {
        height: 40,
        borderRadius: 5,
        width: '84%',
        borderColor: '#00e599',
        borderWidth: 2,
        color: 'black',
        alignSelf: 'center',
    },
    buttonStyle: {
        backgroundColor: '#00e599',
        borderRadius: 50,
        padding: 10,
        width: Dimensions.get('window').width * .8,
        alignItems: 'center',
        borderColor: 'black',
        borderWidth: 2,
    },
    buttonStylePay: {
        backgroundColor: '#00e599',
        padding: 10,
        width: Dimensions.get('window').width * .8,
        borderRadius:50,
        alignItems: 'center',
        borderColor: 'black',
        borderWidth: 0.5,
    },
    buttonStyleDisabel: {
        backgroundColor: '#5c8074',
        borderRadius: 50,
        padding: 10,
        width: Dimensions.get('window').width * .8,
        alignItems: 'center',
        borderColor: 'black',
        borderWidth: 2,
    },
    buttonStyleLogin: {
        backgroundColor: '#00e599',
        borderRadius: 50,
        padding: 10,
        width: Dimensions.get('window').width * .8,
        alignItems: 'center',
        borderColor: 'black',
        borderWidth: 2,
    },
    buttonStyleLoginDisabel: {
        backgroundColor: '#5c8074',
        borderRadius: 50,
        padding: 10,
        width: Dimensions.get('window').width * .8,
        alignItems: 'center',
        borderColor: 'black',
        borderWidth: 2,
    },
    buttonLogoutStyle: {
        backgroundColor: `#00e599`,
        borderRadius: 50,
        padding: 10,
        width: Dimensions.get('window').width * .4,
        alignItems: 'center',
        borderColor: "black",
        borderWidth: 2
    },
    mainView: {
        borderTopWidth: 1,
        borderTopColor: `#00e599`,
        backgroundColor: "#1E2423",
        flex: 2,
    },
    container: {
        flexDirection: 'column',
        justifyContent: "space-between",
        alignItems: 'center',
        height: Dimensions.get("window").height,
        width: Dimensions.get("window").width,
        backgroundColor: "#1E2423",
    },
    header: {
        height: 60,
        width: Dimensions.get("window").width,
        backgroundColor: "#161B19",
        borderBottomWidth: 1,
        borderBottomColor: `#00e599`,
        backgroundColor: "#1E2423",
    },
    headerItem: {
        alignItems: 'center',
    },
    main: {
        height: Dimensions.get("window").height-(60+80),
        paddingBottom:10,
    },
    footer: {
        width: Dimensions.get("window").width,
        height: 80,
        backgroundColor: "#1E2423",
        flexDirection: "row"
    }
});

export default GlobalStyles;
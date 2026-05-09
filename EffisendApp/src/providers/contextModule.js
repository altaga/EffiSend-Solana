import React from "react";
import { blockchains } from "../core/chains";

const ContextModule = React.createContext();

class ContextProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: {
        // Addresses and Balances
        addresses: {
          evm: "",
          hedera: "",
          solana: "",
          starknet: "",
        },
        balances: blockchains.map((chain) => chain.tokens.map(() => 0)),
        usdConversion: blockchains.map((chain) => chain.tokens.map(() => 1)),
        // NFTS
        nfts: [],
        // Cards
        cards: [],
        // Utils
        starter: false,
        pincode: null,
        user: "",
        // Chat


        chatGeneral: [
          {
            message:
              "Welcome to Tokyo Dome City. I'm DeSmond, your multilingual AI companion. \n\nLooking for the best dining spots, attraction details, or directions? \n\nI'm ready to assist—just tell me what you need.",
            type: "system",
            time: Date.now(),
            tool: "",
          },
        ],
      },
    };
  }

  setValue = (value, then = () => { }) => {
    this.setState(
      {
        value: {
          ...this.state.value,
          ...value,
        },
      },
      () => then(),
    );
  };

  setValueAsync = async (value, then = () => { }) => {
    await new Promise((resolve) =>
      this.setState(
        {
          value: {
            ...this.state.value,
            ...value,
          },
        },
        () => resolve(),
      ),
    );
    then();
  };

  render() {
    const { children } = this.props;
    const { value } = this.state;
    const { setValue } = this;

    return (
      <ContextModule.Provider value={{ value, setValue }}>
        {children}
      </ContextModule.Provider>
    );
  }
}

export { ContextProvider };
export const ContextConsumer = ContextModule.Consumer;
export default ContextModule;

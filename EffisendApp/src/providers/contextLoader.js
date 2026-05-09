import { Fragment, useCallback, useContext, useEffect } from "react";
import { getAsyncStorageValue, getEncryptedStorageValue } from "../core/utils";
import ContextModule from "./contextModule";

export default function ContextLoader() {
  const context = useContext(ContextModule);
  const checkStarter = useCallback(async () => {
    //await nukeStorage();

    const storedAddresses = await getAsyncStorageValue("addresses");
    const storedBalances = await getAsyncStorageValue("balances");
    const storedUsd = await getAsyncStorageValue("usdConversion");
    const storedNfts = await getAsyncStorageValue("nfts");
    const storedCards = await getEncryptedStorageValue("cards");
    const storedPincode = await getEncryptedStorageValue("pincode");
    const storedUser = await getEncryptedStorageValue("user");

    if (storedAddresses === null) {
      context.setValue({ starter: true });
      return;
    }

    const isConsistent =
      Object.keys(storedAddresses).length ===
      Object.keys(context.value.addresses).length &&
      storedBalances?.length === context.value.balances.length &&
      storedUsd?.length === context.value.usdConversion.length;

    if (isConsistent) {
      context.setValue({
        addresses: storedAddresses,
        balances: storedBalances,
        usdConversion: storedUsd,
        nfts: storedNfts,
        cards: storedCards,
        pincode: storedPincode,
        user: storedUser,
        starter: true,
      });
    } else {
      context.setValue({
        ...context.value,
        starter: true,
      });
    }
  }, [context]);

  useEffect(() => {
    checkStarter();
  }, []);

  return <Fragment />;
}

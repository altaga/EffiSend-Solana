import { useEffect } from "react";
import MyMap from "../../../components/map";

const Tab2 = ({ isActive }) => {
  useEffect(() => {
    if (isActive) {
      console.log("Tab 2 is active");
    }
  }, [isActive]);

  return <MyMap />;
};

export default Tab2;

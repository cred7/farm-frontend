import React from "react";
import {
  Image,
  ImageStyle,
  StyleProp,
  useColorScheme,
  ViewProps,
} from "react-native";
import Logo from "../assets/favicon.png";
type ppp = {
  style?: StyleProp<ImageStyle>;
} & ViewProps;
const ThemeLogo = ({ style, ...props }: ppp) => {
  const colorScheme = useColorScheme();
  const logo = colorScheme === "dark" ? Logo : Logo;
  return <Image source={logo} {...props} style={style} />;
};

export default ThemeLogo;

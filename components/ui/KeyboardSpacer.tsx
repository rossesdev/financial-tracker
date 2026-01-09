import React, { useEffect, useMemo } from "react";
import { Animated, Keyboard, Platform } from "react-native";

const KeyboardSpacer = () => {
  const height = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: any) => {
      const toValue = e?.endCoordinates?.height + 10 || 0;
      Animated.timing(height, {
        toValue,
        duration: 250,
        useNativeDriver: false,
      }).start();
    };

    const onHide = () => {
      Animated.timing(height, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [height]);

  return <Animated.View style={{ height }} pointerEvents="none" />;
};

export default KeyboardSpacer;

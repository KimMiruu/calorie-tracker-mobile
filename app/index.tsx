// app/index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        // key sama seperti yang dipakai di Home & Login
        const storedUser = await AsyncStorage.getItem("loggedInUser");
        setLoggedIn(!!storedUser);
      } catch (e) {
        console.log("error read loggedInUser", e);
      } finally {
        setReady(true);
      }
    };

    checkLogin();
  }, []);

  // lagi cek AsyncStorage → tampil loading
  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  // belum login → ke login
  if (!loggedIn) {
    return <Redirect href="/login" />;
  }

  // sudah login → ke tab utama (Home = app/(tabs)/index.tsx)
  return <Redirect href="/(tabs)" />;
}

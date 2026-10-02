import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, Modal, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native'
import COLORS from '../constants/colors'

// Themed, app-styled replacement for the OS Alert.alert.
// API mirrors Alert.alert: alert(title, message?, buttons?, options?)
//   buttons: [{ text, style?: 'default'|'cancel'|'destructive', onPress? }]
// Two ways to call:
//   1) hook:        const alert = useAlert(); alert("Saved", "Profile updated");
//   2) imperative:  import { showAlert } from '.../AppAlert'; showAlert("Error", msg);
//      (works outside React components too; falls back to no-op before mount)

const AlertContext = createContext(() => {});

export const useAlert = () => useContext(AlertContext);

// module-level handle so non-hook call sites can trigger the themed alert
let _alertFn = null;
export const showAlert = (...args) => {
  if (_alertFn) _alertFn(...args);
};

export function AlertProvider({ children }) {
  const [state, setState] = useState(null); // { title, message, buttons, cancelable }
  const resolvingRef = useRef(false);

  const close = useCallback(() => {
    resolvingRef.current = false;
    setState(null);
  }, []);

  const alert = useCallback((title, message, buttons, options) => {
    const btns = Array.isArray(buttons) && buttons.length ? buttons : [{ text: "OK" }];
    setState({
      title: title || "",
      message: message || "",
      buttons: btns,
      cancelable: options?.cancelable !== false,
    });
  }, []);

  // expose the imperative handle while this provider is mounted
  useEffect(() => {
    _alertFn = alert;
    return () => { if (_alertFn === alert) _alertFn = null; };
  }, [alert]);

  const handlePress = (btn) => {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    close();
    // let the modal start closing before running the callback
    requestAnimationFrame(() => btn?.onPress && btn.onPress());
  };

  const onRequestClose = () => {
    if (!state) return;
    if (state.cancelable) {
      const cancelBtn = state.buttons.find((b) => b.style === "cancel");
      handlePress(cancelBtn || {});
    }
  };

  const { width } = useWindowDimensions();
  // responsive: stack buttons when there are 3+, or on narrow screens with 2 longer buttons
  const stacked = state ? state.buttons.length >= 3 : false;

  return (
    <AlertContext.Provider value={alert}>
      {children}
      <Modal
        visible={!!state}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onRequestClose}
      >
        <View style={styles.overlay}>
          <View style={[styles.card, { maxWidth: Math.min(400, width - 48) }]}>
            {!!state?.title && <Text style={styles.title}>{state.title}</Text>}
            {!!state?.message && <Text style={styles.message}>{state.message}</Text>}

            <View style={[styles.buttonRow, stacked && styles.buttonCol]}>
              {state?.buttons.map((btn, i) => {
                const isDestructive = btn.style === "destructive";
                const isCancel = btn.style === "cancel";
                const variant = isDestructive ? styles.btnDestructive
                  : isCancel ? styles.btnCancel
                  : styles.btnPrimary;
                const textVariant = isDestructive ? styles.btnTextDestructive
                  : isCancel ? styles.btnTextCancel
                  : styles.btnTextPrimary;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.btn, variant, !stacked && { flex: 1 }]}
                    onPress={() => handlePress(btn)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.btnText, textVariant]} numberOfLines={1}>
                      {btn.text || "OK"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 8,
    fontFamily: "GeneralSans-Variable",
  },
  message: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: "GeneralSans-Variable",
  },
  buttonRow: { flexDirection: "row", gap: 10 },
  buttonCol: { flexDirection: "column" },
  btn: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: COLORS.button },
  btnCancel: { backgroundColor: COLORS.inputBackground, borderWidth: 1, borderColor: COLORS.border },
  btnDestructive: { backgroundColor: "#a32d2d" },
  btnText: { fontSize: 15, fontWeight: "600", fontFamily: "GeneralSans-Variable" },
  btnTextPrimary: { color: COLORS.white },
  btnTextCancel: { color: COLORS.black },
  btnTextDestructive: { color: COLORS.white },
});

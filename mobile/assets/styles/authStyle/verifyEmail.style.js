import { StyleSheet } from "react-native";
import COLORS from "../../../constants/colors";

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.cards,
    borderRadius: 20,
    padding: 28,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  title: {
    fontFamily: "GeneralSans-Variable",
    fontSize: 26,
    color: COLORS.black,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
  subtitle: {
    fontFamily: "GeneralSans-Variable",
    fontSize: 14,
    color: COLORS.placeholderText,
    textAlign: "center",
    lineHeight: 20,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  otpInput: {
    fontFamily: "GeneralSans-Variable",
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.black,
    width: "100%",
    height: "100%",
  },
  button: {
    backgroundColor: COLORS.button,
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    shadowColor: COLORS.button,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    fontFamily: "GeneralSans-Variable",
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  timerText: {
    fontFamily: "GeneralSans-Variable",
    fontSize: 13,
    color: COLORS.gray,
  },
  resendLink: {
    fontFamily: "GeneralSans-Variable",
    fontSize: 13,
    color: COLORS.button,
    fontWeight: "600",
  },
});

export default styles;
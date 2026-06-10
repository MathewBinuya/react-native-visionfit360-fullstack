import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";


const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.cards,
    borderRadius: 16,
    padding: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  step: { fontSize: 14, marginBottom: 8, color: COLORS.button, fontFamily: "GeneralSans-Variable", },
  title: { fontSize: 20, fontFamily: "GeneralSans-Variable", color: COLORS.black, marginBottom: 8, },
  resultCard: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginVertical: 20,
  },
  resultLabel: { fontSize: 14, color: COLORS.black, fontFamily: "GeneralSans-Variable", },
  resultValue: {
    fontSize: 42,
    fontWeight: "600",
    marginVertical: 6,
    fontFamily: "GeneralSans-Variable",
  },
  category: { fontSize: 15, fontWeight: "600", fontFamily: "GeneralSans-Variable", },
  recap: {
    marginTop: 16,
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  recapRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, },
  recapLabel: { fontSize: 13, color: COLORS.black, fontFamily: "GeneralSans-Variable", },
  recapValue: { fontSize: 13, color: COLORS.black, fontFamily: "GeneralSans-Variable", },
  empty: {
    color: COLORS.placeholderText,
    textAlign: "center",
    marginVertical: 40,
    fontFamily: "GeneralSans-Variable",
  },
  button: {
    backgroundColor: COLORS.button,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    fontFamily: "GeneralSans-Variable",
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default styles;
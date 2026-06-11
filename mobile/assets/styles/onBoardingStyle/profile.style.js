import { StyleSheet } from "react-native";
import COLORS from "../../../constants/colors";


const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: COLORS.background,
  },
  scrollViewStyle: {
    alignItems: "center",
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
    marginTop: -24,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontFamily: "GeneralSans-Variable",
    color: COLORS.black,
    textAlign: "left",
    marginBottom: 8,
  },
  subtitle: {  fontSize: 16, color: COLORS.black, fontFamily: "GeneralSans-Variable", },
  formContainer: { marginBottom: 20, },
  inputGroup: { marginBottom: 10, },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: COLORS.black,
    textAlign: "left",
    fontFamily: "GeneralSans-Variable",
  },
  inputRowContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: 150,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: COLORS.black,
    fontFamily: "GeneralSans-Variable",
  },
  rowContainer: { flexDirection: "row", gap: 5, },
  genderRow: {
    flexDirection: "row",
    gap: 8,
  },
  genderPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: COLORS.inputBackground,
  },
  genderPillActive: { backgroundColor: COLORS.button, borderColor: COLORS.button, },
  genderText: { fontSize: 14, color: COLORS.black, fontFamily: "GeneralSans-Variable", },
  genderTextActive: {
    color: COLORS.white,
    fontFamily: "GeneralSans-Variable",
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: COLORS.button,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontFamily: "GeneralSans-Variable",
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});


export default styles;
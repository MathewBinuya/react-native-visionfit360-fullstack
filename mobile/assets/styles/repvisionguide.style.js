import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: COLORS.black, fontFamily: "GeneralSans-Variable" },
  iconWrap: {
    alignSelf: "center", width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.button + "18", justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.black, textAlign: "center", fontFamily: "GeneralSans-Variable" },
  group: { fontSize: 14, color: COLORS.placeholderText, textAlign: "center", marginTop: 4, marginBottom: 24, fontFamily: "GeneralSans-Variable" },
  tipsBox: {
    backgroundColor: COLORS.cards, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    padding: 18, marginBottom: 24,
  },
  tipsHeading: { fontSize: 15, fontWeight: "600", color: COLORS.black, marginBottom: 14, fontFamily: "GeneralSans-Variable" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  tipNumber: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.button,
    justifyContent: "center", alignItems: "center", marginRight: 12, marginTop: 1,
  },
  tipNumberText: { color: COLORS.white, fontSize: 13, fontWeight: "700", fontFamily: "GeneralSans-Variable" },
  tipText: { flex: 1, fontSize: 14, color: COLORS.black, lineHeight: 20, fontFamily: "GeneralSans-Variable" },
  startBtn: {
    flexDirection: "row", backgroundColor: COLORS.button, borderRadius: 12, height: 54,
    justifyContent: "center", alignItems: "center", gap: 8,
  },
  startText: { color: COLORS.white, fontSize: 16, fontWeight: "600", fontFamily: "GeneralSans-Variable" },
});

export default styles;
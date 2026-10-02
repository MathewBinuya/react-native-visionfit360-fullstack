import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // responsive: full width on phones, centered + capped on tablets
  scrollContent: { padding: 20, paddingBottom: 32, width: "100%", maxWidth: 600, alignSelf: "center" },
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

  // unknown-key banner
  warnBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#854f0b18", borderRadius: 10, padding: 12, marginBottom: 16,
  },
  warnText: { flex: 1, fontSize: 13, color: "#854f0b", fontFamily: "GeneralSans-Variable" },

  // equipment chip
  metaRow: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.button + "18", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  metaChipText: { fontSize: 13, fontWeight: "600", color: COLORS.button, fontFamily: "GeneralSans-Variable" },

  // demo media / placeholder
  demoBox: {
    alignSelf: "center", borderRadius: 16, overflow: "hidden", marginBottom: 8,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: "center", alignItems: "center",
  },
  demoImage: { width: "100%", height: "100%" },
  demoPlaceholder: { justifyContent: "center", alignItems: "center", gap: 8 },
  demoPlaceholderText: { fontSize: 14, color: COLORS.placeholderText, fontFamily: "GeneralSans-Variable" },
  demoRetryText: { fontSize: 13, fontWeight: "600", color: COLORS.button, fontFamily: "GeneralSans-Variable" },
  creditText: { fontSize: 11, color: COLORS.placeholderText, textAlign: "center", marginBottom: 16, fontFamily: "GeneralSans-Variable" },

  // section heading + muscle chips
  sectionHeading: { fontSize: 13, color: COLORS.black, opacity: 0.6, marginTop: 16, marginBottom: 8, fontFamily: "GeneralSans-Variable" },
  muscleWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  muscleChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.inputBackground, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  muscleChipText: { marginLeft: 6, fontSize: 13, fontWeight: "600", color: COLORS.button, fontFamily: "GeneralSans-Variable" },

  // bullet for non-numbered lists (tips, setup)
  bullet: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.button,
    marginRight: 14, marginLeft: 9, marginTop: 7,
  },

  // border-colour legend
  legendRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  legendDot: { width: 14, height: 14, borderRadius: 7, marginRight: 12, marginTop: 2 },
});

export default styles;
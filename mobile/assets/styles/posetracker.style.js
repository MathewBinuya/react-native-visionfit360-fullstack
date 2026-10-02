import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  formBar: {
    paddingVertical: 8,
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.cards,
  },
  formGood: { backgroundColor: "#0f6e5622" },   // green tint
  formBad: { backgroundColor: "#a32d2d22" },     // red tint
  formBarText: { fontSize: 14, fontWeight: "600", color: COLORS.black, fontFamily: "GeneralSans-Variable" },

  permText: { fontSize: 15, color: COLORS.black, textAlign: "center", marginBottom: 16, fontFamily: "GeneralSans-Variable" },
  backBtn: { backgroundColor: COLORS.button, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 30 },
  backText: { color: COLORS.white, fontWeight: "600", fontFamily: "GeneralSans-Variable" },

  headerTitle: { fontSize: 17, fontWeight: "600", color: COLORS.black, textTransform: "capitalize", fontFamily: "GeneralSans-Variable" },
  howBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.button, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  howBtnText: { color: COLORS.white, fontSize: 14, fontWeight: "600", fontFamily: "GeneralSans-Variable" },
  webviewWrap: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  webview: { flex: 1, backgroundColor: "transparent" },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 8,
  },
  counterBox: { alignItems: "center" },
  counterLabel: { fontSize: 13, color: COLORS.placeholderText, fontFamily: "GeneralSans-Variable" },
  counterValue: { fontSize: 40, fontWeight: "700", color: COLORS.button, fontFamily: "GeneralSans-Variable" },
  progressText: { fontSize: 16, color: COLORS.placeholderText, fontFamily: "GeneralSans-Variable" },
  postureText: { textAlign: "center", color: COLORS.placeholderText, fontSize: 13, marginBottom: 8, fontFamily: "GeneralSans-Variable" },
  finishBtn: {
    backgroundColor: COLORS.button,
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    margin: 16,
  },
  
  finishText: { color: COLORS.white, fontSize: 15, fontWeight: "600", fontFamily: "GeneralSans-Variable" },

  // first-use popup overlay (reuses the app's modal design language)
  popupOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 24,
    zIndex: 90, elevation: 90,
  },
  popupCard: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 24,
    width: "100%", maxWidth: 400, alignItems: "center",
  },
  popupIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.button,
    justifyContent: "center", alignItems: "center", marginBottom: 14,
  },
  popupTitle: {
    fontSize: 18, fontWeight: "700", color: COLORS.black, textAlign: "center",
    marginBottom: 10, fontFamily: "GeneralSans-Variable",
  },
  popupText: {
    fontSize: 14, color: COLORS.gray, lineHeight: 20, textAlign: "center",
    marginBottom: 22, fontFamily: "GeneralSans-Variable",
  },
  popupBtn: {
    backgroundColor: COLORS.button, borderRadius: 12, paddingVertical: 14,
    alignItems: "center", alignSelf: "stretch",
  },
  popupBtnText: { color: COLORS.white, fontSize: 15, fontWeight: "700", fontFamily: "GeneralSans-Variable" },
});

export default styles;
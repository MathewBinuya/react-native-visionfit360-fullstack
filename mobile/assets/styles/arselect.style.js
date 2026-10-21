import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: COLORS.black, fontFamily: "GeneralSans-Variable" },
  subtitle: {
    fontSize: 13,
    color: COLORS.placeholderText,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontFamily: "GeneralSans-Variable",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.cards,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 22,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.black,
    marginTop: 8,
    fontFamily: "GeneralSans-Variable",
  },
  cardGroup: {
    fontSize: 11,
    color: COLORS.placeholderText,
    marginTop: 2,
    fontFamily: "GeneralSans-Variable",
  },
  howRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  howText: { fontSize: 11, fontWeight: "600", color: COLORS.button, fontFamily: "GeneralSans-Variable" },
  soon: { fontSize: 10, color: COLORS.placeholderText, marginTop: 2, fontFamily: "GeneralSans-Variable" },

  // attribution for the bundled exercise icons (CC BY-SA 4.0)
  credit: {
    width: "100%",
    textAlign: "center",
    fontSize: 10,
    lineHeight: 14,
    color: COLORS.placeholderText,
    marginTop: 8,
    paddingHorizontal: 8,
    fontFamily: "GeneralSans-Variable",
  },

  // floating "scroll for more" cue
  scrollCue: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.button,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  scrollCueText: { fontSize: 12, fontWeight: "600", color: COLORS.white, fontFamily: "GeneralSans-Variable" },
});

export default styles;
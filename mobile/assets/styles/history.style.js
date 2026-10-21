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
  empty: { color: COLORS.placeholderText, textAlign: "center", marginTop: 40, fontFamily: "GeneralSans-Variable" },

  // sort toggle (newest / oldest)
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBackground,
  },
  sortText: { fontSize: 12, fontWeight: "600", color: COLORS.button, fontFamily: "GeneralSans-Variable" },

  // date section header
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.placeholderText,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 2,
    fontFamily: "GeneralSans-Variable",
  },

  historyCard: {
    backgroundColor: COLORS.cards,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.inputBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: COLORS.black, fontFamily: "GeneralSans-Variable" },
  cardMeta: { fontSize: 12.5, color: COLORS.placeholderText, marginTop: 2, fontFamily: "GeneralSans-Variable" },

  // glanceable summary chips
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.inputBackground,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  chipWarn: { backgroundColor: "#FFF4E5" },
  chipText: { fontSize: 12, color: COLORS.button, fontWeight: "600", fontFamily: "GeneralSans-Variable" },

  // expanded detail (each exercise block's top border is the divider)
  detail: { marginTop: 4 },
  exerciseBlock: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    marginTop: 10,
  },
  exerciseName: { fontSize: 14, fontWeight: "600", color: COLORS.black, marginBottom: 4, fontFamily: "GeneralSans-Variable" },
  setLine: { fontSize: 13, color: COLORS.placeholderText, paddingVertical: 1, fontFamily: "GeneralSans-Variable" },
});

export default styles;

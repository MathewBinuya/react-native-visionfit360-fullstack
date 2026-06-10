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

  historyCard: {
    backgroundColor: COLORS.cards,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: COLORS.black, fontFamily: "GeneralSans-Variable" },
  cardDate: { fontSize: 12, color: COLORS.placeholderText, marginTop: 2, fontFamily: "GeneralSans-Variable" },

  volumeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBackground,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  volumeText: { fontSize: 12, color: COLORS.button, marginLeft: 6, fontWeight: "600", fontFamily: "GeneralSans-Variable" },

  exerciseBlock: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 4,
  },
  exerciseName: { fontSize: 14, fontWeight: "600", color: COLORS.black, marginBottom: 4, fontFamily: "GeneralSans-Variable" },
  setLine: { fontSize: 13, color: COLORS.placeholderText, paddingVertical: 1, fontFamily: "GeneralSans-Variable" },
});

export default styles;
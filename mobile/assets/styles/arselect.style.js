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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: "47%",
    backgroundColor: COLORS.cards,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 22,
    alignItems: "center",
    marginBottom: 12,
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
  soon: { fontSize: 10, color: COLORS.placeholderText, marginTop: 2, fontFamily: "GeneralSans-Variable" },
});

export default styles;
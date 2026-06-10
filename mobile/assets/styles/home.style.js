import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  hello: { fontSize: 13, color: COLORS.placeholderText, fontFamily: "GeneralSans-Variable" },
  username: { fontSize: 18, fontWeight: "600", color: COLORS.black, fontFamily: "GeneralSans-Variable" },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.button,
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: COLORS.white, fontSize: 16, fontWeight: "600", fontFamily: "GeneralSans-Variable" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.cards,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  statLabel: { fontSize: 12, color: COLORS.placeholderText, fontFamily: "GeneralSans-Variable" },
  statValue: { fontSize: 22, fontWeight: "600", color: COLORS.black, marginTop: 2, fontFamily: "GeneralSans-Variable" },
  statUnit: { fontSize: 12, color: COLORS.placeholderText, fontWeight: "400" },

  bmiCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.cards,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },
  bmiLabel: { fontSize: 12, color: COLORS.placeholderText, fontFamily: "GeneralSans-Variable" },
  bmiValue: { fontSize: 20, fontWeight: "600", color: COLORS.black, marginTop: 2, fontFamily: "GeneralSans-Variable" },
  bmiBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 8 },
  bmiBadgeText: { fontSize: 12, fontWeight: "600", fontFamily: "GeneralSans-Variable" },

  trackerCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.button,
    borderRadius: 16, padding: 18, marginBottom: 12,
  },
  trackerTitle: { color: COLORS.white, fontSize: 15, fontWeight: "600", fontFamily: "GeneralSans-Variable" },
  trackerSub: { color: COLORS.white, fontSize: 12, opacity: 0.85, fontFamily: "GeneralSans-Variable" },

  placeholderRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  placeholder: {
    flex: 1, backgroundColor: COLORS.cards,
    borderRadius: 12, padding: 16, alignItems: "center",
    borderWidth: 1, borderColor: COLORS.border, opacity: 0.7,
  },
  placeholderLabel: { fontSize: 13, color: COLORS.placeholderText, marginTop: 8, fontFamily: "GeneralSans-Variable" },
  placeholderSub: { fontSize: 11, color: COLORS.placeholderText, marginTop: 2, fontFamily: "GeneralSans-Variable" },
  historyButton: {
    flex: 1, backgroundColor: COLORS.cards,
    borderRadius: 12, padding: 16, alignItems: "center",
    borderWidth: 1, borderColor: COLORS.border,
  },
  historyButtonLabel: { fontSize: 13, color: COLORS.black, marginTop: 8, fontWeight: "600", fontFamily: "GeneralSans-Variable" },
  historyButtonSub: { fontSize: 11, color: COLORS.placeholderText, marginTop: 2, fontFamily: "GeneralSans-Variable" },

  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: COLORS.black, fontFamily: "GeneralSans-Variable" },
  seeAll: { fontSize: 12, color: COLORS.button, fontFamily: "GeneralSans-Variable" },
  empty: { color: COLORS.placeholderText, textAlign: "center", marginTop: 12, fontFamily: "GeneralSans-Variable" },
  recentItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: COLORS.cards, borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  recentTitle: { fontSize: 13, fontWeight: "600", color: COLORS.black, fontFamily: "GeneralSans-Variable" },
  recentSub: { fontSize: 11, color: COLORS.placeholderText, marginTop: 2, fontFamily: "GeneralSans-Variable" },
  recentDate: { fontSize: 11, color: COLORS.placeholderText, fontFamily: "GeneralSans-Variable" },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  bellBtn: { padding: 4 },
});

export default styles;
import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },

  avatarWrap: { alignItems: "center", marginBottom: 20 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 8 },
  avatarPlaceholder: { backgroundColor: COLORS.inputBackground, justifyContent: "center", alignItems: "center" },
  avatarInitials: { fontSize: 34, color: COLORS.button, fontWeight: "600", fontFamily: "GeneralSans-Variable" },
  changePhotoBtn: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  changePhotoText: { color: COLORS.button, fontSize: 14, marginLeft: 4, fontFamily: "GeneralSans-Variable" },
  usernameText: { color: COLORS.placeholderText, fontSize: 13, marginTop: 6, fontFamily: "GeneralSans-Variable" },

  label: { fontSize: 13, color: COLORS.placeholderText, marginBottom: 6, marginTop: 14, fontFamily: "GeneralSans-Variable" },
  inputContainer: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  input: {
    height: 48,
    fontSize: 15,
    color: COLORS.black,
    fontFamily: "GeneralSans-Variable",
  },
  row: { flexDirection: "row", gap: 12 },

  genderRow: { flexDirection: "row", gap: 8 },
  genderPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: COLORS.inputBackground,
  },
  genderPillActive: { backgroundColor: COLORS.button, borderColor: COLORS.button },
  genderText: { fontSize: 14, color: COLORS.black, fontFamily: "GeneralSans-Variable" },
  genderTextActive: { color: COLORS.white, fontFamily: "GeneralSans-Variable" },

  saveBtn: {
    backgroundColor: COLORS.button,
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  saveText: { color: COLORS.white, fontSize: 15, fontWeight: "600", fontFamily: "GeneralSans-Variable" },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 30,
    paddingVertical: 12,
  },
  logoutText: { color: "#a32d2d", fontSize: 15, fontWeight: "600", marginLeft: 6, fontFamily: "GeneralSans-Variable" },
});

export default styles;
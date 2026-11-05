import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.orazchollaev.invictustournamentmaker",
  appName: "Invictus: Tournament Maker",
  webDir: "dist",
  backgroundColor: "#16181f",
  android: {
    backgroundColor: "#16181f",
  },
  plugins: {
    // The native plugin loads no providers unless they are listed here, and
    // signInWithGoogle then fails with "Google sign-in provider is not enabled".
    FirebaseAuthentication: {
      providers: ["google.com"],
    },
  },
}

export default config

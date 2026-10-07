import type {Metadata} from "next";
import {LoginView} from "./login-view";

export const metadata: Metadata = {
  title: "Login - GlossaryAI",
  description: "Sign in to your GlossaryAI account",
};

export default function LoginPage() {
  return <LoginView />;
}

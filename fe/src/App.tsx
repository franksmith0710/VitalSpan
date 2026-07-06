import { BrowserRouter } from "react-router";
import { AuthProvider } from "@/context/auth-context";
import { AppRoutes } from "@/routes";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

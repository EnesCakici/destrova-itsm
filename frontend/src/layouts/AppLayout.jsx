import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";

function AppLayout() {
  const location = useLocation();
  const customerDestrovaChrome = location.pathname.startsWith("/customer");

  return (
    <div
      className={
        customerDestrovaChrome ? "app-root flex min-h-screen min-w-0 flex-col" : "app-root"
      }
    >
      {/* Customer uses Destrova AppShell (own topbar); other roles keep global Navbar. */}
      {!customerDestrovaChrome ? <Navbar /> : null}
      <main
        className={
          customerDestrovaChrome
            ? "flex min-h-0 min-w-0 flex-1 flex-col"
            : "app-shell layout-single"
        }
      >
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;


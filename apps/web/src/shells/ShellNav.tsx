import { NavLink } from "react-router-dom";
import styles from "./ShellNav.module.css";

const links = [
  { to: "/", label: "Client", end: true },
  { to: "/admin", label: "Admin", end: false },
  { to: "/timeline", label: "Timeline", end: false },
] as const;

export function ShellNav() {
  return (
    <nav className={styles.nav} aria-label="Shelle Booth">
      {links.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            [styles.link, isActive ? styles.active : ""]
              .filter(Boolean)
              .join(" ")
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

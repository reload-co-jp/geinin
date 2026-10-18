import { ComponentProps, FC, ReactNode } from "react"

export const Title: FC<ComponentProps<"h1">> = ({
  style,
  children,
  ...props
}) => (
  <h1 style={{ fontSize: "1rem", margin: 0, ...style }} {...props}>
    {children}
  </h1>
)

export const Header: FC<{ children: ReactNode }> = ({ children }) => (
  <header
    style={{
      alignItems: "center",
      backgroundColor: "var(--surface)",
      borderBottom: "3px solid var(--accent)",
      display: "flex",
      flexWrap: "wrap",
      gap: ".5rem 1.5rem",
      padding: ".5rem 1rem",
      position: "relative",
    }}
  >
    {children}
  </header>
)

export const Main: FC<{ children: ReactNode }> = ({ children }) => (
  <main
    style={{
      minHeight: "calc(100dvh - 5.625rem)",
      padding: "1rem",
    }}
  >
    {children}
  </main>
)

export const Footer: FC<{ children: ReactNode }> = ({ children }) => (
  <footer
    style={{
      borderTop: "1px solid var(--line)",
      color: "var(--muted)",
      fontSize: ".75rem",
      padding: "1rem",
    }}
  >
    {children}
  </footer>
)

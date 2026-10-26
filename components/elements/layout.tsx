import { ComponentProps, FC, ReactNode } from "react"

export const Title: FC<ComponentProps<"p">> = ({
  style,
  children,
  ...props
}) => (
  <p
    style={{
      fontFamily: "var(--display)",
      fontSize: "1rem",
      margin: 0,
      ...style,
    }}
    {...props}
  >
    {children}
  </p>
)

// スタイルは app/reset.css の body > header / main / footer
export const Header: FC<{ children: ReactNode }> = ({ children }) => (
  <header>{children}</header>
)

export const Main: FC<{ children: ReactNode }> = ({ children }) => (
  <main>{children}</main>
)

export const Footer: FC<{ children: ReactNode }> = ({ children }) => (
  <footer>{children}</footer>
)

import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { Footer, Header, Main, Title } from "./layout"

describe("Title", () => {
  it("renders children text", () => {
    render(<Title>Page title</Title>)
    expect(screen.getByText("Page title")).toBeInTheDocument()
  })

  // 各ページ本文の見出しを h1 にするため、サイト名は見出しにしない
  it("does not render as a heading", () => {
    render(<Title>Page title</Title>)
    expect(screen.queryByRole("heading")).toBeNull()
  })

  it("merges custom style with defaults", () => {
    render(<Title style={{ color: "red" }}>Styled</Title>)
    const heading = screen.getByText("Styled")
    expect(heading.style.fontSize).toBe("1rem")
    expect(heading.style.color).toBe("red")
  })
})

describe("Header", () => {
  it("renders children inside a header element", () => {
    render(
      <Header>
        <span>content</span>
      </Header>
    )
    const header = screen.getByText("content").closest("header")
    expect(header).not.toBeNull()
  })
})

describe("Main", () => {
  it("renders children inside a main element", () => {
    render(
      <Main>
        <span>body</span>
      </Main>
    )
    expect(screen.getByRole("main")).toHaveTextContent("body")
  })
})

describe("Footer", () => {
  it("renders children inside a footer element", () => {
    render(
      <Footer>
        <p>&copy; My organization</p>
      </Footer>
    )
    expect(screen.getByText("© My organization")).toBeInTheDocument()
  })
})

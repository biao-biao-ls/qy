/**
 * JSX 样式声明
 * 支持 styled-jsx 语法
 */
declare namespace JSX {
  interface IntrinsicElements {
    style: React.DetailedHTMLProps<
      React.StyleHTMLAttributes<HTMLStyleElement> & { jsx?: boolean | string },
      HTMLStyleElement
    >
  }
}

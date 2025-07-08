import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// テスト用のプロバイダーを設定
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// ファイルにテストを追加してJestエラーを防ぐ
describe('Test utilities', () => {
  it('should export custom render function', () => {
    expect(customRender).toBeDefined()
  })
})
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the application with loaded issues', async () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Ticket-Dashboard' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByLabelText('Geladene Issues: 100'),
    ).toBeInTheDocument()
  })
})

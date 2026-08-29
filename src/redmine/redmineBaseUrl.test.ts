import { describe, expect, it } from 'vitest'
import { RedmineBaseUrlError, validateRedmineBaseUrl } from './redmineBaseUrl'

describe('validateRedmineBaseUrl', () => {
  it.each([
    ['https://redmine.example.com', 'https://redmine.example.com/'],
    [
      'https://redmine.example.com/redmine',
      'https://redmine.example.com/redmine',
    ],
  ])('accepts the HTTPS URL %s', (value, expected) => {
    expect(validateRedmineBaseUrl(value).href).toBe(expected)
  })

  it.each([
    'http://redmine.example.com',
    'https://user@redmine.example.com',
    'https://user:password@redmine.example.com',
    'not a URL',
    'https://',
  ])('rejects the invalid or unsupported URL %s', (value) => {
    expect(() => validateRedmineBaseUrl(value)).toThrow(RedmineBaseUrlError)
  })
})

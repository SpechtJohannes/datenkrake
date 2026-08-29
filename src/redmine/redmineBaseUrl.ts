const INVALID_REDMINE_BASE_URL_MESSAGE =
  'Die Redmine Basis-URL muss eine gültige HTTPS-URL ohne eingebettete Zugangsdaten sein.'

export class RedmineBaseUrlError extends Error {
  constructor() {
    super(INVALID_REDMINE_BASE_URL_MESSAGE)
    this.name = 'RedmineBaseUrlError'
  }
}

export function validateRedmineBaseUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new RedmineBaseUrlError()
  }

  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    url.hostname === ''
  ) {
    throw new RedmineBaseUrlError()
  }

  return url
}

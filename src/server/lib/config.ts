//
// Configuration helpers
//
/**
 * Reads a key from `process.env`.
 * Throws an error if value is `undefined` or an empty string.
 **/
export function read<T>(
  /** The key to read from process.env */
  key: string
): string
export function read<T>(
  /** The key to read from `process.env` */
  key: string,
  /** Defaults to this value if the read value is `undefined` or empty string. */
  defaultValue: string,
): string
export function read<T>(
  /** The key to read from process.env */
  key: string,
  /** Convert your string value to whatever you want */
  parse: (val: string) => T,
): T
export function read<T>(
  /** The key to read from process.env */
  key: string,
  /** Defaults to this value if the read value is `undefined` or empty string */
  defaultValue: string,
  /** Convert your string value to whatever you want */
  parse: (val: string) => T,
): T

export function read<T>(
  key: string,
  _defaultValue?: string | ((val: string) => T),
  _parse?: (val: string) => T,
) {
  const [defaultValue, parse] = (function () {
    if (typeof _defaultValue === 'function') {
      return [undefined, _defaultValue] as const
    }
    else if (typeof _parse === 'function') {
      return [_defaultValue, _parse] as const
    }
    else if (_defaultValue !== undefined) {
      return [_defaultValue, undefined] as const
    }
    else {
      return [undefined, undefined] as const
    }
  })()

  if (defaultValue !== undefined && typeof defaultValue !== 'string') {
    throw new Error('[config] Default value must be a string')
  }

  const val = process.env[key]
  if (val === undefined || (val === '' && defaultValue !== '')) {
    if (defaultValue !== undefined) {
      // Since value is unset, set it here so 3rd party
      // code can read default value
      process.env[key] = defaultValue

      return parse ? parse(defaultValue) : defaultValue
    }
    throw new Error(`[config] Please set ${key}`)
  }
  return parse ? parse(val) : val
}

export function Env<E extends string, Envs extends E[]>(validEnvs: Envs) {
  type Env = Envs[number]
  type ConfigVal<T> = T | ((env: Env) => T)
  const env = validEnvs.find(env => env === read('NODE_ENV', 'development'))
  if (!env) {
    throw new Error('blah')
  }

  function branch<T>(defaultValue: ConfigVal<T>, choices: Partial<Record<Env, ConfigVal<T>>>): T;
  function branch<T>(choices: Record<Env, ConfigVal<T>>): T;
  function branch<T>(defaultValue: any, choices?: any): T {
    const _env = env!
    if (choices === undefined) {
      choices = defaultValue
    }
    else if (!(_env in choices)) {
      return typeof defaultValue === 'function' ? defaultValue(_env) : defaultValue
    }

    const v = choices[_env]
    if (typeof v === 'function') {
      return v(_env)
    }
    else return v
  }

  const envs = validEnvs.reduce((all, name) => {
    all[name] = name === env
    return all
  }, {} as any) as Record<Env, boolean>

  return {
    name: env as Env,
    branch,
    ...envs,
  }
}

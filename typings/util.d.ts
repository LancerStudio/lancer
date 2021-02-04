
type POJO<T=string> = Record<string, T>

type UnPromisify<T> = T extends Promise<infer U> ? U : T;
type UnPromisifiedObject<T> = { [k in keyof T]: UnPromisify<T[k]> }

type ReturnTypeObject<T extends Record<any,(...args: any[]) => any>> = { [k in keyof T]: ReturnType<T[k]> }
